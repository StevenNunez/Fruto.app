import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Activity, Package2, Scale, Leaf, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { loadOrders, formatCLP } from '../../lib/orders';
import { loadCosts } from '../../lib/costs';
import { CostEntry, CostCategory } from '../../types';
import { cn } from '../../lib/utils';

type GastoFijo = { id: string; name: string; amount: number; frecuencia: 'mensual' | 'anual' };

function loadGastosFijosFromLS(): GastoFijo[] {
  try { return JSON.parse(localStorage.getItem('fruto_gastos_fijos') ?? '[]'); } catch { return []; }
}

const CAT_COLOR: Record<CostCategory, string> = {
  Compra: '#2D6A4F', Transporte: '#F4820A', Empaque: '#3B82F6', Otro: '#A8A29E',
};

interface DonutSegment { label: string; value: number; color: string }

function DonutChart({ data }: { data: DonutSegment[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const R = 44; const CX = 60; const CY = 60; const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = data.filter((d) => d.value > 0).map((d) => {
    const dash = (d.value / total) * C;
    const s = { ...d, dash, off: acc };
    acc += dash;
    return s;
  });
  return (
    <svg width={120} height={120} viewBox="0 0 120 120" className="shrink-0">
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {segs.map((s, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={s.color} strokeWidth={18}
            strokeDasharray={`${s.dash} ${C - s.dash}`} strokeDashoffset={-s.off} strokeLinecap="butt" />
        ))}
      </g>
      <circle cx={CX} cy={CY} r={32} fill="white" />
      <text x={CX} y={CY - 3} textAnchor="middle" fontSize="7.5" fill="#78716C" fontWeight="600">costos</text>
      <text x={CX} y={CY + 8} textAnchor="middle" fontSize="7" fill="#1C1917" fontWeight="700">{segs.length} tipos</text>
    </svg>
  );
}

type Tone = 'neutral' | 'positive' | 'negative';
interface KPIProps { label: string; value: string; sub: string; Icon: React.ElementType; tone?: Tone; badge?: string; delay?: number; }

function KPICard({ label, value, sub, Icon, tone = 'neutral', badge, delay = 0 }: KPIProps) {
  const iconBg  = tone === 'positive' ? 'bg-emerald-50 text-emerald-600' : tone === 'negative' ? 'bg-red-50 text-red-500' : 'bg-stone-100 text-stone-500';
  const valCls  = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-red-500' : 'text-stone-800';
  const badgeCls = tone === 'positive' ? 'bg-emerald-50 text-emerald-600' : tone === 'negative' ? 'bg-red-50 text-red-500' : 'bg-stone-100 text-stone-500';
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconBg)}><Icon size={17} /></div>
        {badge !== undefined && <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', badgeCls)}>{badge}</span>}
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
      <p className={cn('mt-0.5 text-xl font-bold md:text-2xl', valCls)}>{value}</p>
      <p className="mt-0.5 text-[11px] text-stone-500">{sub}</p>
    </motion.div>
  );
}

function ResumenRow({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-50 py-1.5 text-xs last:border-0">
      <span className="text-stone-500">{label}</span>
      <span className={cn('font-semibold', cls)}>{value}</span>
    </div>
  );
}

export const AdminFinanzas: React.FC = () => {
  const [orders, setOrders] = useState<{ total: number; status: string; items: { id: string; name: string; price: number; quantity: number }[] }[]>([]);
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);

  useEffect(() => {
    loadOrders().then(setOrders as never);
    loadCosts().then(setCosts);
    setGastosFijos(loadGastosFijosFromLS());
  }, []);

  const totalRevenue  = useMemo(() => orders.reduce((s, o) => s + o.total, 0), [orders]);
  const orderCount    = orders.length;
  const avgTicket     = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
  const deliveredCount = orders.filter((o) => o.status === 'Entregado').length;

  const compras  = useMemo(() => costs.filter((c) => c.category === 'Compra').reduce((s, c) => s + c.amount, 0), [costs]);
  const gastosOp = useMemo(() => costs.filter((c) => c.category !== 'Compra').reduce((s, c) => s + c.amount, 0), [costs]);

  const totalGastosFijos = useMemo(
    () => gastosFijos.reduce((s, g) => s + (g.frecuencia === 'anual' ? g.amount / 12 : g.amount), 0),
    [gastosFijos]
  );

  const totalCosts  = compras + gastosOp + totalGastosFijos;
  const ganBruta    = totalRevenue - compras;
  const ganNeta     = ganBruta - gastosOp - totalGastosFijos;
  const margen      = totalRevenue > 0 ? Math.round((ganNeta  / totalRevenue) * 100) : 0;
  const margenBruto = totalRevenue > 0 ? Math.round((ganBruta / totalRevenue) * 100) : 0;

  const peOrders   = avgTicket > 0 && totalCosts > 0 ? Math.ceil(totalCosts / avgTicket) : 0;
  const peProgress = peOrders > 0 ? Math.min(Math.round((orderCount / peOrders) * 100), 100) : 0;
  const peAlcanzado = orderCount >= peOrders && peOrders > 0;

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      for (const it of o.items) {
        const ex = map.get(it.id) ?? { name: it.name, qty: 0, revenue: 0 };
        ex.qty += it.quantity; ex.revenue += it.price * it.quantity;
        map.set(it.id, ex);
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [orders]);

  const byCat = useMemo(() => {
    const m: Record<CostCategory, number> = { Compra: 0, Transporte: 0, Empaque: 0, Otro: 0 };
    for (const c of costs) m[c.category] += c.amount;
    return m;
  }, [costs]);

  const donutData: DonutSegment[] = [
    ...(Object.entries(byCat) as [CostCategory, number][]).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value, color: CAT_COLOR[label] })),
    ...(totalGastosFijos > 0 ? [{ label: 'Gastos Fijos', value: Math.round(totalGastosFijos), color: '#8B5CF6' }] : []),
  ];

  const maxRev = topProducts[0]?.revenue ?? 1;
  const today  = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  const isRentable = ganNeta >= 0;

  return (
    <div className="p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green/10"><Leaf size={20} className="text-brand-green" /></div>
          <div>
            <h1 className="text-xl font-bold text-stone-800 md:text-2xl">Dashboard Financiero</h1>
            <p className="text-xs text-stone-500">Frutas & Verduras · {today}</p>
          </div>
        </div>
        <span className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm', isRentable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')}>
          {isRentable ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isRentable ? 'Negocio Rentable' : 'Operando a Pérdida'}
        </span>
      </motion.div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KPICard label="Ventas Totales"       value={formatCLP(totalRevenue)} sub={`${orderCount} pedidos`}              Icon={DollarSign}  tone="neutral"   delay={0} />
        <KPICard label="Costo Mercadería"     value={formatCLP(compras)}      sub="Entradas tipo Compra"                 Icon={ShoppingBag} tone="negative"  delay={0.05} />
        <KPICard label="Gastos Operacionales" value={formatCLP(gastosOp)}     sub="Transporte + Empaque + Otro"          Icon={Activity}    tone="negative"  delay={0.1} />
        <KPICard label="Ganancia Bruta"       value={formatCLP(ganBruta)}     sub={`Margen bruto ${margenBruto}%`}       Icon={BarChart3}   tone={ganBruta >= 0 ? 'positive' : 'negative'} delay={0.15} />
        <KPICard label="Ganancia Neta"        value={formatCLP(ganNeta)}      sub={`Margen neto ${margen}%`}             Icon={TrendingUp}  tone={ganNeta >= 0 ? 'positive' : 'negative'} badge={`${margen}%`} delay={0.2} />
        <KPICard label="Ticket Promedio"      value={formatCLP(avgTicket)}    sub={`${deliveredCount} entregados`}       Icon={Package2}    tone="neutral"   delay={0.25} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-brand-green" /><h2 className="text-sm font-bold text-stone-800">Ingresos por Producto</h2></div>
          {topProducts.length === 0 ? (
            <p className="py-10 text-center text-xs text-stone-400">Sin pedidos registrados.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 font-bold text-stone-300">#{i + 1}</span>
                      <span className="truncate font-medium text-stone-700">{p.name}</span>
                      {i === 0 && <span className="shrink-0 rounded-full bg-brand-green/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-green">TOP</span>}
                    </span>
                    <span className="shrink-0 font-semibold text-stone-600">{formatCLP(p.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <motion.div className="h-full rounded-full bg-brand-green" initial={{ width: 0 }}
                      animate={{ width: `${(p.revenue / maxRev) * 100}%` }} transition={{ duration: 0.6, delay: 0.3 + i * 0.07 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><PieIcon size={15} className="text-brand-orange" /><h2 className="text-sm font-bold text-stone-800">Distribución de Costos</h2></div>
          {donutData.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-10">
              <p className="text-center text-xs text-stone-400">Sin costos registrados.</p>
              <p className="text-center text-[11px] text-stone-400">Agrégalos en <strong>Costos</strong> o en <strong>Precios → Gastos Fijos</strong>.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <DonutChart data={donutData} />
              <div className="w-full space-y-2 sm:flex-1">
                {donutData.map((d) => (
                  <div key={d.label} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="flex-1 text-stone-600">{d.label}</span>
                    <span className="font-semibold text-stone-800">{formatCLP(d.value)}</span>
                    <span className="w-8 text-right text-[10px] text-stone-400">{totalCosts > 0 ? `${Math.round((d.value / totalCosts) * 100)}%` : ''}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-xs">
                  <span className="font-bold text-stone-500">Total costos</span>
                  <span className="font-bold text-stone-800">{formatCLP(totalCosts)}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Leaf size={15} className="text-brand-green" /><h2 className="text-sm font-bold text-stone-800">Top Productos Vendidos</h2></div>
          {topProducts.length === 0 ? <p className="py-8 text-center text-xs text-stone-400">Sin pedidos.</p> : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-left">
                    <th className="pb-2 pl-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">#</th>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-wide text-stone-400">Producto</th>
                    <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-wide text-stone-400">Unid.</th>
                    <th className="pb-2 pr-1 text-right text-[10px] font-bold uppercase tracking-wide text-stone-400">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {topProducts.map((p, i) => (
                    <tr key={p.name}>
                      <td className="py-2.5 pl-1 font-bold text-stone-300">#{i + 1}</td>
                      <td className="py-2.5"><div className="flex items-center gap-1.5"><span className="font-medium text-stone-700">{p.name}</span>{i === 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">★</span>}</div></td>
                      <td className="py-2.5 text-right text-stone-500">{p.qty}</td>
                      <td className="py-2.5 pr-1 text-right font-semibold text-stone-800">{formatCLP(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-200">
                    <td colSpan={3} className="pt-2.5 pl-1 text-xs font-bold text-stone-500">Total</td>
                    <td className="pt-2.5 pr-1 text-right text-xs font-bold text-stone-800">{formatCLP(topProducts.reduce((s, p) => s + p.revenue, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Scale size={15} className="text-brand-orange" /><h2 className="text-sm font-bold text-stone-800">Punto de Equilibrio</h2></div>
          {peOrders === 0 ? (
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-xs text-amber-700">Registra costos en <strong>Costos</strong> o gastos en <strong>Precios → Gastos Fijos</strong> para calcular el punto de equilibrio.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl bg-stone-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Pedidos para cubrir costos totales</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-stone-800">{peOrders}</p>
                  <p className="text-sm text-stone-500">pedidos</p>
                </div>
                <p className="mt-0.5 text-[11px] text-stone-400">Ticket promedio {formatCLP(avgTicket)} × {peOrders} = {formatCLP(totalCosts)}</p>
              </div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-stone-500">Actuales: <strong className="text-stone-800">{orderCount}</strong> / {peOrders}</span>
                <span className={cn('font-bold', peAlcanzado ? 'text-emerald-600' : 'text-brand-orange')}>{peProgress}%{peAlcanzado ? ' ✓' : ''}</span>
              </div>
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-stone-100">
                <motion.div className={cn('h-full rounded-full', peAlcanzado ? 'bg-emerald-500' : 'bg-brand-orange')}
                  initial={{ width: 0 }} animate={{ width: `${peProgress}%` }} transition={{ duration: 0.8, delay: 0.65 }} />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-stone-50 px-3 py-2.5 text-center">
                  <p className="text-xl font-bold text-stone-800">{Math.ceil(peOrders / 4)}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">por semana</p>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-2.5 text-center">
                  <p className="text-xl font-bold text-stone-800">{Math.ceil(peOrders / 30)}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">por día</p>
                </div>
              </div>
            </>
          )}
          <div className="rounded-xl border border-stone-100 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Estado de Resultados</p>
            <ResumenRow label="Ingresos brutos"        value={formatCLP(totalRevenue)}             cls="text-stone-800" />
            <ResumenRow label="− Costo mercadería"     value={formatCLP(compras)}                  cls="text-stone-500" />
            <ResumenRow label="= Ganancia bruta"       value={formatCLP(ganBruta)}                 cls={ganBruta >= 0 ? 'text-emerald-600' : 'text-red-500'} />
            <ResumenRow label="− Gastos operacionales" value={formatCLP(gastosOp)}                 cls="text-stone-500" />
            {totalGastosFijos > 0 && <ResumenRow label="− Gastos fijos" value={formatCLP(Math.round(totalGastosFijos))} cls="text-stone-500" />}
            <div className="mt-1 flex items-center justify-between rounded-lg bg-stone-50 px-2 py-2 text-xs">
              <span className="font-bold text-stone-700">= Ganancia neta</span>
              <span className={cn('font-bold text-sm', ganNeta >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatCLP(ganNeta)}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
