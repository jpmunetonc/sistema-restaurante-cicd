import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Estado controlado del cliente Supabase falso: el proxy solo consulta
 * `auth.getUser()` y el rol en `public.perfiles`.
 */
const estado = vi.hoisted(() => ({
  user: null as { id: string } | null,
  rol: null as string | null,
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: async () => ({ data: { user: estado.user } }),
    },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: estado.rol ? { rol: estado.rol } : null,
            error: null,
          }),
        }),
      }),
    })),
  })),
}));

import { proxy, config } from '@/proxy';

function solicitud(ruta: string): NextRequest {
  return new NextRequest(`http://localhost:3000${ruta}`);
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  estado.user = null;
  estado.rol = null;
});

describe('src/proxy.ts — visitante sin sesión', () => {
  it('redirige a /login desde /mis-pedidos', async () => {
    const respuesta = await proxy(solicitud('/mis-pedidos'));

    expect(respuesta.status).toBe(307);
    expect(respuesta.headers.get('location')).toContain('/login');
  });

  it('redirige a /login desde /mis-reservas', async () => {
    const respuesta = await proxy(solicitud('/mis-reservas'));

    expect(respuesta.headers.get('location')).toContain('/login');
  });

  it('redirige a /login desde /admin/pedidos', async () => {
    const respuesta = await proxy(solicitud('/admin/pedidos'));

    expect(respuesta.headers.get('location')).toContain('/login');
  });

  it('permite visitar /login y /registro sin sesión', async () => {
    const login = await proxy(solicitud('/login'));
    const registro = await proxy(solicitud('/registro'));

    expect(login.headers.get('location')).toBeNull();
    expect(login.status).toBe(200);
    expect(registro.headers.get('location')).toBeNull();
    expect(registro.status).toBe(200);
  });
});

describe('src/proxy.ts — rol cliente bloqueado en /admin/*', () => {
  it('redirige a / cuando un cliente intenta entrar a /admin/pedidos', async () => {
    estado.user = { id: 'uuid-cliente' };
    estado.rol = 'cliente';

    const respuesta = await proxy(solicitud('/admin/pedidos'));

    expect(respuesta.status).toBe(307);
    expect(respuesta.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('redirige a / cuando un cliente intenta entrar a /admin (sin subruta)', async () => {
    estado.user = { id: 'uuid-cliente' };
    estado.rol = 'cliente';

    const respuesta = await proxy(solicitud('/admin'));

    expect(respuesta.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('redirige a / si el usuario no tiene registro en perfiles', async () => {
    estado.user = { id: 'uuid-sin-perfil' };
    estado.rol = null;

    const respuesta = await proxy(solicitud('/admin/menu'));

    expect(respuesta.headers.get('location')).toBe('http://localhost:3000/');
  });
});

describe('src/proxy.ts — rol admin con acceso libre', () => {
  it('no redirige a un admin en /admin/pedidos', async () => {
    estado.user = { id: 'uuid-admin' };
    estado.rol = 'admin';

    const respuesta = await proxy(solicitud('/admin/pedidos'));

    expect(respuesta.headers.get('location')).toBeNull();
    expect(respuesta.status).toBe(200);
  });

  it('no redirige a un admin en /admin/reservas', async () => {
    estado.user = { id: 'uuid-admin' };
    estado.rol = 'admin';

    const respuesta = await proxy(solicitud('/admin/reservas'));

    expect(respuesta.headers.get('location')).toBeNull();
    expect(respuesta.status).toBe(200);
  });

  it('envía al inicio a un usuario con sesión que visita /login', async () => {
    estado.user = { id: 'uuid-cliente' };
    estado.rol = 'cliente';

    const respuesta = await proxy(solicitud('/login'));

    expect(respuesta.status).toBe(307);
    expect(respuesta.headers.get('location')).toBe('http://localhost:3000/');
  });
});

describe('src/proxy.ts — lista blanca de rutas (matcher)', () => {
  it('solo cubre las rutas protegidas, de invitado y de administración', () => {
    expect(config.matcher).toContain('/mis-pedidos');
    expect(config.matcher).toContain('/mis-reservas');
    expect(config.matcher).toContain('/admin');
    expect(config.matcher).toContain('/admin/:path*');
    expect(config.matcher).toContain('/login');
    expect(config.matcher).toContain('/registro');
    // Rutas públicas fuera del matcher: el proxy nunca las intercepta.
    expect(config.matcher).not.toContain('/');
    expect(config.matcher).not.toContain('/carrito');
  });
});
