import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import webpush from "web-push";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

// Initialize Firebase Admin for server-side use
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
admin.initializeApp({
  projectId: firebaseConfig.projectId
});
const db = admin.firestore();

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:clashfouche@gmail.com',
  process.env.VITE_VAPID_PUBLIC_KEY || 'BJqzp7rkr1obW1Tr2C7_Jm-7H_pS1ybLDsgJBeQewq46Ws2HpXF1jF_g1h9sthZw7KmmtnjziqdIXfiyB7wGLno',
  process.env.VAPID_PRIVATE_KEY || 'uuvXpzIkGXcdPJl8do9liQ3zqQaqGBH554CXz9Da0iw'
);

// Background loop for reminders
setInterval(async () => {
  try {
    const now = new Date();
    const tasksRef = db.collection('tasks');
    const snapshot = await tasksRef.where('status', '!=', 'Completed').get();
    
    for (const taskDoc of snapshot.docs) {
      const task = taskDoc.data();
      if (task.reminderDate && !task.serverNotified) {
        const reminderTime = new Date(task.reminderDate);
        const diff = now.getTime() - reminderTime.getTime();
        
        // If reminder is due (within last 5 minutes)
        if (diff >= 0 && diff < 300000) {
          // Get user subscriptions
          const subsRef = db.collection('push_subscriptions');
          const subSnapshot = await subsRef.where('userId', '==', task.uid).get();
          
          let notifiedAny = false;
          for (const subDoc of subSnapshot.docs) {
            const subscription = subDoc.data();
            try {
              await webpush.sendNotification({
                endpoint: subscription.endpoint,
                keys: {
                  auth: subscription.keys.auth,
                  p256dh: subscription.keys.p256dh
                }
              }, JSON.stringify({
                title: 'The Averian Reminder',
                body: task.title,
                url: '/tasks'
              }));
              notifiedAny = true;
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await subDoc.ref.delete();
              }
            }
          }
          
          if (notifiedAny) {
            await taskDoc.ref.update({ serverNotified: true });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in reminder loop:", error);
  }
}, 60000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/save-subscription", async (req, res) => {
    try {
      const { subscription, userId } = req.body;
      if (!subscription || !userId) {
        return res.status(400).json({ error: "Missing subscription or userId" });
      }

      // Store subscription in Firestore
      const subsRef = db.collection('push_subscriptions');
      const existing = await subsRef.where('userId', '==', userId).where('endpoint', '==', subscription.endpoint).get();
      
      if (existing.empty) {
        await subsRef.add({
          ...subscription,
          userId,
          createdAt: new Date().toISOString()
        });
      }
      
      res.status(201).json({ status: "success" });
    } catch (error: any) {
      console.error("Error saving subscription:", error);
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

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
