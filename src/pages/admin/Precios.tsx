import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Home, Zap, Droplets, Phone, Wifi, Users, FileText,
  ShieldCheck, Megaphone, Calculator, Truck, Wrench,
  Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle,
  Tag, Edit3, Check, X, TrendingUp, BarChart3, Package, BookOpen, Link2,
} from 'lucide-react';
import { formatCLP } from '../../lib/orders';
import { cn } from '../../lib/utils';
import { Product } from '../../types';
import { loadProducts, upsertProduct } from '../../lib/products';
import {
  type Frecuencia, type GastoFijo, type ProductoCosto,
  loadGastosFijos, saveGastosFijos, deleteGastoFijo,
  loadProductosCosto, upsertProductoCosto, deleteProductoCosto,
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
const EXTRA_PRESETS = ['Transporte', 'Bolsa', 'Embalaje', 'Pérdida extra'];

const TABS = [
  { key: 'gastos',    label: 'Gastos Fijos',      Icon: Home },
  { key: 'productos', label: 'Costos & Márgenes', Icon: Tag },
  { key: 'resumen',   label: 'Resumen',            Icon: BarChart3 },
] as const;
type TabKey = typeof TABS[number]['key'];

const EMPTY_GASTO = { name: '', amount: '', frecuencia: 'mensual' as Frecuencia };

/* ─────────────────────────────────────────────────────────
   ProductCard — SINCRONIZADO con el catálogo:
   - El producto viene del catálogo real (products); aquí solo se
     agregan sus datos de costo.
   - El precio de venta ES products.price: cambiarlo aquí lo cambia
     en la tienda que ven los clientes.
───────────────────────────────────────────────────────── */
interface ProductCardProps {
  prod: Product;
  costo?: ProductoCosto;
  totalGastosMensual: number;
  onSaveCosto: (c: ProductoCosto) => void;
  onPriceChange: (prodId: string, price: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ prod, costo, totalGastosMensual, onSaveCosto, onPriceChange }) => {
  const [simPrice,     setSimPrice]     = useState('');
  const [showExtras,   setShowExtras]   = useState(false);
  const [extraForm,    setExtraForm]    = useState({ name: '', amount: '' });
  const [editCompra,   setEditCompra]   = useState(false);
  const [compraForm,   setCompraForm]   = useState({
    purchaseCost: costo ? String(costo.purchaseCost) : '',
    bulkQty: costo ? String(costo.bulkQty) : '',
    bulkUnit: costo?.bulkUnit ?? 'saco',
  });
  const [compraError, setCompraError] = useState('');

  const saveCompra = () => {
    const cost = Number(compraForm.purchaseCost);
    const qty  = Number(compraForm.bulkQty);
    if (!cost || cost <= 0 || !qty || qty <= 0) {
      setCompraError('Ingresa costo y cantidad válidos.');
      return;
    }
    setCompraError('');
    onSaveCosto({
      id: prod.id,
      name: prod.name,
      purchaseCost: cost,
      bulkUnit: compraForm.bulkUnit,
      bulkQty: qty,
      sellUnit: prod.unit,
      merma: costo?.merma ?? 0,
      extraCosts: costo?.extraCosts ?? [],
      sellPrice: prod.price,
    });
    setEditCompra(false);
  };

  /* ── Sin datos de costo: tarjeta de configuración ── */
  if (!costo) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-stone-800">{prod.name}</p>
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Falta costo
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-400">
            Vendiendo a {formatCLP(prod.price)}/{prod.unit} — sin saber tu costo, no hay margen que calcular.
          </p>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-xs font-semibold text-stone-600">¿Cómo lo compras?</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-600">Costo total ($)</label>
              <input type="number" placeholder="10000" min={1} inputMode="numeric"
                value={compraForm.purchaseCost}
                onChange={e => setCompraForm(f => ({ ...f, purchaseCost: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-600">Unidad de compra</label>
              <select value={compraForm.bulkUnit}
                onChange={e => setCompraForm(f => ({ ...f, bulkUnit: e.target.value }))}
                className="input-field">
                {BULK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-stone-600">
                ¿Cuántos {prod.unit} trae?
              </label>
              <input type="number" placeholder="25" min={0.1} step={0.1} inputMode="decimal"
                value={compraForm.bulkQty}
                onChange={e => setCompraForm(f => ({ ...f, bulkQty: e.target.value }))}
                className="input-field" />
            </div>
          </div>
          {compraError && <p className="text-xs text-red-500">{compraError}</p>}
          <button type="button" onClick={saveCompra}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95">
            <Check size={15} /> Guardar costo y calcular margen
          </button>
        </div>
      </div>
    );
  }

  /* ── Con datos: métricas en base al precio REAL del catálogo ── */
  const p: ProductoCosto = { ...costo, name: prod.name, sellUnit: prod.unit, sellPrice: prod.price };

  const { usableQty, baseCPU, extraTotal, realCPU, profit, margin } = calcMetrics(p);
  const info = getMargenInfo(margin);
  const onUpdate = onSaveCosto;

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

  // El precio de venta vive en el CATÁLOGO: cambiarlo aquí lo cambia en la tienda.
  function setSell(v: number) { if (v > 0) onPriceChange(prod.id, Math.round(v)); }
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
      <div className="border-b border-stone-100 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-stone-800">{p.name}</p>
          <button onClick={() => { setEditCompra(v => !v); setCompraError(''); }}
            title="Editar datos de compra"
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition',
              editCompra ? 'bg-stone-100 text-stone-600' : 'text-brand-green hover:bg-brand-green/10'
            )}>
            {editCompra ? <X size={11} /> : <Edit3 size={11} />}
            {editCompra ? 'Cerrar' : 'Compra'}
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-stone-400">
          Compras a {formatCLP(p.purchaseCost)}/{p.bulkUnit} ({p.bulkQty} {p.sellUnit})
          {p.merma > 0 && ` · merma ${p.merma}%`}
        </p>
        {editCompra && (
          <div className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Costo total ($)" min={1} inputMode="numeric"
                value={compraForm.purchaseCost}
                onChange={e => setCompraForm(f => ({ ...f, purchaseCost: e.target.value }))}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs focus:border-brand-green focus:outline-none" />
              <select value={compraForm.bulkUnit}
                onChange={e => setCompraForm(f => ({ ...f, bulkUnit: e.target.value }))}
                className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-xs focus:border-brand-green focus:outline-none">
                {BULK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" placeholder={`¿Cuántos ${p.sellUnit} trae?`} min={0.1} step={0.1} inputMode="decimal"
                value={compraForm.bulkQty}
                onChange={e => setCompraForm(f => ({ ...f, bulkQty: e.target.value }))}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs focus:border-brand-green focus:outline-none" />
              <button type="button" onClick={saveCompra}
                className="flex items-center justify-center gap-1 rounded-xl bg-brand-green py-2 text-xs font-semibold text-white">
                <Check size={12} /> Guardar
              </button>
            </div>
            {compraError && <p className="mt-1.5 text-xs text-red-500">{compraError}</p>}
          </div>
        )}
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
          <p className="mt-1.5 flex items-center justify-center gap-1 text-center text-[11px] font-semibold text-brand-green">
            <Link2 size={11} />
            Precio real de la tienda — al cambiarlo aquí, cambia para tus clientes
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
/** Para re-vincular filas de costo antiguas (creadas a mano) con el catálogo por nombre. */
function normalizeName(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export const AdminPrecios: React.FC = () => {
  const [tab,         setTab]         = useState<TabKey>('gastos');
  const [gastos,      setGastos]      = useState<GastoFijo[]>([]);
  const [catalogo,    setCatalogo]    = useState<Product[]>([]);
  const [costos,      setCostos]      = useState<Record<string, ProductoCosto>>({});

  const [gastoForm,    setGastoForm]    = useState(EMPTY_GASTO);
  const [gastoError,   setGastoError]   = useState('');
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editForm,     setEditForm]     = useState(EMPTY_GASTO);

  useEffect(() => {
    loadGastosFijos().then(setGastos);

    // Sincronización con el catálogo: los productos vienen de la tienda
    // real. Filas de costo antiguas (creadas a mano, con id propio) se
    // re-vinculan automáticamente por nombre una única vez.
    Promise.all([
      loadProducts().catch(() => [] as Product[]),
      loadProductosCosto(),
    ]).then(([prods, rows]) => {
      setCatalogo(prods);
      const byId: Record<string, ProductoCosto> = {};
      const huerfanas: ProductoCosto[] = [];
      for (const raw of rows) {
        const c = { merma: 0, extraCosts: [], ...raw };
        if (prods.some(pr => pr.id === c.id)) byId[c.id] = c;
        else huerfanas.push(c);
      }
      for (const legacy of huerfanas) {
        const match = prods.find(
          pr => normalizeName(pr.name) === normalizeName(legacy.name) && !byId[pr.id]
        );
        if (match) {
          const migrada: ProductoCosto = {
            ...legacy,
            id: match.id,
            name: match.name,
            sellUnit: match.unit,
            sellPrice: match.price,
          };
          byId[match.id] = migrada;
          upsertProductoCosto(migrada);
          deleteProductoCosto(legacy.id);
        }
      }
      setCostos(byId);
    });
  }, []);

  /* ── Sincronización de costos y precio ── */
  const saveCosto = (c: ProductoCosto) => {
    setCostos(prev => ({ ...prev, [c.id]: c }));
    upsertProductoCosto(c);
  };

  // El precio se escribe en el CATÁLOGO (products.price) con debounce:
  // es el mismo precio que ven los clientes en la tienda.
  const priceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const changePrice = (prodId: string, price: number) => {
    setCatalogo(prev => {
      const next = prev.map(pr => (pr.id === prodId ? { ...pr, price } : pr));
      const updated = next.find(pr => pr.id === prodId);
      if (updated) {
        clearTimeout(priceTimers.current[prodId]);
        priceTimers.current[prodId] = setTimeout(() => {
          upsertProduct(updated).catch(err => console.error('precio→catálogo:', err));
        }, 600);
      }
      return next;
    });
  };

  const sinCosto = useMemo(
    () => catalogo.filter(pr => !costos[pr.id]).length,
    [catalogo, costos]
  );

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
            {/* Banner de sincronización con el catálogo */}
            <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <Link2 size={16} className="mt-0.5 shrink-0 text-brand-green" />
                <div>
                  <p className="text-sm font-bold text-stone-800">
                    Sincronizado con tu Catálogo ({catalogo.length}{' '}
                    {catalogo.length === 1 ? 'producto' : 'productos'})
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Estos son los productos reales de tu tienda. El precio que ajustes aquí es el
                    que ven tus clientes.
                    {sinCosto > 0 && (
                      <span className="font-semibold text-amber-700">
                        {' '}{sinCosto} {sinCosto === 1 ? 'producto necesita' : 'productos necesitan'} datos de costo.
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Link to="/admin/catalogo"
                className="flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-brand-green/30 bg-white px-3 py-2 text-xs font-semibold text-brand-green transition hover:bg-brand-green/10 sm:self-center">
                <BookOpen size={13} />
                Agregar productos en Catálogo
              </Link>
            </div>

            {/* Cards de productos (uno por producto del catálogo) */}
            {catalogo.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
                <Package size={32} className="mx-auto mb-3 text-stone-300" />
                <p className="text-sm font-semibold text-stone-500">Tu catálogo está vacío</p>
                <p className="mt-1 text-xs text-stone-400">
                  Agrega productos en{' '}
                  <Link to="/admin/catalogo" className="font-semibold text-brand-green underline underline-offset-2">
                    Catálogo
                  </Link>{' '}
                  y aparecerán aquí automáticamente para calcular sus márgenes.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {catalogo.map(prod => (
                  <ProductCard
                    key={prod.id}
                    prod={prod}
                    costo={costos[prod.id]}
                    totalGastosMensual={totalMensual}
                    onSaveCosto={saveCosto}
                    onPriceChange={changePrice}
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
            {(() => {
              // Solo productos del catálogo CON datos de costo, siempre con
              // el precio real de la tienda.
              const conCosto = catalogo
                .filter(prod => costos[prod.id])
                .map(prod => ({
                  ...costos[prod.id],
                  name: prod.name,
                  sellUnit: prod.unit,
                  sellPrice: prod.price,
                }));
              if (conCosto.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
                    <BarChart3 size={32} className="mx-auto mb-3 text-stone-300" />
                    <p className="text-sm font-semibold text-stone-500">Sin datos de costo aún</p>
                    <p className="mt-1 text-xs text-stone-400">
                      Ve a "Costos & Márgenes" y completa el costo de tus productos del catálogo.
                    </p>
                  </div>
                );
              }
              const all       = conCosto.map(p => ({ p, m: calcMetrics(p) }));
              const avgMargin = all.reduce((s, x) => s + x.m.margin, 0) / all.length;
              const best      = all.reduce((a, b) => a.m.margin > b.m.margin ? a : b);
              const worst     = all.reduce((a, b) => a.m.margin < b.m.margin ? a : b);
              const sorted    = [...all].sort((a, b) => b.m.margin - a.m.margin);

              return (
                <>
                  {sinCosto > 0 && (
                    <p className="mb-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                      {sinCosto} {sinCosto === 1 ? 'producto del catálogo no aparece' : 'productos del catálogo no aparecen'} aquí
                      por falta de datos de costo.
                    </p>
                  )}
                  {/* Métricas */}
                  <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { label: 'Gastos mensuales',  value: formatCLP(Math.round(totalMensual)), sub: `${gastos.length} rubros` },
                      { label: 'Margen promedio',   value: `${Math.round(avgMargin)}%`,          sub: `${conCosto.length} productos` },
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
