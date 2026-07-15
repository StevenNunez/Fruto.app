import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CostCategory, CostEntry } from '../../types';
import { loadOrders, formatCLP } from '../../lib/orders';
import { loadCosts, addCost, deleteCost } from '../../lib/costs';
import { cn } from '../../lib/utils';

const CATEGORIES: CostCategory[] = ['Compra', 'Transporte', 'Empaque', 'Otro'];

const CATEGORY_STYLE: Record<CostCategory, string> = {
  Compra: 'bg-emerald-100 text-emerald-800',
  Transporte: 'bg-blue-100 text-blue-800',
  Empaque: 'bg-amber-100 text-amber-800',
  Otro: 'bg-stone-100 text-stone-600',
};

const EMPTY_FORM = { category: 'Compra' as CostCategory, description: '', amount: '' };

export const AdminCostos: React.FC = () => {
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [orders, setOrders] = useState<{ total: number }[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCosts().then(setCosts);
    loadOrders().then(setOrders);
  }, []);

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + o.total, 0), [orders]);
  const totalCosts = useMemo(() => costs.reduce((s, c) => s + c.amount, 0), [costs]);
  const profit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(String(form.amount).replace(/\./g, '').replace(',', '.'));
    if (!form.description.trim()) { setError('Ingresa una descripción.'); return; }
    if (isNaN(amount) || amount <= 0) { setError('Ingresa un monto válido.'); return; }
    setError('');
    const entry: CostEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      category: form.category,
      description: form.description.trim(),
      amount,
    };
    setCosts((prev) => [entry, ...prev]);
    addCost(entry).catch(console.error);
    setForm(EMPTY_FORM);
  }

  function handleDelete(id: string) {
    setCosts((prev) => prev.filter((c) => c.id !== id));
    deleteCost(id).catch(console.error);
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Control de Costos</h1>
        <p className="mt-1 text-sm text-stone-500">Registra tus gastos y compáralos con los ingresos de pedidos.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Ingresos brutos', value: formatCLP(totalRevenue), sub: 'De todos los pedidos', positive: true },
          { label: 'Costos registrados', value: formatCLP(totalCosts), sub: `${costs.length} entradas`, positive: false },
          { label: 'Ganancia bruta', value: formatCLP(profit), sub: profit >= 0 ? 'Positivo' : 'Negativo', positive: profit >= 0 },
          { label: 'Margen', value: `${margin}%`, sub: 'Ingresos netos', positive: margin >= 0 },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 md:px-5 md:py-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{card.label}</p>
            <p className={cn('mt-1 text-2xl font-bold md:text-3xl',
              card.label === 'Ingresos brutos' || card.label === 'Margen' ? 'text-stone-800'
                : card.positive ? 'text-emerald-600' : 'text-red-500'
            )}>{card.value}</p>
            <p className="mt-1 text-xs text-stone-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-800">Agregar Costo</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-600">Categoría</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CostCategory }))} className="input-field">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-600">Descripción</label>
              <input type="text" placeholder="Ej: Cajas de madera, bencina..." value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-600">Monto ($)</label>
              <input type="number" placeholder="0" min={1} value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="input-field" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
              Registrar costo
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-800">Costos Registrados</h2>
          {costs.length === 0 ? (
            <p className="py-10 text-center text-xs text-stone-400">Sin costos registrados aún.</p>
          ) : (
            <div className="space-y-2">
              {costs.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-3">
                  <span className={cn('shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', CATEGORY_STYLE[c.category])}>
                    {c.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800">{c.description}</p>
                    <p className="text-[10px] text-stone-400">
                      {new Date(c.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-red-500">−{formatCLP(c.amount)}</span>
                  <button onClick={() => handleDelete(c.id)}
                    className="shrink-0 rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
