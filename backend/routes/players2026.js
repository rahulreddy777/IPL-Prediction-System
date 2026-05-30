/**
 * players2026.js — GET /api/players2026
 * Fetches all IPL 2026 players from MongoDB players_2026 collection
 * Falls back to ipl_2026_master_squad.json if DB unavailable
 */
const express          = require("express");
const router           = express.Router();
const path             = require("path");
const fs               = require("fs");
const { predictionDB } = require("../config/db");

// Fallback JSON data
let FALLBACK = [];
try {
  FALLBACK = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/ipl_2026_master_squad.json"), "utf-8")
  );
} catch (_) {}

/** Normalize a players_2026 document */
function normalizePlayer(p) {
  return {
    No:          p.No ?? null,
    Player:      p.Player || p.player || p.name || "—",
    Team:        p.Team || p.team || "—",
    Role:        p.Role || p.role || p.Type || p.type || "—",
    Acquisition: p.Acquisition || p.acquisition || "—",
    Type:        p.Type || p.type || "—",
    Price:       p.Price || p.price || "—",
  };
}

// GET /api/players2026?team=CSK
router.get("/", async (req, res) => {
  try {
    const { team } = req.query;
    const query = team
      ? { $or: [{ Team: team }, { Team: team.toUpperCase() }, { Team: team.toLowerCase() }] }
      : {};

    const docs = await predictionDB
      .collection("players_2026")
      .find(query)
      .sort({ No: 1 })
      .toArray();

    if (docs && docs.length > 0) {
      return res.json(docs.map(normalizePlayer));
    }

    // Fallback to JSON
    let data = FALLBACK;
    if (team && Array.isArray(data)) {
      data = data.filter(p =>
        String(p.Team || "").toUpperCase() === team.toUpperCase()
      );
    }
    return res.json(Array.isArray(data) ? data.map(normalizePlayer) : []);
  } catch (err) {
    console.error("[PLAYERS2026]", err.message);
    return res.json(FALLBACK.map(normalizePlayer));
  }
});

// GET /api/players2026/teams — distinct team list
router.get("/teams", async (req, res) => {
  try {
    const teams = await predictionDB
      .collection("players_2026")
      .distinct("Team");
    return res.json(teams.sort());
  } catch (err) {
    console.error("[PLAYERS2026/TEAMS]", err.message);
    return res.json(["CSK","MI","RCB","KKR","GT","SRH","DC","RR","PBKS","LSG"]);
  }
});

module.exports = router;
