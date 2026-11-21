import { createClient } from '@/lib/supabase/client';
import type { Perfil } from '@/lib/supabase/types';

export interface CredencialesInicioSesion {
  email: string;
  password: string;
}

export interface DatosRegistro {
  nombre: string;
  telefono: string;
  email: string;
  password: string;
}

export interface ResultadoRegistro {
  usuarioId: string | null;
  /** true cuando Supabase requiere confirmar el correo antes de iniciar sesión. */
  requiereConfirmacion: boolean;
}

/** Convierte los mensajes técnicos de Supabase en mensajes claros en español. */
function traducirError(error: { message?: string } | null | undefined): string {
  const mensaje = error?.message ?? '';

  if (/invalid login credentials/i.test(mensaje)) {
    return 'Correo o contraseña incorrectos.';
  }
  if (/email not confirmed/i.test(mensaje)) {
    return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.';
  }
  if (/already (been )?registered|already exists/i.test(mensaje)) {
    return 'Ya existe una cuenta con este correo electrónico.';
  }
  if (/password should be at least/i.test(mensaje)) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (/valid email|unable to validate email/i.test(mensaje)) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (/rate limit|too many (requests|attempts)/i.test(mensaje)) {
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (/fetch|network|failed to fetch/i.test(mensaje)) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
  }
  if (mensaje) {
    return 'No se pudo completar la operación. Intenta nuevamente.';
  }
  return 'Ocurrió un error inesperado. Intenta nuevamente.';
}

/** Inicia sesión con correo y contraseña. Lanza un Error con mensaje en español. */
export async function iniciarSesion({
  email,
  password,
}: CredencialesInicioSesion): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(traducirError(error));
  }
}

/**
 * Registra un usuario nuevo. El nombre y el teléfono se envían en
 * `options.data` para que el trigger de la tabla `perfiles` los use al
 * crear el registro asociado.
 */
export async function registrarUsuario({
  nombre,
  telefono,
  email,
  password,
}: DatosRegistro): Promise<ResultadoRegistro> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        telefono,
      },
    },
  });

  if (error) {
    throw new Error(traducirError(error));
  }

  return {
    usuarioId: data.user?.id ?? null,
    requiereConfirmacion: data.session === null,
  };
}

/** Cierra la sesión del usuario actual. */
export async function cerrarSesion(): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(traducirError(error));
  }
}

/** Obtiene el perfil (tabla public.perfiles) del usuario con sesión iniciada. */
export async function obtenerPerfilActual(): Promise<Perfil | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return (data as Perfil | null) ?? null;
}
