'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import {
  actualizarEstadoPedido,
  obtenerTodosLosPedidos,
  type PedidoConDetalle,
} from '../services/pedidos-service';
import {
  CLASES_PEDIDO,
  ETIQUETA_IMPUESTO,
  ETIQUETAS_PEDIDO,
  METODOS_PAGO,
  TRANSICIONES_PEDIDO,
} from '../lib/pedidos';
import { formatearCOP } from '@/lib/formato';
import type { EstadoPedido } from '@/lib/supabase/types';

const FILTROS: { valor: 'todos' | EstadoPedido; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'en_preparacion', etiqueta: 'En preparación' },
  { valor: 'en_camino', etiqueta: 'En camino' },
  { valor: 'entregado', etiqueta: 'Entregados' },
  { valor: 'cancelado', etiqueta: 'Cancelados' },
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

function etiquetaMetodoPago(valor: string): string {
  return METODOS_PAGO.find((metodo) => metodo.valor === valor)?.etiqueta ?? valor;
}

export default function TableroPedidosAdmin() {
  const [pedidos, setPedidos] = useState<PedidoConDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | EstadoPedido>('todos');
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  // Cambiar esta versión desde un evento fuerza la recarga del listado.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerTodosLosPedidos();
        if (activo) {
          setPedidos(datos);
          setError(null);
        }
      } catch (err) {
        if (activo) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();
    return () => {
      activo = false;
    };
  }, [version]);

  /** Recarga manual mostrando el indicador de carga (desde un evento). */
  function recargar() {
    setCargando(true);
    setError(null);
    setVersion((actual) => actual + 1);
  }

  async function manejarEstado(pedido: PedidoConDetalle, estado: EstadoPedido) {
    setOcupadoId(pedido.id);
    setError(null);
    setMensaje(null);

    try {
      await actualizarEstadoPedido(pedido.id, estado);
      setPedidos((actuales) =>
        actuales.map((item) => (item.id === pedido.id ? { ...item, estado } : item))
      );
      setMensaje(`Pedido de ${pedido.nombre_cliente ?? 'cliente'} → ${ETIQUETAS_PEDIDO[estado].toLowerCase()}.`);
      window.setTimeout(() => setMensaje((actual) => (actual === null ? null : actual)), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el pedido.');
    } finally {
      setOcupadoId(null);
    }
  }

  const visibles =
    filtro === 'todos' ? pedidos : pedidos.filter((pedido) => pedido.estado === filtro);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Pedidos</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {pedidos.length} pedido(s) en total.
          </p>
        </div>

        <button
          type="button"
          onClick={recargar}
          className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => setFiltro(opcion.valor)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filtro === opcion.valor
                ? 'bg-amber-600 text-white'
                : 'border border-zinc-300 bg-white text-zinc-600 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {mensaje && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {mensaje}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-500">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          Cargando pedidos…
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-14 text-center text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay pedidos con este estado.
        </div>
      ) : (
        <ul className="space-y-4">
          {visibles.map((pedido) => {
            const transiciones = TRANSICIONES_PEDIDO[pedido.estado] ?? [];

            return (
              <li
                key={pedido.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      <User aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      {pedido.nombre_cliente ?? 'Cliente sin nombre'}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <MapPin aria-hidden="true" className="h-4 w-4" />
                      {pedido.direccion_entrega}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <Mail aria-hidden="true" className="h-4 w-4" />
                      {formatearFechaHora(pedido.fecha_hora_pedido)} ·{' '}
                      {etiquetaMetodoPago(pedido.metodo_pago)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${CLASES_PEDIDO[pedido.estado]}`}
                  >
                    {ETIQUETAS_PEDIDO[pedido.estado]}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-2">
                  <ul className="space-y-1.5">
                    {pedido.detalle.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300"
                      >
                        <span>
                          {item.cantidad} ×{' '}
                          {item.productos?.nombre ?? `Producto #${item.producto_id}`}
                        </span>
                        <span className="font-medium">
                          {formatearCOP(item.precio_unitario * item.cantidad)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="space-y-1.5 text-sm">
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
                      <dd className="text-amber-700 dark:text-amber-500">
                        {formatearCOP(pedido.total)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {pedido.observaciones && (
                  <p className="mt-3 rounded-xl bg-zinc-50 px-4 py-2.5 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                    Observaciones: {pedido.observaciones}
                  </p>
                )}

                {transiciones.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    {transiciones.map((estado) => (
                      <button
                        key={estado}
                        type="button"
                        disabled={ocupadoId === pedido.id}
                        onClick={() => void manejarEstado(pedido, estado)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                          estado === 'cancelado'
                            ? 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40'
                            : 'border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40'
                        }`}
                      >
                        {ocupadoId === pedido.id ? (
                          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                        ) : estado === 'cancelado' ? (
                          <X aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {ETIQUETAS_PEDIDO[estado]}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
