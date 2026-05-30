const mongoose = require("mongoose")
const { historyDB } = require("../config/db")

const matchSchema = new mongoose.Schema({

 ID: {
  type: Number,
  required: true,
  unique: true
 },

 city: String,

 date: Date,

 season: String,

 matchNumber: String,

 team1: {
  type: String,
  required: true
 },

 team2: {
  type: String,
  required: true
 },

 venue: String,

 tossWinner: String,

 tossDecision: {
  type: String,
  enum: ["bat", "field"]
 },

 superOver: {
  type: String,
  enum: ["Y","N"]
 },

 winningTeam: String,

 wonBy: {
  type: String,
  enum: ["Wickets","Runs","SuperOver","NoResults"]
 },

 margin: Number,

 method: String,

 playerOfMatch: String,

 team1Players: [String],

 team2Players: [String],

 umpire1: String,

 umpire2: String

},{
 timestamps:true
})

module.exports = historyDB.model("Match",matchSchema)