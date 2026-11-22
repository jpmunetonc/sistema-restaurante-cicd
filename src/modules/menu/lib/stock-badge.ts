import type { Producto } from '@/lib/supabase/types';

/**
 * Etiqueta y estilo del badge de disponibilidad/stock de un producto
 * según su estado `activo` y su `stock_disponible`.
 */
export function badgeStock(producto: Pick<Producto, 'stock_disponible' | 'activo'>): {
  texto: string;
  clase: string;
} {
  if (!producto.activo) {
    return {
      texto: 'No disponible',
      clase: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    };
  }
  if (producto.stock_disponible <= 0) {
    return {
      texto: 'Agotado',
      clase: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
    };
  }
  if (producto.stock_disponible <= 5) {
    return {
      texto: `Últimos ${producto.stock_disponible}`,
      clase: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    };
  }
  return {
    texto: 'Disponible',
    clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  };
}
