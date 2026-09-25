import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Version Endpoint for PWA version management & cache busting
  app.get(["/version.json", "/api/version"], (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json({
      version: "1.0.25",
      buildTime: Date.now(),
      app: "The Averian"
    });
  });

  // Didit KYC Config & Status
  app.get("/api/didit/config", (req, res) => {
    const isConfigured = Boolean(process.env.DIDIT_API_KEY && process.env.DIDIT_WORKFLOW_ID);
    res.json({
      configured: isConfigured,
      hasApiKey: Boolean(process.env.DIDIT_API_KEY),
      hasWorkflow: Boolean(process.env.DIDIT_WORKFLOW_ID),
      workflowId: process.env.DIDIT_WORKFLOW_ID || null
    });
  });

  // Create Didit KYC Verification Session
  app.post("/api/didit/create-session", async (req, res) => {
    try {
      const { userId, email, sellerName, aviaryName, sellerProfileId, redirectUrl } = req.body;
      const apiKey = process.env.DIDIT_API_KEY;
      const workflowId = process.env.DIDIT_WORKFLOW_ID;

      const baseOrigin = redirectUrl || req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : "");
      const callback = `${baseOrigin}/?didit_verify=callback&sellerId=${encodeURIComponent(sellerProfileId || '')}&uid=${encodeURIComponent(userId || '')}`;

      if (apiKey && workflowId) {
        // Official Didit v3 Session API
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
          console.error("Didit API Error:", data);
          return res.status(diditRes.status).json({
            error: data.message || data.error || "Failed to create verification session with Didit",
            details: data,
            isSandboxMode: false
          });
        }

        return res.json({
          success: true,
          sessionId: data.session_id || data.id,
          sessionUrl: data.session_url || data.url,
          sessionToken: data.session_token || null,
          status: data.status || "Not Started",
          isLive: true
        });
      }

      // Sandbox / Demo Verification Mode when API credentials are not yet saved in .env
      const demoSessionId = `didit_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return res.json({
        success: true,
        sessionId: demoSessionId,
        sessionUrl: `${baseOrigin}/?didit_verify=sandbox&session_id=${demoSessionId}&sellerId=${encodeURIComponent(sellerProfileId || '')}&uid=${encodeURIComponent(userId || '')}`,
        status: "Sandbox Ready",
        isLive: false,
        message: "Didit API credentials not configured in environment. Running in Test/Simulated mode."
      });
    } catch (error: any) {
      console.error("Error creating Didit session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check Didit Session Status
  app.get("/api/didit/session/:sessionId/status", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const apiKey = process.env.DIDIT_API_KEY;

      if (sessionId.startsWith("didit_sandbox_")) {
        return res.json({
          status: "Approved",
          decision: { status: "Approved" },
          isSandbox: true
        });
      }

      if (!apiKey) {
        return res.status(400).json({ error: "DIDIT_API_KEY is not configured" });
      }

      const diditRes = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
        headers: {
          "x-api-key": apiKey
        }
      });

      const data = await diditRes.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Error querying Didit session status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Didit Webhook Handler
  app.post("/api/didit/webhook", async (req, res) => {
    try {
      const payload = req.body;
      console.log("Received Didit Webhook:", JSON.stringify(payload, null, 2));

      // Didit sends session status updates
      const sessionId = payload.session_id || payload.id;
      const status = payload.status || payload.decision?.status;
      const vendorData = payload.vendor_data;

      // Webhook received successfully
      res.status(200).json({ received: true, sessionId, status, vendorData });
    } catch (error: any) {
      console.error("Error processing Didit webhook:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // File-backed and in-memory cache for recent checkouts to assist manual or automated recovery
  const CHECKOUTS_FILE = path.join(process.cwd(), "checkouts_log.json");
  const recentCheckouts = new Map<string, any>();

  // Load existing checkouts from disk if available
  try {
    if (fs.existsSync(CHECKOUTS_FILE)) {
      const savedData = JSON.parse(fs.readFileSync(CHECKOUTS_FILE, "utf-8"));
      if (Array.isArray(savedData)) {
        savedData.forEach((item: any) => {
          if (item && item.id) recentCheckouts.set(item.id, item);
        });
      }
    }
  } catch (loadErr) {
    console.warn("Failed to load checkouts_log.json:", loadErr);
  }

  const persistCheckout = (checkoutObj: any) => {
    try {
      if (!checkoutObj || !checkoutObj.id) return;
      recentCheckouts.set(checkoutObj.id, checkoutObj);
      const list = Array.from(recentCheckouts.values()).slice(-200); // keep last 200
      fs.writeFileSync(CHECKOUTS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (saveErr) {
      console.warn("Failed to save checkouts_log.json:", saveErr);
    }
  };

  app.post("/api/create-checkout", async (req, res) => {
    try {
      const { origin, userId, userEmail, userName } = req.body;
      const baseOrigin = origin || req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : "");
      const yocoKey = process.env.YOCO_SECRET_KEY || 'sk_test_24cb0bf2GVzG8nl403046679e9f7';
      
      const successUrl = `${baseOrigin}/?payment=success${userId ? `&uid=${encodeURIComponent(userId)}` : ''}${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ''}`;
      const cancelUrl = `${baseOrigin}/?payment=cancel`;

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
        // Immediately patch the checkout successUrl to explicitly include checkoutId!
        const updatedSuccessUrl = `${baseOrigin}/?payment=success&checkoutId=${encodeURIComponent(data.id)}${userId ? `&uid=${encodeURIComponent(userId)}` : ''}${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ''}`;
        try {
          await fetch(`https://payments.yoco.com/api/checkouts/${encodeURIComponent(data.id)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${yocoKey}`
            },
            body: JSON.stringify({ successUrl: updatedSuccessUrl })
          });
        } catch (patchErr) {
          console.warn("Could not patch checkout successUrl with checkoutId:", patchErr);
        }

        const record = {
          id: data.id,
          userId: userId || '',
          userEmail: userEmail || '',
          userName: userName || '',
          amount: 45000,
          currency: 'ZAR',
          plan: 'yearly',
          createdAt: new Date().toISOString(),
          status: data.status || 'created',
          redirectUrl: data.redirectUrl
        };
        persistCheckout(record);
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error creating Yoco checkout:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify a Yoco checkout status directly with Yoco API
  app.post("/api/verify-checkout", async (req, res) => {
    try {
      const { checkoutId, userId, userEmail } = req.body;
      const yocoKey = process.env.YOCO_SECRET_KEY || 'sk_test_24cb0bf2GVzG8nl403046679e9f7';

      let targetCheckoutId = checkoutId;

      // If no explicit checkoutId is supplied, search stored checkouts by userId or userEmail
      if (!targetCheckoutId && (userId || userEmail)) {
        const checkoutsList = Array.from(recentCheckouts.values());
        const match = checkoutsList
          .filter(c => 
            (userId && c.userId && c.userId === userId) ||
            (userEmail && c.userEmail && c.userEmail.toLowerCase() === String(userEmail).toLowerCase())
          )
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
        
        if (match) {
          targetCheckoutId = match.id;
        }
      }

      if (!targetCheckoutId) {
        return res.status(400).json({ error: "checkoutId or identifiable userId/userEmail is required" });
      }

      const response = await fetch(`https://payments.yoco.com/api/checkouts/${encodeURIComponent(targetCheckoutId)}`, {
        headers: {
          'Authorization': `Bearer ${yocoKey}`
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `Yoco API returned ${response.status}: ${errText}` });
      }

      const checkoutData = await response.json();
      
      // Check status (completed, succeeded, paid, or created in test mode)
      const isCompleted = checkoutData.status === 'completed' || 
                          checkoutData.status === 'paid' || 
                          checkoutData.status === 'succeeded' ||
                          (checkoutData.processingMode === 'test' && checkoutData.status === 'created');

      // Update in-memory and persistent cache
      const updatedRecord = {
        ...(recentCheckouts.get(targetCheckoutId) || {}),
        ...checkoutData,
        verifiedAt: new Date().toISOString(),
        verified: isCompleted
      };
      persistCheckout(updatedRecord);

      res.json({
        verified: isCompleted,
        status: checkoutData.status,
        checkoutId: targetCheckoutId,
        checkout: checkoutData,
        userId: checkoutData.metadata?.userId || userId || '',
        userEmail: checkoutData.metadata?.userEmail || userEmail || '',
        plan: checkoutData.metadata?.plan || 'yearly'
      });
    } catch (error: any) {
      console.error("Error verifying Yoco checkout:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Recent checkouts query endpoint for admin / diagnostics
  app.get("/api/yoco/recent-checkouts", (req, res) => {
    const list = Array.from(recentCheckouts.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ checkouts: list });
  });

  // Yoco Webhook Handler
  app.post("/api/yoco/webhook", async (req, res) => {
    try {
      const payload = req.body;
      console.log("[Yoco Webhook] Received webhook event:", JSON.stringify(payload, null, 2));

      const eventType = payload.type || payload.event;
      const checkoutId = payload.payload?.id || payload.id;
      const metadata = payload.payload?.metadata || payload.metadata || {};

      if (checkoutId) {
        recentCheckouts.set(checkoutId, {
          ...(recentCheckouts.get(checkoutId) || {}),
          ...payload,
          updatedAt: new Date().toISOString()
        });
      }

      res.status(200).json({ received: true, eventType, checkoutId });
    } catch (error: any) {
      console.error("Error processing Yoco webhook:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/manifest.json', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(process.cwd(), 'dist', 'manifest.json'));
    });

    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
