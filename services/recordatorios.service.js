import { supabase } from '../db/supabase.js'
import { sendRecordatorioPrediccionEmail } from './email.service.js'

const VENTANA_MINUTOS = 10
const TOLERANCIA_MINUTOS = 2

export async function enviarRecordatoriosProximoPartido () {
  const ahora = Date.now()
  const desde = new Date(ahora + (VENTANA_MINUTOS - TOLERANCIA_MINUTOS) * 60000)
  const hasta = new Date(ahora + (VENTANA_MINUTOS + TOLERANCIA_MINUTOS) * 60000)

  const { data: partidos, error } = await supabase
    .schema('quiniela')
    .from('vw_partidos_detalle')
    .select('id_partido, equipo_a, equipo_b, fecha')
    .eq('estado', 'pendiente')
    .gte('fecha', desde.toISOString())
    .lte('fecha', hasta.toISOString())

  if (error) throw new Error(error.message)
  if (!partidos?.length) return { recordatoriosEnviados: 0 }

  const { data: quinielas, error: quinielasErr } = await supabase
    .schema('quiniela')
    .from('quinielas')
    .select('id_quiniela')
    .eq('estado', 'abierta')

  if (quinielasErr) throw new Error(quinielasErr.message)

  const idsQuinielas = (quinielas || []).map(q => q.id_quiniela)
  if (!idsQuinielas.length) return { recordatoriosEnviados: 0 }

  const { data: participantes, error: participantesErr } = await supabase
    .schema('quiniela')
    .from('quiniela_usuarios')
    .select('id_usuario, id_quiniela')
    .in('id_quiniela', idsQuinielas)

  if (participantesErr) throw new Error(participantesErr.message)

  let enviados = 0

  for (const partido of partidos) {
    const { data: pronosticos } = await supabase
      .schema('quiniela')
      .from('pronosticos')
      .select('id_usuario, id_quiniela')
      .eq('id_partido', partido.id_partido)

    const yaPredijeron = new Set((pronosticos || []).map(p => `${p.id_quiniela}:${p.id_usuario}`))

    const idsUsuariosSinPrediccion = new Set(
      (participantes || [])
        .filter(p => !yaPredijeron.has(`${p.id_quiniela}:${p.id_usuario}`))
        .map(p => p.id_usuario)
    )

    if (!idsUsuariosSinPrediccion.size) continue

    const { data: usuarios } = await supabase
      .schema('quiniela')
      .from('usuarios')
      .select('id_random, correo')
      .in('id_random', [...idsUsuariosSinPrediccion])

    for (const usuario of usuarios || []) {
      if (!usuario.correo) continue
      try {
        await sendRecordatorioPrediccionEmail(usuario.correo, {
          equipoA: partido.equipo_a,
          equipoB: partido.equipo_b,
          fecha: partido.fecha
        })
        enviados++
      } catch (err) {
        console.error(`Error enviando recordatorio a ${usuario.correo}:`, err.message)
      }
    }
  }

  return { recordatoriosEnviados: enviados }
}
