import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const THESPORTSDB = 'https://www.thesportsdb.com/api/v1/json/123'
const LIGA_MUNDIAL = '4429'
const TEMPORADA = '2026'

const TEAM_NAME_MAP = {
  'South Korea': 'Korea Republic',
  'Czech Republic': 'Czechia',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  USA: 'United States'
}

function normalizarEquipo (nombre) {
  return TEAM_NAME_MAP[nombre] ?? nombre
}

async function main () {
  console.log('=== 1. Llamando a TheSportsDB ===')
  const url = `${THESPORTSDB}/eventsseason.php?id=${LIGA_MUNDIAL}&s=${TEMPORADA}`
  console.log('URL:', url)

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  console.log('Status HTTP:', res.status)

  if (!res.ok) {
    console.error('Error del API:', res.status, res.statusText)
    return
  }

  const data = await res.json()
  const eventos = data?.events ?? []
  console.log(`Eventos recibidos: ${eventos.length}`)

  if (eventos.length === 0) {
    console.log('PROBLEMA: TheSportsDB no devolvió eventos. Respuesta cruda:')
    console.log(JSON.stringify(data))
    return
  }

  // Mostrar muestra de eventos recibidos
  const conResultado = eventos.filter(e => e.intHomeScore !== null && e.intHomeScore !== '')
  const sinResultado = eventos.filter(e => e.intHomeScore === null || e.intHomeScore === '')
  console.log(`  Con resultado: ${conResultado.length}`)
  console.log(`  Sin resultado (NS): ${sinResultado.length}`)

  if (conResultado.length > 0) {
    console.log('\nEjemplos con resultado:')
    conResultado.slice(0, 5).forEach(e => {
      console.log(`  [${e.strStatus}] ${e.strHomeTeam} ${e.intHomeScore}-${e.intAwayScore} ${e.strAwayTeam} (${e.dateEvent})`)
    })
  }

  console.log('\n=== 2. Partidos en la BD (no finalizados) ===')
  const { data: partidos, error } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('id_partido, equipo_a, equipo_b, fecha, estado, goles_a, goles_b')

  if (error) { console.error('Error BD:', error.message); return }

  const pendientes = partidos.filter(p => p.estado !== 'finalizado')
  console.log(`Partidos no finalizados: ${pendientes.length}`)

  console.log('\n=== 3. Cruzando datos ===')
  for (const partido of partidos) {
    const fechaPartido = partido.fecha.slice(0, 10)
    const evento = eventos.find(e => {
      if (e.dateEvent !== fechaPartido) return false
      const local = normalizarEquipo(e.strHomeTeam)
      const visitante = normalizarEquipo(e.strAwayTeam)
      return (local === partido.equipo_a && visitante === partido.equipo_b) ||
        (local === partido.equipo_b && visitante === partido.equipo_a)
    })

    if (partido.estado !== 'finalizado') {
      if (evento) {
        console.log(`  ✓ ENCONTRADO  [${partido.estado}] ${partido.equipo_a} vs ${partido.equipo_b} (${fechaPartido}) → API status: ${evento.strStatus}, score: ${evento.intHomeScore}-${evento.intAwayScore}`)
      } else {
        // Buscar por nombre parcial para diagnosticar mismatch
        const posibles = eventos.filter(e => e.dateEvent === fechaPartido)
        if (posibles.length > 0) {
          console.log(`  ✗ SIN MATCH   ${partido.equipo_a} vs ${partido.equipo_b} (${fechaPartido})`)
          console.log(`    Partidos API ese día: ${posibles.map(e => `"${e.strHomeTeam}" vs "${e.strAwayTeam}"`).join(' | ')}`)
        } else {
          console.log(`  ? SIN FECHA   ${partido.equipo_a} vs ${partido.equipo_b} (${fechaPartido}) — no hay eventos ese día en la API`)
        }
      }
    }
  }

  console.log('\n=== 4. Usuario EYRO / Super_admin ===')
  const { data: eyro } = await supabase
    .schema('quiniela')
    .from('usuarios')
    .select('id_random, nombre_usuario, tipo_user')
    .ilike('nombre_usuario', '%eyro%')
    .maybeSingle()

  if (eyro) {
    console.log(`Usuario: ${eyro.nombre_usuario}, tipo: ${eyro.tipo_user}, id: ${eyro.id_random}`)
    const tipo = String(eyro.tipo_user ?? '').replace(/"/g, '')
    console.log(`¿Es Super_admin? ${tipo === 'Super_admin' ? 'SÍ ✓' : `NO ✗ (valor actual: "${tipo}")`}`)
  } else {
    console.log('No se encontró usuario EYRO')
  }
}

main().catch(err => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
