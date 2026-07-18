export type Category = string;

export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: Category;
  image: string;
  isSeason?: boolean;
  description?: string;
  tags?: string[];
};

export type CartItem = Product & {
  quantity: number;
};

export type OrderStatus = 'Pendiente' | 'Preparando' | 'En camino' | 'Entregado';

/** pendiente_pago: recién creado, esperando confirmación de MP. pendiente_transferencia: pedido por transferencia, esperando comprobante. */
export type PaymentStatus = 'pendiente_pago' | 'pagado' | 'pendiente_transferencia' | 'rechazado';

/** Mañana = planificado (envío gratis sobre umbral). Hoy = urgente (siempre paga despacho). */
export type DeliveryMode = 'manana' | 'hoy';

export type Sector = 'La Serena' | 'Coquimbo' | 'Las Compañías';

export type CostCategory = 'Compra' | 'Transporte' | 'Empaque' | 'Otro';

export type CostEntry = {
  id: string;
  date: string;
  category: CostCategory;
  description: string;
  amount: number;
};

export type ProveedorProducto = {
  nombre: string;
  precio: number;
  unidad: string;
};

export type UltimaCompra = {
  fecha: string;
  monto: number;
  descripcion: string;
};

export type TipoCompetidor = 'Supermercado' | 'Negocio local' | 'Otro';

export type CompetidorProducto = {
  nombre: string;
  precio: number;
  unidad: string;
  fechaActualizacion: string;
};

export type Competidor = {
  id: string;
  nombre: string;
  tipo: TipoCompetidor;
  sitioWeb?: string;
  zona?: string;
  productos: CompetidorProducto[];
  notas?: string;
};

export type Proveedor = {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  tiempoEntrega: string;
  productos: ProveedorProducto[];
  ultimaCompra?: UltimaCompra;
  notas?: string;
};

export type Order = {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone?: string;
  customerSector: Sector;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  paymentMethod: 'MercadoPago' | 'Transferencia';
  notes?: string;
  /** Por defecto 'manana' en pedidos antiguos sin el campo. */
  deliveryMode: DeliveryMode;
  /** Ventana horaria solo para entrega hoy (ej. "12:00–14:00"). */
  deliverySlot?: string;
  paymentStatus: PaymentStatus;
  /** id de la preferencia de pago en Mercado Pago (solo paymentMethod = 'MercadoPago'). */
  mpPreferenceId?: string;
  /** id del pago confirmado por el webhook de Mercado Pago. */
  mpPaymentId?: string;
};
