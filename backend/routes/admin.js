/**
 * admin.js — Admin utility routes (not exposed publicly)
 *
 * POST /api/admin/seed-matches
 *   Upserts the complete IPL 2026 tournament document into ipl_matches_2026.
 *   Reads from data/ipl_2026_tournament_data.json (match_number 67 is already corrected).
 */
const express = require("express");
const router  = express.Router();
const path    = require("path");
const { predictionDB } = require("../config/db");

const DATA_FILE = path.join(__dirname, "../data/ipl_2026_tournament_data.json");

// POST /api/admin/seed-matches
router.post("/seed-matches", async (req, res) => {
  try {
    // Clear require cache so hot-updates to the JSON are picked up
    delete require.cache[require.resolve(DATA_FILE)];
    const data = require(DATA_FILE);

    await predictionDB.asPromise();
    const col = predictionDB.collection("ipl_matches_2026");

    // Replace the existing tournament document (upsert by tournament name)
    const result = await col.replaceOne(
      { tournament: data.tournament },
      data,
      { upsert: true }
    );

    const leagueCount  = (data.league_stage_matches || []).length;
    const playoffCount = (data.playoffs || []).length;

    console.log(
      `[admin/seed-matches] Upserted tournament doc — ` +
      `${leagueCount} league matches, ${playoffCount} playoffs. ` +
      `matched=${result.matchedCount} upserted=${result.upsertedCount}`
    );

    res.json({
      success:        true,
      message:        "IPL 2026 match data inserted into ipl_matches_2026 ✅",
      league_matches: leagueCount,
      playoffs:       playoffCount,
      matched:        result.matchedCount,
      upserted:       result.upsertedCount,
    });
  } catch (err) {
    console.error("[admin/seed-matches] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
