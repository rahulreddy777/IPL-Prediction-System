/**
 * rapidApiService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * RapidAPI Free Cricbuzz Cricket API — live match data for IPL 2026 FINAL
 * GT vs RCB
 *
 * Endpoints consumed:
 *   GET /cricket-match-info?matchid=<id>   — full match info + scorecard
 *   GET /cricket-livescores                — list of live matches
 *   GET /cricket-scorecard?matchid=<id>    — detailed scorecard
 *   GET /cricket-commentary?matchid=<id>   — live commentary
 *
 * Public helpers exported:
 *   fetchLiveFinalMatch(matchId)           — full match info with caching
 *   fetchCommentary(matchId)               — live commentary
 *   fetchScorecard(matchId)                — detailed scorecard
 *   findFinalMatchId()                     — auto-discover GT vs RCB matchId
 *   getCachedFinalData()                   — read cache only (no API call)
 *   saveFinalCache(data)                   — persist to MongoDB
 */

const axios = require("axios");
const { predictionDB } = require("../config/db");

// ── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = "https://free-cricbuzz-cricket-api.p.rapidapi.com";

const HEADERS = {
  "Content-Type": "application/json",
  "x-rapidapi-host": "free-cricbuzz-cricket-api.p.rapidapi.com",
  "x-rapidapi-key": process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "",
};

// IPL 2026 Final match ID — update when official ID is known
const FINAL_MATCH_ID = process.env.IPL_FINAL_MATCH_ID || "102040";

// Cache TTL: 15 seconds for live match
const CACHE_TTL_MS = 15_000;

// ── In-memory cache ──────────────────────────────────────────────────────────
let memCache = {
  matchInfo: null,
  scorecard: null,
  commentary: null,
  updatedAt: null,
  source: "none",
};

// ── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: HEADERS,
  timeout: 10_000,
});

// ── Logging helper ───────────────────────────────────────────────────────────
function log(msg, ...args) {
  console.log(`[rapidApiService] ${msg}`, ...args);
}
function warn(msg, ...args) {
  console.warn(`[rapidApiService] ⚠️  ${msg}`, ...args);
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE API CALLS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch full match info from Cricbuzz via RapidAPI
 */
async function callMatchInfo(matchId) {
  try {
    const { data } = await api.get("/cricket-match-info", {
      params: { matchid: matchId },
    });
    return data;
  } catch (err) {
    warn("callMatchInfo failed:", err.response?.status, err.message);
    return null;
  }
}

/**
 * Fetch detailed scorecard
 */
async function callScorecard(matchId) {
  try {
    const { data } = await api.get("/cricket-scorecard", {
      params: { matchid: matchId },
    });
    return data;
  } catch (err) {
    warn("callScorecard failed:", err.response?.status, err.message);
    return null;
  }
}

/**
 * Fetch live commentary
 */
async function callCommentary(matchId) {
  try {
    const { data } = await api.get("/cricket-commentary", {
      params: { matchid: matchId },
    });
    return data;
  } catch (err) {
    warn("callCommentary failed:", err.response?.status, err.message);
    return null;
  }
}

/**
 * Fetch live scores list to auto-discover GT vs RCB final match ID
 */
async function callLiveScores() {
  try {
    const { data } = await api.get("/cricket-livescores");
    return data;
  } catch (err) {
    warn("callLiveScores failed:", err.response?.status, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE & NORMALIZE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse raw match info into a normalized FinalMatchData object
 */
function parseMatchInfo(raw) {
  if (!raw) return null;

  // Handle multiple possible response shapes from Cricbuzz RapidAPI
  const matchInfo = raw?.matchInfo || raw?.matchDetails || raw;
  const matchScore = raw?.matchScore || raw?.scorecard || {};
  const miniscore  = raw?.miniscore || raw?.liveScore   || {};

  // Teams
  const team1 = matchInfo?.team1 || {};
  const team2 = matchInfo?.team2 || {};

  const team1Name = team1?.teamSName || team1?.teamName || "GT";
  const team2Name = team2?.teamSName || team2?.teamName || "RCB";

  // Scores
  const team1Score = matchScore?.team1Score || {};
  const team2Score = matchScore?.team2Score || {};
  const inn1 = team1Score?.inngs1 || {};
  const inn2 = team2Score?.inngs1 || {};

  // Toss
  const tossResult = matchInfo?.tossResults || matchInfo?.toss || {};

  // Mini-score (in-play details)
  const batsman1 = miniscore?.batsmanStriker || {};
  const batsman2 = miniscore?.batsmanNonStriker || {};
  const bowler   = miniscore?.bowlerStriker || {};
  const bowler2  = miniscore?.bowlerNonStriker || {};

  const partnership = miniscore?.partnerShip || {};
  const lastWkt     = miniscore?.lastWicket || "";
  const powerPlay   = miniscore?.powerPlot || {};

  return {
    matchId:        matchInfo?.matchId || FINAL_MATCH_ID,
    matchDesc:      matchInfo?.matchDesc || "IPL 2026 Final",
    matchFormat:    matchInfo?.matchFormat || "T20",
    matchType:      matchInfo?.matchType || "T20",
    status:         matchInfo?.status || miniscore?.status || "Live",
    state:          matchInfo?.state || "In Progress",
    venue:          matchInfo?.venue?.name || matchInfo?.venue || "Narendra Modi Stadium, Ahmedabad",
    startDate:      matchInfo?.startDate || matchInfo?.matchStartTimestamp,
    seriesName:     matchInfo?.seriesName || "TATA IPL 2026",
    isLive:         matchInfo?.state !== "Complete" && matchInfo?.state !== "Upcoming",

    toss: {
      winner:    tossResult?.tossWinnerId ? (tossResult.tossWinnerId === team1?.teamId ? team1Name : team2Name) : "",
      decision:  tossResult?.decision || tossResult?.tossChoice || "",
      text:      tossResult?.tossResultText || "",
    },

    team1: {
      id:        team1?.teamId || "1",
      name:      team1?.teamName || "Gujarat Titans",
      shortName: team1Name,
      score:     inn1?.runs !== undefined ? `${inn1.runs}/${inn1.wickets}` : "--",
      overs:     inn1?.overs || "0.0",
      isDeclared: inn1?.isDeclared || false,
      isFollowOn: inn1?.isFollowOn || false,
    },

    team2: {
      id:        team2?.teamId || "2",
      name:      team2?.teamName || "Royal Challengers Bengaluru",
      shortName: team2Name,
      score:     inn2?.runs !== undefined ? `${inn2.runs}/${inn2.wickets}` : "--",
      overs:     inn2?.overs || "0.0",
      isDeclared: inn2?.isDeclared || false,
      isFollowOn: inn2?.isFollowOn || false,
    },

    liveBatters: [
      {
        name:      batsman1?.batName || batsman1?.name || "",
        runs:      batsman1?.batRuns ?? 0,
        balls:     batsman1?.batBalls ?? 0,
        fours:     batsman1?.batFours ?? 0,
        sixes:     batsman1?.batSixes ?? 0,
        strikeRate: batsman1?.batStrikeRate ?? 0,
        isStriker: true,
      },
      {
        name:      batsman2?.batName || batsman2?.name || "",
        runs:      batsman2?.batRuns ?? 0,
        balls:     batsman2?.batBalls ?? 0,
        fours:     batsman2?.batFours ?? 0,
        sixes:     batsman2?.batSixes ?? 0,
        strikeRate: batsman2?.batStrikeRate ?? 0,
        isStriker: false,
      },
    ].filter(b => b.name),

    liveBowlers: [
      {
        name:     bowler?.bowlName || bowler?.name || "",
        overs:    bowler?.bowlOvs ?? 0,
        maidens:  bowler?.bowlMaidens ?? 0,
        runs:     bowler?.bowlRuns ?? 0,
        wickets:  bowler?.bowlWkts ?? 0,
        economy:  bowler?.bowlEcon ?? 0,
        isBowling: true,
      },
      {
        name:     bowler2?.bowlName || bowler2?.name || "",
        overs:    bowler2?.bowlOvs ?? 0,
        maidens:  bowler2?.bowlMaidens ?? 0,
        runs:     bowler2?.bowlRuns ?? 0,
        wickets:  bowler2?.bowlWkts ?? 0,
        economy:  bowler2?.bowlEcon ?? 0,
        isBowling: false,
      },
    ].filter(b => b.name),

    partnership: {
      runs:  partnership?.runs ?? 0,
      balls: partnership?.balls ?? 0,
    },

    lastWicket: lastWkt,

    currentRunRate:  miniscore?.currentRunRate  ?? 0,
    requiredRunRate: miniscore?.requiredRunRate  ?? 0,
    target:          miniscore?.target           ?? 0,
    recentOvers:     miniscore?.recentOvers      ?? miniscore?.lastSixOvers ?? "",

    powerPlay: {
      pp1End:  powerPlay?.pp1 ?? null,
      pp2End:  powerPlay?.pp2 ?? null,
      ppType:  powerPlay?.ppType ?? null,
    },

    winProbability: {
      team1: raw?.winProbability?.team1 ?? null,
      team2: raw?.winProbability?.team2 ?? null,
    },

    inningsId:       miniscore?.inningsId ?? 1,
    battingTeam:     miniscore?.battingTeamId
      ? (miniscore.battingTeamId === team1?.teamId ? team1Name : team2Name)
      : "",
    bowlingTeam:     miniscore?.bowlingTeamId
      ? (miniscore.bowlingTeamId === team1?.teamId ? team1Name : team2Name)
      : "",

    updatedAt: new Date().toISOString(),
    raw,   // preserve raw for advanced consumers
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MONGODB CACHE
// ─────────────────────────────────────────────────────────────────────────────

async function saveFinalCache(payload) {
  try {
    const db = await predictionDB.asPromise();
    await predictionDB.collection("liveFinalCache").updateOne(
      { type: "ipl-final-gt-rcb" },
      {
        $set: {
          type: "ipl-final-gt-rcb",
          matchId: FINAL_MATCH_ID,
          data: payload,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    log("MongoDB cache saved ✅");
  } catch (err) {
    warn("MongoDB save failed:", err.message);
  }
}

async function getCachedFinalData() {
  try {
    const doc = await predictionDB.collection("liveFinalCache").findOne(
      { type: "ipl-final-gt-rcb" },
      { sort: { updatedAt: -1 } }
    );
    if (doc?.data) {
      return { ...doc.data, fromCache: true, cacheLayer: "mongodb", cacheTime: doc.updatedAt };
    }
  } catch (err) {
    warn("MongoDB read failed:", err.message);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DISCOVER MATCH ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scan live scores to find the GT vs RCB final matchId
 */
async function findFinalMatchId() {
  const raw = await callLiveScores();
  if (!raw) return FINAL_MATCH_ID;

  const allMatches = [];

  // Flatten typeMatches structure
  if (Array.isArray(raw?.typeMatches)) {
    raw.typeMatches.forEach(tm => {
      if (Array.isArray(tm.seriesMatches)) {
        tm.seriesMatches.forEach(sm => {
          if (sm.seriesAdWrapper?.matches) {
            allMatches.push(...sm.seriesAdWrapper.matches);
          }
        });
      }
    });
  } else if (Array.isArray(raw?.data)) {
    allMatches.push(...raw.data);
  } else if (Array.isArray(raw?.response)) {
    allMatches.push(...raw.response);
  }

  for (const m of allMatches) {
    const info = m.matchInfo || m;
    const name = (
      info.matchDesc + " " +
      (info.seriesName || "") + " " +
      (info.team1?.teamSName || "") + " " +
      (info.team2?.teamSName || "")
    ).toLowerCase();

    const isGtRcb =
      (name.includes("gt") && name.includes("rcb")) ||
      (name.includes("gujarat") && name.includes("royal")) ||
      (name.includes("final") && name.includes("ipl"));

    if (isGtRcb && info.matchId) {
      log("Auto-discovered Final matchId:", info.matchId);
      return String(info.matchId);
    }
  }

  return FINAL_MATCH_ID;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI MATCH INSIGHTS (simple heuristic — no OpenAI dependency)
// ─────────────────────────────────────────────────────────────────────────────

function generateMatchInsights(parsedData) {
  if (!parsedData) return [];

  const insights = [];
  const { team1, team2, currentRunRate, requiredRunRate, target, partnership, liveBowlers, liveBatters, toss } = parsedData;

  // Toss insight
  if (toss?.winner && toss?.decision) {
    insights.push(`🪙 ${toss.winner} won the toss and chose to ${toss.decision}.`);
  }

  // Run-rate analysis
  if (requiredRunRate && currentRunRate) {
    const diff = (requiredRunRate - currentRunRate).toFixed(2);
    if (diff > 0) {
      insights.push(`📈 Batting team needs ${diff} more runs/over than current rate — pressure building!`);
    } else {
      insights.push(`✅ Batting team running ahead of required rate by ${Math.abs(diff)} RPO — in control.`);
    }
  }

  // Target insight
  if (target && target > 0) {
    insights.push(`🎯 Target set: ${target} runs. Chasing team needs to stay focused.`);
  }

  // Partnership insight
  if (partnership?.runs > 50) {
    insights.push(`🤝 Crucial partnership of ${partnership.runs} runs off ${partnership.balls} balls — momentum shift!`);
  }

  // Bowler on a roll
  const topBowler = liveBowlers.find(b => b.wickets > 1);
  if (topBowler) {
    insights.push(`🎳 ${topBowler.name} is on fire — ${topBowler.wickets} wickets for ${topBowler.runs} runs!`);
  }

  // Batter on a roll
  const topBatter = liveBatters.find(b => b.strikeRate > 150);
  if (topBatter) {
    insights.push(`💥 ${topBatter.name} attacking with SR ${topBatter.strikeRate} — ${topBatter.runs}(${topBatter.balls}).`);
  }

  if (insights.length === 0) {
    insights.push("🏏 Match is in progress — stay tuned for live updates!");
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fetchLiveFinalMatch — main entry point
 * Returns parsed + normalized live final match data with caching
 */
async function fetchLiveFinalMatch(matchId) {
  const id = matchId || FINAL_MATCH_ID;

  // Serve from memory if fresh
  if (memCache.matchInfo && memCache.updatedAt) {
    const age = Date.now() - new Date(memCache.updatedAt).getTime();
    if (age < CACHE_TTL_MS) {
      log("Serving from memory cache (age:", age, "ms)");
      return {
        ...memCache.matchInfo,
        fromCache: true,
        cacheLayer: "memory",
        insights: generateMatchInsights(memCache.matchInfo),
      };
    }
  }

  // Call RapidAPI
  const raw = await callMatchInfo(id);

  if (raw) {
    const parsed = parseMatchInfo(raw);
    memCache.matchInfo = parsed;
    memCache.updatedAt = new Date().toISOString();
    memCache.source = "rapidapi";

    // Persist to MongoDB async (non-blocking)
    saveFinalCache({
      matchInfo: parsed,
      scorecard: memCache.scorecard,
      commentary: memCache.commentary,
      updatedAt: memCache.updatedAt,
    }).catch(() => {});

    return {
      ...parsed,
      fromCache: false,
      source: "rapidapi",
      insights: generateMatchInsights(parsed),
    };
  }

  // Fallback → MongoDB
  const mongoData = await getCachedFinalData();
  if (mongoData?.matchInfo) {
    return {
      ...mongoData.matchInfo,
      fromCache: true,
      cacheLayer: "mongodb",
      insights: generateMatchInsights(mongoData.matchInfo),
    };
  }

  // Full fallback — return mock data so frontend is never blank
  return getMockFinalData();
}

/**
 * fetchCommentary — live ball-by-ball commentary
 */
async function fetchCommentary(matchId) {
  const id = matchId || FINAL_MATCH_ID;
  const raw = await callCommentary(id);

  if (raw) {
    const items = raw?.commentaryList || raw?.commentary || raw?.data || [];
    const shaped = Array.isArray(items)
      ? items.slice(0, 50).map(c => ({
          over:   c.overNumber ?? c.over ?? "",
          ball:   c.ballNumber ?? c.ball ?? "",
          event:  c.event ?? "",
          runs:   c.batsmanRuns ?? c.runs ?? 0,
          text:   c.commText   ?? c.commentary ?? c.text ?? "",
          isWicket: (c.event ?? "").toLowerCase().includes("wicket"),
          isFour:   c.batsmanRuns === 4 || c.runs === 4,
          isSix:    c.batsmanRuns === 6 || c.runs === 6,
        }))
      : [];

    memCache.commentary = shaped;
    return { success: true, source: "rapidapi", commentary: shaped, total: shaped.length };
  }

  // Fallback to cached
  if (memCache.commentary) {
    return { success: true, source: "memory-cache", commentary: memCache.commentary };
  }

  return { success: false, commentary: [], message: "Commentary unavailable" };
}

/**
 * fetchScorecard — full innings scorecard
 */
async function fetchScorecard(matchId) {
  const id = matchId || FINAL_MATCH_ID;
  const raw = await callScorecard(id);

  if (raw) {
    const innings = raw?.scorecard || raw?.innings || raw?.data || [];
    memCache.scorecard = raw;
    return {
      success: true,
      source: "rapidapi",
      innings: Array.isArray(innings) ? innings : [innings],
      raw,
    };
  }

  if (memCache.scorecard) {
    return { success: true, source: "memory-cache", scorecard: memCache.scorecard };
  }

  return { success: false, innings: [], message: "Scorecard unavailable" };
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — rendered when API is unavailable
// ─────────────────────────────────────────────────────────────────────────────

function getMockFinalData() {
  return {
    matchId: FINAL_MATCH_ID,
    matchDesc: "Final, IPL 2026",
    seriesName: "TATA IPL 2026",
    matchFormat: "T20",
    status: "Waiting for live data...",
    state: "Preview",
    venue: "Narendra Modi Stadium, Ahmedabad",
    isLive: false,
    isMock: true,

    toss: {
      winner: "TBD",
      decision: "TBD",
      text: "Toss result will appear here",
    },

    team1: {
      name: "Gujarat Titans",
      shortName: "GT",
      score: "--",
      overs: "0.0",
    },
    team2: {
      name: "Royal Challengers Bengaluru",
      shortName: "RCB",
      score: "--",
      overs: "0.0",
    },

    liveBatters: [],
    liveBowlers: [],
    partnership: { runs: 0, balls: 0 },
    lastWicket: "",
    currentRunRate: 0,
    requiredRunRate: 0,
    target: 0,
    recentOvers: "",
    winProbability: { team1: 50, team2: 50 },

    fromCache: false,
    source: "mock",
    updatedAt: new Date().toISOString(),
    insights: [
      "🏆 IPL 2026 FINAL — GT vs RCB",
      "⏳ Waiting for live match to begin...",
      "📡 Data will auto-refresh every 15 seconds once the match starts.",
    ],
  };
}

module.exports = {
  fetchLiveFinalMatch,
  fetchCommentary,
  fetchScorecard,
  findFinalMatchId,
  getCachedFinalData,
  saveFinalCache,
  FINAL_MATCH_ID,
};
