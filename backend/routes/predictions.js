const express = require("express")
const router = express.Router()

const predictionController = require("../controllers/predictionController")
const predictionService = require("../services/predictionService")
const ipl2026Service = require("../services/ipl2026PredictionService")
const advancedMLService = require("../services/advancedMLService")
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")

// ── GET / — root handler returns the full IPL 2026 predictions ────────────────
async function handleIpl2026Predictions(req, res) {
  try {
    const result = await advancedMLService.predictAllMatches()
    if (result.success) {
      return res.json({
        success: true,
        totalMatches: result.total_matches,
        predictions: result.predictions,
        modelInfo: result.model_info,
        _source: result.model_info?.source || "advanced-ml"
      })
    }
  } catch (err) {
    // fall through to JS fallback
  }

  // Fallback: JS rule-based service
  try {
    const predictions = ipl2026Service.getAllPredictions()
    return res.json({
      success: true,
      totalMatches: predictions.length,
      predictions,
      _source: "rule-based-fallback"
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

router.get("/", handleIpl2026Predictions)

// ── IPL 2026 Match-by-match predictions (all 20 matches) ──────────────────────
// Primary: Advanced ML model (Ensemble weighted prediction)
// Fallback: JS rule-based scoring service
router.get("/ipl2026-matches", async (req, res) => {
  try {
    // Try Advanced ML service first
    const result = await advancedMLService.predictAllMatches()
    if (result.success) {
      return res.json({
        success: true,
        totalMatches: result.total_matches,
        predictions: result.predictions,
        modelInfo: result.model_info,
        _source: result.model_info?.source || "advanced-ml"
      })
    }
  } catch (err) {
    console.log("Advanced ML service failed, trying fallback...", err.message)
  }

  // Fallback 1: Python ML model
  const mlScript = path.join(__dirname, "..", "ml", "ipl_2026_predictor.py")
  try {
    const py = spawn("python", [mlScript], {
      cwd: path.join(__dirname, ".."),
      timeout: 60000,
    })

    let stdout = ""
    let stderr = ""
    py.stdout.on("data", (d) => (stdout += d.toString()))
    py.stderr.on("data", (d) => (stderr += d.toString()))

    return new Promise((resolve) => {
      py.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          try {
            const json = JSON.parse(stdout)
            if (json.success && Array.isArray(json.predictions)) {
              return resolve(res.json(json))
            }
          } catch (_) { /* fall through */ }
        }
        // Fallback 2: JS rule-based
        useJSFallback(res, stderr, stdout)
      })

      py.on("error", () => {
        useJSFallback(res, "Python spawn error", "")
      })
    })
  } catch (err) {
    return useJSFallback(res, String(err), "")
  }

  function useJSFallback(res, stderr, stdout) {
    try {
      const predictions = ipl2026Service.getAllPredictions()
      res.json({
        success: true,
        totalMatches: predictions.length,
        predictions,
        _source: "rule-based-fallback",
        _mlError: stderr.trim() || stdout.trim().slice(0, 200)
      })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  }
})

// ── Single Match Prediction ───────────────────────────────────────────────────
router.post("/match", async (req, res) => {
  try {
    const { team1, team2, venue, matchId } = req.body || {}
    
    if (!team1 || !team2) {
      return res.status(400).json({ error: "team1 and team2 are required" })
    }

    const prediction = await advancedMLService.predictMatch(team1, team2, venue, { match_id: matchId })
    res.json(prediction)
  } catch (err) {
    res.status(500).json({ error: "Prediction failed", details: err.message })
  }
})

// ── Get Match Factors Analysis ───────────────────────────────────────────────
router.get("/match-factors", (req, res) => {
  try {
    const { team1, team2, venue } = req.query
    
    if (!team1 || !team2) {
      return res.status(400).json({ error: "team1 and team2 are required" })
    }

    const factors = advancedMLService.getMatchFactors(team1, team2, venue || '')
    res.json(factors)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── IPL All-Time Standings (2008-2025) ────────────────────────────────────────
router.get("/ipl-standings", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/ipl_historical_standings.json"), "utf8"))
    res.json({ success: true, ...data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})


// Existing match prediction endpoint
router.post("/", async (req, res) => {
  // Prefer ML match predictor if available, otherwise fall back to JS baseline.
  const scriptPath = path.join(__dirname, "..", "ml", "predict_match.py")
  const payload = {
    team1: req.body?.team1,
    team2: req.body?.team2,
    venue: req.body?.venue,
  }

  const py = spawn("python", [scriptPath, JSON.stringify(payload)], {
    cwd: path.join(__dirname, ".."),
  })

  let stdout = ""
  let stderr = ""
  py.stdout.on("data", (d) => (stdout += d.toString()))
  py.stderr.on("data", (d) => (stderr += d.toString()))

  py.on("close", async (code) => {
    if (code === 0) {
      try {
        const json = JSON.parse(stdout)
        return res.json(json)
      } catch (e) {
        // fall through to baseline
      }
    }

    // Baseline fallback
    try {
      const { team1, team2, venue } = req.body || {}
      const result = await predictionService.predictWinner(team1, team2, venue)
      res.json({ ...result, methodology: "baseline" })
    } catch (e) {
      return res.status(500).json({
        error: "Prediction failed",
        details: stderr.trim() || stdout.trim() || String(e?.message || e),
      })
    }
  })
})

// New IPL 2026 endpoints
router.get("/tournament2026", predictionController.getTournamentPrediction)
router.get("/playoffs", predictionController.getPlayoffsPrediction)
router.get("/team-analysis", predictionController.getTeamAnalysis)

// ---- Player stats overrides for 2026 (used by ML pipeline) ----
const overridesPath = path.join(__dirname, "..", "data", "player_stats_overrides_2026.json")

router.get("/player-stats-overrides", (req, res) => {
  try {
    const raw = fs.readFileSync(overridesPath, "utf-8")
    res.json(JSON.parse(raw))
  } catch (e) {
    res.status(200).json({})
  }
})

router.put("/player-stats-overrides", (req, res) => {
  try {
    const body = req.body
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Invalid JSON body" })
    }
    fs.writeFileSync(overridesPath, JSON.stringify(body, null, 2), "utf-8")
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Retrain ML model after overrides update
router.post("/retrain-ml", (req, res) => {
  const scriptPath = path.join(__dirname, "..", "ml", "train_ml_model.py")
  const py = spawn("python", [scriptPath], {
    cwd: path.join(__dirname, "..")
  })

  let stdout = ""
  let stderr = ""
  py.stdout.on("data", (d) => (stdout += d.toString()))
  py.stderr.on("data", (d) => (stderr += d.toString()))

  py.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: "ML retrain failed", details: stderr.trim() || stdout.trim() })
    }
    // train_ml_model prints JSON
    try {
      return res.json(JSON.parse(stdout))
    } catch (e) {
      return res.json({ ok: true, raw: stdout.slice(0, 4000) })
    }
  })
})

// ML-based IPL 2026 tournament prediction (Python)
router.get("/tournament2026-ml", (req, res) => {
  const scriptPath = path.join(__dirname, "..", "ml", "predict_2026.py")
  const py = spawn("python", [scriptPath], {
    cwd: path.join(__dirname, "..")
  })

  let stdout = ""
  let stderr = ""

  py.stdout.on("data", (d) => (stdout += d.toString()))
  py.stderr.on("data", (d) => (stderr += d.toString()))

  py.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({
        error: "ML prediction failed",
        details: stderr.trim() || stdout.trim()
      })
    }

    try {
      const json = JSON.parse(stdout)
      return res.json(json)
    } catch (e) {
      return res.status(500).json({
        error: "ML predictor returned invalid JSON",
        details: String(e.message || e),
        raw: stdout.slice(0, 4000)
      })
    }
  })
})

// ML Model Status Endpoint
router.get("/ml-status", (req, res) => {
  res.json({
    success: true,
    model: {
      type: "Ensemble Weighted ML",
      version: "2026.1",
      status: "active",
      weights: {
        squadStrength: 0.25,
        headToHead: 0.20,
        venueAdvantage: 0.15,
        recentForm: 0.15,
        keyPlayers: 0.15,
        tossImpact: 0.10
      },
      features: [
        "Squad Strength (Batting, Bowling, All-Round)",
        "Head-to-Head Historical (2008-2025)",
        "Venue Advantage (Home/Away/Neutral)",
        "Recent Form & Team Momentum",
        "Key Player Analysis",
        "Toss Impact & Pitch Conditions"
      ],
      dataSources: [
        "IPL Historical Data 2008-2025",
        "2026 Squad Player Stats",
        "Venue/Pitch Analysis",
        "Team Rankings 2026"
      ],
      topTeams: ["MI", "GT", "DC", "KKR"],
      lastUpdated: new Date().toISOString()
    }
  })
})

module.exports = router
