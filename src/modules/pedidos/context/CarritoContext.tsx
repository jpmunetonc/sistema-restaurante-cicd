'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Producto } from '@/lib/supabase/types';
import { calcularTotales } from '../lib/pedidos';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

interface ContextoCarritoValor {
  items: ItemCarrito[];
  cantidadTotal: number;
  subtotal: number;
  impuesto: number;
  total: number;
  cargado: boolean;
  agregar: (producto: Producto, cantidad?: number) => void;
  cambiarCantidad: (productoId: number, cantidad: number) => void;
  eliminar: (productoId: number) => void;
  vaciar: () => void;
}

const ContextoCarrito = createContext<ContextoCarritoValor | null>(null);

const CLAVE_STORAGE = 'carrito-restaurante';
const CANTIDAD_MAXIMA = 99;

export default function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cargado, setCargado] = useState(false);

  // Restaura el carrito guardado en localStorage. Leer storage solo es posible
  // en el cliente después de hidratar: es el patrón estándar para restaurar
  // estado persistido sin provocar desajustes de hidratación.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_STORAGE);
      if (guardado) {
        const parsed = JSON.parse(guardado) as ItemCarrito[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // Si el almacenamiento no está disponible se inicia con el carrito vacío.
    }
    setCargado(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persiste los cambios del carrito.
  useEffect(() => {
    if (!cargado) return;
    try {
      window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
    } catch {
      // Ignorado cuando no hay espacio o soporte de localStorage.
    }
  }, [items, cargado]);

  const agregar = useCallback((producto: Producto, cantidad = 1) => {
    setItems((actuales) => {
      const existente = actuales.find((item) => item.producto.id === producto.id);
      if (existente) {
        return actuales.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: Math.min(item.cantidad + cantidad, CANTIDAD_MAXIMA) }
            : item
        );
      }
      return [...actuales, { producto, cantidad: Math.min(cantidad, CANTIDAD_MAXIMA) }];
    });
  }, []);

  const cambiarCantidad = useCallback((productoId: number, cantidad: number) => {
    setItems((actuales) => {
      if (cantidad <= 0) {
        return actuales.filter((item) => item.producto.id !== productoId);
      }
      return actuales.map((item) =>
        item.producto.id === productoId
          ? { ...item, cantidad: Math.min(cantidad, CANTIDAD_MAXIMA) }
          : item
      );
    });
  }, []);

  const eliminar = useCallback((productoId: number) => {
    setItems((actuales) => actuales.filter((item) => item.producto.id !== productoId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const { cantidadTotal, subtotal } = useMemo(() => {
    return items.reduce(
      (acumulado, item) => ({
        cantidadTotal: acumulado.cantidadTotal + item.cantidad,
        subtotal: acumulado.subtotal + item.producto.precio * item.cantidad,
      }),
      { cantidadTotal: 0, subtotal: 0 }
    );
  }, [items]);

  const totales = useMemo(() => calcularTotales(subtotal), [subtotal]);

  const valor = useMemo<ContextoCarritoValor>(
    () => ({
      items,
      cantidadTotal,
      subtotal: totales.subtotal,
      impuesto: totales.impuesto,
      total: totales.total,
      cargado,
      agregar,
      cambiarCantidad,
      eliminar,
      vaciar,
    }),
    [
      items,
      cantidadTotal,
      totales.subtotal,
      totales.impuesto,
      totales.total,
      cargado,
      agregar,
      cambiarCantidad,
      eliminar,
      vaciar,
    ]
  );

  return <ContextoCarrito.Provider value={valor}>{children}</ContextoCarrito.Provider>;
}

/** Hook para consumir el carrito desde componentes de cliente. */
export function useCarrito(): ContextoCarritoValor {
  const contexto = useContext(ContextoCarrito);
  if (!contexto) {
    throw new Error('useCarrito debe usarse dentro de <CarritoProvider>.');
  }
  return contexto;
}
