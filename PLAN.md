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

## Fase 0 — Fundaciones (rápida, hacer primero) ✅ 2026-07-14

- [x] `git init` + primer commit (`.gitignore` ya excluye `.env` ✓).
- [x] Quitar dependencias sin uso: `@google/genai`, `express`, `dotenv`, `@types/express`, `tsx`, `esbuild` (residuos de plantilla AI Studio; también `autoprefixer`, innecesario con Tailwind v4). Borrar `metadata.json`, reescribir `README.md`.
- [x] Revisar/borrar datos demo: `src/data.ts`, `src/data/demoOrders.ts` (verificado: nada los importaba). También `src/pages/admin/AdminPlaceholder.tsx` (sin uso).
- [x] `index.html`: `lang="es"`, meta description, theme-color, favicon, og:tags.
- [x] Fix menor en `src/index.css`: `tracking-grow` no es una propiedad CSS válida (debería ser `letter-spacing`).
- [x] Extras: `.env.example` reescrito con las variables reales de Supabase; `vite.config.ts` simplificado (residuos AI Studio); `npm audit fix` → 0 vulnerabilidades (Vite 6.4.3); `package.json` renombrado a `fruto-app`.

## Fase 1 — Seguridad (BLOQUEANTE: nada de público antes de esto)

- [x] **Habilitar RLS en todas las tablas** (`supabase/policies.sql` creado 2026-07-14 — ⚠️ PENDIENTE: ejecutarlo en el SQL Editor + crear el usuario admin, instrucciones en el propio archivo):
  - ⚠️ **Diseñar las políticas pensando en la Fase 4 (cuentas de cliente)**: "autenticado" NO va a significar "admin" cuando los clientes también tengan cuenta. Usar una verificación explícita de admin (tabla `admins` con el uid del productor, o claim en el JWT) en vez de `authenticated` a secas para las políticas de escritura/lectura sensible.
  - `products`, `categories`, `config`, `stock`: SELECT público; escritura solo admin.
  - `orders`: INSERT público (checkout anónimo); SELECT/UPDATE solo admin. Para que el cliente vea SU pedido en Confirmation sin exponer los demás: función RPC `get_order(order_id)` (security definer) o SELECT filtrado por id no adivinable.
  - `costs`, `gastos_fijos`, `product_costs`: todo solo admin.
- [x] **Stock público sin exponer pedidos**: RPC `stock_remaining()` (security definer) en `policies.sql`; `computeStockRemaining()` eliminada de `Home.tsx`/`Catalog.tsx`, reemplazada por `loadStockRemaining()` en `src/lib/stock.ts`. Elimina la fuga de PII.
- [x] **Autenticación del admin**: `RequireAuth` envuelve `AdminLayout`, login en `/admin/login` (`src/pages/admin/Login.tsx`, `src/lib/auth.ts`), botón cerrar sesión en sidebar y header móvil. ⚠️ PENDIENTE: crear el usuario en Supabase Dashboard → Authentication → Users y registrarlo en la tabla `admins` (instrucciones en `policies.sql`).
- [x] **Migrar config a Supabase** (2026-07-14): `src/lib/config.ts` lee/escribe la fila id=1 (lectura pública, escritura admin). `DEFAULT_CONFIG` quedó sin datos bancarios/WhatsApp falsos (vacíos); si faltan datos bancarios, Confirmation muestra "te enviaremos los datos por WhatsApp" en vez de datos inventados. Puente de migración: mientras la fila esté vacía se usa la copia localStorage del navegador del productor — ⚠️ PENDIENTE: abrir /admin/configuracion y presionar Guardar una vez para dejar la config real en Supabase.
- [x] **IDs de pedido no adivinables**: `crypto.randomUUID()` en Checkout; helper `shortOrderId()` muestra los primeros 8 chars como número de pedido (Confirmation, Admin, Pedidos, Ruta, CSV). El cliente ve su pedido vía RPC `get_order(order_id)`.
- [x] **Arreglar el checkout que traga errores**: si `createOrder` falla → banner de error, el carrito se conserva, no navega; el botón pasa a "Reintentar pedido".
- [x] Migrar también `gastos_fijos` y `product_costs` de localStorage a Supabase (2026-07-14): nueva capa `src/lib/precios.ts` (upsert con debounce + delete por fila + auto-migración desde localStorage al primer uso); las tablas se redefinieron en formato `{id, data jsonb}` — ⚠️ PENDIENTE: ejecutar `supabase/migracion-precios.sql` en el SQL Editor. `competidores` y `proveedores` quedan en localStorage por ahora (solo los usa el admin, sin urgencia).

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

- [x] **Estados de carga**: Home/Catalog muestran skeletons (`ProductSkeleton.tsx`) mientras cargan y `LoadError.tsx` con botón "Reintentar" si falla la carga.
- [x] **Imágenes**: `loading="lazy"` + `decoding="async"` en `ProductCard` y en las tarjetas del carrito.
- [x] **Fuente**: quitado el `@import` de Google Fonts en `index.css`; ahora `<link rel="preconnect">` + `<link>` en `index.html`.
- [x] Deduplicar `computeStockRemaining` (hecho en Fase 1 con el RPC).
- [ ] **Code-splitting del admin**: el bundle sigue ~848 kB porque todo `/admin` se descarga junto con la tienda. Cargar las páginas admin con `React.lazy()` para que el cliente móvil solo baje la tienda.
- [x] Confirmation: el polling de 10s se detiene cuando el pedido llega a "Entregado" y se pausa cuando la pestaña está oculta (`document.visibilityState`).
- [x] Checkout móvil: barra fija inferior con total + botón confirmar.
- [x] Validar teléfono chileno en checkout (`src/lib/phone.ts`, formato +56 9).
- [x] Bloquear checkout de productos sin stock: `Cart.tsx`/`Checkout.tsx` comparan contra `loadStockRemaining()` y revalidan el stock justo antes de enviar el pedido.
- [ ] PWA básica: `manifest.json` + iconos para "Agregar a pantalla de inicio" (opcional pero barato y valioso siendo mobile-first).
- [x] Accesibilidad mínima: botones y campos con área táctil ≥44px (`min-h-11`/`h-10`) en ProductCard, Cart y Checkout.

### Extra (no estaba en el plan original): modo de entrega "Hoy" vs "Mañana"

Se agregó una funcionalidad nueva de negocio junto con lo de arriba: el cliente elige en el checkout si quiere el pedido **mañana** (planificado, envío gratis sobre el umbral configurado) o **hoy** (urgente, siempre paga despacho, con ventana horaria a elegir). Afecta `Cart.tsx`, `Checkout.tsx`, `Confirmation.tsx`, admin `Pedidos.tsx`/`Ruta.tsx`/`Configuracion.tsx`, `types.ts`, `config.ts` y el schema de `orders` (`delivery_mode`, `delivery_slot`).

⚠️ **PENDIENTE: ejecutar `supabase/migracion-delivery.sql` en el SQL Editor de Supabase** para agregar esas dos columnas a la tabla `orders` ya existente (mismo patrón que las migraciones anteriores — es seguro re-ejecutarlo).

## Fase 4 — Cuentas de cliente (opcionales)

> Principio rector: **comprar como invitado sigue siendo el flujo principal y no debe agregar ni un paso**. La cuenta es 100% opcional; su valor es que la segunda compra sea aún más rápida (datos precargados), más historial y futuras ofertas.

- [ ] Supabase Auth para clientes (email + password, o magic link — decidir por simplicidad). El mismo sistema de auth del admin (Fase 1) pero con rol distinto: el admin se distingue por tabla `admins`/claim, nunca por "estar autenticado".
- [ ] Tabla `profiles` (id = `auth.uid()`, nombre, teléfono, dirección, sector) con RLS: cada cliente lee/escribe solo su propia fila.
- [ ] Columna `orders.user_id` (nullable): los pedidos de invitados quedan sin usuario; los de clientes con sesión quedan vinculados a su cuenta.
- [ ] **Invitación post-compra en Confirmation** (momento ideal, sin fricción): "¿Quieres guardar tus datos para que la próxima compra sea más rápida?" → crea la cuenta reutilizando los datos ya ingresados en el checkout (solo pide email y contraseña).
- [ ] Checkout con sesión activa: precargar nombre, teléfono, dirección y sector desde `profiles`.
- [ ] Página "Mi cuenta": datos de entrega editables + historial de pedidos + botón "repetir pedido" (rellena el carrito con un pedido anterior).
- [ ] Entrada discreta en la UI: icono de cuenta en el navbar (y en MobileNav). Nunca interrumpir ni condicionar el flujo de compra.
- [ ] Base para ofertas a registrados: campo opt-in de ofertas en `profiles` (para futuras promociones/email); las ofertas mismas quedan para después del lanzamiento.

## Fase 5 — Pulido pre-lanzamiento

- [ ] Revisar admin en móvil real (el productor opera desde el teléfono): tablas de Pedidos/Precios en pantallas chicas.
- [ ] Página 404 (ruta comodín en App.tsx).
- [ ] Probar flujo completo end-to-end en un teléfono real: pedido con MP, pedido con transferencia, cambio de estado desde admin, tracking del cliente.
- [ ] Checklist de lanzamiento: config real cargada en Supabase (banco, WhatsApp, horarios), productos reales con fotos, stock del día cargado, credenciales MP en producción, dominio apuntando a Vercel.

---

## Orden recomendado de sesiones

1. **Sesión 1**: ~~Fase 0 completa~~ ✅ + RLS + fix del checkout que traga errores (lo más urgente y autocontenido).
2. **Sesión 2**: Auth del admin + migración de config a Supabase + RPC de stock.
3. **Sesión 3**: Deploy a Vercel + Mercado Pago en modo TEST.
4. **Sesión 4**: Webhook + estados de pago + pruebas end-to-end; pasar MP a producción.
5. **Sesión 5**: Fase 3 (UX/rendimiento).
6. **Sesión 6**: Fase 4 (cuentas de cliente opcionales).
7. **Sesión 7**: Fase 5 (pulido y checklist final).
