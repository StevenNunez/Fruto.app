// Vercel Serverless Function (Node). Crea el pedido y la preferencia de
// pago de Mercado Pago (Checkout Pro). El total SIEMPRE se recalcula acá
// desde Supabase — nunca se confía en el precio que mande el navegador.
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { randomUUID } from 'node:crypto';

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

const SECTORS = ['La Serena', 'Coquimbo', 'Las Compañías'];

type IncomingItem = { id: string; quantity: number };
type IncomingBody = {
  items?: IncomingItem[];
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerSector?: string;
  notes?: string;
  deliveryMode?: 'manana' | 'hoy';
  deliverySlot?: string;
};

// Debe reflejar exactamente src/lib/config.ts → computeDeliveryFee().
function computeDeliveryFee(
  subtotal: number,
  mode: 'manana' | 'hoy',
  deliveryFee: number,
  freeDeliveryThreshold: number
): number {
  if (mode === 'hoy') return deliveryFee;
  return subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const body = (req.body ?? {}) as IncomingBody;

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    res.status(400).json({ error: 'El carrito está vacío.' });
    return;
  }
  if (!body.customerName?.trim() || !body.customerAddress?.trim() || !body.customerPhone?.trim()) {
    res.status(400).json({ error: 'Faltan datos de entrega.' });
    return;
  }
  if (!body.customerSector || !SECTORS.includes(body.customerSector)) {
    res.status(400).json({ error: 'Sector de entrega inválido.' });
    return;
  }
  const deliveryMode: 'manana' | 'hoy' = body.deliveryMode === 'hoy' ? 'hoy' : 'manana';

  // Cliente con cuenta: el token viene en el header y se VERIFICA contra
  // Supabase (nunca se acepta un user_id enviado directo por el navegador).
  let userId: string | null = null;
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    userId = userData.user?.id ?? null;
  }

  let orderId: string | null = null;

  try {
    // 1. Precios reales desde Supabase (nunca los del navegador)
    const ids = rawItems.map((i) => i.id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, unit, category, image, is_season')
      .in('id', ids);
    if (productsError) throw new Error(productsError.message);

    type DbProductRow = {
      id: string;
      name: string;
      price: number;
      unit: string;
      category: string;
      image: string;
      is_season: boolean;
    };
    const productMap = new Map((products as DbProductRow[] | null ?? []).map((p) => [p.id, p]));

    const orderItems = rawItems
      .map((i) => {
        const p = productMap.get(i.id);
        if (!p) return null;
        const quantity = Math.max(1, Math.floor(Number(i.quantity) || 0));
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.unit,
          category: p.category,
          image: p.image,
          isSeason: p.is_season,
          quantity,
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    if (orderItems.length === 0) {
      res.status(400).json({ error: 'Ninguno de los productos existe.' });
      return;
    }

    // 2. Validar stock disponible
    const { data: stockData, error: stockError } = await supabase.rpc('stock_remaining');
    if (stockError) throw new Error(stockError.message);
    const stockMap = new Map(
      (stockData as { product_id: string; remaining: number }[] | null ?? []).map((r) => [
        r.product_id,
        r.remaining,
      ])
    );
    const stockIssues = orderItems.filter((i) => {
      const remaining = stockMap.get(i.id);
      return remaining !== undefined && i.quantity > remaining;
    });
    if (stockIssues.length > 0) {
      res.status(409).json({
        error: `Sin stock suficiente: ${stockIssues.map((i) => i.name).join(', ')}`,
      });
      return;
    }

    // 3. Total real: subtotal + despacho según config y modo de entrega
    const { data: configRow } = await supabase.from('config').select('data').eq('id', 1).maybeSingle();
    const cfg = (configRow?.data ?? {}) as { deliveryFee?: number; freeDeliveryThreshold?: number };
    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = computeDeliveryFee(
      subtotal,
      deliveryMode,
      cfg.deliveryFee ?? 2500,
      cfg.freeDeliveryThreshold ?? 10000
    );
    const total = subtotal + deliveryFee;

    // 4. Crear el pedido (pendiente de pago hasta que el webhook confirme)
    orderId = randomUUID();
    const { error: insertError } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: body.customerName.trim(),
      customer_address: body.customerAddress.trim(),
      customer_phone: body.customerPhone.trim(),
      customer_sector: body.customerSector,
      items: orderItems,
      total,
      status: 'Pendiente',
      payment_method: 'MercadoPago',
      notes: body.notes?.trim() || null,
      created_at: new Date().toISOString(),
      delivery_mode: deliveryMode,
      delivery_slot: deliveryMode === 'hoy' ? body.deliverySlot ?? null : null,
      payment_status: 'pendiente_pago',
      user_id: userId,
    });
    if (insertError) throw new Error(insertError.message);

    // 5. Crear la preferencia de pago en Mercado Pago
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = req.headers.host as string;
    const origin = `${proto}://${host}`;

    const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN as string });
    const preference = new Preference(mpClient);

    const prefItems = orderItems.map((i) => ({
      id: i.id,
      title: i.name,
      quantity: i.quantity,
      unit_price: i.price,
      currency_id: 'CLP',
    }));
    if (deliveryFee > 0) {
      prefItems.push({
        id: 'despacho',
        title: `Despacho (${deliveryMode === 'hoy' ? 'hoy' : 'mañana'})`,
        quantity: 1,
        unit_price: deliveryFee,
        currency_id: 'CLP',
      });
    }

    const preferenceResult = await preference.create({
      body: {
        items: prefItems,
        external_reference: orderId,
        back_urls: {
          success: `${origin}/confirmation?order=${orderId}`,
          failure: `${origin}/confirmation?order=${orderId}`,
          pending: `${origin}/confirmation?order=${orderId}`,
        },
        auto_return: 'approved',
        notification_url: `${origin}/api/mp-webhook`,
      },
    });

    await supabase.from('orders').update({ mp_preference_id: preferenceResult.id }).eq('id', orderId);

    res.status(200).json({ orderId, initPoint: preferenceResult.init_point });
  } catch (err) {
    console.error('create-preference:', err);
    // Si el pedido alcanzó a crearse pero algo después falló, no lo dejamos
    // huérfano (el cliente nunca vería este pedido y quedaría bloqueando stock).
    if (orderId) {
      await supabase.from('orders').delete().eq('id', orderId).then(
        () => {},
        () => {}
      );
    }
    res.status(500).json({ error: 'No pudimos iniciar el pago. Intenta de nuevo.' });
  }
}
