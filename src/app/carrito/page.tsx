import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import VistaCarrito from '@/modules/pedidos/components/VistaCarrito';

export const metadata: Metadata = {
  title: 'Carrito | Restaurante',
};

export default async function CarritoPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver al inicio
      </Link>

      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          <ShoppingCart aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Tu carrito
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Revisa tus productos, indica la dirección de entrega y confirma el pedido.
        </p>
      </header>

      <VistaCarrito />
    </div>
  );
}
