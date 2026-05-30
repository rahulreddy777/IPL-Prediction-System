/**
 * Win probability — event-driven triggers (no polling)
 */
const express = require("express");
const router = express.Router();
const { predictionDB } = require("../config/db");
const { pushWinPredictionUpdate } = require("../services/winProbabilityStream");
const { calculateWinProbability, normalizeMatchState } = require("../services/winProbabilityEngine");
const websocketServer = require("../services/websocketServer");

// POST /api/trigger-win-update/:matchId
router.post("/trigger-win-update/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const { event } = req.body || {};
    const result = await pushWinPredictionUpdate(predictionDB, matchId, { event });
    res.json({
      success: true,
      ...result.payload,
      clientsNotified: result.clients,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/win-probability/simulate-ball/:matchId — ball event → WS push
router.post("/simulate-ball/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const { eventType, team } = req.body || {};
    const allowed = ["wicket", "boundary", "run"];
    if (!allowed.includes(eventType)) {
      return res.status(400).json({
        error: `eventType must be one of: ${allowed.join(", ")}`,
      });
    }
    if (!team) {
      return res.status(400).json({ error: "team (batting team code) is required" });
    }

    const result = await pushWinPredictionUpdate(predictionDB, matchId, {
      event: { type: eventType, team },
    });

    res.json({
      success: true,
      simulated: { eventType, team },
      ...result.payload,
      clientsNotified: result.clients,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/win-probability/calculate — stateless calc from body (no WS)
router.post("/calculate", express.json(), (req, res) => {
  try {
    const state = normalizeMatchState(req.body);
    const prob = calculateWinProbability(state);
    res.json({ success: true, ...prob, state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/win-probability/ws-status
router.get("/ws-status", (req, res) => {
  res.json({
    success: true,
    path: "/ws",
    connectedClients: websocketServer.getClientCount(),
  });
});

module.exports = router;
