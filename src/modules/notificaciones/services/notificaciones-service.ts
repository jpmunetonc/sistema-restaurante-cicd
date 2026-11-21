import { createClient } from '@/lib/supabase/client';
import { mensajeErrorSupabase } from '@/lib/errores';
import type { Notificacion } from '@/lib/supabase/types';

export interface DatosNotificacion {
  usuario_id?: string | null;
  para_admin: boolean;
  tipo: string;
  titulo: string;
  mensaje: string;
  referencia_id?: string | null;
}

/**
 * Crea una notificación de forma "best-effort": si falla (por ejemplo por
 * políticas RLS) no interrumpe el flujo principal.
 */
export async function crearNotificacion(datos: DatosNotificacion): Promise<void> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('notificaciones').insert({
      usuario_id: datos.usuario_id ?? null,
      para_admin: datos.para_admin,
      tipo: datos.tipo,
      titulo: datos.titulo,
      mensaje: datos.mensaje,
      referencia_id: datos.referencia_id ?? null,
      leida: false,
    });

    if (error) {
      console.warn('No se pudo crear la notificación:', error.message);
    }
  } catch (error) {
    console.warn('No se pudo crear la notificación:', error);
  }
}

/**
 * Notificaciones visibles para el usuario actual:
 * - admin  => las dirigidas a la administración (para_admin = true)
 * - cliente => las suyas (usuario_id = usuario actual)
 */
export async function obtenerNotificaciones(esAdmin: boolean): Promise<Notificacion[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const query = supabase
    .from('notificaciones')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (esAdmin) {
    query.eq('para_admin', true);
  } else {
    query.eq('usuario_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      mensajeErrorSupabase(error, 'No se pudieron cargar las notificaciones.')
    );
  }

  return (data ?? []) as Notificacion[];
}

/** Marca una notificación como leída. */
export async function marcarComoLeida(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id);

  if (error) {
    throw new Error(
      mensajeErrorSupabase(error, 'No se pudo marcar la notificación como leída.')
    );
  }
}

/** Marca todas las notificaciones visibles como leídas. */
export async function marcarTodasComoLeidas(esAdmin: boolean): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const query = supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('leida', false);

  if (esAdmin) {
    query.eq('para_admin', true);
  } else {
    query.eq('usuario_id', user.id);
  }

  const { error } = await query;

  if (error) {
    throw new Error(
      mensajeErrorSupabase(error, 'No se pudieron actualizar las notificaciones.')
    );
  }
}
