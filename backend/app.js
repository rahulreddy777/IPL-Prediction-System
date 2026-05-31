const express = require("express");
const cors    = require("cors");
const path    = require("path");

const { connectDB } = require("./config/db");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/data", express.static(path.join(__dirname, "data")));

connectDB();

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/teams",            require("./routes/teams"));
app.use("/api/teams",            require("./routes/teamPlayers"));
app.use("/api/stadiums",         require("./routes/stadiums"));
app.use("/api/predictions",      require("./routes/predictions"));
app.use("/api/prediction",       require("./routes/prediction"));
app.use("/api/winners",          require("./routes/winners"));
app.use("/api/bowlers",          require("./routes/bowlers"));
app.use("/api/squads",           require("./routes/squads"));

app.use("/api/players",          require("./routes/players"));
app.use("/api/matches",          require("./routes/matches"));
app.use("/api/matches2026",      require("./routes/matches2026"));
app.use("/api/agent",            require("./routes/agent"));
app.use("/api/live-enhanced",    require("./routes/liveEnhanced"));
app.use("/api/chat",             require("./routes/chat"));
app.use("/api/live-intel",       require("./routes/liveIntel"));
app.use("/api/fresh-predictions",require("./routes/freshPredictions"));
app.use("/api/ml2026",           require("./routes/ml2026"));
app.use("/api/injury",           require("./routes/injury"));
app.use("/api/cric-live",        require("./routes/cricLive"));
app.use("/api",                  require("./routes/winProbability"));
app.use("/api/season",           require("./routes/season"));
app.use("/api/predictions2026",  require("./routes/predictions2026"));
app.use("/api/playoffs",              require("./routes/playoffs"));
app.use("/api/playoff-predictions",   require("./routes/playoffPredictions"));
app.use("/api",                       require("./routes/capsAndPoints"));
app.use("/api/captains",              require("./routes/captains"));
app.use("/api/admin",                 require("./routes/admin"));
app.use("/api/players2026",           require("./routes/players2026"));
app.use("/api/final-prediction",      require("./routes/finalPrediction"));
app.use("/api/team-history",          require("./routes/teamHistory"));
app.use("/api/head-to-head",          require("./routes/headToHead"));

app.get("/", (req, res) => {
  res.json({
    message: "IPL Prediction API",
    endpoints: {
      "cric-live":     "/api/cric-live",
      "win-prob-ws":   "ws://localhost:5000/ws (AI_WIN_PROBABILITY_UPDATE)",
      "trigger-win":   "POST /api/trigger-win-update/:matchId",
      season:          "POST /api/season/run-full (M68 → Champion)",
      teams:           "/api/teams",
      predictions:     "/api/predictions",
    },
  });
});

module.exports = app;
