'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  DollarSign,
  LayoutGrid,
  Loader2,
  UtensilsCrossed,
} from 'lucide-react';
import {
  ETIQUETAS_RANGO,
  obtenerReportesDashboard,
  type RangoFechas,
  type ReportesDashboard,
} from '../services/reportes-service';
import { formatearCOP, hoyISO } from '@/lib/formato';
import { ETIQUETAS_PEDIDO } from '@/modules/pedidos/lib/pedidos';
import { ETIQUETAS_RESERVA } from '@/modules/reservas/lib/reservas';
import type { EstadoPedido, EstadoReserva } from '@/lib/supabase/types';

const CLASES_SELECT =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

const OPCIONES_RANGO = Object.entries(ETIQUETAS_RANGO) as [RangoFechas, string][];

const OPCIONES_PEDIDO = Object.entries(ETIQUETAS_PEDIDO) as [EstadoPedido, string][];
const OPCIONES_RESERVA = Object.entries(ETIQUETAS_RESERVA) as [EstadoReserva, string][];

const ACCESOS_DIRECTOS = [
  {
    href: '/admin/menu',
    titulo: 'Menú',
    texto: 'Crea platos, ajusta precios, stock e imágenes.',
    icono: UtensilsCrossed,
  },
  {
    href: '/admin/reservas',
    titulo: 'Reservas',
    texto: 'Confirma, cancela o completa las reservas de mesas.',
    icono: CalendarDays,
  },
  {
    href: '/admin/pedidos',
    titulo: 'Pedidos',
    texto: 'Sigue el estado de cada pedido en tiempo real.',
    icono: ClipboardList,
  },
];

/**
 * Home exclusivo del administrador: accesos directos a los paneles y
 * tres tarjetas de reporte (pedidos, reservas y total vendido) consultadas
 * en Supabase con filtros de rango de fecha y estado.
 */
export default function DashboardAdmin() {
  const [rango, setRango] = useState<RangoFechas>('ultimos_7_dias');
  const [fechaExacta, setFechaExacta] = useState(hoyISO());
  const [estadoPedidos, setEstadoPedidos] = useState<EstadoPedido | 'todos'>('todos');
  const [estadoReservas, setEstadoReservas] = useState<EstadoReserva | 'todos'>('todos');

  const [reportes, setReportes] = useState<ReportesDashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Cada cambio de filtro dispara una nueva consulta a Supabase. */
  function cambiarRango(valor: RangoFechas) {
    setError(null);
    setCargando(true);
    setRango(valor);
  }

  function cambiarFechaExacta(valor: string) {
    setError(null);
    setCargando(true);
    setFechaExacta(valor);
  }

  function cambiarEstadoPedidos(valor: string) {
    setError(null);
    setCargando(true);
    setEstadoPedidos(valor as EstadoPedido | 'todos');
  }

  function cambiarEstadoReservas(valor: string) {
    setError(null);
    setCargando(true);
    setEstadoReservas(valor as EstadoReserva | 'todos');
  }

  useEffect(() => {
    let activo = true;

    obtenerReportesDashboard({ rango, fechaExacta }, estadoPedidos, estadoReservas)
      .then((datos) => {
        if (!activo) return;
        setReportes(datos);
        setError(null);
        setCargando(false);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes.');
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [rango, fechaExacta, estadoPedidos, estadoReservas]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* Encabezado del panel */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
          <LayoutGrid aria-hidden="true" className="h-3.5 w-3.5" />
          Panel administrativo
        </span>

        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Controla tu restaurante con un solo clic
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
          Accede a las secciones operativas y revisa los indicadores de pedidos,
          reservas y ventas del restaurante.
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ACCESOS_DIRECTOS.map(({ href, titulo, texto, icono: Icono }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-5 transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-amber-700"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60">
                  <Icono aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </span>
                <span className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">
                  {titulo}
                </span>
                <span className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {texto}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Filtros de los reportes */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="sm:max-w-xs sm:flex-1">
            <label
              htmlFor="reporte-rango"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Rango de fechas
            </label>
            <select
              id="reporte-rango"
              value={rango}
              onChange={(event) => cambiarRango(event.target.value as RangoFechas)}
              className={CLASES_SELECT}
            >
              {OPCIONES_RANGO.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>

          {rango === 'fecha_exacta' && (
            <div className="sm:max-w-xs sm:flex-1">
              <label
                htmlFor="reporte-fecha-exacta"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Fecha exacta
              </label>
              <input
                id="reporte-fecha-exacta"
                type="date"
                value={fechaExacta}
                onChange={(event) => cambiarFechaExacta(event.target.value)}
                className={CLASES_SELECT}
              />
            </div>
          )}

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Los indicadores se actualizan automáticamente al cambiar los filtros.
          </p>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Tarjetas de reporte */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TarjetaReporte
          titulo="Pedidos realizados"
          icono={ClipboardList}
          cargando={cargando}
          valor={reportes ? String(reportes.pedidos.cantidad) : '—'}
          etiquetaEstado="Estado del pedido"
          valorEstado={estadoPedidos}
          opcionesEstado={OPCIONES_PEDIDO}
          onChangeEstado={cambiarEstadoPedidos}
        />

        <TarjetaReporte
          titulo="Reservas programadas"
          icono={CalendarDays}
          cargando={cargando}
          valor={reportes ? String(reportes.reservas.cantidad) : '—'}
          etiquetaEstado="Estado de la reserva"
          valorEstado={estadoReservas}
          opcionesEstado={OPCIONES_RESERVA}
          onChangeEstado={cambiarEstadoReservas}
        />

        <TarjetaReporte
          titulo="Total vendido (COP)"
          icono={DollarSign}
          cargando={cargando}
          valor={reportes ? formatearCOP(reportes.pedidos.totalVendido) : '—'}
          etiquetaEstado="Estado del pedido"
          valorEstado={estadoPedidos}
          opcionesEstado={OPCIONES_PEDIDO}
          onChangeEstado={cambiarEstadoPedidos}
        />
      </section>

      {!reportes && !cargando && !error && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          Sin datos disponibles para el rango seleccionado.
        </div>
      )}
    </div>
  );
}

interface TarjetaReporteProps {
  titulo: string;
  icono: typeof ClipboardList;
  valor: string;
  cargando: boolean;
  etiquetaEstado: string;
  valorEstado: string;
  opcionesEstado: [string, string][];
  onChangeEstado: (valor: string) => void;
}

/** Tarjeta de indicador con su propio filtro de estado. */
function TarjetaReporte({
  titulo,
  icono: Icono,
  valor,
  cargando,
  etiquetaEstado,
  valorEstado,
  opcionesEstado,
  onChangeEstado,
}: TarjetaReporteProps) {
  const id = `estado-${titulo.replace(/[^a-z]+/gi, '-').toLowerCase()}`;

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60">
          <Icono aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </span>
        <span className="text-right text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {cargando ? (
            <Loader2 aria-hidden="true" className="inline h-5 w-5 animate-spin text-zinc-400" />
          ) : (
            valor
          )}
        </span>
      </div>

      <h2 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">{titulo}</h2>

      <div className="mt-3">
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {etiquetaEstado}
        </label>
        <select
          id={id}
          value={valorEstado}
          onChange={(event) => onChangeEstado(event.target.value)}
          disabled={cargando}
          className={CLASES_SELECT}
        >
          <option value="todos">Todos los estados</option>
          {opcionesEstado.map(([valorOpcion, etiqueta]) => (
            <option key={valorOpcion} value={valorOpcion}>
              {etiqueta}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
