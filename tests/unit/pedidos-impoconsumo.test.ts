import { describe, expect, it } from 'vitest';
import {
  calcularTotales,
  DESCRIPCIONES_PEDIDO,
  esItemValido,
  ETIQUETA_IMPUESTO,
  ETIQUETAS_PEDIDO,
  IMPUESTO_INC_PORCENTAJE,
  METODOS_PAGO,
} from '@/modules/pedidos/lib/pedidos';
import type { Producto } from '@/lib/supabase/types';

/**
 * Simula el subtotal del carrito usando el `valor` real del producto
 * (esquema Supabase: productos.valor, no existe columna `precio`).
 */
function subtotalDelCarrito(items: { producto: Producto; cantidad: number }[]): number {
  return items.reduce((total, item) => total + item.producto.valor * item.cantidad, 0);
}

const bandeja: Producto = {
  id: 1,
  nombre: 'Bandeja paisa',
  descripcion: 'Carne molida, chicharrón, plátano, yuca y arepa.',
  imagen_url: null,
  valor: 25000,
  stock_disponible: 12,
  activo: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

const tinto: Producto = {
  id: 2,
  nombre: 'Tinto campesino',
  descripcion: null,
  imagen_url: null,
  valor: 4500,
  stock_disponible: 3,
  activo: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('Impoconsumo (INC 8%) — cálculo de totales en COP', () => {
  it('usa el porcentaje de Impoconsumo del 8%', () => {
    expect(IMPUESTO_INC_PORCENTAJE).toBe(0.08);
  });

  it('etiqueta el impuesto siempre como "Impoconsumo (INC 8%)"', () => {
    expect(ETIQUETA_IMPUESTO).toBe('Impoconsumo (INC 8%)');
    expect(ETIQUETA_IMPUESTO).not.toMatch(/iva/i);
  });

  it('calcula subtotal, impuesto y total a partir del valor de los productos', () => {
    const subtotal = subtotalDelCarrito([
      { producto: bandeja, cantidad: 2 }, // 50000
      { producto: tinto, cantidad: 1 }, //  4500
    ]);

    expect(subtotal).toBe(54500);

    const totales = calcularTotales(subtotal);
    expect(totales.subtotal).toBe(54500);
    expect(totales.impuesto).toBe(Math.round(54500 * 0.08)); // 4360
    expect(totales.total).toBe(54500 + 4360); // 58860
    expect(totales.total).toBe(totales.subtotal + totales.impuesto);
  });

  it('redondea el impuesto a pesos completos', () => {
    // 19999 * 0.08 = 1599.92 -> 1600
    const totales = calcularTotales(19999);
    expect(totales.impuesto).toBe(1600);
    expect(totales.total).toBe(21599);
  });

  it('un carrito vacío tiene todos los totales en cero', () => {
    expect(calcularTotales(0)).toEqual({ subtotal: 0, impuesto: 0, total: 0 });
  });

  it('nunca aparece el término "IVA" en las etiquetas visibles del módulo', () => {
    const etiquetas = [
      ETIQUETA_IMPUESTO,
      ...Object.values(ETIQUETAS_PEDIDO),
      ...Object.values(DESCRIPCIONES_PEDIDO),
      ...METODOS_PAGO.map((metodo) => metodo.etiqueta),
    ].join(' ');

    expect(etiquetas).not.toMatch(/\bIVA\b/i);
    expect(etiquetas).toContain('Impoconsumo');
  });
});

describe('Validación de cantidades del carrito', () => {
  it('acepta ítems con producto, cantidad y precio válidos', () => {
    expect(esItemValido({ producto_id: 1, cantidad: 2, precio_unitario: 25000 })).toBe(true);
    expect(esItemValido({ producto_id: 7, cantidad: 1, precio_unitario: 0 })).toBe(true);
  });

  it('rechaza cantidades inválidas (cero, negativas y no numéricas)', () => {
    expect(esItemValido({ producto_id: 1, cantidad: 0, precio_unitario: 25000 })).toBe(false);
    expect(esItemValido({ producto_id: 1, cantidad: -3, precio_unitario: 25000 })).toBe(false);
    expect(
      esItemValido({ producto_id: 1, cantidad: Number.NaN, precio_unitario: 25000 })
    ).toBe(false);
  });

  it('rechaza productos inexistentes y precios unitarios negativos', () => {
    expect(esItemValido({ producto_id: 0, cantidad: 1, precio_unitario: 25000 })).toBe(false);
    expect(esItemValido({ producto_id: -1, cantidad: 1, precio_unitario: 25000 })).toBe(false);
    expect(esItemValido({ producto_id: 1, cantidad: 1, precio_unitario: -100 })).toBe(false);
  });
});
