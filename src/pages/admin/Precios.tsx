import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Home, Zap, Droplets, Phone, Wifi, Users, FileText,
  ShieldCheck, Megaphone, Calculator, Truck, Wrench,
  Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle,
  Tag, Edit3, Check, X, TrendingUp, BarChart3, Package,
} from 'lucide-react';
import { formatCLP } from '../../lib/orders';
import { cn } from '../../lib/utils';
import {
  type Frecuencia, type GastoFijo, type ProductoCosto,
  loadGastosFijos, saveGastosFijos, deleteGastoFijo,
  loadProductosCosto, saveProductosCosto, deleteProductoCosto,
} from '../../lib/precios';

/* ─────────────────────────────────────────────────────────
   Cálculos
───────────────────────────────────────────────────────── */
function calcMetrics(p: ProductoCosto) {
  const usableQty  = p.bulkQty * Math.max(0, 1 - p.merma / 100);
  const baseCPU    = usableQty > 0 ? p.purchaseCost / usableQty : 0;
  const extraTotal = p.extraCosts.reduce((s, e) => s + e.amount, 0);
  const realCPU    = baseCPU + extraTotal;
  const profit     = p.sellPrice - realCPU;
  const margin     = p.sellPrice > 0 ? (profit / p.sellPrice) * 100 : 0;
  return { usableQty, baseCPU, extraTotal, realCPU, profit, margin };
}

function priceForMargin(realCPU: number, pct: number): number {
  return pct >= 100 ? 0 : Math.round(realCPU / (1 - pct / 100));
}

/* ─────────────────────────────────────────────────────────
   Margen UI helpers
───────────────────────────────────────────────────────── */
type MargenInfo = {
  label: string;
  textCls: string;
  bgCls: string;
  barCls: string;
  badgeCls: string;
};
function getMargenInfo(pct: number): MargenInfo {
  if (pct < 0)  return { label: 'Pérdida',    textCls: 'text-red-600',    bgCls: 'bg-red-50',     barCls: 'bg-red-500',     badgeCls: 'bg-red-100 text-red-700' };
  if (pct < 15) return { label: 'Muy bajo',   textCls: 'text-red-500',    bgCls: 'bg-red-50',     barCls: 'bg-red-400',     badgeCls: 'bg-red-50 text-red-600' };
  if (pct < 30) return { label: 'Bajo',       textCls: 'text-amber-600',  bgCls: 'bg-amber-50',   barCls: 'bg-amber-400',   badgeCls: 'bg-amber-50 text-amber-700' };
  if (pct < 45) return { label: 'Bueno',      textCls: 'text-yellow-700', bgCls: 'bg-yellow-50',  barCls: 'bg-yellow-400',  badgeCls: 'bg-yellow-50 text-yellow-700' };
  if (pct < 60) return { label: 'Muy bueno',  textCls: 'text-emerald-600',bgCls: 'bg-emerald-50', barCls: 'bg-emerald-400', badgeCls: 'bg-emerald-50 text-emerald-700' };
  return           { label: 'Excelente',    textCls: 'text-emerald-700',bgCls: 'bg-emerald-50', barCls: 'bg-emerald-500', badgeCls: 'bg-emerald-100 text-emerald-800' };
}

/* ─────────────────────────────────────────────────────────
   Constantes
───────────────────────────────────────────────────────── */
const QUICK_GASTOS = [
  { name: 'Arriendo',   Icon: Home },
  { name: 'Luz',        Icon: Zap },
  { name: 'Agua',       Icon: Droplets },
  { name: 'Teléfono',   Icon: Phone },
  { name: 'Internet',   Icon: Wifi },
  { name: 'Sueldos',    Icon: Users },
  { name: 'Patente',    Icon: FileText },
  { name: 'Seguridad',  Icon: ShieldCheck },
  { name: 'Publicidad', Icon: Megaphone },
  { name: 'Contador',   Icon: Calculator },
  { name: 'Transporte', Icon: Truck },
  { name: 'Mantención', Icon: Wrench },
];

const BULK_UNITS  = ['saco', 'caja', 'bandeja', 'cajón', 'docena', 'kg', 'unidad', 'atado'];
const SELL_UNITS  = ['kg', 'unidad', 'atado', '500g', '250g', 'docena'];
const EXTRA_PRESETS = ['Transporte', 'Bolsa', 'Embalaje', 'Pérdida extra'];

const TABS = [
  { key: 'gastos',    label: 'Gastos Fijos',      Icon: Home },
  { key: 'productos', label: 'Costos & Márgenes', Icon: Tag },
  { key: 'resumen',   label: 'Resumen',            Icon: BarChart3 },
] as const;
type TabKey = typeof TABS[number]['key'];

const EMPTY_GASTO = { name: '', amount: '', frecuencia: 'mensual' as Frecuencia };
const EMPTY_PROD  = { name: '', purchaseCost: '', bulkQty: '', bulkUnit: 'saco', sellUnit: 'kg', sellPrice: '' };

/* ─────────────────────────────────────────────────────────
   ProductCard — maneja su propio estado de simulación
───────────────────────────────────────────────────────── */
interface ProductCardProps {
  producto: ProductoCosto;
  totalGastosMensual: number;
  onUpdate: (p: ProductoCosto) => void;
  onDelete: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ producto: p, totalGastosMensual, onUpdate, onDelete }) => {
  const [simPrice,     setSimPrice]     = useState('');
  const [showExtras,   setShowExtras]   = useState(false);
  const [extraForm,    setExtraForm]    = useState({ name: '', amount: '' });

  const { usableQty, baseCPU, extraTotal, realCPU, profit, margin } = calcMetrics(p);
  const info = getMargenInfo(margin);

  const simNum   = Number(simPrice);
  const simValid = simNum > 0;
  const simProfit = simValid ? simNum - realCPU : 0;
  const simMargin = simValid && simNum > 0 ? (simProfit / simNum) * 100 : 0;
  const simInfo   = simValid ? getMargenInfo(simMargin) : null;

  const peUnits = profit > 0 && totalGastosMensual > 0
    ? Math.ceil(totalGastosMensual / profit) : null;

  const p30 = priceForMargin(realCPU, 30);
  const p40 = priceForMargin(realCPU, 40);
  const p50 = priceForMargin(realCPU, 50);

  const STEP = Math.max(50, Math.round(realCPU * 0.05 / 50) * 50);

  function setSell(v: number) { if (v > 0) onUpdate({ ...p, sellPrice: v }); }
  function setMerma(v: number) { onUpdate({ ...p, merma: Math.min(99, Math.max(0, v)) }); }

  function addExtra() {
    const amount = Number(extraForm.amount);
    if (!extraForm.name.trim() || !amount || amount <= 0) return;
    onUpdate({ ...p, extraCosts: [...p.extraCosts, { id: Date.now().toString(), name: extraForm.name.trim(), amount }] });
    setExtraForm({ name: '', amount: '' });
    setShowExtras(false);
  }
  function removeExtra(id: string) {
    onUpdate({ ...p, extraCosts: p.extraCosts.filter(e => e.id !== id) });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      {/* ── Header del producto ── */}
      <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
        <div>
          <p className="font-bold text-stone-800">{p.name}</p>
          <p className="mt-0.5 text-[11px] text-stone-400">
            {formatCLP(p.purchaseCost)}/{p.bulkUnit} · {p.bulkQty} {p.sellUnit}
            {p.merma > 0 && ` · merma ${p.merma}%`}
          </p>
        </div>
        <button onClick={() => onDelete(p.id)}
          className="mt-0.5 rounded-xl p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-4 p-5">

        {/* ── Merma ── */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-stone-600">Merma / Pérdida natural</label>
              {p.merma > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                  afecta costo
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-stone-700">{p.merma}%</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={50} step={1}
              value={p.merma}
              onChange={e => setMerma(Number(e.target.value))}
              className="flex-1 accent-brand-green h-2 cursor-pointer" />
            <input type="number" min={0} max={99} step={1}
              value={p.merma}
              onChange={e => setMerma(Number(e.target.value))}
              className="w-14 rounded-xl border border-stone-200 px-2 py-1 text-center text-xs font-bold text-stone-800 focus:border-brand-green focus:outline-none" />
          </div>
          {p.merma > 0 && (
            <p className="mt-1 text-[10px] text-amber-700">
              Compraste {p.bulkQty} {p.sellUnit} → vendibles:{' '}
              <strong>{usableQty.toFixed(1)} {p.sellUnit}</strong> · costo sube de{' '}
              {formatCLP(Math.round(p.purchaseCost / p.bulkQty))} a{' '}
              <strong>{formatCLP(Math.round(baseCPU))}/{p.sellUnit}</strong>
            </p>
          )}
        </div>

        {/* ── Costos adicionales ── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-600">Costos adicionales por {p.sellUnit}</p>
            <button onClick={() => setShowExtras(v => !v)}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition',
                showExtras ? 'bg-stone-100 text-stone-600' : 'text-brand-green hover:bg-brand-green/10'
              )}>
              {showExtras ? <X size={10} /> : <Plus size={10} />}
              {showExtras ? 'Cerrar' : 'Agregar'}
            </button>
          </div>

          {showExtras && (
            <div className="mb-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">
              <div className="mb-2 flex flex-wrap gap-1">
                {EXTRA_PRESETS.map(n => (
                  <button key={n} type="button"
                    onClick={() => setExtraForm(f => ({ ...f, name: n }))}
                    className={cn(
                      'rounded-lg border px-2 py-0.5 text-[10px] font-medium transition',
                      extraForm.name === n
                        ? 'border-brand-green bg-brand-green/10 text-brand-green'
                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-100'
                    )}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Nombre"
                  value={extraForm.name}
                  onChange={e => setExtraForm(f => ({ ...f, name: e.target.value }))}
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-brand-green focus:outline-none" />
                <input type="number" placeholder="Monto"
                  min={1} value={extraForm.amount}
                  onChange={e => setExtraForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-24 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs focus:border-brand-green focus:outline-none" />
                <button type="button" onClick={addExtra}
                  className="rounded-xl bg-brand-green px-3 py-1.5 text-white">
                  <Check size={13} />
                </button>
              </div>
            </div>
          )}

          {p.extraCosts.length > 0 ? (
            <div className="space-y-1">
              {p.extraCosts.map(e => (
                <div key={e.id} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-1.5 text-xs">
                  <span className="text-stone-600">{e.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-700">+{formatCLP(e.amount)}/{p.sellUnit}</span>
                    <button onClick={() => removeExtra(e.id)}
                      className="text-stone-400 transition hover:text-red-500">
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !showExtras && (
            <p className="text-[10px] text-stone-400">Sin costos adicionales (transporte, bolsa, etc.)</p>
          )}
        </div>

        {/* ── Desglose de costos ── */}
        <div className="rounded-xl bg-stone-50 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Desglose de costo real
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">
                Base{p.merma > 0 ? ` (con ${p.merma}% merma)` : ''}
              </span>
              <span className="font-semibold text-stone-700">{formatCLP(Math.round(baseCPU))}/{p.sellUnit}</span>
            </div>
            {p.extraCosts.map(e => (
              <div key={e.id} className="flex justify-between">
                <span className="text-stone-500">+ {e.name}</span>
                <span className="font-semibold text-stone-700">{formatCLP(e.amount)}/{p.sellUnit}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-stone-200 pt-1.5 text-sm font-bold">
              <span className="text-stone-800">Costo real total</span>
              <span className="text-stone-900">{formatCLP(Math.round(realCPU))}/{p.sellUnit}</span>
            </div>
          </div>
        </div>

        {/* ── Ajustador de precio ── */}
        <div>
          <p className="mb-2 text-xs font-semibold text-stone-600">Precio de venta</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setSell(p.sellPrice - STEP)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition hover:bg-stone-100">
              <ChevronDown size={18} />
            </button>
            <input type="number" value={p.sellPrice}
              onChange={e => { const v = Number(e.target.value); if (v > 0) setSell(v); }}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-center text-lg font-bold text-stone-800 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/15" />
            <button onClick={() => setSell(p.sellPrice + STEP)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition hover:bg-stone-100">
              <ChevronUp size={18} />
            </button>
            <span className="text-xs text-stone-400">/{p.sellUnit}</span>
          </div>
          <p className="mt-1 text-center text-[10px] text-stone-400">
            Paso: {formatCLP(STEP)} por clic
          </p>
        </div>

        {/* ── Margen actual ── */}
        <div className={cn('rounded-xl p-4', info.bgCls)}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-stone-700">Margen actual</p>
              <p className="mt-0.5 text-[11px] text-stone-500">
                Ganancia:{' '}
                <span className={cn('font-bold', info.textCls)}>
                  {formatCLP(Math.round(profit))}/{p.sellUnit}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className={cn('text-4xl font-bold leading-none', info.textCls)}>
                {Math.round(margin)}%
              </p>
              <span className={cn('mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold', info.badgeCls)}>
                {info.label}
              </span>
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/60">
            <motion.div
              className={cn('h-full rounded-full', info.barCls)}
              animate={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>
        </div>

        {/* ── Alerta margen bajo ── */}
        {margin < 15 && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-[10px] leading-relaxed text-red-600">
              {profit < 0
                ? 'Estás vendiendo a pérdida. '
                : 'Margen muy bajo. '}
              Para 30% necesitas al menos{' '}
              <strong>{formatCLP(p30)}/{p.sellUnit}</strong>.
            </p>
          </div>
        )}

        {/* ── Simulador de precios ── */}
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Simulador — ¿Qué pasa si vendo a…?
          </p>
          <div className="flex items-center gap-2">
            <input type="number"
              placeholder={String(p.sellPrice + STEP)}
              value={simPrice}
              onChange={e => setSimPrice(e.target.value)}
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-800 focus:border-brand-green focus:outline-none" />
            <span className="text-xs text-stone-400">/{p.sellUnit}</span>
            {simPrice && (
              <button onClick={() => setSimPrice('')}
                className="rounded-lg p-1.5 text-stone-400 hover:text-stone-600">
                <X size={12} />
              </button>
            )}
          </div>
          {simValid && simInfo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <p className={cn('text-xl font-bold', simInfo.textCls)}>{Math.round(simMargin)}%</p>
                  <p className="text-[9px] text-stone-400">margen</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <p className={cn('text-lg font-bold', simInfo.textCls)}>{formatCLP(Math.round(simProfit))}</p>
                  <p className="text-[9px] text-stone-400">gan./{p.sellUnit}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', simInfo.badgeCls)}>
                    {simInfo.label}
                  </span>
                  <p className="mt-1 text-[9px] text-stone-400">estado</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Precios sugeridos ── */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Precios sugeridos (un clic para aplicar)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: '30%', price: p30 }, { label: '40%', price: p40 }, { label: '50%', price: p50 }].map(s => (
              <button key={s.label} onClick={() => setSell(s.price)}
                className={cn(
                  'rounded-xl border px-2 py-2.5 text-center transition',
                  p.sellPrice === s.price
                    ? 'border-brand-green bg-brand-green/10'
                    : 'border-stone-200 bg-stone-50 hover:border-brand-green/30 hover:bg-brand-green/5'
                )}>
                <p className="text-sm font-bold text-stone-800">{formatCLP(s.price)}</p>
                <p className="text-[9px] text-stone-400">{s.label} margen</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Punto de equilibrio ── */}
        <div className="rounded-xl bg-stone-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <TrendingUp size={16} className="mt-0.5 shrink-0 text-brand-green" />
            <div>
              <p className="text-xs font-semibold text-stone-700">Punto de equilibrio mensual</p>
              {peUnits !== null ? (
                <p className="mt-0.5 text-[10px] text-stone-500">
                  Necesitas vender{' '}
                  <strong className="text-stone-800">{peUnits} {p.sellUnit}</strong> de {p.name}
                  {' '}al mes para cubrir los{' '}
                  <strong>{formatCLP(Math.round(totalGastosMensual))}</strong> en gastos fijos.
                </p>
              ) : totalGastosMensual === 0 ? (
                <p className="mt-0.5 text-[10px] text-stone-400">
                  Agrega gastos fijos en la pestaña "Gastos" para calcularlo.
                </p>
              ) : (
                <p className="mt-0.5 text-[10px] text-red-500">
                  No calculable — el precio de venta no cubre el costo real.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Página principal
───────────────────────────────────────────────────────── */
export const AdminPrecios: React.FC = () => {
  const [tab,         setTab]         = useState<TabKey>('gastos');
  const [gastos,      setGastos]      = useState<GastoFijo[]>([]);
  const [productos,   setProductos]   = useState<ProductoCosto[]>([]);
  const [showAddProd, setShowAddProd] = useState(false);

  const [gastoForm,    setGastoForm]    = useState(EMPTY_GASTO);
  const [gastoError,   setGastoError]   = useState('');
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editForm,     setEditForm]     = useState(EMPTY_GASTO);

  const [prodForm,  setProdForm]  = useState(EMPTY_PROD);
  const [prodError, setProdError] = useState('');

  useEffect(() => {
    loadGastosFijos().then(setGastos);
    loadProductosCosto().then((raw) => setProductos(raw.map(p => ({ merma: 0, extraCosts: [], ...p }))));
  }, []);

  const totalMensual = useMemo(() =>
    gastos.reduce((s, g) => s + (g.frecuencia === 'anual' ? g.amount / 12 : g.amount), 0),
    [gastos]);

  /* ── Gastos CRUD ── */
  function handleAddGasto(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(gastoForm.amount);
    if (!gastoForm.name.trim()) { setGastoError('Ingresa un nombre.'); return; }
    if (!amount || amount <= 0) { setGastoError('Monto inválido.'); return; }
    setGastoError('');
    const next = [...gastos, { id: Date.now().toString(), name: gastoForm.name.trim(), amount, frecuencia: gastoForm.frecuencia }];
    setGastos(next); saveGastosFijos(next);
    setGastoForm(EMPTY_GASTO);
  }

  function startEdit(g: GastoFijo) {
    setEditingId(g.id);
    setEditForm({ name: g.name, amount: String(g.amount), frecuencia: g.frecuencia });
  }
  function saveEdit(id: string) {
    const amount = Number(editForm.amount);
    if (!editForm.name.trim() || !amount || amount <= 0) return;
    const next = gastos.map(g => g.id === id ? { ...g, name: editForm.name.trim(), amount, frecuencia: editForm.frecuencia } : g);
    setGastos(next); saveGastosFijos(next);
    setEditingId(null);
  }
  function deleteGasto(id: string) {
    setGastos(gastos.filter(g => g.id !== id));
    deleteGastoFijo(id);
  }

  /* ── Productos CRUD ── */
  function handleAddProducto(e: React.FormEvent) {
    e.preventDefault();
    const cost = Number(prodForm.purchaseCost);
    const qty  = Number(prodForm.bulkQty);
    const sell = Number(prodForm.sellPrice);
    if (!prodForm.name.trim()) { setProdError('Ingresa el nombre.'); return; }
    if (!cost || cost <= 0)    { setProdError('Ingresa el costo.'); return; }
    if (!qty  || qty  <= 0)    { setProdError('Ingresa la cantidad.'); return; }
    if (!sell || sell <= 0)    { setProdError('Ingresa el precio de venta.'); return; }
    setProdError('');
    const next = [
      ...productos,
      { id: Date.now().toString(), name: prodForm.name.trim(), purchaseCost: cost, bulkUnit: prodForm.bulkUnit, bulkQty: qty, sellUnit: prodForm.sellUnit, merma: 0, extraCosts: [], sellPrice: sell },
    ];
    setProductos(next); saveProductosCosto(next);
    setProdForm(EMPTY_PROD);
    setShowAddProd(false);
  }

  const updateProducto = useCallback((updated: ProductoCosto) => {
    setProductos(prev => {
      const next = prev.map(p => p.id === updated.id ? updated : p);
      saveProductosCosto(next);
      return next;
    });
  }, []);

  const deleteProducto = useCallback((id: string) => {
    setProductos(prev => prev.filter(p => p.id !== id));
    deleteProductoCosto(id);
  }, []);

  /* ── Preview formulario ── */
  const formPreview = useMemo(() => {
    const cost = Number(prodForm.purchaseCost);
    const qty  = Number(prodForm.bulkQty);
    const sell = Number(prodForm.sellPrice);
    if (!cost || !qty || qty <= 0) return null;
    const cpu = cost / qty;
    const pct = sell > 0 ? ((sell - cpu) / sell) * 100 : null;
    return { cpu, pct };
  }, [prodForm.purchaseCost, prodForm.bulkQty, prodForm.sellPrice]);

  return (
    <div className="p-4 md:p-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Costos & Precios</h1>
        <p className="mt-1 text-sm text-stone-500">
          Gastos fijos, costos reales por producto (con merma), simulador de precios y punto de equilibrio.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1.5 rounded-2xl border border-stone-200 bg-stone-50 p-1.5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all md:text-sm',
              tab === t.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}>
            <t.Icon size={13} />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">
              {t.key === 'gastos' ? 'Gastos' : t.key === 'productos' ? 'Productos' : 'Resumen'}
            </span>
          </button>
        ))}
      </div>

      {/* ════ Tab content ════ */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >

        {/* ══════════════════════════════════════════
            TAB: GASTOS FIJOS
        ══════════════════════════════════════════ */}
        {tab === 'gastos' && (
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Formulario */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-stone-800">Agregar Gasto</h2>

              <div className="mb-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">Acceso rápido</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_GASTOS.map(({ name, Icon }) => (
                    <button key={name} type="button"
                      onClick={() => setGastoForm(f => ({ ...f, name }))}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all',
                        gastoForm.name === name
                          ? 'border-brand-green bg-brand-green/10 text-brand-green'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      )}>
                      <Icon size={11} />{name}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddGasto} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Nombre</label>
                  <input type="text" placeholder="Ej: Arriendo local, Cuenta de agua…"
                    value={gastoForm.name}
                    onChange={e => setGastoForm(f => ({ ...f, name: e.target.value }))}
                    className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-600">Monto ($)</label>
                    <input type="number" placeholder="0" min={1}
                      value={gastoForm.amount}
                      onChange={e => setGastoForm(f => ({ ...f, amount: e.target.value }))}
                      className="input-field" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-600">Frecuencia</label>
                    <select value={gastoForm.frecuencia}
                      onChange={e => setGastoForm(f => ({ ...f, frecuencia: e.target.value as Frecuencia }))}
                      className="input-field">
                      <option value="mensual">Mensual</option>
                      <option value="anual">Anual (÷ 12)</option>
                    </select>
                  </div>
                </div>
                {gastoError && <p className="text-xs text-red-500">{gastoError}</p>}
                <button type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                  <Plus size={15} /> Agregar gasto
                </button>
              </form>
            </div>

            {/* Lista de gastos */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total mensual</p>
                <p className="mt-1 text-3xl font-bold text-stone-800">{formatCLP(Math.round(totalMensual))}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'} registrados
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-stone-800">Gastos Registrados</h2>
                {gastos.length === 0 ? (
                  <p className="py-6 text-center text-xs text-stone-400">
                    Sin gastos aún. Usa los botones de acceso rápido.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {gastos.map(g => {
                      const isEditing = editingId === g.id;
                      return (
                        <div key={g.id}>
                          {isEditing ? (
                            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-brand-green/30 bg-brand-green/5 p-2">
                              <input type="text" value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:outline-none" />
                              <input type="number" value={editForm.amount}
                                onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-24 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:outline-none" />
                              <select value={editForm.frecuencia}
                                onChange={e => setEditForm(f => ({ ...f, frecuencia: e.target.value as Frecuencia }))}
                                className="rounded-lg border border-stone-200 bg-white px-1 py-1 text-xs focus:outline-none">
                                <option value="mensual">Mensual</option>
                                <option value="anual">Anual</option>
                              </select>
                              <button onClick={() => saveEdit(g.id)}
                                className="rounded-lg bg-brand-green p-1.5 text-white"><Check size={13} /></button>
                              <button onClick={() => setEditingId(null)}
                                className="rounded-lg bg-stone-200 p-1.5 text-stone-600"><X size={13} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-sm font-medium text-stone-800">{g.name}</span>
                                  {g.frecuencia === 'anual' && (
                                    <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">anual</span>
                                  )}
                                </div>
                                {g.frecuencia === 'anual' && (
                                  <p className="text-[10px] text-stone-400">
                                    {formatCLP(Math.round(g.amount / 12))}/mes
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-stone-800">
                                {formatCLP(g.amount)}
                              </span>
                              <button onClick={() => startEdit(g)}
                                className="shrink-0 rounded-lg p-1.5 text-stone-400 transition hover:bg-blue-50 hover:text-blue-500">
                                <Edit3 size={12} />
                              </button>
                              <button onClick={() => deleteGasto(g.id)}
                                className="shrink-0 rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-stone-200 pt-2.5 text-xs font-bold">
                      <span className="text-stone-500">Total mensual</span>
                      <span className="text-stone-800">{formatCLP(Math.round(totalMensual))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: COSTOS & MÁRGENES
        ══════════════════════════════════════════ */}
        {tab === 'productos' && (
          <div>
            {/* Botón agregar */}
            <div className="mb-4">
              <button onClick={() => setShowAddProd(v => !v)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                  showAddProd ? 'bg-stone-100 text-stone-700' : 'bg-brand-green text-white hover:opacity-90'
                )}>
                {showAddProd ? <X size={15} /> : <Plus size={15} />}
                {showAddProd ? 'Cancelar' : 'Agregar producto'}
              </button>
            </div>

            {/* Formulario agregar */}
            {showAddProd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-5">
                  <h2 className="mb-4 text-sm font-bold text-stone-800">Nuevo Producto</h2>
                  <form onSubmit={handleAddProducto} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-stone-600">Producto</label>
                      <input type="text" placeholder="Ej: Papa, Tomate, Palta…"
                        value={prodForm.name}
                        onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))}
                        className="input-field" />
                    </div>
                    <div className="rounded-xl bg-white/80 p-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">¿Cómo lo compraste?</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-stone-600">Costo total ($)</label>
                          <input type="number" placeholder="10000" min={1}
                            value={prodForm.purchaseCost}
                            onChange={e => setProdForm(f => ({ ...f, purchaseCost: e.target.value }))}
                            className="input-field" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-stone-600">Unidad de compra</label>
                          <select value={prodForm.bulkUnit}
                            onChange={e => setProdForm(f => ({ ...f, bulkUnit: e.target.value }))}
                            className="input-field">
                            {BULK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-stone-600">Cantidad incluida</label>
                          <input type="number" placeholder="25" min={0.1} step={0.1}
                            value={prodForm.bulkQty}
                            onChange={e => setProdForm(f => ({ ...f, bulkQty: e.target.value }))}
                            className="input-field" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-stone-600">Unidad de venta</label>
                          <select value={prodForm.sellUnit}
                            onChange={e => setProdForm(f => ({ ...f, sellUnit: e.target.value }))}
                            className="input-field">
                            {SELL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                      {formPreview && (
                        <div className="mt-2 rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-2 text-xs text-brand-green">
                          Costo base por <strong>{prodForm.sellUnit}</strong>:{' '}
                          <strong>{formatCLP(Math.round(formPreview.cpu))}</strong>
                          <span className="text-stone-400"> · Ajustarás merma y extras después</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-stone-600">
                        Precio de venta (por {prodForm.sellUnit || '…'})
                      </label>
                      <input type="number" placeholder="800" min={1}
                        value={prodForm.sellPrice}
                        onChange={e => setProdForm(f => ({ ...f, sellPrice: e.target.value }))}
                        className="input-field" />
                    </div>
                    {formPreview?.pct !== null && formPreview?.pct !== undefined && (
                      <div className={cn('rounded-xl p-3', getMargenInfo(formPreview.pct).bgCls)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-stone-700">Margen estimado inicial</p>
                            <p className="text-[10px] text-stone-400">* Sin merma ni extras aún</p>
                          </div>
                          <p className={cn('text-2xl font-bold', getMargenInfo(formPreview.pct).textCls)}>
                            {Math.round(formPreview.pct)}%
                          </p>
                        </div>
                      </div>
                    )}
                    {prodError && <p className="text-xs text-red-500">{prodError}</p>}
                    <button type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                      <Plus size={15} /> Agregar y configurar
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Cards de productos */}
            {productos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
                <Package size={32} className="mx-auto mb-3 text-stone-300" />
                <p className="text-sm font-semibold text-stone-500">Sin productos aún</p>
                <p className="mt-1 text-xs text-stone-400">
                  Haz clic en "Agregar producto" para empezar a calcular márgenes.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {productos.map(p => (
                  <ProductCard
                    key={p.id}
                    producto={p}
                    totalGastosMensual={totalMensual}
                    onUpdate={updateProducto}
                    onDelete={deleteProducto}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: RESUMEN
        ══════════════════════════════════════════ */}
        {tab === 'resumen' && (
          <div>
            {productos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
                <BarChart3 size={32} className="mx-auto mb-3 text-stone-300" />
                <p className="text-sm font-semibold text-stone-500">Sin productos para resumir</p>
                <p className="mt-1 text-xs text-stone-400">Ve a "Costos & Márgenes" para agregar productos.</p>
              </div>
            ) : (() => {
              const all       = productos.map(p => ({ p, m: calcMetrics(p) }));
              const avgMargin = all.reduce((s, x) => s + x.m.margin, 0) / all.length;
              const best      = all.reduce((a, b) => a.m.margin > b.m.margin ? a : b);
              const worst     = all.reduce((a, b) => a.m.margin < b.m.margin ? a : b);
              const sorted    = [...all].sort((a, b) => b.m.margin - a.m.margin);

              return (
                <>
                  {/* Métricas */}
                  <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { label: 'Gastos mensuales',  value: formatCLP(Math.round(totalMensual)), sub: `${gastos.length} rubros` },
                      { label: 'Margen promedio',   value: `${Math.round(avgMargin)}%`,          sub: `${productos.length} productos` },
                      { label: 'Mejor margen',      value: best.p.name,   sub: `${Math.round(best.m.margin)}%`,  highlight: true },
                      { label: 'Menor margen',      value: worst.p.name,  sub: `${Math.round(worst.m.margin)}%`, warn: worst.m.margin < 30 },
                    ].map(c => (
                      <div key={c.label} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{c.label}</p>
                        <p className="mt-1 text-base font-bold text-stone-800 md:text-lg">{c.value}</p>
                        <p className={cn('text-xs',
                          'highlight' in c && c.highlight ? 'text-emerald-600' :
                          'warn' in c && c.warn ? 'text-amber-600' : 'text-stone-500'
                        )}>{c.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tabla comparativa */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-bold text-stone-800">Comparativa de Productos</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-stone-100">
                            {['Producto', 'Costo base', 'Merma', 'Extras', 'Costo real', 'Precio venta', 'Margen', 'Ganancia/unidad'].map(h => (
                              <th key={h} className="pb-2.5 pr-4 text-left text-[10px] font-bold uppercase tracking-wide text-stone-400 last:pr-0">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {sorted.map(({ p, m }) => {
                            const info = getMargenInfo(m.margin);
                            return (
                              <tr key={p.id} className="group">
                                <td className="py-3 pr-4 font-semibold text-stone-800">{p.name}</td>
                                <td className="py-3 pr-4 text-stone-500">{formatCLP(Math.round(p.purchaseCost / p.bulkQty))}</td>
                                <td className="py-3 pr-4">
                                  {p.merma > 0 ? (
                                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                                      {p.merma}%
                                    </span>
                                  ) : <span className="text-stone-400">—</span>}
                                </td>
                                <td className="py-3 pr-4 text-stone-500">
                                  {m.extraTotal > 0 ? formatCLP(m.extraTotal) : <span className="text-stone-300">—</span>}
                                </td>
                                <td className="py-3 pr-4 font-semibold text-stone-700">{formatCLP(Math.round(m.realCPU))}</td>
                                <td className="py-3 pr-4 font-bold text-stone-800">{formatCLP(p.sellPrice)}</td>
                                <td className="py-3 pr-4">
                                  <div>
                                    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', info.badgeCls)}>
                                      {Math.round(m.margin)}%
                                    </span>
                                    <p className={cn('mt-0.5 text-[9px]', info.textCls)}>{info.label}</p>
                                  </div>
                                </td>
                                <td className={cn('py-3 font-bold', info.textCls)}>
                                  {formatCLP(Math.round(m.profit))}/{p.sellUnit}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </motion.div>
    </div>
  );
};
