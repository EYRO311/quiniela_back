import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Horarios dados en CDMX (UTC-6, sin horario de verano) convertidos a UTC.
const PARTIDOS = [
  { equipoA: 'South Africa', equipoB: 'Canada', fecha: '2026-06-28T19:00:00+00:00', estadio: 'Los Angeles Stadium' },
  { equipoA: 'Brazil', equipoB: 'Japan', fecha: '2026-06-29T17:00:00+00:00', estadio: 'Houston Stadium' },
  { equipoA: 'Germany', equipoB: 'Paraguay', fecha: '2026-06-29T20:30:00+00:00', estadio: 'Boston Stadium' },
  { equipoA: 'Netherlands', equipoB: 'Morocco', fecha: '2026-06-30T01:00:00+00:00', estadio: 'Monterrey Stadium' },
  { equipoA: 'Ivory Coast', equipoB: 'Norway', fecha: '2026-06-30T17:00:00+00:00', estadio: 'Dallas Stadium' },
  { equipoA: 'France', equipoB: 'Sweden', fecha: '2026-06-30T21:00:00+00:00', estadio: 'New York New Jersey Stadium' },
  { equipoA: 'Mexico', equipoB: 'Ecuador', fecha: '2026-07-01T01:00:00+00:00', estadio: 'Mexico City Stadium' },
  { equipoA: 'England', equipoB: 'DR Congo', fecha: '2026-07-01T16:00:00+00:00', estadio: 'Atlanta Stadium' },
  { equipoA: 'Belgium', equipoB: 'Senegal', fecha: '2026-07-01T20:00:00+00:00', estadio: 'Seattle Stadium' },
  { equipoA: 'United States', equipoB: 'Bosnia and Herzegovina', fecha: '2026-07-02T00:00:00+00:00', estadio: 'San Francisco Bay Area Stadium' },
  { equipoA: 'Spain', equipoB: 'Austria', fecha: '2026-07-02T19:00:00+00:00', estadio: 'Los Angeles Stadium' },
  { equipoA: 'Portugal', equipoB: 'Croatia', fecha: '2026-07-02T23:00:00+00:00', estadio: 'Toronto Stadium' },
  { equipoA: 'Switzerland', equipoB: 'Algeria', fecha: '2026-07-03T03:00:00+00:00', estadio: 'BC Place Vancouver' },
  { equipoA: 'Australia', equipoB: 'Egypt', fecha: '2026-07-03T18:00:00+00:00', estadio: 'Dallas Stadium' },
  { equipoA: 'Argentina', equipoB: 'Cape Verde', fecha: '2026-07-03T22:00:00+00:00', estadio: 'Miami Stadium' },
  { equipoA: 'Colombia', equipoB: 'Ghana', fecha: '2026-07-04T01:30:00+00:00', estadio: 'Kansas City Stadium' }
]

async function main () {
  const { data: equipos, error: eqErr } = await supabase
    .schema('quiniela').from('equipos').select('id_equipo, nombre_pais')
  if (eqErr) throw new Error(eqErr.message)
  const idPorEquipo = new Map(equipos.map(e => [e.nombre_pais, e.id_equipo]))

  const { data: estadios, error: esErr } = await supabase
    .schema('quiniela').from('estadios').select('id_estadio, nombre')
  if (esErr) throw new Error(esErr.message)
  const idPorEstadio = new Map(estadios.map(e => [e.nombre, e.id_estadio]))

  const filas = PARTIDOS.map(p => {
    const idEquipoA = idPorEquipo.get(p.equipoA)
    const idEquipoB = idPorEquipo.get(p.equipoB)
    const idEstadio = idPorEstadio.get(p.estadio)
    if (!idEquipoA) throw new Error(`Equipo no encontrado: ${p.equipoA}`)
    if (!idEquipoB) throw new Error(`Equipo no encontrado: ${p.equipoB}`)
    if (!idEstadio) throw new Error(`Estadio no encontrado: ${p.estadio}`)

    return {
      id_equipo_a: idEquipoA,
      id_equipo_b: idEquipoB,
      fecha: p.fecha,
      id_estadio: idEstadio,
      fase: 'dieciseisavos',
      grupo: null,
      jornada: null,
      estado: 'pendiente'
    }
  })

  const { data, error } = await supabase
    .schema('quiniela').from('partidos').insert(filas).select('id_partido')
  if (error) throw new Error(error.message)

  console.log(`✓ ${data.length} partidos de Dieciseisavos insertados`)
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
