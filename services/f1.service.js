import { supabase } from '../db/supabase.js'

export async function getPilotos () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_pilotos')
    .select(`
      id_piloto,
      nombre,
      numero,
      pais,
      activo,
      f1_piloto_escuderia(
        rol,
        temporada,
        activo,
        f1_escuderias(id_escuderia, nombre, color, pais)
      )
    `)
    .eq('activo', 1)
    .order('nombre')

  if (error) throw new Error(error.message)
  return data || []
}

export async function getEscuderias () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_escuderias')
    .select('*')
    .eq('activo', 1)
    .order('nombre')

  if (error) throw new Error(error.message)
  return data || []
}

export async function getCarreras () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_carreras')
    .select('*')
    .order('fecha_carrera', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getCampeonatoPilotos () {
  const { data, error } = await supabase
    .schema('quiniela')
    .from('f1_piloto_escuderia')
    .select(`
      id_piloto_escuderia,
      rol,
      temporada,
      f1_pilotos(id_piloto, nombre, numero, pais),
      f1_escuderias(id_escuderia, nombre, color)
    `)
    .eq('activo', 1)
    .in('rol', ['titular', 'tercer_piloto'])
    .order('temporada', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}
