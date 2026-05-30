/**
 * websocketServer.js — WebSocket broadcast hub (no polling)
 */
const WebSocket = require("ws");

let wss = null;
const clients = new Set();

function initWebSocketServer(httpServer) {
  if (wss) return wss;

  wss = new WebSocket.Server({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    clients.add(ws);
    console.log(`[WebSocket] Client connected (${clients.size} total)`);

    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        message: "IPL AI Win Probability stream ready",
        path: "/ws",
        timestamp: Date.now(),
      })
    );

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected (${clients.size} remaining)`);
    });

    ws.on("error", () => clients.delete(ws));
  });

  console.log("[WebSocket] Server attached at path /ws");
  return wss;
}

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  let sent = 0;
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(msg);
        sent += 1;
      } catch {
        clients.delete(ws);
      }
    }
  });
  return sent;
}

function getClientCount() {
  return clients.size;
}

module.exports = {
  initWebSocketServer,
  broadcast,
  getClientCount,
};
