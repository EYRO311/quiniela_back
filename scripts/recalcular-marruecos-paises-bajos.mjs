import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { aplicarResultado } from '../services/resultados.service.js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main () {
  // Buscar por nombre en la vista (tiene los nombres de equipo)
  const { data: vistas, error: vistaErr } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('id_partido, equipo_a, equipo_b, goles_a, goles_b, fase, estado')
    .or('equipo_a.ilike.%Morocco%,equipo_b.ilike.%Morocco%')
    .eq('fase', 'dieciseisavos')

  if (vistaErr) throw new Error(vistaErr.message)
  if (!vistas?.length) throw new Error('No se encontró el partido de Marruecos en dieciseisavos')

  const vista = vistas[0]
  console.log(`Partido encontrado: ${vista.equipo_a} ${vista.goles_a}-${vista.goles_b} ${vista.equipo_b} | estado: ${vista.estado}`)

  // Leer penal_a y penal_b directo de la tabla partidos
  const { data: partidoDb, error: dbErr } = await supabase
    .schema('quiniela')
    .from('partidos')
    .select('penal_a, penal_b')
    .eq('id_partido', vista.id_partido)
    .single()

  if (dbErr) throw new Error(dbErr.message)

  const partido = { ...vista, penal_a: partidoDb.penal_a, penal_b: partidoDb.penal_b }
  console.log(`Penales en DB: ${partido.penal_a}-${partido.penal_b}`)

  if (partido.penal_a === null || partido.penal_b === null) {
    throw new Error('El partido no tiene marcador de penales guardado. Verifica el resultado en la DB.')
  }

  console.log('Re-aplicando resultado con lógica de puntos corregida...')
  const resultado = await aplicarResultado({
    idPartido: partido.id_partido,
    golesA: partido.goles_a,
    golesB: partido.goles_b,
    penalA: partido.penal_a,
    penalB: partido.penal_b
  })

  console.log(`✓ Recalculado: ${partido.equipo_a} ${resultado.goles_a}-${resultado.goles_b} ${partido.equipo_b} (penales ${resultado.penal_a}-${resultado.penal_b})`)
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1) })
