/**
 * /api/predictions2026 — Match-by-match predictions + live correction
 */
const express = require("express");
const router = express.Router();
const svc = require("../services/predictions2026Service");

router.get("/config", (req, res) => {
  try {
    res.json({ success: true, ...svc.getPanelConfig() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/matches", async (req, res) => {
  try {
    const live = req.query.live === "true" || req.query.refresh === "true";
    if (live) {
      const board = await svc.getMatchesBoardWithLive();
      return res.json({ success: true, ...board });
    }
    const board = await svc.getMatchesBoardAsync(null, { emitPlayoffs: false });
    res.json({
      success: true,
      config: svc.getPanelConfig(),
      league: board.league,
      remaining: board.remaining,
      playoffs: board.playoffs,
      playoffBracket: board.playoffBracket,
      total: board.all.length,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/match/:matchId", async (req, res) => {
  try {
    const bundle = await svc.getMatchPredictionBundle(req.params.matchId);
    res.json({ success: true, ...bundle });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/match/:matchId/sync-live", async (req, res) => {
  try {
    const result = await svc.syncPredictionFromLive(req.params.matchId, {
      force: req.body?.force === true,
      winner: req.body?.winner,
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/match/:matchId/predict", async (req, res) => {
  try {
    const bundle = await svc.getMatchPredictionBundle(req.params.matchId);
    const { predictionDB } = require("../config/db");
    const { pushWinPredictionUpdate } = require("../services/winProbabilityStream");
    if (bundle.team1 && bundle.team2) {
      await pushWinPredictionUpdate(predictionDB, bundle.matchId);
    }
    res.json({ success: true, bundle });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
