const express = require("express");
const router = express.Router();
const predictionService = require("../services/predictionService");
const wsServer = require("../services/websocketServer");

router.get("/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const { tossWinner, tossDecision } = req.query;

    const prediction = await predictionService.getPrediction(matchId, {
      tossWinner,
      tossDecision
    });

    res.json(prediction);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
