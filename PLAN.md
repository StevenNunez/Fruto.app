# Plan de Lanzamiento — Fruto.app

> Creado: 2026-07-05. Este es el plan de acción para dejar la app lista para el público.
> Estado: `[ ]` pendiente · `[x]` hecho. Actualizar al completar cada ítem.

## Diagnóstico resumido (auditoría 2026-07-05)

La app funciona como prototipo pero **no está lista para el público**. Los bloqueantes:

1. **Base de datos abierta**: `schema.sql` no habilita RLS (Row Level Security). La anon key va en el bundle JS, así que cualquier visitante puede leer, modificar o borrar TODAS las tablas desde la consola del navegador: pedidos (con nombres, direcciones y teléfonos), productos, precios, stock.
2. **PII expuesta en la tienda pública**: `Home.tsx` y `Catalog.tsx` llaman `loadOrders()` (todos los pedidos, con datos de clientes) solo para calcular stock. Cualquier visitante descarga los datos personales de todos los clientes.
3. **`/admin` sin autenticación**: cualquiera que escriba la URL ve pedidos, clientes, finanzas y costos.
4. **Datos bancarios falsos para clientes**: la config del negocio (banco, RUT, WhatsApp, horarios, costo de despacho) vive en localStorage → solo existe en el navegador del productor. Los clientes ven `DEFAULT_CONFIG` hardcodeado (`src/lib/config.ts`): Banco Estado RUT 12.345.678-9, WhatsApp 56912345678. Un cliente que "paga por transferencia" transfiere a una cuenta inexistente.
5. **Mercado Pago no existe**: elegir "MercadoPago" en checkout solo guarda el texto; no se cobra nada. Integrarlo requiere un backend (el access token de MP es secreto, no puede ir en el frontend).
6. **Pedidos que se pierden en silencio**: en `Checkout.tsx` si `createOrder()` falla, el catch solo hace `console.error` y **igual** navega a "¡Pedido confirmado!" y borra el carrito. El cliente cree que pidió; el pedido nunca llegó.
7. **Total confiado al cliente**: el total (y los precios de cada ítem) se calculan en el navegador desde localStorage y se insertan tal cual en `orders`. Manipulable. Con pagos reales, el monto debe validarse server-side.

Sin git: el proyecto no es repositorio git todavía.

---

## Fase 0 — Fundaciones (rápida, hacer primero)

- [ ] `git init` + primer commit (`.gitignore` ya excluye `.env` ✓).
- [ ] Quitar dependencias sin uso: `@google/genai`, `express`, `dotenv`, `@types/express`, `tsx`, `esbuild` (residuos de plantilla AI Studio). Borrar `metadata.json`, reescribir `README.md`.
- [ ] Revisar/borrar datos demo: `src/data.ts`, `src/data/demoOrders.ts` (verificar que nada los importe en producción).
- [ ] `index.html`: `lang="es"`, meta description, theme-color, favicon, og:tags.
- [ ] Fix menor en `src/index.css`: `tracking-grow` no es una propiedad CSS válida (debería ser `letter-spacing`).

## Fase 1 — Seguridad (BLOQUEANTE: nada de público antes de esto)

- [ ] **Habilitar RLS en todas las tablas** (nuevo archivo `supabase/policies.sql`, ejecutar en SQL Editor):
  - `products`, `categories`, `config`, `stock`: SELECT público; escritura solo autenticado.
  - `orders`: INSERT público (checkout anónimo); SELECT/UPDATE solo autenticado. Para que el cliente vea SU pedido en Confirmation sin exponer los demás: función RPC `get_order(order_id)` (security definer) o SELECT filtrado por id no adivinable.
  - `costs`, `gastos_fijos`, `product_costs`: todo solo autenticado.
- [ ] **Stock público sin exponer pedidos**: crear vista o RPC `stock_remaining()` (security definer) que devuelva `{product_id, remaining}` calculado en Postgres. Reemplazar `computeStockRemaining()` de `Home.tsx`/`Catalog.tsx` (hoy duplicada — extraer a `src/lib/stock.ts`) por esa llamada. Elimina la fuga de PII y baja el peso de datos.
- [ ] **Autenticación del admin**: Supabase Auth con un solo usuario (email/password del productor). Crear `RequireAuth` que envuelva `AdminLayout`, página de login `/admin/login`, botón cerrar sesión.
- [ ] **Migrar config a Supabase** (tabla `config` ya existe en el schema): reescribir `src/lib/config.ts` para leer/escribir la fila id=1. Lectura pública (los clientes necesitan horarios, despacho, WhatsApp, datos de transferencia), escritura autenticada. **Esto arregla los datos bancarios falsos.** Sacar los datos personales reales de `DEFAULT_CONFIG`.
- [ ] **IDs de pedido no adivinables**: reemplazar `Math.random().substring(2,9)` por `crypto.randomUUID()` (mostrar al cliente solo los primeros 8 chars como número de pedido).
- [ ] **Arreglar el checkout que traga errores**: si `createOrder` falla → mostrar error al cliente, NO limpiar carrito, NO navegar a confirmación. Botón reintentar.
- [ ] Migrar también `gastos_fijos` y `product_costs` de localStorage a Supabase (tablas ya existen; hoy `Precios.tsx` y `Finanzas.tsx` usan localStorage). `competidores` y `proveedores` no tienen tabla aún — crearlas o dejarlas en localStorage (solo las usa el admin, decisión de prioridad).

## Fase 2 — Backend + Mercado Pago (Checkout Pro)

Se necesita un backend mínimo porque el Access Token de MP es secreto. Recomendación: **desplegar en Vercel** (hosting del frontend + funciones serverless en `/api`, gratis para este volumen). Alternativa: Supabase Edge Functions.

- [ ] Cuenta de Mercado Pago vendedor + credenciales (primero TEST, luego producción). Guardar `MP_ACCESS_TOKEN` como variable de entorno del servidor (nunca `VITE_*`).
- [ ] **`POST /api/create-preference`**: recibe items `{id, quantity}` + datos de entrega → **recalcula precios y total desde Supabase** (no confiar en el cliente; aquí se resuelve el problema #7) → valida stock → crea el pedido con `payment_status='pendiente_pago'` → crea la preferencia de MP (external_reference = id del pedido, back_urls a `/confirmation?order=...`) → devuelve `init_point`.
- [ ] Frontend Checkout: si el método es MercadoPago → llamar al endpoint y redirigir a `init_point` (en móvil abre la app de MP si está instalada). Si es Transferencia → flujo actual.
- [ ] **`POST /api/mp-webhook`**: recibe notificación de pago, **valida consultando la API de MP con el payment_id** (no confiar en el body), actualiza el pedido: `payment_status='pagado'` + `mp_payment_id`. Configurar la URL del webhook en el panel de MP.
- [ ] Schema: agregar a `orders` las columnas `payment_status text default 'pendiente_pago'`, `mp_preference_id text`, `mp_payment_id text`. Estados: `pendiente_pago | pagado | pendiente_transferencia | rechazado`.
- [ ] Confirmation: mostrar estado de pago real (pagado ✓ / pendiente / rechazado con opción de reintentar).
- [ ] Admin Pedidos: badge de estado de pago; filtrar/destacar pedidos pagados vs pendientes de transferencia.
- [ ] Vercel: configurar rewrite SPA (todas las rutas → index.html) porque usa BrowserRouter.
- [ ] Probar flujo completo con tarjetas de prueba de MP antes de pasar a credenciales de producción.

## Fase 3 — Frontend, renderizado y UX móvil

- [ ] **Estados de carga**: Home/Catalog muestran vacío mientras cargan (grave en móvil con red lenta). Agregar skeletons de ProductCard y estado de error con reintentar.
- [ ] **Imágenes**: `loading="lazy"` + `decoding="async"` en `ProductCard`; las imágenes son URLs externas — a mediano plazo subirlas a Supabase Storage con tamaños optimizados.
- [ ] **Fuente**: quitar el `@import` de Google Fonts en `index.css` (bloquea render); usar `<link rel="preconnect">` + `<link>` en `index.html`, o self-host con `font-display: swap`.
- [ ] Deduplicar `computeStockRemaining` (se hace en Fase 1 con el RPC).
- [ ] Confirmation: detener el polling de 10s cuando el pedido llega a "Entregado" y cuando la pestaña está oculta (`document.visibilityState`).
- [ ] Checkout móvil: el resumen del pedido queda abajo en pantallas chicas — agregar barra fija inferior con total + botón confirmar (patrón mobile-first).
- [ ] Validar teléfono chileno en checkout (formato +56 9) — es el único canal de contacto con el cliente.
- [ ] Bloquear checkout de productos sin stock (hoy se puede pedir algo agotado si ya estaba en el carrito).
- [ ] PWA básica: `manifest.json` + iconos para "Agregar a pantalla de inicio" (opcional pero barato y valioso siendo mobile-first).
- [ ] Accesibilidad mínima: textos `text-[10px]`/`text-[9px]` son muy chicos para tocar/leer en móvil; revisar áreas táctiles ≥44px en botones +/- del ProductCard.

## Fase 4 — Pulido pre-lanzamiento

- [ ] Revisar admin en móvil real (el productor opera desde el teléfono): tablas de Pedidos/Precios en pantallas chicas.
- [ ] Página 404 (ruta comodín en App.tsx).
- [ ] Probar flujo completo end-to-end en un teléfono real: pedido con MP, pedido con transferencia, cambio de estado desde admin, tracking del cliente.
- [ ] Checklist de lanzamiento: config real cargada en Supabase (banco, WhatsApp, horarios), productos reales con fotos, stock del día cargado, credenciales MP en producción, dominio apuntando a Vercel.

---

## Orden recomendado de sesiones

1. **Sesión 1**: Fase 0 completa + RLS + fix del checkout que traga errores (lo más urgente y autocontenido).
2. **Sesión 2**: Auth del admin + migración de config a Supabase + RPC de stock.
3. **Sesión 3**: Deploy a Vercel + Mercado Pago en modo TEST.
4. **Sesión 4**: Webhook + estados de pago + pruebas end-to-end; pasar MP a producción.
5. **Sesión 5**: Fase 3 (UX/rendimiento) + Fase 4 (pulido y checklist final).
