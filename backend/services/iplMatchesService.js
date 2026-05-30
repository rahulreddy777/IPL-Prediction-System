/**
 * iplMatchesService.js — IPL 2026 complete pipeline (league 1–70 + playoffs 71–74)
 *
 * MongoDB ipl_matches_2026 stores a single tournament document:
 *   { tournament, league_stage_matches: [...69], playoffs: [...4] }
 *
 * Individual per-match documents (upserted by ensurePlayoffMatches) are also
 * supported and take priority when present (so live playoff results are respected).
 */
const SCHEDULE = require("../data/ipl_2026_matches_schedule.json");
const { predictionDB } = require("../config/db");
const { getFreshPointsTable } = require("./pointsTableService");
const { emitOnce } = require("./seasonWebSocket");

const COL = "ipl_matches_2026";

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

// ── Reverse lookup: full team name → short code ───────────────────────────────
const NAME_TO_CODE = Object.fromEntries(
  Object.entries(TEAM_FULL).map(([code, name]) => [name.toLowerCase(), code])
);
// Extra aliases to handle slight spelling variations in the DB
NAME_TO_CODE["royal challengers bangalore"] = "RCB";
NAME_TO_CODE["bengaluru"] = "RCB";

/** Convert a full team name (or TBC/TBD) to its 2–4 char short code. */
function nameToCode(fullName) {
  if (!fullName) return "TBD";
  const s = String(fullName).trim();
  if (s === "TBC" || s === "TBD" || s === "") return "TBD";
  const lower = s.toLowerCase();
  if (NAME_TO_CODE[lower]) return NAME_TO_CODE[lower];
  // Partial / substring match
  for (const [name, code] of Object.entries(NAME_TO_CODE)) {
    if (lower.includes(name) || name.includes(lower)) return code;
  }
  return s.slice(0, 4).toUpperCase();
}

/** Extract winner short code from a result string like "RCB won by 6 wkts". */
function parseWinnerFromResult(result, t1Code, t2Code) {
  if (!result) return null;
  const m = String(result).match(/^(.+?)\s+won\s+by/i);
  if (!m) return null;
  return nameToCode(m[1].trim());
}

/**
 * Primary data loader — hybrid approach:
 *   1. Reads individual match documents (matchNumber field present).
 *   2. Also reads the tournament document (with embedded arrays) and fills
 *      any gaps left by step 1.
 * Individual docs always take priority (live results, upserted by ensurePlayoffMatches).
 */
async function fetchLeagueAndPlayoffDocs(conn) {
  // Step 1 — individual per-match documents (old format / upserted playoffs)
  const individualDocs = await conn
    .collection(COL)
    .find({ matchNumber: { $exists: true } })
    .toArray();
  const byNum = new Map(individualDocs.map((d) => [d.matchNumber, d]));

  // Step 2 — single tournament document (new embedded format)
  const tournamentDoc = await conn
    .collection(COL)
    .findOne({ tournament: { $exists: true } });

  if (tournamentDoc) {
    // ── League stage matches ────────────────────────────────────────────────
    const leagueMatches = Array.isArray(tournamentDoc.league_stage_matches)
      ? tournamentDoc.league_stage_matches
      : [];

    for (const m of leagueMatches) {
      const mn = m.match_number;
      if (!mn || byNum.has(mn)) continue; // individual doc takes priority

      const t1Code = nameToCode(m.team_1);
      const t2Code = nameToCode(m.team_2);
      const winnerCode = parseWinnerFromResult(m.result, t1Code, t2Code);

      byNum.set(mn, {
        matchNumber: mn,
        status: winnerCode ? "completed" : "upcoming",
        team1: {
          short: t1Code,
          code: t1Code,
          name: m.team_1 || t1Code,
          score: m.score_team_1 || null,
        },
        team2: {
          short: t2Code,
          code: t2Code,
          name: m.team_2 || t2Code,
          score: m.score_team_2 || null,
        },
        venue: m.venue || null,
        dateISO: m.date || null,
        date: m.date || null,
        result: m.result || null,
        winner: winnerCode,
      });
    }

    // ── Playoff matches ─────────────────────────────────────────────────────
    const STAGE_TO_NUM = {
      "qualifier 1": 71,
      "eliminator": 72,
      "qualifier 2": 73,
      "final": 74,
    };
    const playoffMatches = Array.isArray(tournamentDoc.playoffs)
      ? tournamentDoc.playoffs
      : [];

    for (const p of playoffMatches) {
      const mid = STAGE_TO_NUM[String(p.stage || "").toLowerCase()];
      if (!mid || byNum.has(mid)) continue; // individual doc takes priority

      const t1 = nameToCode(p.team_1);
      const t2 = nameToCode(p.team_2);

      byNum.set(mid, {
        matchNumber: mid,
        status: "upcoming",
        team1: { short: t1, code: t1, name: p.team_1 || t1 },
        team2: { short: t2, code: t2, name: p.team_2 || t2 },
        venue: p.venue || null,
        dateISO: p.date || null,
        date: p.date || null,
        label: p.stage || null,
        result: null,
        winner: null,
      });
    }

    console.log(
      `[iplMatchesService] Loaded ${leagueMatches.length} league + ${playoffMatches.length} playoff matches from tournament doc`
    );
  }

  console.log(`[iplMatchesService] Total docs in map: ${byNum.size}`);
  return byNum;
}

const PLAYOFF_META = {
  71: {
    label: "Qualifier 1",
    venue: "Dharamsala, Himachal Pradesh Cricket Association Stadium",
    dateISO: "2026-05-26",
    timeIST: "7:30 PM",
    team1: "RCB",
    team2: "GT",
  },
  72: {
    label: "Eliminator",
    venue: "New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur",
    dateISO: "2026-05-27",
    timeIST: "7:30 PM",
    team1: "SRH",
    team2: "RR",
  },
  73: {
    label: "Qualifier 2",
    venue: "New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur",
    dateISO: "2026-05-29",
    timeIST: "7:30 PM",
    team1: "TBD",
    team2: "TBD",
  },
  74: {
    label: "Final",
    venue: "Ahmedabad, Narendra Modi Stadium",
    dateISO: "2026-05-31",
    timeIST: "7:30 PM",
    team1: "TBD",
    team2: "TBD",
  },
};

function teamObj(short) {
  const code = String(short || "TBD").toUpperCase();
  return {
    name: TEAM_FULL[code] || code,
    short: code,
  };
}

function parseScheduleTeams(matchup = "") {
  const clean = String(matchup).replace(/qualifier|eliminator|final/gi, "").trim();
  const parts = clean.split(/\s+vs\s+/i).map((t) => t.trim());
  const codes = parts.map((p) => {
    const key = p.toLowerCase();
    for (const [name, code] of Object.entries(TEAM_FULL)) {
      if (key.includes(name.split(" ")[0].toLowerCase()) && code !== "TBD") return code;
    }
    return p.slice(0, 4).toUpperCase();
  });
  return codes.filter((c) => c && c !== "TBD");
}

function isOfficialCompleted(doc) {
  if (!doc || doc.status !== "completed") return false;
  if (!doc.winner) return false;
  const result = String(doc.result || "");
  if (/AI predicted|model\)|\(ai/i.test(result)) return false;
  return true;
}

function mapUiStatus(doc) {
  const s = String(doc?.status || "upcoming").toLowerCase();
  if (s === "completed" && isOfficialCompleted(doc)) return "result";
  if (s === "live" || s === "in_progress") return "live";
  if (s === "completed") return "upcoming";
  return "upcoming";
}

function normalizeDoc(doc, schedRow = null) {
  const n = doc.matchNumber ?? schedRow?.Match;
  const playoff = n >= 71 || !!schedRow?.Playoff;
  const meta = PLAYOFF_META[n] || {};

  let t1 = doc.team1?.short || doc.team1?.code || meta.team1;
  let t2 = doc.team2?.short || doc.team2?.code || meta.team2;

  if (!t1 && schedRow) {
    const codes = parseScheduleTeams(schedRow.Matchup);
    t1 = codes[0];
    t2 = codes[1];
  }

  const team1 = teamObj(t1);
  const team2 = teamObj(t2);
  const status = mapUiStatus(doc);
  const winnerCode = isOfficialCompleted(doc) ? doc.winner : null;

  return {
    matchNumber: n,
    stage: playoff ? "playoff" : "league",
    label: doc.label || meta.label || schedRow?.Matchup || `Match ${n}`,
    venue: doc.venue || meta.venue || schedRow?.Venue || "",
    dateISO: doc.dateISO || meta.dateISO || null,
    date: doc.date || schedRow?.Date || null,
    timeIST: doc.timeIST || schedRow?.Time_IST || meta.timeIST || null,
    team1,
    team2,
    team1Score: doc.team1?.score ?? null,
    team2Score: doc.team2?.score ?? null,
    team1Overs: doc.team1?.overs ?? null,
    team2Overs: doc.team2?.overs ?? null,
    winner: winnerCode,
    result: isOfficialCompleted(doc) ? doc.result : null,
    status,
    dbStatus: doc.status || "upcoming",
    tossWinner: doc.tossWinner || null,
    tossDecision: doc.tossDecision || null,
    buttonText: playoff
      ? team1.short !== "TBD" || team2.short !== "TBD"
        ? `${team1.short} vs ${team2.short}`
        : "TBD vs TBD"
      : `M${n}`,
    playoffKey: n === 71 ? "Q1" : n === 72 ? "ELIM" : n === 73 ? "Q2" : n === 74 ? "FINAL" : null,
  };
}

function resolvePlayoffTeams(top4Teams, results) {
  const [top1, top2, top3, top4] = top4Teams;
  const q1 = results[71] || {};
  const elim = results[72] || {};
  const q2 = results[73] || {};

  const q1Winner = q1.winner || null;
  const q1Loser = q1.loser || (q1Winner ? (q1Winner === top1 ? top2 : top1) : null);
  const elimWinner = elim.winner || null;

  const slots = {
    71: { team1: top1, team2: top2 },
    72: { team1: top3, team2: top4 },
    73: {
      team1: q1Loser || "TBD",
      team2: elimWinner || "TBD",
    },
    74: {
      team1: q1Winner || "TBD",
      team2: q2.winner || "TBD",
    },
  };
  return slots;
}

async function getTop4(conn) {
  const state = await conn.collection("season_state_2026").findOne({ type: "league" });
  if (state?.top4?.length >= 4) return state.top4;
  const table = await getFreshPointsTable(conn);
  return table.slice(0, 4).map((r) => r.team);
}

async function getPlayoffResults(conn, top4) {
  const results = {};
  for (const mid of [71, 72, 73, 74]) {
    const doc = await conn.collection(COL).findOne({ matchNumber: mid });
    if (!isOfficialCompleted(doc)) continue;
    const t1 = doc.team1?.code || doc.team1?.short;
    const t2 = doc.team2?.code || doc.team2?.short;
    const w = doc.winner;
    results[mid] = {
      winner: w,
      loser: w === t1 ? t2 : t1,
      team1: t1,
      team2: t2,
    };
  }
  return results;
}

async function ensurePlayoffMatches(conn) {
  const top4 = await getTop4(conn);
  const results = await getPlayoffResults(conn, top4);
  const slots = resolvePlayoffTeams(top4, results);

  for (const [midStr, teams] of Object.entries(slots)) {
    const mid = Number(midStr);
    const meta = PLAYOFF_META[mid];
    const existing = await conn.collection(COL).findOne({ matchNumber: mid });

    const set = {
      matchNumber: mid,
      label: meta.label,
      venue: meta.venue,
      dateISO: meta.dateISO,
      timeIST: meta.timeIST,
      matchType: mid === 71 ? "qualifier1" : mid === 72 ? "eliminator" : mid === 73 ? "qualifier2" : "final",
      stage: "playoff",
      "team1.code": teams.team1,
      "team2.code": teams.team2,
      "team1.name": TEAM_FULL[teams.team1] || teams.team1,
      "team2.name": TEAM_FULL[teams.team2] || teams.team2,
      result: `${teams.team1} vs ${teams.team2}`,
    };

    if (!isOfficialCompleted(existing)) {
      set.status = "upcoming";
      set.winner = null;
      set["team1.score"] = null;
      set["team2.score"] = null;
    }

    await conn.collection(COL).updateOne({ matchNumber: mid }, { $set: set }, { upsert: true });
  }
}

async function getAllMatches2026(filters = {}) {
  const conn = predictionDB;
  await conn.asPromise();
  await ensurePlayoffMatches(conn);

  const top4 = await getTop4(conn);
  const playoffResults = await getPlayoffResults(conn, top4);
  const dynamicSlots = resolvePlayoffTeams(top4, playoffResults);

  // Use hybrid loader — reads both embedded tournament doc and individual match docs
  const byNum = await fetchLeagueAndPlayoffDocs(conn);

  const matches = [];
  for (let n = 1; n <= 74; n++) {
    const sched = SCHEDULE.find((s) => s.Match === n);
    let doc = byNum.get(n) || { matchNumber: n, status: "upcoming" };

    if (n >= 71 && dynamicSlots[n]) {
      doc = {
        ...doc,
        team1: { ...(doc.team1 || {}), code: dynamicSlots[n].team1, short: dynamicSlots[n].team1 },
        team2: { ...(doc.team2 || {}), code: dynamicSlots[n].team2, short: dynamicSlots[n].team2 },
      };
    }

    matches.push(normalizeDoc(doc, sched));
  }

  matches.sort((a, b) => a.matchNumber - b.matchNumber);

  const q = String(filters.search || "").trim().toLowerCase();
  const stageFilter = String(filters.stage || "ALL").toUpperCase();

  return matches.filter((m) => {
    if (stageFilter === "LEAGUE" && m.stage !== "league") return false;
    if (stageFilter === "PLAYOFFS" && m.stage !== "playoff") return false;
    if (stageFilter === "LIVE" && m.status !== "live") return false;
    if (stageFilter === "RESULT" && m.status !== "result") return false;
    if (stageFilter === "UPCOMING" && m.status !== "upcoming") return false;

    if (!q) return true;
    const hay = [
      m.team1.short,
      m.team1.name,
      m.team2.short,
      m.team2.name,
      m.venue,
      m.stage,
      m.label,
      String(m.matchNumber),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

async function getMatchByNumber(matchNumber) {
  const mid = Number(matchNumber);
  const list = await getAllMatches2026();
  const match = list.find((m) => m.matchNumber === mid);
  if (!match) throw new Error(`Match ${mid} not found`);

  let prediction = null;
  try {
    const bundle = await require("./predictions2026Service").getMatchPredictionBundle(mid);
    prediction = bundle.prediction;
  } catch {
    /* optional */
  }

  return { ...match, prediction };
}

function emitMatchPipelineEvents(type, payload = {}) {
  if (type === "match") emitOnce("MATCH_UPDATED", { type: "MATCH_UPDATED", ...payload });
  if (type === "points") emitOnce("POINTS_UPDATED", { type: "POINTS_UPDATED", ...payload });
  if (type === "playoffs") emitOnce("PLAYOFFS_UPDATED", { type: "PLAYOFFS_UPDATED", ...payload });
}

module.exports = {
  getAllMatches2026,
  getMatchByNumber,
  ensurePlayoffMatches,
  resolvePlayoffTeams,
  isOfficialCompleted,
  emitMatchPipelineEvents,
  TEAM_FULL,
  PLAYOFF_META,
};
