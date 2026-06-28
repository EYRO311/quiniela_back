import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Configuración ──
const USERNAME     = 'EYRO'
const QUINIELA_NOMBRE = 'familiar'   // búsqueda parcial, case-insensitive
const EQUIPO_A_BUSCAR = 'south africa'
const EQUIPO_B_BUSCAR = 'czech'
// Resultado: Chequia gana 2-0
// Chequia = equipo_B en el nombre de búsqueda, así que:
const GANADOR      = 'B'   // equipo_B = Chequia
const GOLES_GANADOR = 2
const GOLES_PERDEDOR = 0

async function main () {
  // 1. Usuario
  const { data: user } = await supabase.schema('quiniela').from('usuarios')
    .select('id_random, username').ilike('username', USERNAME).maybeSingle()
  if (!user) throw new Error(`Usuario "${USERNAME}" no encontrado`)
  console.log(`Usuario: ${user.username} (${user.id_random})`)

  // 2. Quiniela
  const { data: quinielas } = await supabase.schema('quiniela').from('quinielas')
    .select('id_quiniela, nombre').ilike('nombre', `%${QUINIELA_NOMBRE}%`)
  if (!quinielas?.length) throw new Error(`No se encontró quiniela con "${QUINIELA_NOMBRE}"`)
  const quiniela = quinielas[0]
  console.log(`Quiniela: ${quiniela.nombre} (${quiniela.id_quiniela})`)

  // 3. Partido
  const { data: partidos } = await supabase.schema('quiniela').from('vw_partidos_detalle')
    .select('id_partido, equipo_a, equipo_b, fecha, estado')
    .or(`equipo_a.ilike.%${EQUIPO_A_BUSCAR}%,equipo_b.ilike.%${EQUIPO_A_BUSCAR}%`)

  const partido = partidos?.find(p =>
    (p.equipo_a.toLowerCase().includes(EQUIPO_A_BUSCAR) && p.equipo_b.toLowerCase().includes(EQUIPO_B_BUSCAR)) ||
    (p.equipo_b.toLowerCase().includes(EQUIPO_A_BUSCAR) && p.equipo_a.toLowerCase().includes(EQUIPO_B_BUSCAR))
  )
  if (!partido) throw new Error('Partido no encontrado')
  console.log(`Partido: ${partido.equipo_a} vs ${partido.equipo_b} (${partido.fecha.slice(0,10)}) — ${partido.estado}`)

  // 4. Determinar goles según qué equipo es el ganador
  const chequia = partido.equipo_a.toLowerCase().includes(EQUIPO_B_BUSCAR) ? 'A' : 'B'
  const golesA = chequia === 'A' ? GOLES_GANADOR : GOLES_PERDEDOR
  const golesB = chequia === 'B' ? GOLES_GANADOR : GOLES_PERDEDOR
  console.log(`Predicción: ${partido.equipo_a} ${golesA} - ${golesB} ${partido.equipo_b}`)

  // 5. Upsert pronóstico
  const { data, error } = await supabase.schema('quiniela').from('pronosticos')
    .upsert({
      id_quiniela: quiniela.id_quiniela,
      id_usuario: user.id_random,
      id_partido: partido.id_partido,
      goles_a_pred: golesA,
      goles_b_pred: golesB,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id_quiniela,id_usuario,id_partido' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  console.log(`\n✓ Pronóstico guardado (id: ${data.id_pronostico})`)
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
