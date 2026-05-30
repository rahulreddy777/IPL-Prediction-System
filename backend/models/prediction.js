const mongoose = require("mongoose")
const { predictionDB } = require("../config/db")

const PredictionSchema = new mongoose.Schema(
  {
    // User inputs (display strings)
    team1: { type: String, required: true },
    team2: { type: String, required: true },
    venue: { type: String, default: null },

    // Normalized codes used internally (e.g., CSK/MI)
    team1Code: { type: String, default: null },
    team2Code: { type: String, default: null },

    // Output
    prediction: { type: String, required: true },
    win_probability: { type: mongoose.Schema.Types.Mixed, required: true }, // { [teamName]: "xx.xx", ... }
    methodology: { type: String, default: "ML" },

    // Optional debug/meta
    debug: { type: mongoose.Schema.Types.Mixed, default: {} },
    modelMeta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

module.exports = predictionDB.model("Prediction", PredictionSchema)

