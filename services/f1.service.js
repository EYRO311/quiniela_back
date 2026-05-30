import { supabase } from '../db/supabase.js'
import {
  fetchDriverStandings,
  fetchConstructorStandings,
  fetchCalendar,
  fetchLastResults
} from './f1.api.service.js'

function matchColor (nombre, escuderiasDB) {
  if (!escuderiasDB?.length) return null
  const n = nombre.toLowerCase()
  const found = escuderiasDB.find(e =>
    n.includes(e.nombre.toLowerCase()) || e.nombre.toLowerCase().includes(n.split(' ')[0])
  )
  return found?.color ?? null
}

export async function getStandingsPilotos () {
  const [standings, { data: escuderiasDB }] = await Promise.all([
    fetchDriverStandings(),
    supabase.schema('quiniela').from('f1_escuderias').select('nombre, color').eq('activo', 1)
  ])
  return standings.map(s => ({
    ...s,
    escuderia: { ...s.escuderia, color: matchColor(s.escuderia.nombre, escuderiasDB) }
  }))
}

export async function getStandingsConstructores () {
  const [standings, { data: escuderiasDB }] = await Promise.all([
    fetchConstructorStandings(),
    supabase.schema('quiniela').from('f1_escuderias').select('nombre, color').eq('activo', 1)
  ])
  return standings.map(s => ({
    ...s,
    escuderia: { ...s.escuderia, color: matchColor(s.escuderia.nombre, escuderiasDB) }
  }))
}

export async function getCalendarioAPI () {
  return fetchCalendar()
}

export async function syncCarrerasFromAPI () {
  const apiCarreras = await fetchCalendar()

  const { data: existing, error: fetchError } = await supabase
    .schema('quiniela')
    .from('f1_carreras')
    .select('id_carrera, nombre_gp, estado')

  if (fetchError) throw new Error(fetchError.message)

  let inserted = 0
  let updated = 0
  const errors = []

  for (const c of apiCarreras) {
    const match = existing?.find(e => e.nombre_gp === c.nombre_gp)

    if (match) {
      if (match.estado === 'cancelada') continue
      const { error } = await supabase
        .schema('quiniela')
        .from('f1_carreras')
        .update({
          circuito: c.circuito,
          pais: c.pais,
          ciudad: c.ciudad,
          fecha_carrera: c.fecha_carrera,
          estado: c.estado,
          updated_at: new Date().toISOString()
        })
        .eq('id_carrera', match.id_carrera)
      if (error) errors.push({ nombre: c.nombre_gp, error: error.message })
      else updated++
    } else {
      const { error } = await supabase
        .schema('quiniela')
        .from('f1_carreras')
        .insert({
          nombre_gp: c.nombre_gp,
          circuito: c.circuito,
          pais: c.pais,
          ciudad: c.ciudad,
          fecha_carrera: c.fecha_carrera,
          estado: c.estado
        })
      if (error) errors.push({ nombre: c.nombre_gp, error: error.message })
      else inserted++
    }
  }

  return { inserted, updated, total: apiCarreras.length, errors }
}

export async function getPronosticosF1 (idUsuario, idQuiniela) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_pronosticos')
    .select('*')
    .eq('id_usuario', idUsuario)
    .eq('id_quiniela', idQuiniela)

  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertPronosticoF1 (datos) {
  const { idPronostico, idQuiniela, idUsuario, idCarrera, p1, p2, p3, pole, vueltaRapida } = datos

  if (!p1) throw new Error('El piloto P1 es obligatorio')

  // Verificar que la carrera no ha iniciado
  const { data: carrera, error: carreraErr } = await supabase
    .schema('quiniela')
    .from('f1_carreras')
    .select('fecha_carrera, nombre_gp, estado')
    .eq('id_carrera', Number(idCarrera))
    .single()

  if (carreraErr || !carrera) throw new Error('Carrera no encontrada')
  if (carrera.estado !== 'pendiente' || new Date(carrera.fecha_carrera) <= new Date()) {
    throw new Error(`Los pronósticos de ${carrera.nombre_gp} ya están cerrados`)
  }

  const payload = {
    pred_piloto_p1: Number(p1),
    pred_piloto_p2: p2 ? Number(p2) : null,
    pred_piloto_p3: p3 ? Number(p3) : null,
    pred_pole: pole ? Number(pole) : null,
    pred_vuelta_rapida: vueltaRapida ? Number(vueltaRapida) : null,
    updated_at: new Date().toISOString()
  }

  if (idPronostico) {
    const { data, error } = await supabase
      .schema('quiniela')
      .from('f1_pronosticos')
      .update(payload)
      .eq('id_pronostico_f1', idPronostico)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_pronosticos')
    .insert({ ...payload, id_quiniela: idQuiniela, id_usuario: idUsuario, id_carrera: Number(idCarrera) })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getProximaCarrera () {
  const carreras = await fetchCalendar()
  return carreras.find(c => c.estado === 'en_vivo' || c.estado === 'pendiente') ?? null
}

export async function getUltimoResultado () {
  const resultado = await fetchLastResults()
  if (!resultado) return null

  const { data: escuderiasDB } = await supabase
    .schema('quiniela').from('f1_escuderias').select('nombre, color').eq('activo', 1)

  return {
    ...resultado,
    resultados: resultado.resultados.map(r => ({
      ...r,
      color: matchColor(r.escuderia, escuderiasDB)
    }))
  }
}

export async function getPilotos () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_pilotos')
    .select(`
      id_piloto,
      nombre,
      numero,
      pais,
      activo,
      f1_piloto_escuderia(
        rol,
        temporada,
        activo,
        f1_escuderias(id_escuderia, nombre, color, pais)
      )
    `)
    .eq('activo', 1)
    .order('nombre')

  if (error) throw new Error(error.message)
  return data || []
}

export async function getEscuderias () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_escuderias')
    .select('*')
    .eq('activo', 1)
    .order('nombre')

  if (error) throw new Error(error.message)
  return data || []
}

export async function getCarreras () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_carreras')
    .select('*')
    .order('fecha_carrera', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getCampeonatoPilotos () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_piloto_escuderia')
    .select(`
      id_piloto_escuderia,
      rol,
      temporada,
      f1_pilotos(id_piloto, nombre, numero, pais),
      f1_escuderias(id_escuderia, nombre, color)
    `)
    .eq('activo', 1)
    .in('rol', ['titular', 'tercer_piloto'])
    .order('temporada', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}
