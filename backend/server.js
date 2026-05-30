/**
 * server.js — Express entry point (port 5000)
 * Run: node server.js   or   npm start
 */
require("dotenv").config();

const http = require("http");
const app = require("./app");
const { initWebSocketServer } = require("./services/websocketServer");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initWebSocketServer(server);

// Season engine single-run guard (also set in seasonEngine.js)
global.seasonRunning = global.seasonRunning || false;

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket AI stream: ws://localhost:${PORT}/ws`);
  console.log(
    `CricAPI key: ${process.env.CRIC_API_KEY ? process.env.CRIC_API_KEY.slice(0, 8) + "..." : "NOT SET"}`
  );
  console.log(`Live scores (cache): GET http://localhost:${PORT}/api/live-scores`);
  console.log(`Live refresh (API): POST http://localhost:${PORT}/api/live-scores/refresh`);

  try {
    const { predictionDB } = require("./config/db");
    await predictionDB.asPromise();
    require("./services/liveScoreService"); // Starts the poll interval
    const { ensurePlayoffMatches } = require("./services/iplMatchesService");
    await ensurePlayoffMatches(predictionDB);
  } catch (e) {
    console.warn("Startup initialization failed:", e.message);
  }

  try {
    await require("./services/statsDataLoader").loadMLStats();
  } catch (e) {
    console.error("[statsDataLoader] Startup load failed:", e.message);
  }

  try {
    const { initAgent } = require("./services/liveMatchAgent");
    await initAgent();
  } catch (e) {
    console.warn("[Agent] Could not init:", e.message);
  }
});

module.exports = server;
