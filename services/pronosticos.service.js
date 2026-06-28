import { supabase } from '../db/supabase.js'

export async function getPronosticos (idUsuario, idQuiniela) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .select('id_pronostico, id_partido, goles_a_pred, goles_b_pred, penal_a_pred, penal_b_pred, puntos_obtenidos, estado')
    .eq('id_usuario', idUsuario)
    .eq('id_quiniela', idQuiniela)

  if (error) throw new Error(error.message)
  return data || []
}

export async function getPronosticosQuiniela (idQuiniela) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .select('id_pronostico, id_partido, id_usuario, goles_a_pred, goles_b_pred, penal_a_pred, penal_b_pred, puntos_obtenidos')
    .eq('id_quiniela', idQuiniela)

  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertPronostico ({ idQuiniela, idUsuario, idPartido, golesAPred, golesBPred, penalAPred, penalBPred }) {
  if (golesAPred < 0 || golesBPred < 0) throw new Error('Los goles no pueden ser negativos')

  // Verificar que el partido no ha iniciado
  const { data: partido, error: partidoErr } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('fecha, estado, fase')
    .eq('id_partido', idPartido)
    .maybeSingle()

  if (partidoErr || !partido) throw new Error('Partido no encontrado')
  if (partido.estado !== 'pendiente' || new Date(partido.fecha) <= new Date()) {
    throw new Error('Los pronósticos de este partido ya están cerrados')
  }

  const esEmpateEnEliminacion = partido.fase !== 'grupos' && golesAPred === golesBPred
  if (esEmpateEnEliminacion) {
    if (penalAPred === undefined || penalBPred === undefined || penalAPred === null || penalBPred === null) {
      throw new Error('Debes indicar el marcador de la tanda de penales')
    }
    if (penalAPred < 0 || penalBPred < 0) throw new Error('El marcador de penales no puede ser negativo')
    if (penalAPred === penalBPred) throw new Error('La tanda de penales no puede terminar en empate')
  }

  const { data, error } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .upsert(
      {
        id_quiniela: idQuiniela,
        id_usuario: idUsuario,
        id_partido: idPartido,
        goles_a_pred: golesAPred,
        goles_b_pred: golesBPred,
        penal_a_pred: esEmpateEnEliminacion ? penalAPred : null,
        penal_b_pred: esEmpateEnEliminacion ? penalBPred : null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id_quiniela,id_usuario,id_partido' }
    )
    .select('id_pronostico, id_partido, goles_a_pred, goles_b_pred, penal_a_pred, penal_b_pred')
    .single()

  if (error) throw new Error(error.message)
  return data
}
