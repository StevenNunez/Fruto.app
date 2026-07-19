// Vercel Serverless Function (Node). Lee la página de un competidor y
// extrae los precios con Claude — la misma técnica que usamos a mano en
// las sesiones de análisis, ahora con un botón. Solo el ADMIN puede
// llamarla (cada llamada consume créditos de la API de Anthropic).
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

type ApiRequest = {
  method?: string;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

const supabase = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

type IncomingBody = {
  /** URL del sitio del competidor. */
  url?: string;
  /** Nombres de los productos que el admin ya rastrea de este competidor. */
  productos?: string[];
};

type PrecioExtraido = { nombre: string; precio: number; unidad: string };

/** Reduce el HTML a texto plano para no gastar tokens en etiquetas. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  // Solo el admin: la extracción con IA tiene costo por llamada.
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Debes iniciar sesión como admin.' });
    return;
  }
  const { data: userData } = await supabase.auth.getUser(token);
  const uid = userData.user?.id;
  if (!uid) {
    res.status(401).json({ error: 'Sesión inválida. Vuelve a iniciar sesión.' });
    return;
  }
  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle();
  if (!adminRow) {
    res.status(403).json({ error: 'Solo el administrador puede usar esta función.' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({
      error:
        'Falta configurar ANTHROPIC_API_KEY en Vercel (Settings → Environment Variables).',
    });
    return;
  }

  const body = (req.body ?? {}) as IncomingBody;
  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    res.status(400).json({ error: 'Este competidor no tiene sitio web registrado.' });
    return;
  }
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  const productos = Array.isArray(body.productos) ? body.productos.filter(Boolean) : [];

  try {
    // 1. Descargar la página desde el servidor (el navegador no puede por CORS)
    const controller = new AbortController();
    const fetchTimer = setTimeout(() => controller.abort(), 20_000);
    let html: string;
    try {
      const page = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept-Language': 'es-CL,es;q=0.9',
        },
      });
      if (!page.ok) {
        res.status(502).json({
          error: `El sitio del competidor respondió con error (${page.status}). Puede tener protección anti-robots.`,
        });
        return;
      }
      html = await page.text();
    } finally {
      clearTimeout(fetchTimer);
    }

    const text = htmlToText(html).slice(0, 80_000);
    if (text.length < 200) {
      res.status(422).json({
        error:
          'La página no entregó contenido legible (probablemente carga sus precios con JavaScript o bloquea robots). Actualiza estos precios a mano.',
      });
      return;
    }

    // 2. Extraer precios con Claude (salida estructurada garantizada)
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    nombre: { type: 'string' },
                    precio: { type: 'number' },
                    unidad: { type: 'string' },
                  },
                  required: ['nombre', 'precio', 'unidad'],
                  additionalProperties: false,
                },
              },
            },
            required: ['items'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'user',
          content: `Este es el texto de la página de un competidor chileno que vende frutas y verduras (precios en pesos chilenos, CLP).

Extrae los productos con su precio actual. Reglas:
- "precio" es un número en CLP sin puntos ni símbolos (ej: 1990, no "$1.990").
- "unidad" es la unidad de venta tal como aparece (kg, unidad, malla, bandeja, atado, 500g, docena...). Si no aparece, usa "unidad".
- Ignora despacho, mínimos de compra y productos sin precio claro.
- Nos interesan especialmente estos productos si aparecen: ${productos.length > 0 ? productos.join(', ') : '(todos los que encuentres)'} — pero incluye también el resto de frutas y verduras con precio.
- Si el mismo producto aparece con varios formatos, incluye cada formato como ítem aparte.

TEXTO DE LA PÁGINA:
${text}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      res.status(422).json({ error: 'No se pudo analizar esta página. Inténtalo de nuevo.' });
      return;
    }

    let parsed: { items: PrecioExtraido[] } = { items: [] };
    for (const block of response.content) {
      if (block.type === 'text') {
        parsed = JSON.parse(block.text) as { items: PrecioExtraido[] };
        break;
      }
    }

    const items = (parsed.items ?? []).filter(
      (i) => i.nombre && typeof i.precio === 'number' && i.precio > 0
    );

    res.status(200).json({ items, total: items.length });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(500).json({ error: 'La clave de Anthropic en Vercel es inválida.' });
      return;
    }
    if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'Límite de la API de IA alcanzado. Espera un minuto y reintenta.' });
      return;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      res.status(504).json({ error: 'El sitio del competidor tardó demasiado en responder.' });
      return;
    }
    console.error('scrape-competencia:', err);
    res.status(500).json({ error: 'No pudimos leer el sitio del competidor. Inténtalo de nuevo.' });
  }
}
