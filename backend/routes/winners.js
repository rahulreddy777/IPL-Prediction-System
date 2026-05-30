const express = require("express")
const router = express.Router()

const winnersController = require("../controllers/winnersController")

router.get("/", winnersController.getWinners)

module.exports = router