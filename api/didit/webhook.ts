import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow Didit Webhook POST requests
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'didit-webhook', active: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    console.log('Received Didit Webhook on Vercel:', JSON.stringify(payload, null, 2));

    const sessionId = payload?.session_id || payload?.id;
    const status = payload?.status || payload?.decision?.status;
    const vendorData = payload?.vendor_data;

    return res.status(200).json({
      received: true,
      sessionId,
      status,
      vendorData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error handling Didit webhook on Vercel:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
