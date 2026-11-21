import Link from 'next/link';
import {
  Bike,
  CalendarDays,
  ChefHat,
  Clock,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import CatalogoMenu from '@/modules/menu/components/CatalogoMenu';

const DESTACADOS = [
  {
    icono: ChefHat,
    titulo: 'Cocina de autor',
    texto: 'Platos preparados al momento con ingredientes frescos cada día.',
  },
  {
    icono: Bike,
    titulo: 'A domicilio',
    texto: 'Recibe tu pedido en casa con seguimiento en tiempo real.',
  },
  {
    icono: CalendarDays,
    titulo: 'Reserva tu mesa',
    texto: 'Elige día y hora y nosotros nos encargamos del resto.',
  },
  {
    icono: Clock,
    titulo: 'Siempre abierto a ti',
    texto: 'Consulta nuestros horarios y reserva cuando mejor te quede.',
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Presentación del restaurante */}
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              <UtensilsCrossed aria-hidden="true" className="h-3.5 w-3.5" />
              Bienvenido
            </span>

            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Tus platos favoritos, pedidos y reservados en un solo lugar
            </h1>

            <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-300">
              Ordena a domicilio en minutos o reserva tu mesa favorita. Elige del
              menú, paga con tu método preferido y sigue tu pedido paso a paso
              mientras llega.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#menu"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
              >
                <ShoppingBag aria-hidden="true" className="h-4 w-4" />
                Ver el menú
              </a>
              <Link
                href="/reservas"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                Reservar una mesa
              </Link>
            </div>
          </div>

          <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DESTACADOS.map(({ icono: Icono, titulo, texto }) => (
              <li
                key={titulo}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60">
                  <Icono aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </span>
                <h2 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">{titulo}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Catálogo interactivo del menú */}
      <section id="menu" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Nuestro menú
          </h2>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Filtra por categoría, busca tu plato y agrégalo al carrito.
          </p>
        </div>

        <CatalogoMenu />
      </section>
    </div>
  );
}
