import { createClient } from '@/lib/supabase/client';
import { mensajeErrorSupabase } from '@/lib/errores';
import { formatearFecha, formatearHora, horaAMinutos, hoyISO, diaDeLaSemana, minutosAHora } from '@/lib/formato';
import { crearNotificacion } from '@/modules/notificaciones/services/notificaciones-service';
import {
  calcularMesasRequeridas,
  DURACION_RESERVA_MINUTOS,
  NOMBRES_DIA,
  TRANSICIONES_RESERVA,
} from '../lib/reservas';
import type { EstadoReserva, HorarioRestaurante, Reserva } from '@/lib/supabase/types';

export interface DatosReserva {
  fecha: string;
  horaInicio: string;
  numPersonas: number;
  motivo: string | null;
}

export interface ResultadoHorario {
  abierto: boolean;
  mensaje?: string;
  apertura?: string;
  cierre?: string;
  nombreDia?: string;
}

export interface ResultadoDisponibilidad {
  disponible: boolean;
  mensaje?: string;
  mesasDisponibles: number;
}

export interface ReservaConCliente extends Reserva {
  nombre_cliente: string | null;
  email_cliente: string | null;
}

function normalizarDia(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Carga los horarios del restaurante ordenados por día. */
export async function obtenerHorarios(): Promise<HorarioRestaurante[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('horarios_restaurante')
    .select('*')
    .order('dia_semana', { ascending: true });

  if (error) {
    throw new Error(
      mensajeErrorSupabase(error, 'No se pudo consultar el horario del restaurante.')
    );
  }

  return (data ?? []) as HorarioRestaurante[];
}

/**
 * Valida que la fecha sea futura y que el día esté abierto en
 * horarios_restaurante. Compara primero por nombre_dia (para soportar
 * convenciones 0-6 y 1-7) y usa dia_semana como respaldo.
 */
export function validarHorarioDelDia(
  horarios: HorarioRestaurante[],
  fecha: string
): ResultadoHorario {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { abierto: false, mensaje: 'Selecciona una fecha válida.' };
  }

  if (fecha < hoyISO()) {
    return { abierto: false, mensaje: 'La reserva no puede ser en el pasado.' };
  }

  const dia = diaDeLaSemana(fecha);
  if (dia < 0) {
    return { abierto: false, mensaje: 'Selecciona una fecha válida.' };
  }

  const nombreDia = NOMBRES_DIA[dia];

  const horario =
    horarios.find(
      (h) => h.nombre_dia && normalizarDia(h.nombre_dia) === normalizarDia(nombreDia)
    ) ?? horarios.find((h) => h.dia_semana === dia);

  if (!horario || !horario.abierto) {
    return {
      abierto: false,
      mensaje: `El restaurante no está abierto los ${nombreDia}.`,
      nombreDia,
    };
  }

  return {
    abierto: true,
    apertura: horario.hora_apertura,
    cierre: horario.hora_cierre,
    nombreDia: horario.nombre_dia || nombreDia,
  };
}

/**
 * Comprueba la disponibilidad de mesas para una fecha y franja horaria:
 * suma las mesas requeridas por las reservas activas que se solapan y las
 * compara con la cantidad de mesas activas del restaurante.
 */
export async function verificarDisponibilidadMesas(
  fecha: string,
  horaInicio: string,
  mesasRequeridas: number
): Promise<ResultadoDisponibilidad> {
  const supabase = createClient();

  const { data: mesas, error: errorMesas } = await supabase
    .from('mesas')
    .select('id')
    .eq('activa', true);

  if (errorMesas) {
    throw new Error(
      mensajeErrorSupabase(errorMesas, 'No se pudo consultar la disponibilidad de mesas.')
    );
  }

  const totalMesas = (mesas ?? []).length;

  if (totalMesas === 0) {
    return {
      disponible: false,
      mensaje: 'No hay mesas habilitadas para reservar en este momento.',
      mesasDisponibles: 0,
    };
  }

  const horaFin = minutosAHora(horaAMinutos(horaInicio) + DURACION_RESERVA_MINUTOS);

  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('hora_inicio, hora_fin, mesas_requeridas')
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmada']);

  if (error) {
    throw new Error(
      mensajeErrorSupabase(error, 'No se pudo consultar la disponibilidad de mesas.')
    );
  }

  const inicioNueva = horaAMinutos(horaInicio);
  const finNueva = horaAMinutos(horaFin);

  const mesasOcupadas = (reservas ?? [])
    .filter(
      (reserva) =>
        horaAMinutos(reserva.hora_inicio) < finNueva &&
        horaAMinutos(reserva.hora_fin) > inicioNueva
    )
    .reduce((total, reserva) => total + (reserva.mesas_requeridas ?? 0), 0);

  const disponibles = totalMesas - mesasOcupadas;

  if (mesasRequeridas > disponibles) {
    return {
      disponible: false,
      mesasDisponibles: disponibles,
      mensaje:
        disponibles <= 0
          ? 'No hay mesas disponibles para esa fecha y horario. Prueba con otro horario.'
          : `Solo quedan ${disponibles} mesa(s) disponibles para esa fecha y horario.`,
    };
  }

  return { disponible: true, mesasDisponibles: disponibles };
}

/**
 * Valida horario y disponibilidad, calcula mesas_requeridas y registra
 * la reserva del usuario autenticado.
 */
export async function crearReserva(datos: DatosReserva): Promise<Reserva> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para hacer una reserva.');
  }

  const numPersonas = Number(datos.numPersonas);

  if (!Number.isInteger(numPersonas) || numPersonas < 1) {
    throw new Error('Indica el número de personas (mínimo 1).');
  }

  if (numPersonas > 40) {
    throw new Error(
      'Para grupos de más de 40 personas contáctanos directamente por teléfono.'
    );
  }

  const horarios = await obtenerHorarios();
  const resultadoHorario = validarHorarioDelDia(horarios, datos.fecha);

  if (!resultadoHorario.abierto || !resultadoHorario.apertura || !resultadoHorario.cierre) {
    throw new Error(resultadoHorario.mensaje ?? 'El restaurante no está abierto ese día.');
  }

  const inicio = horaAMinutos(datos.horaInicio);
  const fin = inicio + DURACION_RESERVA_MINUTOS;
  const apertura = horaAMinutos(resultadoHorario.apertura);
  const cierre = horaAMinutos(resultadoHorario.cierre);

  if (Number.isNaN(inicio)) {
    throw new Error('Selecciona una hora de inicio válida.');
  }

  if (inicio < apertura || fin > cierre) {
    throw new Error(
      `Las reservas van de ${formatearHora(resultadoHorario.apertura)} a ${formatearHora(resultadoHorario.cierre)} y duran una hora.`
    );
  }

  const mesasRequeridas = calcularMesasRequeridas(numPersonas);

  const disponibilidad = await verificarDisponibilidadMesas(
    datos.fecha,
    datos.horaInicio,
    mesasRequeridas
  );

  if (!disponibilidad.disponible) {
    throw new Error(disponibilidad.mensaje ?? 'No hay mesas disponibles para esa franja.');
  }

  const { data, error } = await supabase
    .from('reservas')
    .insert({
      cliente_id: user.id,
      fecha: datos.fecha,
      hora_inicio: datos.horaInicio,
      hora_fin: minutosAHora(fin),
      num_personas: numPersonas,
      mesas_requeridas: mesasRequeridas,
      motivo: datos.motivo?.trim() || null,
      estado: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo registrar la reserva.'));
  }

  await crearNotificacion({
    para_admin: true,
    tipo: 'reserva',
    titulo: 'Nueva reserva',
    mensaje: `Reserva para ${numPersonas} persona(s) el ${formatearFecha(datos.fecha)} a las ${formatearHora(datos.horaInicio)}.`,
    referencia_id: data.id,
  });

  return data as Reserva;
}

/** Reservas del usuario autenticado, más recientes primero. */
export async function obtenerMisReservas(): Promise<Reserva[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('cliente_id', user.id)
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false });

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudieron cargar tus reservas.'));
  }

  return (data ?? []) as Reserva[];
}

/** Todas las reservas con datos del cliente (panel administrativo). */
export async function obtenerTodasLasReservas(): Promise<ReservaConCliente[]> {
  const supabase = createClient();

  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('*')
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false });

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudieron cargar las reservas.'));
  }

  const lista = (reservas ?? []) as Reserva[];
  if (lista.length === 0) return [];

  const ids = [...new Set(lista.map((reserva) => reserva.cliente_id))];

  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre, email')
    .in('id', ids);

  const porId = new Map(
    ((perfiles ?? []) as { id: string; nombre: string; email: string }[]).map((perfil) => [
      perfil.id,
      perfil,
    ])
  );

  return lista.map((reserva) => {
    const perfil = porId.get(reserva.cliente_id);
    return {
      ...reserva,
      nombre_cliente: perfil?.nombre ?? null,
      email_cliente: perfil?.email ?? null,
    };
  });
}

/** Cambia el estado de una reserva validando la transición permitida. */
export async function actualizarEstadoReserva(
  id: string,
  nuevoEstado: EstadoReserva
): Promise<void> {
  const supabase = createClient();

  const { data: reserva, error: errorLectura } = await supabase
    .from('reservas')
    .select('estado, cliente_id')
    .eq('id', id)
    .maybeSingle();

  if (errorLectura) {
    throw new Error(mensajeErrorSupabase(errorLectura, 'No se pudo leer la reserva.'));
  }

  if (!reserva) {
    throw new Error('La reserva no existe.');
  }

  const estadoActual = reserva.estado as EstadoReserva;
  const permitidas = TRANSICIONES_RESERVA[estadoActual] ?? [];

  if (!permitidas.includes(nuevoEstado)) {
    throw new Error('Esa transición de estado no está permitida para esta reserva.');
  }

  const { error } = await supabase
    .from('reservas')
    .update({ estado: nuevoEstado })
    .eq('id', id);

  if (error) {
    throw new Error(mensajeErrorSupabase(error, 'No se pudo actualizar la reserva.'));
  }

  await crearNotificacion({
    usuario_id: reserva.cliente_id,
    para_admin: false,
    tipo: 'reserva',
    titulo: 'Actualización de tu reserva',
    mensaje: `Tu reserva fue ${nuevoEstado === 'confirmada' ? 'confirmada' : nuevoEstado === 'cancelada' ? 'cancelada' : 'completada'}.`,
    referencia_id: id,
  });
}
