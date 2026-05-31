/**
 * GET  /api/live-scores         — cache only (memory → MongoDB)
 * POST /api/live-scores/refresh — ONLY endpoint that may call Rapid API
 */
const { predictionDB } = require("../config/db");
const {
  fetchLiveIPLScores,
  refreshAndPushLiveUpdate,
  getCacheStatus,
} = require("../services/liveScoreService");

exports.getScores = async (req, res) => {
  try {
    const result = await fetchLiveIPLScores(predictionDB);
    const {
      matches, upcomingMatches, completedMatches,
      source, updatedAt, fromCache, cacheLayer,
      warning, error, apiBlocked, uiState,
      liveCount, upcomingCount, completedCount, iplTotal,
    } = result;

    res.setHeader("X-Data-Source", source || "cache");
    res.setHeader("X-Updated-At", updatedAt || new Date().toISOString());
    res.setHeader("X-Cache-Layer", cacheLayer || "unknown");
    if (fromCache)  res.setHeader("X-From-Cache",  "true");
    if (apiBlocked) res.setHeader("X-Api-Blocked", "true");
    if (warning)    res.setHeader("X-Api-Warning", warning);

    const live     = matches          || [];
    const upcoming = upcomingMatches  || [];
    const done     = completedMatches || [];

    // Derive uiState if service didn't set it
    const state = uiState || (
      live.length     > 0 ? "live"     :
      upcoming.length > 0 ? "upcoming" :
      done.length     > 0 ? "completed" :
      error           ? "api-unavailable" : "no-live-match"
    );

    const displaySource =
      result.displaySource ||
      (source === "rapidapi"
        ? "Live via Rapid API"
        : source === "mongodb-cache" || fromCache
          ? "Using MongoDB cache"
          : "No live match today");

    return res.json({
      uiState:          state,
      matches:          live,
      upcomingMatches:  upcoming,
      completedMatches: done,
      liveCount:        liveCount     ?? live.length,
      upcomingCount:    upcomingCount ?? upcoming.length,
      completedCount:   completedCount?? done.length,
      iplTotal:         iplTotal      ?? 0,
      source:           source        || "none",
      displaySource,
      cacheLayer:       cacheLayer    || "none",
      fromCache:        !!fromCache,
      apiBlocked:       !!apiBlocked,
      updatedAt:        updatedAt     || new Date().toISOString(),
      warning:          warning       || null,
      error:            error         || null,
      hint:
        state === "no-live-match"
          ? "No live match today"
          : state === "api-unavailable"
            ? "Rapid API unavailable. Use Fetch from API to retry."
            : state === "upcoming"
              ? `Match starts at 7:30 PM IST — ${upcoming.length} fixture(s) scheduled`
              : null,
    });
  } catch (err) {
    console.error("[live-scores]", err.message);
    return res.status(500).json({
      uiState: "api-unavailable",
      error: err.message || "Failed to read live scores cache",
      matches: [], upcomingMatches: [], completedMatches: [],
    });
  }
};


/** Manual API refresh — single allowed external fetch path */
exports.refreshScores = async (req, res) => {
  try {
    const force = req.query.force === "true" || req.body?.force === true;
    const payload = await refreshAndPushLiveUpdate(predictionDB, { force });

    const live     = payload.matches          || [];
    const upcoming = payload.upcomingMatches  || [];
    const done     = payload.completedMatches || [];
    const state =
      live.length     > 0 ? "live"     :
      upcoming.length > 0 ? "upcoming" :
      done.length     > 0 ? "completed" : "no-live-match";

    res.json({
      success:          !payload.error,
      uiState:          state,
      matches:          live,
      upcomingMatches:  upcoming,
      completedMatches: done,
      liveCount:        payload.liveCount     ?? live.length,
      upcomingCount:    payload.upcomingCount  ?? upcoming.length,
      completedCount:   payload.completedCount ?? done.length,
      iplTotal:         payload.iplTotal       ?? 0,
      source:           payload.source,
      cacheLayer:       payload.cacheLayer,
      updatedAt:        payload.updatedAt,
      warning:          payload.warning,
      error:            payload.error,
      cacheStatus:      getCacheStatus(),
    });
  } catch (err) {
    console.error("[live-scores/refresh]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCacheStatus = (req, res) => {
  res.json({ success: true, ...getCacheStatus() });
};
