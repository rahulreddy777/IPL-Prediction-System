const express = require("express");
const router = express.Router();
const playersController = require("../controllers/playersController");

router.get("/", playersController.getPlayers);
router.get("/stats", playersController.getRawPlayerStats);
router.get("/squad-stats", playersController.getSquadPlayerStats);
router.get("/stats/caps", playersController.getOrangePurpleCaps);
router.get("/all-time-bowlers", playersController.getAllTimeBowlers);
router.get("/all-time-batters", playersController.getAllTimeBatters);
router.get("/id/:id", playersController.getPlayerById);
router.get("/players2026/:team", playersController.getTeamPlayerStats2026);

module.exports = router;
