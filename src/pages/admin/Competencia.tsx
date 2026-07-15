import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Globe, MapPin, Pencil, Trash2, X, Search,
  ChevronDown, Zap, TrendingDown, TrendingUp, Minus,
  ShoppingCart, Store,
} from 'lucide-react';
import { Competidor, CompetidorProducto, TipoCompetidor } from '../../types';
import { loadProducts } from '../../lib/products';
import { formatCLP } from '../../lib/orders';
import { cn } from '../../lib/utils';

const STORAGE_KEY = 'fruto_competidores';
const TIPOS: TipoCompetidor[] = ['Supermercado', 'Negocio local', 'Otro'];
const UNITS = ['kg', 'unidad', 'caja', 'bolsa', 'litro', 'atado'];

const TIPO_STYLE: Record<TipoCompetidor, string> = {
  Supermercado: 'bg-blue-50 text-blue-700',
  'Negocio local': 'bg-emerald-50 text-emerald-700',
  Otro: 'bg-stone-100 text-stone-600',
};

const TIPO_ICON: Record<TipoCompetidor, React.FC<{ size: number }>> = {
  Supermercado: ({ size }) => <ShoppingCart size={size} />,
  'Negocio local': ({ size }) => <Store size={size} />,
  Otro: ({ size }) => <Store size={size} />,
};

const TODAY = '2026-05-27T00:00:00.000Z';

const DEFAULT_COMPETIDORES: Competidor[] = [
  {
    id: 'feria-movil',
    nombre: 'Feria Móvil',
    tipo: 'Otro',
    sitioWeb: 'https://www.feriamoviloficial.cl',
    zona: 'La Serena y Coquimbo',
    productos: [
      { nombre: 'Plátano',    precio: 1790, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Tomate',     precio: 1490, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Naranja',    precio: 1490, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Palta',      precio: 5500, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Papa',       precio: 599,  unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Cebolla',    precio: 527,  unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Pimentón',   precio: 1500, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Huevos x30', precio: 8500, unidad: 'unidad', fechaActualizacion: TODAY },
    ],
    notas: 'Delivery gratis sobre $30.000 · Entrega máx 48h · Lun–sáb 8:00–15:00 · Primera compra: código FERIA5 (5% off). Papa y cebolla calculados desde precio mayorista (saco 25kg y malla 18kg).',
  },
  {
    id: 'finnca',
    nombre: 'Finnca',
    tipo: 'Otro',
    sitioWeb: 'https://www.finnca.cl',
    zona: 'La Serena y Coquimbo',
    productos: [
      { nombre: 'Limón',     precio: 1500, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Naranja',   precio: 1500, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Kiwi',      precio: 2300, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Palta',     precio: 4100, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Papa',      precio: 990,  unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Zanahoria', precio: 600,  unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Brócoli',   precio: 2000, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Espinaca',  precio: 1150, unidad: 'atado',  fechaActualizacion: TODAY },
      { nombre: 'Azúcar',    precio: 1390, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Arroz',     precio: 2100, unidad: 'kg',     fechaActualizacion: TODAY },
    ],
    notas: 'Pedido mínimo $10.000 · Despacho lun, mié y vie · También atiende restaurantes · Tienda online 24h · Zanahoria calculada desde saco 20kg ($12.000).',
  },
  {
    id: 'huerto-altovalsol',
    nombre: 'Huerto AltoValsol',
    tipo: 'Negocio local',
    sitioWeb: 'https://www.huertoaltovalsol.cl',
    zona: 'La Serena y Coquimbo',
    productos: [],
    notas: 'Cultivo ecológico sin químicos en el Valle del Elqui · Solo jueves · Reserva con 2 días de anticipación · Mínimo $2.500 · Modelo de suscripción/membresía · También ofrece tours de huerta y kombuchas. Sin precios públicos visibles en el sitio.',
  },
  {
    id: 'frutas-curato',
    nombre: 'Frutas Curato',
    tipo: 'Otro',
    sitioWeb: 'https://frutascurato.cl',
    zona: 'Santiago (referencia nacional)',
    productos: [
      { nombre: 'Plátano',    precio: 1500, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Peras',      precio: 1950, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Mango',      precio: 3800, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Tomate',     precio: 1950, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Brócoli',    precio: 1550, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Acelga',     precio: 1500, unidad: 'atado',  fechaActualizacion: TODAY },
      { nombre: 'Ajo',        precio: 1050, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Frambuesa',  precio: 2100, unidad: 'unidad', fechaActualizacion: TODAY },
    ],
    notas: 'Opera en Santiago — NO es competidor directo. Útil como referencia de precios nacionales. Vía Take App, también vende quesos, limpieza, frutos secos y más.',
  },
  {
    id: 'maifud',
    nombre: 'Maifud',
    tipo: 'Otro',
    sitioWeb: 'https://tienda.maifud.cl',
    zona: 'Santiago (referencia nacional)',
    productos: [
      { nombre: 'Limón',     precio: 1790, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Naranja',   precio: 1690, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Palta',     precio: 4990, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Mango',     precio: 1290, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Zanahoria', precio: 690,  unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Papa',      precio: 990,  unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Brócoli',   precio: 1490, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Espinaca',  precio: 790,  unidad: '250g',   fechaActualizacion: TODAY },
    ],
    notas: 'Opera en Santiago — NO es competidor directo. Referencia nacional. Propuesta única: "El Mercado de lo Imperfecto" — frutas/verduras con defectos visuales a menor precio para reducir desperdicio. 116+ productos. Buena inspiración para una sección de productos de segunda en Fruto.app.',
  },
  {
    id: 'vegetales-y-frutas',
    nombre: 'Vegetales y Frutas',
    tipo: 'Otro',
    sitioWeb: 'https://vegetalesyfrutas.cl',
    zona: 'Santiago premium (referencia nacional)',
    productos: [
      { nombre: 'Naranja',   precio: 3495, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Palta',     precio: 6690, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Zanahoria', precio: 1690, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Pimentón',  precio: 1995, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Lechuga',   precio: 3550, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Piña',      precio: 4920, unidad: 'unidad', fechaActualizacion: TODAY },
    ],
    notas: 'Opera en Santiago (Las Condes, Vitacura, Providencia) — NO es competidor directo. Segmento premium con precios altos. Despacho mismo día lun–dom, gratis sobre $25.000. También atiende oficinas y corporativos vía Bitus y Uber Eats. Naranja calculada desde malla 2kg ($6.990).',
  },
  {
    id: 'la-veguita-de-normi',
    nombre: 'La Veguita de Normi',
    tipo: 'Negocio local',
    sitioWeb: 'https://laveguitadenormi.cl',
    zona: 'La Serena y Coquimbo',
    productos: [
      { nombre: 'Tomate',               precio: 2200, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Tomate Cherry',         precio: 1800, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Palta Hass',            precio: 4800, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Papa',                  precio: 1250, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Zanahoria',             precio: 800,  unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Limón',                 precio: 1700, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Cebolla Blanca',        precio: 1400, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Champiñones',           precio: 2000, unidad: 'kg',     fechaActualizacion: TODAY },
      { nombre: 'Lechuga Hidropónica',   precio: 990,  unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Brócoli',               precio: 1600, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Espinaca',              precio: 800,  unidad: 'atado',  fechaActualizacion: TODAY },
      { nombre: 'Plátano',               precio: 2100, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Naranja',               precio: 1760, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Frutillas',             precio: 2500, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Manzana',               precio: 1990, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Piña',                  precio: 3000, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Mango',                 precio: 1500, unidad: 'unidad', fechaActualizacion: TODAY },
      { nombre: 'Kiwi',                  precio: 2600, unidad: 'unidad', fechaActualizacion: TODAY },
    ],
    notas: 'Competidor regional directo con catálogo amplio (+40 verduras, +20 frutas, frutos secos/especias) · Despacho mar, mié, jue y sáb 12:30–16:00 · Costo envío $2.000–$2.500 (no gratis) · Sectores alejados consultar · Palta vendida por unidad, no por kg.',
  },
];

function loadCompetidores(): Competidor[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved) as Competidor[];
  } catch {}
  return DEFAULT_COMPETIDORES;
}

function saveCompetidores(data: Competidor[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const EMPTY_PRODUCTO = { nombre: '', precio: '', unidad: 'kg' };
const EMPTY_FORM = {
  nombre: '',
  tipo: 'Supermercado' as TipoCompetidor,
  sitioWeb: '',
  zona: '',
  notas: '',
  productos: [{ ...EMPTY_PRODUCTO }],
};
type FormState = typeof EMPTY_FORM;

// ─── Diff badge ───────────────────────────────────────────────────────────────

const DiffBadge: React.FC<{ miPrecio: number; suPrecio: number }> = ({ miPrecio, suPrecio }) => {
  if (miPrecio <= 0) return null;
  const diff = Math.round(((miPrecio - suPrecio) / suPrecio) * 100);

  if (diff < -2) {
    return (
      <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
        <TrendingUp size={10} />
        {Math.abs(diff)}% más caro
      </span>
    );
  }
  if (diff > 2) {
    return (
      <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
        <TrendingDown size={10} />
        {diff}% más barato
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
      <Minus size={10} />
      Igual
    </span>
  );
};

// ─── Competitor card ──────────────────────────────────────────────────────────

const CompetidorCard: React.FC<{
  competidor: Competidor;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ competidor, onEdit, onDelete }) => {
  const [showProducts, setShowProducts] = useState(false);
  const TipoIcon = TIPO_ICON[competidor.tipo];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-stone-800">{competidor.nombre}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', TIPO_STYLE[competidor.tipo])}>
              {competidor.tipo}
            </span>
          </div>
          {competidor.zona && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
              <MapPin size={11} />
              {competidor.zona}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {competidor.sitioWeb && (
            <a
              href={competidor.sitioWeb.startsWith('http') ? competidor.sitioWeb : `https://${competidor.sitioWeb}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200"
              title="Ver sitio web"
            >
              <Globe size={14} />
            </a>
          )}
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Scraping badge */}
      <div className="mb-3 flex items-center gap-1.5 rounded-xl bg-stone-50 px-3 py-1.5">
        <Zap size={11} className="text-stone-300" />
        <span className="text-[10px] font-semibold text-stone-400">Auto-actualización · Próximamente</span>
      </div>

      {competidor.productos.length > 0 && (
        <div>
          <button
            onClick={() => setShowProducts(!showProducts)}
            className="flex w-full items-center justify-between text-xs font-semibold text-stone-600 transition hover:text-stone-800"
          >
            <span className="flex items-center gap-1">
              <TipoIcon size={11} />
              {competidor.productos.length} producto{competidor.productos.length !== 1 ? 's' : ''}
            </span>
            <ChevronDown size={12} className={cn('transition-transform', showProducts && 'rotate-180')} />
          </button>
          {showProducts && (
            <div className="mt-2 space-y-1">
              {competidor.productos.map((pr, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs text-stone-700">{pr.nombre}</p>
                    <p className="text-[10px] text-stone-400">
                      {new Date(pr.fechaActualizacion).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short',
                      })}
                    </p>
                  </div>
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

      {competidor.notas && (
        <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">{competidor.notas}</p>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const AdminCompetencia: React.FC = () => {
  const [competidores, setCompetidores] = useState<Competidor[]>([]);
  const [activeTab, setActiveTab] = useState<'lista' | 'comparar'>('lista');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Competidor | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, productos: [{ ...EMPTY_PRODUCTO }] });
  const [error, setError] = useState('');
  const [comparaSearch, setComparaSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { setCompetidores(loadCompetidores()); }, []);

  const misProductos = useMemo(() => loadProducts(), []);

  // All product names that appear in any competitor, for quick-pick chips
  const allCompetitorProductNames = useMemo(() => {
    const names = new Set<string>();
    competidores.forEach(c => c.productos.forEach(p => names.add(p.nombre.toLowerCase().trim())));
    return Array.from(names).sort();
  }, [competidores]);

  // Comparison results for a searched product
  const comparaResults = useMemo(() => {
    const search = comparaSearch.toLowerCase().trim();
    if (!search) return null;

    // Find my price from catalog (best case-insensitive match)
    const miProducto = misProductos.find(p =>
      p.name.toLowerCase().includes(search) || search.includes(p.name.toLowerCase())
    );

    const rows: { competidor: Competidor; producto: CompetidorProducto }[] = [];
    competidores.forEach(c => {
      c.productos.forEach(p => {
        if (p.nombre.toLowerCase().includes(search)) {
          rows.push({ competidor: c, producto: p });
        }
      });
    });

    rows.sort((a, b) => a.producto.precio - b.producto.precio);
    return { miProducto: miProducto ?? null, rows };
  }, [competidores, misProductos, comparaSearch]);

  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, productos: [{ ...EMPTY_PRODUCTO }] });
    setError('');
    setModalOpen(true);
  }

  function openEdit(c: Competidor) {
    setEditTarget(c);
    setForm({
      nombre: c.nombre,
      tipo: c.tipo,
      sitioWeb: c.sitioWeb ?? '',
      zona: c.zona ?? '',
      notas: c.notas ?? '',
      productos: c.productos.length > 0
        ? c.productos.map(p => ({ nombre: p.nombre, precio: String(p.precio), unidad: p.unidad }))
        : [{ ...EMPTY_PRODUCTO }],
    });
    setError('');
    setModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('Ingresa el nombre del competidor.'); return; }

    const productos: CompetidorProducto[] = [];
    for (const p of form.productos) {
      if (!p.nombre.trim()) continue;
      const precio = parseFloat(p.precio);
      if (isNaN(precio) || precio < 0) { setError(`Precio inválido para "${p.nombre}".`); return; }
      productos.push({
        nombre: p.nombre.trim(),
        precio,
        unidad: p.unidad,
        fechaActualizacion: new Date().toISOString(),
      });
    }

    const competidor: Competidor = {
      id: editTarget?.id ?? Date.now().toString(),
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      sitioWeb: form.sitioWeb.trim() || undefined,
      zona: form.zona.trim() || undefined,
      productos,
      notas: form.notas.trim() || undefined,
    };

    const updated = editTarget
      ? competidores.map(c => c.id === editTarget.id ? competidor : c)
      : [...competidores, competidor];

    setCompetidores(updated);
    saveCompetidores(updated);
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    const updated = competidores.filter(c => c.id !== id);
    setCompetidores(updated);
    saveCompetidores(updated);
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
          <h1 className="text-2xl font-bold text-stone-800">Competencia</h1>
          <p className="mt-1 text-sm text-stone-500">
            Monitorea precios de supermercados y negocios locales que hacen delivery.
          </p>
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
            {tab === 'lista' ? 'Competidores' : 'Comparar con mis precios'}
          </button>
        ))}
      </div>

      {/* Tab: Lista */}
      {activeTab === 'lista' && (
        competidores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Store size={40} className="mb-4 text-stone-300" />
            <p className="text-sm font-medium text-stone-500">Aún no tienes competidores registrados.</p>
            <p className="mt-1 text-xs text-stone-400">
              Agrega supermercados (Lider, Tottus) y negocios locales que hagan delivery.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competidores.map(c => (
              <CompetidorCard
                key={c.id}
                competidor={c}
                onEdit={() => openEdit(c)}
                onDelete={() => setDeleteId(c.id)}
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
              placeholder="Busca un producto, ej: tomate, palta, limón..."
              value={comparaSearch}
              onChange={e => setComparaSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          {!comparaResults ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 py-12 text-center">
              <Search size={32} className="mx-auto mb-3 text-stone-300" />
              <p className="text-sm text-stone-400">Escribe un producto para comparar tus precios con la competencia.</p>
              {allCompetitorProductNames.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 px-6">
                  {allCompetitorProductNames.slice(0, 12).map(name => (
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
          ) : comparaResults.rows.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 py-12 text-center">
              <p className="text-sm text-stone-400">Ningún competidor tiene ese producto registrado.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="border-b border-stone-100 px-5 py-4">
                <p className="text-sm font-bold text-stone-800">
                  "{comparaSearch}" — {comparaResults.rows.length} competidor{comparaResults.rows.length !== 1 ? 'es' : ''}
                </p>
                <p className="text-xs text-stone-400">Ordenado de menor a mayor precio</p>
              </div>

              {/* Mi precio */}
              {comparaResults.miProducto && (
                <div className="flex items-center gap-4 border-b-2 border-[#2D6A4F]/20 bg-[#f0f7f4] px-5 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2D6A4F] text-[10px] font-bold text-white">
                    YO
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#1B4332]">{comparaResults.miProducto.name}</p>
                    <p className="text-xs text-[#2D6A4F]">Mi catálogo</p>
                  </div>
                  <p className="shrink-0 text-base font-bold text-[#1B4332]">
                    {formatCLP(comparaResults.miProducto.price)}
                    <span className="text-xs font-normal text-[#2D6A4F]">/{comparaResults.miProducto.unit}</span>
                  </p>
                </div>
              )}

              {!comparaResults.miProducto && (
                <div className="border-b border-stone-100 bg-amber-50 px-5 py-3">
                  <p className="text-xs text-amber-700">
                    No encontré este producto en tu catálogo. Agrégalo en /admin/catalogo para ver la comparación.
                  </p>
                </div>
              )}

              {/* Competidores */}
              <div className="divide-y divide-stone-100">
                {comparaResults.rows.map(({ competidor, producto }, i) => {
                  const miPrecio = comparaResults.miProducto?.price ?? 0;
                  return (
                    <div key={`${competidor.id}-${i}`} className="flex items-center gap-4 px-5 py-4">
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        i === 0 ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'
                      )}>
                        #{i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-stone-800">{competidor.nombre}</p>
                          <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', TIPO_STYLE[competidor.tipo])}>
                            {competidor.tipo}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p className="text-[10px] text-stone-400">{producto.nombre}</p>
                          {miPrecio > 0 && <DiffBadge miPrecio={miPrecio} suPrecio={producto.precio} />}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-bold text-stone-800">
                          {formatCLP(producto.precio)}
                          <span className="text-xs font-normal text-stone-400">/{producto.unidad}</span>
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {new Date(producto.fechaActualizacion).toLocaleDateString('es-CL', {
                            day: '2-digit', month: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                {editTarget ? 'Editar competidor' : 'Nuevo competidor'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              {/* Básico */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Nombre *</label>
                  <input
                    type="text"
                    placeholder="Ej: Lider, Tottus, Frutería Sol"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCompetidor }))}
                    className="input-field"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Sitio web</label>
                  <input
                    type="text"
                    placeholder="Ej: lider.cl"
                    value={form.sitioWeb}
                    onChange={e => setForm(f => ({ ...f, sitioWeb: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-600">Zona / Cobertura</label>
                  <input
                    type="text"
                    placeholder="Ej: La Serena, IV Región"
                    value={form.zona}
                    onChange={e => setForm(f => ({ ...f, zona: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Productos */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-600">Precios de sus productos</label>
                  <button
                    type="button"
                    onClick={addProductRow}
                    className="flex items-center gap-1 text-xs font-semibold text-[#2D6A4F] transition hover:opacity-80"
                  >
                    <Plus size={12} /> Agregar
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

              {/* Notas */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">Notas</label>
                <textarea
                  placeholder="Ej: Solo hacen delivery a La Serena, mínimo $10.000..."
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
                  {editTarget ? 'Guardar cambios' : 'Agregar competidor'}
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
            <h3 className="font-bold text-stone-800">¿Eliminar competidor?</h3>
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
