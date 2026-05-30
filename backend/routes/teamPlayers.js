const express = require("express");
const router = express.Router();
const { predictionDB } = require("../config/db");

// Normalize a player name for matching
const normName = (raw) =>
  String(raw || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

router.get("/:team/players", async (req, res) => {
  const team = req.params.team.toLowerCase();

  try {
    // 1. Fetch squad from players_2026 collection
    const squadDocs = await predictionDB.collection("players_2026").find({
      Team: { $regex: new RegExp(`^${team}$`, "i") } 
    }).toArray();

    if (!squadDocs || squadDocs.length === 0) {
      return res.status(404).json({ error: `No squad found for team: ${team}` });
    }

    // 2. Fetch stats from ipl_players_stats_2026 collection
    const statsDoc = await predictionDB.collection("ipl_players_stats_2026").findOne({ team });
    const teamStats = (statsDoc && statsDoc.players) ? statsDoc.players : {};

    // Build a lookup for stats by normalized name
    const statsIndex = {};
    Object.entries(teamStats).forEach(([name, s]) => {
      statsIndex[normName(name)] = s;
    });

    // 3. Merge
    const players = squadDocs.map((player) => {
      const key = normName(player.Player);
      const freshStats = statsIndex[key];
      
      // Calculate derived ratings if stats exist
      let formRating = 50;
      let impactRating = 50;
      
      if (freshStats) {
        if (freshStats.runs) {
          formRating = Math.min(100, Math.max(30, (freshStats.runs / 10) + (freshStats.sr / 3)));
          impactRating = Math.min(100, Math.max(40, (freshStats.avg * 1.5) + (freshStats.sr / 4)));
        } else if (freshStats.wkts) {
          formRating = Math.min(100, Math.max(30, (freshStats.wkts * 3) + (10 - (freshStats.econ || 8)) * 5));
          impactRating = Math.min(100, Math.max(40, (freshStats.wkts * 2.5) + (10 - (freshStats.econ || 8)) * 4));
        }
      }
      
      return {
        _id: player._id,
        name: player.Player,
        role: player.Role,
        type: player.Type,
        price: player.Price,
        acquisition: player.Acquisition,
        number: player.No,
        nationality: player.Type?.toLowerCase().includes('overseas') ? 'Overseas' : 'Indian',
        stats: freshStats || null,
        ratings: freshStats ? {
          form: Math.round(formRating),
          impact: Math.round(impactRating)
        } : null
      };
    });

    res.json({
      team: team,
      players: players.sort((a, b) => (Number(a.number) || 99) - (Number(b.number) || 99))
    });
  } catch (err) {
    console.error("Error serving team players:", err);
    res.status(500).json({ error: "Failed to load team players" });
  }
});

module.exports = router;
