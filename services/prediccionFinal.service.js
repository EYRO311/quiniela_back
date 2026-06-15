import { supabase } from '../db/supabase.js'

const PUNTOS_CAMPEON = 5
export const FECHA_LIMITE_PREDICCION_FINAL = new Date('2026-06-28T23:59:59Z')

const TIPO_CAMPEON = 'campeon'
const TIPO_SUBCAMPEON = 'subcampeon'

export async function getPrediccionFinal (idUsuario, idQuiniela) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('pronosticos_especiales')
    .select('tipo, id_equipo, puntos_obtenidos')
    .eq('id_usuario', idUsuario)
    .eq('id_quiniela', idQuiniela)
    .in('tipo', [TIPO_CAMPEON, TIPO_SUBCAMPEON])

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return null

  const porTipo = Object.fromEntries(data.map(d => [d.tipo, d]))
  if (!porTipo[TIPO_CAMPEON] || !porTipo[TIPO_SUBCAMPEON]) return null

  return {
    id_equipo_campeon: porTipo[TIPO_CAMPEON].id_equipo,
    id_equipo_subcampeon: porTipo[TIPO_SUBCAMPEON].id_equipo,
    puntos_obtenidos: porTipo[TIPO_CAMPEON].puntos_obtenidos || 0
  }
}

async function upsertPronosticoEspecial ({ idQuiniela, idUsuario, tipo, idEquipo }) {
  const { data: existente } = await supabase
    .schema('quiniela')
    .from('pronosticos_especiales')
    .select('id_pronostico_especial')
    .eq('id_quiniela', idQuiniela)
    .eq('id_usuario', idUsuario)
    .eq('tipo', tipo)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase
      .schema('quiniela')
      .from('pronosticos_especiales')
      .update({ id_equipo: idEquipo, updated_at: new Date().toISOString() })
      .eq('id_pronostico_especial', existente.id_pronostico_especial)

    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .schema('quiniela')
      .from('pronosticos_especiales')
      .insert({ id_quiniela: idQuiniela, id_usuario: idUsuario, tipo, id_equipo: idEquipo })

    if (error) throw new Error(error.message)
  }
}

export async function upsertPrediccionFinal ({ idQuiniela, idUsuario, idCampeon, idSubcampeon }) {
  if (new Date() > FECHA_LIMITE_PREDICCION_FINAL) {
    throw new Error('Las predicciones finales ya están cerradas')
  }

  if (idCampeon === idSubcampeon) {
    throw new Error('El campeón y el subcampeón deben ser equipos distintos')
  }

  await upsertPronosticoEspecial({ idQuiniela, idUsuario, tipo: TIPO_CAMPEON, idEquipo: idCampeon })
  await upsertPronosticoEspecial({ idQuiniela, idUsuario, tipo: TIPO_SUBCAMPEON, idEquipo: idSubcampeon })

  return { id_equipo_campeon: idCampeon, id_equipo_subcampeon: idSubcampeon }
}

export async function calcularPuntosPrediccionesFinales (idEquipoCampeon) {
  const { data: predicciones, error } = await supabase
    .schema('quiniela')
    .from('pronosticos_especiales')
    .select('id_pronostico_especial, id_quiniela, id_equipo')
    .eq('tipo', TIPO_CAMPEON)

  if (error) throw new Error(error.message)

  const quinielasAfectadas = new Set()

  for (const prediccion of predicciones || []) {
    const acerto = prediccion.id_equipo === idEquipoCampeon
    await supabase
      .schema('quiniela')
      .from('pronosticos_especiales')
      .update({
        puntos_obtenidos: acerto ? PUNTOS_CAMPEON : 0,
        estado: acerto ? 'acertado' : 'fallido',
        updated_at: new Date().toISOString()
      })
      .eq('id_pronostico_especial', prediccion.id_pronostico_especial)

    quinielasAfectadas.add(prediccion.id_quiniela)
  }

  return quinielasAfectadas
}

export async function getPuntosPrediccionesFinales (idQuiniela) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('pronosticos_especiales')
    .select('id_usuario, puntos_obtenidos')
    .eq('id_quiniela', idQuiniela)
    .eq('tipo', TIPO_CAMPEON)

  if (error) throw new Error(error.message)

  const mapa = new Map()
  for (const p of data || []) {
    mapa.set(p.id_usuario, p.puntos_obtenidos || 0)
  }
  return mapa
}
