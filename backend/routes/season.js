/**
 * /api/season — Automatic season engine (event-driven, no polling)
 */
const express = require("express");
const router = express.Router();
const { predictionDB } = require("../config/db");
const seasonEngine = require("../services/seasonEngine");
const {
  rebuildPointsTableFromMatches,
  getFreshPointsTable,
  importOfficialPointsTable,
  getOfficialSnapshot,
} = require("../services/pointsTableService");
const { clonePointsTable, emitPointsTableUpdate } = require("../services/seasonWebSocket");
const { predictMatchFrom2026Stats } = require("../services/seasonPredictionEngine");

/** GET /api/season/status */
router.get("/status", async (req, res) => {
  try {
    const status = await seasonEngine.getSeasonStatus(predictionDB);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/season/points-table */
router.get("/points-table", async (req, res) => {
  try {
    const table = clonePointsTable(await getFreshPointsTable(predictionDB));
    res.json({ success: true, pointsTable: table });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/season/champion */
router.get("/champion", async (req, res) => {
  try {
    await predictionDB.asPromise();
    const champion = await predictionDB.collection("ipl_champion_2026").findOne({ season: 2026 });
    res.json({ success: true, champion });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/set-points-table — import official standings JSON */
router.post("/set-points-table", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.teams?.length) {
      return res.status(400).json({ error: "Body must include teams[]" });
    }
    const { rows, snapshot } = await importOfficialPointsTable(predictionDB, payload);
    const table = clonePointsTable(rows);
    emitPointsTableUpdate("official_import", table);
    res.json({ success: true, pointsTable: table, snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/season/official-snapshot */
router.get("/official-snapshot", async (req, res) => {
  try {
    const snapshot = await getOfficialSnapshot(predictionDB, req.query.season || 2026);
    res.json({ success: true, snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/rebuild-table — sync points from completed matches 1–67 */
router.post("/rebuild-table", async (req, res) => {
  try {
    const max = Number(req.body?.maxMatch) || 67;
    const table = await rebuildPointsTableFromMatches(predictionDB, max);
    res.json({ success: true, pointsTable: table });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/predict — predict one match from 2026 stats */
router.post("/predict", async (req, res) => {
  try {
    const { team1, team2, venue } = req.body;
    if (!team1 || !team2) {
      return res.status(400).json({ error: "team1 and team2 required" });
    }
    const prediction = await predictMatchFrom2026Stats(team1, team2, venue || "");
    res.json({ success: true, prediction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/season/match-winner/:matchId — resolve winner (live → DB → prediction) */
router.get("/match-winner/:matchId", async (req, res) => {
  try {
    const info = await seasonEngine.getMatchWinner(predictionDB, req.params.matchId);
    res.json({ success: true, ...info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/sync-match/:matchId — process from live score / DB (e.g. M68 LSG vs PBKS) */
router.post("/sync-match/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await seasonEngine.processMatchFromLive(predictionDB, matchId, {
      force: req.body?.force === true,
      winner: req.body?.winner,
      allowPredicted: req.body?.allowPredicted === true,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/sync-match-68 — shortcut for LSG vs PBKS */
router.post("/sync-match-68", async (req, res) => {
  try {
    const result = await seasonEngine.processMatchFromLive(predictionDB, 68, {
      force: req.body?.force === true,
      winner: req.body?.winner,
      allowPredicted: req.body?.allowPredicted !== false,
    });
    res.json({ success: true, matchId: 68, teams: ["LSG", "PBKS"], ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/process-match/:matchId */
router.post("/process-match/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const { team1, team2, predictionResult } = req.body;
    if (!team1 || !team2) {
      return res.status(400).json({ error: "team1, team2 required" });
    }
    let pred = predictionResult;
    if (!pred) {
      pred = await predictMatchFrom2026Stats(team1, team2, req.body.venue || "");
    }
    const result = await seasonEngine.processMatchResult(
      predictionDB,
      matchId,
      team1,
      team2,
      pred
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/run-league — matches 68–70 */
router.post("/run-league", async (req, res) => {
  try {
    const result = await seasonEngine.runLeagueMatches68to70(predictionDB);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/run-playoffs */
router.post("/run-playoffs", async (req, res) => {
  try {
    const result = await seasonEngine.runPlayoffs(predictionDB);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/season/run-full — M68 → Champion */
router.post("/run-full", async (req, res) => {
  try {
    const result = await seasonEngine.runFullSeasonSimulation(predictionDB);
    if (result.skipped) {
      return res.status(409).json({
        success: false,
        skipped: true,
        reason: result.reason,
        message: "Season engine is already running",
      });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
