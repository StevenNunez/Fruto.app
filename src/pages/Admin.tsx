import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, MapPin, Users, Leaf, BarChart2, ArrowRight, ShoppingBasket, Clock, TrendingUp, Tag } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { loadOrders, formatCLP, shortOrderId } from '../lib/orders';
import { cn } from '../lib/utils';

const STATUS_DOT: Record<OrderStatus, string> = {
  Pendiente: 'bg-orange-400',
  Preparando: 'bg-blue-500',
  'En camino': 'bg-amber-400',
  Entregado: 'bg-emerald-500',
};

function formatDateGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const date = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  return { greeting, date: date.charAt(0).toUpperCase() + date.slice(1) };
}

export const Admin: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { loadOrders().then(setOrders); }, []);

  const stats = useMemo(() => ({
    total: orders.length,
    gross: orders.reduce((s, o) => s + o.total, 0),
    pending: orders.filter((o) => o.status === 'Pendiente').length,
    enCamino: orders.filter((o) => o.status === 'En camino').length,
    preparando: orders.filter((o) => o.status === 'Preparando').length,
  }), [orders]);

  const { packingItems, packingOrdersCount } = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status === 'Pendiente' || o.status === 'Preparando');
    const map = new Map<string, { name: string; total: number; unit: string; orderCount: number }>();
    for (const order of activeOrders) {
      for (const item of order.items) {
        const existing = map.get(item.id) ?? { name: item.name, total: 0, unit: item.unit, orderCount: 0 };
        existing.total += item.quantity;
        existing.orderCount += 1;
        map.set(item.id, existing);
      }
    }
    return { packingItems: [...map.values()].sort((a, b) => b.total - a.total), packingOrdersCount: activeOrders.length };
  }, [orders]);

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'Pendiente').slice(0, 5), [orders]);
  const { greeting, date } = formatDateGreeting();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">{greeting}</p>
        <h1 className="mt-0.5 text-2xl font-bold text-stone-800">{date}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
          <Clock size={13} />
          Cierre de pedidos a las <span className="font-medium text-stone-700">15:00</span>
          {' · '}Salida de ruta <span className="font-medium text-stone-700">18:30</span>
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {([
          { label: 'Pedidos hoy', value: String(stats.total), sub: 'Total recibidos', accent: false },
          { label: 'Ventas brutas', value: formatCLP(stats.gross), sub: 'Meta: $320k', accent: false },
          { label: 'Por empacar', value: String(stats.pending + stats.preparando), sub: 'Pendiente + Preparando', accent: (stats.pending + stats.preparando) > 0 },
          { label: 'En camino', value: String(stats.enCamino), sub: 'En ruta activa', accent: false },
        ] as const).map((card) => (
          <div key={card.label} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 md:px-5 md:py-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{card.label}</p>
            <p className={cn('mt-1 text-2xl font-bold md:text-3xl', card.accent ? 'text-brand-orange' : 'text-stone-800')}>{card.value}</p>
            <p className="mt-1 text-xs text-stone-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Packing list */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green/10">
                <ShoppingBasket size={18} className="text-brand-green" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-800">Qué tengo que empacar</h2>
                <p className="text-[11px] text-stone-400">
                  {packingOrdersCount > 0
                    ? `${packingOrdersCount} pedido${packingOrdersCount !== 1 ? 's' : ''} pendiente${packingOrdersCount !== 1 ? 's' : ''} y en preparación`
                    : 'Todo empacado'}
                </p>
              </div>
            </div>
            <Link to="/admin/pedidos" className="flex items-center gap-1 text-xs font-semibold text-brand-green hover:underline">
              Ver pedidos <ArrowRight size={12} />
            </Link>
          </div>
          {packingItems.length === 0 ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-emerald-700">¡Todo empacado! No hay pedidos pendientes.</p>
            </div>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Producto</span>
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Cantidad</span>
                  <span className="w-20 text-right text-[10px] font-bold uppercase tracking-wider text-stone-400">Pedidos</span>
                </div>
              </div>
              <div className="divide-y divide-stone-100">
                {packingItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between py-2.5">
                    <span className="text-sm font-medium text-stone-700">{item.name}</span>
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-bold text-stone-800">{item.total} <span className="text-xs font-normal text-stone-400">{item.unit}</span></span>
                      <span className="w-20 text-right text-xs text-stone-400">{item.orderCount} {item.orderCount === 1 ? 'pedido' : 'pedidos'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pending orders preview */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-800">Pedidos pendientes</h2>
            <Link to="/admin/pedidos" className="flex items-center gap-1 text-xs font-semibold text-brand-green hover:underline">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-emerald-700">No hay pedidos pendientes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingOrders.map((order) => (
                <div key={order.id} className="flex items-start justify-between gap-3 rounded-xl bg-stone-50 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[order.status])} />
                      <span className="text-[11px] font-bold text-stone-400">#{shortOrderId(order.id)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-stone-800">{order.customerName}</p>
                    <p className="text-xs text-stone-400">{order.customerSector} · {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                    {order.notes && <p className="mt-1 text-[11px] text-amber-700">{order.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-stone-800">{formatCLP(order.total)}</p>
                    <p className="text-[11px] text-stone-400">{order.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {([
            { to: '/admin/pedidos',   label: 'Pedidos',      Icon: Package,    bg: 'bg-brand-green/10', text: 'text-brand-green' },
            { to: '/admin/ruta',      label: 'Ruta del Día', Icon: MapPin,     bg: 'bg-blue-50',        text: 'text-blue-600' },
            { to: '/admin/clientes',  label: 'Clientes',     Icon: Users,      bg: 'bg-purple-50',      text: 'text-purple-600' },
            { to: '/admin/cosechas',  label: 'Cosechas',     Icon: Leaf,       bg: 'bg-emerald-50',     text: 'text-emerald-600' },
            { to: '/admin/reportes',  label: 'Reportes',     Icon: BarChart2,  bg: 'bg-amber-50',       text: 'text-amber-600' },
            { to: '/admin/finanzas',  label: 'Finanzas',     Icon: TrendingUp, bg: 'bg-indigo-50',      text: 'text-indigo-600' },
            { to: '/admin/precios',   label: 'Precios',      Icon: Tag,        bg: 'bg-rose-50',        text: 'text-rose-600' },
          ] as const).map(({ to, label, Icon, bg, text }) => (
            <Link key={to} to={to}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 transition hover:border-stone-300 hover:shadow-sm">
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', bg, text)}>
                <Icon size={17} />
              </div>
              <span className="text-sm font-semibold text-stone-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
