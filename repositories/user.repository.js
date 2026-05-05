import bcrypt from 'bcrypt'
import { supabase } from '../db/supabase.js'

const saltRounds = 10
export class UserRepository {
  static async create ({ username, password, nombre }) {
    validateCredentials(username, password)

    const { data: existing } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .select('id_random')
      .eq('username', username)
      .maybeSingle()

    if (existing) throw new Error('El usuario ya existe')

    const hashedPassword = await bcrypt.hash(password, Number(saltRounds))

    const { data, error } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .insert({ username, password_hash: hashedPassword, nombre: nombre?.trim() || null })
      .select('id_random')
      .single()

    if (error) throw new Error(error.message)
    return data.id_random
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
