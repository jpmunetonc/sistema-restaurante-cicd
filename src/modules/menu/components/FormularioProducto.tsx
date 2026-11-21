'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import {
  crearProducto,
  actualizarProducto,
  validarProducto,
  type DatosProducto,
} from '../services/menu-service';
import type { Producto } from '@/lib/supabase/types';

interface FormularioProductoProps {
  producto?: Producto | null;
  onGuardado: () => void;
  onCancelar: () => void;
}

const CLASES_INPUT =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500';

const CLASES_ETIQUETA = 'mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function FormularioProducto({
  producto,
  onGuardado,
  onCancelar,
}: FormularioProductoProps) {
  const editando = Boolean(producto);
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? '');
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : '');
  const [categoria, setCategoria] = useState(producto?.categoria ?? '');
  const [imagenUrl, setImagenUrl] = useState(producto?.imagen_url ?? '');
  const [disponible, setDisponible] = useState(producto?.disponible ?? true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const datos: DatosProducto = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio: Number(precio),
      categoria: categoria.trim(),
      imagen_url: imagenUrl.trim() || null,
      disponible,
    };

    const errorValidacion = validarProducto(datos);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    if (Number.isNaN(datos.precio)) {
      setError('El precio debe ser un número válido.');
      return;
    }

    setCargando(true);

    try {
      if (editando && producto) {
        await actualizarProducto(producto.id, datos);
      } else {
        await crearProducto(datos);
      }
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el plato.');
      setCargando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} noValidate className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {editando ? `Editar: ${producto?.nombre}` : 'Nuevo plato'}
        </h3>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Cerrar formulario"
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="producto-nombre" className={CLASES_ETIQUETA}>
            Nombre del plato
          </label>
          <input
            id="producto-nombre"
            type="text"
            required
            disabled={cargando}
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Pasta Alfredo"
            className={CLASES_INPUT}
          />
        </div>

        <div>
          <label htmlFor="producto-precio" className={CLASES_ETIQUETA}>
            Precio (COP)
          </label>
          <input
            id="producto-precio"
            type="number"
            min="0"
            step="100"
            required
            disabled={cargando}
            value={precio}
            onChange={(event) => setPrecio(event.target.value)}
            placeholder="18000"
            className={CLASES_INPUT}
          />
        </div>

        <div>
          <label htmlFor="producto-categoria" className={CLASES_ETIQUETA}>
            Categoría
          </label>
          <input
            id="producto-categoria"
            type="text"
            required
            disabled={cargando}
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            placeholder="Platos fuertes"
            className={CLASES_INPUT}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="producto-descripcion" className={CLASES_ETIQUETA}>
            Descripción
          </label>
          <textarea
            id="producto-descripcion"
            rows={3}
            disabled={cargando}
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Ingredientes y descripción del plato…"
            className={`${CLASES_INPUT} resize-none`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="producto-imagen" className={CLASES_ETIQUETA}>
            URL de la imagen (opcional)
          </label>
          <input
            id="producto-imagen"
            type="url"
            disabled={cargando}
            value={imagenUrl}
            onChange={(event) => setImagenUrl(event.target.value)}
            placeholder="https://…"
            className={CLASES_INPUT}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={disponible}
          disabled={cargando}
          onChange={(event) => setDisponible(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500/40"
        />
        Disponible para la venta
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancelar}
          disabled={cargando}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargando}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cargando ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {cargando ? 'Guardando…' : 'Guardar plato'}
        </button>
      </div>
    </form>
  );
}
