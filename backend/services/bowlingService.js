const { predictionDB: db } = require("../config/db");

async function update(data) {
  const bowling = data.bowling || data.scorecard?.bowling || [];
  for (let p of bowling) {
    await db.collection("bowling_stats_2026").updateOne(
      { player: p.name },
      { $inc: { wickets: p.wickets || 0 } },
      { upsert: true }
    );
  }
}

async function loadBowlingData() {
  const data = await db.collection("bowling_stats_2026").find({}).toArray();
  console.log("Bowling loaded count:", data.length);
  return data;
}

module.exports = {
  update,
  loadBowlingData,
  getBowlingStats: () => []
};
