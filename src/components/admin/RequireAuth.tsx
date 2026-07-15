import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSession, onAuthChange } from '../../lib/auth';

// Protege todo /admin: sin sesión iniciada redirige a /admin/login.
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'authed' | 'anon'>('loading');

  useEffect(() => {
    getSession().then((session) => setStatus(session ? 'authed' : 'anon'));
    return onAuthChange((session) => setStatus(session ? 'authed' : 'anon'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F4F1] text-sm text-stone-400">
        Cargando...
      </div>
    );
  }
  if (status === 'anon') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};
