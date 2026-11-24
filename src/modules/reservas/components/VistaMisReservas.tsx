'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { ModalReserva } from './ModalReserva';
import HistorialReservas from './HistorialReservas';

interface VistaMisReservasProps {
  /** true al llegar con ?nueva=1 (desde /reservas): abre el pop-up. */
  abrirModalInicial?: boolean;
}

/**
 * Vista completa de "Mis reservas": cabecera con el botón "Nueva
 * reserva", historial del cliente y el pop-up con el formulario.
 * El botón vacío del historial ("Hacer una reserva") abre el mismo modal.
 */
export default function VistaMisReservas({ abrirModalInicial = false }: VistaMisReservasProps) {
  const [modalAbierto, setModalAbierto] = useState(abrirModalInicial);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            <CalendarDays aria-hidden="true" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Mis reservas
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Historial de tus reservas y su estado de confirmación.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Nueva reserva
        </button>
      </header>

      <HistorialReservas onNuevaReserva={() => setModalAbierto(true)} />

      <ModalReserva abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </>
  );
}
