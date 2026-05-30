import { supabase } from '../db/supabase.js'

export async function getUsuarioInfo (idUsuario) {
  const { data: usuario, error: usuarioError } = await supabase
    .schema('quiniela')
    .from('usuarios')
    .select('id_random, username, nombre, correo, puntos_totales, activo, telefono, tipo_user, created_at, auth_user_id, futbol_f1')
    .eq('id_random', idUsuario)
    .single()

  if (usuarioError) throw new Error(usuarioError.message)

  if (usuario.auth_user_id) {
    const { data: authData } = await supabase.auth.admin.getUserById(usuario.auth_user_id)
    usuario.last_sign_in_at = authData?.user?.last_sign_in_at ?? null
  }

  const { data: quinielas, error: quinielasError } = await supabase
    .schema('quiniela')
    .from('quiniela_usuarios')
    .select(`
      id_quiniela_usuario,
      puntos,
      posicion,
      quinielas (
        id_quiniela,
        nombre,
        descripcion,
        id_creador,
        codigo_acceso,
        estado
      )
    `)
    .eq('id_usuario', idUsuario)

  if (quinielasError) throw new Error(quinielasError.message)

  const quinielasFiltradas = (quinielas || []).map(item => {
    const q = item.quinielas
    if (!q) return item

    const { id_creador: idCreador, codigo_acceso: codigoAcceso, ...resto } = q
    const esCreador = idCreador === idUsuario

    return {
      ...item,
      quinielas: {
        ...resto,
        esCreador,
        codigo_acceso: esCreador ? codigoAcceso : null
      }
    }
  })

  const { data: rankings, error: rankingsError } = await supabase
    .schema('quiniela')
    .from('vw_ranking_detalle')
    .select('*')
    .eq('id_usuario', idUsuario)
    .order('posicion', { ascending: true })

  if (rankingsError) throw new Error(rankingsError.message)

  return {
    usuario,
    quinielas: quinielasFiltradas,
    rankings: rankings || []
  }
}
