import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { type Config, DEFAULT_CONFIG, loadConfig, saveConfig } from '../../lib/config';

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

        {/* Cobertura */}
        <Section title="Sectores de Cobertura">
          <div className="space-y-2">
            {([
              { key: 'la_serena', label: 'La Serena' },
              { key: 'coquimbo', label: 'Coquimbo' },
              { key: 'las_companias', label: 'Las Compañías' },
            ] as { key: keyof Config['sectors']; label: string }[]).map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={config.sectors[key]}
                  onChange={(e) => set('sectors', { ...config.sectors, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 accent-brand-green"
                />
                <span className="text-sm font-medium text-stone-700">{label}</span>
              </label>
            ))}
          </div>
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
