import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Protección de rutas del restaurante.
 *
 * Nota: en Next.js 16 la convención `middleware.ts` fue deprecada y renombrada
 * a `proxy.ts`. La lógica es idéntica: se ejecuta antes de que la petición
 * llegue a la ruta y permite refrescar la sesión y redirigir al usuario.
 */

/** Rutas que requieren tener una sesión iniciada. */
const RUTAS_PROTEGIDAS = ['/mis-pedidos', '/mis-reservas'];

/** Rutas a las que no debe entrar un usuario con sesión iniciada. */
const RUTAS_SOLO_INVITADOS = ['/login', '/registro'];

function esRutaProtegida(pathname: string): boolean {
  return RUTAS_PROTEGIDAS.includes(pathname);
}

function esRutaAdmin(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function esRutaSoloInvitados(pathname: string): boolean {
  return RUTAS_SOLO_INVITADOS.includes(pathname);
}

export async function proxy(request: NextRequest) {
  // La respuesta se recrea en cada `setAll` para propagar las cookies
  // refrescadas por Supabase (token de acceso renovado, etc.).
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca la sesión en cada petición. No debe ejecutarse ninguna otra
  // lógica entre la creación del cliente y esta llamada.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Sin sesión en /mis-pedidos, /mis-reservas o /admin/* -> /login
  if (!user && (esRutaProtegida(pathname) || esRutaAdmin(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 2. Con sesión en /login o /registro -> /
  if (user && esRutaSoloInvitados(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. /admin/* exige el rol 'admin' en la tabla public.perfiles
  if (user && esRutaAdmin(pathname)) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    // Si no existe el registro o el rol no es 'admin', se redirige al inicio.
    if (perfil?.rol !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return respuesta;
}

/**
 * Lista blanca: el proxy solo se ejecuta en estas rutas concretas.
 * Los archivos compilados y estáticos (`/_next/static/*`, `/_next/image*`,
 * `favicon.ico`, imágenes, fuentes y CSS) nunca coinciden, por lo que el
 * proxy no los bloquea ni los redirige.
 */
export const config = {
  matcher: [
    '/mis-pedidos',
    '/mis-reservas',
    '/admin',
    '/admin/:path*',
    '/login',
    '/registro',
  ],
};
