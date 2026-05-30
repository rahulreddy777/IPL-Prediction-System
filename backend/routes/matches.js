const express = require("express");
const router = express.Router();
const { getAllMatches } = require("../services/predictionService");
const iplMatches = require("../services/iplMatchesService");

/**
 * GET /api/matches — IPL 2026 (default) or historical ?season=YYYY
 * Query: search, stage (ALL|LEAGUE|LIVE|RESULT|UPCOMING|PLAYOFFS)
 */
router.get("/", async (req, res) => {
  try {
    const season = req.query.season;

    if (String(season) === "2026") {
      const matches = await iplMatches.getAllMatches2026({
        search: req.query.search,
        stage: req.query.stage || req.query.filter || "ALL",
      });
      const top4 = await require("../services/pointsTableService").getFreshPointsTable(
        require("../config/db").predictionDB
      );
      return res.json({
        success: true,
        season: 2026,
        count: matches.length,
        top4: top4.slice(0, 4).map((r) => r.team),
        matches,
      });
    }

    const historical = await getAllMatches({ season }) || [];
    return res.json(historical);
  } catch (err) {
    console.error("[GET /api/matches]", err.message);
    res.status(500).json({ success: false, error: err.message, matches: [] });
  }
});

/**
 * GET /api/matches/:matchNumber — single match detail (1–74)
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (/^\d+$/.test(id) && Number(id) >= 1 && Number(id) <= 74) {
      const match = await iplMatches.getMatchByNumber(id);
      return res.json({ success: true, match });
    }

    const matches = await getAllMatches({ season: id }) || [];
    return res.json(matches);
  } catch (err) {
    console.error("[GET /api/matches/:id]", err.message);
    res.status(404).json({ success: false, error: err.message });
  }
});

module.exports = router;
