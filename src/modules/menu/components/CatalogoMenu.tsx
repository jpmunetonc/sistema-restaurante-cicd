'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChefHat, LayoutGrid, Loader2, List, Package, Plus, Search } from 'lucide-react';
import { obtenerProductos } from '../services/menu-service';
import { badgeStock } from '../lib/stock-badge';
import { formatearCOP } from '@/lib/formato';
import { useCarrito } from '@/modules/pedidos/context/CarritoContext';
import IconoOrden from '@/components/IconoOrden';
import type { Producto } from '@/lib/supabase/types';

interface CatalogoMenuProps {
  /** true => muestra solo platos con activo = true (catálogo público). */
  soloActivos?: boolean;
}

/** Vista del catálogo: cuadrícula (tarjetas) o lista (filas). */
type VistaCatalogo = 'cuadricula' | 'lista';

/**
 * Imagen real del plato con fallback visual (icono de cocina) cuando
 * la imagen está vacía o no carga. Se usa en ambas vistas.
 */
function ImagenProducto({
  producto,
  className,
  iconoClassName,
}: {
  producto: Producto;
  className: string;
  iconoClassName: string;
}) {
  const [fallida, setFallida] = useState(false);

  if (producto.imagen_url && !fallida) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={producto.imagen_url}
        alt={producto.nombre}
        loading="lazy"
        className={className}
        onError={() => setFallida(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Sin imagen de ${producto.nombre}`}
      className={`${className} flex items-center justify-center bg-amber-50 dark:bg-amber-950/30`}
    >
      <ChefHat aria-hidden="true" className={iconoClassName} />
    </div>
  );
}

export default function CatalogoMenu({ soloActivos = true }: CatalogoMenuProps) {
  const { agregar } = useCarrito();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [agregadoId, setAgregadoId] = useState<number | null>(null);
  const [vista, setVista] = useState<VistaCatalogo>('cuadricula');

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerProductos({ soloActivos });
        if (activo) setProductos(datos);
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
  }, [soloActivos]);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return productos.filter(
      (producto) =>
        !termino ||
        producto.nombre.toLowerCase().includes(termino) ||
        (producto.descripcion ?? '').toLowerCase().includes(termino)
    );
  }, [productos, busqueda]);

  function manejarAgregar(producto: Producto) {
    agregar(producto, 1);
    setAgregadoId(producto.id);
    window.setTimeout(() => {
      setAgregadoId((actual) => (actual === producto.id ? null : actual));
    }, 1400);
  }

  /** Botón "Agregar" reutilizado en cuadrícula y lista. */
  function BotonAgregar({ producto }: { producto: Producto }) {
    const sinStock = !producto.activo || producto.stock_disponible <= 0;
    const agregado = agregadoId === producto.id;

    return (
      <button
        type="button"
        onClick={() => manejarAgregar(producto)}
        disabled={sinStock}
        aria-label={`Agregar ${producto.nombre} a mi orden`}
        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
          agregado
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-600 text-white hover:bg-amber-700'
        }`}
      >
        {agregado ? (
          <>
            <Check aria-hidden="true" className="h-4 w-4" />
            Agregado
          </>
        ) : (
          <>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Agregar
          </>
        )}
      </button>
    );
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500 dark:text-zinc-400">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        Cargando el menú…
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Vista del catálogo"
          className="inline-flex self-start rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <button
            type="button"
            onClick={() => setVista('cuadricula')}
            aria-pressed={vista === 'cuadricula'}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              vista === 'cuadricula'
                ? 'bg-amber-600 text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50'
            }`}
          >
            <LayoutGrid aria-hidden="true" className="h-4 w-4" />
            Cuadrícula
          </button>
          <button
            type="button"
            onClick={() => setVista('lista')}
            aria-pressed={vista === 'lista'}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              vista === 'lista'
                ? 'bg-amber-600 text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50'
            }`}
          >
            <List aria-hidden="true" className="h-4 w-4" />
            Lista
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar plato…"
            aria-label="Buscar plato en el menú"
            className="w-full rounded-xl border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <ChefHat aria-hidden="true" className="h-8 w-8 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            No encontramos platos con esa búsqueda.
          </p>
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-500"
          >
            Ver todo el menú
          </button>
        </div>
      ) : vista === 'cuadricula' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((producto) => {
            const stock = badgeStock(producto);

            return (
              <article
                key={producto.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="h-40 w-full overflow-hidden">
                  <ImagenProducto
                    producto={producto}
                    className="h-40 w-full object-cover"
                    iconoClassName="h-10 w-10 text-amber-500/70"
                  />
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                      {producto.nombre}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${stock.clase}`}
                    >
                      {stock.texto}
                    </span>
                  </div>

                  {producto.descripcion && (
                    <p className="mb-4 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {producto.descripcion}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    <span className="text-lg font-semibold text-amber-700 dark:text-amber-500">
                      {formatearCOP(producto.valor)}
                    </span>
                    <BotonAgregar producto={producto} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((producto) => {
            const stock = badgeStock(producto);

            return (
              <li
                key={producto.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center"
              >
                <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-28">
                  <ImagenProducto
                    producto={producto}
                    className="h-24 w-full object-cover sm:h-20 sm:w-28"
                    iconoClassName="h-8 w-8 text-amber-500/70"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                      {producto.nombre}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${stock.clase}`}
                    >
                      {stock.texto}
                    </span>
                  </div>
                  {producto.descripcion && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {producto.descripcion}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-lg font-semibold text-amber-700 dark:text-amber-500">
                    {formatearCOP(producto.valor)}
                  </span>
                  <BotonAgregar producto={producto} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Link
          href="/mi-orden"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <IconoOrden className="h-4 w-4" />
          Mi orden
        </Link>
        <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Package aria-hidden="true" className="h-4 w-4" />
          {visibles.length} plato(s)
        </span>
      </div>
    </div>
  );
}
