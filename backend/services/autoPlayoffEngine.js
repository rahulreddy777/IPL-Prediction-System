/**
 * autoPlayoffEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully automatic playoff progression engine.
 *
 * Official IPL flow:
 *   Qualifier 1  (M71): Top1 vs Top2  → winner → FINAL, loser → Q2
 *   Eliminator   (M72): Top3 vs Top4  → winner → Q2,    loser → eliminated
 *   Qualifier 2  (M73): Loser(Q1) vs Winner(ELIM) → winner → FINAL
 *   Final        (M74): Winner(Q1) vs Winner(Q2)  → Champion
 *
 * Called every 15 s from liveMatchAgent poll tick.
 * Reads live API (via liveScoreService cache) to detect match completion.
 * Writes official results to ipl_matches_2026 and cascades next-stage teams.
 * Emits PLAYOFF_BRACKET_UPDATE websocket event on every change.
 */

const { predictionDB } = require("../config/db");
const liveScoreService = require("./liveScoreService");
const { emitOnce } = require("./seasonWebSocket");
const websocketServer = require("./websocketServer");

const COL = "ipl_matches_2026";
const COL_SEASON = "season_state_2026";
const COL_CHAMPION = "ipl_champion_2026";

const TEAM_MAP = {
  "mumbai indians": "MI",
  "chennai super kings": "CSK",
  "kolkata knight riders": "KKR",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "royal challengers bengaluru": "RCB",
  "royal challengers": "RCB",
  "delhi capitals": "DC",
  "rajasthan royals": "RR",
  "sunrisers hyderabad": "SRH",
  "punjab kings": "PBKS",
  "lucknow super giants": "LSG",
  "gujarat titans": "GT",
};

const TEAM_FULL = {
  RCB: "Royal Challengers Bengaluru",
  GT: "Gujarat Titans",
  SRH: "Sunrisers Hyderabad",
  RR: "Rajasthan Royals",
  MI: "Mumbai Indians",
  CSK: "Chennai Super Kings",
  KKR: "Kolkata Knight Riders",
  DC: "Delhi Capitals",
  PBKS: "Punjab Kings",
  LSG: "Lucknow Super Giants",
  TBD: "TBD",
};

const PLAYOFF_META = {
  71: { label: "Qualifier 1",  stage: "Q1",    matchType: "qualifier1" },
  72: { label: "Eliminator",   stage: "ELIM",  matchType: "eliminator" },
  73: { label: "Qualifier 2",  stage: "Q2",    matchType: "qualifier2" },
  74: { label: "Final",        stage: "FINAL", matchType: "final" },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function toCode(name = "") {
  const upper = String(name).trim().toUpperCase();
  if (Object.values(TEAM_MAP).includes(upper)) return upper;
  const lower = String(name).trim().toLowerCase();
  for (const [key, code] of Object.entries(TEAM_MAP)) {
    if (lower.includes(key)) return code;
  }
  return upper.slice(0, 4) || null;
}

function extractWinnerFromStatus(status = "") {
  const m = String(status).match(/^(.+?)\s+won\s+by/i);
  return m ? toCode(m[1].trim()) : null;
}

function isMatchEnded(m) {
  if (m?.matchEnded) return true;
  const s = String(m?.status || "").toLowerCase();
  return /won\s+by|no\s+result|match\s+tied/i.test(s);
}

function isOfficialCompleted(doc) {
  if (!doc || doc.status !== "completed") return false;
  if (!doc.winner) return false;
  const result = String(doc.result || "");
  if (/AI predicted|model\)|^\(ai/i.test(result)) return false;
  return true;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getConn(db) {
  const conn = db || predictionDB;
  await conn.asPromise();
  return conn;
}

async function getMatchDoc(conn, matchId) {
  return conn.collection(COL).findOne({ matchNumber: Number(matchId) });
}

async function setMatchResult(conn, matchId, team1, team2, winner, source = "live") {
  const loser = winner === team1 ? team2 : team1;
  await conn.collection(COL).updateOne(
    { matchNumber: Number(matchId) },
    {
      $set: {
        matchNumber: Number(matchId),
        status: "completed",
        winner,
        result: `${winner} won (${source})`,
        "team1.code": team1,
        "team2.code": team2,
        "team1.name": TEAM_FULL[team1] || team1,
        "team2.name": TEAM_FULL[team2] || team2,
        matchType: PLAYOFF_META[matchId]?.matchType || "playoff",
        stage: "playoff",
        label: PLAYOFF_META[matchId]?.label || `Match ${matchId}`,
        updatedByAutoEngine: true,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log(`[AutoPlayoff] ✅ M${matchId} ${team1} vs ${team2} → ${winner} (${source})`);
  return { winner, loser, team1, team2 };
}

async function setMatchTeams(conn, matchId, team1, team2) {
  if (!team1 || !team2 || team1 === "TBD" || team2 === "TBD") return;
  const existing = await getMatchDoc(conn, matchId);
  if (isOfficialCompleted(existing)) return; // don't overwrite completed results
  if (existing && existing.team1?.code === team1 && existing.team2?.code === team2) {
    return; // avoid duplicate writes and logs
  }
  await conn.collection(COL).updateOne(
    { matchNumber: Number(matchId) },
    {
      $set: {
        matchNumber: Number(matchId),
        "team1.code": team1,
        "team2.code": team2,
        "team1.name": TEAM_FULL[team1] || team1,
        "team2.name": TEAM_FULL[team2] || team2,
        matchType: PLAYOFF_META[matchId]?.matchType || "playoff",
        stage: "playoff",
        label: PLAYOFF_META[matchId]?.label || `Match ${matchId}`,
        status: "upcoming",
        updatedByAutoEngine: true,
        teamsSetAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log(`[AutoPlayoff] 📋 M${matchId} teams set: ${team1} vs ${team2}`);
}

// ─── read playoff state from DB ───────────────────────────────────────────────

async function getPlayoffState(conn) {
  const [q1, elim, q2, final] = await Promise.all([
    getMatchDoc(conn, 71),
    getMatchDoc(conn, 72),
    getMatchDoc(conn, 73),
    getMatchDoc(conn, 74),
  ]);

  function readMatch(doc, id) {
    const t1 = doc?.team1?.code || null;
    const t2 = doc?.team2?.code || null;
    const complete = isOfficialCompleted(doc);
    const winner = complete ? doc.winner : null;
    const loser = complete && winner ? (winner === t1 ? t2 : t1) : null;
    return { id, doc, team1: t1, team2: t2, winner, loser, complete };
  }

  return {
    q1:   readMatch(q1, 71),
    elim: readMatch(elim, 72),
    q2:   readMatch(q2, 73),
    final: readMatch(final, 74),
  };
}

// ─── get top4 from DB ─────────────────────────────────────────────────────────

async function getTop4(conn) {
  const state = await conn.collection(COL_SEASON).findOne({ type: "league" });
  if (state?.top4?.length >= 4) return state.top4;

  // Fallback: derive from points table
  const { getFreshPointsTable } = require("./pointsTableService");
  const table = await getFreshPointsTable(conn);
  return table.slice(0, 4).map((r) => r.team);
}

// ─── find completed playoff match from live API ───────────────────────────────

function findPlayoffMatchInLive(rawList, team1, team2) {
  if (!Array.isArray(rawList) || !team1 || !team2) return null;
  return rawList.find((m) => {
    const codes = (m.teams || []).map((t) => toCode(t)).filter(Boolean);
    return (
      (codes.includes(team1) && codes.includes(team2)) ||
      (codes.includes(team1) || codes.includes(team2)) // partial match for TBD
    );
  });
}

// ─── store champion ───────────────────────────────────────────────────────────

async function storeChampion(conn, { winner, loser, matchId }) {
  const existing = await conn.collection(COL_CHAMPION).findOne({ season: 2026 });
  if (existing?.championTeam) return existing; // already stored

  const doc = {
    championTeam: winner,
    runnerUp: loser,
    finalMatchId: matchId,
    season: 2026,
    declaredAt: new Date().toISOString(),
    source: "auto_playoff_engine",
  };
  await conn.collection(COL_CHAMPION).deleteMany({ season: 2026 });
  await conn.collection(COL_CHAMPION).insertOne(doc);

  await conn.collection(COL_SEASON).updateOne(
    { type: "season" },
    {
      $set: {
        status: "complete",
        champion: winner,
        runnerUp: loser,
        completedAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(`[AutoPlayoff] 🏆 Champion: ${winner} | Runner-up: ${loser}`);
  return doc;
}

// ─── main engine tick ─────────────────────────────────────────────────────────

let lastBracketHash = null;
let _tickRunning = false; // singleton guard — prevents duplicate concurrent runs
let playoffStarted = false;

/**
 * Hash only the meaningful, stable parts of the bracket (no timestamps).
 * This ensures the dedup check actually works — buildBracketPayload includes
 * updatedAt: Date.now() which would make every JSON comparison fail.
 */
function bracketHash(bracket) {
  return JSON.stringify({
    top4: bracket.top4,
    flow: bracket.flow,
    cards: (bracket.cards || []).map((c) => ({
      matchId: c.matchId,
      team1:   c.team1,
      team2:   c.team2,
      winner:  c.winner,
      complete: c.complete,
    })),
  });
}

async function initPlayoffs(db) {
  if (playoffStarted) {
    console.log("[AutoPlayoff] already initialized");
    return;
  }
  const conn = await getConn(db);
  const top4 = await getTop4(conn);
  if (!top4 || top4.length < 4) {
    console.log("[AutoPlayoff] Top 4 not ready yet for initialization");
    return;
  }
  playoffStarted = true;
  console.log("[AutoPlayoff] started");

  const [top1, top2, top3, top4Team] = top4;
  await setMatchTeams(conn, 71, top1, top2);
  await setMatchTeams(conn, 72, top3, top4Team);

  const fresh = await getPlayoffState(conn);
  const bracket = buildBracketPayload(top4, fresh);
  lastBracketHash = bracketHash(bracket);

  const broadcastPayload = {
    ...bracket,
    timestamp: Date.now(),
    message: "Playoff bracket initialized",
  };
  const sentInit = websocketServer.broadcast({ type: "PLAYOFF_BRACKET_UPDATE", ...broadcastPayload });
  websocketServer.broadcast({ type: "PLAYOFFS_UPDATED", ...broadcastPayload });
  console.log(`[AutoPlayoff] updated → ${sentInit} clients`);
}

async function runAutoPlayoffTick(db) {
  // Prevent overlapping concurrent calls (e.g. liveMatchAgent + manual trigger)
  if (_tickRunning) {
    console.log("[AutoPlayoff] already initialized — skipping concurrent tick");
    return { skipped: true, reason: "already_running" };
  }
  _tickRunning = true;
  try {
    return await _doTick(db);
  } finally {
    _tickRunning = false;
  }
}

async function _doTick(db) {
  const conn = await getConn(db);

  // 1. Get current playoff state
  const state = await getPlayoffState(conn);
  const top4 = await getTop4(conn);

  if (!top4 || top4.length < 4) {
    playoffStarted = false; // Reset on season reset or if top4 not ready
    return { skipped: true, reason: "top4_not_ready" };
  }

  // Auto-initialize if top 4 is ready and not started yet
  if (!playoffStarted) {
    await initPlayoffs(db);
  }

  // Re-read after possible team update
  const fresh = await getPlayoffState(conn);

  // 3. Fetch live data
  let raw = [];
  try {
    const payload = await liveScoreService.getLiveScores(conn, { silent: true });
    raw = payload.raw || payload.data || [];
  } catch (e) {
    console.warn("[AutoPlayoff] Live data fetch failed:", e.message);
  }

  let changed = false;

  // 4. Process Q1 (M71)
  if (!fresh.q1.complete && fresh.q1.team1 && fresh.q1.team2) {
    const liveM = findPlayoffMatchInLive(raw, fresh.q1.team1, fresh.q1.team2);
    if (liveM && isMatchEnded(liveM)) {
      const winner = extractWinnerFromStatus(liveM.status);
      if (winner && (winner === fresh.q1.team1 || winner === fresh.q1.team2)) {
        await setMatchResult(conn, 71, fresh.q1.team1, fresh.q1.team2, winner, "cricapi");
        fresh.q1.winner = winner;
        fresh.q1.loser = winner === fresh.q1.team1 ? fresh.q1.team2 : fresh.q1.team1;
        fresh.q1.complete = true;
        changed = true;
      }
    }
    // Also check MongoDB for manual/imported result
    const q1Doc = await getMatchDoc(conn, 71);
    if (isOfficialCompleted(q1Doc) && !fresh.q1.complete) {
      fresh.q1.winner = q1Doc.winner;
      fresh.q1.loser = fresh.q1.winner === fresh.q1.team1 ? fresh.q1.team2 : fresh.q1.team1;
      fresh.q1.complete = true;
      changed = true;
    }
  }

  // 5. Process ELIM (M72)
  if (!fresh.elim.complete && fresh.elim.team1 && fresh.elim.team2) {
    const liveM = findPlayoffMatchInLive(raw, fresh.elim.team1, fresh.elim.team2);
    if (liveM && isMatchEnded(liveM)) {
      const winner = extractWinnerFromStatus(liveM.status);
      if (winner && (winner === fresh.elim.team1 || winner === fresh.elim.team2)) {
        await setMatchResult(conn, 72, fresh.elim.team1, fresh.elim.team2, winner, "cricapi");
        fresh.elim.winner = winner;
        fresh.elim.loser = winner === fresh.elim.team1 ? fresh.elim.team2 : fresh.elim.team1;
        fresh.elim.complete = true;
        changed = true;
      }
    }
    const elimDoc = await getMatchDoc(conn, 72);
    if (isOfficialCompleted(elimDoc) && !fresh.elim.complete) {
      fresh.elim.winner = elimDoc.winner;
      fresh.elim.loser = fresh.elim.winner === fresh.elim.team1 ? fresh.elim.team2 : fresh.elim.team1;
      fresh.elim.complete = true;
      changed = true;
    }
  }

  // 6. Once Q1 AND ELIM are both complete → set Q2 teams
  if (fresh.q1.complete && fresh.elim.complete) {
    const q2T1 = fresh.q1.loser;
    const q2T2 = fresh.elim.winner;
    if (q2T1 && q2T2) {
      await setMatchTeams(conn, 73, q2T1, q2T2);
      const freshQ2 = await getMatchDoc(conn, 73);
      fresh.q2.team1 = freshQ2?.team1?.code || q2T1;
      fresh.q2.team2 = freshQ2?.team2?.code || q2T2;
    }
  }

  // 7. Process Q2 (M73)
  if (!fresh.q2.complete && fresh.q2.team1 && fresh.q2.team2 &&
      fresh.q2.team1 !== "TBD" && fresh.q2.team2 !== "TBD") {
    const liveM = findPlayoffMatchInLive(raw, fresh.q2.team1, fresh.q2.team2);
    if (liveM && isMatchEnded(liveM)) {
      const winner = extractWinnerFromStatus(liveM.status);
      if (winner && (winner === fresh.q2.team1 || winner === fresh.q2.team2)) {
        await setMatchResult(conn, 73, fresh.q2.team1, fresh.q2.team2, winner, "cricapi");
        fresh.q2.winner = winner;
        fresh.q2.loser = winner === fresh.q2.team1 ? fresh.q2.team2 : fresh.q2.team1;
        fresh.q2.complete = true;
        changed = true;
      }
    }
    const q2Doc = await getMatchDoc(conn, 73);
    if (isOfficialCompleted(q2Doc) && !fresh.q2.complete) {
      fresh.q2.winner = q2Doc.winner;
      fresh.q2.loser = fresh.q2.winner === fresh.q2.team1 ? fresh.q2.team2 : fresh.q2.team1;
      fresh.q2.complete = true;
      changed = true;
    }
  }

  // 8. Once Q1 AND Q2 complete → set FINAL teams
  if (fresh.q1.complete && fresh.q2.complete) {
    const finalT1 = fresh.q1.winner;
    const finalT2 = fresh.q2.winner;
    if (finalT1 && finalT2) {
      await setMatchTeams(conn, 74, finalT1, finalT2);
      const freshFinal = await getMatchDoc(conn, 74);
      fresh.final.team1 = freshFinal?.team1?.code || finalT1;
      fresh.final.team2 = freshFinal?.team2?.code || finalT2;
    }
  }

  // 9. Process FINAL (M74)
  if (!fresh.final.complete && fresh.final.team1 && fresh.final.team2 &&
      fresh.final.team1 !== "TBD" && fresh.final.team2 !== "TBD") {
    const liveM = findPlayoffMatchInLive(raw, fresh.final.team1, fresh.final.team2);
    if (liveM && isMatchEnded(liveM)) {
      const winner = extractWinnerFromStatus(liveM.status);
      if (winner && (winner === fresh.final.team1 || winner === fresh.final.team2)) {
        await setMatchResult(conn, 74, fresh.final.team1, fresh.final.team2, winner, "cricapi");
        fresh.final.winner = winner;
        fresh.final.loser = winner === fresh.final.team1 ? fresh.final.team2 : fresh.final.team1;
        fresh.final.complete = true;
        changed = true;

        // 10. Store champion after final
        await storeChampion(conn, {
          winner: fresh.final.winner,
          loser: fresh.final.loser,
          matchId: 74,
        });

        emitOnce("FINAL_UPDATE", {
          type: "FINAL_UPDATE",
          champion: fresh.final.winner,
          runnerUp: fresh.final.loser,
          finalMatchId: 74,
          season: 2026,
        });
      }
    }
    const finalDoc = await getMatchDoc(conn, 74);
    if (isOfficialCompleted(finalDoc) && !fresh.final.complete) {
      fresh.final.winner = finalDoc.winner;
      fresh.final.loser = fresh.final.winner === fresh.final.team1 ? fresh.final.team2 : fresh.final.team1;
      fresh.final.complete = true;
      changed = true;
      // Store champion if not done
      await storeChampion(conn, {
        winner: fresh.final.winner,
        loser: fresh.final.loser,
        matchId: 74,
      });
    }
  }

  // 11. Build bracket payload for WebSocket and API
  const bracket = buildBracketPayload(top4, fresh);

  // 12. Hash-based dedup — compare only stable, meaningful fields (NOT updatedAt/timestamp
  //     which change every call and would make the old JSON check always fire).
  const currentHash = bracketHash(bracket);
  if (currentHash === lastBracketHash) {
    console.log("[AutoPlayoff] skipped — no changes");
    return { changed: false, bracket };
  }
  lastBracketHash = currentHash;

  const broadcastPayload = {
    ...bracket,
    timestamp: Date.now(),
    message: changed ? "Playoff bracket updated from live result" : "Playoff bracket synced",
  };

  const sentBracket = websocketServer.broadcast({ type: "PLAYOFF_BRACKET_UPDATE", ...broadcastPayload });
  websocketServer.broadcast({ type: "PLAYOFFS_UPDATED", ...broadcastPayload });
  console.log(`[AutoPlayoff] updated → ${sentBracket} clients`);

  return { changed, bracket };
}

// ─── bracket payload builder ──────────────────────────────────────────────────

function matchCard(id, team1, team2, winner, complete) {
  const loser = complete && winner ? (winner === team1 ? team2 : team1) : null;
  return {
    matchId: id,
    stage: PLAYOFF_META[id]?.stage || id,
    label: PLAYOFF_META[id]?.label || `M${id}`,
    team1: team1 || "TBD",
    team2: team2 || "TBD",
    homeTeam: team1 || "TBD",
    awayTeam: team2 || "TBD",
    winner: winner || null,
    loser: loser,
    complete: !!complete,
    liveStatus: complete ? "FINISHED" : "UPCOMING",
    disabled: !team1 || !team2 || team1 === "TBD" || team2 === "TBD",
  };
}

function buildBracketPayload(top4, state) {
  const [top1, top2, top3, top4Team] = top4;

  const cards = [
    matchCard(71, state.q1.team1 || top1, state.q1.team2 || top2, state.q1.winner, state.q1.complete),
    matchCard(72, state.elim.team1 || top3, state.elim.team2 || top4Team, state.elim.winner, state.elim.complete),
    matchCard(73, state.q2.team1, state.q2.team2, state.q2.winner, state.q2.complete),
    matchCard(74, state.final.team1, state.final.team2, state.final.winner, state.final.complete),
  ];

  let champion = null;
  if (state.final.complete && state.final.winner) {
    champion = { championTeam: state.final.winner, runnerUp: state.final.loser };
  }

  return {
    success: true,
    top4,
    leagueComplete: true,
    playoffs: cards,
    cards,
    champion,
    flow: {
      q1: { winner: state.q1.winner, loser: state.q1.loser, complete: state.q1.complete },
      elim: { winner: state.elim.winner, loser: state.elim.loser, complete: state.elim.complete },
      q2: { winner: state.q2.winner, loser: state.q2.loser, complete: state.q2.complete },
      final: { winner: state.final.winner, loser: state.final.loser, complete: state.final.complete },
    },
    rules: {
      qualifier1: "Top1 vs Top2 → winner→FINAL, loser→Q2",
      eliminator: "Top3 vs Top4 → winner→Q2, loser→eliminated",
      qualifier2: "Loser(Q1) vs Winner(ELIM) → winner→FINAL",
      final: "Winner(Q1) vs Winner(Q2) → Champion",
    },
    updatedAt: Date.now(),
    source: "auto_playoff_engine",
  };
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Get current bracket state (read-only, no progression logic)
 */
async function getAutoPlayoffBracket(db) {
  const conn = await getConn(db);
  const state = await getPlayoffState(conn);
  const top4 = await getTop4(conn);
  if (!top4 || top4.length < 4) {
    return { success: false, error: "top4 not ready", playoffs: [], cards: [] };
  }
  return buildBracketPayload(top4, state);
}

/**
 * refreshBracket — event-driven entry point.
 * Call this on MATCH_COMPLETED / POINTS_UPDATED / PLAYOFF_RESULT_UPDATED.
 * The internal hash dedup will silently skip if nothing changed.
 */
async function refreshBracket(db) {
  return runAutoPlayoffTick(db);
}

module.exports = {
  runAutoPlayoffTick,
  refreshBracket,
  getAutoPlayoffBracket,
  buildBracketPayload,
  getPlayoffState,
  getTop4,
  initPlayoffs,
};
