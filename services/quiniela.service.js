import crypto from 'crypto'
import { supabase } from '../db/supabase.js'

export async function crearQuiniela ({ nombre, descripcion, tipo, idUsuario }) {
  if (!nombre || nombre.trim().length < 3) {
    throw new Error('El nombre debe tener al menos 3 caracteres')
  }

  const codigoAcceso = tipo === 'privada'
    ? crypto.randomBytes(4).toString('hex').toUpperCase()
    : null

  const { data: quiniela, error } = await supabase
    .schema('quiniela')
    .from('quinielas')
    .insert({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      tipo,
      codigo_acceso: codigoAcceso,
      id_creador: idUsuario
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase
    .schema('quiniela')
    .from('quiniela_usuarios')
    .insert({ id_quiniela: quiniela.id_quiniela, id_usuario: idUsuario })

  return quiniela
}

export async function unirseQuiniela ({ codigoAcceso, idUsuario }) {
  if (!codigoAcceso) throw new Error('El código de acceso es requerido')

  const { data: quiniela, error: findError } = await supabase
    .schema('quiniela')
    .from('quinielas')
    .select('id_quiniela, nombre, estado, tipo')
    .eq('codigo_acceso', codigoAcceso.toUpperCase())
    .maybeSingle()

  if (findError) throw new Error(findError.message)
  if (!quiniela) throw new Error('Código de quiniela no encontrado')
  if (quiniela.estado !== 'abierta') throw new Error('Esta quiniela ya no acepta nuevos participantes')

  const { data, error } = await supabase
    .schema('quiniela')
    .from('quiniela_usuarios')
    .insert({ id_quiniela: quiniela.id_quiniela, id_usuario: idUsuario })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('Ya eres miembro de esta quiniela')
    throw new Error(error.message)
  }

  return { ...data, quiniela }
}
