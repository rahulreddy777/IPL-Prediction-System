const predictionService = require("../services/predictionService")
const { spawn } = require("child_process")
const path = require("path")

// Get match prediction between two teams
exports.getPrediction = async (req, res) => {

 const { team1, team2, venue } = req.body

 const result = await predictionService.predictWinner(team1, team2, venue)

 res.json({ ...result, methodology: "baseline" })

}

// Predict IPL 2026 Tournament Winner
exports.getTournamentPrediction = async (req, res) => {
  try {
    // Prefer ML tournament predictor (Python) if a trained model exists.
    const scriptPath = path.join(__dirname, "..", "ml", "predict_2026.py")
    const py = spawn("python", [scriptPath], { cwd: path.join(__dirname, "..") })

    let stdout = ""
    let stderr = ""
    py.stdout.on("data", (d) => (stdout += d.toString()))
    py.stderr.on("data", (d) => (stderr += d.toString()))

    py.on("close", async (code) => {
      if (code === 0) {
        try {
          return res.json(JSON.parse(stdout))
        } catch (e) {
          // fall through to baseline
        }
      }

      const result = await predictionService.predictTournament2026()
      return res.json({
        ...result,
        methodology: "baseline",
        ml_error: stderr.trim() || stdout.trim() || null,
      })
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Predict Playoffs
exports.getPlayoffsPrediction = async (req, res) => {
  try {
    const result = await predictionService.predictPlayoffs2026()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get Team Analysis
exports.getTeamAnalysis = async (req, res) => {
  try {
    const result = await predictionService.getTeamAnalysis()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
