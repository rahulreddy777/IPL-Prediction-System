/**
 * winProbabilityStream.js — Event-driven AI win probability push (no polling)
 */
const fs = require("fs");
const path = require("path");
const { predictionDB } = require("../config/db");
const {
  calculateWinProbability,
  normalizeMatchState,
  parseScoreLine,
  parseOvers,
} = require("./winProbabilityEngine");
const websocketServer = require("./websocketServer");

const STATE_PATH = path.join(__dirname, "../data/live_match_state.json");
const SCHEDULE = require("../data/ipl_2026_matches_schedule.json");

const TEAM_HOME = {
  MI: "Mumbai",
  CSK: "Chennai",
  KKR: "Kolkata",
  RCB: "Bengaluru",
  DC: "Delhi",
  RR: "Jaipur",
  SRH: "Hyderabad",
  GT: "Ahmedabad",
  PBKS: "Mullanpur",
  LSG: "Lucknow",
};

function readIntelState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function teamCodeFromName(name = "") {
  const n = String(name).toUpperCase();
  const codes = Object.keys(TEAM_HOME);
  if (codes.includes(n)) return n;
  const low = String(name).toLowerCase();
  for (const [code, city] of Object.entries(TEAM_HOME)) {
    if (low.includes(city.toLowerCase()) || low.includes(code.toLowerCase())) return code;
  }
  return String(name).slice(0, 3).toUpperCase();
}

function parseDbTeamScore(teamObj) {
  if (!teamObj) return { score: null, overs: null };
  return {
    score: teamObj.score || teamObj.runs || null,
    overs: teamObj.overs ?? null,
  };
}

async function fetchMatchFromMongo(db, matchId) {
  const num = parseInt(matchId, 10);
  const query = Number.isFinite(num)
    ? { matchNumber: num }
    : { $or: [{ matchId: String(matchId) }, { _id: matchId }] };

  return db.collection("ipl_matches_2026").findOne(query);
}

async function fetchLiveCacheMatch(db, team1, team2) {
  const cache = await db.collection("live_cache").findOne({ type: "live" });
  const raw = cache?.data?.raw || cache?.data?.data || [];
  return raw.find((m) => {
    const codes = (m.teams || []).map(teamCodeFromName);
    return codes.includes(team1) && codes.includes(team2);
  });
}

function buildStateFromSources({ matchId, matchDoc, intelLive, liveCache, eventDelta }) {
  const sched = SCHEDULE.find((s) => s.Match === parseInt(matchId, 10));

  let team1 = intelLive?.team1;
  let team2 = intelLive?.team2;
  let venue = intelLive?.venue || sched?.Venue;
  let score1 = intelLive?.score1;
  let score2 = intelLive?.score2;
  let overs1 = intelLive?.overs1;
  let overs2 = intelLive?.overs2;
  let target = intelLive?.target ?? null;
  let tossWinner = intelLive?.toss?.winner;
  let tossChoice = intelLive?.toss?.choice;

  if (matchDoc) {
    team1 = team1 || matchDoc.team1?.code || teamCodeFromName(matchDoc.team1?.name);
    team2 = team2 || matchDoc.team2?.code || teamCodeFromName(matchDoc.team2?.name);
    venue = venue || matchDoc.venue;
    const t1 = parseDbTeamScore(matchDoc.team1);
    const t2 = parseDbTeamScore(matchDoc.team2);
    if (!score1 && t1.score) score1 = t1.score;
    if (!score2 && t2.score) score2 = t2.score;
    if (!overs1 && t1.overs != null) overs1 = t1.overs;
    if (!overs2 && t2.overs != null) overs2 = t2.overs;
  }

  if (liveCache?.score?.length) {
    const codes = (liveCache.teams || []).map(teamCodeFromName);
    if (codes[0] && codes[1]) {
      team1 = team1 || codes[0];
      team2 = team2 || codes[1];
    }
    const s0 = liveCache.score[0];
    const s1 = liveCache.score[1];
    if (!score1 && s0) score1 = `${s0.r}/${s0.w}`;
    if (!score2 && s1) score2 = `${s1.r}/${s1.w}`;
    if (!overs1 && s0?.o) overs1 = s0.o;
    if (!overs2 && s1?.o) overs2 = s1.o;
  }

  team1 = team1 || "T1";
  team2 = team2 || "T2";

  const t1Parsed = parseScoreLine(score1);
  const t2Parsed = parseScoreLine(score2);
  const t1Overs = parseOvers(overs1);
  const t2Overs = parseOvers(overs2);

  let chasingTeam = null;
  if (target != null && tossChoice === "field") {
    chasingTeam = tossWinner === team1 ? team2 : team1;
  } else if (t2Overs > 0 && t1Overs > 0 && target) {
    chasingTeam = t2Parsed.runs < target ? team2 : team1;
  }

  const homeTeam =
    Object.entries(TEAM_HOME).find(([, city]) =>
      String(venue || "").toLowerCase().includes(city.toLowerCase())
    )?.[0] || null;

  const recentEvents = eventDelta ? [eventDelta] : [];

  return normalizeMatchState({
    team1,
    team2,
    venue,
    homeTeam,
    score1,
    score2,
    overs1,
    overs2,
    target,
    chasingTeam,
    tossWinner,
    tossChoice,
    recentEvents,
  });
}

/**
 * Fetch match state from MongoDB + live_cache + intel state
 */
async function buildMatchState(db, matchId) {
  const conn = db || predictionDB;
  await conn.asPromise();

  const matchDoc = await fetchMatchFromMongo(conn, matchId);
  const intel = readIntelState();
  const intelLive =
    intel?.currentLive?.matchNumber === parseInt(matchId, 10) ? intel.currentLive : null;

  const t1 = intelLive?.team1 || matchDoc?.team1?.code;
  const t2 = intelLive?.team2 || matchDoc?.team2?.code;
  const liveCache =
    t1 && t2 ? await fetchLiveCacheMatch(conn, t1, t2) : null;

  return buildStateFromSources({ matchId, matchDoc, intelLive, liveCache });
}

/**
 * Push AI_WIN_PROBABILITY_UPDATE over WebSocket (event-driven only)
 */
async function pushWinPredictionUpdate(db, matchId, options = {}) {
  const state = await buildMatchState(db, matchId);

  if (options.event) {
    state.recentEvents = [...(state.recentEvents || []), options.event];
  }

  const prob = calculateWinProbability(state);

  const payload = {
    type: "AI_WIN_PROBABILITY_UPDATE",
    matchId: String(matchId),
    team1: state.team1,
    team2: state.team2,
    probability: {
      team1: prob.team1Probability,
      team2: prob.team2Probability,
    },
    momentum: prob.momentum,
    keyFactors: prob.keyFactors,
    innings: {
      team1: { score: `${state.team1Innings.runs}/${state.team1Innings.wickets}`, overs: state.team1Innings.overs },
      team2: { score: `${state.team2Innings.runs}/${state.team2Innings.wickets}`, overs: state.team2Innings.overs },
    },
    timestamp: Date.now(),
  };

  const sent = websocketServer.broadcast(payload);
  console.log(
    `[WinProb] Pushed M${matchId} ${state.team1} ${prob.team1Probability}% vs ${state.team2} ${prob.team2Probability}% → ${sent} clients`
  );

  return { payload, clients: sent };
}

/** Resolve schedule match number from team codes */
function resolveMatchNumber(team1, team2) {
  const a = teamCodeFromName(team1);
  const b = teamCodeFromName(team2);
  const row = SCHEDULE.find((s) => {
    const parts = String(s.Matchup || "")
      .split(/\s+vs\s+/i)
      .map((t) => teamCodeFromName(t.trim()));
    return parts.includes(a) && parts.includes(b);
  });
  return row?.Match ?? null;
}

/**
 * After live score cache refresh — push WS updates per live card (event-driven)
 */
async function pushUpdatesFromLivePayload(payload = {}) {
  const cards = payload.matches || [];
  const results = [];
  for (const card of cards) {
    const matchNum =
      card.matchNumber ||
      resolveMatchNumber(card.team1, card.team2);
    if (!matchNum) continue;
    try {
      const r = await pushWinPredictionUpdate(predictionDB, matchNum);
      results.push({ matchId: matchNum, ok: true, clients: r.clients });
    } catch (e) {
      results.push({ matchId: matchNum, ok: false, error: e.message });
    }
  }
  return results;
}

module.exports = {
  pushWinPredictionUpdate,
  buildMatchState,
  buildStateFromSources,
  pushUpdatesFromLivePayload,
  resolveMatchNumber,
};
