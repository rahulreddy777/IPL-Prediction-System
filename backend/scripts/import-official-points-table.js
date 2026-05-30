/**
 * Import official IPL 2026 points table into MongoDB
 * Run: node scripts/import-official-points-table.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const OFFICIAL = {
  season: 2026,
  type: "points_table",
  updatedAt: "2026-05-23",
  teams: [
    { rank: 1, team: "RCB", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.783, status: "Q" },
    { rank: 2, team: "GT", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.695, status: "Q" },
    { rank: 3, team: "SRH", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.524, status: "Q" },
    { rank: 4, team: "RR", played: 13, won: 7, lost: 6, noResult: 0, points: 14, nrr: 0.083, status: "Q" },
    { rank: 5, team: "PBKS", played: 13, won: 6, lost: 6, noResult: 1, points: 13, nrr: 0.227, status: "E" },
    { rank: 6, team: "KKR", played: 13, won: 6, lost: 6, noResult: 1, points: 13, nrr: 0.011, status: "E" },
    { rank: 7, team: "CSK", played: 14, won: 6, lost: 8, noResult: 0, points: 12, nrr: -0.345, status: "E" },
    { rank: 8, team: "DC", played: 13, won: 6, lost: 7, noResult: 0, points: 12, nrr: -0.871, status: "E" },
    { rank: 9, team: "MI", played: 13, won: 4, lost: 9, noResult: 0, points: 8, nrr: -0.51, status: "E" },
    { rank: 10, team: "LSG", played: 13, won: 4, lost: 9, noResult: 0, points: 8, nrr: -0.702, status: "E" },
  ],
};

async function main() {
  const { importOfficialPointsTable } = require("../services/pointsTableService");
  const { rows } = await importOfficialPointsTable(null, OFFICIAL);
  console.log("\n✅ Points table updated in MongoDB (points_table_2026)\n");
  console.log("Rank  Team  P   W   L   Pts   NRR");
  rows.forEach((r) => {
    console.log(
      `${String(r.rank).padStart(4)}  ${r.team.padEnd(4)}  ${r.played}  ${r.won}  ${r.lost}  ${String(r.points).padStart(3)}  ${r.nrr}`
    );
  });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
