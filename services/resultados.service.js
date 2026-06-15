import { supabase } from '../db/supabase.js'
import { calcularPuntosPrediccionesFinales, getPuntosPrediccionesFinales } from './prediccionFinal.service.js'

const DEFAULT_REGLAS = {
  puntos_marcador_exacto: 3,
  puntos_ganador_correcto: 1,
  puntos_empate_correcto: 1,
  puntos_diferencia_goles: 1
}

export async function esSuperAdmin (idUsuario) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('usuarios')
    .select('tipo_user')
    .eq('id_random', idUsuario)
    .maybeSingle()

  if (error || !data) return false
  const tipo = String(data.tipo_user ?? '').replace(/"/g, '')
  return tipo === 'Super_admin'
}

export function calcularPuntos (predA, predB, realA, realB, reglas) {
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

export async function registrarResultado ({ idPartido, golesA, golesB, idUsuario }) {
  if (!(await esSuperAdmin(idUsuario))) {
    throw new Error('No autorizado')
  }

  if (golesA < 0 || golesB < 0) throw new Error('Los goles no pueden ser negativos')

  const { data: partido, error: partidoErr } = await supabase
    .schema('quiniela')
    .from('partidos')
    .select('id_partido, fecha')
    .eq('id_partido', idPartido)
    .maybeSingle()

  if (partidoErr) throw new Error(partidoErr.message)
  if (!partido) throw new Error('Partido no encontrado')
  if (new Date(partido.fecha) > new Date()) {
    throw new Error('No se puede registrar el resultado antes de la fecha del partido')
  }

  return aplicarResultado({ idPartido, golesA, golesB })
}

export async function aplicarResultado ({ idPartido, golesA, golesB }) {
  const { data: partidoActualizado, error: updateErr } = await supabase
    .schema('quiniela')
    .from('partidos')
    .update({ goles_a: golesA, goles_b: golesB, estado: 'finalizado', updated_at: new Date().toISOString() })
    .eq('id_partido', idPartido)
    .select()
    .maybeSingle()

  if (updateErr) throw new Error(updateErr.message)
  if (!partidoActualizado) throw new Error('Partido no encontrado')

  const { data: pronosticos, error: pronosticosErr } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .select('id_pronostico, id_quiniela, goles_a_pred, goles_b_pred')
    .eq('id_partido', idPartido)

  if (pronosticosErr) throw new Error(pronosticosErr.message)

  const reglasPorQuiniela = new Map()
  const quinielasAfectadas = new Set()

  for (const pronostico of pronosticos || []) {
    let reglas = reglasPorQuiniela.get(pronostico.id_quiniela)
    if (!reglas) {
      reglas = await getReglas(pronostico.id_quiniela)
      reglasPorQuiniela.set(pronostico.id_quiniela, reglas)
    }

    const puntos = calcularPuntos(pronostico.goles_a_pred, pronostico.goles_b_pred, golesA, golesB, reglas)

    await supabase
      .schema('quiniela')
      .from('pronosticos')
      .update({ puntos_obtenidos: puntos, updated_at: new Date().toISOString() })
      .eq('id_pronostico', pronostico.id_pronostico)

    quinielasAfectadas.add(pronostico.id_quiniela)
  }

  if (partidoActualizado.fase === 'final') {
    const idEquipoCampeon = golesA > golesB ? partidoActualizado.id_equipo_a : partidoActualizado.id_equipo_b
    const quinielasConPrediccion = await calcularPuntosPrediccionesFinales(idEquipoCampeon)
    for (const idQuiniela of quinielasConPrediccion) quinielasAfectadas.add(idQuiniela)
  }

  for (const idQuiniela of quinielasAfectadas) {
    await recalcularRanking(idQuiniela)
  }

  return partidoActualizado
}

export async function recalcularRanking (idQuiniela) {
  const reglas = await getReglas(idQuiniela)

  const { data: pronosticos, error: pronosticosErr } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .select('id_usuario, puntos_obtenidos')
    .eq('id_quiniela', idQuiniela)

  if (pronosticosErr) throw new Error(pronosticosErr.message)

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

  const puntosFinales = await getPuntosPrediccionesFinales(idQuiniela)
  for (const [idUsuario, puntos] of puntosFinales) {
    const actual = totales.get(idUsuario) || { puntos: 0, aciertos_exactos: 0, aciertos_resultado: 0 }
    actual.puntos += puntos
    totales.set(idUsuario, actual)
  }

  const { data: participantes, error: participantesErr } = await supabase
    .schema('quiniela')
    .from('quiniela_usuarios')
    .select('id_quiniela_usuario, id_usuario')
    .eq('id_quiniela', idQuiniela)

  if (participantesErr) throw new Error(participantesErr.message)

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
  }
}
