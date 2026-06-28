import { supabase } from '../db/supabase.js'
import { aplicarResultado } from './resultados.service.js'

const THESPORTSDB = 'https://www.thesportsdb.com/api/v1/json/123'
const LIGA_MUNDIAL = '4429' // FIFA World Cup

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

async function fetchEventosPorDia (fecha) {
  const res = await fetch(`${THESPORTSDB}/eventsday.php?d=${fecha}&s=Soccer`, {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data?.events ?? []).filter(e => e.idLeague === LIGA_MUNDIAL)
}

export async function sincronizarResultados () {
  const { data: partidos, error } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('id_partido, equipo_a, equipo_b, fecha, estado, goles_a, goles_b')

  if (error) throw new Error(error.message)

  // Solo consultar fechas con partidos no finalizados que ya hayan comenzado
  const hoy = new Date().toISOString().slice(0, 10)
  const fechasAConsultar = [...new Set(
    (partidos || [])
      .filter(p => p.estado !== 'finalizado' && p.fecha.slice(0, 10) <= hoy)
      .map(p => p.fecha.slice(0, 10))
  )]

  const eventosPorFecha = new Map()
  for (const fecha of fechasAConsultar) {
    eventosPorFecha.set(fecha, await fetchEventosPorDia(fecha))
  }

  const finalizados = []
  const enVivo = []
  const sinCambios = []

  for (const partido of partidos || []) {
    if (partido.estado === 'finalizado') continue

    const fechaPartido = partido.fecha.slice(0, 10)
    const eventosDelDia = eventosPorFecha.get(fechaPartido) ?? []

    if (eventosDelDia.length === 0) {
      sinCambios.push(partido.equipo_a + ' vs ' + partido.equipo_b)
      continue
    }

    const evento = eventosDelDia.find(e => {
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

    const ESTADOS_FINAL = ['FT', 'AET', 'PEN']
    const esEstadoFinal = ESTADOS_FINAL.includes(evento.strStatus)
    const estaEnCurso = !esEstadoFinal && evento.strStatus !== 'NS'

    if (esEstadoFinal) {
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
    } else if (estaEnCurso && golesA !== null && golesB !== null) {
      const esPendienteOEnVivo = partido.estado === 'pendiente' || partido.estado === 'en_vivo'
      if (esPendienteOEnVivo) {
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
