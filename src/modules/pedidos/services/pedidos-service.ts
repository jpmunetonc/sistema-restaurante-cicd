import { createClient } from '@/lib/supabase/client';
import { mensajeErrorSupabase } from '@/lib/errores';
import { crearNotificacion } from '@/modules/notificaciones/services/notificaciones-service';
import { calcularTotales, esItemValido, ETIQUETAS_PEDIDO, TRANSICIONES_PEDIDO } from '../lib/pedidos';
import type {
  DetallePedido,
  EstadoPedido,
  Pedido,
} from '@/lib/supabase/types';

export interface ItemPedidoInsert {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface DatosPedido {
  direccion_entrega: string;
  metodo_pago: string;
  observaciones: string | null;
  items: ItemPedidoInsert[];
}

export interface PedidoConDetalle extends Pedido {
  detalle: DetallePedido[];
  nombre_cliente: string | null;
}

async function adjuntarDetalle(
  pedidos: Pedido[],
  incluirCliente: boolean
): Promise<PedidoConDetalle[]> {
  if (pedidos.length === 0) return [];

  const supabase = createClient();
  const ids = pedidos.map((pedido) => pedido.id);

  const { data: detalle } = await supabase
    .from('detalle_pedidos')
    .select('*, productos(nombre)')
    .in('pedido_id', ids);

  const porPedido = new Map<string, DetallePedido[]>();
  for (const item of (detalle ?? []) as DetallePedido[]) {
    const lista = porPedido.get(item.pedido_id) ?? [];
    lista.push(item);
    porPedido.set(item.pedido_id, lista);
  }

  let nombres = new Map<string, string>();
  if (incluirCliente) {
    const clienteIds = [...new Set(pedidos.map((pedido) => pedido.cliente_id))];
    const { data: perfiles } = await supabase
      .from('perfiles')
      .select('id, nombre')
      .in('id', clienteIds);
    nombres = new Map(
      ((perfiles ?? []) as { id: string; nombre: string }[]).map((perfil) => [
        perfil.id,
        perfil.nombre,
      ])
    );
  }

  return pedidos.map((pedido) => ({
    ...pedido,
    detalle: porPedido.get(pedido.id) ?? [],
    nombre_cliente: incluirCliente ? (nombres.get(pedido.cliente_id) ?? null) : null,
  }));
}

/**
 * Registra el pedido de forma transaccional:
 * 1. Inserta el registro en `pedidos`.
 * 2. Inserta sus ítems en `detalle_pedidos`.
 * 3. Si falla el paso 2, elimina el pedido creado (rollback de compensación)
 *    para no dejar registros incompletos.
 */
export async function registrarPedido(datos: DatosPedido): Promise<Pedido> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para realizar un pedido.');
  }

  const direccion = datos.direccion_entrega.trim();
  if (!direccion) {
    throw new Error('Indica la dirección de entrega.');
  }

  const items = datos.items.filter(esItemValido);

  if (items.length === 0) {
    throw new Error('Tu orden está vacía. Agrega productos antes de pedir.');
  }

  const subtotalCalculado = items.reduce(
    (total, item) => total + item.precio_unitario * item.cantidad,
    0
  );
  const totales = calcularTotales(subtotalCalculado);

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({
      cliente_id: user.id,
      direccion_entrega: direccion,
      observaciones: datos.observaciones?.trim() || null,
      metodo_pago: datos.metodo_pago,
      subtotal: totales.subtotal,
      impuesto: totales.impuesto,
      total: totales.total,
      estado: 'pendiente',
      fecha_hora_pedido: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo registrar el pedido.'));
  }

  const { error: errorDetalle } = await supabase.from('detalle_pedidos').insert(
    items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
    }))
  );

  if (errorDetalle) {
    // Compensación: se revierte el pedido para no dejarlo sin productos.
    await supabase.from('pedidos').delete().eq('id', pedido.id);
    throw new Error(
      mensajeErrorSupabase(
        errorDetalle,
        'No se pudieron registrar los productos del pedido. El pedido no fue creado.'
      )
    );
  }

  await crearNotificacion({
    para_admin: true,
    tipo: 'pedido',
    titulo: 'Nuevo pedido',
    mensaje: `Nuevo pedido por ${totales.total.toLocaleString('es-CO')} pesos a entregar en ${direccion}.`,
    referencia_id: pedido.id,
  });

  return pedido as Pedido;
}

/** Pedidos del usuario autenticado, con sus productos y totales. */
export async function obtenerMisPedidos(): Promise<PedidoConDetalle[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('cliente_id', user.id)
    .order('fecha_hora_pedido', { ascending: false });

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudieron cargar tus pedidos.'));
  }

  return adjuntarDetalle((data ?? []) as Pedido[], false);
}

/** Todos los pedidos con productos y nombre del cliente (admin). */
export async function obtenerTodosLosPedidos(): Promise<PedidoConDetalle[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .order('fecha_hora_pedido', { ascending: false });

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudieron cargar los pedidos.'));
  }

  return adjuntarDetalle((data ?? []) as Pedido[], true);
}

/** Avanza el estado de un pedido validando la transición del flujo operativo. */
export async function actualizarEstadoPedido(
  id: string,
  nuevoEstado: EstadoPedido
): Promise<void> {
  const supabase = createClient();

  const { data: pedido, error: errorLectura } = await supabase
    .from('pedidos')
    .select('estado, cliente_id')
    .eq('id', id)
    .maybeSingle();

  if (errorLectura) {
    throw new Error(mensajeErrorSupabase(errorLectura, 'No se pudo leer el pedido.'));
  }

  if (!pedido) {
    throw new Error('El pedido no existe.');
  }

  const estadoActual = pedido.estado as EstadoPedido;
  const permitidas = TRANSICIONES_PEDIDO[estadoActual] ?? [];

  if (!permitidas.includes(nuevoEstado)) {
    throw new Error(
      `No se puede pasar de "${ETIQUETAS_PEDIDO[estadoActual]}" a "${ETIQUETAS_PEDIDO[nuevoEstado]}".`
    );
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', id);

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo actualizar el pedido.'));
  }

  await crearNotificacion({
    usuario_id: pedido.cliente_id,
    para_admin: false,
    tipo: 'pedido',
    titulo: 'Actualización de tu pedido',
    mensaje: `Tu pedido ahora está: ${ETIQUETAS_PEDIDO[nuevoEstado]}.`,
    referencia_id: id,
  });
}
