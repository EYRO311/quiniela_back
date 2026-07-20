import { supabase } from '../db/supabase.js'

const PUNTOS_CAMPEON = 5
const PUNTOS_SUBCAMPEON = 3
// Equipo elegido (en cualquier posición) que sí llegó a la final, pero en la posición contraria a la elegida
const PUNTOS_FINALISTA = 3
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

export async function calcularPuntosPrediccionesFinales (idEquipoCampeon, idEquipoSubcampeon) {
  const { data: predicciones, error } = await supabase
    .schema('quiniela')
    .from('pronosticos_especiales')
    .select('id_pronostico_especial, id_quiniela, id_usuario, tipo, id_equipo')
    .in('tipo', [TIPO_CAMPEON, TIPO_SUBCAMPEON])

  if (error) throw new Error(error.message)

  const porUsuario = new Map()
  for (const p of predicciones || []) {
    const key = `${p.id_quiniela}:${p.id_usuario}`
    if (!porUsuario.has(key)) porUsuario.set(key, { id_quiniela: p.id_quiniela })
    porUsuario.get(key)[p.tipo] = p
  }

  const quinielasAfectadas = new Set()

  for (const { id_quiniela, [TIPO_CAMPEON]: campeonRow, [TIPO_SUBCAMPEON]: subcampeonRow } of porUsuario.values()) {
    if (!campeonRow || !subcampeonRow) continue

    const campeonExacto = campeonRow.id_equipo === idEquipoCampeon
    const subcampeonExacto = subcampeonRow.id_equipo === idEquipoSubcampeon

    let puntos = 0
    if (campeonExacto) puntos += PUNTOS_CAMPEON
    else if (campeonRow.id_equipo === idEquipoSubcampeon) puntos += PUNTOS_FINALISTA

    if (subcampeonExacto) puntos += PUNTOS_SUBCAMPEON
    else if (subcampeonRow.id_equipo === idEquipoCampeon) puntos += PUNTOS_FINALISTA

    await supabase
      .schema('quiniela')
      .from('pronosticos_especiales')
      .update({
        puntos_obtenidos: puntos,
        estado: campeonExacto ? 'acertado' : 'fallido',
        updated_at: new Date().toISOString()
      })
      .eq('id_pronostico_especial', campeonRow.id_pronostico_especial)

    await supabase
      .schema('quiniela')
      .from('pronosticos_especiales')
      .update({
        puntos_obtenidos: 0,
        estado: subcampeonExacto ? 'acertado' : 'fallido',
        updated_at: new Date().toISOString()
      })
      .eq('id_pronostico_especial', subcampeonRow.id_pronostico_especial)

    quinielasAfectadas.add(id_quiniela)
  }

  return quinielasAfectadas
}

export async function getPrediccionesFinalesQuiniela (idQuiniela) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('pronosticos_especiales')
    .select(`
      id_usuario,
      tipo,
      puntos_obtenidos,
      usuarios ( username ),
      equipos ( id_equipo, nombre_pais, escudo_url )
    `)
    .eq('id_quiniela', idQuiniela)
    .in('tipo', [TIPO_CAMPEON, TIPO_SUBCAMPEON])

  if (error) throw new Error(error.message)

  const porUsuario = new Map()
  for (const fila of data || []) {
    if (!porUsuario.has(fila.id_usuario)) {
      porUsuario.set(fila.id_usuario, {
        id_usuario: fila.id_usuario,
        username: fila.usuarios?.username ?? '',
        campeon: null,
        subcampeon: null,
        puntos_obtenidos: 0
      })
    }
    const entrada = porUsuario.get(fila.id_usuario)
    if (fila.tipo === TIPO_CAMPEON) {
      entrada.campeon = fila.equipos
      entrada.puntos_obtenidos = fila.puntos_obtenidos || 0
    } else if (fila.tipo === TIPO_SUBCAMPEON) {
      entrada.subcampeon = fila.equipos
    }
  }

  return Array.from(porUsuario.values())
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
