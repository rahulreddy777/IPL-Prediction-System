const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Match = require("./models/Match");
const Player = require("./models/Player");
const Team = require("./models/Team");
const Stadium = require("./models/Stadium");

const { historyDB, predictionDB } = require("./config/db");

async function seedData() {
  try {
    console.log("Cleaning existing data...");
    await Match.deleteMany({});
    await Player.deleteMany({});
    await Team.deleteMany({});
    await Stadium.deleteMany({});

    // 1. Seed Teams from captains.json
    console.log("Seeding Teams...");
    const captainsData = JSON.parse(fs.readFileSync("./data/captains.json", "utf-8"));
    const teams = captainsData.map(t => ({
      name: t.team,
      shortName: t.team_code,
      captain: t.captain,
      coach: "Unknown", // Default or find from other source
      stadium: "Unknown", // Updated later from stadiums.json
      logo: `/data/teams/${t.team_code.toLowerCase()}.jpg`
    }));
    await Team.insertMany(teams);
    console.log(`Imported ${teams.length} teams.`);

    // 2. Seed Stadiums from stadiums.json
    console.log("Seeding Stadiums...");
    const stadiumsData = JSON.parse(fs.readFileSync("./data/stadiums.json", "utf-8"));
    const stadiums = stadiumsData.map(s => ({
      name: s.name,
      city: s.city,
      capacity: s.capacity || 0,
      homeTeam: s.home_team
    }));
    await Stadium.insertMany(stadiums);
    console.log(`Imported ${stadiums.length} stadiums.`);

    // 3. Update Team stadiums
    for (const team of teams) {
      const homeStadium = stadiumsData.find(s => s.home_team === team.shortName);
      if (homeStadium) {
        await Team.updateOne({ shortName: team.shortName }, { stadium: homeStadium.name });
      }
    }

    // 4. Seed Matches (from existing seed.js logic)
    console.log("Seeding Matches...");
    let totalMatches = 0;
    const matchFiles = [
      { path: "./data/ipl matches from 2008 to 2022.json", season: null },
      { path: "./data/ipl_matches_2023.json", season: 2023 },
      { path: "./data/ipl_matches_2024.json", season: 2024 },
      { path: "./data/ipl_matches_2025.json.json", season: 2025 }
    ];

    for (const file of matchFiles) {
      try {
        if (fs.existsSync(file.path)) {
          const data = JSON.parse(fs.readFileSync(file.path, "utf-8"));
          const matches = data.map(m => ({
            season: file.season || parseInt(m.Season) || 0,
            team1: m.Team1 || m["Team 1"] || m["team1"],
            team2: m.Team2 || m["Team 2"] || m["team2"],
            venue: m.Venue || m["venue"],
            winner: m.WinningTeam || m["Winning Team"] || m["winner"],
            tossWinner: m.TossWinner || m["Toss winning team"],
            resultMargin: (m.Margin || m["Won By"] || m["winning_margin"] || "").toString()
          }));
          await Match.insertMany(matches);
          totalMatches += matches.length;
          console.log(`Imported ${matches.length} matches from ${file.path}`);
        }
      } catch (err) {
        console.error(`Error loading ${file.path}:`, err.message);
      }
    }
    console.log(`Total matches imported: ${totalMatches}`);

    // 5. Seed Players
    console.log("Seeding Players...");
    if (fs.existsSync("./data/players.json")) {
      const playersData = JSON.parse(fs.readFileSync("./data/players.json", "utf-8"));
      await Player.insertMany(playersData);
      console.log(`Imported ${playersData.length} players.`);
    }

    console.log("Seeding completed successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await historyDB.close();
    await predictionDB.close();
  }
}

seedData();
