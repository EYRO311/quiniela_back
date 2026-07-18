import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EQUIPOS = {
  Paraguay:      'dbd4ef5f-ef63-4668-936a-8a9c9aeb34a0',
  France:        '42725ae9-db03-438c-961f-0ac04f1e838b',
  Canada:        '11db5a6c-cf92-4afb-bd58-320e53c8eaba',
  Morocco:       '7ef4a057-5e88-4a53-adf3-2d7b6d139cd0',
  Brazil:        '337285ec-cfd8-4c5a-b278-00905d0bad25',
  Norway:        'a101a521-dcb6-48b0-9337-615a00cb4ddb',
  Mexico:        'c2cd170a-dc4c-4e00-8281-de863afea124',
  England:       'fa45b867-f8fc-47e2-aca8-fcf4a5fa8c48',
  Portugal:      '70892ec2-f8c4-4ad4-bf72-91dce18ba469',
  Spain:         '76516745-fc45-4290-988b-290592e112ba',
  UnitedStates:  'b2e3b819-0f9d-4394-9400-2783f6edf863',
  Belgium:       'fd6b434b-931b-421a-8be7-20dfbba463cd',
  Argentina:     'c246201d-eb21-43fe-8d80-0af018be8ee3',
  Egypt:         'bff6fc75-4881-4cd0-91e5-4718ea9afba1',
  Switzerland:   '6b5e763d-91c6-49cd-beb5-e58c8c94cb58',
  Colombia:      '831c4d16-422f-47f6-9621-3eb2a09ce94a',
}

// Stadium IDs from DB
const ESTADIOS = {
  Philadelphia: 'f33ffee0-73a6-48d4-90e6-d447723e0582', // Philadelphia Stadium
  Houston:      'aa13628d-62cf-4898-a496-e1420bb88604', // Houston Stadium
  NewYorkNJ:    '0aad20b2-9306-4f58-a582-77a9f1eb09a7', // New York New Jersey Stadium
  MexicoCity:   'ee770d6b-fa3c-4414-a626-3f705b3f4138', // Mexico City Stadium
  Dallas:       '9d625551-eb11-42d9-bbc4-bad21c76acb5', // Dallas Stadium
  Seattle:      'd2fa7839-0293-4e4d-9508-c1eb0b270c1b', // Seattle Stadium
  Atlanta:      'ea33b433-b1d3-477e-9770-d9cae0955cc7', // Atlanta Stadium
  Vancouver:    'e164c3bd-43d5-4732-986e-c92ae4bbb8f4', // BC Place Vancouver
}

// Penalty winners:
// M74: Germany 1-1 Paraguay (pen 3-4) → Paraguay
// M75: Netherlands 1-1 Morocco (pen 2-3) → Morocco
// M88: Australia 1-1 Egypt (pen 3-4) → Egypt

const OCTAVOS = [
  {
    jornada: 89,
    equipo_a: EQUIPOS.Paraguay,      // Winner M74
    equipo_b: EQUIPOS.France,        // Winner M77
    fecha: '2026-07-04T21:00:00Z',
    id_estadio: ESTADIOS.Philadelphia,
    label: 'Paraguay vs France (Philadelphia)'
  },
  {
    jornada: 90,
    equipo_a: EQUIPOS.Canada,        // Winner M73
    equipo_b: EQUIPOS.Morocco,       // Winner M75
    fecha: '2026-07-04T17:00:00Z',
    id_estadio: ESTADIOS.Houston,
    label: 'Canada vs Morocco (Houston)'
  },
  {
    jornada: 91,
    equipo_a: EQUIPOS.Brazil,        // Winner M76
    equipo_b: EQUIPOS.Norway,        // Winner M78
    fecha: '2026-07-05T20:00:00Z',
    id_estadio: ESTADIOS.NewYorkNJ,
    label: 'Brazil vs Norway (New York/NJ)'
  },
  {
    jornada: 92,
    equipo_a: EQUIPOS.Mexico,        // Winner M79
    equipo_b: EQUIPOS.England,       // Winner M80
    fecha: '2026-07-06T00:00:00Z',
    id_estadio: ESTADIOS.MexicoCity,
    label: 'Mexico vs England (Mexico City)'
  },
  {
    jornada: 93,
    equipo_a: EQUIPOS.Portugal,      // Winner M83
    equipo_b: EQUIPOS.Spain,         // Winner M84
    fecha: '2026-07-06T19:00:00Z',
    id_estadio: ESTADIOS.Dallas,
    label: 'Portugal vs Spain (Dallas)'
  },
  {
    jornada: 94,
    equipo_a: EQUIPOS.UnitedStates,  // Winner M81
    equipo_b: EQUIPOS.Belgium,       // Winner M82
    fecha: '2026-07-07T00:00:00Z',
    id_estadio: ESTADIOS.Seattle,
    label: 'United States vs Belgium (Seattle)'
  },
  {
    jornada: 95,
    equipo_a: EQUIPOS.Argentina,     // Winner M86
    equipo_b: EQUIPOS.Egypt,         // Winner M88
    fecha: '2026-07-07T16:00:00Z',
    id_estadio: ESTADIOS.Atlanta,
    label: 'Argentina vs Egypt (Atlanta)'
  },
  {
    jornada: 96,
    equipo_a: EQUIPOS.Switzerland,   // Winner M85
    equipo_b: EQUIPOS.Colombia,      // Winner M87
    fecha: '2026-07-07T20:00:00Z',
    id_estadio: ESTADIOS.Vancouver,
    label: 'Switzerland vs Colombia (Vancouver)'
  },
]

async function main () {
  for (const m of OCTAVOS) {
    const record = {
      id_equipo_a: m.equipo_a,
      id_equipo_b: m.equipo_b,
      fecha: m.fecha,
      id_estadio: m.id_estadio,
      fase: 'octavos',
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
