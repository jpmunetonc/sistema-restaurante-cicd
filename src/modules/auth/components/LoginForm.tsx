'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, LogIn, Mail } from 'lucide-react';
import { iniciarSesion } from '@/modules/auth/services/auth-service';

const CLASES_INPUT =
  'w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500';

const CLASES_ETIQUETA =
  'mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Completa tu correo electrónico y tu contraseña para continuar.');
      return;
    }

    setCargando(true);

    try {
      await iniciarSesion({ email: email.trim(), password });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión. Intenta nuevamente.'
      );
      setCargando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} noValidate className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="login-email" className={CLASES_ETIQUETA}>
          Correo electrónico
        </label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            disabled={cargando}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
            aria-invalid={error ? true : undefined}
            className={CLASES_INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className={CLASES_ETIQUETA}>
          Contraseña
        </label>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={cargando}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            aria-invalid={error ? true : undefined}
            className={CLASES_INPUT}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={cargando}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-900"
      >
        {cargando ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn aria-hidden="true" className="h-4 w-4" />
        )}
        {cargando ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>
    </form>
  );
}
