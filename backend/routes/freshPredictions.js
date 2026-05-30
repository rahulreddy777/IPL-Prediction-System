const express = require("express")
const router = express.Router()

const freshMLService = require("../services/freshMLPredictionService")
const IPL2026Prediction = require("../models/IPL2026Prediction")

// ───────────────────────────────────────────────────────────────────────────────
// FRESH ML PREDICTIONS FOR IPL 2026
// Uses Database as Data Module with Historical Data
// ───────────────────────────────────────────────────────────────────────────────

// ── Generate Fresh Predictions and Save to Database ───────────────────────────
router.post("/generate-fresh", async (req, res) => {
  try {
    console.log("[API] Generating fresh ML predictions...")
    
    // Generate fresh predictions
    const result = await freshMLService.generateFreshPredictions()
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      })
    }
    
    // Save to database
    const saveResult = await freshMLService.savePredictionsToDB(result.predictions)
    
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        error: saveResult.error,
        predictions: result.predictions // Still return predictions even if save failed
      })
    }
    
    res.json({
      success: true,
      message: "Fresh predictions generated and saved successfully",
      totalMatches: result.totalMatches,
      teamRanks: result.teamRanks,
      modelInfo: result.modelInfo
    })
  } catch (err) {
    console.error("[API] Error generating fresh predictions:", err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ── Get All Fresh Predictions from Database ───────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await freshMLService.getAllPredictionsFromDB()
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      })
    }
    
    res.json({
      success: true,
      totalMatches: result.totalMatches,
      predictions: result.predictions,
      modelInfo: result.modelInfo
    })
  } catch (err) {
    console.error("[API] Error fetching fresh predictions:", err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ── Get Single Match Prediction ───────────────────────────────────────────────
router.get("/:matchNumber", async (req, res) => {
  try {
    const matchNumber = parseInt(req.params.matchNumber)
    
    const result = await freshMLService.getMatchPrediction(matchNumber)
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error
      })
    }
    
    res.json({
      success: true,
      prediction: result.prediction
    })
  } catch (err) {
    console.error("[API] Error fetching match prediction:", err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ── Update Match with Actual Result ───────────────────────────────────────────
router.put("/:matchNumber/result", async (req, res) => {
  try {
    const matchNumber = parseInt(req.params.matchNumber)
    const { actualWinner } = req.body
    
    if (!actualWinner) {
      return res.status(400).json({
        success: false,
        error: "actualWinner is required"
      })
    }
    
    const result = await freshMLService.updateMatchResult(matchNumber, actualWinner)
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      })
    }
    
    res.json({
      success: true,
      message: "Match result updated",
      prediction: result.prediction
    })
  } catch (err) {
    console.error("[API] Error updating match result:", err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ── Get Win Tally ─────────────────────────────────────────────────────────────
router.get("/win-tally", async (req, res) => {
  try {
    const result = await freshMLService.getWinTally()
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      })
    }
    
    res.json({
      success: true,
      tally: result.tally
    })
  } catch (err) {
    console.error("[API] Error fetching win tally:", err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ── Get ML Model Info ──────────────────────────────────────────────────────────
router.get("/ml-model-info", async (req, res) => {
  try {
    res.json({
      success: true,
      model: {
        type: "Ensemble ML Model",
        version: "2026.1",
        weights: freshMLService.ML_WEIGHTS,
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
          "IPL 2025 Recent Form",
          "Player Stats Database",
          "Venue/Pitch Analysis"
        ],
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ── Clear All Predictions (Admin Only) ────────────────────────────────────────
router.delete("/", async (req, res) => {
  try {
    await IPL2026Prediction.deleteMany({})
    
    res.json({
      success: true,
      message: "All predictions cleared"
    })
  } catch (err) {
    console.error("[API] Error clearing predictions:", err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

module.exports = router
