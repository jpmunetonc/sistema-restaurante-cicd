import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Cliente Supabase falso: registra cada operación (`from(...).insert/select/...`)
 * para poder asertar las inserciones transaccionales y devuelve las
 * respuestas programadas por clave `${tabla}.${accion}`.
 */
const control = vi.hoisted(() => {
  interface Filtro {
    tipo: 'eq' | 'in';
    columna: string;
    valor: unknown;
  }

  interface Registro {
    tabla: string;
    accion: string;
    datos: unknown;
    filtros: Filtro[];
  }

  interface RespuestaError {
    message: string;
    code?: string;
  }

  interface Respuesta {
    data?: unknown;
    error?: RespuestaError | null;
  }

  type Programacion =
    | Respuesta
    | ((registro: { tabla: string; accion: string; datos: unknown; filtros: Filtro[] }) => Respuesta);

  const registros: Registro[] = [];
  const programaciones: Record<string, Programacion> = {};
  let usuario: { id: string } | null = null;

  class BuilderFalso implements PromiseLike<Respuesta> {
    private accion: 'select' | 'insert' | 'update' | 'delete' | null = null;
    private datos: unknown = null;
    private filtros: Filtro[] = [];

    constructor(private readonly tabla: string) {}

    select(): this {
      if (!this.accion) this.accion = 'select';
      return this;
    }

    insert(datos: unknown): this {
      this.accion = 'insert';
      this.datos = datos;
      return this;
    }

    update(datos: unknown): this {
      this.accion = 'update';
      this.datos = datos;
      return this;
    }

    delete(): this {
      this.accion = 'delete';
      return this;
    }

    eq(columna: string, valor: unknown): this {
      this.filtros.push({ tipo: 'eq', columna, valor });
      return this;
    }

    in(columna: string, valor: unknown): this {
      this.filtros.push({ tipo: 'in', columna, valor });
      return this;
    }

    order(): this {
      return this;
    }

    limit(): this {
      return this;
    }

    single(): Promise<Respuesta> {
      return this.resolver();
    }

    maybeSingle(): Promise<Respuesta> {
      return this.resolver();
    }

    then<TResult1 = Respuesta, TResult2 = never>(
      onfulfilled?: ((value: Respuesta) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
      return this.resolver().then(onfulfilled, onrejected);
    }

    private resolver(): Promise<Respuesta> {
      const registro: Registro = {
        tabla: this.tabla,
        accion: this.accion ?? 'select',
        datos: this.datos,
        filtros: this.filtros,
      };
      registros.push(registro);

      const programado = programaciones[`${this.tabla}.${registro.accion}`];
      if (!programado) return Promise.resolve({ data: null, error: null });

      const respuesta =
        typeof programado === 'function'
          ? programado({
              tabla: registro.tabla,
              accion: registro.accion,
              datos: registro.datos,
              filtros: registro.filtros,
            })
          : programado;
      return Promise.resolve(respuesta);
    }
  }

  const cliente = {
    auth: {
      getUser: async () => ({ data: { user: usuario } }),
    },
    from: (tabla: string) => new BuilderFalso(tabla),
  };

  return {
    registros,
    programaciones,
    cliente,
    fijarUsuario(nuevo: { id: string } | null): void {
      usuario = nuevo;
    },
    buscar(tabla: string, accion: string): Registro[] {
      return registros.filter((r) => r.tabla === tabla && r.accion === accion);
    },
    reiniciar(): void {
      registros.length = 0;
      for (const clave of Object.keys(programaciones)) delete programaciones[clave];
      usuario = null;
    },
  };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => control.cliente,
}));

import { registrarPedido } from '@/modules/pedidos/services/pedidos-service';
import { crearReserva } from '@/modules/reservas/services/reservas-service';
import { diaSemanaISO } from '@/modules/reservas/lib/reservas';

/** Fecha local 'YYYY-MM-DD' futura (para pasar la validación de fecha). */
function fechaEnDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Primera fecha futura que cae en el día ISO indicado (1..7). */
function proximoDiaISO(diaISO: number): string {
  for (let dias = 1; dias <= 14; dias++) {
    const fecha = fechaEnDias(dias);
    if (diaSemanaISO(fecha) === diaISO) return fecha;
  }
  throw new Error(`No se encontró una fecha futura para el día ISO ${diaISO}.`);
}

const HORARIOS_ABIERTOS = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({
  dia_semana: dia,
  nombre_dia: dia === 7 ? 'domingo' : dia === 6 ? 'sábado' : dia === 5 ? 'viernes' : dia === 4 ? 'jueves' : dia === 3 ? 'miércoles' : dia === 2 ? 'martes' : 'lunes',
  hora_apertura: '12:00',
  hora_cierre: '22:00',
  abierto: true,
}));

beforeEach(() => {
  control.reiniciar();
  control.fijarUsuario({ id: 'uuid-cliente' });
});

describe('Flujo de pedido — pedidos + detalle_pedidos (transaccional)', () => {
  it('registra el pedido con totales INC y su detalle en detalle_pedidos', async () => {
    control.programaciones['pedidos.insert'] = { data: { id: 'pedido-1' }, error: null };
    control.programaciones['detalle_pedidos.insert'] = { data: null, error: null };

    const pedido = await registrarPedido({
      direccion_entrega: 'Cra 1 #2-3, Apto 4',
      metodo_pago: 'efectivo',
      observaciones: null,
      items: [
        { producto_id: 1, cantidad: 2, precio_unitario: 25000 }, // valor del producto
        { producto_id: 2, cantidad: 1, precio_unitario: 4500 },
      ],
    });

    expect(pedido.id).toBe('pedido-1');

    // Totales: subtotal 54500, Impoconsumo 8% = 4360, total 58860.
    const insertPedido = control.buscar('pedidos', 'insert');
    expect(insertPedido).toHaveLength(1);
    expect(insertPedido[0].datos).toMatchObject({
      cliente_id: 'uuid-cliente',
      direccion_entrega: 'Cra 1 #2-3, Apto 4',
      metodo_pago: 'efectivo',
      subtotal: 54500,
      impuesto: 4360,
      total: 58860,
      estado: 'pendiente',
    });

    const insertDetalle = control.buscar('detalle_pedidos', 'insert');
    expect(insertDetalle).toHaveLength(1);
    expect(insertDetalle[0].datos).toEqual([
      { pedido_id: 'pedido-1', producto_id: 1, cantidad: 2, precio_unitario: 25000 },
      { pedido_id: 'pedido-1', producto_id: 2, cantidad: 1, precio_unitario: 4500 },
    ]);

    // Notificación best-effort para la administración.
    expect(control.buscar('notificaciones', 'insert')).toHaveLength(1);
  });

  it('revierte el pedido si falla el insert en detalle_pedidos (compensación)', async () => {
    control.programaciones['pedidos.insert'] = { data: { id: 'pedido-2' }, error: null };
    control.programaciones['detalle_pedidos.insert'] = {
      data: null,
      error: { message: 'violación de llave foránea', code: '23503' },
    };

    await expect(
      registrarPedido({
        direccion_entrega: 'Calle 5 # 6-7',
        metodo_pago: 'tarjeta',
        observaciones: null,
        items: [{ producto_id: 1, cantidad: 1, precio_unitario: 25000 }],
      })
    ).rejects.toThrow(
      'No se pudieron registrar los productos del pedido. El pedido no fue creado.'
    );

    // Compensación: se eliminó el pedido huérfano.
    const borrados = control.buscar('pedidos', 'delete');
    expect(borrados).toHaveLength(1);
    expect(borrados[0].filtros).toEqual([{ tipo: 'eq', columna: 'id', valor: 'pedido-2' }]);

    // No se creó notificación ni quedó detalle.
    expect(control.buscar('notificaciones', 'insert')).toHaveLength(0);
  });

  it('rechaza el pedido sin sesión iniciada', async () => {
    control.fijarUsuario(null);

    await expect(
      registrarPedido({
        direccion_entrega: 'Cra 1 #2-3',
        metodo_pago: 'efectivo',
        observaciones: null,
        items: [{ producto_id: 1, cantidad: 1, precio_unitario: 25000 }],
      })
    ).rejects.toThrow('Debes iniciar sesión para realizar un pedido.');

    expect(control.registros).toHaveLength(0);
  });

  it('descarta cantidades inválidas y rechaza el carrito vacío', async () => {
    await expect(
      registrarPedido({
        direccion_entrega: 'Cra 1 #2-3',
        metodo_pago: 'efectivo',
        observaciones: null,
        items: [
          { producto_id: 1, cantidad: 0, precio_unitario: 25000 },
          { producto_id: 1, cantidad: -2, precio_unitario: 25000 },
        ],
      })
    ).rejects.toThrow('Tu carrito está vacío. Agrega productos antes de pedir.');

    expect(control.buscar('pedidos', 'insert')).toHaveLength(0);
  });
});

describe('Flujo de reserva — reservas + reserva_mesas (transaccional)', () => {
  it('crea la reserva con mesas_requeridas y asigna mesas libres en reserva_mesas', async () => {
    const fecha = fechaEnDias(7);

    control.programaciones['horarios_restaurante.select'] = {
      data: HORARIOS_ABIERTOS,
      error: null,
    };
    control.programaciones['mesas.select'] = {
      data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      error: null,
    };
    control.programaciones['reservas.select'] = { data: [], error: null };
    control.programaciones['reservas.insert'] = { data: { id: 'reserva-1' }, error: null };
    control.programaciones['reserva_mesas.insert'] = { data: null, error: null };

    const reserva = await crearReserva({
      fecha,
      horaInicio: '13:00',
      numPersonas: 5, // ceil(5/4) = 2 mesas
      motivo: 'Aniversario',
    });

    expect(reserva.id).toBe('reserva-1');

    const insertReserva = control.buscar('reservas', 'insert');
    expect(insertReserva).toHaveLength(1);
    expect(insertReserva[0].datos).toMatchObject({
      cliente_id: 'uuid-cliente',
      fecha,
      hora_inicio: '13:00',
      hora_fin: '14:00',
      num_personas: 5,
      mesas_requeridas: 2,
      estado: 'pendiente',
    });

    // Asigna las primeras 2 mesas libres en la tabla intermedia.
    const insertMesas = control.buscar('reserva_mesas', 'insert');
    expect(insertMesas).toHaveLength(1);
    expect(insertMesas[0].datos).toEqual([
      { reserva_id: 'reserva-1', mesa_id: 1 },
      { reserva_id: 'reserva-1', mesa_id: 2 },
    ]);

    expect(control.buscar('notificaciones', 'insert')).toHaveLength(1);
  });

  it('descarta las mesas ya asignadas a reservas que se solapan', async () => {
    const fecha = fechaEnDias(7);

    control.programaciones['horarios_restaurante.select'] = {
      data: HORARIOS_ABIERTOS,
      error: null,
    };
    control.programaciones['mesas.select'] = {
      data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      error: null,
    };
    // Reserva previa 13:00–14:00 que ocupa las mesas 1 y 2.
    control.programaciones['reservas.select'] = {
      data: [{ id: 'reserva-previa', hora_inicio: '13:00', hora_fin: '14:00' }],
      error: null,
    };
    control.programaciones['reserva_mesas.select'] = {
      data: [{ mesa_id: 1 }, { mesa_id: 2 }],
      error: null,
    };
    control.programaciones['reservas.insert'] = { data: { id: 'reserva-3' }, error: null };
    control.programaciones['reserva_mesas.insert'] = { data: null, error: null };

    await crearReserva({ fecha, horaInicio: '13:30', numPersonas: 8, motivo: null });

    const insertMesas = control.buscar('reserva_mesas', 'insert');
    expect(insertMesas).toHaveLength(1);
    expect(insertMesas[0].datos).toEqual([
      { reserva_id: 'reserva-3', mesa_id: 3 },
      { reserva_id: 'reserva-3', mesa_id: 4 },
    ]);
  });

  it('revierte la reserva si falla la asignación en reserva_mesas (compensación)', async () => {
    const fecha = fechaEnDias(7);

    control.programaciones['horarios_restaurante.select'] = {
      data: HORARIOS_ABIERTOS,
      error: null,
    };
    control.programaciones['mesas.select'] = {
      data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      error: null,
    };
    control.programaciones['reservas.select'] = { data: [], error: null };
    control.programaciones['reservas.insert'] = { data: { id: 'reserva-2' }, error: null };
    control.programaciones['reserva_mesas.insert'] = {
      data: null,
      error: { message: 'error al asignar mesas' },
    };

    await expect(
      crearReserva({ fecha, horaInicio: '18:00', numPersonas: 8, motivo: null })
    ).rejects.toThrow('No se pudieron asignar las mesas de la reserva. La reserva no fue creada.');

    const borradas = control.buscar('reservas', 'delete');
    expect(borradas).toHaveLength(1);
    expect(borradas[0].filtros).toEqual([{ tipo: 'eq', columna: 'id', valor: 'reserva-2' }]);
    expect(control.buscar('notificaciones', 'insert')).toHaveLength(0);
  });

  it('rechaza la reserva cuando no hay mesas libres suficientes', async () => {
    const fecha = fechaEnDias(7);

    control.programaciones['horarios_restaurante.select'] = {
      data: HORARIOS_ABIERTOS,
      error: null,
    };
    control.programaciones['mesas.select'] = { data: [{ id: 1 }], error: null };
    control.programaciones['reservas.select'] = { data: [], error: null };

    await expect(
      crearReserva({ fecha, horaInicio: '19:00', numPersonas: 9, motivo: null })
    ).rejects.toThrow('Solo quedan 1 mesa(s) disponibles para esa fecha y horario.');

    expect(control.buscar('reservas', 'insert')).toHaveLength(0);
  });

  it('rechaza la reserva en un día cerrado (domingo)', async () => {
    const horariosCerrado = HORARIOS_ABIERTOS.map((horario) =>
      horario.dia_semana === 7 ? { ...horario, abierto: false } : horario
    );
    control.programaciones['horarios_restaurante.select'] = {
      data: horariosCerrado,
      error: null,
    };

    const domingo = proximoDiaISO(7);

    await expect(
      crearReserva({ fecha: domingo, horaInicio: '13:00', numPersonas: 2, motivo: null })
    ).rejects.toThrow('El restaurante no está abierto los domingo.');

    expect(control.buscar('reservas', 'insert')).toHaveLength(0);
  });

  it('rechaza la reserva sin sesión iniciada', async () => {
    control.fijarUsuario(null);

    await expect(
      crearReserva({ fecha: fechaEnDias(7), horaInicio: '13:00', numPersonas: 2, motivo: null })
    ).rejects.toThrow('Debes iniciar sesión para hacer una reserva.');
  });
});
