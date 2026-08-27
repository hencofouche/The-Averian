import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
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

  app.post("/api/create-checkout", async (req, res) => {
    try {
      const { origin } = req.body;
      const baseOrigin = origin || req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : "");
      
      const response = await fetch('https://payments.yoco.com/api/checkouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY || 'sk_test_24cb0bf2GVzG8nl403046679e9f7'}`
        },
        body: JSON.stringify({
          amount: 45000,
          currency: 'ZAR',
          successUrl: `${baseOrigin}/?payment=success`,
          cancelUrl: `${baseOrigin}/?payment=cancel`
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
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
