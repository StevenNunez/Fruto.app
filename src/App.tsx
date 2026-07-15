import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Confirmation } from './pages/Confirmation';
import { Admin } from './pages/Admin';
import { AdminPedidos } from './pages/admin/Pedidos';
import { AdminRuta } from './pages/admin/Ruta';
import { AdminCatalogo } from './pages/admin/Catalogo';
import { AdminClientes } from './pages/admin/Clientes';
import { AdminCosechas } from './pages/admin/Cosechas';
import { AdminReportes } from './pages/admin/Reportes';
import { AdminConfiguracion } from './pages/admin/Configuracion';
import { AdminCostos } from './pages/admin/Costos';
import { AdminFinanzas } from './pages/admin/Finanzas';
import { AdminPrecios } from './pages/admin/Precios';
import { AdminProveedores } from './pages/admin/Proveedores';
import { AdminCompetencia } from './pages/admin/Competencia';

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="confirmation" element={<Confirmation />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
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
      </BrowserRouter>
    </CartProvider>
  );
}
