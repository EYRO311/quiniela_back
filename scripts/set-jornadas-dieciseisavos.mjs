import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// id_partido values obtained from the DB query of dieciseisavos matches
const UPDATES = [
  { id_partido: '235a03fc-aa46-40f7-b7df-3f8ef86b04c0', jornada: 73 }, // South Africa vs Canada
  { id_partido: '07fe88ee-d874-447a-96b9-34a83de37de2', jornada: 74 }, // Germany vs Paraguay
  { id_partido: 'be919f46-f824-48db-b5d9-6048310c8129', jornada: 75 }, // Netherlands vs Morocco
  { id_partido: '5c5d747a-ffdb-4a6f-b61b-e454f4f1a573', jornada: 76 }, // Brazil vs Japan
  { id_partido: '9b0f46b5-65b9-4a43-b9c5-b3986ea91541', jornada: 77 }, // France vs Sweden
  { id_partido: 'ae36b932-bebd-4be9-8b4b-eb38fe290dca', jornada: 78 }, // Ivory Coast vs Norway
  { id_partido: '726cfa7e-f890-4157-8261-07773bdeb298', jornada: 79 }, // Mexico vs Ecuador
  { id_partido: 'daac7110-1a02-4041-8662-45e2e765fb0b', jornada: 80 }, // England vs DR Congo
  { id_partido: 'd808b0e0-3d89-43cc-aefc-f382550db1c8', jornada: 81 }, // United States vs Bosnia
  { id_partido: '46e7b35b-a41c-467a-bc57-8e6e68402fd5', jornada: 82 }, // Belgium vs Senegal
  { id_partido: 'f01a7137-f453-4553-a029-4eb143a818bf', jornada: 83 }, // Portugal vs Croatia
  { id_partido: 'fe83ea44-67e7-4196-b428-10821ff98541', jornada: 84 }, // Spain vs Austria
  { id_partido: '59a60984-2a10-4f0d-bc20-5c09753ff63c', jornada: 85 }, // Switzerland vs Algeria
  { id_partido: '4ea56fac-b90a-4320-a34a-5700954190bf', jornada: 86 }, // Argentina vs Cape Verde
  { id_partido: '69b57cee-6fa3-4d59-bd11-8fee957efe40', jornada: 87 }, // Colombia vs Ghana
  { id_partido: '016384ea-c06e-4d9c-a031-62cdac06a5b8', jornada: 88 }, // Australia vs Egypt
]

async function main () {
  for (const { id_partido, jornada } of UPDATES) {
    const { error } = await supabase
      .schema('quiniela')
      .from('partidos')
      .update({ jornada })
      .eq('id_partido', id_partido)
    if (error) {
      console.error(`  ✗ M${jornada} (${id_partido}): ${error.message}`)
    } else {
      console.log(`  ✓ M${jornada} asignado`)
    }
  }
  console.log('\nListo.')
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
