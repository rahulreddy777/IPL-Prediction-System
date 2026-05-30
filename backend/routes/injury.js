const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()

const INJURY_FILE = path.join(__dirname, '../data/injury_list.json')
const SQUAD_FILE  = path.join(__dirname, '../data/squads_data.json')

// ── Helper: read / write injury list ─────────────────────────────────────────
function readInjuryList() {
  if (!fs.existsSync(INJURY_FILE)) return []
  return JSON.parse(fs.readFileSync(INJURY_FILE, 'utf-8'))
}

function writeInjuryList(list) {
  fs.writeFileSync(INJURY_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

// ── GET /api/injury  — return full injury list ───────────────────────────────
router.get('/', (req, res) => {
  try {
    const list = readInjuryList()
    res.json({ success: true, count: list.length, injured: list })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── PUT /api/injury/recover  — mark players as fit & remove from list ────────
// Body: { players: ["MS Dhoni", "Dewald Brevis"] }
router.put('/recover', (req, res) => {
  try {
    const { players = [] } = req.body
    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ success: false, error: 'players[] array required' })
    }

    const normalized = players.map(p => p.trim().toLowerCase())
    let list = readInjuryList()

    // Remove recovered players
    const removed  = list.filter(p => normalized.includes((p.name || p.player || '').trim().toLowerCase()))
    const remaining = list.filter(p => !normalized.includes((p.name || p.player || '').trim().toLowerCase()))

    writeInjuryList(remaining)

    res.json({
      success: true,
      message: `${removed.length} player(s) marked fit and removed from injury list`,
      recovered: removed.map(p => p.name || p.player),
      remainingInjured: remaining.length
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/injury/squad/:team  — squad with injury-status flags ─────────────
router.get('/squad/:team', (req, res) => {
  try {
    const team = req.params.team.toLowerCase()
    const squads = JSON.parse(fs.readFileSync(SQUAD_FILE, 'utf-8'))
    const squad  = squads[team]
    if (!squad) return res.status(404).json({ success: false, error: `No squad for ${team}` })

    const list = readInjuryList()
    const injuredNames = list
      .filter(p => (p.team || '').toUpperCase() === team.toUpperCase())
      .map(p => (p.name || p.player || '').toLowerCase())

    const enriched = squad.map(p => ({
      ...p,
      injuryStatus: injuredNames.includes(p.Player.toLowerCase()) ? 'injured' : 'fit'
    }))

    res.json({ success: true, team, squad: enriched })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
