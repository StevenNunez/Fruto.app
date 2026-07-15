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
};
