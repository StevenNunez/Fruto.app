import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/admin/RequireAuth';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Confirmation } from './pages/Confirmation';
import { Cuenta } from './pages/Cuenta';

// Todo /admin se carga aparte (code-splitting): el celular de un cliente
// solo descarga la tienda; el panel se baja recién al entrar a /admin.
const AdminLogin = lazy(() => import('./pages/admin/Login').then((m) => ({ default: m.AdminLogin })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const AdminPedidos = lazy(() => import('./pages/admin/Pedidos').then((m) => ({ default: m.AdminPedidos })));
const AdminRuta = lazy(() => import('./pages/admin/Ruta').then((m) => ({ default: m.AdminRuta })));
const AdminCatalogo = lazy(() => import('./pages/admin/Catalogo').then((m) => ({ default: m.AdminCatalogo })));
const AdminClientes = lazy(() => import('./pages/admin/Clientes').then((m) => ({ default: m.AdminClientes })));
const AdminCosechas = lazy(() => import('./pages/admin/Cosechas').then((m) => ({ default: m.AdminCosechas })));
const AdminReportes = lazy(() => import('./pages/admin/Reportes').then((m) => ({ default: m.AdminReportes })));
const AdminConfiguracion = lazy(() => import('./pages/admin/Configuracion').then((m) => ({ default: m.AdminConfiguracion })));
const AdminCostos = lazy(() => import('./pages/admin/Costos').then((m) => ({ default: m.AdminCostos })));
const AdminFinanzas = lazy(() => import('./pages/admin/Finanzas').then((m) => ({ default: m.AdminFinanzas })));
const AdminPrecios = lazy(() => import('./pages/admin/Precios').then((m) => ({ default: m.AdminPrecios })));
const AdminProveedores = lazy(() => import('./pages/admin/Proveedores').then((m) => ({ default: m.AdminProveedores })));
const AdminCompetencia = lazy(() => import('./pages/admin/Competencia').then((m) => ({ default: m.AdminCompetencia })));

const AdminFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#F4F4F1] text-sm text-stone-400">
    Cargando...
  </div>
);

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Suspense fallback={<AdminFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="confirmation" element={<Confirmation />} />
              <Route path="cuenta" element={<Cuenta />} />
            </Route>

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
              <Route index element={<Admin />} />
              <Route path="pedidos" element={<AdminPedidos />} />
              <Route path="ruta" element={<AdminRuta />} />
              <Route path="catalogo" element={<AdminCatalogo />} />
              <Route path="clientes" element={<AdminClientes />} />
              <Route path="cosechas" element={<AdminCosechas />} />
              <Route path="reportes" element={<AdminReportes />} />
              <Route path="configuracion" element={<AdminConfiguracion />} />
              <Route path="costos" element={<AdminCostos />} />
              <Route path="finanzas" element={<AdminFinanzas />} />
              <Route path="precios" element={<AdminPrecios />} />
              <Route path="proveedores" element={<AdminProveedores />} />
              <Route path="competencia" element={<AdminCompetencia />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CartProvider>
  );
}
