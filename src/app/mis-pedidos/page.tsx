import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import SeguimientoPedidos from '@/modules/pedidos/components/SeguimientoPedidos';

export const metadata: Metadata = {
  title: 'Mis pedidos | Restaurante',
};

export default async function MisPedidosPage() {
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
            <Package aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Mis pedidos
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Sigue el estado de tus pedidos, desde la cocina hasta tu puerta.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Pedir algo rico
        </Link>
      </header>

      <SeguimientoPedidos />
    </div>
  );
}
