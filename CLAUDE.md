# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Fruto.app: aplicación de delivery de frutas y verduras frescas a domicilio (zona La Serena / Coquimbo / Las Compañías, Chile). SPA frontend-only en React 19 + TypeScript + Vite + Tailwind CSS 4, con Supabase como base de datos. Toda la UI está en español; los montos son CLP.

**Posicionamiento de marca (decisión del usuario, 2026-07-14):** el mensaje es "tus frutas y verduras en tu hogar, frescas y seleccionadas para ti, sin salir de casa" — conveniencia, frescura y selección. NO prometer origen de campo/cosecha propia/"sin intermediarios" en textos visibles al cliente (el negocio compra y revende; cuando haya proveedores directos se podrá comunicar).

## Comandos

```bash
npm run dev      # servidor de desarrollo en puerto 3000
npm run build    # build de producción (vite build → dist/)
npm run lint     # chequeo de tipos con tsc --noEmit (no hay ESLint)
```

No hay tests configurados.

## Configuración

- `.env` requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (cliente en `src/lib/supabase.ts`); ver `.env.example`.
- El schema de la base de datos está en `supabase/schema.sql` y la seguridad (RLS, tabla `admins`, RPCs `get_order`/`stock_remaining`) en `supabase/policies.sql`; ambos se ejecutan manualmente en Supabase Dashboard → SQL Editor. Al agregar tablas o columnas hay que actualizar esos archivos y avisarle al usuario que los ejecute. Toda tabla nueva DEBE nacer con RLS y políticas.

## Arquitectura

Dos áreas montadas en `src/App.tsx`:

- **Tienda** (`/`, con `Layout`): Home, Catalog, Cart, Checkout, Confirmation. El carrito vive en `src/context/CartContext.tsx`.
- **Admin** (`/admin`, con `AdminLayout` envuelto en `RequireAuth`): páginas en `src/pages/admin/` (Pedidos, Ruta, Catalogo, Clientes, Cosechas, Reportes, Configuracion, Costos, Finanzas, Precios, Proveedores, Competencia). Login en `/admin/login` con Supabase Auth (`src/lib/auth.ts`); ser admin = estar en la tabla `admins` (no basta estar autenticado — ver `supabase/policies.sql`).

### Capa de datos — dividida entre Supabase y localStorage

El acceso a Supabase está centralizado en `src/lib/` (un archivo por tabla, con funciones `load*`/`upsert*`/`delete*` que mapean snake_case de la BD ↔ camelCase de los tipos TS en `src/types.ts`):

| Datos | Almacenamiento |
|---|---|
| products, categories, orders, costs, stock | Supabase (`src/lib/products.ts`, `orders.ts`, `costs.ts`, `stock.ts`) |
| config (`fruto_config`), gastos fijos (`fruto_gastos_fijos`), costos por producto (`fruto_product_costs`), competidores (`fruto_competidores`), proveedores (`fruto_proveedores`), carrito (`fruto_cart`), último pedido (`fruto_last_order_id`, lo escribe Checkout y lo lee Confirmation) | localStorage (claves con prefijo `fruto_`) |

Ojo: `schema.sql` ya define las tablas `config`, `gastos_fijos` y `product_costs`, pero el código todavía las lee/escribe en localStorage — migración pendiente. Al tocar esos módulos, mantener la coherencia con lo que exista o completar la migración, no mezclar ambas fuentes.

### Convenciones

- Tipos de dominio compartidos en `src/types.ts` (Product, Order, Competidor, Proveedor, etc.).
- IDs generados en cliente como strings con prefijo y timestamp (ej. `p-${Date.now()}`).
- La configuración del negocio (horarios de corte/entrega, costo de despacho, sectores activos, medios de pago) se maneja vía `src/lib/config.ts` (`loadConfig`/`saveConfig` + `DEFAULT_CONFIG`).
- Estilos con clases Tailwind inline; `clsx` + `tailwind-merge` disponibles vía `src/lib/utils.ts`.
- Las "colecciones" de la Home (Ensaladas, Smoothies, etc.) son datos estáticos en `src/lib/collections.ts`, no vienen de la BD.

### Historia

El proyecto nació de una plantilla de Google AI Studio; los residuos (deps sin uso, `metadata.json`, datos demo, README genérico) se limpiaron en la Fase 0 del plan (2026-07-14).

## Plan de lanzamiento

`PLAN.md` (raíz del proyecto) contiene el plan de acción por fases para dejar la app lista para el público (auditoría de seguridad, backend + Mercado Pago, UX móvil). Al trabajar en cualquiera de esos frentes, leerlo primero y marcar los ítems completados.

## Contexto de colaboración

El usuario es un productor local, no técnico. Explicar los cambios en español y en términos simples; evitar jerga innecesaria al reportar resultados.
