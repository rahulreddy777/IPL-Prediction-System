const mongoose = require('mongoose')
const { predictionDB } = require("../config/db")

const IPL2026PredictionSchema = new mongoose.Schema({
  // Match identification
  matchNumber: { type: Number, required: true, unique: true },
  date: { type: String, required: true },
  day: { type: String, required: true },
  time: { type: String, required: true },
  venue: { type: String, required: true },
  
  // Teams
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  
  // ML Prediction Results
  predictedWinner: { type: String, required: true },
  winProbability: {
    team1: { type: Number, required: true },
    team2: { type: Number, required: true }
  },
  confidence: { type: Number, required: true },
  
  // ML Factor Breakdown
  factors: {
    squadStrength: {
      team1: Number,
      team2: Number,
      weight: { type: Number, default: 0.25 }
    },
    headToHead: {
      team1: Number,
      team2: Number,
      weight: { type: Number, default: 0.20 }
    },
    venueAdvantage: {
      team1: Number,
      team2: Number,
      weight: { type: Number, default: 0.15 }
    },
    recentForm: {
      team1: Number,
      team2: Number,
      weight: { type: Number, default: 0.15 }
    },
    keyPlayers: {
      team1: Number,
      team2: Number,
      weight: { type: Number, default: 0.15 }
    },
    tossImpact: {
      team1: Number,
      team2: Number,
      weight: { type: Number, default: 0.10 }
    }
  },
  
  // Squad Information
  squadInfo: {
    team1: {
      batting: Number,
      bowling: Number,
      allRound: Number,
      overall: Number,
      rank: Number,
      description: String
    },
    team2: {
      batting: Number,
      bowling: Number,
      allRound: Number,
      overall: Number,
      rank: Number,
      description: String
    }
  },
  
  // Key Metrics for Display
  keyMetrics: {
    recentForm: { team1: Number, team2: Number },
    venueAdvantage: { team1: Number, team2: Number },
    h2hRatio: { team1: Number, team2: Number },
    pressureIndex: { team1: Number, team2: Number }
  },
  
  // Model Metadata
  methodology: { type: String, default: 'Ensemble ML Model' },
  modelVersion: { type: String, default: '2026.1' },
  dataSources: [String],
  
  // Match status
  isPlayoff: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  actualWinner: { type: String, default: null },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
})

// Indexes for faster queries (matchNumber already indexed via unique: true above)
IPL2026PredictionSchema.index({ team1: 1, team2: 1 })
IPL2026PredictionSchema.index({ predictedWinner: 1 })

module.exports = predictionDB.model('IPL2026Prediction', IPL2026PredictionSchema)
