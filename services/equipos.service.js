import { supabase } from '../db/supabase.js'

export async function getEquipos () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('equipos')
    .select('id_equipo, nombre_pais, escudo_url, bandera_url, codigo_fifa, grupo')
    .order('grupo', { ascending: true, nullsFirst: false })
    .order('nombre_pais', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getJugadoresPorEquipo (idEquipo) {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('jugadores')
    .select('*')
    .eq('id_equipo', idEquipo)
    .order('numero', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}
