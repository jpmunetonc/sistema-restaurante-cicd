import { createClient } from '@/lib/supabase/client';
import { mensajeErrorSupabase } from '@/lib/errores';
import type { Producto } from '@/lib/supabase/types';

export interface DatosProducto {
  nombre: string;
  descripcion: string | null;
  valor: number;
  stock_disponible: number;
  imagen_url: string | null;
  activo: boolean;
}

export interface OpcionesProductos {
  /** true => solo productos con activo = true (catálogo público). */
  soloActivos?: boolean;
}

/** Carga el catálogo completo (o solo los platos activos). */
export async function obtenerProductos(
  opciones: OpcionesProductos = {}
): Promise<Producto[]> {
  const supabase = createClient();

  const query = supabase
    .from('productos')
    .select('*')
    .order('nombre', { ascending: true });

  if (opciones.soloActivos) {
    query.eq('activo', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo cargar el menú.'));
  }

  return (data ?? []) as Producto[];
}

/** Valida los datos de un plato. Devuelve el mensaje de error o null si es válido. */
export function validarProducto(datos: Partial<DatosProducto>): string | null {
  if (!datos.nombre?.trim()) return 'Escribe el nombre del plato.';
  if (datos.nombre.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (typeof datos.valor !== 'number' || Number.isNaN(datos.valor)) {
    return 'Indica el valor del plato.';
  }
  if (datos.valor < 0) return 'El valor no puede ser negativo.';
  if (
    typeof datos.stock_disponible !== 'number' ||
    Number.isNaN(datos.stock_disponible) ||
    !Number.isInteger(datos.stock_disponible)
  ) {
    return 'Indica el stock disponible (número entero).';
  }
  if (datos.stock_disponible < 0) return 'El stock no puede ser negativo.';
  return null;
}

/** Crea un plato nuevo (panel administrativo). */
export async function crearProducto(datos: DatosProducto): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('productos').insert({
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion?.trim() || null,
    valor: datos.valor,
    stock_disponible: datos.stock_disponible,
    imagen_url: datos.imagen_url?.trim() || null,
    activo: datos.activo,
  });

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo crear el plato.'));
  }
}

/** Actualiza campos de un plato existente (nombre, valor, stock, etc.). */
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
  if (datos.valor !== undefined) actualizacion.valor = datos.valor;
  if (datos.stock_disponible !== undefined) {
    actualizacion.stock_disponible = datos.stock_disponible;
  }
  if (datos.imagen_url !== undefined) {
    actualizacion.imagen_url = (datos.imagen_url ?? '').trim() || null;
  }
  if (datos.activo !== undefined) actualizacion.activo = datos.activo;

  const { error } = await supabase
    .from('productos')
    .update(actualizacion)
    .eq('id', id);

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo actualizar el plato.'));
  }
}

/** Activa o pausa un plato en el catálogo. */
export async function alternarActivo(id: number, activo: boolean): Promise<void> {
  await actualizarProducto(id, { activo });
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

/** Bucket público de Supabase Storage donde viven las imágenes de los platos. */
export const BUCKET_IMAGENES_PRODUCTOS = 'productos';

/** Sube la imagen al bucket `productos` y devuelve su URL pública. */
export async function subirImagenProducto(archivo: File): Promise<string> {
  const supabase = createClient();

  const extension =
    (archivo.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const nombre = `producto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET_IMAGENES_PRODUCTOS).upload(nombre, archivo, {
    upsert: false,
    ...(archivo.type ? { contentType: archivo.type } : {}),
  });

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo subir la imagen del plato.'));
  }

  const { data } = supabase.storage.from(BUCKET_IMAGENES_PRODUCTOS).getPublicUrl(nombre);

  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la imagen.');
  }

  return data.publicUrl;
}

/** Lee el archivo tal cual como Data URL (último respaldo). */
function leerImagenComoDataURL(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen seleccionada.'));
    lector.readAsDataURL(archivo);
  });
}

/**
 * Convierte la imagen en un `<canvas>` (redimensionada a un lado máximo)
 * y devuelve su Data URL como respaldo cuando falla la subida al bucket.
 */
export function convertirImagenADataURL(archivo: File, maxLado = 1200): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();

    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen seleccionada.'));

    lector.onload = () => {
      const fuente = String(lector.result);
      const imagen = new Image();

      imagen.onerror = () => rechazar(new Error('No se pudo procesar la imagen seleccionada.'));

      imagen.onload = () => {
        try {
          const escala = Math.min(1, maxLado / Math.max(imagen.width, imagen.height));
          const lienzo = document.createElement('canvas');
          lienzo.width = Math.max(1, Math.round(imagen.width * escala));
          lienzo.height = Math.max(1, Math.round(imagen.height * escala));

          const contexto = lienzo.getContext('2d');
          if (!contexto) {
            rechazar(new Error('No se pudo procesar la imagen seleccionada.'));
            return;
          }

          contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
          resolver(lienzo.toDataURL('image/jpeg', 0.85));
        } catch {
          rechazar(new Error('No se pudo procesar la imagen seleccionada.'));
        }
      };

      imagen.src = fuente;
    };

    lector.readAsDataURL(archivo);
  });
}

/**
 * Guarda la imagen del plato:
 * 1. Intenta subirla al bucket público `productos` y usar su URL pública.
 * 2. Si la subida falla, la convierte/redimensiona en `<canvas>` a Data URL.
 * 3. Como último respaldo, guarda el archivo leído como Data URL.
 */
export async function guardarImagenProducto(archivo: File): Promise<string> {
  try {
    return await subirImagenProducto(archivo);
  } catch {
    try {
      return await convertirImagenADataURL(archivo);
    } catch {
      return await leerImagenComoDataURL(archivo);
    }
  }
}
