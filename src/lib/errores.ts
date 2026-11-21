/**
 * Convierte errores técnicos de Supabase/Postgres en mensajes claros
 * en español para mostrar al usuario.
 */
export function mensajeErrorSupabase(error: unknown, mensajePorDefecto: string): string {
  const mensaje =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!mensaje) return mensajePorDefecto;

  if (/row-level security|permission denied/i.test(mensaje)) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (/duplicate key|unique constraint/i.test(mensaje)) {
    return 'Ya existe un registro con esos datos.';
  }
  if (/foreign key/i.test(mensaje)) {
    return 'No se puede completar la operación porque el registro está relacionado con otros datos.';
  }
  if (/invalid input syntax|invalid text representation/i.test(mensaje)) {
    return 'Uno de los datos enviados no tiene un formato válido.';
  }
  if (/failed to fetch|network|load failed/i.test(mensaje)) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
  }

  return mensajePorDefecto;
}
