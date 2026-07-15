# Fruto.app

Aplicación de delivery de frutas y verduras frescas a domicilio en La Serena, Coquimbo y Las Compañías (Chile).

SPA en React 19 + TypeScript + Vite + Tailwind CSS 4, con Supabase como base de datos.

## Desarrollo

**Requisitos:** Node.js 20+

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear un archivo `.env` en la raíz (ver `.env.example`) con las credenciales de Supabase:

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

3. Ejecutar el schema de `supabase/schema.sql` en Supabase Dashboard → SQL Editor (solo la primera vez o al cambiar el schema).

4. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La app queda en http://localhost:3000 — tienda en `/`, panel de administración en `/admin`.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción en `dist/` |
| `npm run lint` | Chequeo de tipos (`tsc --noEmit`) |

## Documentación

- `PLAN.md` — plan de lanzamiento por fases (seguridad, pagos, UX).
- `CLAUDE.md` — arquitectura y convenciones del código.
