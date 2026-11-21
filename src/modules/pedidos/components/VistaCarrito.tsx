'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import { registrarPedido } from '../services/pedidos-service';
import { ETIQUETA_IMPUESTO, METODOS_PAGO } from '../lib/pedidos';
import { useCarrito } from '../context/CarritoContext';
import { formatearCOP } from '@/lib/formato';

const CLASES_INPUT =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500';

const CLASES_ETIQUETA =
  'mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function VistaCarrito() {
  const { items, subtotal, impuesto, total, cantidadTotal, cambiarCantidad, eliminar, vaciar } =
    useCarrito();

  const [direccion, setDireccion] = useState('');
  const [metodoPago, setMetodoPago] = useState(METODOS_PAGO[0].valor);
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Tu carrito está vacío. Agrega productos antes de pedir.');
      return;
    }
    if (!direccion.trim()) {
      setError('Indica la dirección de entrega.');
      return;
    }

    setCargando(true);

    try {
      const pedido = await registrarPedido({
        direccion_entrega: direccion.trim(),
        metodo_pago: metodoPago,
        observaciones: observaciones.trim() || null,
        items: items.map((item) => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad,
          precio_unitario: item.producto.precio,
        })),
      });

      setPedidoId(pedido.id);
      vaciar();
      setObservaciones('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pedido.');
    } finally {
      setCargando(false);
    }
  }

  if (pedidoId) {
    return (
      <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            ¡Pedido registrado!
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Tu pedido ya está en la cocina. Puedes seguir su estado en tiempo real.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/mis-pedidos"
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Ver mis pedidos
          </Link>
          <button
            type="button"
            onClick={() => setPedidoId(null)}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Seguir comprando
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <ShoppingBag aria-hidden="true" className="h-9 w-9 text-zinc-400" />
        <div>
          <p className="font-medium text-zinc-700 dark:text-zinc-200">
            Tu carrito está vacío.
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Agrega tus platos favoritos desde el menú.
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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {cantidadTotal} producto(s)
          </h2>
          <button
            type="button"
            onClick={vaciar}
            className="text-sm font-medium text-zinc-500 transition hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
          >
            Vaciar carrito
          </button>
        </div>

        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.producto.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {item.producto.nombre}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {formatearCOP(item.producto.precio)} c/u
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Quitar una unidad de ${item.producto.nombre}`}
                  onClick={() => cambiarCantidad(item.producto.id, item.cantidad - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Minus aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.cantidad}
                </span>
                <button
                  type="button"
                  aria-label={`Agregar una unidad de ${item.producto.nombre}`}
                  onClick={() => cambiarCantidad(item.producto.id, item.cantidad + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="w-24 text-right font-semibold text-amber-700 dark:text-amber-500">
                {formatearCOP(item.producto.precio * item.cantidad)}
              </p>

              <button
                type="button"
                aria-label={`Eliminar ${item.producto.nombre} del carrito`}
                onClick={() => eliminar(item.producto.id)}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-24 lg:self-start">
        <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
          <Receipt aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          Resumen del pedido
        </h2>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
            <dt>Subtotal</dt>
            <dd className="font-medium">{formatearCOP(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
            <dt>{ETIQUETA_IMPUESTO}</dt>
            <dd className="font-medium">{formatearCOP(impuesto)}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
            <dt>Total</dt>
            <dd className="text-amber-700 dark:text-amber-500">{formatearCOP(total)}</dd>
          </div>
        </dl>

        <form onSubmit={manejarEnvio} noValidate className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="pedido-direccion" className={CLASES_ETIQUETA}>
              <span className="flex items-center gap-1.5">
                <Truck aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                Dirección de entrega
              </span>
            </label>
            <input
              id="pedido-direccion"
              type="text"
              required
              disabled={cargando}
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              placeholder="Calle 10 # 45-67, Apto 302"
              className={CLASES_INPUT}
            />
          </div>

          <div>
            <label htmlFor="pedido-metodo" className={CLASES_ETIQUETA}>
              Método de pago
            </label>
            <select
              id="pedido-metodo"
              value={metodoPago}
              disabled={cargando}
              onChange={(event) => setMetodoPago(event.target.value)}
              className={CLASES_INPUT}
            >
              {METODOS_PAGO.map((metodo) => (
                <option key={metodo.valor} value={metodo.valor}>
                  {metodo.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pedido-observaciones" className={CLASES_ETIQUETA}>
              Observaciones (opcional)
            </label>
            <textarea
              id="pedido-observaciones"
              rows={2}
              disabled={cargando}
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              placeholder="Sin cebolla, tocar el timbre, etc."
              className={`${CLASES_INPUT} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-900"
          >
            {cargando ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Receipt aria-hidden="true" className="h-4 w-4" />
            )}
            {cargando ? 'Registrando pedido…' : `Confirmar pedido · ${formatearCOP(total)}`}
          </button>
        </form>
      </aside>
    </div>
  );
}
