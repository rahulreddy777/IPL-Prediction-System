/**
 * captains.js — GET /api/captains
 * Reads MongoDB capatin_stats_2026 → normalizes fields for CaptainsPage
 * Falls back to captains.json on any error.
 */
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { predictionDB } = require("../config/db");

const FALLBACK = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/captains.json"), "utf-8")
);

/** Extract short team code from franchise string like "Chennai Super Kings (CSK)" */
function extractTeamCode(franchise) {
  const m = String(franchise || "").match(/\(([A-Z]+)\)\s*$/);
  if (m) return m[1];
  // Try plain codes
  const codes = ["CSK", "MI", "RCB", "KKR", "GT", "SRH", "DC", "RR", "PBKS", "LSG"];
  for (const c of codes) {
    if (String(franchise || "").toUpperCase().includes(c)) return c;
  }
  return franchise || "";
}

/** Normalize a raw capatin_stats_2026 entry into what CaptainsPage expects */
function normalize(c) {
  const teamCode = c.team_code || extractTeamCode(c.franchise);
  return {
    team_code: teamCode,
    captain: c.captain || c.captainName || c.name || "—",
    franchise: c.franchise || teamCode,
    role: c.role || "Captain",
    appointment_type: c.appointment_type || "Confirmed",
    matches: c.matches ?? c.played ?? null,
    won: c.won ?? c.wins ?? null,
    lost: c.lost ?? c.losses ?? null,
    win_percentage: c.win_percentage ?? c.winPercentage ?? null,
    titles_won: c.titles_won ?? c.titlesWon ?? 0,
    experience: c.experience || "",
  };
}

// GET /api/captains
router.get("/", async (req, res) => {
  try {
    let docs = await predictionDB.collection("captain_stats_2026").find({}).toArray();

    if (!docs || docs.length === 0) {
      docs = await predictionDB.collection("capatin_stats_2026").find({}).toArray();
    }

    if (docs && docs.length > 0) {
      // If stored as single doc with nested array
      if (docs[0].ipl_2026_captains_stats && Array.isArray(docs[0].ipl_2026_captains_stats)) {
        return res.json(docs[0].ipl_2026_captains_stats.map(normalize));
      }
      if (docs[0].ipl_captains_2026 && Array.isArray(docs[0].ipl_captains_2026)) {
        return res.json(docs[0].ipl_captains_2026.map(normalize));
      }
      // Array of individual captain docs
      return res.json(docs.map(normalize));
    }

    // Fallback: old ipl_captains_2026 collection
    const oldDocs = await predictionDB
      .collection("ipl_captains_2026")
      .find({})
      .toArray();

    if (oldDocs && oldDocs.length > 0) {
      if (oldDocs[0].ipl_2026_captains_stats) {
        return res.json(oldDocs[0].ipl_2026_captains_stats.map(normalize));
      }
      return res.json(oldDocs.map(normalize));
    }

    return res.json(FALLBACK);
  } catch (err) {
    console.error("[CAPTAINS]", err.message);
    return res.json(FALLBACK);
  }
});

module.exports = router;
