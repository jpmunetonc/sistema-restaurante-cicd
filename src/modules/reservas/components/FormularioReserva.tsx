'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  Users,
} from 'lucide-react';
import {
  crearReserva,
  obtenerHorarios,
  validarHorarioDelDia,
} from '../services/reservas-service';
import { calcularMesasRequeridas, DURACION_RESERVA_MINUTOS } from '../lib/reservas';
import { formatearFecha, formatearHora, hoyISO, horaAMinutos, minutosAHora } from '@/lib/formato';

const CLASES_INPUT =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500';

const CLASES_ETIQUETA = 'mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300';

/** Franjas disponibles cada DURACION_RESERVA_MINUTOS dentro del horario del día. */
function generarFranjas(apertura: string, cierre: string): string[] {
  const inicio = horaAMinutos(apertura);
  const fin = horaAMinutos(cierre);
  const franjas: string[] = [];

  for (let minuto = inicio; minuto + DURACION_RESERVA_MINUTOS <= fin; minuto += 60) {
    franjas.push(minutosAHora(minuto));
  }

  return franjas;
}

export default function FormularioReserva() {
  const [horarios, setHorarios] = useState<Awaited<ReturnType<typeof obtenerHorarios>>>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(true);
  const [fecha, setFecha] = useState(hoyISO());
  const [horaInicio, setHoraInicio] = useState('');
  const [numPersonas, setNumPersonas] = useState(2);
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const datos = await obtenerHorarios();
        if (activo) setHorarios(datos);
      } catch (err) {
        if (activo) {
          setError(err instanceof Error ? err.message : 'No se pudo consultar el horario.');
        }
      } finally {
        if (activo) setCargandoHorarios(false);
      }
    }

    void cargar();
    return () => {
      activo = false;
    };
  }, []);

  const resultadoHorario = useMemo(
    () => validarHorarioDelDia(horarios, fecha),
    [horarios, fecha]
  );

  const franjas = useMemo(() => {
    if (!resultadoHorario.abierto || !resultadoHorario.apertura || !resultadoHorario.cierre) {
      return [];
    }
    return generarFranjas(resultadoHorario.apertura, resultadoHorario.cierre);
  }, [resultadoHorario]);

  // Hora efectiva derivada: si la seleccionada ya no existe para el nuevo
  // día u horario, se usa la primera franja disponible (sin efectos).
  const horaEfectiva = franjas.length === 0
    ? ''
    : franjas.includes(horaInicio)
      ? horaInicio
      : franjas[0];

  const mesasRequeridas = useMemo(
    () => calcularMesasRequeridas(Number(numPersonas) || 0),
    [numPersonas]
  );

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExito(null);

    if (!resultadoHorario.abierto) {
      setError(resultadoHorario.mensaje ?? 'El restaurante no está abierto ese día.');
      return;
    }
    if (!horaEfectiva) {
      setError('Selecciona una hora de inicio.');
      return;
    }
    if (!Number.isInteger(Number(numPersonas)) || Number(numPersonas) < 1) {
      setError('Indica el número de personas (mínimo 1).');
      return;
    }

    setCargando(true);

    try {
      const reserva = await crearReserva({
        fecha,
        horaInicio: horaEfectiva,
        numPersonas: Number(numPersonas),
        motivo: motivo.trim() || null,
      });

      setExito(
        `Reserva registrada para el ${formatearFecha(reserva.fecha)} a las ${formatearHora(reserva.hora_inicio)} (${reserva.num_personas} persona(s), ${reserva.mesas_requeridas} mesa(s)). Te confirmaremos pronto.`
      );
      setMotivo('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la reserva.');
    } finally {
      setCargando(false);
    }
  }

  if (cargandoHorarios) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-500">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        Cargando horarios…
      </div>
    );
  }

  if (exito) {
    return (
      <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {exito}
        </p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/mis-reservas"
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Ver mis reservas
          </Link>
          <button
            type="button"
            onClick={() => setExito(null)}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Hacer otra reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={manejarEnvio}
      noValidate
      className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
        {resultadoHorario.abierto ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Clock aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            Abierto los <strong className="capitalize">{resultadoHorario.nombreDia}</strong> de{' '}
            <strong>{formatearHora(resultadoHorario.apertura!)}</strong> a{' '}
            <strong>{formatearHora(resultadoHorario.cierre!)}</strong> · duración de la reserva:{' '}
            {DURACION_RESERVA_MINUTOS} minutos.
          </span>
        ) : (
          <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-red-500" />
            {resultadoHorario.mensaje}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reserva-fecha" className={CLASES_ETIQUETA}>
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            Fecha
          </label>
          <input
            id="reserva-fecha"
            type="date"
            required
            min={hoyISO()}
            disabled={cargando}
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className={CLASES_INPUT}
          />
        </div>

        <div>
          <label htmlFor="reserva-hora" className={CLASES_ETIQUETA}>
            <Clock aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            Hora de inicio
          </label>
          <select
            id="reserva-hora"
            required
            disabled={cargando || franjas.length === 0}
            value={horaEfectiva}
            onChange={(event) => setHoraInicio(event.target.value)}
            className={CLASES_INPUT}
          >
            {franjas.length === 0 ? (
              <option value="">Sin franjas disponibles</option>
            ) : (
              franjas.map((franja) => (
                <option key={franja} value={franja}>
                  {formatearHora(franja)}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="reserva-personas" className={CLASES_ETIQUETA}>
            <Users aria-hidden="true" className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            Número de personas
          </label>
          <input
            id="reserva-personas"
            type="number"
            min={1}
            max={40}
            required
            disabled={cargando}
            value={numPersonas}
            onChange={(event) => setNumPersonas(Number(event.target.value))}
            className={CLASES_INPUT}
          />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Se requieren <strong>{mesasRequeridas} mesa(s)</strong> (4 personas por mesa).
          </p>
        </div>

        <div>
          <label htmlFor="reserva-motivo" className={CLASES_ETIQUETA}>
            Motivo (opcional)
          </label>
          <input
            id="reserva-motivo"
            type="text"
            disabled={cargando}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Cumpleaños, cita, etc."
            maxLength={120}
            className={CLASES_INPUT}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={cargando || !resultadoHorario.abierto}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-900"
      >
        {cargando ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="h-4 w-4" />
        )}
        {cargando ? 'Reservando…' : 'Reservar mesa'}
      </button>
    </form>
  );
}
