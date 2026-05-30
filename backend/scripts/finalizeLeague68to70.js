/**
 * Finalize IPL 2026 league after matches 68–70
 * Run: node scripts/finalizeLeague68to70.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { predictionDB } = require("../config/db");
const {
  rebuildPointsTableFromMatches,
  importOfficialPointsTable,
  applyQualificationStatus,
  getFreshPointsTable,
  recalculateNRR,
} = require("../services/pointsTableService");
const { getPlayoffBracket, generatePlayoffBracketFromTop4 } = require("../services/playoffEngine");
const { clearEmittedEvents, emitOnce, emitPointsTableUpdate, clonePointsTable } = require("../services/seasonWebSocket");

const COL_MATCHES = "ipl_matches_2026";
const COL_SEASON = "season_state_2026";

const TOP4 = ["RCB", "GT", "SRH", "RR"];

const MATCH_UPDATES = [
  {
    matchNumber: 68,
    team1Score: "196/6",
    team2Score: "200/3",
    winner: "PBKS",
    result: "PBKS won by 7 wickets",
  },
  {
    matchNumber: 69,
    team1Score: "175/9",
    team2Score: "205/8",
    winner: "RR",
    result: "RR won by 30 runs",
  },
  {
    matchNumber: 70,
    team1Score: "163/10",
    team2Score: "203/5",
    winner: "DC",
    result: "DC won by 40 runs",
  },
];

const OFFICIAL_STANDINGS = {
  season: 2026,
  type: "points_table",
  updatedAt: "2026-05-25",
  teams: [
    { rank: 1, team: "RCB", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.783, status: "Q" },
    { rank: 2, team: "GT", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.695, status: "Q" },
    { rank: 3, team: "SRH", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.524, status: "Q" },
    { rank: 4, team: "RR", played: 14, won: 8, lost: 6, noResult: 0, points: 16, nrr: 0.083, status: "Q" },
    { rank: 5, team: "PBKS", played: 14, won: 7, lost: 6, noResult: 0, points: 15, nrr: 0.227, status: "E" },
    { rank: 6, team: "DC", played: 14, won: 7, lost: 7, noResult: 0, points: 14, nrr: -0.871, status: "E" },
    { rank: 7, team: "KKR", played: 14, won: 6, lost: 7, noResult: 0, points: 13, nrr: 0.011, status: "E" },
    { rank: 8, team: "CSK", played: 14, won: 6, lost: 8, noResult: 0, points: 12, nrr: -0.345, status: "E" },
    { rank: 9, team: "MI", played: 14, won: 4, lost: 10, noResult: 0, points: 8, nrr: -0.51, status: "E" },
    { rank: 10, team: "LSG", played: 14, won: 4, lost: 10, noResult: 0, points: 8, nrr: -0.702, status: "E" },
  ],
};

const PLAYOFF_MATCHUPS = [
  { matchNumber: 71, matchType: "qualifier1", stage: "Qualifier 1", team1: "RCB", team2: "GT" },
  { matchNumber: 72, matchType: "eliminator", stage: "Eliminator", team1: "SRH", team2: "RR" },
  { matchNumber: 73, matchType: "qualifier2", stage: "Qualifier 2", team1: "TBD", team2: "TBD" },
  { matchNumber: 74, matchType: "final", stage: "Final", team1: "TBD", team2: "TBD" },
];

async function updateMatch(conn, spec) {
  const mid = spec.matchNumber;
  const doc = await conn.collection(COL_MATCHES).findOne({ matchNumber: mid });
  if (!doc) throw new Error(`Match ${mid} not found in ${COL_MATCHES}`);

  const t1 = doc.team1?.code || doc.team1;
  const t2 = doc.team2?.code || doc.team2;

  await conn.collection(COL_MATCHES).updateOne(
    { matchNumber: mid },
    {
      $set: {
        status: "completed",
        winner: spec.winner,
        result: spec.result,
        "team1.score": spec.team1Score,
        "team2.score": spec.team2Score,
        matchType: "league",
        completedAt: new Date(),
      },
    }
  );

  // User-specified collection alias (if present)
  const alt = conn.collection("matches");
  const altCount = await alt.countDocuments({ matchNumber: mid });
  if (altCount > 0) {
    await alt.updateOne(
      { matchNumber: mid },
      {
        $set: {
          status: "completed",
          winner: spec.winner,
          result: spec.result,
          "team1.score": spec.team1Score,
          "team2.score": spec.team2Score,
        },
      }
    );
  }

  console.log(`[MATCH${mid} UPDATED]`);
}

async function resetPointsProcessing(conn) {
  await conn.collection("processed_matches").deleteMany({});
  await conn.collection("points_table_2026").deleteMany({});
}

async function updatePlayoffSlots(conn) {
  for (const slot of PLAYOFF_MATCHUPS) {
    const set = {
      status: "upcoming",
      winner: null,
      matchType: slot.matchType,
      label: slot.stage,
      "team1.code": slot.team1,
      "team2.code": slot.team2,
      result: `${slot.team1} vs ${slot.team2}`,
    };
    await conn.collection(COL_MATCHES).updateOne({ matchNumber: slot.matchNumber }, { $set: set });
  }
}

async function saveSeasonState(conn, playoffs) {
  await conn.collection(COL_SEASON).updateOne(
    { type: "league" },
    {
      $set: {
        type: "league",
        status: "complete",
        leagueComplete: true,
        playoffsLocked: true,
        top4: TOP4,
        playoffs,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

async function main() {
  await predictionDB.asPromise();
  const conn = predictionDB;
  clearEmittedEvents();

  for (const spec of MATCH_UPDATES) {
    await updateMatch(conn, spec);
  }

  await resetPointsProcessing(conn);

  await rebuildPointsTableFromMatches(conn, 70);
  await recalculateNRR(conn);
  await importOfficialPointsTable(conn, OFFICIAL_STANDINGS);

  const table = await applyQualificationStatus(conn);
  await recalculateNRR(conn);

  const sorted = clonePointsTable(table).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  console.log("\n📊 Final standings:");
  sorted.forEach((r, i) => {
    console.log(`${i + 1} ${r.team} P:${r.played} W:${r.won} L:${r.lost} PTS:${r.points} NRR:${r.nrr}`);
  });

  console.log("[TOP4 LOCKED]");

  const playoffs = generatePlayoffBracketFromTop4(TOP4);
  await updatePlayoffSlots(conn);
  await saveSeasonState(conn, playoffs);

  const bracket = await getPlayoffBracket(conn, { emit: false });
  bracket.playoffStatus = {
    isLocked: true,
    playoffsLocked: true,
    message: "Top 4 confirmed",
    subtitle: "Top 4 confirmed",
    description: `Top 4: ${TOP4.join(", ")}`,
  };
  bracket.leagueComplete = true;
  bracket.top4 = TOP4;
  bracket.waitingMessage = "Top 4 confirmed";

  emitOnce("MATCH_RESULTS_UPDATED", { matches: [68, 69, 70], updatedAt: Date.now() });
  emitPointsTableUpdate("league_complete", sorted);
  emitOnce("POINTS_TABLE_UPDATED", { pointsTable: sorted, top4: TOP4 });
  emitOnce("PLAYOFFS_UPDATED", { ...bracket, type: "PLAYOFFS_UPDATED" });
  emitOnce("PLAYOFF_BRACKET_UPDATE", { ...bracket, type: "PLAYOFF_BRACKET_UPDATE" });

  console.log("[PLAYOFFS GENERATED]");
  console.log("  Qualifier 1: RCB vs GT");
  console.log("  Eliminator: SRH vs RR");
  console.log("  Qualifier 2: loser(Q1) vs winner(Eliminator)");
  console.log("  Final: winner(Q1) vs winner(Q2)");

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
