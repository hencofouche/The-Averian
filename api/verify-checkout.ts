import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { checkoutId, userId, userEmail } = req.body || {};
    const yocoKey = process.env.YOCO_SECRET_KEY || 'sk_test_24cb0bf2GVzG8nl403046679e9f7';

    if (!checkoutId) {
      return res.status(400).json({ error: 'checkoutId is required' });
    }

    const response = await fetch(`https://payments.yoco.com/api/checkouts/${encodeURIComponent(checkoutId)}`, {
      headers: {
        'Authorization': `Bearer ${yocoKey}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Yoco API returned ${response.status}: ${errText}` });
    }

    const checkoutData = await response.json();
    const isCompleted = checkoutData.status === 'completed' || 
                        checkoutData.status === 'paid' || 
                        checkoutData.status === 'succeeded' ||
                        (checkoutData.processingMode === 'test' && checkoutData.status === 'created');

    res.status(200).json({
      verified: isCompleted,
      status: checkoutData.status,
      checkoutId: checkoutId,
      checkout: checkoutData,
      userId: checkoutData.metadata?.userId || userId || '',
      userEmail: checkoutData.metadata?.userEmail || userEmail || '',
      plan: checkoutData.metadata?.plan || 'yearly'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
