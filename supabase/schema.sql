-- ============================================================================
-- ESQUEMA DE BASE DE DATOS - SISTEMA INTEGRAL DE GESTIÓN DE RESTAURANTE
-- ============================================================================

-- 1. Tablas independientes (Catálogos y Perfiles)
CREATE TABLE public.perfiles (
  id uuid NOT NULL,
  nombre text NOT NULL,
  email text NOT NULL,
  telefono text DEFAULT ''::text,
  direccion_default text DEFAULT ''::text,
  rol text DEFAULT 'cliente'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT perfiles_email_key UNIQUE (email),
  CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT perfiles_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_rol_check CHECK ((rol = ANY (ARRAY['cliente'::text, 'admin'::text])))
);

CREATE SEQUENCE IF NOT EXISTS public.productos_id_seq;
CREATE TABLE public.productos (
  id integer DEFAULT nextval('productos_id_seq'::regclass) NOT NULL,
  nombre text NOT NULL,
  descripcion text NOT NULL,
  imagen_url text DEFAULT 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'::text NOT NULL,
  valor numeric(10,2) NOT NULL,
  stock_disponible integer DEFAULT 10 NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT productos_pkey PRIMARY KEY (id),
  CONSTRAINT productos_stock_disponible_check CHECK ((stock_disponible >= 0)),
  CONSTRAINT productos_valor_check CHECK ((valor >= (0)::numeric))
);

CREATE TABLE public.horarios_restaurante (
  dia_semana integer NOT NULL,
  nombre_dia text NOT NULL,
  hora_apertura time without time zone DEFAULT '12:00:00'::time without time zone NOT NULL,
  hora_cierre time without time zone DEFAULT '23:00:00'::time without time zone NOT NULL,
  abierto boolean DEFAULT true NOT NULL,
  CONSTRAINT horarios_restaurante_check CHECK ((hora_cierre > (hora_apertura + '02:00:00'::interval))),
  CONSTRAINT horarios_restaurante_dia_semana_check CHECK (((dia_semana >= 1) AND (dia_semana <= 7))),
  CONSTRAINT horarios_restaurante_pkey PRIMARY KEY (dia_semana)
);

CREATE SEQUENCE IF NOT EXISTS public.mesas_id_seq;
CREATE TABLE public.mesas (
  id integer DEFAULT nextval('mesas_id_seq'::regclass) NOT NULL,
  numero_mesa integer NOT NULL,
  capacidad integer DEFAULT 4 NOT NULL,
  ubicacion text DEFAULT 'Salón Principal'::text NOT NULL,
  activa boolean DEFAULT true NOT NULL,
  CONSTRAINT mesas_capacidad_check CHECK ((capacidad = 4)),
  CONSTRAINT mesas_numero_mesa_key UNIQUE (numero_mesa),
  CONSTRAINT mesas_pkey PRIMARY KEY (id)
);

-- 2. Módulo de Pedidos
CREATE TABLE public.pedidos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id uuid NOT NULL,
  direccion_entrega text NOT NULL,
  observaciones text DEFAULT ''::text,
  metodo_pago text NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  impuesto numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  estado text DEFAULT 'pendiente'::text NOT NULL,
  fecha_hora_pedido timestamp with time zone DEFAULT now() NOT NULL,
  fecha_hora_entrega timestamp with time zone,
  CONSTRAINT pedidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES perfiles(id) ON DELETE CASCADE,
  CONSTRAINT pedidos_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'en_preparacion'::text, 'en_camino'::text, 'entregado'::text, 'cancelado'::text]))),
  CONSTRAINT pedidos_impuesto_check CHECK ((impuesto >= (0)::numeric)),
  CONSTRAINT pedidos_metodo_pago_check CHECK ((metodo_pago = ANY (ARRAY['Efectivo'::text, 'Transferencia'::text, 'Tarjeta'::text]))),
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_subtotal_check CHECK ((subtotal >= (0)::numeric)),
  CONSTRAINT pedidos_total_check CHECK ((total >= (0)::numeric))
);

CREATE SEQUENCE IF NOT EXISTS public.detalle_pedidos_id_seq;
CREATE TABLE public.detalle_pedidos (
  id integer DEFAULT nextval('detalle_pedidos_id_seq'::regclass) NOT NULL,
  pedido_id uuid NOT NULL,
  producto_id integer NOT NULL,
  cantidad integer NOT NULL,
  precio_unitario numeric(10,2) NOT NULL,
  CONSTRAINT detalle_pedidos_cantidad_check CHECK ((cantidad > 0)),
  CONSTRAINT detalle_pedidos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT detalle_pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT detalle_pedidos_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric)),
  CONSTRAINT detalle_pedidos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
);

-- 3. Módulo de Reservas
CREATE TABLE public.reservas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id uuid NOT NULL,
  fecha date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  num_personas integer NOT NULL,
  mesas_requeridas integer NOT NULL,
  motivo text DEFAULT 'Cena casual'::text NOT NULL,
  estado text DEFAULT 'confirmada'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT reservas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES perfiles(id) ON DELETE CASCADE,
  CONSTRAINT reservas_estado_check CHECK ((estado = ANY (ARRAY['confirmada'::text, 'modificada'::text, 'cancelada'::text]))),
  CONSTRAINT reservas_mesas_requeridas_check CHECK ((mesas_requeridas > 0)),
  CONSTRAINT reservas_num_personas_check CHECK ((num_personas > 0)),
  CONSTRAINT reservas_pkey PRIMARY KEY (id)
);

CREATE TABLE public.reserva_mesas (
  reserva_id uuid NOT NULL,
  mesa_id integer NOT NULL,
  CONSTRAINT reserva_mesas_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE RESTRICT,
  CONSTRAINT reserva_mesas_pkey PRIMARY KEY (reserva_id, mesa_id),
  CONSTRAINT reserva_mesas_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE
);

-- 4. Módulo de Notificaciones
CREATE TABLE public.notificaciones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  usuario_id uuid,
  para_admin boolean DEFAULT false NOT NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  referencia_id uuid,
  leida boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id),
  CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES perfiles(id) ON DELETE CASCADE
);