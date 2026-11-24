'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import FormularioReserva from './FormularioReserva';

interface ModalReservaProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Título accesible del diálogo. */
  titulo?: string;
}

/**
 * Modal pop-up con el formulario de creación de reserva.
 * Se cierra con Escape, con la X o pulsando fuera del panel,
 * y bloquea el scroll del fondo mientras está abierto.
 */
export function ModalReserva({
  abierto,
  onCerrar,
  titulo = 'Reserva tu mesa',
}: ModalReservaProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    function manejarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar();
    }

    document.addEventListener('keydown', manejarTecla);
    const scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', manejarTecla);
      document.body.style.overflow = scrollPrevio;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/60 px-4 py-8 backdrop-blur-sm"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-reserva-titulo"
        tabIndex={-1}
        onClick={(evento) => evento.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl outline-none dark:bg-zinc-900"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="modal-reserva-titulo"
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {titulo}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Elige día, hora y número de personas; verificamos la disponibilidad
              de mesas al momento de reservar.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar modal de reserva"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <FormularioReserva />
      </div>
    </div>
  );
}

interface BotonNuevaReservaProps {
  children: ReactNode;
  className?: string;
  /** Icono opcional renderizado antes del texto. */
  icono?: ReactNode;
  /** Abre el modal al montar (p. ej. al llegar con ?nueva=1). */
  abrirInicial?: boolean;
}

/**
 * Botón autocontenido que abre el pop-up con el formulario de nueva
 * reserva. Reutilizado en el Home ("Reservar una mesa"); en Mis reservas
 * el modal lo controla VistaMisReservas para compartirlo con el historial.
 */
export default function BotonNuevaReserva({
  children,
  className,
  icono,
  abrirInicial = false,
}: BotonNuevaReservaProps) {
  const [abierto, setAbierto] = useState(abrirInicial);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={className}>
        {icono}
        {children}
      </button>
      <ModalReserva abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}
