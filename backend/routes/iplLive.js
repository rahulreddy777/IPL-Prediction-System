/**
 * GET /api/ipl-live — delegates to liveScoreService (cached CricAPI)
 */
const express = require("express");
const router = express.Router();
const liveScoreService = require("../services/liveScoreService");

router.get("/", async (req, res) => {
  try {
    const payload = await liveScoreService.getLiveScores();

    if (payload.error && (!payload.raw || payload.raw.length === 0)) {
      return res.status(503).json({
        success: false,
        error: payload.error,
        source: payload.source,
      });
    }

    return res.json({
      success: true,
      source: payload.source,
      provider: payload.provider,
      fromCache: payload.fromCache,
      count: payload.iplTotal || payload.data?.length || 0,
      liveCount: payload.liveCount,
      data: payload.raw || payload.data || [],
      matches: payload.matches || [],
      updatedAt: payload.updatedAt,
    });
  } catch (error) {
    console.error("[ipl-live] Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
