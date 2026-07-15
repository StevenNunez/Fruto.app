import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Order, Sector } from '../../types';
import { loadOrders, formatCLP } from '../../lib/orders';
import { cn } from '../../lib/utils';

const SECTOR_FILTERS: (Sector | 'Todos')[] = ['Todos', 'La Serena', 'Coquimbo', 'Las Compañías'];

type ClientSummary = {
  name: string; address: string; sector: Sector;
  orderCount: number; totalSpent: number;
  favoriteProduct: string; lastPaymentMethod: string;
};

function buildClients(orders: Order[]): ClientSummary[] {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const existing = map.get(order.customerName) ?? [];
    existing.push(order);
    map.set(order.customerName, existing);
  }
  return Array.from(map.entries()).map(([name, clientOrders]) => {
    const counts = new Map<string, number>();
    for (const o of clientOrders) {
      for (const item of o.items) counts.set(item.name, (counts.get(item.name) ?? 0) + item.quantity);
    }
    const favoriteProduct = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '–';
    const last = clientOrders[clientOrders.length - 1];
    return {
      name, address: last.customerAddress, sector: last.customerSector,
      orderCount: clientOrders.length,
      totalSpent: clientOrders.reduce((s, o) => s + o.total, 0),
      favoriteProduct, lastPaymentMethod: last.paymentMethod,
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);
}

const SECTOR_DOT: Record<Sector, string> = {
  'La Serena': 'bg-brand-green', Coquimbo: 'bg-brand-orange', 'Las Compañías': 'bg-blue-400',
};

export const AdminClientes: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState<Sector | 'Todos'>('Todos');

  useEffect(() => { loadOrders().then(setOrders); }, []);

  const clients = useMemo(() => buildClients(orders), [orders]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      const sectorOk = filterSector === 'Todos' || c.sector === filterSector;
      const searchOk = !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
      return sectorOk && searchOk;
    });
  }, [clients, search, filterSector]);

  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Clientes</h1>
        <p className="mt-1 text-sm text-stone-500">{clients.length} clientes · {formatCLP(totalRevenue)} en ventas totales</p>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SECTOR_FILTERS.map((s) => (
            <button key={s} type="button" onClick={() => setFilterSector(s)}
              className={cn('whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all',
                filterSector === s ? 'bg-brand-green text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              )}>{s}</button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" placeholder="Buscar cliente" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-brand-green/40 focus:ring-2 focus:ring-brand-green/15"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-400">No hay clientes que coincidan.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((client, i) => (
            <div key={client.name} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 sm:w-8">
                <span className="text-sm font-bold text-stone-300">#{i + 1}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-stone-800">{client.name}</p>
                  <span className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-600">
                    <span className={cn('h-1.5 w-1.5 rounded-full', SECTOR_DOT[client.sector])} />{client.sector}
                  </span>
                </div>
                <p className="text-xs text-stone-500">{client.address}</p>
                <p className="text-xs text-stone-400">
                  Favorito: <span className="font-medium text-stone-600">{client.favoriteProduct}</span>
                  {' · '}{client.lastPaymentMethod}
                </p>
              </div>
              <div className="flex items-center gap-6 sm:shrink-0">
                <div className="text-center">
                  <p className="text-lg font-bold text-stone-800">{client.orderCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">pedidos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-brand-green">{formatCLP(client.totalSpent)}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">total</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
