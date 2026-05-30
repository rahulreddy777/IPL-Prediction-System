const { predictionDB: db } = require("../config/db");
const Points = require("./pointsTableService");
const Players = require("./playerService");
const Bowling = require("./bowlingService");
const Season = require("./seasonEngine");

async function processCompletedMatch(scorecard) {
  try {
    const matchId = scorecard.matchInfo?.matchId || scorecard.id;
    // Basic idempotency check
    const exists = await db.collection("processed_matches").findOne({ "matchInfo.matchId": matchId });
    if (exists) return;

    await db.collection("processed_matches").insertOne(scorecard);
    await Points.update(scorecard);
    await Players.update(scorecard);
    await Bowling.update(scorecard);
    await Season.update(scorecard);
    console.log(`[matchResultService] Processed Match ID: ${matchId}`);
  } catch (e) {
    console.error("Error processing completed match:", e.message);
  }
}

module.exports = {
  processCompletedMatch,
  getMatchWinner: async () => ({ matchStatus: "upcoming", source: null }),
  processMatchFromLive: async () => {}
};
