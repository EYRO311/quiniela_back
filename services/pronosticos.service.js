import { supabase } from '../db/supabase.js'

export async function getPronosticos (idUsuario, idQuiniela) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('pronosticos')
    .select('id_pronostico, id_partido, goles_a_pred, goles_b_pred, puntos_obtenidos, estado')
    .eq('id_usuario', idUsuario)
    .eq('id_quiniela', idQuiniela)

  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertPronostico ({ idQuiniela, idUsuario, idPartido, golesAPred, golesBPred }) {
  if (golesAPred < 0 || golesBPred < 0) throw new Error('Los goles no pueden ser negativos')

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
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id_quiniela,id_usuario,id_partido' }
    )
    .select('id_pronostico, id_partido, goles_a_pred, goles_b_pred')
    .single()

  if (error) throw new Error(error.message)
  return data
}
