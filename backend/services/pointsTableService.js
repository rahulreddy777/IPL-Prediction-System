const { predictionDB: db } = require("../config/db");

async function update(data) {
  // Try to determine the winner
  let winner = data.matchInfo?.status?.match(/^(.+?)\s+won/i)?.[1]?.trim() || data.winner;
  
  if (winner) {
    await db.collection("points_table_2026").updateOne(
      { team: winner },
      { $inc: { played: 1, won: 1, points: 2 } },
      { upsert: true }
    );
  }
}

async function applyQualificationStatus() {
  const teams = await db.collection("points_table_2026").find().sort({points: -1, nrr: -1}).toArray();
  for (let i = 0; i < teams.length; i++) {
    await db.collection("points_table_2026").updateOne(
      { team: teams[i].team },
      {
        $set: {
          status: i < 4 ? "Q" : "E",
          position: i + 1
        }
      }
    );
  }
}

async function getFreshPointsTable() {
  return await db.collection("points_table_2026").find().sort({points: -1, nrr: -1}).toArray();
}

module.exports = {
  update,
  applyQualificationStatus,
  getFreshPointsTable,
  getMatchWinner: () => null
};
