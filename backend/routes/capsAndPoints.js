/**
 * capsAndPoints.js — Live MongoDB endpoints for Points Table, Orange Cap, Purple Cap
 *
 * Routes:
 *   GET /api/points-table  → db.points_table_2026 sorted by rank
 *   GET /api/orange-cap    → db.batting_stats_2026  sorted by runs  desc (top 10)
 *   GET /api/purple-cap    → db.bowling_stats_2026  sorted by wickets desc (top 10)
 *
 * Fallback: if a MongoDB collection is empty the route delegates to the
 * static data already stored in /api/matches2026/points-table (etc.) so
 * the UI always has something to display.
 */

const express          = require("express");
const router           = express.Router();
const { predictionDB, historyDB } = require("../config/db");
const wsServer         = require("../services/websocketServer");
const pointsTableService = require("../services/pointsTableService");

// ── WS broadcast helper ───────────────────────────────────────────────────────
function broadcast(type, payload = {}) {
  try {
    wsServer.broadcast({ type, ...payload, timestamp: Date.now() });
  } catch {
    /* WS server not yet ready — safe to ignore on startup */
  }
}

// ── Static fallback data (mirrors matches2026.js, used when DB is empty) ──────
const ORANGE_CAP_FALLBACK = [
  { rank:1,  name:"Sai Sudharsan",       team:"GT",   matches:14, runs:638, average:49.08, strikeRate:157.92 },
  { rank:2,  name:"Shubman Gill",        team:"GT",   matches:13, runs:616, average:47.38, strikeRate:161.68 },
  { rank:3,  name:"Vaibhav Sooryavanshi",team:"RR",   matches:13, runs:579, average:44.54, strikeRate:236.33 },
  { rank:4,  name:"Mitchell Marsh",      team:"PBKS", matches:13, runs:563, average:43.31, strikeRate:163.19 },
  { rank:5,  name:"Heinrich Klaasen",    team:"SRH",  matches:13, runs:555, average:50.45, strikeRate:155.90 },
  { rank:6,  name:"Virat Kohli",         team:"RCB",  matches:13, runs:542, average:54.20, strikeRate:164.74 },
  { rank:7,  name:"KL Rahul",            team:"DC",   matches:13, runs:533, average:44.42, strikeRate:171.94 },
  { rank:8,  name:"Abhishek Sharma",     team:"SRH",  matches:13, runs:507, average:42.25, strikeRate:201.99 },
  { rank:9,  name:"Ishan Kishan",        team:"SRH",  matches:13, runs:490, average:37.69, strikeRate:179.49 },
  { rank:10, name:"Sanju Samson",        team:"RR",   matches:14, runs:477, average:43.36, strikeRate:165.63 },
];

const PURPLE_CAP_FALLBACK = [
  { rank:1,  name:"Bhuvneshwar Kumar", team:"RCB", matches:13, wickets:24, average:16.38, economy:7.71  },
  { rank:2,  name:"Kagiso Rabada",     team:"GT",  matches:14, wickets:24, average:20.54, economy:9.18  },
  { rank:3,  name:"Anshul Kamboj",     team:"MI",  matches:14, wickets:21, average:25.24, economy:10.53 },
  { rank:4,  name:"Rashid Khan",       team:"GT",  matches:14, wickets:19, average:21.95, economy:8.72  },
  { rank:5,  name:"Jofra Archer",      team:"RR",  matches:13, wickets:18, average:24.39, economy:9.15  },
  { rank:6,  name:"Kartik Tyagi",      team:"KKR", matches:13, wickets:18, average:24.61, economy:9.43  },
  { rank:7,  name:"Mohammed Siraj",    team:"GT",  matches:14, wickets:17, average:25.76, economy:8.59  },
  { rank:8,  name:"Eshan Malinga",     team:"MI",  matches:13, wickets:17, average:25.53, economy:9.37  },
];

const POINTS_FALLBACK = [
  { rank:1,  team:"RCB",  played:14, won:9,  lost:5,  noResult:0, points:18, nrr:"+0.783", status:"Qualified"  },
  { rank:2,  team:"GT",   played:14, won:9,  lost:5,  noResult:0, points:18, nrr:"+0.695", status:"Qualified"  },
  { rank:3,  team:"SRH",  played:14, won:9,  lost:5,  noResult:0, points:18, nrr:"+0.524", status:"Qualified"  },
  { rank:4,  team:"RR",   played:14, won:8,  lost:6,  noResult:0, points:16, nrr:"+0.083", status:"Qualified"  },
  { rank:5,  team:"PBKS", played:14, won:7,  lost:6,  noResult:0, points:15, nrr:"+0.227", status:"Eliminated" },
  { rank:6,  team:"DC",   played:14, won:7,  lost:7,  noResult:0, points:14, nrr:"-0.871", status:"Eliminated" },
  { rank:7,  team:"KKR",  played:14, won:6,  lost:7,  noResult:0, points:13, nrr:"+0.011", status:"Eliminated" },
  { rank:8,  team:"CSK",  played:14, won:6,  lost:8,  noResult:0, points:12, nrr:"-0.345", status:"Eliminated" },
  { rank:9,  team:"MI",   played:14, won:4,  lost:10, noResult:0, points:8,  nrr:"-0.510", status:"Eliminated" },
  { rank:10, team:"LSG",  played:14, won:4,  lost:10, noResult:0, points:8,  nrr:"-0.702", status:"Eliminated" },
];

// ── GET /api/points-table ─────────────────────────────────────────────────────
router.get("/points-table", async (req, res) => {
  try {
    let data = await pointsTableService.getFreshPointsTable();

    // Filter to only include valid IPL teams
    if (data && data.length > 0) {
      data = data.filter(row => row && row.team);

      // Deduplicate to ensure only one document per team is returned (keeping the highest ranked/active one)
      const seen = new Set();
      const deduped = [];
      for (const row of data) {
        if (!seen.has(row.team)) {
          seen.add(row.team);
          deduped.push(row);
        }
      }
      data = deduped;
    }

    // If MongoDB collection is empty or filters out everything, use static fallback
    if (!data || data.length === 0) {
      console.warn("[POINTS TABLE] Collection empty or invalid — using fallback data");
      data = POINTS_FALLBACK;
    }

    // Double check that we only return top 10 items
    data = data.slice(0, 10);

    // Re-assign correct ranks 1 to 10 based on final sorted order
    data.forEach((row, idx) => {
      row.rank = idx + 1;
    });

    console.log("[POINTS TABLE] Returning", data.length, "rows");
    res.json(data);

  } catch (err) {
    console.error("[POINTS TABLE] MongoDB error:", err.message);
    // Still return fallback data so UI never breaks
    console.warn("[POINTS TABLE] Serving fallback data due to error");
    res.json(POINTS_FALLBACK);
  }
});

// ── GET /api/orange-cap ───────────────────────────────────────────────────────
router.get("/orange-cap", async (req, res) => {
  try {
    let players = await predictionDB
      .collection("batting_stats_2026")
      .find({})
      .sort({ runs: -1 })
      .limit(10)
      .toArray();

    // If MongoDB collection is empty, use static fallback
    if (!players || players.length === 0) {
      console.warn("[ORANGE CAP] Collection empty — using fallback data");
      players = ORANGE_CAP_FALLBACK;
    }

    console.log("[ORANGE CAP] Returning", players.length, "batters");
    res.json(players);

  } catch (err) {
    console.error("[ORANGE CAP] MongoDB error:", err.message);
    console.warn("[ORANGE CAP] Serving fallback data due to error");
    res.json(ORANGE_CAP_FALLBACK);
  }
});

// ── GET /api/purple-cap ───────────────────────────────────────────────────────
router.get("/purple-cap", async (req, res) => {
  try {
    let players = await predictionDB
      .collection("bowling_stats_2026")
      .find({})
      .sort({ wickets: -1 })
      .limit(10)
      .toArray();

    // If MongoDB collection is empty, use static fallback
    if (!players || players.length === 0) {
      console.warn("[PURPLE CAP] Collection empty — using fallback data");
      players = PURPLE_CAP_FALLBACK;
    }

    console.log("[PURPLE CAP] Returning", players.length, "bowlers");
    res.json(players);

  } catch (err) {
    console.error("[PURPLE CAP] MongoDB error:", err.message);
    console.warn("[PURPLE CAP] Serving fallback data due to error");
    res.json(PURPLE_CAP_FALLBACK);
  }
});

// ── GET /api/all-seasons-caps ────────────────────────────────────────────────
router.get("/all-seasons-caps", async (req, res) => {
  try {
    const caps = await historyDB.collection("all_seasons_caps").find({}).toArray();
    res.json(caps);
  } catch (err) {
    console.error("[ALL SEASONS CAPS] error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
