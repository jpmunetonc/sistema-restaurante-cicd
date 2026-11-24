import type { EstadoReserva } from '@/lib/supabase/types';
import { horaAMinutos } from '@/lib/formato';

/** Personas que caben en una mesa (base del cálculo de mesas requeridas). */
export const CAPACIDAD_POR_MESA = 4;

/** Duración estándar de una reserva en minutos. */
export const DURACION_RESERVA_MINUTOS = 60;

/**
 * Cálculo de mesas requeridas (fórmula unificada frontend/backend/tests):
 * - 1-4 personas → 1 mesa
 * - 5-6 personas → 2 mesas
 * - 7-8 personas → 3 mesas
 * - 9-10 personas → 4 mesas
 * A partir de la 5ª persona se suma 1 mesa cada 2 personas.
 */
export function calcularMesasRequeridas(numPersonas: number): number {
  if (numPersonas <= CAPACIDAD_POR_MESA) return 1;
  return 1 + Math.ceil((numPersonas - CAPACIDAD_POR_MESA) / 2);
}

/** Transiciones permitidas en el ciclo de vida de una reserva. */
export const TRANSICIONES_RESERVA: Record<EstadoReserva, EstadoReserva[]> = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['completada', 'cancelada'],
  completada: [],
  cancelada: [],
};

export const ETIQUETAS_RESERVA: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
};

export const CLASES_RESERVA: Record<EstadoReserva, string> = {
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  confirmada: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
  completada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
};

/** Nombres de día indexados 1..7 (1 = lunes … 7 = domingo), según el esquema. */
export const NOMBRES_DIA: Record<number, string> = {
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
  7: 'domingo',
};

/** Día ISO de la semana de una fecha 'YYYY-MM-DD': 1 = lunes … 7 = domingo. */
export function diaSemanaISO(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return 0;
  const diaJS = new Date(anio, mes - 1, dia).getDay(); // 0 = domingo … 6 = sábado
  return diaJS === 0 ? 7 : diaJS;
}

/**
 * Comprueba si dos franjas horarias ('HH:MM') se solapan:
 * se solapan cuando el inicio de una es estrictamente menor que el fin
 * de la otra (las franjas contiguas, p. ej. 12:00–13:00 y 13:00–14:00,
 * NO se solapan).
 */
export function franjasSeSolapan(
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string
): boolean {
  return horaAMinutos(inicioA) < horaAMinutos(finB) && horaAMinutos(finA) > horaAMinutos(inicioB);
}
