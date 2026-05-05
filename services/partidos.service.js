import { supabase } from '../db/supabase.js'

export async function getPartidos () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('*')
    .order('grupo', { ascending: true, nullsFirst: false })
    .order('fecha', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}
