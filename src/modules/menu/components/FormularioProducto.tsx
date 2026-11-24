'use client';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Loader2, Save, X } from 'lucide-react';
import {
  crearProducto,
  actualizarProducto,
  guardarImagenProducto,
  validarProducto,
  type DatosProducto,
} from '../services/menu-service';
import MiniaturaProducto from './MiniaturaProducto';
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
  const [valor, setValor] = useState(producto ? String(producto.valor) : '');
  const [stock, setStock] = useState(producto ? String(producto.stock_disponible) : '10');
  /** Imagen ya guardada en Supabase (la que trae el plato al editar). */
  const [imagenActual] = useState(producto?.imagen_url ?? '');
  /** Archivo elegido por el usuario, pendiente de subir al guardar. */
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null);
  /** Vista previa local inmediata (Data URL) del archivo elegido. */
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement | null>(null);
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Muestra la imagen elegida al instante (vista previa local). */
  function manejarArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0] ?? null;

    if (!archivo) {
      setArchivoNuevo(null);
      setVistaPrevia(null);
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      setArchivoNuevo(null);
      setVistaPrevia(null);
      setError('El archivo seleccionado debe ser una imagen.');
      return;
    }

    setError(null);
    setArchivoNuevo(archivo);

    const lector = new FileReader();
    lector.onload = () => setVistaPrevia(String(lector.result));
    lector.onerror = () => setVistaPrevia(null);
    lector.readAsDataURL(archivo);
  }

  /** Limpia la selección y el input (para poder volver a elegir el mismo archivo). */
  function limpiarArchivo() {
    setArchivoNuevo(null);
    setVistaPrevia(null);
    if (inputArchivoRef.current) inputArchivoRef.current.value = '';
  }

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const datos: DatosProducto = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      valor: Number(valor),
      stock_disponible: Number(stock),
      imagen_url: imagenActual.trim() || null,
      activo,
    };

    const errorValidacion = validarProducto(datos);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setCargando(true);

    try {
      // Si eligió una imagen nueva, primero se sube al bucket (o se
      // convierte a Data URL como respaldo) y luego se guarda el plato.
      if (archivoNuevo) {
        datos.imagen_url = (await guardarImagenProducto(archivoNuevo)).trim() || null;
      }

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
          <label htmlFor="producto-valor" className={CLASES_ETIQUETA}>
            Valor (COP)
          </label>
          <input
            id="producto-valor"
            type="number"
            min="0"
            step="100"
            required
            disabled={cargando}
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            placeholder="18000"
            className={CLASES_INPUT}
          />
        </div>

        <div>
          <label htmlFor="producto-stock" className={CLASES_ETIQUETA}>
            Stock disponible
          </label>
          <input
            id="producto-stock"
            type="number"
            min="0"
            step="1"
            required
            disabled={cargando}
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            placeholder="10"
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
          <span className={CLASES_ETIQUETA}>Imagen del plato</span>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
            {/* Imagen actual o vista previa local inmediata del archivo nuevo. */}
            <MiniaturaProducto
              url={vistaPrevia ?? (imagenActual.trim() || null)}
              alt="Vista previa de la imagen del plato"
            />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {archivoNuevo ? 'Nueva imagen (vista previa)' : 'Imagen actual'}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {archivoNuevo
                  ? archivoNuevo.name
                  : imagenActual.trim() || 'Sin imagen: se mostrará el icono de reserva.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <label
                htmlFor="producto-imagen-archivo"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-amber-400 hover:text-amber-700 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <ImagePlus aria-hidden="true" className="h-4 w-4" />
                Cambiar imagen
              </label>

              <input
                id="producto-imagen-archivo"
                ref={inputArchivoRef}
                type="file"
                accept="image/*"
                aria-label="Cambiar imagen"
                disabled={cargando}
                onChange={manejarArchivo}
                className="sr-only"
              />

              {archivoNuevo && (
                <button
                  type="button"
                  onClick={limpiarArchivo}
                  disabled={cargando}
                  className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Selecciona una imagen desde tu equipo; aquí verás la vista previa antes de
            guardar. Al guardar se sube al almacén del restaurante.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={activo}
          disabled={cargando}
          onChange={(event) => setActivo(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500/40"
        />
        Activo en el catálogo
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
