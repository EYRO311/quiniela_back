import { supabase } from '../db/supabase.js'

export async function getPartidos () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('*')
    .order('grupo', { ascending: true, nullsFirst: false })
    .order('fecha', { ascending: true })

  if (error) throw new Error(error.message)
  if (!data?.length) return []

  // La vista no incluye penal_a/penal_b (agregados después de crearla).
  // Los traemos directo de la tabla partidos y los fusionamos.
  const { data: penales } = await supabase
    .schema('quiniela')
    .from('partidos')
    .select('id_partido, penal_a, penal_b')
    .in('id_partido', data.map(p => p.id_partido))

  const penalesMap = new Map((penales || []).map(p => [p.id_partido, p]))
  return data.map(p => ({ ...p, penal_a: penalesMap.get(p.id_partido)?.penal_a ?? null, penal_b: penalesMap.get(p.id_partido)?.penal_b ?? null }))
}

export async function getProximoPartido () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('*')
    .gte('fecha', new Date().toISOString())
    .order('fecha', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}
