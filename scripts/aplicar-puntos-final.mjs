import 'dotenv/config'
import { calcularPuntosPrediccionesFinales } from '../services/prediccionFinal.service.js'
import { recalcularRanking } from '../services/resultados.service.js'

// Final (M104): Spain 1-0 Argentina -> Spain campeon, Argentina subcampeon
const ID_EQUIPO_CAMPEON = '76516745-fc45-4290-988b-290592e112ba' // Spain
const ID_EQUIPO_SUBCAMPEON = 'c246201d-eb21-43fe-8d80-0af018be8ee3' // Argentina

async function main () {
  const quinielasAfectadas = await calcularPuntosPrediccionesFinales(ID_EQUIPO_CAMPEON, ID_EQUIPO_SUBCAMPEON)
  console.log(`Predicciones finales calculadas para ${quinielasAfectadas.size} quiniela(s).`)

  for (const idQuiniela of quinielasAfectadas) {
    await recalcularRanking(idQuiniela)
    console.log(`  Ranking recalculado: ${idQuiniela}`)
  }

  console.log('\nListo.')
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
