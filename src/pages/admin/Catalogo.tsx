import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, X, ImageIcon, Link2, Upload, Star } from 'lucide-react';
import { Product } from '../../types';
import { formatCLP } from '../../lib/orders';
import { loadProducts, upsertProduct, deleteProduct, newProductId, loadCategories, saveCategories } from '../../lib/products';
import { COLLECTIONS } from '../../lib/collections';
import { cn } from '../../lib/utils';

const UNITS = ['kg', 'unidades', '500g', '250g', 'manojo', 'docena', 'litro', 'caja'];

type FormData = {
  name: string; price: string; unit: string; category: string;
  description: string; image: string; isSeason: boolean; tags: string[];
};

const EMPTY: FormData = {
  name: '', price: '', unit: 'kg', category: 'Verduras',
  description: '', image: '', isSeason: false, tags: [],
};

export const AdminCatalogo: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [customUnit, setCustomUnit] = useState('');
  const [newCatInput, setNewCatInput] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts().then(setProducts);
    loadCategories().then(setCategories);
  }, []);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addCategory = () => {
    const name = newCatInput.trim();
    if (!name || categories.includes(name)) { setShowNewCat(false); setNewCatInput(''); return; }
    const next = [...categories, name];
    setCategories(next);
    saveCategories(next).catch(console.error);
    set('category', name);
    setShowNewCat(false); setNewCatInput('');
  };

  const removeCategory = (cat: string) => {
    const next = categories.filter((c) => c !== cat);
    setCategories(next);
    saveCategories(next).catch(console.error);
    if (form.category === cat) set('category', next[0] ?? 'Verduras');
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY, category: categories[0] ?? 'Verduras' });
    setImageTab('url'); setCustomUnit(''); setShowNewCat(false); setNewCatInput('');
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, price: String(p.price), unit: p.unit, category: p.category, description: p.description ?? '', image: p.image, isSeason: p.isSeason ?? false, tags: p.tags ?? [] });
    setImageTab(p.image?.startsWith('data:') ? 'upload' : 'url');
    setCustomUnit(UNITS.includes(p.unit) ? '' : p.unit);
    setShowNewCat(false); setNewCatInput('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const price = parseInt(form.price.replace(/\D/g, ''), 10);
    if (!form.name.trim() || isNaN(price) || price <= 0) return;
    const finalUnit = form.unit === '__custom' ? customUnit.trim() || 'unidades' : form.unit;
    const product: Product = editingId
      ? { ...products.find((p) => p.id === editingId)!, name: form.name.trim(), price, unit: finalUnit, category: form.category, description: form.description.trim(), image: form.image, isSeason: form.isSeason, tags: form.tags }
      : { id: newProductId(), name: form.name.trim(), price, unit: finalUnit, category: form.category, description: form.description.trim(), image: form.image, isSeason: form.isSeason, tags: form.tags };
    setSaving(true);
    setSaveError('');
    try {
      await upsertProduct(product);
      setProducts((prev) => editingId ? prev.map((p) => p.id === editingId ? product : p) : [...prev, product]);
      setModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar. Revisa la consola.');
      console.error('upsertProduct error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteProduct(id).catch(console.error);
    setDeleteId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('La imagen debe ser menor a 3MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => set('image', ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const seasonCount = products.filter((p) => p.isSeason).length;
  const canSave = form.name.trim().length > 0 && form.price.length > 0;

  return (
    <>
      <div>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Catálogo</h1>
            <p className="mt-1 text-sm text-stone-500">{products.length} productos · <span className="font-semibold text-brand-orange">{seasonCount} en temporada</span></p>
          </div>
          <button type="button" onClick={openAdd}
            className="flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#245a42] active:scale-95">
            <Plus size={16} />Agregar Producto
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <div key={product.id} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
              <div className="relative aspect-square overflow-hidden bg-stone-100">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><ImageIcon size={32} className="text-stone-300" /></div>
                )}
                {product.isSeason && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-brand-orange px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                    <Star size={7} />Temporada
                  </span>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => openEdit(product)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-700 shadow transition hover:bg-stone-50"><Pencil size={15} /></button>
                  <button type="button" onClick={() => setDeleteId(product.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow transition hover:bg-red-50"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-stone-800 line-clamp-1">{product.name}</p>
                <p className="mt-0.5 text-[10px] text-stone-400">{product.category} · {formatCLP(product.price)}/{product.unit}</p>
                {product.description && <p className="mt-1 text-[10px] text-stone-400 line-clamp-2">{product.description}</p>}
                <div className="mt-2.5 flex gap-1.5">
                  <button type="button" onClick={() => openEdit(product)} className="flex-1 rounded-xl border border-stone-200 py-1.5 text-[11px] font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50">Editar</button>
                  <button type="button" onClick={() => setDeleteId(product.id)} className="flex h-7 w-7 items-center justify-center rounded-xl text-red-400 transition hover:bg-red-50"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={openAdd} className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/60 p-6 text-stone-400 transition hover:border-brand-green/40 hover:bg-brand-green/5 hover:text-brand-green">
            <Plus size={26} /><span className="text-xs font-semibold">Agregar producto</span>
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-stone-800">¿Eliminar producto?</h2>
            <p className="mt-2 text-sm text-stone-500">Esta acción no se puede deshacer.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="flex-1 rounded-full border border-stone-200 py-2.5 text-sm font-semibold text-stone-600">Cancelar</button>
              <button type="button" onClick={() => handleDelete(deleteId)} className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center p-4 py-8">
            <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
                <h2 className="text-lg font-bold text-stone-800">{editingId ? 'Editar Producto' : 'Agregar Producto'}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-stone-400 hover:text-stone-600"><X size={20} /></button>
              </div>

              <div className="space-y-5 px-6 py-5">
                {/* Image */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">Imagen del producto</p>
                  <div className="mb-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                    {form.image ? <img src={form.image} alt="preview" className="h-full w-full object-cover" /> : <div className="flex flex-col items-center gap-1 text-stone-300"><ImageIcon size={36} /><span className="text-xs">Sin imagen</span></div>}
                  </div>
                  <div className="mb-3 flex rounded-xl border border-stone-200 bg-stone-50 p-0.5">
                    <button type="button" onClick={() => setImageTab('url')} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition', imageTab === 'url' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600')}>
                      <Link2 size={13} />Pegar URL
                    </button>
                    <button type="button" onClick={() => setImageTab('upload')} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition', imageTab === 'upload' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600')}>
                      <Upload size={13} />Subir foto
                    </button>
                  </div>
                  {imageTab === 'url' ? (
                    <input type="url" placeholder="https://ejemplo.com/tomate.jpg" value={form.image.startsWith('data:') ? '' : form.image} onChange={(e) => set('image', e.target.value)} className="input-field" />
                  ) : (
                    <>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-3 text-sm font-semibold text-stone-500 transition hover:border-brand-green/40 hover:text-brand-green">
                        <Upload size={16} />{form.image.startsWith('data:') ? 'Cambiar foto' : 'Seleccionar desde tu dispositivo'}
                      </button>
                      <p className="mt-1.5 text-center text-[10px] text-stone-400">JPG, PNG o WEBP · Máximo 3MB</p>
                    </>
                  )}
                  {form.image && <button type="button" onClick={() => set('image', '')} className="mt-2 text-xs font-medium text-red-400 hover:text-red-600">Quitar imagen</button>}
                </div>

                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Nombre *</label>
                  <input type="text" placeholder="Ej: Tomate Limachino" value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" />
                </div>

                {/* Price + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Precio (CLP) *</label>
                    <input type="number" placeholder="1800" min={1} value={form.price} onChange={(e) => set('price', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Unidad *</label>
                    <select value={UNITS.includes(form.unit) ? form.unit : '__custom'} onChange={(e) => { if (e.target.value === '__custom') { set('unit', '__custom'); } else { set('unit', e.target.value); setCustomUnit(''); } }} className="input-field">
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      <option value="__custom">Otra...</option>
                    </select>
                  </div>
                </div>
                {form.unit === '__custom' && (
                  <input type="text" placeholder="Ej: atado, bolsa 250g..." value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} className="input-field" />
                )}

                {/* Category */}
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Categoría *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <div key={cat} className="group relative">
                        <button type="button" onClick={() => set('category', cat)}
                          className={cn('rounded-xl px-3 py-2 text-xs font-semibold transition', form.category === cat ? 'bg-brand-green text-white' : 'border border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50')}>
                          {cat}
                        </button>
                        <button type="button" onClick={() => removeCategory(cat)} title="Eliminar categoría"
                          className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex">
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                    {showNewCat ? (
                      <div className="flex items-center gap-1">
                        <input type="text" placeholder="Ej: Cereales" value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') { setShowNewCat(false); setNewCatInput(''); } }}
                          autoFocus className="w-28 rounded-xl border border-brand-green/40 bg-brand-green/5 px-2.5 py-2 text-xs font-semibold text-stone-800 outline-none" />
                        <button type="button" onClick={addCategory} className="rounded-xl bg-brand-green px-2.5 py-2 text-xs font-bold text-white">OK</button>
                        <button type="button" onClick={() => { setShowNewCat(false); setNewCatInput(''); }} className="rounded-xl border border-stone-200 px-2 py-2 text-xs text-stone-400"><X size={12} /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowNewCat(true)}
                        className="flex items-center gap-1 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-semibold text-stone-400 transition hover:border-brand-green/40 hover:text-brand-green">
                        <Plus size={11} />Nueva
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Descripción (opcional)</label>
                  <textarea placeholder="Ej: Dulce, jugoso, ideal para ensaladas..." value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="input-field resize-none" />
                </div>

                {/* Collections */}
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-stone-500">Colecciones (opcional)</label>
                  <div className="flex flex-wrap gap-2">
                    {COLLECTIONS.map((col) => {
                      const active = form.tags.includes(col.id);
                      return (
                        <button key={col.id} type="button" onClick={() => set('tags', active ? form.tags.filter((t) => t !== col.id) : [...form.tags, col.id])}
                          style={active ? { backgroundColor: col.bgColor, color: col.textColor, borderColor: col.textColor + '40' } : {}}
                          className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition', active ? '' : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50')}>
                          <span>{col.emoji}</span>{col.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Season toggle */}
                <button type="button" onClick={() => set('isSeason', !form.isSeason)}
                  className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-4 py-3 transition hover:bg-stone-50">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-stone-800">Marcar como temporada</p>
                    <p className="text-xs text-stone-400">Aparece destacado con badge naranja en el catálogo público</p>
                  </div>
                  <div className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', form.isSeason ? 'bg-brand-green' : 'bg-stone-200')}>
                    <div className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all', form.isSeason ? 'left-6' : 'left-1')} />
                  </div>
                </button>
              </div>

              {saveError && (
                <div className="mx-6 mb-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-700">
                  {saveError}
                </div>
              )}
              <div className="flex gap-3 border-t border-stone-100 px-6 py-4">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="flex-1 rounded-full border border-stone-200 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={!canSave || saving} className="flex-1 rounded-full bg-brand-green py-3 text-sm font-semibold text-white hover:bg-[#245a42] disabled:opacity-40">
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar producto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
