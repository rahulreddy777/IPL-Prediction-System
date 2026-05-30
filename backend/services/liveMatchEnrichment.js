/**
 * Normalise live match payloads from RapidAPI / CricAPI / mixed shapes.
 * Parses toss lines from status text and builds inning score rows when arrays are empty.
 */

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

function toCode(name = "") {
  const lower = String(name).toLowerCase().trim();
  for (const [key, code] of Object.entries(TEAM_MAP)) {
    if (lower.includes(key)) return code;
  }
  const upper = String(name).toUpperCase().trim();
  if (Object.values(TEAM_MAP).includes(upper)) return upper;
  if (["PBKS", "PBK"].includes(upper)) return "PBKS";
  return null;
}

/** @returns {{ winnerFull: string, choice: 'bat'|'field' } | null} */
function parseTossFromStatus(status = "") {
  const s = String(status || "");
  let m = s.match(
    /^(.+?)\s+won the toss.*?elected to\s+(bat|field|bowl)/i
  );
  if (m) {
    const choiceRaw = m[2].toLowerCase();
    const choice = choiceRaw === "field" || choiceRaw === "bowl" ? "field" : "bat";
    return { winnerFull: m[1].trim(), choice };
  }
  m = s.match(/^(.+?)\s+won the toss.*?(opt(?:ed)? to|chose to)\s+(bat|field|bowl)/i);
  if (m) {
    const c = m[3].toLowerCase();
    const choice = c === "field" || c === "bowl" ? "field" : "bat";
    return { winnerFull: m[1].trim(), choice };
  }
  m = s.match(/^(.+?)\s+won the toss.*?decided to\s+(bat|field|bowl)/i);
  if (m) {
    const c = m[2].toLowerCase();
    const choice = c === "field" || c === "bowl" ? "field" : "bat";
    return { winnerFull: m[1].trim(), choice };
  }
  // Short "X won the toss"
  m = s.match(/^(.+?)\s+won the toss\b/i);
  if (m && !/won by/i.test(s.slice(0, 40))) {
    return { winnerFull: m[1].trim(), choice: null };
  }
  return null;
}

/** "SRH 120/4 (15.2)" or "MI: 45/2 (6.3)" */
function parseScoreSnippets(text) {
  if (!text || typeof text !== "string") return [];
  const rows = [];
  const re = /(.+?)\s+(\d+)\s*\/\s*(\d+)\s*(?:\(([\d.]+)\s*(?:ov(?:ers?)?)?\))?/gi;
  let x;
  while ((x = re.exec(text)) !== null) {
    const label = x[1].trim().replace(/[:–-]\s*$/, "").trim();
    rows.push({
      inning: label,
      r: parseInt(x[2], 10),
      w: parseInt(x[3], 10),
      o: x[4] != null ? parseFloat(x[4]) : 0,
    });
  }
  return rows;
}

/**
 * Build score[] and toss fields from a raw API match object.
 */
function enrichMatchFromRaw(m) {
  const status = m.status || m.result || m.update || "";
  let score = [];

  if (Array.isArray(m.score) && m.score.length) {
    score = m.score.map((s) => ({
      inning: s.inning || s.name || s.team || "",
      r: s.r ?? s.runs ?? 0,
      w: s.w ?? s.wickets ?? 0,
      o: s.o ?? s.overs ?? 0,
    }));
  } else if (Array.isArray(m.innings) && m.innings.length) {
    score = m.innings.map((s) => ({
      inning: s.inning || s.name || "",
      r: s.r ?? s.runs ?? 0,
      w: s.w ?? s.wickets ?? 0,
      o: s.o ?? s.overs ?? 0,
    }));
  }

  if (!score.length) {
    const blob =
      [m.livescore, m.liveScore, m.runrate, m.note, m.summary, status]
        .filter(Boolean)
        .join(" ");
    score = parseScoreSnippets(blob);
  }

  let tossWinnerCode =
    m.tossWinnerCode ||
    (m.tossWinner && toCode(m.tossWinner)) ||
    (m.toss_winning_team && toCode(m.toss_winning_team)) ||
    null;
  let tossChoice =
    m.tossChoice ||
    (typeof m.elected === "string" &&
      (m.elected.toLowerCase().includes("field") || m.elected.toLowerCase().includes("bowl")
        ? "field"
        : m.elected.toLowerCase().includes("bat")
        ? "bat"
        : null)) ||
    null;

  const parsedToss = parseTossFromStatus(status);
  if (parsedToss) {
    const w = toCode(parsedToss.winnerFull);
    if (w) tossWinnerCode = w;
    if (parsedToss.choice) tossChoice = parsedToss.choice;
  }

  return { score, tossWinnerCode, tossChoice, tossRaw: parsedToss };
}

/**
 * Map two team codes to score1/score2 / overs1/overs2 strings for dashboard.
 */
function flattenScoresForTeams(teams = [], score = []) {
  const codes = teams.map((t) => toCode(t)).filter(Boolean);
  if (codes.length < 2) {
    return {
      score1: "",
      score2: "",
      overs1: "",
      overs2: "",
      target: "",
    };
  }
  const [t1, t2] = codes;

  const pickFor = (code) => {
    const row = score.find((s) => {
      const inn = String(s.inning || "");
      return inn.includes(code);
    });
    if (row) {
      return {
        runs: `${row.r}/${row.w}`,
        overs: row.o != null && row.o !== "" ? String(row.o) : "",
      };
    }
    return { runs: "", overs: "" };
  };

  const a = pickFor(t1);
  const b = pickFor(t2);
  return {
    score1: a.runs,
    score2: b.runs,
    overs1: a.overs,
    overs2: b.overs,
    target: "",
  };
}

function isLiveMatchState(m) {
  if (!m) return false;
  if (m.matchStarted && !m.matchEnded) return true;
  const st = String(m.status || "").toLowerCase();
  if (st.includes("won") && st.includes("by")) return false;
  return (
    st.includes("live") ||
    (st.includes("innings") && st.includes("progress")) ||
    (st.includes("inning") && (st.includes("break") || st.includes("drinks"))) ||
    st.includes("strategic timeout")
  );
}

module.exports = {
  toCode,
  parseTossFromStatus,
  enrichMatchFromRaw,
  flattenScoresForTeams,
  isLiveMatchState,
  TEAM_MAP,
};
