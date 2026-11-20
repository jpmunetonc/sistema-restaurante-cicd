import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, UtensilsCrossed } from 'lucide-react';
import LoginForm from '@/modules/auth/components/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión | Restaurante',
  description: 'Inicia sesión para realizar tus pedidos y reservar tu mesa.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver al inicio
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
            <UtensilsCrossed
              aria-hidden="true"
              className="h-6 w-6 text-amber-600 dark:text-amber-400"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Bienvenido de nuevo
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Inicia sesión para pedir tus favoritos y reservar tu mesa.
          </p>
        </header>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          ¿No tienes cuenta?{' '}
          <Link
            href="/registro"
            className="font-semibold text-amber-600 transition hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
