/**
 * /api/playoff-predictions — Advanced AI Playoff Prediction Engine
 */
const express = require("express");
const router = express.Router();
const { predictionDB } = require("../config/db");
const predictionService = require("../services/predictionService");
const { getAutoPlayoffBracket } = require("../services/autoPlayoffEngine");
const wsServer = require("../services/websocketServer");

// GET /api/playoff-predictions/all — All 4 playoff match predictions
router.get("/all", async (req, res) => {
  try {
    const p71 = await predictionService.getPrediction(71);
    const p72 = await predictionService.getPrediction(72);
    const p73 = await predictionService.getPrediction(73);
    const p74 = await predictionService.getPrediction(74);

    res.json({
      success: true,
      predictions: [p71, p72, p73, p74]
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/playoff-predictions/match/:stage — Single match prediction
router.get("/match/:stage", async (req, res) => {
  try {
    const stage = String(req.params.stage).toUpperCase();
    const STAGE_MAP = { Q1: 71, ELIM: 72, Q2: 73, FINAL: 74 };
    const matchId = STAGE_MAP[stage];
    if (!matchId) return res.status(400).json({ error: "Invalid stage. Use Q1, ELIM, Q2, FINAL" });
    const pred = await predictionService.getPrediction(matchId);
    res.json(pred);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/playoff-predictions/recalc — Recalculate from live score or toss simulation
router.post("/recalc", async (req, res) => {
  try {
    const { matchId, tossWinner, tossDecision } = req.body;
    const pred = await predictionService.getPrediction(matchId, { tossWinner, tossDecision });

    // Emit WebSocket events as requested
    wsServer.broadcast({ type: "AI_PREDICTION_UPDATE", matchId: Number(matchId), ...pred, timestamp: Date.now() });
    wsServer.broadcast({ type: "PLAYOFF_PREDICTION_UPDATE", matchId: Number(matchId), ...pred, timestamp: Date.now() });
    wsServer.broadcast({
      type: "MATCH_MOMENTUM_UPDATE",
      matchId: Number(matchId),
      momentum: pred.momentum || "Stable",
      timestamp: Date.now()
    });

    res.json({ success: true, ...pred });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

