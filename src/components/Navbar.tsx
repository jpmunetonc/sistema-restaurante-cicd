'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  CalendarDays,
  LogIn,
  Menu,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useCarrito } from '@/modules/pedidos/context/CarritoContext';
import IconoOrden from '@/components/IconoOrden';
import CampanaNotificaciones from '@/modules/notificaciones/components/CampanaNotificaciones';
import LogoutButton from '@/modules/auth/components/LogoutButton';
import type { Perfil } from '@/lib/supabase/types';

interface NavbarProps {
  perfil: Perfil | null;
}

interface Enlace {
  href: string;
  etiqueta: string;
  icono: typeof ClipboardList;
}

const ENLACES_CLIENTE: Enlace[] = [
  { href: '/mis-reservas', etiqueta: 'Mis reservas', icono: CalendarDays },
  { href: '/mis-pedidos', etiqueta: 'Mis pedidos', icono: ClipboardList },
];

/**
 * Navegación exclusiva del administrador (menú superior y menú móvil):
 * oculta los enlaces de cliente y el carrito, y muestra solo las tres
 * secciones operativas del panel.
 */
const ENLACES_ADMIN: Enlace[] = [
  { href: '/admin/menu', etiqueta: 'Carta', icono: UtensilsCrossed },
  { href: '/admin/reservas', etiqueta: 'Reservas', icono: CalendarDays },
  { href: '/admin/pedidos', etiqueta: 'Pedidos', icono: ClipboardList },
];

function esActivo(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function estiloEnlace(activo: boolean): string {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    activo
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
  }`;
}

export default function Navbar({ perfil }: NavbarProps) {
  const pathname = usePathname();
  const { cantidadTotal } = useCarrito();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const esAdmin = perfil?.rol === 'admin';
  const autenticado = Boolean(perfil);

  /** Cierra el menú móvil al navegar desde él. */
  function cerrarMenu() {
    setMenuAbierto(false);
  }

  const enlaces: Enlace[] = autenticado ? ENLACES_CLIENTE : [];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
            <UtensilsCrossed aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </span>
          <span className="hidden sm:inline">Restaurante</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {esAdmin ? (
            ENLACES_ADMIN.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={estiloEnlace(esActivo(enlace.href, pathname))}
              >
                {enlace.etiqueta}
              </Link>
            ))
          ) : (
            <>
              <Link href="/" className={estiloEnlace(esActivo('/', pathname))}>
                Inicio
              </Link>
              {enlaces.map((enlace) => (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  className={estiloEnlace(esActivo(enlace.href, pathname))}
                >
                  {enlace.etiqueta}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!esAdmin && (
            <Link
              href="/mi-orden"
              aria-label={`Mi orden, ${cantidadTotal} producto(s)`}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <IconoOrden className="h-[18px] w-[18px]" />
              {cantidadTotal > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                  {cantidadTotal > 9 ? '9+' : cantidadTotal}
                </span>
              )}
            </Link>
          )}

          {autenticado && <CampanaNotificaciones esAdmin={esAdmin} />}

          {autenticado ? (
            <div className="hidden items-center gap-3 lg:flex">
              <span className="max-w-[160px] truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {perfil?.nombre || perfil?.email}
                {esAdmin && (
                  <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                    admin
                  </span>
                )}
              </span>
              <LogoutButton>
                <span className="hidden sm:inline">Cerrar sesión</span>
              </LogoutButton>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <LogIn aria-hidden="true" className="h-4 w-4" />
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                Registrarse
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuAbierto((actual) => !actual)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 md:hidden"
          >
            {menuAbierto ? (
              <X aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Menu aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {menuAbierto && (
        <nav
          aria-label="Menú móvil"
          className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {esAdmin ? (
              ENLACES_ADMIN.map((enlace) => (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  onClick={cerrarMenu}
                  className={estiloEnlace(esActivo(enlace.href, pathname))}
                >
                  {enlace.etiqueta}
                </Link>
              ))
            ) : (
              <>
                <Link
                  href="/"
                  onClick={cerrarMenu}
                  className={estiloEnlace(esActivo('/', pathname))}
                >
                  Inicio
                </Link>

                {enlaces.map((enlace) => (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    onClick={cerrarMenu}
                    className={estiloEnlace(esActivo(enlace.href, pathname))}
                  >
                    {enlace.etiqueta}
                  </Link>
                ))}

                <Link
                  href="/mi-orden"
                  onClick={cerrarMenu}
                  className={estiloEnlace(esActivo('/mi-orden', pathname))}
                >
                  Mi orden{cantidadTotal > 0 ? ` (${cantidadTotal})` : ''}
                </Link>
              </>
            )}

            {autenticado ? (
              <div
                onClick={cerrarMenu}
                className="mt-2 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800"
              >
                <span className="px-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {perfil?.nombre || perfil?.email}
                  {esAdmin && (
                    <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                      admin
                    </span>
                  )}
                </span>
                <LogoutButton className="w-full" />
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <Link
                  href="/login"
                  onClick={cerrarMenu}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <LogIn aria-hidden="true" className="h-4 w-4" />
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  onClick={cerrarMenu}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  <UserPlus aria-hidden="true" className="h-4 w-4" />
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
