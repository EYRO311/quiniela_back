import 'dotenv/config'
import { aplicarResultado } from '../services/resultados.service.js'

const ID_PARTIDO = '5c5d747a-ffdb-4a6f-b61b-e454f4f1a573' // Brazil vs Japan (Dieciseisavos)

async function main () {
  const partido = await aplicarResultado({ idPartido: ID_PARTIDO, golesA: 2, golesB: 1 })
  console.log(`✓ Corregido: Brasil ${partido.goles_a} - ${partido.goles_b} Japón`)
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
