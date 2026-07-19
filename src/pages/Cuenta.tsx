import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  PackageCheck,
  RotateCcw,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Order, Product, Profile, Sector } from '../types';
import { cn } from '../lib/utils';
import { signIn, signUp, signOut, getSession, onAuthChange } from '../lib/auth';
import { loadMyProfile, saveMyProfile } from '../lib/profile';
import { loadMyOrders, formatCLP, shortOrderId } from '../lib/orders';
import { loadProducts } from '../lib/products';
import { loadConfig, DEFAULT_CONFIG, getActiveSectors, deliverySummary } from '../lib/config';
import { formatChileanMobileInput, isValidChileanMobile, normalizeChileanMobile } from '../lib/phone';
import { useCart } from '../context/CartContext';
import { usePageMeta } from '../lib/seo';

const STATUS_COLOR: Record<Order['status'], string> = {
  Pendiente: 'bg-orange-100 text-orange-700',
  Preparando: 'bg-blue-100 text-blue-700',
  'En camino': 'bg-amber-100 text-amber-700',
  Entregado: 'bg-emerald-100 text-emerald-800',
};

export const Cuenta: React.FC = () => {
  usePageMeta('Mi cuenta | Fruto.app');
  const [session, setSession] = useState<Session | null | 'loading'>('loading');

  useEffect(() => {
    getSession().then(setSession);
    return onAuthChange(setSession);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      {session === 'loading' ? (
        <p className="py-20 text-center text-sm text-stone-400">Cargando...</p>
      ) : session ? (
        <LoggedIn email={session.user.email ?? ''} />
      ) : (
        <AuthCard />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sin sesión: ingresar o crear cuenta
// ---------------------------------------------------------------------------

const AuthCard: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const lastOrderId = localStorage.getItem('fruto_last_order_id');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        const { needsEmailConfirm } = await signUp(email.trim(), password);
        if (needsEmailConfirm) {
          setNotice('Te enviamos un correo para confirmar tu cuenta. Ábrelo y vuelve aquí.');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.includes('Invalid login credentials')
          ? 'Correo o contraseña incorrectos.'
          : msg.includes('already registered')
            ? 'Ese correo ya tiene una cuenta. Prueba iniciando sesión.'
            : 'No pudimos completar la operación. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 md:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
          <User size={22} />
        </div>
        <h1 className="text-2xl font-bold text-stone-800">Tu cuenta</h1>
        <p className="mt-1 text-sm text-stone-500">
          Sigue tus pedidos, guarda tus datos de entrega y repite compras con un clic.
        </p>

        <div className="mt-5 flex rounded-full border border-stone-200 bg-stone-50 p-0.5">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError('');
                setNotice('');
              }}
              className={cn(
                'flex-1 rounded-full py-2.5 text-sm font-semibold transition',
                mode === m ? 'bg-brand-green text-white' : 'text-stone-500 hover:text-stone-700'
              )}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Correo
            </label>
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Contraseña
            </label>
            <input
              required
              type="password"
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {notice && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-4 font-bold text-white transition hover:bg-[#245a42] active:scale-95 disabled:opacity-60"
          >
            {loading ? 'Un momento...' : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
          </button>
        </form>
      </div>

      {lastOrderId && (
        <Link
          to="/confirmation"
          className="flex items-center justify-between rounded-3xl border border-stone-200 bg-white p-5 transition hover:border-brand-green/40"
        >
          <div className="flex items-center gap-3">
            <PackageCheck size={20} className="text-brand-green" />
            <div>
              <p className="text-sm font-bold text-stone-800">Ver el estado de mi último pedido</p>
              <p className="text-xs text-stone-400">Sin necesidad de cuenta</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-stone-300" />
        </Link>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Con sesión: datos de entrega + historial de pedidos
// ---------------------------------------------------------------------------

const LoggedIn: React.FC<{ email: string }> = ({ email }) => {
  const navigate = useNavigate();
  const { addToCart, updateQuantity, clearCart } = useCart();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [profile, setProfile] = useState<Profile>({
    name: '',
    phone: '',
    address: '',
    sector: 'La Serena',
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const load = useCallback(async () => {
    setLoadingData(true);
    const [cfg, prof, myOrders, prods] = await Promise.all([
      loadConfig(),
      loadMyProfile(),
      loadMyOrders(),
      loadProducts().catch(() => [] as Product[]),
    ]);
    setConfig(cfg);
    if (prof) {
      setProfile({ ...prof, phone: prof.phone ? formatChileanMobileInput(prof.phone) : '' });
    }
    setOrders(myOrders);
    setProducts(prods);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sectors = getActiveSectors(config);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.phone && !isValidChileanMobile(profile.phone)) {
      setPhoneError('Ingresa un celular chileno válido (+56 9 XXXX XXXX)');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      await saveMyProfile({
        ...profile,
        phone: profile.phone ? normalizeChileanMobile(profile.phone) : '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('saveMyProfile:', err);
    } finally {
      setSaving(false);
    }
  };

  // Rellena el carrito con un pedido anterior usando el catálogo ACTUAL
  // (precios de hoy; productos que ya no existen se omiten).
  const repeatOrder = (order: Order) => {
    clearCart();
    for (const item of order.items) {
      const current = products.find((p) => p.id === item.id);
      if (!current) continue;
      addToCart(current);
      if (item.quantity > 1) updateQuantity(current.id, item.quantity);
    }
    navigate('/cart');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            Hola{profile.name ? `, ${profile.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-0.5 text-xs text-stone-400">{email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-1.5 rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-500 transition hover:border-stone-300 hover:text-stone-700"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>

      {/* Datos de entrega */}
      <form onSubmit={save} className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-stone-800">
          <MapPin size={15} className="text-brand-green" />
          Mis datos de entrega
        </h2>
        <p className="mb-4 text-xs text-stone-400">
          Se rellenan solos en tu próxima compra.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Nombre
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Teléfono
            </label>
            <input
              type="tel"
              inputMode="tel"
              placeholder="+56 9 1234 5678"
              value={profile.phone}
              onChange={(e) => {
                setProfile((p) => ({ ...p, phone: formatChileanMobileInput(e.target.value) }));
                if (phoneError) setPhoneError('');
              }}
              className={cn('input-field', phoneError && 'border-red-300')}
            />
            {phoneError && <p className="mt-1.5 text-xs font-medium text-red-600">{phoneError}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Dirección
            </label>
            <input
              type="text"
              placeholder="Calle, número, depto (si aplica)"
              value={profile.address}
              onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
              className="input-field"
              autoComplete="street-address"
            />
          </div>
          {sectors.length > 0 && (
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
                Sector
              </label>
              <div className="grid grid-cols-3 gap-2">
                {sectors.map((s: Sector) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, sector: s }))}
                    className={cn(
                      'min-h-11 rounded-xl border py-2.5 text-xs font-bold transition',
                      profile.sector === s
                        ? 'border-brand-green bg-brand-green/5 text-brand-green'
                        : 'border-stone-200 text-stone-500 hover:border-stone-300'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-green px-8 py-3 text-sm font-bold text-white transition hover:bg-[#245a42] active:scale-95 disabled:opacity-60"
        >
          {saved ? (
            <>
              <CheckCircle2 size={15} /> Guardado
            </>
          ) : saving ? (
            'Guardando...'
          ) : (
            'Guardar mis datos'
          )}
        </button>
      </form>

      {/* Historial */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-stone-800">
          <PackageCheck size={15} className="text-brand-green" />
          Mis pedidos
        </h2>

        {loadingData ? (
          <p className="py-8 text-center text-sm text-stone-400">Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-stone-400">Aún no tienes pedidos en tu cuenta.</p>
            <Link
              to="/catalog"
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-orange hover:underline"
            >
              Ir al catálogo <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-800">#{shortOrderId(order.id)}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        STATUS_COLOR[order.status]
                      )}
                    >
                      {order.status}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-brand-green">{formatCLP(order.total)}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {new Date(order.createdAt).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'long',
                  })}{' '}
                  · {order.items.length} productos ·{' '}
                  {deliverySummary(order.deliveryMode, order.deliverySlot, config)}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-stone-400">
                  {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    to={`/confirmation?order=${order.id}`}
                    className="flex-1 rounded-xl border border-stone-200 bg-white py-2 text-center text-xs font-bold text-stone-600 transition hover:border-stone-300"
                  >
                    Ver seguimiento
                  </Link>
                  <button
                    type="button"
                    onClick={() => repeatOrder(order)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-orange py-2 text-xs font-bold text-white transition hover:bg-brand-orange/90 active:scale-95"
                  >
                    <RotateCcw size={13} />
                    Repetir pedido
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
