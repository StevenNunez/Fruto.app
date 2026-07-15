import React, { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Order, OrderStatus, Sector } from '../../types';
import { loadOrders, formatCLP } from '../../lib/orders';
import { cn } from '../../lib/utils';

const STATUS_DOT: Record<OrderStatus, string> = {
  Pendiente: 'bg-orange-400',
  Preparando: 'bg-blue-500',
  'En camino': 'bg-amber-400',
  Entregado: 'bg-emerald-500',
};

function formatDate(date: Date) {
  const str = date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const AdminRuta: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { loadOrders().then(setOrders); }, []);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== 'Entregado'), [orders]);

  const bySector = useMemo(() => {
    const map: Partial<Record<Sector, Order[]>> = {};
    for (const o of activeOrders) {
      if (!map[o.customerSector]) map[o.customerSector] = [];
      map[o.customerSector]!.push(o);
    }
    return map;
  }, [activeOrders]);

  const sectors = Object.keys(bySector) as Sector[];
  const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Ruta del Día</h1>
        <p className="mt-1 text-sm text-stone-500">{formatDate(new Date())} · Salida estimada 18:30</p>
      </div>

      {activeOrders.length === 0 ? (
        <p className="py-20 text-center text-sm text-stone-400">No hay pedidos activos en la ruta.</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Paradas</p>
              <p className="mt-1 text-2xl font-bold text-stone-800">{activeOrders.length}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Sectores</p>
              <p className="mt-1 text-2xl font-bold text-stone-800">{sectors.length}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total ruta</p>
              <p className="mt-1 text-xl font-bold text-stone-800">{formatCLP(totalRevenue)}</p>
            </div>
          </div>

          <div className="space-y-8">
            {sectors.map((sector) => (
              <div key={sector}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-base font-bold text-stone-800">{sector}</h2>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                    {bySector[sector]!.length} paradas
                  </span>
                  <span className="text-xs text-stone-400">{formatCLP(bySector[sector]!.reduce((s, o) => s + o.total, 0))}</span>
                </div>
                <div className="space-y-2">
                  {bySector[sector]!.map((order, i) => (
                    <div key={order.id} className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-sm font-bold text-brand-green">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-stone-500">#{order.id}</span>
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[order.status])} />
                          <span className="text-[10px] font-semibold uppercase text-stone-500">{order.status}</span>
                        </div>
                        <p className="mt-0.5 font-semibold text-stone-800">{order.customerName}</p>
                        <p className="flex items-center gap-1 text-sm text-stone-500">
                          <MapPin size={12} className="shrink-0" />{order.customerAddress}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">{order.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ')}</p>
                        {order.notes && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">{order.notes}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-stone-800">{formatCLP(order.total)}</p>
                        <p className="text-xs text-stone-500">{order.paymentMethod}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
