// Vercel Serverless Function (Node). Mercado Pago llama esta URL cuando
// cambia el estado de un pago. NUNCA se confía en el cuerpo de la
// notificación: se vuelve a consultar el pago real a la API de MP con el id.
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

type ApiRequest = {
  method?: string;
  body: unknown;
  query: Record<string, string | string[] | undefined>;
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

const supabase = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN as string });

function mapMpStatus(status: string): 'pagado' | 'rechazado' | 'pendiente_pago' {
  if (status === 'approved') return 'pagado';
  if (status === 'rejected' || status === 'cancelled') return 'rechazado';
  return 'pendiente_pago';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const body = (req.body ?? {}) as { type?: string; data?: { id?: string } };
    const query = req.query ?? {};
    const type = body.type ?? (query.type as string | undefined) ?? (query.topic as string | undefined);
    const paymentId =
      body.data?.id ?? (query['data.id'] as string | undefined) ?? (query.id as string | undefined);

    // Solo nos interesan notificaciones de pago; ignorar merchant_order, etc.
    if (type !== 'payment' || !paymentId) {
      res.status(200).json({ ok: true });
      return;
    }

    const payment = new Payment(mpClient);
    const info = await payment.get({ id: paymentId });

    const orderId = info.external_reference;
    if (!orderId) {
      res.status(200).json({ ok: true });
      return;
    }

    const paymentStatus = mapMpStatus(info.status ?? '');
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus, mp_payment_id: String(info.id) })
      .eq('id', orderId);

    if (error) {
      console.error('mp-webhook update:', error.message);
      // 500 para que Mercado Pago reintente la notificación más tarde.
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('mp-webhook:', err);
    res.status(500).json({ error: 'webhook error' });
  }
}
