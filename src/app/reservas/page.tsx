import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import FormularioReserva from '@/modules/reservas/components/FormularioReserva';

export const metadata: Metadata = {
  title: 'Reservar mesa | Restaurante',
  description: 'Reserva tu mesa eligiendo día, hora y número de personas.',
};

export default async function ReservasPage() {
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

      <header className="mb-6">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
          <CalendarDays aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reserva tu mesa
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Verificamos el horario del restaurante y la disponibilidad de mesas al
          momento de reservar. Recibirás una confirmación en tu correo.
        </p>
      </header>

      <FormularioReserva />
    </div>
  );
}
