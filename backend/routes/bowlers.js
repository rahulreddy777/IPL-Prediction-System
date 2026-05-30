const express = require("express")
const router = express.Router()
const fs = require("fs")
const path = require("path")

// Simple JSON-backed endpoints for bowlers data.
// This keeps it independent of Mongo seeding/state.

router.get("/", (req, res) => {
  try {
    const filePath = path.join(__dirname, "..", "data", "all_time_bowlers_parsed.json")
    if (!fs.existsSync(filePath)) return res.json([])
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return res.json(Array.isArray(data) ? data : [])
  } catch (e) {
    return res.status(500).json({ error: "Failed to load bowlers data", details: String(e.message || e) })
  }
})

// Convenience: top N bowlers by wickets
router.get("/top/:n", (req, res) => {
  try {
    const n = Math.max(1, Math.min(200, Number(req.params.n) || 20))
    const filePath = path.join(__dirname, "..", "data", "all_time_bowlers_parsed.json")
    if (!fs.existsSync(filePath)) return res.json([])
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const rows = Array.isArray(data) ? data : []
    rows.sort((a, b) => Number(b?.wkts || 0) - Number(a?.wkts || 0))
    return res.json(rows.slice(0, n))
  } catch (e) {
    return res.status(500).json({ error: "Failed to load top bowlers", details: String(e.message || e) })
  }
})

module.exports = router

