const express = require("express")
const router = express.Router()
const { predictionDB } = require("../config/db")

// Normalize a player name for matching (removes punctuation/case differences)
const normName = (raw) =>
  String(raw || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

router.get("/:team", async (req, res) => {
  const team = req.params.team.toLowerCase()

  try {
    // 1. Fetch squad from players_2026 collection
    const squadDocs = await predictionDB.collection("players_2026").find({
      Team: { $regex: new RegExp(`^${team}$`, "i") } 
    }).toArray()

    if (!squadDocs || squadDocs.length === 0) {
      return res.status(404).json({ error: `No squad found for team: ${team}` })
    }

    // 2. Fetch stats from ipl_players_stats_2026 collection
    const statsDoc = await predictionDB.collection("ipl_players_stats_2026").findOne({})
    const teamStats = (statsDoc && statsDoc[team]) ? statsDoc[team] : {}

    // Build a lookup for stats by normalized name
    const statsIndex = {}
    Object.entries(teamStats).forEach(([name, s]) => {
      statsIndex[normName(name)] = s
    })

    // 3. Merge: override embedded stats with ipl_players_stats_2026 if available
    const enriched = squadDocs.map((player) => {
      const key = normName(player.Player)
      const freshStats = statsIndex[key]
      return {
        ...player,
        stats: freshStats || player.stats || null,
      }
    })

    res.json(enriched)
  } catch (err) {
    console.error("Error serving squad:", err)
    res.status(500).json({ error: "Failed to load squad data" })
  }
})

module.exports = router