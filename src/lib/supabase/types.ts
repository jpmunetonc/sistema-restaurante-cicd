export type RolUsuario = 'cliente' | 'admin';

export interface Perfil {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  direccion_default: string | null;
  rol: RolUsuario;
  created_at: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  valor: number;
  stock_disponible: number;
  activo: boolean;
  created_at: string;
}

/** Asignación de una mesa concreta a una reserva (tabla intermedia). */
export interface ReservaMesa {
  reserva_id: string;
  mesa_id: number;
}

export interface Mesa {
  id: number;
  numero_mesa: number;
  capacidad: number;
  ubicacion: string | null;
  activa: boolean;
}

export interface HorarioRestaurante {
  dia_semana: number;
  nombre_dia: string;
  hora_apertura: string;
  hora_cierre: string;
  abierto: boolean;
}

export type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export interface Reserva {
  id: string;
  cliente_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  num_personas: number;
  mesas_requeridas: number;
  motivo: string | null;
  estado: EstadoReserva;
  created_at: string;
}

export type EstadoPedido = 'pendiente' | 'en_preparacion' | 'en_camino' | 'entregado' | 'cancelado';

export interface Pedido {
  id: string;
  cliente_id: string;
  direccion_entrega: string;
  observaciones: string | null;
  metodo_pago: string;
  subtotal: number;
  impuesto: number;
  total: number;
  estado: EstadoPedido;
  fecha_hora_pedido: string;
  fecha_hora_entrega: string | null;
}

export interface DetallePedido {
  id: number;
  pedido_id: string;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  productos?: Pick<Producto, 'nombre' | 'imagen_url'>;
}

export interface Notificacion {
  id: string;
  usuario_id: string | null;
  para_admin: boolean;
  tipo: string;
  titulo: string;
  mensaje: string;
  referencia_id: string | null;
  leida: boolean;
  created_at: string;
}