const mongoose = require("mongoose")
const { historyDB } = require("../config/db")

const teamSchema = new mongoose.Schema({

 name:{
  type:String,
  required:true,
  unique:true
 },

 shortName:{
  type:String,
  required:true
 },

 captain:String,

 homeGround:String,

 logoUrl:String,

 colors:{
  primary:String,
  secondary:String
 },

 championshipWins:[Number]

},{
 timestamps:true
})

module.exports = historyDB.model("Team",teamSchema)