/**
 * GET /api/cric-live — delegates to liveScoreService (no direct external API calls)
 */
const express = require("express");
const router = express.Router();
const liveScoreService = require("../services/liveScoreService");

router.get("/", async (req, res) => {
  try {
    const data = await liveScoreService.getLiveMatchData();
    return res.json(data);
  } catch (error) {
    console.error("[cric-live] Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const data = await liveScoreService.refreshAndPushLiveUpdate(null, {
      force: req.query.force === "true",
    });
    res.json({
      success: !data.error,
      message: "Refreshed via liveScoreService (single API gateway)",
      matches: data.matches,
      source: data.source,
      cacheLayer: data.cacheLayer,
      cacheStatus: liveScoreService.getCacheStatus(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/scorecard/:matchId", (req, res) => {
  res.status(503).json({
    success: false,
    error:
      "Scorecard endpoint disabled to protect API quota. Use GET /api/live-scores (cached).",
    matchId: req.params.matchId,
  });
});

router.get("/debug", (req, res) => {
  res.json({
    gateway: "liveScoreService.js",
    primaryAPI: "CricAPI currentMatches only",
    cacheDurationMs: liveScoreService.CACHE_DURATION,
    minApiIntervalMs: 5 * 60 * 1000,
    mongoCollection: "live_cache",
    cricapiConfigured: !!process.env.CRIC_API_KEY,
    note: "GET = cache only. POST /refresh = only API call path.",
    cacheStatus: liveScoreService.getCacheStatus(),
  });
});

module.exports = router;
