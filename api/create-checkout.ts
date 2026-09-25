import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { origin: bodyOrigin, userId, userEmail, userName } = req.body || {};
    const origin = bodyOrigin || req.headers.origin || `https://${req.headers.host}`;
    const yocoKey = process.env.YOCO_SECRET_KEY || 'sk_test_24cb0bf2GVzG8nl403046679e9f7';
    
    const successUrl = `${origin}/?payment=success${userId ? `&uid=${encodeURIComponent(userId)}` : ''}${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ''}`;
    const cancelUrl = `${origin}/?payment=cancel`;

    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yocoKey}`
      },
      body: JSON.stringify({
        amount: 45000,
        currency: 'ZAR',
        metadata: {
          userId: userId || '',
          userEmail: userEmail || '',
          userName: userName || '',
          plan: 'yearly',
          product: 'The Averian Annual Subscription'
        },
        successUrl,
        cancelUrl
      })
    });
    
    const data = await response.json();

    if (data.id) {
      const updatedSuccessUrl = `${origin}/?payment=success&checkoutId=${encodeURIComponent(data.id)}${userId ? `&uid=${encodeURIComponent(userId)}` : ''}${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ''}`;
      try {
        await fetch(`https://payments.yoco.com/api/checkouts/${encodeURIComponent(data.id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${yocoKey}`
          },
          body: JSON.stringify({ successUrl: updatedSuccessUrl })
        });
      } catch (_) {}
    }

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
