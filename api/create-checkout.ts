import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const origin = req.headers.origin || `https://${req.headers.host}`;
    
    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY || 'sk_test_24cb0bf2GVzG8nl403046679e9f7'}`
      },
      body: JSON.stringify({
        amount: 45000,
        currency: 'ZAR',
        successUrl: `${origin}/?payment=success`,
        cancelUrl: `${origin}/?payment=cancel`
      })
    });
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
