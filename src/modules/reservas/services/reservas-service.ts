import { createClient } from '@/lib/supabase/client';
import { mensajeErrorSupabase } from '@/lib/errores';
import { formatearFecha, formatearHora, horaAMinutos, hoyISO, minutosAHora } from '@/lib/formato';
import { crearNotificacion } from '@/modules/notificaciones/services/notificaciones-service';
import {
  calcularMesasRequeridas,
  diaSemanaISO,
  DURACION_RESERVA_MINUTOS,
  franjasSeSolapan,
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
  /** Ids de las mesas activas libres en esa franja (para asignarlas). */
  mesasLibres: number[];
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

/** 'HH:mm' (o 'HH:mm:ss') -> 'HH:mm:ss', el formato de las columnas `time`. */
function normalizarHora(hora: string): string {
  const [horas = '00', minutos = '00', segundos = '00'] = hora.trim().split(':');
  return `${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}:${segundos
    .slice(0, 2)
    .padStart(2, '0')}`;
}

/**
 * Garantiza que exista la fila en `perfiles` antes de insertar en `reservas`:
 * la llave foránea `reservas.cliente_id -> perfiles.id` falla si el trigger
 * de registro no creó el perfil. Si ya existe, no se toca.
 */
async function asegurarPerfil(
  supabase: ReturnType<typeof createClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<void> {
  const { data: perfil, error: errorConsulta } = await supabase
    .from('perfiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (errorConsulta) {
    throw new Error(
      errorConsulta.message ||
        mensajeErrorSupabase(errorConsulta, 'No se pudo verificar tu perfil.')
    );
  }

  if (perfil) return;

  const nombre =
    (typeof user.user_metadata?.nombre === 'string' && user.user_metadata.nombre.trim()) ||
    user.email?.split('@')[0] ||
    'Cliente';
  const telefono =
    typeof user.user_metadata?.telefono === 'string' ? user.user_metadata.telefono : null;

  const { error: errorPerfil } = await supabase.from('perfiles').insert({
    id: user.id,
    nombre,
    email: user.email ?? '',
    telefono,
    rol: 'cliente',
  });

  // Otra petición pudo crear el perfil entre la consulta y el insert.
  if (errorPerfil && !/duplicate key|unique constraint/i.test(errorPerfil.message)) {
    throw new Error(
      errorPerfil.message ||
        mensajeErrorSupabase(errorPerfil, 'No se pudo crear tu perfil para la reserva.')
    );
  }
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
 * `horarios_restaurante` (dia_semana ISO: 1 = lunes … 7 = domingo).
 * Busca primero por nombre_dia y usa dia_semana como respaldo.
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

  const dia = diaSemanaISO(fecha);
  if (dia < 1 || dia > 7) {
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
 * consulta las mesas activas y descarta las que ya están asignadas
 * (tabla `reserva_mesas`) a reservas pendientes/confirmadas que se
 * solapan con la franja solicitada.
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

  const idsMesasActivas = (mesas ?? []).map((mesa) => mesa.id as number);

  if (idsMesasActivas.length === 0) {
    return {
      disponible: false,
      mensaje: 'No hay mesas habilitadas para reservar en este momento.',
      mesasDisponibles: 0,
      mesasLibres: [],
    };
  }

  const horaFin = minutosAHora(horaAMinutos(horaInicio) + DURACION_RESERVA_MINUTOS);

  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('id, hora_inicio, hora_fin')
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmada']);

  if (error) {
    throw new Error(
      mensajeErrorSupabase(error, 'No se pudo consultar la disponibilidad de mesas.')
    );
  }

  const reservasSolapadas = (reservas ?? []).filter((reserva) =>
    franjasSeSolapan(horaInicio, horaFin, reserva.hora_inicio, reserva.hora_fin)
  );

  // Mesas ya asignadas a reservas que se solapan con la franja.
  const mesasOcupadas = new Set<number>();
  if (reservasSolapadas.length > 0) {
    const { data: asignaciones, error: errorAsignaciones } = await supabase
      .from('reserva_mesas')
      .select('mesa_id')
      .in(
        'reserva_id',
        reservasSolapadas.map((reserva) => reserva.id)
      );

    if (errorAsignaciones) {
      throw new Error(
        mensajeErrorSupabase(
          errorAsignaciones,
          'No se pudo consultar la disponibilidad de mesas.'
        )
      );
    }

    for (const asignacion of asignaciones ?? []) {
      mesasOcupadas.add(asignacion.mesa_id as number);
    }
  }

  const mesasLibres = idsMesasActivas.filter((id) => !mesasOcupadas.has(id));
  const disponibles = mesasLibres.length;

  if (mesasRequeridas > disponibles) {
    return {
      disponible: false,
      mesasDisponibles: disponibles,
      mesasLibres,
      mensaje:
        disponibles <= 0
          ? 'No hay mesas disponibles para esa fecha y horario. Prueba con otro horario.'
          : `Solo quedan ${disponibles} mesa(s) disponibles para esa fecha y horario.`,
    };
  }

  return { disponible: true, mesasDisponibles: disponibles, mesasLibres };
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

  // La reserva referencia `perfiles(id)`: se crea el perfil si el trigger
  // de registro no llegó a hacerlo (p. ej. usuarios creados por invitación).
  await asegurarPerfil(supabase, user);

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

  // Mesas concretas que se asignan a esta reserva (las primeras libres).
  const mesasAsignadas = disponibilidad.mesasLibres.slice(0, mesasRequeridas);

  const { data, error } = await supabase
    .from('reservas')
    .insert({
      cliente_id: user.id,
      fecha: datos.fecha,
      hora_inicio: normalizarHora(datos.horaInicio),
      hora_fin: normalizarHora(minutosAHora(fin)),
      num_personas: numPersonas,
      mesas_requeridas: mesasRequeridas,
      motivo: datos.motivo?.trim() || null,
      estado: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    // Se propaga el mensaje real de Postgres para poder diagnosticar
    // (FK de perfil, RLS, formato de hora, etc.).
    throw new Error(error.message || 'No se pudo registrar la reserva.');
  }

  // Asignación en la tabla intermedia `reserva_mesas`. Si falla, se revierte
  // la reserva para no dejarla sin mesas asignadas (compensación).
  const { error: errorMesas } = await supabase.from('reserva_mesas').insert(
    mesasAsignadas.map((mesaId) => ({
      reserva_id: data.id,
      mesa_id: mesaId,
    }))
  );

  if (errorMesas) {
    await supabase.from('reservas').delete().eq('id', data.id);
    throw new Error(
      mensajeErrorSupabase(
        errorMesas,
        'No se pudieron asignar las mesas de la reserva. La reserva no fue creada.'
      )
    );
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
