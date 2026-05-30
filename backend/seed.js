const mongoose = require("mongoose");
const fs = require("fs");
const Match = require("./models/Match");
const Player = require("./models/Player");

const { historyDB, predictionDB } = require("./config/db");

async function seedData() {
  await Match.deleteMany({});
  await Player.deleteMany({});

  let totalImported = 0;

  // Try to load 2008-2022 dataset
  try {
    const data2008 = JSON.parse(fs.readFileSync("./data/ipl matches from 2008 to 2022.json", "utf-8"));
    const matches2008 = data2008.map(m => ({
      season: parseInt(m.Season) || 0,
      team1: m.Team1,
      team2: m.Team2,
      venue: m.Venue,
      winner: m.WinningTeam,
      tossWinner: m.TossWinner,
      resultMargin: m.Margin ? m.Margin.toString() : ""
    }));
    await Match.insertMany(matches2008);
    totalImported += matches2008.length;
    console.log("Imported 2008-2022 matches:", matches2008.length);
  } catch (err) {
    console.log("Could not load 2008-2022 data:", err.message);
  }

  // Try to load 2023 dataset
  try {
    const data2023 = JSON.parse(fs.readFileSync("./data/ipl_matches_2023.json", "utf-8"));
    const matches2023 = data2023.map(m => ({
      season: 2023,
      team1: m.Team1 || m["Team 1"],
      team2: m.Team2 || m["Team 2"],
      venue: m.Venue,
      winner: m["Winning Team"] || m["winner"],
      tossWinner: m["Toss winning team"],
      resultMargin: m["Won By"] || m["winning_margin"]
    }));
    await Match.insertMany(matches2023);
    totalImported += matches2023.length;
    console.log("Imported 2023 matches:", matches2023.length);
  } catch (err) {
    console.log("Could not load 2023 data:", err.message);
  }

  // Try to load 2024 dataset
  try {
    const data2024 = JSON.parse(fs.readFileSync("./data/ipl_matches_2024.json", "utf-8"));
    const matches2024 = data2024.map(m => ({
      season: 2024,
      team1: m["Team 1"] || m.Team1,
      team2: m["Team 2"] || m.Team2,
      venue: m.Venue,
      winner: m.winner || m["Winning Team"],
      tossWinner: null,
      resultMargin: m.winning_margin || m["Won By"]
    }));
    await Match.insertMany(matches2024);
    totalImported += matches2024.length;
    console.log("Imported 2024 matches:", matches2024.length);
  } catch (err) {
    console.log("Could not load 2024 data:", err.message);
  }

  // Try to load 2025 dataset
  try {
    const data2025 = JSON.parse(fs.readFileSync("./data/ipl_matches_2025.json", "utf-8"));
    const matches2025 = data2025.map(m => ({
      season: 2025,
      team1: m["Team 1"] || m.Team1,
      team2: m["Team 2"] || m.Team2,
      venue: m.Venue,
      winner: m.winner || m["Winning Team"],
      tossWinner: null,
      resultMargin: m.winning_margin || m["Won By"]
    }));
    await Match.insertMany(matches2025);
    totalImported += matches2025.length;
    console.log("Imported 2025 matches:", matches2025.length);
  } catch (err) {
    console.log("Could not load 2025 data:", err.message);
  }

  console.log("Total matches imported:", totalImported);

  // Try to load players dataset
  try {
    const playersData = JSON.parse(fs.readFileSync("./data/players.json", "utf-8"));
    await Player.insertMany(playersData);
    console.log("Imported players:", playersData.length);
  } catch (err) {
    console.log("Could not load players data:", err.message);
  }

  await historyDB.close();
  await predictionDB.close();
}

seedData();
