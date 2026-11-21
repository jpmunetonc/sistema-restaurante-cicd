/** Formateo compartido del sistema (moneda COP, fechas y horas). */

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Formata un valor como pesos colombianos: $ 12.000 */
export function formatearCOP(valor: number): string {
  return formatoCOP.format(Math.round(valor));
}

/** Convierte 'YYYY-MM-DD' en texto legible: "sáb, 21 nov 2026". */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Fecha de hoy en formato 'YYYY-MM-DD' (hora local). */
export function hoyISO(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Día de la semana de una fecha 'YYYY-MM-DD' (0 = domingo ... 6 = sábado). */
export function diaDeLaSemana(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return -1;
  return new Date(anio, mes - 1, dia).getDay();
}

/** '12:30' -> 750 (minutos desde medianoche). */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 750 -> '12:30' */
export function minutosAHora(minutos: number): string {
  const total = Math.max(0, Math.min(minutos, 24 * 60 - 1));
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** '12:30' -> "12:30 p. m." (formato local). */
export function formatearHora(hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  return new Date(2000, 0, 1, h || 0, m || 0).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
