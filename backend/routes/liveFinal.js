/**
 * liveFinal.js — /api/live-final
 * ─────────────────────────────────────────────────────────────────────────────
 * Live IPL 2026 Final: GT vs RCB
 * Powered by RapidAPI Free Cricbuzz Cricket API
 *
 * Routes:
 *   GET  /api/live-final              — full live match data (cached 15s)
 *   GET  /api/live-final/commentary   — live ball-by-ball commentary
 *   GET  /api/live-final/scorecard    — full innings scorecard
 *   GET  /api/live-final/cache        — return MongoDB cache without calling API
 *   POST /api/live-final/refresh      — force refresh from RapidAPI
 *   GET  /api/live-final/discover     — auto-discover matchId from live scores
 */

const express = require("express");
const router = express.Router();

const {
  fetchLiveFinalMatch,
  fetchCommentary,
  fetchScorecard,
  findFinalMatchId,
  getCachedFinalData,
  FINAL_MATCH_ID,
} = require("../services/rapidApiService");

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMatchId(req) {
  return req.query.matchid || req.query.matchId || req.params.matchId || FINAL_MATCH_ID;
}

// ── GET /api/live-final ───────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const matchId = getMatchId(req);
    const data = await fetchLiveFinalMatch(matchId);

    return res.json({
      success: true,
      matchTitle: "🏆 IPL 2026 FINAL — GT vs RCB",
      dataSource: "RapidAPI • Free Cricbuzz Cricket API",
      refreshInterval: 15,
      ...data,
    });
  } catch (err) {
    console.error("[/api/live-final]", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      message: "Failed to fetch live final match data",
    });
  }
});

// ── GET /api/live-final/commentary ────────────────────────────────────────────
router.get("/commentary", async (req, res) => {
  try {
    const matchId = getMatchId(req);
    const data = await fetchCommentary(matchId);
    return res.json({ success: true, matchTitle: "IPL 2026 Final Commentary", ...data });
  } catch (err) {
    console.error("[/api/live-final/commentary]", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      commentary: [],
    });
  }
});

// ── GET /api/live-final/scorecard ─────────────────────────────────────────────
router.get("/scorecard", async (req, res) => {
  try {
    const matchId = getMatchId(req);
    const data = await fetchScorecard(matchId);
    return res.json({ success: true, matchTitle: "IPL 2026 Final Scorecard", ...data });
  } catch (err) {
    console.error("[/api/live-final/scorecard]", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      innings: [],
    });
  }
});

// ── GET /api/live-final/cache — read MongoDB only ─────────────────────────────
router.get("/cache", async (req, res) => {
  try {
    const data = await getCachedFinalData();
    if (data) {
      return res.json({ success: true, fromCache: true, ...data });
    }
    return res.json({
      success: true,
      fromCache: false,
      message: "No cache available yet. Call GET /api/live-final to fetch from API.",
    });
  } catch (err) {
    console.error("[/api/live-final/cache]", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/live-final/refresh — force bypass cache ─────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const matchId = getMatchId(req);
    // Force fresh fetch by passing a dummy timestamp to bust in-memory cache
    const data = await fetchLiveFinalMatch(matchId + "?force=" + Date.now());
    return res.json({
      success: true,
      refreshed: true,
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (err) {
    console.error("[/api/live-final/refresh]", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/live-final/discover — auto-find GT vs RCB matchId ────────────────
router.get("/discover", async (req, res) => {
  try {
    const matchId = await findFinalMatchId();
    return res.json({
      success: true,
      matchId,
      message: matchId ? `Found IPL Final matchId: ${matchId}` : "Could not auto-discover. Using default.",
    });
  } catch (err) {
    console.error("[/api/live-final/discover]", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
