import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEFAULT_REGLAS = { puntos_marcador_exacto: 3, puntos_ganador_correcto: 1, puntos_empate_correcto: 1 }

function calcularPuntos (predA, predB, realA, realB, reglas) {
  if (predA === realA && predB === realB) return reglas.puntos_marcador_exacto
  const signoPred = Math.sign(predA - predB)
  const signoReal = Math.sign(realA - realB)
  if (signoPred !== signoReal) return 0
  return signoReal === 0 ? reglas.puntos_empate_correcto : reglas.puntos_ganador_correcto
}

async function getReglas (idQuiniela) {
  const { data } = await supabase.schema('quiniela').from('reglas_puntaje')
    .select('puntos_marcador_exacto, puntos_ganador_correcto, puntos_empate_correcto')
    .eq('id_quiniela', idQuiniela).maybeSingle()
  return data || DEFAULT_REGLAS
}

async function recalcularRanking (idQuiniela, reglas) {
  const { data: pronosticos } = await supabase.schema('quiniela').from('pronosticos')
    .select('id_usuario, puntos_obtenidos').eq('id_quiniela', idQuiniela)

  const totales = new Map()
  for (const p of pronosticos || []) {
    const actual = totales.get(p.id_usuario) || { puntos: 0, aciertos_exactos: 0, aciertos_resultado: 0 }
    const puntos = p.puntos_obtenidos || 0
    actual.puntos += puntos
    if (puntos > 0) {
      if (puntos === reglas.puntos_marcador_exacto) actual.aciertos_exactos += 1
      else actual.aciertos_resultado += 1
    }
    totales.set(p.id_usuario, actual)
  }

  const { data: participantes } = await supabase.schema('quiniela').from('quiniela_usuarios')
    .select('id_quiniela_usuario, id_usuario').eq('id_quiniela', idQuiniela)

  const vacio = { puntos: 0, aciertos_exactos: 0, aciertos_resultado: 0 }
  const ordenados = (participantes || [])
    .map(p => ({ ...p, ...(totales.get(p.id_usuario) || vacio) }))
    .sort((a, b) => b.puntos - a.puntos)

  const ahora = new Date().toISOString()
  for (let i = 0; i < ordenados.length; i++) {
    const item = ordenados[i]
    const posicion = i + 1

    await supabase.schema('quiniela').from('quiniela_usuarios')
      .update({ puntos: item.puntos, posicion }).eq('id_quiniela_usuario', item.id_quiniela_usuario)

    const { data: rankingExistente } = await supabase.schema('quiniela').from('ranking')
      .select('id_ranking').eq('id_quiniela', idQuiniela).eq('id_usuario', item.id_usuario).maybeSingle()

    if (rankingExistente) {
      await supabase.schema('quiniela').from('ranking').update({
        puntos: item.puntos, aciertos_exactos: item.aciertos_exactos, aciertos_resultado: item.aciertos_resultado, posicion, updated_at: ahora
      }).eq('id_ranking', rankingExistente.id_ranking)
    } else {
      await supabase.schema('quiniela').from('ranking').insert({
        id_quiniela: idQuiniela, id_usuario: item.id_usuario, puntos: item.puntos,
        aciertos_exactos: item.aciertos_exactos, aciertos_resultado: item.aciertos_resultado, posicion, updated_at: ahora
      })
    }
    console.log(`  Usuario ${item.id_usuario}: ${item.puntos} pts (pos ${posicion})`)
  }
}

async function main () {
  const idPartido = '02f33def-d854-4fba-923d-ccff75f9418c' // Panama vs Croatia
  const golesA = 0 // Panama
  const golesB = 1 // Croatia

  console.log('Actualizando marcador a Panama 0 - Croacia 1...')
  const { error: updateErr } = await supabase.schema('quiniela').from('partidos')
    .update({ goles_a: golesA, goles_b: golesB, estado: 'finalizado', updated_at: new Date().toISOString() })
    .eq('id_partido', idPartido)
  if (updateErr) throw new Error(updateErr.message)

  const { data: pronosticos, error: pronErr } = await supabase.schema('quiniela').from('pronosticos')
    .select('id_pronostico, id_quiniela, id_usuario, goles_a_pred, goles_b_pred')
    .eq('id_partido', idPartido)
  if (pronErr) throw new Error(pronErr.message)
  console.log(`Pronósticos encontrados: ${pronosticos.length}`)

  const reglasPorQuiniela = new Map()
  const quinielasAfectadas = new Set()

  for (const pron of pronosticos || []) {
    let reglas = reglasPorQuiniela.get(pron.id_quiniela)
    if (!reglas) {
      reglas = await getReglas(pron.id_quiniela)
      reglasPorQuiniela.set(pron.id_quiniela, reglas)
    }
    const puntos = calcularPuntos(pron.goles_a_pred, pron.goles_b_pred, golesA, golesB, reglas)
    console.log(`  Pronóstico ${pron.id_pronostico}: pred ${pron.goles_a_pred}-${pron.goles_b_pred} -> ${puntos} pts`)

    await supabase.schema('quiniela').from('pronosticos')
      .update({ puntos_obtenidos: puntos, updated_at: new Date().toISOString() })
      .eq('id_pronostico', pron.id_pronostico)

    quinielasAfectadas.add(pron.id_quiniela)
  }

  console.log(`\nRecalculando ranking para ${quinielasAfectadas.size} quiniela(s)...`)
  for (const idQuiniela of quinielasAfectadas) {
    console.log(`Quiniela ${idQuiniela}:`)
    const reglas = reglasPorQuiniela.get(idQuiniela) || DEFAULT_REGLAS
    await recalcularRanking(idQuiniela, reglas)
  }

  console.log('\n✓ Corrección completada.')
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
