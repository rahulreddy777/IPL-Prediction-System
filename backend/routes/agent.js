const express = require("express");
const router  = express.Router();
const agent   = require("../services/liveMatchAgent");

/* GET /api/agent/results */
router.get("/results", (req, res) => {
  res.json({ success: true, results: agent.getResults(), stats: agent.getStats() });
});

/* GET /api/agent/stats */
router.get("/stats", (req, res) => {
  res.json({ success: true, stats: agent.getStats() });
});

/* POST /api/agent/trigger — manual API refresh + process (no polling) */
router.post("/trigger", async (req, res) => {
  try {
    await agent.triggerNow();
    res.json({ success: true, results: agent.getResults(), stats: agent.getStats(), processStatus: agent.getPollStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /api/agent/live — return cached live scores */
router.get("/live", (req, res) => {
  const cached = agent.getCachedScores();
  const poll   = agent.getPollStatus();
  const live   = cached.filter(m => m.matchStarted && !m.matchEnded);
  const ended  = cached.filter(m => m.matchEnded);
  res.json({
    success: true,
    liveCount: live.length,
    liveMatches: live,
    recentEnded: ended.slice(0, 3),
    pollStatus: poll,
  });
});

/*
 * POST /api/agent/inject-live
 * Manually push live score data when CricAPI is rate-limited.
 * Body: { matches: [ { name, status, score: [{inning,r,w,o}], matchStarted, matchEnded } ] }
 */
router.post("/inject-live", (req, res) => {
  const { matches } = req.body;
  if (!Array.isArray(matches) || matches.length === 0)
    return res.status(400).json({ success: false, error: "matches[] required" });

  const existing = agent.getCachedScores().filter(c =>
    !matches.find(m => m.name === c.name)
  );
  agent.cachedLiveData = [...existing, ...matches];
  console.log(`[Agent] ✅ Injected ${matches.length} live match(es) manually.`);
  res.json({ success: true, injected: matches.length, total: agent.cachedLiveData.length });
});

/* GET /api/agent/stream — SSE push on new results */
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: "init", results: agent.getResults(), stats: agent.getStats() })}\n\n`);

  const onUpdate = (p) => res.write(`data: ${JSON.stringify({ type: "update", ...p })}\n\n`);
  const onResult = (r) => res.write(`data: ${JSON.stringify({ type: "newResult", record: r })}\n\n`);
  agent.on("update", onUpdate);
  agent.on("matchResult", onResult);
  req.on("close", () => {
    agent.off("update", onUpdate);
    agent.off("matchResult", onResult);
  });
});

module.exports = router;
