import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EQUIPOS = {
  France:    '42725ae9-db03-438c-961f-0ac04f1e838b',
  Spain:     '76516745-fc45-4290-988b-290592e112ba',
  England:   'fa45b867-f8fc-47e2-aca8-fcf4a5fa8c48',
  Argentina: 'c246201d-eb21-43fe-8d80-0af018be8ee3',
}

const ESTADIOS = {
  Miami:     '47f1cbec-88dd-416d-88db-452f1bd68ae1', // Miami Stadium (Hard Rock Stadium)
  NewYorkNJ: '0aad20b2-9306-4f58-a582-77a9f1eb09a7', // New York New Jersey Stadium (MetLife Stadium)
}

// Semifinal M101: France 0-2 Spain -> Spain a la final, France a tercer lugar
// Semifinal M102: England 1-2 Argentina -> Argentina a la final, England a tercer lugar

const PARTIDOS = [
  {
    jornada: 103,
    fase: 'tercer_lugar',
    equipo_a: EQUIPOS.France,      // Perdedor M101
    equipo_b: EQUIPOS.England,     // Perdedor M102
    fecha: '2026-07-18T21:00:00Z',
    id_estadio: ESTADIOS.Miami,
    label: 'France vs England (Tercer Lugar - Miami)'
  },
  {
    jornada: 104,
    fase: 'final',
    equipo_a: EQUIPOS.Spain,       // Ganador M101
    equipo_b: EQUIPOS.Argentina,   // Ganador M102
    fecha: '2026-07-19T19:00:00Z',
    id_estadio: ESTADIOS.NewYorkNJ,
    label: 'Spain vs Argentina (Final - Nueva York/NJ)'
  },
]

async function main () {
  for (const m of PARTIDOS) {
    const record = {
      id_equipo_a: m.equipo_a,
      id_equipo_b: m.equipo_b,
      fecha: m.fecha,
      id_estadio: m.id_estadio,
      fase: m.fase,
      jornada: m.jornada,
      estado: 'pendiente',
      grupo: null,
    }

    const { error } = await supabase
      .schema('quiniela')
      .from('partidos')
      .insert(record)

    if (error) {
      console.error(`  ✗ M${m.jornada} ${m.label}: ${error.message}`)
    } else {
      console.log(`  ✓ M${m.jornada} ${m.label}`)
    }
  }
  console.log('\nListo.')
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
