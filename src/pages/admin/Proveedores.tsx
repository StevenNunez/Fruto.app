import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Phone, MapPin, Clock, Pencil, Trash2, X,
  ChevronDown, Search, Truck, StickyNote, ShoppingBag, ArrowUpDown,
} from 'lucide-react';
import { Proveedor, ProveedorProducto } from '../../types';
import { formatCLP } from '../../lib/orders';
import { cn } from '../../lib/utils';

const STORAGE_KEY = 'fruto_proveedores';
const UNITS = ['kg', 'unidad', 'caja', 'bolsa', 'litro', 'atado'];

function loadProveedores(): Proveedor[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Proveedor[]) : [];
  } catch {
    return [];
  }
}

function saveProveedores(data: Proveedor[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const EMPTY_PRODUCTO = { nombre: '', precio: '', unidad: 'kg' };
const EMPTY_FORM = {
  nombre: '',
  telefono: '',
  direccion: '',
  tiempoEntrega: '',
  notas: '',
  ucFecha: '',
  ucMonto: '',
  ucDescripcion: '',
  productos: [{ ...EMPTY_PRODUCTO }],
};
type FormState = typeof EMPTY_FORM;

// ─── Card ────────────────────────────────────────────────────────────────────

const ProveedorCard: React.FC<{
  proveedor: Proveedor;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ proveedor, onEdit, onDelete }) => {
  const [showProducts, setShowProducts] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-stone-800">{proveedor.nombre}</h3>
          {proveedor.direccion && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
              <MapPin size={11} />
              {proveedor.direccion}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={`tel:${proveedor.telefono}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-[#2D6A4F] hover:bg-emerald-100 transition"
            title="Llamar"
          >
            <Phone size={14} />
          </a>
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 transition"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
          <Phone size={10} />
          {proveedor.telefono}
        </span>
        {proveedor.tiempoEntrega && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Clock size={10} />
            {proveedor.tiempoEntrega}
          </span>
        )}
      </div>

      {proveedor.productos.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowProducts(!showProducts)}
            className="flex w-full items-center justify-between text-xs font-semibold text-stone-600 hover:text-stone-800 transition"
          >
            <span className="flex items-center gap-1">
              <ShoppingBag size={11} />
              {proveedor.productos.length} producto{proveedor.productos.length !== 1 ? 's' : ''}
            </span>
            <ChevronDown size={12} className={cn('transition-transform', showProducts && 'rotate-180')} />
          </button>
          {showProducts && (
            <div className="mt-2 space-y-1">
              {proveedor.productos.map((pr, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5">
                  <span className="text-xs text-stone-700">{pr.nombre}</span>
                  <span className="text-xs font-semibold text-stone-800">
                    {formatCLP(pr.precio)}
                    <span className="font-normal text-stone-400">/{pr.unidad}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {proveedor.ultimaCompra && (
        <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Última compra</p>
          <p className="text-xs font-semibold text-amber-800">{formatCLP(proveedor.ultimaCompra.monto)}</p>
          <p className="text-[10px] text-amber-600">
            {new Date(proveedor.ultimaCompra.fecha).toLocaleDateString('es-CL', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
            {proveedor.ultimaCompra.descripcion && ` · ${proveedor.ultimaCompra.descripcion}`}
          </p>
        </div>
      )}

      {proveedor.notas && (
        <div className="flex items-start gap-1.5 rounded-xl bg-stone-50 px-3 py-2">
          <StickyNote size={11} className="mt-0.5 shrink-0 text-stone-400" />
          <p className="text-xs text-stone-500">{proveedor.notas}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const AdminProveedores: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [activeTab, setActiveTab] = useState<'lista' | 'comparar'>('lista');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Proveedor | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, productos: [{ ...EMPTY_PRODUCTO }] });
  const [error, setError] = useState('');
  const [comparaSearch, setComparaSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { setProveedores(loadProveedores()); }, []);

  const allProductNames = useMemo(() => {
    const names = new Set<string>();
    proveedores.forEach(p => p.productos.forEach(pr => names.add(pr.nombre.toLowerCase().trim())));
    return Array.from(names).sort();
  }, [proveedores]);

  const comparaResults = useMemo(() => {
    if (!comparaSearch.trim()) return [];
    const search = comparaSearch.toLowerCase().trim();
    const results: { proveedor: Proveedor; producto: ProveedorProducto }[] = [];
    proveedores.forEach(p => {
      p.productos.forEach(pr => {
        if (pr.nombre.toLowerCase().includes(search)) {
          results.push({ proveedor: p, producto: pr });
        }
      });
    });
    return results.sort((a, b) => a.producto.precio - b.producto.precio);
  }, [proveedores, comparaSearch]);

  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, productos: [{ ...EMPTY_PRODUCTO }] });
    setError('');
    setModalOpen(true);
  }

  function openEdit(p: Proveedor) {
    setEditTarget(p);
    setForm({
      nombre: p.nombre,
      telefono: p.telefono,
      direccion: p.direccion,
      tiempoEntrega: p.tiempoEntrega,
      notas: p.notas ?? '',
      ucFecha: p.ultimaCompra?.fecha ?? '',
      ucMonto: p.ultimaCompra?.monto ? String(p.ultimaCompra.monto) : '',
      ucDescripcion: p.ultimaCompra?.descripcion ?? '',
      productos: p.productos.length > 0
        ? p.productos.map(pr => ({ nombre: pr.nombre, precio: String(pr.precio), unidad: pr.unidad }))
        : [{ ...EMPTY_PRODUCTO }],
    });
    setError('');
    setModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('Ingresa el nombre del proveedor.'); return; }
    if (!form.telefono.trim()) { setError('Ingresa el teléfono.'); return; }

    const productos: ProveedorProducto[] = [];
    for (const pr of form.productos) {
      if (!pr.nombre.trim()) continue;
      const precio = parseFloat(pr.precio);
      if (isNaN(precio) || precio < 0) { setError(`Precio inválido para "${pr.nombre}".`); return; }
      productos.push({ nombre: pr.nombre.trim(), precio, unidad: pr.unidad });
    }

    const ultimaCompra = form.ucFecha && form.ucMonto
      ? { fecha: form.ucFecha, monto: parseFloat(form.ucMonto), descripcion: form.ucDescripcion }
      : undefined;

    const proveedor: Proveedor = {
      id: editTarget?.id ?? Date.now().toString(),
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      direccion: form.direccion.trim(),
      tiempoEntrega: form.tiempoEntrega.trim(),
      productos,
      ultimaCompra,
      notas: form.notas.trim() || undefined,
    };

    const updated = editTarget
      ? proveedores.map(p => p.id === editTarget.id ? proveedor : p)
      : [...proveedores, proveedor];

    setProveedores(updated);
    saveProveedores(updated);
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    const updated = proveedores.filter(p => p.id !== id);
    setProveedores(updated);
    saveProveedores(updated);
    setDeleteId(null);
  }

  function addProductRow() {
    setForm(f => ({ ...f, productos: [...f.productos, { ...EMPTY_PRODUCTO }] }));
  }

  function removeProductRow(i: number) {
    setForm(f => ({ ...f, productos: f.productos.filter((_, idx) => idx !== i) }));
  }

  function updateProductRow(i: number, field: keyof typeof EMPTY_PRODUCTO, value: string) {
    setForm(f => {
      const productos = [...f.productos];
      productos[i] = { ...productos[i], [field]: value };
      return { ...f, productos };
    });
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Proveedores</h1>
          <p className="mt-1 text-sm text-stone-500">Gestiona tus proveedores, precios y tiempos de entrega.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={16} />
          Agregar
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex w-fit gap-1 rounded-xl bg-stone-100 p-1">
        {(['lista', 'comparar'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === tab ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            {tab === 'lista' ? 'Mis Proveedores' : 'Comparar Precios'}
          </button>
        ))}
      </div>

      {/* Tab: Lista */}
      {activeTab === 'lista' && (
        proveedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Truck size={40} className="mb-4 text-stone-300" />
            <p className="text-sm font-medium text-stone-500">Aún no tienes proveedores.</p>
            <p className="mt-1 text-xs text-stone-400">Haz clic en "Agregar" para empezar.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proveedores.map(p => (
              <ProveedorCard
                key={p.id}
                proveedor={p}
                onEdit={() => openEdit(p)}
                onDelete={() => setDeleteId(p.id)}
              />
            ))}
          </div>
        )
      )}

      {/* Tab: Comparar */}
      {activeTab === 'comparar' && (
        <div className="max-w-2xl">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Busca un producto, ej: tomate, limón..."
              value={comparaSearch}
              onChange={e => setComparaSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          {comparaSearch.trim() === '' ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 py-12 text-center">
              <ArrowUpDown size={32} className="mx-auto mb-3 text-stone-300" />
              <p className="text-sm text-stone-400">Escribe el nombre de un producto para comparar.</p>
              {allProductNames.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 px-6">
                  {allProductNames.slice(0, 12).map(name => (
                    <button
                      key={name}
                      onClick={() => setComparaSearch(name)}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : comparaResults.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 py-12 text-center">
              <p className="text-sm text-stone-400">Ningún proveedor tiene ese producto registrado.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="border-b border-stone-100 px-5 py-4">
                <p className="text-sm font-bold text-stone-800">
                  {comparaResults.length} resultado{comparaResults.length !== 1 ? 's' : ''} para "{comparaSearch}"
                </p>
                <p className="text-xs text-stone-400">Ordenado de menor a mayor precio</p>
              </div>
              <div className="divide-y divide-stone-100">
                {comparaResults.map(({ proveedor, producto }, i) => (
                  <div key={`${proveedor.id}-${producto.nombre}-${i}`} className="flex items-center gap-4 px-5 py-4">
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    )}>
                      #{i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800">{proveedor.nombre}</p>
                      <p className="text-xs text-stone-400">{producto.nombre}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-stone-800">
                        {formatCLP(producto.precio)}
                        <span className="text-xs font-normal text-stone-400">/{producto.unidad}</span>
                      </p>
                      {proveedor.tiempoEntrega && (
                        <p className="text-xs text-stone-400">{proveedor.tiempoEntrega}</p>
                      )}
                    </div>
                    <a
                      href={`tel:${proveedor.telefono}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#2D6A4F] transition hover:bg-emerald-100"
                      title={`Llamar a ${proveedor.nombre}`}
                    >
                      <Phone size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal add/edit */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h2 className="font-bold text-stone-800">
                {editTarget ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              {/* Datos básicos */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Nombre *</label>
                  <input
                    type="text"
                    placeholder="Ej: Huertos Don Pepe"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Teléfono *</label>
                  <input
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Dirección / Zona</label>
                  <input
                    type="text"
                    placeholder="Ej: Ruta D-485, Vicuña"
                    value={form.direccion}
                    onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Tiempo de entrega</label>
                  <input
                    type="text"
                    placeholder="Ej: Mismo día, 24h, Solo martes"
                    value={form.tiempoEntrega}
                    onChange={e => setForm(f => ({ ...f, tiempoEntrega: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Productos */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-600">Productos y Precios</label>
                  <button
                    type="button"
                    onClick={addProductRow}
                    className="flex items-center gap-1 text-xs font-semibold text-[#2D6A4F] transition hover:opacity-80"
                  >
                    <Plus size={12} /> Agregar producto
                  </button>
                </div>
                <div className="space-y-2">
                  {form.productos.map((pr, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Producto"
                        value={pr.nombre}
                        onChange={e => updateProductRow(i, 'nombre', e.target.value)}
                        className="input-field min-w-0 flex-1"
                      />
                      <input
                        type="number"
                        placeholder="Precio"
                        min={0}
                        value={pr.precio}
                        onChange={e => updateProductRow(i, 'precio', e.target.value)}
                        className="input-field w-24 shrink-0"
                      />
                      <select
                        value={pr.unidad}
                        onChange={e => updateProductRow(i, 'unidad', e.target.value)}
                        className="input-field w-24 shrink-0"
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      {form.productos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProductRow(i)}
                          className="shrink-0 rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Última compra */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-600">Última Compra</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    type="date"
                    value={form.ucFecha}
                    onChange={e => setForm(f => ({ ...f, ucFecha: e.target.value }))}
                    className="input-field"
                  />
                  <input
                    type="number"
                    placeholder="Monto ($)"
                    min={0}
                    value={form.ucMonto}
                    onChange={e => setForm(f => ({ ...f, ucMonto: e.target.value }))}
                    className="input-field"
                  />
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={form.ucDescripcion}
                    onChange={e => setForm(f => ({ ...f, ucDescripcion: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">Notas</label>
                <textarea
                  placeholder="Ej: Solo trae los martes, pedir con 2 días de anticipación..."
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  {editTarget ? 'Guardar cambios' : 'Agregar proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-bold text-stone-800">¿Eliminar proveedor?</h3>
            <p className="mt-1 text-sm text-stone-500">Esta acción no se puede deshacer.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
