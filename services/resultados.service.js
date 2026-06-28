import { supabase } from '../db/supabase.js'
import { calcularPuntosPrediccionesFinales, getPuntosPrediccionesFinales } from './prediccionFinal.service.js'
import { sendResultadoPartidoEmail } from './email.service.js'

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

const PUNTOS_PENALES_MARCADOR_EXACTO = 2
const PUNTOS_PENALES_GANADOR = 1

export function calcularPuntos (predA, predB, realA, realB, reglas, opciones = {}) {
  const { esEliminacion = false, penalAPred = null, penalBPred = null, penalAReal = null, penalBReal = null } = opciones

  if (predA === realA && predB === realB) {
    let puntos = reglas.puntos_marcador_exacto
    // En eliminación, un marcador empatado se desempata por penales: además del
    // marcador exacto, hay puntos extra por acertar el marcador o el ganador de penales.
    if (esEliminacion && realA === realB) {
      puntos += calcularPuntosPenales(penalAPred, penalBPred, penalAReal, penalBReal)
    }
    return puntos
  }

  // En eliminación, "quién gana" lo decide la tanda de penales cuando hay empate.
  const signoPred = predA === predB
    ? (esEliminacion ? signoPenal(penalAPred, penalBPred) : 0)
    : Math.sign(predA - predB)
  const signoReal = realA === realB
    ? (esEliminacion ? signoPenal(penalAReal, penalBReal) : 0)
    : Math.sign(realA - realB)

  if (signoPred !== signoReal) return 0
  return signoReal === 0 ? reglas.puntos_empate_correcto : reglas.puntos_ganador_correcto
}

function signoPenal (golesA, golesB) {
  if (golesA === null || golesB === null || golesA === golesB) return 0
  return golesA > golesB ? 1 : -1
}

function calcularPuntosPenales (predA, predB, realA, realB) {
  if (predA === null || predB === null || realA === null || realB === null) return 0
  if (predA === realA && predB === realB) return PUNTOS_PENALES_MARCADOR_EXACTO

  const signoPred = signoPenal(predA, predB)
  const signoReal = signoPenal(realA, realB)
  return signoPred !== 0 && signoPred === signoReal ? PUNTOS_PENALES_GANADOR : 0
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

export async function registrarResultado ({ idPartido, golesA, golesB, idUsuario, penalA, penalB }) {
  if (!(await esSuperAdmin(idUsuario))) {
    throw new Error('No autorizado')
  }

  if (golesA < 0 || golesB < 0) throw new Error('Los goles no pueden ser negativos')

  const { data: partido, error: partidoErr } = await supabase
    .schema('quiniela')
    .from('partidos')
    .select('id_partido, fecha, fase')
    .eq('id_partido', idPartido)
    .maybeSingle()

  if (partidoErr) throw new Error(partidoErr.message)
  if (!partido) throw new Error('Partido no encontrado')
  if (new Date(partido.fecha) > new Date()) {
    throw new Error('No se puede registrar el resultado antes de la fecha del partido')
  }

  if (partido.fase !== 'grupos' && golesA === golesB) {
    if (penalA === undefined || penalB === undefined || penalA === null || penalB === null) {
      throw new Error('Debes indicar el marcador de la tanda de penales')
    }
    if (penalA < 0 || penalB < 0) throw new Error('El marcador de penales no puede ser negativo')
    if (penalA === penalB) throw new Error('La tanda de penales no puede terminar en empate')
  }

  return aplicarResultado({ idPartido, golesA, golesB, penalA, penalB })
}

async function enviarNotificacionesResultado ({ idPartido, golesA, golesB, notificaciones }) {
  if (!notificaciones.length) return

  const { data: partido } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('equipo_a, equipo_b')
    .eq('id_partido', idPartido)
    .maybeSingle()

  if (!partido) return

  const idsUsuarios = [...new Set(notificaciones.map(n => n.idUsuario))]
  const { data: usuarios } = await supabase
    .schema('quiniela')
    .from('usuarios')
    .select('id_random, correo')
    .in('id_random', idsUsuarios)

  const correoPorUsuario = new Map((usuarios || []).map(u => [u.id_random, u.correo]))

  for (const n of notificaciones) {
    const correo = correoPorUsuario.get(n.idUsuario)
    if (!correo) continue

    try {
      await sendResultadoPartidoEmail(correo, {
        equipoA: partido.equipo_a,
        equipoB: partido.equipo_b,
        golesA,
        golesB,
        golesAPred: n.golesAPred,
        golesBPred: n.golesBPred,
        puntosObtenidos: n.puntos
      })
    } catch (err) {
      console.error(`Error enviando correo de resultado a ${correo}:`, err.message)
    }
  }
}

export async function aplicarResultado ({ idPartido, golesA, golesB, penalA, penalB }) {
  const esEmpate = golesA === golesB
  const { data: partidoActualizado, error: updateErr } = await supabase
    .schema('quiniela')
    .from('partidos')
    .update({
      goles_a: golesA,
      goles_b: golesB,
      penal_a: esEmpate ? (penalA ?? null) : null,
      penal_b: esEmpate ? (penalB ?? null) : null,
      estado: 'finalizado',
      updated_at: new Date().toISOString()
    })
    .eq('id_partido', idPartido)
    .select()
    .maybeSingle()

  if (updateErr) throw new Error(updateErr.message)
  if (!partidoActualizado) throw new Error('Partido no encontrado')

  const esEliminacion = partidoActualizado.fase !== 'grupos'

  const { data: pronosticos, error: pronosticosErr } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .select('id_pronostico, id_quiniela, id_usuario, goles_a_pred, goles_b_pred, penal_a_pred, penal_b_pred')
    .eq('id_partido', idPartido)

  if (pronosticosErr) throw new Error(pronosticosErr.message)

  const reglasPorQuiniela = new Map()
  const quinielasAfectadas = new Set()
  const notificaciones = []

  for (const pronostico of pronosticos || []) {
    let reglas = reglasPorQuiniela.get(pronostico.id_quiniela)
    if (!reglas) {
      reglas = await getReglas(pronostico.id_quiniela)
      reglasPorQuiniela.set(pronostico.id_quiniela, reglas)
    }

    const puntos = calcularPuntos(pronostico.goles_a_pred, pronostico.goles_b_pred, golesA, golesB, reglas, {
      esEliminacion,
      penalAPred: pronostico.penal_a_pred,
      penalBPred: pronostico.penal_b_pred,
      penalAReal: partidoActualizado.penal_a,
      penalBReal: partidoActualizado.penal_b
    })

    await supabase
      .schema('quiniela')
      .from('pronosticos')
      .update({ puntos_obtenidos: puntos, updated_at: new Date().toISOString() })
      .eq('id_pronostico', pronostico.id_pronostico)

    quinielasAfectadas.add(pronostico.id_quiniela)
    notificaciones.push({
      idUsuario: pronostico.id_usuario,
      golesAPred: pronostico.goles_a_pred,
      golesBPred: pronostico.goles_b_pred,
      puntos
    })
  }

  await enviarNotificacionesResultado({ idPartido, golesA, golesB, notificaciones })

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
      if (puntos >= reglas.puntos_marcador_exacto) actual.aciertos_exactos += 1
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
