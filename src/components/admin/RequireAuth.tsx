import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession, onAuthChange } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

// Protege todo /admin: sin sesión redirige a /admin/login, y con sesión
// verifica que sea ADMIN de verdad (tabla admins vía RPC is_admin) —
// desde la Fase 4 los clientes también tienen sesión, y estar autenticado
// ya no basta. Un cliente que escriba /admin vuelve a la tienda.
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'admin' | 'anon' | 'notAdmin'>('loading');

  useEffect(() => {
    let cancelled = false;

    const check = async (hasSession: boolean) => {
      if (!hasSession) {
        if (!cancelled) setStatus('anon');
        return;
      }
      const { data, error } = await supabase.rpc('is_admin');
      if (cancelled) return;
      if (error) {
        console.error('is_admin:', error.message);
        setStatus('notAdmin');
        return;
      }
      setStatus(data === true ? 'admin' : 'notAdmin');
    };

    getSession().then((session) => check(!!session));
    const unsubscribe = onAuthChange((session) => check(!!session));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F4F1] text-sm text-stone-400">
        Cargando...
      </div>
    );
  }
  if (status === 'anon') return <Navigate to="/admin/login" replace />;
  if (status === 'notAdmin') return <Navigate to="/" replace />;
  return <>{children}</>;
};
