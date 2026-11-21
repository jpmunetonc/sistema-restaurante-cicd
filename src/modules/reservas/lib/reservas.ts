import type { EstadoReserva } from '@/lib/supabase/types';

/** Personas que caben en una mesa (base del cálculo de mesas requeridas). */
export const CAPACIDAD_POR_MESA = 4;

/** Duración estándar de una reserva en minutos. */
export const DURACION_RESERVA_MINUTOS = 60;

/** Cálculo automático: Math.ceil(num_personas / 4). */
export function calcularMesasRequeridas(numPersonas: number): number {
  return Math.ceil(numPersonas / CAPACIDAD_POR_MESA);
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

/** Nombres de día usados como respaldo si horarios_restaurante no trae nombre_dia. */
export const NOMBRES_DIA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
