import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, email, sellerName, aviaryName, sellerProfileId, redirectUrl } = req.body || {};
    const apiKey = process.env.DIDIT_API_KEY;
    const workflowId = process.env.DIDIT_WORKFLOW_ID;

    const baseOrigin = redirectUrl || req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : "https://the-averian-alpha.vercel.app");
    const callback = `${baseOrigin}/?didit_verify=callback&sellerId=${encodeURIComponent(sellerProfileId || '')}&uid=${encodeURIComponent(userId || '')}`;

    if (apiKey && workflowId) {
      const diditRes = await fetch("https://verification.didit.me/v3/session/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          vendor_data: userId || sellerProfileId || "averian-breeder",
          callback: callback,
          metadata: {
            email: email || "",
            sellerName: sellerName || "",
            aviaryName: aviaryName || "",
            sellerProfileId: sellerProfileId || "",
            platform: "The Averian"
          }
        })
      });

      const data = await diditRes.json();
      if (!diditRes.ok) {
        return res.status(diditRes.status).json({
          error: data.message || data.error || "Failed to create verification session with Didit",
          details: data,
          isLive: false
        });
      }

      return res.status(200).json({
        success: true,
        sessionId: data.session_id || data.id,
        sessionUrl: data.session_url || data.url,
        sessionToken: data.session_token || null,
        status: data.status || "Not Started",
        isLive: true
      });
    }

    // Sandbox / Test fallback if API keys are not set
    const demoSessionId = `didit_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return res.status(200).json({
      success: true,
      sessionId: demoSessionId,
      sessionUrl: `${baseOrigin}/?didit_verify=sandbox&session_id=${demoSessionId}&sellerId=${encodeURIComponent(sellerProfileId || '')}&uid=${encodeURIComponent(userId || '')}`,
      status: "Sandbox Ready",
      isLive: false,
      message: "Didit API credentials not configured in environment. Running in Test/Simulated mode."
    });
  } catch (error: any) {
    console.error("Vercel Didit Create Session Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
