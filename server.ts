import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { fileURLToPath } from "url";
import app, { broadcastWebSocketMessage, setWssInstance } from "./api/index";

let __dirname: string;
try {
  // @ts-ignore
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}

dotenv.config();

const PORT = 3000;

async function startServer() {
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  setWssInstance(wss);

  // Online active users tracking for presence
  const onlineUsers = new Map<string, any>();

  wss.on("connection", (ws: WebSocket) => {
    let connectedUserId: string | null = null;

    // Send initial status check or ping
    ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));

    ws.on("message", (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        } else if (msg.type === "presence_join" && msg.user) {
          connectedUserId = msg.user.id || Math.random().toString(36).substring(2);
          onlineUsers.set(connectedUserId, { ...msg.user, id: connectedUserId, lastSeen: Date.now() });
          broadcastWebSocketMessage({ type: "online_users", users: Array.from(onlineUsers.values()) });
        } else {
          // Broadcast all real-time events (admin_chat_message, admin_chat_update, admin_chat_delete, db_change, etc.) instantly
          broadcastWebSocketMessage(msg);
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
      }
    });

    ws.on("close", () => {
      if (connectedUserId && onlineUsers.has(connectedUserId)) {
        onlineUsers.delete(connectedUserId);
        broadcastWebSocketMessage({ type: "online_users", users: Array.from(onlineUsers.values()) });
      }
    });

    ws.on("error", (err) => {
      console.warn("WebSocket client error:", err.message);
    });
  });

  // Serve static uploads using UPLOAD_DIR or fallback to path.join(__dirname, 'public/uploads')
  const uploadDir = process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== ''
    ? process.env.UPLOAD_DIR
    : path.join(__dirname, "public", "uploads");
  const distUploadsPath = path.join(process.cwd(), "dist", "uploads");

  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {}
  }
  if (!fs.existsSync(distUploadsPath)) {
    try {
      fs.mkdirSync(distUploadsPath, { recursive: true });
    } catch (e) {}
  }
  app.use("/uploads", express.static(uploadDir));
  app.use("/api/uploads", express.static(uploadDir));
  app.use("/uploads", express.static(distUploadsPath));
  app.use("/api/uploads", express.static(distUploadsPath));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use("/attaroqqy", express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running with Realtime WebSockets on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
