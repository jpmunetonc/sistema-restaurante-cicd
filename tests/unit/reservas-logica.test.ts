import { describe, expect, it } from 'vitest';
import {
  calcularMesasRequeridas,
  diaSemanaISO,
  DURACION_RESERVA_MINUTOS,
  franjasSeSolapan,
  NOMBRES_DIA,
} from '@/modules/reservas/lib/reservas';
import { validarHorarioDelDia } from '@/modules/reservas/services/reservas-service';
import type { HorarioRestaurante } from '@/lib/supabase/types';

/** Horarios de prueba con la convención ISO del esquema: 1 = lunes … 7 = domingo. */
const horarios: HorarioRestaurante[] = [
  { dia_semana: 1, nombre_dia: 'lunes', hora_apertura: '12:00', hora_cierre: '22:00', abierto: true },
  { dia_semana: 2, nombre_dia: 'martes', hora_apertura: '12:00', hora_cierre: '22:00', abierto: true },
  {
    dia_semana: 3,
    nombre_dia: 'miércoles',
    hora_apertura: '12:00',
    hora_cierre: '22:00',
    abierto: true,
  },
  { dia_semana: 4, nombre_dia: 'jueves', hora_apertura: '12:00', hora_cierre: '22:00', abierto: true },
  { dia_semana: 5, nombre_dia: 'viernes', hora_apertura: '12:00', hora_cierre: '23:00', abierto: true },
  { dia_semana: 6, nombre_dia: 'sábado', hora_apertura: '12:00', hora_cierre: '23:00', abierto: true },
  { dia_semana: 7, nombre_dia: 'domingo', hora_apertura: '12:00', hora_cierre: '16:00', abierto: false },
];

/** Fecha local 'YYYY-MM-DD' desplazada N días desde hoy (siempre futura). */
function fechaEnDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Primera fecha futura (1..14 días) que cae en el día ISO indicado (1..7). */
function proximoDiaISO(diaISO: number): string {
  for (let dias = 1; dias <= 14; dias++) {
    const fecha = fechaEnDias(dias);
    if (diaSemanaISO(fecha) === diaISO) return fecha;
  }
  throw new Error(`No se encontró una fecha futura para el día ISO ${diaISO}.`);
}

describe('Cálculo de mesas requeridas', () => {
  it('usa 1 mesa hasta 4 personas y suma una mesa por cada 2 personas extra', () => {
    expect(calcularMesasRequeridas(1)).toBe(1);
    expect(calcularMesasRequeridas(2)).toBe(1);
    expect(calcularMesasRequeridas(4)).toBe(1);
    expect(calcularMesasRequeridas(5)).toBe(2);
    expect(calcularMesasRequeridas(6)).toBe(2);
    expect(calcularMesasRequeridas(7)).toBe(3);
    expect(calcularMesasRequeridas(8)).toBe(3);
    expect(calcularMesasRequeridas(9)).toBe(4);
    expect(calcularMesasRequeridas(10)).toBe(4);
    expect(calcularMesasRequeridas(40)).toBe(19);
  });
});

describe('Mapeo ISO de dia_semana (1..7)', () => {
  it('mapea lunes=1 … domingo=7', () => {
    expect(diaSemanaISO('2026-11-16')).toBe(1); // lunes
    expect(diaSemanaISO('2026-11-17')).toBe(2); // martes
    expect(diaSemanaISO('2026-11-21')).toBe(6); // sábado
    expect(diaSemanaISO('2026-11-22')).toBe(7); // domingo
    expect(diaSemanaISO('2024-01-01')).toBe(1); // lunes
  });

  it('devuelve 0 ante un formato de fecha inválido', () => {
    expect(diaSemanaISO('no-es-fecha')).toBe(0);
    expect(diaSemanaISO('2026/11/16')).toBe(0);
  });

  it('NOMBRES_DIA está indexado de 1 a 7', () => {
    expect(Object.keys(NOMBRES_DIA)).toHaveLength(7);
    expect(NOMBRES_DIA[1]).toBe('lunes');
    expect(NOMBRES_DIA[6]).toBe('sábado');
    expect(NOMBRES_DIA[7]).toBe('domingo');
  });
});

describe('Validación de horarios abiertos y cerrados', () => {
  it('acepta una fecha futura en un día abierto y devuelve apertura/cierre', () => {
    const lunes = proximoDiaISO(1);
    const resultado = validarHorarioDelDia(horarios, lunes);

    expect(resultado.abierto).toBe(true);
    expect(resultado.apertura).toBe('12:00');
    expect(resultado.cierre).toBe('22:00');
    expect(resultado.nombreDia).toBe('lunes');
  });

  it('rechaza un día cerrado (domingo) con mensaje', () => {
    const domingo = proximoDiaISO(7);
    const resultado = validarHorarioDelDia(horarios, domingo);

    expect(resultado.abierto).toBe(false);
    expect(resultado.mensaje).toContain('domingo');
  });

  it('rechaza fechas en el pasado', () => {
    const resultado = validarHorarioDelDia(horarios, '2020-01-01');
    expect(resultado.abierto).toBe(false);
    expect(resultado.mensaje).toBe('La reserva no puede ser en el pasado.');
  });

  it('rechaza formatos de fecha inválidos', () => {
    const resultado = validarHorarioDelDia(horarios, '2026/11/16');
    expect(resultado.abierto).toBe(false);
    expect(resultado.mensaje).toBe('Selecciona una fecha válida.');
  });

  it('encuentra el horario por dia_semana aunque nombre_dia venga vacío', () => {
    const soloNumeros: HorarioRestaurante[] = [
      { dia_semana: 1, nombre_dia: '', hora_apertura: '09:00', hora_cierre: '18:00', abierto: true },
    ];
    const lunes = proximoDiaISO(1);
    const resultado = validarHorarioDelDia(soloNumeros, lunes);

    expect(resultado.abierto).toBe(true);
    expect(resultado.apertura).toBe('09:00');
  });
});

describe('Detección de cruce de franjas horarias', () => {
  it('detecta franjas que se cruzan o se contienen', () => {
    expect(franjasSeSolapan('12:00', '13:00', '12:30', '13:30')).toBe(true);
    expect(franjasSeSolapan('12:00', '13:00', '12:15', '12:45')).toBe(true);
    expect(franjasSeSolapan('12:00', '13:00', '10:00', '14:00')).toBe(true);
    expect(franjasSeSolapan('12:00', '13:00', '13:00', '14:00')).toBe(false);
    expect(franjasSeSolapan('12:00', '13:00', '11:00', '12:00')).toBe(false);
    expect(franjasSeSolapan('12:00', '13:00', '14:00', '15:00')).toBe(false);
  });

  it('las reservas duran una hora (60 minutos)', () => {
    expect(DURACION_RESERVA_MINUTOS).toBe(60);
  });
});
