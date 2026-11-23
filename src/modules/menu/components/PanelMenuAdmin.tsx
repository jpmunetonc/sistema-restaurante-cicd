'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  alternarActivo,
  eliminarProducto,
  obtenerProductos,
} from '../services/menu-service';
import FormularioProducto from './FormularioProducto';
import MiniaturaProducto from './MiniaturaProducto';
import { badgeStock } from '../lib/stock-badge';
import { formatearCOP } from '@/lib/formato';
import type { Producto } from '@/lib/supabase/types';

export default function PanelMenuAdmin() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);
  // Cambiar esta versión desde un evento fuerza la recarga del listado.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerProductos();
        if (activo) {
          setProductos(datos);
          setError(null);
        }
      } catch (err) {
        if (activo) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el menú.');
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

  function mostrarMensaje(texto: string) {
    setMensaje(texto);
    window.setTimeout(() => setMensaje((actual) => (actual === texto ? null : actual)), 3500);
  }

  async function manejarActivo(producto: Producto) {
    setOcupadoId(producto.id);
    setError(null);
    try {
      await alternarActivo(producto.id, !producto.activo);
      setProductos((actuales) =>
        actuales.map((item) =>
          item.id === producto.id ? { ...item, activo: !producto.activo } : item
        )
      );
      mostrarMensaje(
        producto.activo
          ? `«${producto.nombre}» quedó pausado.`
          : `«${producto.nombre}» está activo de nuevo.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el plato.');
    } finally {
      setOcupadoId(null);
    }
  }

  async function manejarEliminar(producto: Producto) {
    if (!window.confirm(`¿Eliminar «${producto.nombre}» del menú?`)) return;

    setOcupadoId(producto.id);
    setError(null);
    try {
      await eliminarProducto(producto.id);
      setProductos((actuales) => actuales.filter((item) => item.id !== producto.id));
      mostrarMensaje(`«${producto.nombre}» fue eliminado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el plato.');
    } finally {
      setOcupadoId(null);
    }
  }

  function manejarGuardado() {
    setFormularioAbierto(false);
    setProductoEditando(null);
    mostrarMensaje('Cambios guardados correctamente.');
    setVersion((actual) => actual + 1);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Menú</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {productos.length} plato(s) en el catálogo.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={recargar}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => {
              setProductoEditando(null);
              setFormularioAbierto(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuevo plato
          </button>
        </div>
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

      {formularioAbierto && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <FormularioProducto
            producto={productoEditando}
            onGuardado={manejarGuardado}
            onCancelar={() => {
              setFormularioAbierto(false);
              setProductoEditando(null);
            }}
          />
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-500">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          Cargando platos…
        </div>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
          <AlertTriangle aria-hidden="true" className="h-8 w-8 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Aún no hay platos en el menú.
          </p>
          <button
            type="button"
            onClick={() => {
              setProductoEditando(null);
              setFormularioAbierto(true);
            }}
            className="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-500"
          >
            Crear el primer plato
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {productos.map((producto) => (
              <li
                key={producto.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <MiniaturaProducto url={producto.imagen_url} alt={producto.nombre} />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {producto.nombre}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeStock(producto).clase}`}
                      >
                        {badgeStock(producto).texto}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          producto.activo
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {producto.activo ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {formatearCOP(producto.valor)} · stock:{' '}
                      {producto.stock_disponible}
                      {producto.descripcion ? ` — ${producto.descripcion}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProductoEditando(producto);
                      setFormularioAbierto(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    Editar
                  </button>

                  <button
                    type="button"
                    disabled={ocupadoId === producto.id}
                    onClick={() => void manejarActivo(producto)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                      producto.activo
                        ? 'border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40'
                        : 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    {producto.activo ? (
                      <>
                        <Pause aria-hidden="true" className="h-3.5 w-3.5" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play aria-hidden="true" className="h-3.5 w-3.5" />
                        Activar
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={ocupadoId === producto.id}
                    onClick={() => void manejarEliminar(producto)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
