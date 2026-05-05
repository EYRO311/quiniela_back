import { supabase } from '@/lib/supabase';

export async function getUsuarioInfo(idUsuario: string) {
  const { data: usuario, error: usuarioError } = await supabase
    .schema('quiniela')
    .from('usuarios')
    .select('*')
    .eq('id_random', idUsuario)
    .single();

  if (usuarioError) {
    throw usuarioError;
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
        codigo_acceso,
        estado
      )
    `)
    .eq('id_usuario', idUsuario);

  if (quinielasError) {
    throw quinielasError;
  }

  const { data: rankings, error: rankingsError } = await supabase
    .schema('quiniela')
    .from('vw_ranking_detalle')
    .select('*')
    .eq('id_usuario', idUsuario)
    .order('posicion', { ascending: true });

  if (rankingsError) {
    throw rankingsError;
  }

  return {
    usuario,
    quinielas: quinielas || [],
    rankings: rankings || [],
  };
}