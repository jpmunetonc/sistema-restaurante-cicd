'use client';

import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  actualizarEstadoReserva,
  obtenerTodasLasReservas,
  type ReservaConCliente,
} from '../services/reservas-service';
import { CLASES_RESERVA, ETIQUETAS_RESERVA, TRANSICIONES_RESERVA } from '../lib/reservas';
import { formatearFecha, formatearHora } from '@/lib/formato';
import type { EstadoReserva } from '@/lib/supabase/types';

const FILTROS: { valor: 'todos' | EstadoReserva; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todas' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'confirmada', etiqueta: 'Confirmadas' },
  { valor: 'completada', etiqueta: 'Completadas' },
  { valor: 'cancelada', etiqueta: 'Canceladas' },
];

export default function GestionReservasAdmin() {
  const [reservas, setReservas] = useState<ReservaConCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | EstadoReserva>('todos');
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  // Cambiar esta versión desde un evento fuerza la recarga del listado.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerTodasLasReservas();
        if (activo) {
          setReservas(datos);
          setError(null);
        }
      } catch (err) {
        if (activo) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las reservas.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();
    return () => {
      activo = false;
    };
  }, [version]);

  /** Recarga manual mostrando el indicador de carga (desde un evento). */
  function recargar() {
    setCargando(true);
    setError(null);
    setVersion((actual) => actual + 1);
  }

  async function manejarEstado(reserva: ReservaConCliente, estado: EstadoReserva) {
    setOcupadoId(reserva.id);
    setError(null);
    setMensaje(null);

    try {
      await actualizarEstadoReserva(reserva.id, estado);
      setReservas((actuales) =>
        actuales.map((item) => (item.id === reserva.id ? { ...item, estado } : item))
      );
      setMensaje(`Reserva de ${reserva.nombre_cliente ?? 'cliente'} → ${ETIQUETAS_RESERVA[estado].toLowerCase()}.`);
      window.setTimeout(() => setMensaje((actual) => (actual === null ? null : actual)), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la reserva.');
    } finally {
      setOcupadoId(null);
    }
  }

  const visibles =
    filtro === 'todos' ? reservas : reservas.filter((reserva) => reserva.estado === filtro);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reservas</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {reservas.length} reserva(s) registradas.
          </p>
        </div>

        <button
          type="button"
          onClick={recargar}
          className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => setFiltro(opcion.valor)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filtro === opcion.valor
                ? 'bg-amber-600 text-white'
                : 'border border-zinc-300 bg-white text-zinc-600 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {mensaje && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {mensaje}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-500">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          Cargando reservas…
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-14 text-center text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay reservas con este estado.
        </div>
      ) : (
        <ul className="space-y-4">
          {visibles.map((reserva) => {
            const transiciones = TRANSICIONES_RESERVA[reserva.estado] ?? [];
            return (
              <li
                key={reserva.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      <User aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      {reserva.nombre_cliente ?? 'Cliente sin nombre'}
                    </p>
                    {reserva.email_cliente && (
                      <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <Mail aria-hidden="true" className="h-4 w-4" />
                        {reserva.email_cliente}
                      </p>
                    )}
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays aria-hidden="true" className="h-4 w-4" />
                        {formatearFecha(reserva.fecha)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock aria-hidden="true" className="h-4 w-4" />
                        {formatearHora(reserva.hora_inicio)} – {formatearHora(reserva.hora_fin)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users aria-hidden="true" className="h-4 w-4" />
                        {reserva.num_personas} persona(s) · {reserva.mesas_requeridas} mesa(s)
                      </span>
                    </p>
                    {reserva.motivo && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Motivo: {reserva.motivo}
                      </p>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${CLASES_RESERVA[reserva.estado]}`}
                  >
                    {ETIQUETAS_RESERVA[reserva.estado]}
                  </span>
                </div>

                {transiciones.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    {transiciones.map((estado) => (
                      <button
                        key={estado}
                        type="button"
                        disabled={ocupadoId === reserva.id}
                        onClick={() => void manejarEstado(reserva, estado)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                          estado === 'cancelada'
                            ? 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40'
                            : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {ocupadoId === reserva.id ? (
                          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                        ) : estado === 'cancelada' ? (
                          <X aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {ETIQUETAS_RESERVA[estado]}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
