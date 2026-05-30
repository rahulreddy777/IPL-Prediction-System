const mongoose = require("mongoose")
const { historyDB } = require("../config/db")

const stadiumSchema = new mongoose.Schema({

 name:{
  type:String,
  required:true
 },

 city:{
  type:String,
  required:true
 },

 capacity:Number,

 pitchType:{
  type:String,
  enum:[
   "Batting",
   "Bowling",
   "Balanced",
   "Spin",
   "Pace"
  ]
 },

 boundaryLength:Number,

 imageUrl:String

},{
 timestamps:true
})

module.exports = historyDB.model("Stadium",stadiumSchema)