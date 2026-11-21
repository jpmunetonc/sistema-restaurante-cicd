'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  Loader2,
  Package,
  Receipt,
  XCircle,
} from 'lucide-react';
import { obtenerMisPedidos, type PedidoConDetalle } from '../services/pedidos-service';
import {
  CLASES_PEDIDO,
  DESCRIPCIONES_PEDIDO,
  ETIQUETA_IMPUESTO,
  ETIQUETAS_PEDIDO,
} from '../lib/pedidos';
import { formatearCOP } from '@/lib/formato';
import type { EstadoPedido } from '@/lib/supabase/types';

const PASOS: { estado: EstadoPedido; icono: typeof Package }[] = [
  { estado: 'pendiente', icono: ClipboardList },
  { estado: 'en_preparacion', icono: ChefHat },
  { estado: 'en_camino', icono: Bike },
  { estado: 'entregado', icono: CheckCircle2 },
];

function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SeguimientoPedidos() {
  const [pedidos, setPedidos] = useState<PedidoConDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerMisPedidos();
        if (activo) setPedidos(datos);
      } catch (err) {
        if (activo) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar tus pedidos.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();
    return () => {
      activo = false;
    };
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-500">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        Cargando tus pedidos…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {error}
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <Package aria-hidden="true" className="h-9 w-9 text-zinc-400" />
        <div>
          <p className="font-medium text-zinc-700 dark:text-zinc-200">
            Todavía no has hecho pedidos.
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tu próximo plato favorito está a un clic.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Ver el menú
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-5">
      {pedidos.map((pedido) => {
        const cancelado = pedido.estado === 'cancelado';
        const indiceActual = PASOS.findIndex((paso) => paso.estado === pedido.estado);

        return (
          <li
            key={pedido.id}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
                  <Clock aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  {formatearFechaHora(pedido.fecha_hora_pedido)}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Entrega en {pedido.direccion_entrega}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${CLASES_PEDIDO[pedido.estado]}`}
              >
                {ETIQUETAS_PEDIDO[pedido.estado]}
              </span>
            </div>

            {cancelado ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <XCircle aria-hidden="true" className="h-4 w-4" />
                {DESCRIPCIONES_PEDIDO.cancelado}
              </p>
            ) : (
              <ol className="mt-5 grid grid-cols-4 gap-2">
                {PASOS.map((paso, indice) => {
                  const alcanzado = indice <= indiceActual;
                  const Icono = paso.icono;
                  return (
                    <li key={paso.estado} className="flex flex-col items-center gap-1.5 text-center">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                          alcanzado
                            ? 'border-amber-500 bg-amber-500 text-white'
                            : 'border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900'
                        }`}
                      >
                        <Icono aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span
                        className={`text-[11px] leading-tight font-medium ${
                          alcanzado
                            ? 'text-zinc-800 dark:text-zinc-100'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {ETIQUETAS_PEDIDO[paso.estado]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <ul className="space-y-1.5">
                {pedido.detalle.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    <span>
                      {item.cantidad} × {item.productos?.nombre ?? `Producto #${item.producto_id}`}
                    </span>
                    <span className="font-medium">
                      {formatearCOP(item.precio_unitario * item.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-1.5 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <dt>Subtotal</dt>
                  <dd className="font-medium">{formatearCOP(pedido.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <dt>{ETIQUETA_IMPUESTO}</dt>
                  <dd className="font-medium">{formatearCOP(pedido.impuesto)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-zinc-900 dark:text-zinc-50">
                  <dt>Total</dt>
                  <dd className="text-amber-700 dark:text-amber-500">{formatearCOP(pedido.total)}</dd>
                </div>
              </dl>

              <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Receipt aria-hidden="true" className="h-3.5 w-3.5" />
                {DESCRIPCIONES_PEDIDO[pedido.estado]}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
