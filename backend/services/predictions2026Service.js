/**
 * predictions2026Service.js — Per-match predictions + live result correction
 * League 1–67 · Remaining 68–70 · Playoffs Q1 / ELIM / Q2 / FINAL
 */
const SCHEDULE = require("../data/ipl_2026_matches_schedule.json");
const PANEL = require("../data/predictions_2026_panel.json");
const { predictionDB } = require("../config/db");
const { predictMatchFrom2026Stats } = require("./seasonPredictionEngine");
const { getMatchWinner, processMatchFromLive } = require("./matchResultService");
const { pushWinPredictionUpdate } = require("./winProbabilityStream");
const { getPlayoffBracket, refreshPlayoffsFromLive } = require("./playoffEngine");

const COL_MATCHES = "ipl_matches_2026";
const COL_CORRECTIONS = "predictions_2026_corrections";

const TEAM_CODES = {
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "gujarat titans": "GT",
  "sunrisers hyderabad": "SRH",
  "rajasthan royals": "RR",
  "lucknow super giants": "LSG",
  "punjab kings": "PBKS",
  "mumbai indians": "MI",
  "kolkata knight riders": "KKR",
  "delhi capitals": "DC",
  "chennai super kings": "CSK",
};

function toTeamCode(name = "") {
  const n = String(name).trim();
  if (!n || n.toUpperCase() === "TBC") return null;
  const up = n.toUpperCase();
  if (up.length <= 4 && /^[A-Z]+$/.test(up)) return up;
  const key = n.toLowerCase();
  if (TEAM_CODES[key]) return TEAM_CODES[key];
  return up.slice(0, 3);
}

function resolveMatchNumber(id) {
  const raw = String(id).trim().toUpperCase();
  const num = Number(raw);
  if (Number.isFinite(num) && num >= 1 && num <= 74) return num;
  const map = PANEL.playoffKeys || { Q1: 71, ELIM: 72, Q2: 73, FINAL: 74 };
  return map[raw] ?? null;
}

function buttonLabel(matchup = "", playoff = false, override = null) {
  if (override?.label) return override.label;
  if (!playoff) return String(matchup).trim();
  const m = String(matchup);
  if (/^final\b/i.test(m) || /\bfinal\b/i.test(m.split("·")[0])) return "Final";
  if (/qualifier\s*2/i.test(m)) return "Qualifier 2";
  if (/qualifier\s*1/i.test(m)) return "Qualifier 1";
  if (/eliminator/i.test(m)) return "Eliminator";
  return m.split("·")[0].trim();
}

function parseTeams(matchup = "", override = null) {
  if (override?.team1 && override?.team2) {
    return [override.team1, override.team2].filter(Boolean);
  }
  const clean = String(matchup).replace(/qualifier|eliminator|final|·.*/gi, "").trim();
  const parts = clean.split(/\s+vs\s+/i).map((t) => toTeamCode(t.trim())).filter(Boolean);
  return parts;
}

function getOverride(matchNum) {
  return PANEL.matchOverrides?.[String(matchNum)] || PANEL.matchOverrides?.[matchNum] || null;
}

function deriveLiveStatus(isComplete, liveStatus, overrideStatus) {
  if (isComplete) return "FINISHED";
  if (overrideStatus) return String(overrideStatus).toUpperCase();
  const s = String(liveStatus || "").toLowerCase();
  if (s === "live" || s === "in_progress" || s === "started") return "LIVE";
  if (s === "completed" || s === "finished") return "FINISHED";
  return "UPCOMING";
}

function buildMatchEntry(schedRow) {
  const matchNum = schedRow.Match;
  const override = getOverride(matchNum);
  const playoff = !!schedRow.Playoff || !!override?.playoff;
  const teams = parseTeams(schedRow.Matchup, override);
  const team1 = teams[0] || null;
  const team2 = teams[1] || null;

  let label = buttonLabel(schedRow.Matchup, playoff, override);
  if (team1 && team2 && !playoff) label = `${team1} vs ${team2}`;
  if (playoff && team1 && team2 && override?.label) label = override.label;

  return {
    matchId: matchNum,
    key: override?.key || String(matchNum),
    label,
    matchup: schedRow.Matchup,
    venue: schedRow.Venue,
    date: schedRow.Date,
    playoff,
    stage: override?.stage || (playoff ? buttonLabel(schedRow.Matchup, true, override) : "League"),
    team1,
    team2,
    homeTeam: override?.homeTeam || null,
    awayTeam: override?.awayTeam || null,
    cricapiMatchId: override?.matchId || null,
    predictedWinner: override?.predictedWinner || null,
    prediction: override?.prediction ?? null,
    confidence: override?.confidence || null,
    liveStatus: override?.liveStatus || "UPCOMING",
  };
}

function getAllMatchesList() {
  return SCHEDULE.map(buildMatchEntry);
}

function getPanelConfig() {
  return {
    sectionTitle: PANEL.sectionTitle,
    refreshInterval: PANEL.refreshInterval,
    cacheDuration: PANEL.cacheDuration,
    settings: PANEL.settings,
    filters: PANEL.filters,
  };
}

function getMatchesBoard() {
  const all = getAllMatchesList();
  const league = all.filter((m) => !m.playoff && m.matchId >= 1 && m.matchId <= 67);
  const remaining = all.filter((m) => !m.playoff && m.matchId >= 68 && m.matchId <= 70);
  return { league, remaining, playoffs: [], all };
}

async function getMatchesBoardAsync(db, options = {}) {
  const { league, remaining } = getMatchesBoard();
  const bracket = await getPlayoffBracket(db || predictionDB, {
    emit: options.emitPlayoffs === true,
  });
  return {
    league,
    remaining,
    playoffs: bracket.cards,
    playoffBracket: bracket,
    all: [...league, ...remaining, ...bracket.cards],
  };
}

async function getMatchDoc(db, matchId) {
  const conn = db || predictionDB;
  if (conn.readyState !== 1) await conn.asPromise();
  return conn.collection(COL_MATCHES).findOne({ matchNumber: Number(matchId) });
}

async function getMatchPredictionBundle(matchId) {
  const mid = resolveMatchNumber(matchId);
  if (!mid) throw new Error(`Unknown match id: ${matchId}`);

  const sched = SCHEDULE.find((s) => s.Match === mid);
  const override = getOverride(mid);
  const matchDoc = await getMatchDoc(null, mid);

  let playoffCard = null;
  if (mid >= 71) {
    const bracket = await getPlayoffBracket(predictionDB);
    const list = bracket.playoffs || bracket.cards || [];
    playoffCard = list.find((c) => c.matchId === mid);
    if (!bracket.leagueComplete) {
      return {
        matchId: mid,
        key: playoffCard?.key || String(mid),
        label: playoffCard?.label || "TBD vs TBD",
        stage: playoffCard?.stage || "Playoff",
        team1: null,
        team2: null,
        venue: sched?.Venue || "",
        prediction: {
          predictedWinner: null,
          keyFactors: ["Playoff teams not finalized — complete remaining league matches first"],
        },
        live: { matchStatus: "upcoming" },
        predictedWinner: null,
        actualWinner: null,
        isComplete: false,
        isWrong: false,
        liveStatus: "UPCOMING",
        leagueLocked: false,
      };
    }
  }
  const correction = await predictionDB
    .collection(COL_CORRECTIONS)
    .findOne({ matchId: mid })
    .catch(() => null);

  const pc1 = playoffCard?.team1 && playoffCard.team1 !== "TBD" ? playoffCard.team1 : null;
  const pc2 = playoffCard?.team2 && playoffCard.team2 !== "TBD" ? playoffCard.team2 : null;
  let team1 = override?.team1 || pc1 || matchDoc?.team1?.code || parseTeams(sched?.Matchup || "", override)[0];
  let team2 = override?.team2 || pc2 || matchDoc?.team2?.code || parseTeams(sched?.Matchup || "", override)[1];
  const venue = matchDoc?.venue || sched?.Venue || "";

  let prediction = null;
  if (team1 && team2) {
    prediction = await predictMatchFrom2026Stats(team1, team2, venue);
  } else {
    prediction = {
      predictedWinner: null,
      team1Probability: null,
      team2Probability: null,
      winProbability: {},
      keyFactors: ["Teams TBC — prediction after playoff results"],
      confidence: null,
    };
  }

  if (override?.predictedWinner) {
    const pick = toTeamCode(override.predictedWinner) || override.predictedWinner;
    const pct = override.prediction ?? 50;
    const other = 100 - pct;
    prediction.predictedWinner = pick;
    prediction.confidence = override.confidence;
    if (team1 && team2) {
      prediction.team1Probability = pick === team1 ? pct : other;
      prediction.team2Probability = pick === team2 ? pct : other;
      prediction.winProbability = {
        [team1]: prediction.team1Probability,
        [team2]: prediction.team2Probability,
      };
    }
  }

  if (correction?.predictedWinner) {
    prediction = { ...prediction, ...correction.prediction, corrected: true, aiUpdated: true };
  }

  const live = team1 && team2 ? await getMatchWinner(null, mid) : { matchStatus: "upcoming", source: null };

function deriveWinner(match) {
  if (!match) return null;
  if (match.winner) return match.winner;
  const result = match.result || "";
  const map = {
    "Royal Challengers": "RCB",
    "Punjab Kings": "PBKS",
    "Sunrisers": "SRH",
    "Kolkata": "KKR",
    "Rajasthan": "RR",
    "Gujarat": "GT",
    "Chennai": "CSK",
    "Mumbai": "MI",
    "Lucknow": "LSG",
    "Delhi": "DC"
  };
  for (const key in map) {
    if (result.includes(key)) {
      return map[key];
    }
  }
  return null;
}

  const predictedWinner =
    correction?.predictedWinner ||
    prediction.predictedWinner ||
    (override?.predictedWinner ? toTeamCode(override.predictedWinner) : null);

  const derivedWinner = deriveWinner(matchDoc);
  const actualWinner =
    live.winnerTeam ||
    (derivedWinner ? String(derivedWinner).toUpperCase() : null) ||
    (matchDoc?.winner ? String(matchDoc.winner).toUpperCase() : null) ||
    (matchDoc?.correctedWinner ? String(matchDoc.correctedWinner).toUpperCase() : null);

  const isComplete =
    live.matchStatus === "completed" ||
    live.matchStatus === "no_result" ||
    matchDoc?.status === "completed";

  const liveStatus = deriveLiveStatus(isComplete, live.matchStatus, override?.liveStatus);

  const isWrong =
    isComplete &&
    actualWinner &&
    predictedWinner &&
    actualWinner !== predictedWinner;

  const predictionAccuracy =
    predictedWinner && actualWinner
      ? predictedWinner === actualWinner
        ? "correct"
        : "wrong"
      : null;

  const entry = buildMatchEntry(sched || { Match: mid, Matchup: "", Venue: "", Date: "" });

  return {
    matchId: mid,
    key: playoffCard?.key || entry.key,
    label: playoffCard?.label || entry.label,
    stage: playoffCard?.stage || entry.stage,
    team1,
    team2,
    homeTeam: entry.homeTeam,
    awayTeam: entry.awayTeam,
    venue,
    prediction,
    live,
    predictedWinner,
    actualWinner,
    predictionPct: override?.prediction ?? prediction.team1Probability,
    confidence: override?.confidence || prediction.confidence,
    isComplete,
    isWrong,
    liveStatus,
    predictionAccuracy,
    aiUpdated: !!correction?.aiUpdated || !!matchDoc?.correctedAt,
    showAIUpdatedBadge: PANEL.settings?.showAIUpdatedBadge && (!!correction || !!matchDoc?.correctedAt),
    matchStatus: live.matchStatus || matchDoc?.status || "upcoming",
    dbResult: matchDoc?.result || null,
    cricapiMatchId: entry.cricapiMatchId,
  };
}

/**
 * Refresh all match statuses from live cache (lightweight board update)
 */
async function getMatchesBoardWithLive() {
  const { league, remaining, playoffs, all } = await getMatchesBoardAsync(predictionDB);

  const toEnrich = [...remaining, ...league.filter((m) => m.matchId >= 60)];
  const enrichedMap = new Map();

  await Promise.all(
    toEnrich.map(async (m) => {
      try {
        const bundle = await getMatchPredictionBundle(m.matchId);
        enrichedMap.set(m.matchId, {
          ...m,
          predictedWinner: bundle.predictedWinner,
          prediction: bundle.predictionPct,
          confidence: bundle.confidence,
          liveStatus: bundle.liveStatus,
          actualWinner: bundle.actualWinner,
          isWrong: bundle.isWrong,
          predictionAccuracy: bundle.predictionAccuracy,
          aiUpdated: bundle.aiUpdated,
        });
      } catch {
        enrichedMap.set(m.matchId, m);
      }
    })
  );

  const merge = (list) => list.map((m) => enrichedMap.get(m.matchId) || m);
  const bracket = await getPlayoffBracket(predictionDB);

  return {
    config: getPanelConfig(),
    league: merge(league),
    remaining: merge(remaining),
    playoffs,
    playoffBracket: bracket,
    total: all.length,
  };
}

async function syncPredictionFromLive(matchId, options = {}) {
  const mid = resolveMatchNumber(matchId);
  const bundle = await getMatchPredictionBundle(mid);

  if (!bundle.isComplete && !options.force) {
    return {
      success: false,
      error: "Match not completed yet — no live winner available",
      bundle,
    };
  }

  const winner = bundle.actualWinner || options.winner;
  if (!winner) {
    return { success: false, error: "Could not resolve live winner", bundle };
  }

  const sched = SCHEDULE.find((s) => s.Match === mid);
  const loser = winner === bundle.team1 ? bundle.team2 : bundle.team1;

  let processResult = { skipped: true };
  if (bundle.team1 && bundle.team2) {
    processResult = await processMatchFromLive(predictionDB, mid, {
      force: options.force || bundle.isWrong,
      winner,
      playoff: !!sched?.Playoff || mid >= 71,
      updatePoints: !sched?.Playoff && mid <= 70,
      allowPredicted: false,
      winnerInfo: {
        matchId: mid,
        team1: bundle.team1,
        team2: bundle.team2,
        winnerTeam: winner,
        loserTeam: loser,
        matchStatus: "completed",
        source: "live_api_correction",
      },
    });
  }

  const correctedPrediction = {
    ...bundle.prediction,
    predictedWinner: winner,
    team1Probability: winner === bundle.team1 ? 100 : bundle.team2 ? 0 : 100,
    team2Probability: winner === bundle.team2 ? 100 : bundle.team1 ? 0 : 100,
    winProbability: bundle.team1
      ? {
          [bundle.team1]: winner === bundle.team1 ? 100 : 0,
          [bundle.team2]: winner === bundle.team2 ? 100 : 0,
        }
      : {},
    corrected: true,
    source: "live_api",
    aiUpdated: true,
  };

  await predictionDB.collection(COL_MATCHES).updateOne(
    { matchNumber: mid },
    {
      $set: {
        correctedWinner: winner,
        correctedFrom: bundle.predictedWinner,
        predictionWasWrong: bundle.isWrong,
        correctedAt: new Date(),
        mlPredictedWinner: bundle.predictedWinner,
      },
    },
    { upsert: true }
  );

  await predictionDB.collection(COL_CORRECTIONS).updateOne(
    { matchId: mid },
    {
      $set: {
        matchId: mid,
        predictedWinner: winner,
        prediction: correctedPrediction,
        aiUpdated: true,
        updatedAt: new Date(),
        previousPick: bundle.predictedWinner,
      },
    },
    { upsert: true }
  );

  try {
    if (bundle.team1 && bundle.team2) {
      await pushWinPredictionUpdate(predictionDB, mid);
    }
  } catch {
    /* optional */
  }

  const updated = await getMatchPredictionBundle(mid);

  return {
    success: true,
    corrected: true,
    previousPick: bundle.predictedWinner,
    liveWinner: winner,
    processResult,
    bundle: updated,
    prediction: correctedPrediction,
  };
}

module.exports = {
  getPanelConfig,
  getAllMatchesList,
  getMatchesBoard,
  getMatchesBoardAsync,
  getMatchesBoardWithLive,
  getMatchPredictionBundle,
  syncPredictionFromLive,
  resolveMatchNumber,
  buttonLabel,
};
