import type { EstadoPedido } from '@/lib/supabase/types';

/**
 * Impuesto Nacional al Consumo (INC) del 8%.
 * Se guarda en la columna `impuesto` de la tabla pedidos y siempre se
 * muestra en la interfaz etiquetado como "Impoconsumo (INC 8%)".
 */
export const IMPUESTO_INC_PORCENTAJE = 0.08;

export const ETIQUETA_IMPUESTO = 'Impoconsumo (INC 8%)';

export interface TotalesPedido {
  subtotal: number;
  impuesto: number;
  total: number;
}

/** Calcula subtotal, Impoconsumo (INC 8%) y total redondeados a pesos. */
export function calcularTotales(subtotal: number): TotalesPedido {
  const base = Math.round(subtotal);
  const impuesto = Math.round(base * IMPUESTO_INC_PORCENTAJE);
  return { subtotal: base, impuesto, total: base + impuesto };
}

/** Flujo operativo: pendiente → en_preparacion → en_camino → entregado (o cancelado). */
export const TRANSICIONES_PEDIDO: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: ['en_preparacion', 'cancelado'],
  en_preparacion: ['en_camino', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

export const ETIQUETAS_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const DESCRIPCIONES_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: 'Recibimos tu pedido y está en cola.',
  en_preparacion: 'La cocina está preparando tu pedido.',
  en_camino: 'Tu pedido va en camino a tu dirección.',
  entregado: 'Pedido entregado. ¡Buen provecho!',
  cancelado: 'El pedido fue cancelado.',
};

export const CLASES_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  en_preparacion: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
  en_camino: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
  entregado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
};

/** Etiquetas en español de los métodos de pago del pedido. */
export const METODOS_PAGO: { valor: string; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo contra entrega' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta de crédito/débito' },
  { valor: 'transferencia', etiqueta: 'Transferencia bancaria' },
];
