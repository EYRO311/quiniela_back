import bcrypt from 'bcrypt'
import { supabase } from '../db/supabase.js'

const saltRounds = 10
export class UserRepository {
  static async create ({ username, password, nombre, correo }) {
    validateCredentials(username, password)

    const { data: existing } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .select('id_random')
      .eq('username', username)
      .maybeSingle()

    if (existing) throw new Error('El usuario ya existe')

    if (correo) {
      const { data: emailTaken } = await supabase
        .schema('quiniela')
        .from('usuarios')
        .select('id_random')
        .eq('correo', correo.trim())
        .maybeSingle()
      if (emailTaken) throw new Error('Ese correo ya está en uso')
    }

    const hashedPassword = await bcrypt.hash(password, Number(saltRounds))

    let authUserId = null
    if (correo) {
      const { data: authData } = await supabase.auth.admin.createUser({
        email: correo.trim(),
        password,
        email_confirm: true,
        user_metadata: { username }
      })
      if (authData?.user) authUserId = authData.user.id
    }

    const { data, error } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .insert({
        username,
        password_hash: hashedPassword,
        nombre: nombre?.trim() || null,
        correo: correo?.trim() || null,
        auth_user_id: authUserId
      })
      .select('id_random')
      .single()

    if (error) throw new Error(error.message)
    return data.id_random
  }

  static async forgotPassword (correo) {
    if (!correo || !correo.includes('@')) throw new Error('Correo inválido')

    const { data: user } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .select('id_random, correo, auth_user_id')
      .eq('correo', correo.trim())
      .maybeSingle()

    if (!user) return null

    // Si el usuario tiene cuenta en Supabase Auth, usar su flujo de recuperación
    if (user.auth_user_id) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
      const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
        redirectTo: `${frontendUrl}/update-password`
      })
      if (error) throw new Error(error.message)
      return { method: 'supabase' }
    }

    // Usuario sin cuenta en Supabase Auth — necesita ser migrado primero
    return null
  }

  // Sincroniza password_hash en quiniela.usuarios después de un reset via Supabase Auth
  static async syncPasswordHash (accessToken, newPassword) {
    if (!newPassword || newPassword.length < 6) throw new Error('La contraseña debe tener mínimo 6 caracteres')

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    if (error || !user) throw new Error('Sesión inválida o expirada')

    const hashedPassword = await bcrypt.hash(newPassword, Number(saltRounds))

    const { error: updateError } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .update({ password_hash: hashedPassword })
      .eq('auth_user_id', user.id)

    if (updateError) throw new Error(updateError.message)
  }

  static async login ({ identifier, password }) {
    if (!identifier || typeof identifier !== 'string' || identifier.length < 3) {
      throw new Error('Usuario o correo requerido')
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('Contraseña requerida (mín. 6 caracteres)')
    }

    const isEmail = identifier.includes('@')

    const { data: user, error } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .select('id_random, username, nombre, correo, password_hash')
      .eq(isEmail ? 'correo' : 'username', identifier)
      .maybeSingle()

    if (error || !user) throw new Error('Usuario o contraseña incorrectos')

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) throw new Error('Usuario o contraseña incorrectos')

    const { password_hash: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  static async update ({ id, nombre, correo, username }) {
    const updates = {}

    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length < 3) {
        throw new Error('El usuario debe tener al menos 3 caracteres')
      }
      const { data: taken } = await supabase
        .schema('quiniela')
        .from('usuarios')
        .select('id_random')
        .eq('username', username.trim())
        .neq('id_random', id)
        .maybeSingle()
      if (taken) throw new Error('Ese nombre de usuario ya está en uso')
      updates.username = username.trim()
    }

    if (correo !== undefined) {
      const c = correo?.trim() || null
      if (c && !c.includes('@')) throw new Error('Correo inválido')
      if (c) {
        const { data: taken } = await supabase
          .schema('quiniela')
          .from('usuarios')
          .select('id_random')
          .eq('correo', c)
          .neq('id_random', id)
          .maybeSingle()
        if (taken) throw new Error('Ese correo ya está en uso')
      }
      updates.correo = c
    }

    if (nombre !== undefined) {
      updates.nombre = nombre?.trim() || null
    }

    if (Object.keys(updates).length === 0) throw new Error('Sin cambios para guardar')

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .update(updates)
      .eq('id_random', id)
      .select('id_random, username, nombre, correo, puntos_totales')
      .single()

    if (error) throw new Error(error.message)
    return data
  }
}

function validateCredentials (username, password) {
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.length < 3 ||
    password.length < 6
  ) {
    throw new Error('Usuario (mín. 3 caracteres) y contraseña (mín. 6 caracteres) requeridos')
  }
}
