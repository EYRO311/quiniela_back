import { supabase } from '../db/supabase.js'
import crypto from 'crypto'

export class QuinielaModel {
  static async crear ({ nombre, descripcion, tipo, idCreador }) {
    const codigoAcceso = tipo === 'privada'
      ? crypto.randomBytes(4).toString('hex').toUpperCase()
      : null

    const { data: quiniela, error } = await supabase
      .schema('quiniela')
      .from('quinielas')
      .insert({ nombre, descripcion, tipo, codigo_acceso: codigoAcceso, id_creador: idCreador })
      .select()
      .single()

    if (error) throw new Error(error.message)

    await supabase
      .schema('quiniela')
      .from('quiniela_usuarios')
      .insert({ id_quiniela: quiniela.id_quiniela, id_usuario: idCreador })

    return quiniela
  }

  static async unirse ({ codigoAcceso, idUsuario }) {
    const { data: quiniela, error: qError } = await supabase
      .schema('quiniela')
      .from('quinielas')
      .select('id_quiniela, nombre, estado, codigo_acceso')
      .eq('codigo_acceso', codigoAcceso.toUpperCase())
      .maybeSingle()

    if (qError || !quiniela) throw new Error('Código de acceso inválido')
    if (quiniela.estado !== 'abierta') throw new Error('Esta quiniela ya no acepta participantes')

    const { error } = await supabase
      .schema('quiniela')
      .from('quiniela_usuarios')
      .insert({ id_quiniela: quiniela.id_quiniela, id_usuario: idUsuario })

    if (error) {
      if (error.code === '23505') throw new Error('Ya estás participando en esta quiniela')
      throw new Error(error.message)
    }

    return quiniela
  }

  static async getParticipantes (idQuiniela) {
    const { data, error } = await supabase
      .schema('quiniela')
      .from('quiniela_usuarios')
      .select(`
        id_quiniela_usuario,
        puntos,
        posicion,
        usuarios (
          id_random,
          username,
          nombre
        )
      `)
      .eq('id_quiniela', idQuiniela)
      .order('puntos', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  }

  static async getRanking (idQuiniela) {
    const { data, error } = await supabase
      .schema('quiniela')
      .from('vw_ranking_detalle')
      .select('id_ranking, id_usuario, username, nombre, puntos, aciertos_exactos, aciertos_resultado, posicion')
      .eq('id_quiniela', idQuiniela)
      .order('posicion', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  }
}
