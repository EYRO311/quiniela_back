import { supabase } from '../db/supabase.js'
import { aplicarResultado } from './resultados.service.js'

const THESPORTSDB = 'https://www.thesportsdb.com/api/v1/json/123'
const LIGA_MUNDIAL = '4429' // FIFA World Cup
const TEMPORADA = '2026'

// Nombres que TheSportsDB usa distinto a los de quiniela.equipos.nombre_pais
const TEAM_NAME_MAP = {
  'South Korea': 'Korea Republic',
  'Czech Republic': 'Czechia',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  USA: 'United States'
}

function normalizarEquipo (nombre) {
  return TEAM_NAME_MAP[nombre] ?? nombre
}

async function fetchEventosMundial () {
  const res = await fetch(`${THESPORTSDB}/eventsseason.php?id=${LIGA_MUNDIAL}&s=${TEMPORADA}`, {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`TheSportsDB error ${res.status}`)
  const data = await res.json()
  return data?.events ?? []
}

export async function sincronizarResultados () {
  const eventos = await fetchEventosMundial()

  const { data: partidos, error } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('id_partido, equipo_a, equipo_b, fecha, estado, goles_a, goles_b')

  if (error) throw new Error(error.message)

  const finalizados = []
  const enVivo = []
  const sinCambios = []

  for (const partido of partidos || []) {
    const fechaPartido = partido.fecha.slice(0, 10)
    const evento = eventos.find(e => {
      if (e.dateEvent !== fechaPartido) return false
      const local = normalizarEquipo(e.strHomeTeam)
      const visitante = normalizarEquipo(e.strAwayTeam)
      return (local === partido.equipo_a && visitante === partido.equipo_b) ||
        (local === partido.equipo_b && visitante === partido.equipo_a)
    })

    if (!evento) {
      sinCambios.push(partido.equipo_a + ' vs ' + partido.equipo_b)
      continue
    }

    const localEsEquipoA = normalizarEquipo(evento.strHomeTeam) === partido.equipo_a
    const golesA = localEsEquipoA ? evento.intHomeScore : evento.intAwayScore
    const golesB = localEsEquipoA ? evento.intAwayScore : evento.intHomeScore

    if (evento.strStatus === 'FT') {
      if (partido.estado !== 'finalizado') {
        await aplicarResultado({
          idPartido: partido.id_partido,
          golesA: Number(golesA),
          golesB: Number(golesB)
        })
        finalizados.push(`${partido.equipo_a} ${golesA}-${golesB} ${partido.equipo_b}`)
      } else {
        sinCambios.push(partido.equipo_a + ' vs ' + partido.equipo_b)
      }
    } else if (evento.strStatus !== 'NS') {
      if (partido.estado === 'pendiente' && golesA !== null && golesB !== null) {
        await supabase
          .schema('quiniela')
          .from('partidos')
          .update({
            goles_a: Number(golesA),
            goles_b: Number(golesB),
            estado: 'en_vivo',
            updated_at: new Date().toISOString()
          })
          .eq('id_partido', partido.id_partido)
        enVivo.push(`${partido.equipo_a} ${golesA}-${golesB} ${partido.equipo_b} (${evento.strStatus})`)
      } else {
        sinCambios.push(partido.equipo_a + ' vs ' + partido.equipo_b)
      }
    } else {
      sinCambios.push(partido.equipo_a + ' vs ' + partido.equipo_b)
    }
  }

  return { finalizados, enVivo, totalSinCambios: sinCambios.length }
}
