const express = require("express")
const router = express.Router()

const liveController = require("../controllers/liveScoreController")

router.get("/", liveController.getScores);
router.post("/refresh", liveController.refreshScores);
router.get("/status", liveController.getCacheStatus);

module.exports = router;