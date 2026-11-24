import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import VistaMisReservas from '@/modules/reservas/components/VistaMisReservas';

export const metadata: Metadata = {
  title: 'Mis reservas | Restaurante',
};

interface MisReservasProps {
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
}

export default async function MisReservasPage({ searchParams }: MisReservasProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // /reservas redirige aquí con ?nueva=1 para abrir el pop-up de creación.
  const parametros = await searchParams;
  const abrirModalInicial = parametros.nueva === '1';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver al inicio
      </Link>

      <VistaMisReservas abrirModalInicial={abrirModalInicial} />
    </div>
  );
}
