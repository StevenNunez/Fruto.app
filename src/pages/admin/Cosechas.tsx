import React, { useEffect, useMemo, useState } from 'react';
import { Printer, ShoppingCart, Package, AlertTriangle, CheckCircle2, Plus, Pencil } from 'lucide-react';
import { Order } from '../../types';
import { loadProducts } from '../../lib/products';
import { loadOrders } from '../../lib/orders';
import { loadStockInit, setStock, orderReservesStock } from '../../lib/stock';
import { Product } from '../../types';
import { cn } from '../../lib/utils';

type StockInit = Record<string, number>;

type ProductRow = Product & {
  initialStock: number; demand: number; remaining: number;
  status: 'abundante' | 'normal' | 'bajo' | 'agotado' | 'sinstock';
};

const STATUS_META = {
  abundante: { label: 'Abundante', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  normal:    { label: 'Normal',    dot: 'bg-blue-400',    text: 'text-blue-700',    bg: 'bg-blue-50' },
  bajo:      { label: 'Bajo',      dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50' },
  agotado:   { label: 'Agotado',   dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50' },
  sinstock:  { label: 'Sin datos', dot: 'bg-stone-300',   text: 'text-stone-500',   bg: 'bg-stone-100' },
};

function getStatus(initialStock: number, remaining: number): ProductRow['status'] {
  if (initialStock <= 0) return 'sinstock';
  if (remaining <= 0) return 'agotado';
  const pct = remaining / initialStock;
  if (pct < 0.25) return 'bajo';
  if (pct < 0.6) return 'normal';
  return 'abundante';
}

function buildPrintHtml(rows: ProductRow[], date: string): string {
  const shoppingRows = rows.filter((r) => r.status === 'agotado' || r.status === 'bajo' || (r.status === 'sinstock' && r.demand > 0));
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Lista de Compras · Fruto.app</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,sans-serif;padding:32px;color:#111;font-size:14px}
  h1{font-size:22px;font-weight:800;margin-bottom:4px}
  .sub{color:#666;font-size:12px;margin-bottom:28px}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#888;border-bottom:2px solid #eee}
  td{padding:12px 10px;border-bottom:1px solid #f0f0f0}
  .right{text-align:right}.center{text-align:center}.bold{font-weight:700}.product{font-weight:600}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
  .red{background:#fee2e2;color:#dc2626}.orange{background:#fff7ed;color:#ea580c}.gray{background:#f1f5f9;color:#64748b}
  .buy{color:#2D6A4F;font-weight:800;font-size:15px}
  .footer{margin-top:28px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:16px}
  .ingreso-col{width:120px;background:#f0fdf4;border-left:2px solid #bbf7d0}
  .ingreso-label{font-size:10px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
  .ingreso-box{width:100%;border:1px solid #86efac;border-radius:4px;padding:4px 6px;font-size:13px;color:#111}
  @media print{body{padding:16px}}
</style>
</head>
<body>
<h1>Lista de Compras</h1>
<p class="sub">Fruto.app · ${date} · ${shoppingRows.length} producto${shoppingRows.length !== 1 ? 's' : ''} por reponer · Solo pedidos activos</p>
<table>
<thead>
  <tr>
    <th>Producto</th><th class="right">Pedidos activos</th><th class="right">Tengo ahora</th>
    <th class="right">Necesito comprar</th><th class="center">Estado</th>
    <th class="ingreso-col ingreso-label">Ingresé (anotar)</th>
  </tr>
</thead>
<tbody>
${shoppingRows.map((r) => {
  const toBuy = r.status === 'sinstock' ? r.demand : Math.max(0, r.demand - Math.max(r.remaining, 0) + Math.ceil(r.demand * 0.3));
  const badge = r.status === 'agotado' ? 'red' : r.status === 'bajo' ? 'orange' : 'gray';
  const label = STATUS_META[r.status].label;
  return `<tr>
    <td class="product">${r.name}</td>
    <td class="right">${r.demand} ${r.unit}</td>
    <td class="right ${r.remaining <= 0 && r.status !== 'sinstock' ? 'red' : ''}" style="${r.remaining <= 0 && r.status !== 'sinstock' ? 'color:#dc2626;font-weight:700' : ''}">${r.status === 'sinstock' ? '—' : `${Math.max(0, r.remaining)} ${r.unit}`}</td>
    <td class="right buy">${toBuy} ${r.unit}</td>
    <td class="center"><span class="badge ${badge}">${label.toUpperCase()}</span></td>
    <td class="ingreso-col"><input class="ingreso-box" type="text" placeholder="0 ${r.unit}" /></td>
  </tr>`;
}).join('')}
</tbody>
</table>
<div class="footer">Generado por Fruto.app · Pedidos activos: Pendiente + Preparando + En camino</div>
</body></html>`;
}

export const AdminCosechas: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stockInit, setStockInit] = useState<StockInit>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [ingresando, setIngresando] = useState<string | null>(null);
  const [ingresoVal, setIngresoVal] = useState('');

  useEffect(() => {
    loadProducts().then(setProducts).catch(() => setProducts([]));
    loadOrders().then(setOrders);
    loadStockInit().then(setStockInit);
  }, []);

  // Misma regla que stock_remaining() en la BD: no cuentan entregados,
  // rechazados ni pedidos MP abandonados.
  const demand = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of orders.filter(orderReservesStock)) {
      for (const item of order.items) map[item.id] = (map[item.id] ?? 0) + item.quantity;
    }
    return map;
  }, [orders]);

  const rows: ProductRow[] = useMemo(() =>
    products.map((p) => {
      const initial = stockInit[p.id] ?? 0;
      const dem = demand[p.id] ?? 0;
      const remaining = initial - dem;
      return { ...p, initialStock: initial, demand: dem, remaining, status: getStatus(initial, remaining) };
    }),
    [products, demand, stockInit]
  );

  const needsRestock = rows.filter((r) => r.status === 'agotado' || r.status === 'bajo');
  const noData = rows.filter((r) => r.status === 'sinstock' && r.demand > 0);
  const activeOrders = orders.filter(orderReservesStock);

  // LA LISTA DE COMPRAS DE LA MAÑANA: cuánto falta comprar para cumplir
  // todos los pedidos activos, agregado por producto (sin revisar pedido
  // por pedido). faltante = demanda - lo que tengo; sugerido = +30% colchón.
  const paraComprar = useMemo(
    () =>
      rows
        .map((r) => {
          const disponible = r.status === 'sinstock' ? 0 : Math.max(0, r.initialStock);
          const faltante = Math.max(0, r.demand - disponible);
          return { ...r, faltante, sugerido: Math.ceil(faltante * 1.3) };
        })
        .filter((r) => r.faltante > 0)
        .sort((a, b) => b.faltante - a.faltante),
    [rows]
  );

  // Stock bajo sin faltante urgente: conviene reponer aunque alcance hoy.
  const stockBajo = rows.filter(
    (r) => (r.status === 'bajo' || r.status === 'agotado') && !paraComprar.some((c) => c.id === r.id)
  );

  const commitEdit = (id: string) => {
    const val = parseFloat(inputVal);
    const newVal = isNaN(val) || val < 0 ? 0 : val;
    setStockInit((prev) => ({ ...prev, [id]: newVal }));
    setStock(id, newVal).catch(console.error);
    setEditing(null); setInputVal('');
  };

  const commitIngreso = (id: string) => {
    const val = parseFloat(ingresoVal);
    if (!isNaN(val) && val > 0) {
      const newVal = (stockInit[id] ?? 0) + val;
      setStockInit((prev) => ({ ...prev, [id]: newVal }));
      setStock(id, newVal).catch(console.error);
    }
    setIngresando(null); setIngresoVal('');
  };

  const handlePrint = () => {
    const date = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const html = buildPrintHtml(rows, date.charAt(0).toUpperCase() + date.slice(1));
    const win = window.open('', '_blank', 'width=860,height=680');
    if (!win) return;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Compras del día e inventario</h1>
          <p className="mt-1 text-sm text-stone-500">
            Lo primero es lo que te falta comprar esta mañana para cumplir todos los pedidos —
            sumado por producto, sin revisar pedido por pedido.
          </p>
        </div>
        <button type="button" onClick={handlePrint}
          className="flex shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-stone-400 active:scale-95">
          <Printer size={15} />Imprimir lista de compras
        </button>
      </div>

      {/* ══ QUÉ COMPRAR ESTA MAÑANA ══ */}
      {paraComprar.length > 0 ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-brand-orange/30 bg-white">
          <div className="border-b border-brand-orange/20 bg-brand-orange/5 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={17} className="text-brand-orange" />
              <h2 className="text-base font-bold text-stone-800">Qué comprar esta mañana</h2>
            </div>
            <p className="mt-0.5 text-xs text-stone-500">
              {activeOrders.length} {activeOrders.length === 1 ? 'pedido activo espera' : 'pedidos activos esperan'} estos
              productos. El sugerido incluye un 30% de colchón.
            </p>
          </div>
          <div className="divide-y divide-stone-100">
            {paraComprar.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                  {r.image ? (
                    <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package size={16} className="text-stone-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-800">{r.name}</p>
                  <p className="text-xs text-stone-400">
                    Pedido: {r.demand} {r.unit} · Tienes:{' '}
                    {r.status === 'sinstock' ? 'sin registrar' : `${Math.max(0, r.initialStock)} ${r.unit}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-brand-orange">
                    {r.faltante} {r.unit}
                  </p>
                  <p className="text-[11px] text-stone-400">sugerido: {r.sugerido} {r.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-800">No necesitas comprar nada urgente</p>
            <p className="text-xs text-emerald-700">
              Tu stock alcanza para todos los pedidos activos
              {activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Stock bajo (sin urgencia, pero conviene reponer) */}
      {stockBajo.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-bold text-amber-800">Aprovecha de reponer (stock bajo)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {stockBajo.map((r) => (
              <span key={r.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                {r.name} · quedan {Math.max(0, r.remaining)} {r.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={cn('rounded-2xl border px-4 py-3', needsRestock.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
          <div className="flex items-center gap-2">
            {needsRestock.length > 0 ? <AlertTriangle size={15} className="text-amber-600" /> : <CheckCircle2 size={15} className="text-emerald-600" />}
            <p className={cn('text-sm font-bold', needsRestock.length > 0 ? 'text-amber-800' : 'text-emerald-800')}>
              {needsRestock.length > 0 ? `${needsRestock.length} producto${needsRestock.length !== 1 ? 's' : ''} por reponer` : 'Stock al día'}
            </p>
          </div>
          {needsRestock.length > 0 && <p className="mt-0.5 text-xs text-amber-700">{needsRestock.map((r) => r.name).join(', ')}</p>}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={15} className="text-brand-green" />
            <p className="text-sm font-bold text-stone-800">{activeOrders.length} pedidos activos</p>
          </div>
          <p className="mt-0.5 text-xs text-stone-400">Pendiente + Preparando + En camino</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-stone-500" />
            <p className="text-sm font-bold text-stone-800">{products.length} productos en catálogo</p>
          </div>
          {noData.length > 0 && <p className="mt-0.5 text-xs text-amber-600">{noData.length} con demanda pero sin stock registrado</p>}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-400">
        <span className="flex items-center gap-1.5"><Pencil size={11} />Clic en el valor para <strong className="text-stone-600">establecer</strong> cantidad exacta</span>
        <span className="flex items-center gap-1.5"><Plus size={11} />Botón verde para <strong className="text-stone-600">sumar ingreso</strong> recibido</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="hidden grid-cols-[1fr_180px_110px_110px_130px] border-b border-stone-100 bg-stone-50 px-4 py-2.5 sm:grid">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Producto</span>
          <span className="text-right text-[10px] font-bold uppercase tracking-wider text-stone-400">Tengo ahora</span>
          <span className="text-right text-[10px] font-bold uppercase tracking-wider text-stone-400">Pedidos activos</span>
          <span className="text-right text-[10px] font-bold uppercase tracking-wider text-stone-400">Me queda</span>
          <span className="text-center text-[10px] font-bold uppercase tracking-wider text-stone-400">Estado</span>
        </div>
        <div className="divide-y divide-stone-100">
          {rows.map((row) => {
            const meta = STATUS_META[row.status];
            const isEditing = editing === row.id;
            const isIngresando = ingresando === row.id;
            return (
              <div key={row.id} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_180px_110px_110px_130px]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    {row.image ? <img src={row.image} alt={row.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Package size={16} className="text-stone-300" /></div>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-800">{row.name}</p>
                    <p className="text-[10px] text-stone-400">{row.category} · {row.unit}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input type="number" min={0} step={0.5} value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                        onBlur={() => commitEdit(row.id)} onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(row.id); if (e.key === 'Escape') setEditing(null); }}
                        autoFocus className="w-20 rounded-lg border border-brand-green/40 bg-brand-green/5 px-2 py-1 text-right text-sm font-bold text-stone-800 outline-none" />
                      <span className="text-xs text-stone-400">{row.unit}</span>
                    </div>
                  ) : isIngresando ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-brand-orange">+</span>
                      <input type="number" min={0} step={0.5} value={ingresoVal} onChange={(e) => setIngresoVal(e.target.value)}
                        onBlur={() => commitIngreso(row.id)} onKeyDown={(e) => { if (e.key === 'Enter') commitIngreso(row.id); if (e.key === 'Escape') setIngresando(null); }}
                        autoFocus placeholder="0" className="w-20 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-2 py-1 text-right text-sm font-bold text-stone-800 outline-none" />
                      <span className="text-xs text-stone-400">{row.unit}</span>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setIngresando(null); setEditing(row.id); setInputVal(row.initialStock > 0 ? String(row.initialStock) : ''); }}
                        title="Establecer cantidad exacta" className="group flex items-center gap-1 rounded-lg px-2 py-1 text-right transition hover:bg-stone-100">
                        <span className={cn('text-sm font-bold', row.initialStock <= 0 ? 'text-stone-300' : 'text-stone-800')}>
                          {row.initialStock > 0 ? `${row.initialStock} ${row.unit}` : '—'}
                        </span>
                        <Pencil size={11} className="text-stone-300 opacity-0 transition group-hover:opacity-100" />
                      </button>
                      <button type="button" onClick={() => { setEditing(null); setIngresando(row.id); setIngresoVal(''); }}
                        title="Registrar ingreso (sumar al stock)"
                        className="flex items-center gap-0.5 rounded-lg border border-brand-green/30 bg-brand-green/5 px-2 py-1 text-[11px] font-bold text-brand-green transition hover:bg-brand-green/10 active:scale-95">
                        <Plus size={11} />Recibí
                      </button>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <span className={cn('text-sm font-bold', row.demand > 0 ? 'text-stone-800' : 'text-stone-300')}>
                    {row.demand > 0 ? `${row.demand} ${row.unit}` : '—'}
                  </span>
                </div>
                <div className="text-right">
                  {row.status === 'sinstock' ? <span className="text-sm text-stone-300">—</span> : (
                    <span className={cn('text-sm font-bold', row.remaining <= 0 ? 'text-red-600' : row.remaining < row.initialStock * 0.25 ? 'text-amber-600' : 'text-stone-800')}>
                      {row.remaining} {row.unit}
                    </span>
                  )}
                </div>
                <div className="flex justify-end sm:justify-center">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold', meta.bg, meta.text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />{meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-stone-400">
        Clic en el valor para establecer · Botón <span className="font-semibold text-brand-green">+ Recibí</span> para sumar lo que llegó hoy
      </p>
    </div>
  );
};
