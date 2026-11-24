'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Loader2, MapPin, Users } from 'lucide-react';
import { obtenerMisReservas } from '../services/reservas-service';
import { CLASES_RESERVA, ETIQUETAS_RESERVA } from '../lib/reservas';
import { formatearFecha, formatearHora } from '@/lib/formato';
import type { Reserva } from '@/lib/supabase/types';

export default function HistorialReservas({
  onNuevaReserva,
}: {
  /** Abre el pop-up de nueva reserva (compartido con la cabecera). */
  onNuevaReserva: () => void;
}) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerMisReservas();
        if (activo) setReservas(datos);
      } catch (err) {
        if (activo) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar tus reservas.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();
    return () => {
      activo = false;
    };
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-500">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        Cargando tus reservas…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {error}
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <CalendarDays aria-hidden="true" className="h-9 w-9 text-zinc-400" />
        <div>
          <p className="font-medium text-zinc-700 dark:text-zinc-200">
            Todavía no tienes reservas.
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Elige el día y la hora que mejor te queden.
          </p>
        </div>
        <button
          type="button"
          onClick={onNuevaReserva}
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Hacer una reserva
        </button>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {reservas.map((reserva) => (
        <li
          key={reserva.id}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                {formatearFecha(reserva.fecha)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Clock aria-hidden="true" className="h-4 w-4" />
                  {formatearHora(reserva.hora_inicio)} – {formatearHora(reserva.hora_fin)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users aria-hidden="true" className="h-4 w-4" />
                  {reserva.num_personas} persona(s)
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="h-4 w-4" />
                  {reserva.mesas_requeridas} mesa(s)
                </span>
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${CLASES_RESERVA[reserva.estado]}`}
            >
              {ETIQUETAS_RESERVA[reserva.estado]}
            </span>
          </div>

          {reserva.motivo && (
            <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Motivo: {reserva.motivo}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
