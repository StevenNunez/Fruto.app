import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Plus, Trash2, MapPin } from 'lucide-react';
import { type Config, DEFAULT_CONFIG, loadConfig, saveConfig, getZonas } from '../../lib/config';
import type { ZonaEntrega } from '../../types';

/* Editor de zonas/rutas de entrega: agregar, renombrar, ventana horaria
   propia y eliminar. Se guarda con el botón general "Guardar cambios". */
const ZonasEditor: React.FC<{
  zonas: ZonaEntrega[];
  onChange: (zonas: ZonaEntrega[]) => void;
}> = ({ zonas, onChange }) => {
  const [nueva, setNueva] = useState('');

  const agregar = () => {
    const nombre = nueva.trim();
    if (!nombre) return;
    if (zonas.some((z) => z.nombre.toLowerCase() === nombre.toLowerCase())) {
      setNueva('');
      return;
    }
    onChange([...zonas, { id: `z-${Date.now()}`, nombre }]);
    setNueva('');
  };

  const actualizar = (id: string, cambios: Partial<ZonaEntrega>) =>
    onChange(zonas.map((z) => (z.id === id ? { ...z, ...cambios } : z)));

  const eliminar = (id: string) => onChange(zonas.filter((z) => z.id !== id));

  return (
    <div className="space-y-2">
      {zonas.map((z) => (
        <div key={z.id} className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MapPin size={14} className="shrink-0 text-brand-green" />
            <input
              type="text"
              value={z.nombre}
              onChange={(e) => actualizar(z.id, { nombre: e.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-stone-800 transition focus:border-brand-green/40 focus:bg-stone-50 focus:outline-none"
              placeholder="Nombre de la zona"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={z.ventana ?? ''}
              onChange={(e) => actualizar(z.id, { ventana: e.target.value || undefined })}
              className="w-40 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-600 focus:border-brand-green/40 focus:outline-none"
              placeholder="Horario (opcional)"
            />
            <button
              type="button"
              onClick={() => eliminar(z.id)}
              title="Eliminar zona"
              className="shrink-0 rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      {zonas.length === 0 && (
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Sin zonas: los clientes no podrán elegir dónde recibir. Agrega al menos una.
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
          className="input-field flex-1"
          placeholder="Nueva zona (ej: Peñuelas, Tierras Blancas...)"
        />
        <button
          type="button"
          onClick={agregar}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
        >
          <Plus size={14} /> Agregar
        </button>
      </div>
    </div>
  );
};

export const AdminConfiguracion: React.FC = () => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => { loadConfig().then(setConfig); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(false);
    try {
      await saveConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('saveConfig:', err);
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Configuración</h1>
        <p className="mt-1 text-sm text-stone-500">Ajusta los parámetros de tu negocio.</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Negocio */}
        <Section title="Mi Negocio">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio">
              <input
                type="text"
                value={config.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Tu nombre (admin)">
              <input
                type="text"
                value={config.adminName}
                onChange={(e) => set('adminName', e.target.value)}
                className="input-field"
                placeholder="Ej: Juan P."
              />
            </Field>
          </div>
        </Section>

        {/* Contacto */}
        <Section title="Contacto">
          <Field label="WhatsApp (solo números, con código de país)">
            <input
              type="text"
              value={config.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              className="input-field"
              placeholder="56912345678"
            />
          </Field>
        </Section>

        {/* Datos bancarios */}
        <Section title="Datos para Transferencia">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Banco">
              <input
                type="text"
                value={config.bankName}
                onChange={(e) => set('bankName', e.target.value)}
                className="input-field"
                placeholder="Banco Estado"
              />
            </Field>
            <Field label="RUT">
              <input
                type="text"
                value={config.bankRut}
                onChange={(e) => set('bankRut', e.target.value)}
                className="input-field"
                placeholder="12.345.678-9"
              />
            </Field>
            <Field label="Nombre de la cuenta">
              <input
                type="text"
                value={config.bankAccountName}
                onChange={(e) => set('bankAccountName', e.target.value)}
                className="input-field"
                placeholder="Fruto.app"
              />
            </Field>
          </div>
        </Section>

        {/* Horarios — aplica a pedidos "Mañana" (planificados) */}
        <Section title="Entrega mañana (planificada)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cierre de pedidos del día">
              <input
                type="time"
                value={config.cutoffTime}
                onChange={(e) => set('cutoffTime', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Salida de despacho">
              <input
                type="time"
                value={config.deliveryTime}
                onChange={(e) => set('deliveryTime', e.target.value)}
                className="input-field"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Ventana de entrega mañana (texto al cliente)">
              <input
                type="text"
                value={config.deliveryWindow}
                onChange={(e) => set('deliveryWindow', e.target.value)}
                className="input-field"
                placeholder="ej: 10:00 – 14:00"
              />
            </Field>
          </div>
        </Section>

        {/* Despacho */}
        <Section title="Despacho (hoy vs mañana)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Costo de despacho (CLP)">
              <input
                type="number"
                min={0}
                step={500}
                value={config.deliveryFee}
                onChange={(e) => set('deliveryFee', Number(e.target.value))}
                className="input-field"
              />
            </Field>
            <Field label="Mínimo envío gratis mañana (CLP)">
              <input
                type="number"
                min={0}
                step={1000}
                value={config.freeDeliveryThreshold}
                onChange={(e) => set('freeDeliveryThreshold', Number(e.target.value))}
                className="input-field"
              />
            </Field>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-stone-500">
            <li>
              · <strong>Mañana</strong>: envío gratis solo si el pedido llega a $
              {config.freeDeliveryThreshold.toLocaleString('es-CL')}. Si no, cobra $
              {config.deliveryFee.toLocaleString('es-CL')}.
            </li>
            <li>
              · <strong>Hoy (urgente)</strong>: siempre cobra $
              {config.deliveryFee.toLocaleString('es-CL')} (cubre courier / PedidosYa / etc.).
            </li>
          </ul>
        </Section>

        {/* Zonas / rutas de entrega — editables */}
        <Section title="Zonas de entrega (rutas)">
          <p className="mb-3 text-xs text-stone-500">
            Estas zonas aparecen en el checkout del cliente, en los filtros de Pedidos y agrupan la
            Ruta del Día. Agrega, renombra o elimina las que necesites. La ventana horaria es
            opcional (si la dejas vacía se usa la general de arriba).
          </p>
          <ZonasEditor
            zonas={getZonas(config)}
            onChange={(zonas) => set('zonas', zonas)}
          />
        </Section>

        {/* Métodos de pago */}
        <Section title="Métodos de Pago">
          <div className="space-y-2">
            {([
              { key: 'mercadopago', label: 'MercadoPago' },
              { key: 'transferencia', label: 'Transferencia bancaria' },
            ] as { key: keyof Config['paymentMethods']; label: string }[]).map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={config.paymentMethods[key]}
                  onChange={(e) => set('paymentMethods', { ...config.paymentMethods, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 accent-brand-green"
                />
                <span className="text-sm font-medium text-stone-700">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* Guardar */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-brand-green px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#245a42] active:scale-95 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <CheckCircle2 size={16} />
              ¡Guardado!
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
              <AlertTriangle size={16} />
              No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold text-stone-700">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-stone-500">{label}</label>
      {children}
    </div>
  );
}
