/**
 * IPL Live Match Agent — single 15s poll: Rapid API → MongoDB cache → WebSocket
 */
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");
const liveScoreService = require("./liveScoreService");
const websocketServer = require("./websocketServer");

const RESULTS_FILE = path.join(__dirname, "../data/live_results_2026.json");
const SCHEDULE = require("../data/ipl_2026_matches_schedule.json");
const POLL_MS = 120000; // 2 min — stays within RapidAPI free-tier rate limits

const TEAM_MAP = {
  "mumbai indians": "MI",
  "chennai super kings": "CSK",
  "kolkata knight riders": "KKR",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "royal challengers": "RCB",
  "delhi capitals": "DC",
  "rajasthan royals": "RR",
  "sunrisers hyderabad": "SRH",
  "punjab kings": "PBKS",
  "lucknow super giants": "LSG",
  "gujarat titans": "GT",
};

let agentStarted = false;
let pollInterval = null;

function toCode(name = "") {
  const lower = name.toLowerCase().trim();
  for (const [key, code] of Object.entries(TEAM_MAP)) {
    if (lower.includes(key)) return code;
  }
  const upper = name.toUpperCase().trim();
  if (Object.values(TEAM_MAP).includes(upper)) return upper;
  return null;
}

function extractWinner(statusStr = "") {
  const match = statusStr.match(/^(.+?)\s+won\s+by/i);
  if (match) return match[1].trim();
  return null;
}

function findScheduleEntry(teamCodes) {
  return (
    SCHEDULE.find((s) => {
      const parts = s.Matchup.split(" vs ").map((t) => t.trim().toUpperCase());
      return (
        (parts[0] === teamCodes[0] && parts[1] === teamCodes[1]) ||
        (parts[0] === teamCodes[1] && parts[1] === teamCodes[0])
      );
    }) || null
  );
}

function loadResults() {
  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8"));
  } catch {
    return { matchResults: [] };
  }
}

function saveResults(store) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(store, null, 2), "utf8");
}

let cachedPredictions = null;

async function loadPredictions() {
  try {
    const advML = require("./advancedMLService");
    const res = await advML.predictAllMatches();
    if (res?.predictions?.length) {
      cachedPredictions = res.predictions;
    }
  } catch (err) {
    console.warn("[Agent] Could not pre-load predictions:", err.message);
  }
}

function getPredictions() {
  return cachedPredictions || [];
}

function findPrediction(scheduleEntry) {
  if (!scheduleEntry) return null;
  const preds = getPredictions();
  return (
    preds.find(
      (p) =>
        p.match_id === scheduleEntry.Match ||
        (p.matchup &&
          p.matchup.replace(/\s/g, "").toUpperCase() ===
            scheduleEntry.Matchup.replace(/\s/g, "").toUpperCase())
    ) || null
  );
}

function buildAnalysis(match, schedEntry, prediction, winnerCode) {
  const probMap = prediction?.win_probability || prediction?.winProbability || {};
  const predWinner = prediction?.predicted_winner || prediction?.predictedWinner || null;
  const predCode = toCode(predWinner || "");

  const correct = predCode !== null && predCode === winnerCode;

  const winnerProb = (() => {
    for (const [k, v] of Object.entries(probMap)) {
      const c = toCode(k);
      if (c && c === winnerCode) return parseFloat(v);
    }
    return null;
  })();

  return {
    matchNumber: schedEntry?.Match ?? null,
    matchup: schedEntry?.Matchup ?? match.name,
    date: schedEntry?.Date ?? null,
    venue: schedEntry?.Venue ?? (match.venue?.split(",")[0] ?? null),
    actualWinner: winnerCode,
    actualWinnerFull: extractWinner(match.status),
    winMargin: match.status,
    predictedWinner: predCode,
    predictionCorrect: correct,
    confidence: winnerProb,
    predictedProb: probMap,
    source: prediction ? "ml-prediction" : "no-prediction",
    updatedAt: new Date().toISOString(),
  };
}

class LiveMatchAgent extends EventEmitter {
  constructor() {
    super();
    this.store = loadResults();
    this.processedIds = new Set(
      this.store.matchResults.map((r) => r.cricApiId).filter(Boolean)
    );
    this.stats = this._computeStats();
    this.cachedLiveData = [];
    this.lastProcessTime = null;
    this.lastProcessStatus = "idle";
  }

  _enrichStoredResults() {
    let enriched = 0;
    for (const r of this.store.matchResults) {
      if (r.predictedWinner !== null) continue;
      const schedEntry = SCHEDULE.find((s) => s.Match === r.matchNumber);
      const prediction = findPrediction(schedEntry);
      if (!prediction) continue;

      const predWinner = prediction?.predicted_winner || prediction?.predictedWinner || null;
      const predCode = predWinner ? toCode(predWinner) : null;
      const probMap = prediction?.win_probability || prediction?.winProbability || {};
      const correct = predCode !== null && predCode === r.actualWinner;
      const winnerProb = (() => {
        for (const [k, v] of Object.entries(probMap)) {
          if (toCode(k) === r.actualWinner) return parseFloat(v);
        }
        return null;
      })();

      r.predictedWinner = predCode;
      r.predictionCorrect = correct;
      r.confidence = winnerProb;
      r.predictedProb = probMap;
      r.source = "ml-prediction";
      enriched++;
    }
    if (enriched > 0) {
      this.stats = this._computeStats();
      saveResults(this.store);
    }
  }

  async processLiveData(payload = {}) {
    this.lastProcessTime = new Date();
    const all = payload.data || payload.raw || [];

    if (payload.error && all.length === 0) {
      this.lastProcessStatus = payload.error;
      return { newResults: 0 };
    }

    this.lastProcessStatus = payload.cacheLayer || "cache";

    if (all.length > 0) {
      this.cachedLiveData = all;
    }

    const completed = all.filter((m) => {
      const status = (m.status || "").toLowerCase();
      return (status.includes("won") || status.includes("win")) && m.matchEnded;
    });

    let newCount = 0;
    for (const match of completed) {
      if (this.processedIds.has(match.id)) continue;

      const winnerFull = extractWinner(match.status);
      const winnerCode = winnerFull ? toCode(winnerFull) : null;
      if (!winnerCode) continue;

      const teamArr = match.teams || match.name?.split(" vs ") || [];
      const codes = teamArr.map((t) => toCode(t)).filter(Boolean);
      const schedEntry = findScheduleEntry(codes);
      const prediction = findPrediction(schedEntry);
      const analysis = buildAnalysis(match, schedEntry, prediction, winnerCode);

      const record = { cricApiId: match.id, ...analysis };
      this.store.matchResults.push(record);
      this.processedIds.add(match.id);
      newCount++;

      console.log(`[Agent] ✅ ${analysis.matchup} → ${winnerCode}`);
      this.emit("matchResult", record);

      // Broadcast MATCH_COMPLETED so frontend clients auto-update immediately
      websocketServer.broadcast({
        type: "MATCH_COMPLETED",
        matchup: analysis.matchup,
        winner: winnerCode,
        matchNumber: analysis.matchNumber,
        timestamp: Date.now(),
      });
    }

    if (newCount > 0) {
      this.stats = this._computeStats();
      saveResults(this.store);
      this.emit("update", { newResults: newCount, stats: this.stats });
    }

    return { newResults: newCount, stats: this.stats };
  }

  _computeStats() {
    const results = this.store.matchResults;
    const withPred = results.filter((r) => r.predictedWinner !== null);
    const correct = withPred.filter((r) => r.predictionCorrect);
    const teamWins = {};

    for (const r of results) {
      if (r.actualWinner) {
        teamWins[r.actualWinner] = (teamWins[r.actualWinner] || 0) + 1;
      }
    }

    return {
      totalCompleted: results.length,
      withPrediction: withPred.length,
      correctPredictions: correct.length,
      accuracyPct:
        withPred.length > 0
          ? ((correct.length / withPred.length) * 100).toFixed(1)
          : "N/A",
      teamWins,
      lastUpdated: new Date().toISOString(),
    };
  }

  getResults() {
    try {
      const fresh = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8"));
      if (
        fresh.matchResults &&
        fresh.matchResults.length >= this.store.matchResults.length
      ) {
        this.store = fresh;
        this.processedIds = new Set(
          this.store.matchResults.map((r) => r.cricApiId).filter(Boolean)
        );
        this.stats = this._computeStats();
      }
    } catch {
      /* use cached */
    }
    return this.store.matchResults;
  }

  getStats() {
    this.getResults();
    return this.stats;
  }

  getCachedScores() {
    return this.cachedLiveData || [];
  }

  getPollStatus() {
    return {
      mode: agentStarted ? "polling" : "idle",
      intervalMs: POLL_MS,
      lastProcessTime: this.lastProcessTime,
      status: this.lastProcessStatus,
    };
  }

  async triggerNow() {
    const { predictionDB } = require("../config/db");
    const payload = await liveScoreService.refreshAndPushLiveUpdate(predictionDB, {
      force: true,
    });
    return this.processLiveData(payload);
  }
}

const agent = new LiveMatchAgent();

async function refreshLiveScores() {
  const { predictionDB } = require("../config/db");
  await liveScoreService.refreshAndPushLiveUpdate(predictionDB, { allowApi: true });
}

async function updatePointsTable() {
  const { predictionDB } = require("../config/db");
  const pointsTableService = require("./pointsTableService");
  await pointsTableService.applyQualificationStatus(predictionDB);
}

async function recalculateTop4() {
  const { predictionDB } = require("../config/db");
  const playoffEngine = require("./playoffEngine");
  await playoffEngine.getPlayoffBracket(predictionDB, { emit: false });
}

async function rebuildPlayoffs() {
  const { predictionDB } = require("../config/db");
  const playoffEngine = require("./playoffEngine");
  await playoffEngine.refreshPlayoffsFromLive(predictionDB);
}

async function runAutoPlayoffProgression() {
  const { predictionDB } = require("../config/db");
  const autoPlayoffEngine = require("./autoPlayoffEngine");
  try {
    await autoPlayoffEngine.runAutoPlayoffTick(predictionDB);
  } catch (e) {
    console.warn("[Agent] Auto playoff tick:", e.message);
  }
}

async function runPollTick() {
  try {
    await refreshLiveScores();
    await updatePointsTable();
    await recalculateTop4();
    await rebuildPlayoffs();

    // NOTE: runAutoPlayoffProgression() is intentionally NOT called here.
    // Playoff bracket refresh is event-driven (see initAgent listeners below).
    // Calling it on every 15 s tick caused an infinite broadcast loop.

    const websocketServer = require("./websocketServer");
    websocketServer.broadcast({
      type: "AUTO_REFRESH",
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("[Agent] poll tick error:", err.message);
  }
}

function startPolling() {
  if (pollInterval) return;
  runPollTick();
  pollInterval = setInterval(runPollTick, POLL_MS);
  console.log(`[Agent] polling started ${POLL_MS}ms`);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log("[Agent] polling stopped");
  }
}

async function initAgent() {
  if (agentStarted) {
    console.log("[Agent] already running");
    return agent;
  }
  agentStarted = true;
  console.log("[Agent] starting...");
  await loadPredictions();
  agent._enrichStoredResults();

  // ── Event-driven playoff refresh ───────────────────────────────────────────
  // Bracket is rebuilt ONLY when something real happened, not on every poll tick.
  //
  //  "matchResult"  → fired by processLiveData when a new completed match is
  //                   detected  (≡ MATCH_COMPLETED)
  //  "update"       → fired by processLiveData when newCount > 0, i.e. after
  //                   standings/points changed  (≡ POINTS_UPDATED)
  //
  // autoPlayoffEngine.refreshBracket() has its own hash-dedup, so duplicate
  // calls are silently skipped with "[AutoPlayoff] skipped — no changes".
  agent.on("matchResult", async () => {
    await runAutoPlayoffProgression(); // MATCH_COMPLETED
  });

  agent.on("update", async () => {
    await runAutoPlayoffProgression(); // POINTS_UPDATED
  });
  // ─────────────────────────────────────────────────────────────────────────

  startPolling();
  return agent;
}

agent.stop = stopPolling;
agent.start = initAgent;
agent.init = initAgent;

module.exports = agent;
module.exports.initAgent = initAgent;
