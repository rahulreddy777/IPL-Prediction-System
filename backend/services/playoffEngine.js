/**
 * playoffEngine.js — Playoffs only after remaining league matches (68–70) finish
 */
const { predictionDB } = require("../config/db");
const { getFreshPointsTable } = require("./pointsTableService");
const { getMatchWinner } = require("./matchResultService");
const liveScoreService = require("./liveScoreService");
const { emitOnce } = require("./seasonWebSocket");

const COL_MATCHES = "ipl_matches_2026";

const REMAINING_LEAGUE = [
  { matchId: 68, label: "LSG vs PBKS", team1: "LSG", team2: "PBKS", homeTeam: "LSG", awayTeam: "PBKS" },
  { matchId: 69, label: "MI vs RR", team1: "MI", team2: "RR", homeTeam: "MI", awayTeam: "RR" },
  { matchId: 70, label: "KKR vs DC", team1: "KKR", team2: "DC", homeTeam: "KKR", awayTeam: "DC" },
];

const PLAYOFF_SLOTS = [
  { key: "Q1", matchId: 71, stage: "Qualifier 1" },
  { key: "ELIM", matchId: 72, stage: "Eliminator" },
  { key: "Q2", matchId: 73, stage: "Qualifier 2" },
  { key: "FINAL", matchId: 74, stage: "Final" },
];

let lastBracketHash = null;

function sortPointsTable(table = []) {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return (b.won || 0) - (a.won || 0);
  });
}

function normalizePointsRows(table = []) {
  return sortPointsTable(table).map((row, i) => ({
    team: row.team,
    played: row.played ?? 0,
    won: row.won ?? 0,
    lost: row.lost ?? 0,
    points: row.points ?? 0,
    nrr: row.nrr ?? 0,
    rank: i + 1,
  }));
}

function tbd(team) {
  return team && String(team).toUpperCase() !== "TBD" ? team : "TBD";
}

function cardLabel(team1, team2) {
  return `${tbd(team1)} vs ${tbd(team2)}`;
}

function buildDisabledPlayoffCards() {
  return PLAYOFF_SLOTS.map((slot) => ({
    key: slot.key,
    matchId: slot.matchId,
    stage: slot.stage,
    title: slot.stage,
    homeTeam: "TBD",
    awayTeam: "TBD",
    team1: "TBD",
    team2: "TBD",
    label: "TBD vs TBD",
    winner: null,
    disabled: true,
    locked: true,
    playoff: true,
    liveStatus: "UPCOMING",
  }));
}

/**
 * Remaining league matches 68–70: only complete on verified live/API result (never prediction)
 */
async function getRemainingMatchStatus(conn, matchMeta) {
  const mid = matchMeta.matchId;
  const live = await getMatchWinner(conn, mid);

  if (live.matchStatus === "predicted" || live.source === "prediction") {
    return {
      ...matchMeta,
      complete: false,
      winner: null,
      liveStatus: "UPCOMING",
      source: live.source,
    };
  }

  if (live.matchStatus === "live") {
    return {
      ...matchMeta,
      complete: false,
      winner: null,
      liveStatus: "LIVE",
      source: live.source,
    };
  }

  if (live.matchStatus === "completed" && live.source === "live_score" && live.winnerTeam) {
    return {
      ...matchMeta,
      complete: true,
      winner: live.winnerTeam,
      liveStatus: "FINISHED",
      source: live.source,
    };
  }

  if (live.matchStatus === "no_result" && live.source === "live_score") {
    return {
      ...matchMeta,
      complete: true,
      winner: null,
      liveStatus: "FINISHED",
      source: live.source,
    };
  }

  if (live.matchStatus === "completed" && live.source === "mongodb" && live.winnerTeam) {
    const matchDoc = await conn.collection(COL_MATCHES).findOne({ matchNumber: mid });
    const hasScores = !!(matchDoc?.team1?.score && matchDoc?.team2?.score);
    const isOfficialResult =
      matchDoc?.result && !/AI predicted|model\)/i.test(String(matchDoc.result));
    if (hasScores || isOfficialResult) {
      return {
        ...matchMeta,
        complete: true,
        winner: live.winnerTeam,
        liveStatus: "FINISHED",
        source: "mongodb",
      };
    }

    try {
      const payload = await liveScoreService.getLiveScores(conn);
      const raw = payload.raw || payload.data || [];
      const found = raw.find((m) => {
        const codes = (m.teams || []).map((t) => String(t).toUpperCase().slice(0, 4));
        return codes.includes(matchMeta.team1) && codes.includes(matchMeta.team2);
      });
      if (found && (found.matchEnded || /won\s+by/i.test(String(found.status || "")))) {
        return {
          ...matchMeta,
          complete: true,
          winner: live.winnerTeam,
          liveStatus: "FINISHED",
          source: "mongodb+live_verified",
        };
      }
    } catch {
      /* fall through */
    }
  }

  return {
    ...matchMeta,
    complete: false,
    winner: null,
    liveStatus: "UPCOMING",
    source: live.source || "none",
  };
}

async function getRemainingLeagueStatus(db) {
  const conn = db || predictionDB;
  const results = [];
  for (const m of REMAINING_LEAGUE) {
    results.push(await getRemainingMatchStatus(conn, m));
  }
  const pending = results.filter((r) => !r.complete);
  return {
    remaining: results,
    pending,
    leagueComplete: pending.length === 0,
  };
}

function countRemainingGames(team, pendingList) {
  let games = 0;
  for (const m of pendingList) {
    if (m.team1 === team || m.team2 === team) games += 1;
  }
  return games;
}

/**
 * Confirmed = mathematically safe top-4 slot; contenders = still in the race
 */
function computeQualificationStatus(pointsTable, pendingRemaining) {
  const sorted = normalizePointsRows(pointsTable);
  const pendingTeams = new Set();
  for (const m of pendingRemaining) {
    pendingTeams.add(m.team1);
    pendingTeams.add(m.team2);
  }

  if (pendingRemaining.length === 0) {
    return {
      qualifiedTeams: sorted.slice(0, 4).map((r) => ({ team: r.team, status: "CONFIRMED" })),
      contenders: [],
    };
  }

  const qualifiedTeams = [];
  const contenders = [];
  const seen = new Set();

  const fourth = sorted[3];
  const fifth = sorted[4];
  const fourthPts = fourth?.points ?? 0;

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const team = row.team;
    const minPts = row.points;
    const maxGain = countRemainingGames(team, pendingRemaining) * 2;

    let fifthMaxPts = -1;
    if (fifth) {
      fifthMaxPts = fifth.points + countRemainingGames(fifth.team, pendingRemaining) * 2;
    }

    const mathematicallyTop4 = minPts > fifthMaxPts;
    const inPendingFixture = pendingTeams.has(team);
    const canStillReachTop4 = minPts + maxGain >= fourthPts;

    if (mathematicallyTop4 && !inPendingFixture) {
      qualifiedTeams.push({ team, status: "CONFIRMED" });
      seen.add(team);
    } else if (canStillReachTop4 && (inPendingFixture || i < 6)) {
      contenders.push({ team, status: "PENDING" });
      seen.add(team);
    }
  }

  return { qualifiedTeams, contenders };
}

function generatePlayoffBracketFromTop4(top4, playoffResults = {}) {
  const [top1, top2, top3, top4Team] = top4;
  const { q1 = {}, elim = {}, q2 = {}, finalMatch = {} } = playoffResults;

  let q1Team1 = top1;
  let q1Team2 = top2;
  let elimTeam1 = top3;
  let elimTeam2 = top4Team;
  let q2Team1 = q1.loser || "TBD";
  let q2Team2 = elim.winner || "TBD";
  let finalTeam1 = q1.winner || "TBD";
  let finalTeam2 = q2.winner || "TBD";

  if (q2.team1 && q2.team2) {
    q2Team1 = q2.team1;
    q2Team2 = q2.team2;
  }
  if (finalMatch.team1 && finalMatch.team2) {
    finalTeam1 = finalMatch.team1;
    finalTeam2 = finalMatch.team2;
  }

  const slots = [
    { key: "Q1", matchId: 71, stage: "Qualifier 1", team1: q1Team1, team2: q1Team2 },
    { key: "ELIM", matchId: 72, stage: "Eliminator", team1: elimTeam1, team2: elimTeam2 },
    { key: "Q2", matchId: 73, stage: "Qualifier 2", team1: q2Team1, team2: q2Team2 },
    { key: "FINAL", matchId: 74, stage: "Final", team1: finalTeam1, team2: finalTeam2 },
  ];

  return slots.map((s) => ({
    ...s,
    homeTeam: s.team1,
    awayTeam: s.team2,
    label: cardLabel(s.team1, s.team2),
    title: s.stage,
    disabled: false,
    locked: false,
    playoff: true,
    winner: null,
    liveStatus: "UPCOMING",
  }));
}

async function getPlayoffMatchResult(db, matchId, fallbackTeam1, fallbackTeam2) {
  if (!fallbackTeam1 || !fallbackTeam2 || fallbackTeam1 === "TBD" || fallbackTeam2 === "TBD") {
    return { team1: null, team2: null, winner: null, loser: null, complete: false };
  }

  const conn = db || predictionDB;
  const matchDoc = await conn.collection(COL_MATCHES).findOne({ matchNumber: Number(matchId) });
  const { isOfficialCompleted } = require("./iplMatchesService");

  const team1 = fallbackTeam1;
  const team2 = fallbackTeam2;

  if (isOfficialCompleted(matchDoc)) {
    const winner = matchDoc.winner;
    return {
      team1,
      team2,
      winner,
      loser: winner === team1 ? team2 : team1,
      complete: true,
      liveStatus: "FINISHED",
    };
  }

  return {
    team1,
    team2,
    winner: null,
    loser: null,
    complete: false,
    liveStatus: "UPCOMING",
  };
}

function buildBracketHash(payload) {
  return JSON.stringify({
    leagueComplete: payload.leagueComplete,
    top4: payload.top4,
    pending: payload.remainingLeagueMatches?.filter((m) => m.status !== "FINISHED").map((m) => m.matchId),
    cards: payload.playoffs?.map((c) => `${c.stage}:${c.homeTeam}:${c.awayTeam}:${c.winner}`),
  });
}

async function getPlayoffBracket(db, options = {}) {
  const conn = db || predictionDB;
  if (conn.readyState !== 1) await conn.asPromise();

  const rawTable = await getFreshPointsTable(conn);
  const pointsTable = normalizePointsRows(rawTable);

  const seasonState = await conn.collection("season_state_2026").findOne({ type: "league" });
  let { remaining, pending, leagueComplete } = await getRemainingLeagueStatus(conn);
  if (seasonState?.leagueComplete && seasonState?.playoffsLocked) {
    leagueComplete = true;
    pending = [];
    remaining = remaining.map((r) => ({ ...r, complete: true, liveStatus: "FINISHED" }));
  }
  const { qualifiedTeams, contenders } = computeQualificationStatus(pointsTable, pending);

  const remainingLeagueMatches = remaining.map((r) => ({
    matchId: r.matchId,
    label: r.label,
    homeTeam: r.homeTeam || r.team1,
    awayTeam: r.awayTeam || r.team2,
    status: r.liveStatus,
    complete: r.complete,
    winner: r.winner,
  }));

  let playoffs;
  let top4 = [];
  let cards = [];
  let playoffStatus;
  let message;

  const remainingMatches = remainingLeagueMatches.filter(
    (m) => !m.complete
  );

  if (remainingMatches.length > 0 || !leagueComplete) {
    playoffStatus = {
      isLocked: false,
      playoffsLocked: false,
      message: "Qualification still in progress",
      description: "Remaining league matches can change Top-4 standings",
      subtitle: "Playoff teams not finalized",
    };
    playoffs = buildDisabledPlayoffCards();
    cards = playoffs;
    message = "Qualification still in progress";
  } else {
    top4 =
      seasonState?.top4?.length >= 4
        ? seasonState.top4
        : pointsTable.slice(0, 4).map((r) => r.team);

    const q1Result = await getPlayoffMatchResult(conn, 71, top4[0], top4[1]);
    const elimResult = await getPlayoffMatchResult(conn, 72, top4[2], top4[3]);

    let q2T1 = q1Result.loser;
    let q2T2 = elimResult.winner;
    const q2Result = await getPlayoffMatchResult(conn, 73, q2T1, q2T2);
    const finalResult = await getPlayoffMatchResult(
      conn,
      74,
      q1Result.winner,
      q2Result.winner
    );

    playoffs = generatePlayoffBracketFromTop4(top4, {
      q1: q1Result,
      elim: elimResult,
      q2: q2Result,
      finalMatch: finalResult,
    }).map((card, i) => {
      const res = [q1Result, elimResult, q2Result, finalResult][i];
      return {
        ...card,
        winner: res.winner || null,
        liveStatus: res.complete ? "FINISHED" : "UPCOMING",
      };
    });
    cards = playoffs;

    playoffStatus = {
      isLocked: true,
      playoffsLocked: true,
      message: "Top 4 confirmed",
      subtitle: "Top 4 confirmed",
      description: `Top 4: ${top4.join(", ")}`,
    };
    message = "Top 4 confirmed";
  }

  const payload = {
    success: true,
    leagueComplete,
    playoffStatus,
    remainingLeagueMatches,
    qualifiedTeams,
    contenders,
    top4,
    playoffs,
    cards,
    pointsTable,
    pendingCount: pending.length,
    waitingMessage: leagueComplete ? "Top 4 confirmed" : "Playoff teams not finalized",
    rules: {
      generatePlayoffsOnlyWhen: "remainingLeagueMatches.length===0",
      sortOrder: ["points DESC", "NRR DESC"],
      qualifier1: "top1 vs top2",
      eliminator: "top3 vs top4",
      qualifier2: "loser(Q1) vs winner(Eliminator)",
      final: "winner(Q1) vs winner(Q2)",
    },
    refresh: {
      autoRefresh: true,
      interval: 15000,
      source: "mongodb/liveAPI",
    },
    message,
    updatedAt: Date.now(),
  };

  payload.hash = buildBracketHash(payload);

  if (options.emit && payload.hash !== lastBracketHash) {
    const isUpdate = lastBracketHash !== null;
    lastBracketHash = payload.hash;
    const bracketMsg = payload.leagueComplete
      ? "Top 4 confirmed"
      : isUpdate
        ? "Playoffs updated from live results"
        : payload.playoffStatus.message;
    emitOnce("PLAYOFF_BRACKET_UPDATE", {
      ...payload,
      type: "PLAYOFF_BRACKET_UPDATE",
      message: bracketMsg,
    });
    if (payload.leagueComplete) {
      emitOnce("PLAYOFFS_UPDATED", { ...payload, type: "PLAYOFFS_UPDATED", message: bracketMsg });
    }
  } else if (!options.emit) {
    lastBracketHash = payload.hash;
  }

  return payload;
}

/** Refresh bracket from live/MongoDB — does NOT force-process remaining matches */
async function refreshPlayoffsFromLive(db) {
  return getPlayoffBracket(db || predictionDB, { emit: true });
}

module.exports = {
  REMAINING_LEAGUE,
  PLAYOFF_SLOTS,
  sortPointsTable,
  generatePlayoffBracketFromTop4,
  getPlayoffBracket,
  refreshPlayoffsFromLive,
  computeQualificationStatus,
  getRemainingLeagueStatus,
  buildDisabledPlayoffCards,
};
