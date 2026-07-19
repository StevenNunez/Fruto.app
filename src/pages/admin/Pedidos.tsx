import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, CheckCircle2, X, Truck } from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, Sector } from '../../types';
import { cn } from '../../lib/utils';
import { loadOrders, updateOrderStatus, updatePaymentStatus, formatCLP, shortOrderId } from '../../lib/orders';
import { loadConfig, getActiveSectors } from '../../lib/config';

const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  pagado: { label: 'Pagado', className: 'bg-emerald-100 text-emerald-800' },
  pendiente_pago: { label: 'Pago pendiente', className: 'bg-amber-100 text-amber-700' },
  pendiente_transferencia: { label: 'Esperando transferencia', className: 'bg-amber-100 text-amber-700' },
  rechazado: { label: 'Pago rechazado', className: 'bg-red-100 text-red-700' },
};

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', meta.className)}>
      {meta.label}
    </span>
  );
}

const STATUSES: OrderStatus[] = ['Pendiente', 'Preparando', 'En camino', 'Entregado'];

const STATUS_META: Record<OrderStatus, { dot: string; label: string }> = {
  Pendiente: { dot: 'bg-orange-400', label: 'Pendiente' },
  Preparando: { dot: 'bg-blue-500', label: 'Preparando' },
  'En camino': { dot: 'bg-amber-400', label: 'En camino' },
  Entregado: { dot: 'bg-emerald-500', label: 'Entregado' },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  Pendiente: 'Preparando',
  Preparando: 'En camino',
  'En camino': 'Entregado',
};

// Los filtros de zona se arman con las zonas configuradas + las que
// aparezcan en pedidos antiguos (por si se renombró o eliminó una zona).

function deliveryLabel(o: Order): string {
  if (o.deliveryMode === 'hoy') return o.deliverySlot ? `Hoy · ${o.deliverySlot}` : 'Hoy';
  return 'Mañana';
}

/* ── Día de ENTREGA de un pedido ──────────────────────────────────────
   Un pedido "hoy" se entrega el día que se creó; uno "mañana" al día
   siguiente. Esto permite ver los pedidos por día y verificar que todos
   los del día queden entregados. */

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function deliveryDayKey(o: Order): string {
  const d = new Date(o.createdAt);
  if (o.deliveryMode !== 'hoy') d.setDate(d.getDate() + 1);
  return localDayKey(d);
}

function dayKeyOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localDayKey(d);
}

function dayKeyLabel(key: string): string {
  if (key === dayKeyOffset(0)) return 'hoy';
  if (key === dayKeyOffset(1)) return 'mañana';
  if (key === dayKeyOffset(-1)) return 'ayer';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function exportRoute(orders: Order[]) {
  const active = orders.filter((o) => o.status !== 'Entregado');
  const headers = ['ID', 'Cliente', 'Dirección', 'Sector', 'Entrega', 'Estado', 'Productos', 'Total', 'Pago', 'Notas'];
  const rows = active.map((o) => [
    shortOrderId(o.id), o.customerName, o.customerAddress, o.customerSector, deliveryLabel(o), o.status,
    o.items.map((i) => `${i.quantity}x ${i.name}`).join(' / '),
    formatCLP(o.total), o.paymentMethod, o.notes ?? '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ruta-fruto-${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const AdminPedidos: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [zonas, setZonas] = useState<string[]>([]);
  const [filterSector, setFilterSector] = useState<Sector | 'Todos'>('Todos');
  // Por defecto se ven las ENTREGAS DE HOY, no el historial global.
  const [diaFiltro, setDiaFiltro] = useState<string | 'todos'>(dayKeyOffset(0));
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');
  const [confirmingDeparture, setConfirmingDeparture] = useState(false);

  useEffect(() => {
    loadOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
    loadConfig().then((cfg) => setZonas(getActiveSectors(cfg)));
  }, []);

  const sectorFilters = useMemo<(Sector | 'Todos')[]>(() => {
    const extra = orders.map((o) => o.customerSector).filter((s) => s && !zonas.includes(s));
    return ['Todos', ...zonas, ...Array.from(new Set(extra))];
  }, [zonas, orders]);

  const changeStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    updateOrderStatus(orderId, status).catch(console.error);
  };

  const markTransferPaid = (orderId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'pagado' } : o)));
    updatePaymentStatus(orderId, 'pagado').catch(console.error);
  };

  const advanceOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (next) changeStatus(orderId, next);
  };

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const dayOk = diaFiltro === 'todos' || deliveryDayKey(o) === diaFiltro;
      const sectorOk = filterSector === 'Todos' || o.customerSector === filterSector;
      const searchOk = !q || o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
      return dayOk && sectorOk && searchOk;
    });
  }, [orders, diaFiltro, filterSector, search]);

  // "Confirmar salida" y el CSV operan sobre lo FILTRADO (el día elegido),
  // no sobre el historial global.
  const confirmDeparture = () => {
    const toAdvance = filteredOrders.filter((o) => o.status === 'Preparando');
    const ids = new Set(toAdvance.map((o) => o.id));
    setOrders((prev) => prev.map((o) => (ids.has(o.id) ? { ...o, status: 'En camino' as OrderStatus } : o)));
    toAdvance.forEach((o) => updateOrderStatus(o.id, 'En camino').catch(console.error));
    setConfirmingDeparture(false);
  };

  // Progreso de entrega del día elegido (independiente de sector/búsqueda):
  // la pregunta que responde es "¿entregué TODO lo de este día?".
  const dayProgress = useMemo(() => {
    if (diaFiltro === 'todos') return null;
    const delDia = orders.filter((o) => deliveryDayKey(o) === diaFiltro);
    const entregados = delDia.filter((o) => o.status === 'Entregado').length;
    return { total: delDia.length, entregados, pendientes: delDia.length - entregados };
  }, [orders, diaFiltro]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const gross = filteredOrders.reduce((s, o) => s + o.total, 0);
    const pending = filteredOrders.filter((o) => o.status === 'Pendiente').length;
    const avg = totalOrders > 0 ? Math.round(gross / totalOrders) : 0;
    return { totalOrders, gross, pending, avg };
  }, [filteredOrders]);

  const ordersByStatus = useMemo(() => {
    const map: Record<OrderStatus, Order[]> = { Pendiente: [], Preparando: [], 'En camino': [], Entregado: [] };
    for (const o of filteredOrders) map[o.status].push(o);
    return map;
  }, [filteredOrders]);

  const preparandoCount = filteredOrders.filter((o) => o.status === 'Preparando').length;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Pedidos</h1>
          <p className="mt-1 text-sm text-stone-500">
            Gestiona los pedidos del día: pagos, preparación y entrega.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => exportRoute(filteredOrders)}
            className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 active:scale-95">
            <Download size={15} />Exportar ruta
          </button>
          <button type="button" onClick={() => setConfirmingDeparture(true)} disabled={preparandoCount === 0}
            className="flex items-center gap-2 rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#245a42] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            <CheckCircle2 size={15} />
            Confirmar salida{preparandoCount > 0 ? ` (${preparandoCount})` : ''}
          </button>
        </div>
      </div>

      {/* ── Día de entrega ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Entregas de</span>
        {([
          { key: dayKeyOffset(0), label: 'Hoy' },
          { key: dayKeyOffset(1), label: 'Mañana' },
        ] as { key: string; label: string }[]).map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setDiaFiltro(key)}
            className={cn('rounded-full px-4 py-2 text-sm font-semibold transition-all',
              diaFiltro === key ? 'bg-brand-green text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
            )}>{label}</button>
        ))}
        <input
          type="date"
          value={diaFiltro !== 'todos' ? diaFiltro : ''}
          onChange={(e) => { if (e.target.value) setDiaFiltro(e.target.value); }}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
            diaFiltro !== 'todos' && diaFiltro !== dayKeyOffset(0) && diaFiltro !== dayKeyOffset(1)
              ? 'border-brand-green bg-brand-green/5 text-brand-green'
              : 'border-stone-200 bg-white text-stone-500'
          )}
          aria-label="Elegir otro día"
        />
        <button type="button" onClick={() => setDiaFiltro('todos')}
          className={cn('rounded-full px-4 py-2 text-sm font-semibold transition-all',
            diaFiltro === 'todos' ? 'bg-stone-700 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
          )}>Todos</button>
      </div>

      {/* ── ¿Entregué todo lo del día? ── */}
      {dayProgress && (
        dayProgress.total === 0 ? (
          <p className="mb-6 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-400">
            No hay entregas programadas para {dayKeyLabel(diaFiltro)}.
          </p>
        ) : dayProgress.pendientes === 0 ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-800">
              ¡Listo! Los {dayProgress.total} pedidos de {dayKeyLabel(diaFiltro)} están entregados.
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-amber-800">
                Entregas de {dayKeyLabel(diaFiltro)}: {dayProgress.entregados} de {dayProgress.total}
              </p>
              <p className="text-sm font-bold text-amber-700">
                faltan {dayProgress.pendientes}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(dayProgress.entregados / dayProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Pedidos" value={String(stats.totalOrders)} sub="Total filtrado" />
        <StatCard label="Ventas brutas" value={formatCLP(stats.gross)} sub="Meta: $320k" />
        <StatCard label="Ticket promedio" value={formatCLP(stats.avg)} sub="Estable" />
        <StatCard label="Pendientes" value={String(stats.pending)} sub="Por atender" subClassName="text-orange-600" />
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {sectorFilters.map((s) => (
            <button key={s} type="button" onClick={() => setFilterSector(s)}
              className={cn('whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all',
                filterSector === s ? 'bg-brand-green text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              )}>{s}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:w-64 lg:w-72">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input type="search" placeholder="Buscar pedido o cliente" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-brand-green/40 focus:ring-2 focus:ring-brand-green/15"
            />
          </div>
          <div className="flex rounded-full border border-stone-200 bg-white p-0.5">
            {(['kanban', 'lista'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)}
                className={cn('rounded-full px-4 py-2 text-sm font-semibold capitalize transition',
                  view === v ? 'bg-brand-green text-white' : 'text-stone-500 hover:text-stone-700'
                )}>{v === 'kanban' ? 'Kanban' : 'Lista'}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((s) => (
            <div key={s} className="min-h-[320px] animate-pulse rounded-2xl border border-stone-200/60 bg-stone-100/60" />
          ))}
        </div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((status) => (
            <div key={status}>
              <KanbanColumn status={status} orders={ordersByStatus[status]}
                onAdvance={advanceOrder} onStatusChange={changeStatus} onMarkPaid={markTransferPaid} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <p className="py-16 text-center text-sm text-stone-400">No hay pedidos que coincidan.</p>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id}>
                <ListOrderRow order={order} onAdvance={advanceOrder} onStatusChange={changeStatus} onMarkPaid={markTransferPaid} />
              </div>
            ))
          )}
        </div>
      )}

      {confirmingDeparture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10">
                <Truck size={22} className="text-brand-green" />
              </div>
              <button type="button" onClick={() => setConfirmingDeparture(false)} className="rounded-lg p-1 text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            <h2 className="mt-4 text-xl font-bold text-stone-800">Confirmar salida de ruta</h2>
            <p className="mt-2 text-sm text-stone-500">
              Se marcarán <strong className="text-stone-700">{preparandoCount} pedidos</strong> como "En camino".
            </p>
            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {filteredOrders.filter((o) => o.status === 'Preparando').map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-stone-800">{o.customerName}</p>
                    <p className="text-xs text-stone-500">{o.customerAddress}</p>
                  </div>
                  <span className="text-xs text-stone-400">{o.customerSector}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setConfirmingDeparture(false)}
                className="flex-1 rounded-full border border-stone-200 py-3 text-sm font-semibold text-stone-600 hover:border-stone-300">Cancelar</button>
              <button type="button" onClick={confirmDeparture}
                className="flex-1 rounded-full bg-brand-green py-3 text-sm font-semibold text-white hover:bg-[#245a42]">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function StatCard({ label, value, sub, subClassName }: { label: string; value: string; sub: string; subClassName?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white px-4 py-4 md:px-5 md:py-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-800 md:text-3xl">{value}</p>
      <p className={cn('mt-1 text-xs text-stone-500', subClassName)}>{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-600">
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />{status}
    </span>
  );
}

function KanbanColumn({ status, orders, onAdvance, onStatusChange, onMarkPaid }: {
  status: OrderStatus; orders: Order[];
  onAdvance: (id: string) => void; onStatusChange: (id: string, status: OrderStatus) => void;
  onMarkPaid: (id: string) => void;
}) {
  const total = orders.reduce((s, o) => s + o.total, 0);
  const meta = STATUS_META[status];
  return (
    <div className="flex min-h-[320px] flex-col rounded-2xl border border-stone-200/80 bg-[#EEEDE8]/60 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
          <span className="text-sm font-semibold text-stone-700">{meta.label}</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-stone-800">{orders.length}</span>
          <span className="ml-2 text-xs text-stone-500">{formatCLP(total)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-xs text-stone-400">Sin pedidos</p>
        ) : (
          orders.map((order) => (
            <div key={order.id}>
              <OrderCard order={order} onAdvance={onAdvance} onStatusChange={onStatusChange} onMarkPaid={onMarkPaid} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onAdvance, onStatusChange, onMarkPaid }: {
  order: Order; onAdvance: (id: string) => void; onStatusChange: (id: string, status: OrderStatus) => void;
  onMarkPaid: (id: string) => void;
}) {
  const canAdvance = order.status !== 'Entregado';
  return (
    <article className="rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-stone-800">#{shortOrderId(order.id)}</span>
        <span className="text-sm font-bold text-stone-800">{formatCLP(order.total)}</span>
      </div>
      <p className="font-semibold text-stone-800">{order.customerName}</p>
      <p className="mt-0.5 text-xs text-stone-500">{order.customerSector} · {order.items.length} items</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            order.deliveryMode === 'hoy'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-emerald-100 text-emerald-800'
          )}
        >
          {deliveryLabel(order)}
        </span>
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <div className="mt-2 space-y-0.5">
        {order.items.map((item) => (
          <p key={item.id} className="text-[11px] text-stone-400">
            {item.quantity}× {item.name} <span className="text-stone-300">({item.unit})</span>
          </p>
        ))}
      </div>
      {order.notes && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">{order.notes}</p>}
      {order.paymentStatus === 'pendiente_transferencia' && (
        <button
          type="button"
          onClick={() => onMarkPaid(order.id)}
          className="mt-2.5 w-full rounded-lg bg-emerald-50 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
        >
          Marcar transferencia recibida
        </button>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5">
        <span className="text-[11px] text-stone-400">{order.paymentMethod}</span>
        {canAdvance ? (
          <button type="button" onClick={() => onAdvance(order.id)} className="text-xs font-semibold text-brand-green hover:underline">
            Avanzar →
          </button>
        ) : (
          <select value={order.status} onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
            className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-600">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
    </article>
  );
}

function ListOrderRow({ order, onAdvance, onStatusChange, onMarkPaid }: {
  order: Order; onAdvance: (id: string) => void; onStatusChange: (id: string, status: OrderStatus) => void;
  onMarkPaid: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canAdvance = order.status !== 'Entregado';
  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-stone-800">#{shortOrderId(order.id)}</span>
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </div>
          <p className="mt-1 font-semibold text-stone-800">{order.customerName}</p>
          <p className="text-xs text-stone-500">
            {order.customerSector} · {order.items.length} items · {order.paymentMethod} ·{' '}
            <span className={order.deliveryMode === 'hoy' ? 'font-semibold text-orange-600' : 'font-semibold text-emerald-700'}>
              {deliveryLabel(order)}
            </span>
          </p>
          {order.notes && <p className="mt-1 text-xs text-amber-800">{order.notes}</p>}
          {order.paymentStatus === 'pendiente_transferencia' && (
            <button
              type="button"
              onClick={() => onMarkPaid(order.id)}
              className="mt-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              Marcar transferencia recibida
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setExpanded((p) => !p)} className="text-xs font-medium text-stone-400 hover:text-stone-600">
            {expanded ? 'Ocultar' : 'Ver detalle'}
          </button>
          <span className="text-lg font-bold text-stone-800">{formatCLP(order.total)}</span>
          {canAdvance ? (
            <button type="button" onClick={() => onAdvance(order.id)}
              className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white hover:bg-[#245a42]">Avanzar</button>
          ) : (
            <select value={order.status} onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
              className="rounded-full border border-stone-200 px-3 py-2 text-xs">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-stone-100 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Detalle del pedido</p>
          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
                <span className="text-sm text-stone-700">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-400">{item.unit}</span>
                  <span className="text-sm font-bold text-stone-800">× {item.quantity}</span>
                  <span className="text-xs text-stone-400">{formatCLP(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <span className="text-sm font-bold text-stone-800">Total: {formatCLP(order.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
