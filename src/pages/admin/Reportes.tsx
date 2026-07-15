import React, { useEffect, useMemo, useState } from 'react';
import { Order, OrderStatus, Sector } from '../../types';
import { loadOrders, formatCLP } from '../../lib/orders';
import { cn } from '../../lib/utils';

const STATUS_META: Record<OrderStatus, { dot: string; label: string }> = {
  Pendiente: { dot: 'bg-orange-400', label: 'Pendiente' },
  Preparando: { dot: 'bg-blue-400', label: 'Preparando' },
  'En camino': { dot: 'bg-amber-400', label: 'En camino' },
  Entregado: { dot: 'bg-emerald-500', label: 'Entregado' },
};

const SECTOR_COLOR: Record<Sector, string> = {
  'La Serena': 'bg-brand-green', Coquimbo: 'bg-brand-orange', 'Las Compañías': 'bg-blue-400',
};

export const AdminReportes: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { loadOrders().then(setOrders); }, []);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const gross = orders.reduce((s, o) => s + o.total, 0);
    const avg = totalOrders > 0 ? Math.round(gross / totalOrders) : 0;
    const delivered = orders.filter((o) => o.status === 'Entregado').length;
    return { totalOrders, gross, avg, delivered };
  }, [orders]);

  const bySector = useMemo(() => {
    const map: Record<Sector, { revenue: number; orders: number }> = {
      'La Serena': { revenue: 0, orders: 0 },
      Coquimbo: { revenue: 0, orders: 0 },
      'Las Compañías': { revenue: 0, orders: 0 },
    };
    for (const o of orders) {
      if (o.customerSector && map[o.customerSector]) {
        map[o.customerSector].revenue += o.total;
        map[o.customerSector].orders += 1;
      }
    }
    return map;
  }, [orders]);

  const maxSectorRevenue = Math.max(...Object.values<{ revenue: number; orders: number }>(bySector).map((s) => s.revenue));

  const byStatus = useMemo(() => {
    const map: Record<OrderStatus, number> = { Pendiente: 0, Preparando: 0, 'En camino': 0, Entregado: 0 };
    for (const o of orders) map[o.status]++;
    return map;
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      for (const item of o.items) {
        const existing = map.get(item.id) ?? { name: item.name, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.price * item.quantity;
        map.set(item.id, existing);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

  const maxQty = topProducts[0]?.qty ?? 1;

  const paymentBreakdown = useMemo(() => ({
    mp: orders.filter((o) => o.paymentMethod === 'MercadoPago').length,
    tf: orders.filter((o) => o.paymentMethod === 'Transferencia').length,
  }), [orders]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Reportes</h1>
        <p className="mt-1 text-sm text-stone-500">Resumen de actividad y ventas del período.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Pedidos totales', value: String(stats.totalOrders), sub: `${stats.delivered} entregados` },
          { label: 'Ventas brutas', value: formatCLP(stats.gross), sub: 'Período actual' },
          { label: 'Ticket promedio', value: formatCLP(stats.avg), sub: 'Por pedido' },
          { label: 'Tasa de entrega', value: `${stats.totalOrders > 0 ? Math.round((stats.delivered / stats.totalOrders) * 100) : 0}%`, sub: `${stats.delivered} de ${stats.totalOrders}` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 md:px-5 md:py-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-stone-800 md:text-3xl">{card.value}</p>
            <p className="mt-1 text-xs text-stone-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-800">Ventas por Sector</h2>
          <div className="space-y-3">
            {(Object.entries(bySector) as [Sector, { revenue: number; orders: number }][]).map(([sector, data]) => (
              <div key={sector}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700">{sector}</span>
                  <span className="text-stone-500">{formatCLP(data.revenue)} · {data.orders} pedidos</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className={cn('h-full rounded-full transition-all', SECTOR_COLOR[sector])}
                    style={{ width: maxSectorRevenue > 0 ? `${(data.revenue / maxSectorRevenue) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-800">Productos Más Pedidos</h2>
          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-xs text-stone-400">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-stone-400">#{i + 1}</span>
                      <span className="font-semibold text-stone-700">{p.name}</span>
                    </span>
                    <span className="text-stone-500">{p.qty} unid. · {formatCLP(p.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-800">Estado de Pedidos</h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(byStatus) as [OrderStatus, number][]).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-3">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_META[status].dot)} />
                <div>
                  <p className="text-lg font-bold text-stone-800">{count}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-800">Métodos de Pago</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-stone-50 px-3 py-3">
              <p className="text-2xl font-bold text-stone-800">{paymentBreakdown.mp}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">MercadoPago</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {stats.totalOrders > 0 ? `${Math.round((paymentBreakdown.mp / stats.totalOrders) * 100)}%` : '–'}
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 px-3 py-3">
              <p className="text-2xl font-bold text-stone-800">{paymentBreakdown.tf}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Transferencia</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {stats.totalOrders > 0 ? `${Math.round((paymentBreakdown.tf / stats.totalOrders) * 100)}%` : '–'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
