'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { cerrarSesion } from '@/modules/auth/services/auth-service';

interface LogoutButtonProps {
  /** Texto del botón. Por defecto: "Cerrar sesión". */
  children?: ReactNode;
  /** Clases extra para personalizar el contenedor del botón. */
  className?: string;
}

export default function LogoutButton({
  children = 'Cerrar sesión',
  className = '',
}: LogoutButtonProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarCierre() {
    setError(null);
    setCargando(true);

    try {
      await cerrarSesion();
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cerrar la sesión. Intenta nuevamente.'
      );
      setCargando(false);
    }
  }

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`.trim()}>
      <button
        type="button"
        onClick={manejarCierre}
        disabled={cargando}
        className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {cargando ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut aria-hidden="true" className="h-4 w-4" />
        )}
        {cargando ? 'Cerrando sesión…' : children}
      </button>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
