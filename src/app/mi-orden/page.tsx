import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import IconoOrden from '@/components/IconoOrden';
import VistaCarrito from '@/modules/pedidos/components/VistaCarrito';

export const metadata: Metadata = {
  title: 'Mi orden | Restaurante',
};

// La orden vive en localStorage y puede consultarse como visitante:
// la sesión solo se exige al confirmar el pedido (registrarPedido).
export default function MiOrdenPage() {
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
          <IconoOrden className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          Mi orden
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Revisa tus platos, indica la dirección de entrega y confirma el pedido.
        </p>
      </header>

      <VistaCarrito />
    </div>
  );
}
