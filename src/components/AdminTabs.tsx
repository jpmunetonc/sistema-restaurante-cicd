'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, ClipboardList, UtensilsCrossed } from 'lucide-react';

const PESTANAS = [
  { href: '/admin/menu', etiqueta: 'Menú', icono: UtensilsCrossed },
  { href: '/admin/reservas', etiqueta: 'Reservas', icono: CalendarDays },
  { href: '/admin/pedidos', etiqueta: 'Pedidos', icono: ClipboardList },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de administración"
      className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800"
    >
      {PESTANAS.map((pestana) => {
        const activa = pathname === pestana.href;
        const Icono = pestana.icono;

        return (
          <Link
            key={pestana.href}
            href={pestana.href}
            aria-current={activa ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activa
                ? 'bg-amber-600 text-white shadow-sm'
                : 'border border-zinc-300 bg-white text-zinc-600 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            <Icono aria-hidden="true" className="h-4 w-4" />
            {pestana.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
