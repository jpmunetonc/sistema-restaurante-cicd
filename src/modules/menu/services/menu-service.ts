import { createClient } from '@/lib/supabase/client';
import { mensajeErrorSupabase } from '@/lib/errores';
import type { Producto } from '@/lib/supabase/types';

export interface DatosProducto {
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string;
  imagen_url: string | null;
  disponible: boolean;
}

export interface OpcionesProductos {
  /** true => solo productos con disponible = true (catálogo público). */
  soloDisponibles?: boolean;
}

/** Carga el catálogo completo (o solo los platos disponibles). */
export async function obtenerProductos(
  opciones: OpcionesProductos = {}
): Promise<Producto[]> {
  const supabase = createClient();

  const query = supabase
    .from('productos')
    .select('*')
    .order('categoria', { ascending: true })
    .order('nombre', { ascending: true });

  if (opciones.soloDisponibles) {
    query.eq('disponible', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo cargar el menú.'));
  }

  return (data ?? []) as Producto[];
}

/** Lista de categorías distintas del catálogo, ordenadas alfabéticamente. */
export async function obtenerCategorias(): Promise<string[]> {
  const productos = await obtenerProductos();
  return [...new Set(productos.map((producto) => producto.categoria))].sort();
}

/** Valida los datos de un plato. Devuelve el mensaje de error o null si es válido. */
export function validarProducto(datos: Partial<DatosProducto>): string | null {
  if (!datos.nombre?.trim()) return 'Escribe el nombre del plato.';
  if (datos.nombre.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (!datos.categoria?.trim()) return 'Selecciona o escribe una categoría.';
  if (typeof datos.precio !== 'number' || Number.isNaN(datos.precio)) {
    return 'Indica el precio del plato.';
  }
  if (datos.precio < 0) return 'El precio no puede ser negativo.';
  return null;
}

/** Crea un plato nuevo (panel administrativo). */
export async function crearProducto(datos: DatosProducto): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('productos').insert({
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion?.trim() || null,
    precio: datos.precio,
    categoria: datos.categoria.trim(),
    imagen_url: datos.imagen_url?.trim() || null,
    disponible: datos.disponible,
  });

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo crear el plato.'));
  }
}

/** Actualiza campos de un plato existente (nombre, precio, descripción, etc.). */
export async function actualizarProducto(
  id: number,
  datos: Partial<DatosProducto>
): Promise<void> {
  const supabase = createClient();

  const actualizacion: Record<string, unknown> = {};
  if (datos.nombre !== undefined) actualizacion.nombre = datos.nombre.trim();
  if (datos.descripcion !== undefined) {
    actualizacion.descripcion = (datos.descripcion ?? '').trim() || null;
  }
  if (datos.precio !== undefined) actualizacion.precio = datos.precio;
  if (datos.categoria !== undefined) actualizacion.categoria = datos.categoria.trim();
  if (datos.imagen_url !== undefined) {
    actualizacion.imagen_url = (datos.imagen_url ?? '').trim() || null;
  }
  if (datos.disponible !== undefined) actualizacion.disponible = datos.disponible;

  const { error } = await supabase
    .from('productos')
    .update(actualizacion)
    .eq('id', id);

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo actualizar el plato.'));
  }
}

/** Activa o pausa la disponibilidad de un plato. */
export async function alternarDisponibilidad(
  id: number,
  disponible: boolean
): Promise<void> {
  await actualizarProducto(id, { disponible });
}

/** Elimina un plato del catálogo. */
export async function eliminarProducto(id: number): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('productos').delete().eq('id', id);

  if (error) {
    throw new Error(
      mensajeErrorSupabase(
        error,
        'No se pudo eliminar el plato. Puede estar incluido en pedidos anteriores.'
      )
    );
  }
}
