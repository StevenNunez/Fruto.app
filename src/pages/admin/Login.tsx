import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertTriangle } from 'lucide-react';
import { signIn, getSession } from '../../lib/auth';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      if (session) navigate('/admin', { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch {
      setError('Email o contraseña incorrectos.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F4F1] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold tracking-tight text-stone-800">
            Fruto<span className="text-brand-orange">.</span>app
          </span>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
            Panel productor
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="mb-5 flex items-center gap-2 text-sm font-bold text-stone-800">
            <Lock size={15} className="text-brand-green" />
            Iniciar sesión
          </h1>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Email
              </label>
              <input required type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Contraseña
              </label>
              <input required type="password" autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} className="input-field" />
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertTriangle size={14} className="shrink-0 text-red-500" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="mt-5 w-full rounded-2xl bg-brand-green py-3.5 text-sm font-bold text-white transition hover:bg-brand-green/90 active:scale-95 disabled:opacity-60">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};
