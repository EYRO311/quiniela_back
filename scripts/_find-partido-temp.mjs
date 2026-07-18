import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .schema('quiniela')
  .from('vw_partidos_detalle')
  .select('id_partido, equipo_a, equipo_b, goles_a, goles_b, fecha, fase, estado')
  .or('equipo_a.ilike.%japan%,equipo_b.ilike.%japan%')

if (error) throw new Error(error.message)
console.log(data)
