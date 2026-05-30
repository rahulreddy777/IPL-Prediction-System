const mongoose = require("mongoose")
const { historyDB } = require("../config/db")

const playerSchema = new mongoose.Schema({

 batter: String,
 matches: Number,
 innings: Number,
 runs: Number,
 balls: Number,
 batting_average: Number,
 strike_rate: Number,
 fours: Number,
 sixes: Number,
 boundary_pct: Number

})

module.exports = historyDB.model("Player", playerSchema, "players")