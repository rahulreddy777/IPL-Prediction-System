const { predictionDB: db } = require("../config/db");

exports.update = async (data) => {
  const batting = data.batting || data.scorecard?.batting || [];
  for (let p of batting) {
    await db.collection("ipl_players_stats_2026").updateOne(
      { player: p.name },
      { $inc: { runs: p.runs || 0, matches: 1 } },
      { upsert: true }
    );
  }
};

exports.loadPlayerData = async () => {
  const data = await db.collection("ipl_players_stats_2026").find({}).toArray();
  console.log("Player stats loaded count:", data.length);
  return { playerStats: data, battingStats: data };
};

exports.getPlayerStats = () => [];
exports.getBattingStats = () => [];
