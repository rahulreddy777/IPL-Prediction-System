const { historyDB } = require("../config/db");

exports.getWinners = async (req, res) => {
  try {
    const conn = await historyDB.asPromise();
    const winners = await conn.collection("winners").find({}).sort({ Season: 1 }).toArray();
    res.json(winners);
  } catch (err) {
    console.error("Error fetching winners from DB:", err);
    res.status(500).json({ error: "Failed to fetch winners" });
  }
}