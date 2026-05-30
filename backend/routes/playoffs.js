/**
 * /api/playoffs — Dynamic playoff bracket
 */
const express = require("express");
const router = express.Router();
const { predictionDB } = require("../config/db");
const playoffEngine = require("../services/playoffEngine");
const autoPlayoffEngine = require("../services/autoPlayoffEngine");

// GET /api/playoffs — root handler (same as /bracket)
router.get("/", async (req, res) => {
  try {
    const bracket = await playoffEngine.getPlayoffBracket(predictionDB, { emit: false });
    res.json({ success: true, ...bracket });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/playoffs/bracket — existing bracket (legacy + new combined)
router.get("/bracket", async (req, res) => {
  try {
    const emit = req.query.emit === "true";
    const bracket = await playoffEngine.getPlayoffBracket(predictionDB, { emit });
    res.json({ success: true, ...bracket });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/playoffs/refresh — force refresh from live
router.post("/refresh", async (req, res) => {
  try {
    const bracket = await playoffEngine.refreshPlayoffsFromLive(predictionDB);
    res.json({
      success: true,
      message: "Playoffs updated from live results",
      ...bracket,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/playoffs/auto-bracket — auto engine bracket (real-time state)
router.get("/auto-bracket", async (req, res) => {
  try {
    const bracket = await autoPlayoffEngine.getAutoPlayoffBracket(predictionDB);
    res.json({ success: true, ...bracket });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/playoffs/auto-tick — trigger auto playoff tick immediately
router.post("/auto-tick", async (req, res) => {
  try {
    const result = await autoPlayoffEngine.runAutoPlayoffTick(predictionDB);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
