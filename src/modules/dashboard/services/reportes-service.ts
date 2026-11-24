import { createClient } from '@/lib/supabase/client';
import { mensajeErrorSupabase } from '@/lib/errores';
import type { EstadoPedido, EstadoReserva } from '@/lib/supabase/types';

/** Rangos de fecha disponibles en los reportes del panel administrativo. */
export type RangoFechas = 'hoy' | 'ultimos_7_dias' | 'este_mes' | 'fecha_exacta';

export interface FiltroRango {
  rango: RangoFechas;
  /** 'YYYY-MM-DD'; solo se usa cuando rango === 'fecha_exacta'. */
  fechaExacta: string;
}

export interface ReportePedidos {
  cantidad: number;
  totalVendido: number;
}

export interface ReporteReservas {
  cantidad: number;
}

export interface ReportesDashboard {
  pedidos: ReportePedidos;
  reservas: ReporteReservas;
}

/** Etiqueta legible de cada rango de fecha. */
export const ETIQUETAS_RANGO: Record<RangoFechas, string> = {
  hoy: 'Hoy',
  ultimos_7_dias: 'Últimos 7 días',
  este_mes: 'Este mes',
  fecha_exacta: 'Fecha exacta',
};

function inicioDelDia(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function finDelDia(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(23, 59, 59, 999);
  return copia;
}

/**
 * Convierte el filtro en un rango [inicio, fin] en fecha/hora local.
 * Devuelve null si 'fecha_exacta' viene vacía o mal formada (sin filtro).
 */
export function resolverRango(filtro: FiltroRango): { inicio: Date; fin: Date } | null {
  const hoy = new Date();

  switch (filtro.rango) {
    case 'hoy':
      return { inicio: inicioDelDia(hoy), fin: finDelDia(hoy) };

    case 'ultimos_7_dias': {
      // Incluye hoy: 7 días naturales contando desde el inicio de hoy.
      const inicio = inicioDelDia(hoy);
      inicio.setDate(inicio.getDate() - 6);
      return { inicio, fin: finDelDia(hoy) };
    }

    case 'este_mes':
      return { inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1), fin: finDelDia(hoy) };

    case 'fecha_exacta': {
      const [anio, mes, dia] = (filtro.fechaExacta ?? '').split('-').map(Number);
      if (!anio || !mes || !dia) return null;
      const inicio = new Date(anio, mes - 1, dia);
      if (Number.isNaN(inicio.getTime())) return null;
      return { inicio, fin: finDelDia(inicio) };
    }

    default:
      return null;
  }
}

/** 'YYYY-MM-DD' en hora local (para comparar contra la columna fecha de reservas). */
function aFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Reporte de pedidos del rango seleccionado: cantidad de pedidos realizados
 * y total vendido en COP (suma del campo `total`).
 */
export async function obtenerReportePedidos(
  filtro: FiltroRango,
  estado: EstadoPedido | 'todos'
): Promise<ReportePedidos> {
  const supabase = createClient();
  const rango = resolverRango(filtro);

  let query = supabase.from('pedidos').select('total, estado, fecha_hora_pedido');

  if (rango) {
    query = query
      .gte('fecha_hora_pedido', rango.inicio.toISOString())
      .lte('fecha_hora_pedido', rango.fin.toISOString());
  }

  if (estado !== 'todos') {
    query = query.eq('estado', estado);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudieron cargar los pedidos.'));
  }

  const filas = (data ?? []) as { total: number | string | null }[];

  return {
    cantidad: filas.length,
    totalVendido: filas.reduce((suma, fila) => suma + Number(fila.total ?? 0), 0),
  };
}

/** Reporte de reservas programadas del rango seleccionado. */
export async function obtenerReporteReservas(
  filtro: FiltroRango,
  estado: EstadoReserva | 'todos'
): Promise<ReporteReservas> {
  const supabase = createClient();
  const rango = resolverRango(filtro);

  let query = supabase.from('reservas').select('id, estado, fecha');

  if (rango) {
    query = query.gte('fecha', aFechaISO(rango.inicio)).lte('fecha', aFechaISO(rango.fin));
  }

  if (estado !== 'todos') {
    query = query.eq('estado', estado);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudieron cargar las reservas.'));
  }

  return { cantidad: (data ?? []).length };
}

/** Consulta las tres cifras del dashboard en paralelo (Supabase). */
export async function obtenerReportesDashboard(
  filtro: FiltroRango,
  estadoPedidos: EstadoPedido | 'todos',
  estadoReservas: EstadoReserva | 'todos'
): Promise<ReportesDashboard> {
  const [pedidos, reservas] = await Promise.all([
    obtenerReportePedidos(filtro, estadoPedidos),
    obtenerReporteReservas(filtro, estadoReservas),
  ]);

  return { pedidos, reservas };
}
