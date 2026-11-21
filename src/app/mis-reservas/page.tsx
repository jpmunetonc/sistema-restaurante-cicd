import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import HistorialReservas from '@/modules/reservas/components/HistorialReservas';

export const metadata: Metadata = {
  title: 'Mis reservas | Restaurante',
};

export default async function MisReservasPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver al inicio
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            <CalendarDays aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Mis reservas
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Historial de tus reservas y su estado de confirmación.
          </p>
        </div>

        <Link
          href="/reservas"
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Nueva reserva
        </Link>
      </header>

      <HistorialReservas />
    </div>
  );
}
