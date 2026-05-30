/**
 * cricbuzz.js — /api/cricbuzz
 * Live scores + scorecard from RapidAPI Free Cricbuzz Cricket API
 *
 * GET  /api/cricbuzz/live        — refresh + return live IPL matches
 * POST /api/cricbuzz/refresh     — force refresh from RapidAPI
 * GET  /api/cricbuzz/match/:id   — full scorecard for a matchId
 * GET  /api/cricbuzz/cache       — return MongoDB cached data (no API call)
 */
const express = require("express");
const router  = express.Router();
const {
  refreshCricbuzzLive,
  fetchMatchInfo,
  getCricbuzzCache,
} = require("../services/cricbuzzService");

// GET /api/cricbuzz/live — fetch live IPL from RapidAPI
router.get("/live", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const data  = await refreshCricbuzzLive(force);
    res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error("[/api/cricbuzz/live]", err.message);
    res.status(500).json({
      success: false,
      error:   err.message,
      matches: [],
      liveCount: 0,
      uiState:   "api-unavailable",
      source:    "cricbuzz-rapidapi",
    });
  }
});

// POST /api/cricbuzz/refresh — force refresh
router.post("/refresh", async (req, res) => {
  try {
    const data = await refreshCricbuzzLive(true);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("[/api/cricbuzz/refresh]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cricbuzz/match/:matchId — full scorecard
router.get("/match/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const info = await fetchMatchInfo(matchId);
    res.json({ success: true, matchId, data: info });
  } catch (err) {
    console.error("[/api/cricbuzz/match]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cricbuzz/cache — read MongoDB cache only
router.get("/cache", async (req, res) => {
  try {
    const data = await getCricbuzzCache();
    if (data) {
      return res.json({ success: true, fromCache: true, ...data });
    }
    res.json({ success: true, fromCache: false, matches: [], liveCount: 0, uiState: "no-live-match" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
