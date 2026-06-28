import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEFAULT_REGLAS = {
  puntos_marcador_exacto: 3,
  puntos_ganador_correcto: 1,
  puntos_empate_correcto: 1,
  puntos_diferencia_goles: 1
}

function calcularPuntos (predA, predB, realA, realB, reglas) {
  if (predA === realA && predB === realB) return reglas.puntos_marcador_exacto

  const signoPred = Math.sign(predA - predB)
  const signoReal = Math.sign(realA - realB)
  if (signoPred !== signoReal) return 0

  let puntos = signoReal === 0 ? reglas.puntos_empate_correcto : reglas.puntos_ganador_correcto
  if ((predA - predB) === (realA - realB)) puntos += reglas.puntos_diferencia_goles
  return puntos
}

async function getReglas (idQuiniela) {
  const { data } = await supabase
    .schema('quiniela')
    .from('reglas_puntaje')
    .select('puntos_marcador_exacto, puntos_ganador_correcto, puntos_empate_correcto, puntos_diferencia_goles')
    .eq('id_quiniela', idQuiniela)
    .maybeSingle()
  return data || DEFAULT_REGLAS
}

async function recalcularRanking (idQuiniela, reglas) {
  const { data: pronosticos, error } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .select('id_usuario, puntos_obtenidos')
    .eq('id_quiniela', idQuiniela)

  if (error) throw new Error(error.message)

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

  const { data: participantes } = await supabase
    .schema('quiniela')
    .from('quiniela_usuarios')
    .select('id_quiniela_usuario, id_usuario')
    .eq('id_quiniela', idQuiniela)

  const vacio = { puntos: 0, aciertos_exactos: 0, aciertos_resultado: 0 }
  const ordenados = (participantes || [])
    .map(p => ({ ...p, ...(totales.get(p.id_usuario) || vacio) }))
    .sort((a, b) => b.puntos - a.puntos)

  const ahora = new Date().toISOString()

  for (let i = 0; i < ordenados.length; i++) {
    const item = ordenados[i]
    const posicion = i + 1

    await supabase
      .schema('quiniela')
      .from('quiniela_usuarios')
      .update({ puntos: item.puntos, posicion })
      .eq('id_quiniela_usuario', item.id_quiniela_usuario)

    const { data: rankingExistente } = await supabase
      .schema('quiniela')
      .from('ranking')
      .select('id_ranking')
      .eq('id_quiniela', idQuiniela)
      .eq('id_usuario', item.id_usuario)
      .maybeSingle()

    if (rankingExistente) {
      await supabase
        .schema('quiniela')
        .from('ranking')
        .update({
          puntos: item.puntos,
          aciertos_exactos: item.aciertos_exactos,
          aciertos_resultado: item.aciertos_resultado,
          posicion,
          updated_at: ahora
        })
        .eq('id_ranking', rankingExistente.id_ranking)
    } else {
      await supabase
        .schema('quiniela')
        .from('ranking')
        .insert({
          id_quiniela: idQuiniela,
          id_usuario: item.id_usuario,
          puntos: item.puntos,
          aciertos_exactos: item.aciertos_exactos,
          aciertos_resultado: item.aciertos_resultado,
          posicion,
          updated_at: ahora
        })
    }

    console.log(`  Usuario ${item.id_usuario}: ${item.puntos} pts (pos ${posicion})`)
  }
}

async function main () {
  console.log('Buscando partido Arabia Saudita vs Uruguay...')

  // Buscar los equipos por nombre
  const { data: equipos, error: eqErr } = await supabase
    .schema('quiniela')
    .from('equipos')
    .select('id_equipo, nombre_pais')
    .or('nombre_pais.ilike.%arabia%,nombre_pais.ilike.%saudi%,nombre_pais.ilike.%uruguay%')

  if (eqErr) throw new Error(eqErr.message)
  console.log('Equipos encontrados:', equipos)

  const arabia = equipos.find(e => e.nombre_pais.toLowerCase().includes('arabia') || e.nombre_pais.toLowerCase().includes('saudi'))
  const uruguay = equipos.find(e => e.nombre_pais.toLowerCase().includes('uruguay'))

  if (!arabia) throw new Error('No se encontró el equipo Arabia Saudita')
  if (!uruguay) throw new Error('No se encontró el equipo Uruguay')

  console.log(`Arabia Saudita ID: ${arabia.id_equipo}`)
  console.log(`Uruguay ID: ${uruguay.id_equipo}`)

  // Buscar el partido entre ambos equipos
  const { data: partidos, error: partErr } = await supabase
    .schema('quiniela')
    .from('partidos')
    .select('*')
    .or(
      `and(id_equipo_a.eq.${arabia.id_equipo},id_equipo_b.eq.${uruguay.id_equipo}),and(id_equipo_a.eq.${uruguay.id_equipo},id_equipo_b.eq.${arabia.id_equipo})`
    )

  if (partErr) throw new Error(partErr.message)
  if (!partidos || partidos.length === 0) throw new Error('No se encontró el partido Arabia Saudita vs Uruguay')

  const partido = partidos[0]
  console.log('\nPartido encontrado:')
  console.log(`  ID: ${partido.id_partido}`)
  console.log(`  Equipo A (id ${partido.id_equipo_a}) vs Equipo B (id ${partido.id_equipo_b})`)
  console.log(`  Marcador actual: ${partido.goles_a} - ${partido.goles_b}`)
  console.log(`  Estado: ${partido.estado}`)

  // Determinar qué goles corresponden a quién
  const esArabiaPrimero = partido.id_equipo_a === arabia.id_equipo
  const golesA = 1  // 1-1
  const golesB = 1

  console.log('\nActualizando marcador a 1-1...')

  const { error: updateErr } = await supabase
    .schema('quiniela')
    .from('partidos')
    .update({ goles_a: golesA, goles_b: golesB, estado: 'finalizado', updated_at: new Date().toISOString() })
    .eq('id_partido', partido.id_partido)

  if (updateErr) throw new Error(updateErr.message)
  console.log('Marcador actualizado correctamente.')

  // Recalcular puntos de los pronósticos
  const { data: pronosticos, error: pronErr } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .select('id_pronostico, id_quiniela, id_usuario, goles_a_pred, goles_b_pred')
    .eq('id_partido', partido.id_partido)

  if (pronErr) throw new Error(pronErr.message)
  console.log(`\nPronósticos encontrados: ${pronosticos.length}`)

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

    const { error: pErr } = await supabase
      .schema('quiniela')
      .from('pronosticos')
      .update({ puntos_obtenidos: puntos, updated_at: new Date().toISOString() })
      .eq('id_pronostico', pron.id_pronostico)

    if (pErr) console.error(`  ERROR actualizando pronóstico ${pron.id_pronostico}:`, pErr.message)

    quinielasAfectadas.add(pron.id_quiniela)
  }

  // Recalcular ranking de cada quiniela afectada
  console.log(`\nRecalculando ranking para ${quinielasAfectadas.size} quiniela(s)...`)
  for (const idQuiniela of quinielasAfectadas) {
    console.log(`\nQuiniela ${idQuiniela}:`)
    const reglas = reglasPorQuiniela.get(idQuiniela) || DEFAULT_REGLAS
    await recalcularRanking(idQuiniela, reglas)
  }

  console.log('\n✓ Corrección completada exitosamente.')
}

main().catch(err => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
