/**
 * winProbabilityEngine.js
 * Live win probability from current match state only (no external API).
 */

const VENUE_PITCH = {
  Bengaluru: { avgScore: 182, spinFriendly: false, chaseAdvantage: 62 },
  Mumbai: { avgScore: 175, spinFriendly: false, chaseAdvantage: 58 },
  Kolkata: { avgScore: 165, spinFriendly: true, chaseAdvantage: 55 },
  Hyderabad: { avgScore: 170, spinFriendly: false, chaseAdvantage: 57 },
  Ahmedabad: { avgScore: 169, spinFriendly: true, chaseAdvantage: 56 },
  Lucknow: { avgScore: 165, spinFriendly: false, chaseAdvantage: 55 },
  Delhi: { avgScore: 165, spinFriendly: true, chaseAdvantage: 50 },
  Chennai: { avgScore: 160, spinFriendly: true, chaseAdvantage: 40 },
  Mullanpur: { avgScore: 168, spinFriendly: false, chaseAdvantage: 54 },
  Jaipur: { avgScore: 162, spinFriendly: true, chaseAdvantage: 48 },
  Guwahati: { avgScore: 160, spinFriendly: true, chaseAdvantage: 50 },
};

const T20_OVERS = 20;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parseScoreLine(line) {
  if (!line) return { runs: 0, wickets: 0 };
  const m = String(line).match(/(\d+)\s*[-/]\s*(\d+)/);
  if (!m) return { runs: 0, wickets: 0 };
  return { runs: Number(m[1]), wickets: Number(m[2]) };
}

function parseOvers(o) {
  const n = parseFloat(String(o ?? "0").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function resolvePitchFactor(venue = "") {
  const key = Object.keys(VENUE_PITCH).find((v) =>
    String(venue).toLowerCase().includes(v.toLowerCase())
  );
  if (!key) return { batting: 0.5, bowling: 0.5, label: "Neutral pitch" };
  const p = VENUE_PITCH[key];
  const batBias = clamp((p.avgScore - 160) / 40, 0, 1);
  const bowlBias = p.spinFriendly ? 0.65 : 0.45;
  return {
    batting: batBias,
    bowling: bowlBias,
    label: `${key} — avg ${p.avgScore}, ${p.spinFriendly ? "spin assist" : "flat deck"}`,
  };
}

function battingImpact(inn) {
  const runs = inn.runs ?? 0;
  const wickets = inn.wickets ?? 0;
  const overs = inn.overs ?? 0;
  const sr = overs > 0 ? runs / overs : runs > 0 ? 8 : 0;
  const runsFactor = clamp(runs / 200, 0, 1.2);
  const srFactor = clamp(sr / 10, 0, 1.2);
  const boundaryRate = inn.boundaryRate ?? clamp((runs / Math.max(1, overs * 6)) / 12, 0, 1);
  return runsFactor * 0.45 + srFactor * 0.35 + boundaryRate * 0.2;
}

function bowlingImpact(inn, opponentInn) {
  const wkts = inn.wicketsTaken ?? opponentInn.wickets ?? 0;
  const eco = inn.economy ?? (inn.overs > 0 ? inn.runsConceded / inn.overs : 9);
  const wicketsWeight = clamp(wkts / 10, 0, 1);
  const economyControl = clamp((10 - eco) / 4, 0, 1);
  const deathStrength = inn.overs >= 16 ? economyControl * 1.1 : economyControl * 0.85;
  return wicketsWeight * 0.4 + economyControl * 0.35 + deathStrength * 0.25;
}

function matchPressureFactor(inn, chase = false, target = null) {
  const oversLeft = Math.max(0.1, T20_OVERS - (inn.overs ?? 0));
  const currentRR = (inn.runs ?? 0) / Math.max(inn.overs ?? 0.1, 0.1);
  if (!chase || target == null) {
    return clamp(currentRR / 12, 0, 1);
  }
  const runsNeeded = Math.max(0, target - (inn.runs ?? 0));
  const requiredRR = runsNeeded / oversLeft;
  const pressure = requiredRR - currentRR;
  return clamp(0.5 + pressure / 8, 0, 1.5);
}

function teamCompositeScore(parts) {
  return (
    parts.batting * 0.4 +
    parts.bowling * 0.3 +
    parts.pressure * 0.2 +
    parts.pitch * 0.1
  );
}

/**
 * @param {object} matchState
 * @returns {{ team1Probability, team2Probability, momentum, keyFactors }}
 */
function calculateWinProbability(matchState) {
  const team1 = matchState.team1 || "T1";
  const team2 = matchState.team2 || "T2";
  const venue = matchState.venue || "";
  const pitch = resolvePitchFactor(venue);

  const t1 = matchState.team1Innings || {};
  const t2 = matchState.team2Innings || {};

  const t1Batting = battingImpact(t1);
  const t2Batting = battingImpact(t2);
  const t1Bowling = bowlingImpact(
    { wicketsTaken: t2.wickets, economy: t2.economy, overs: t2.overs },
    t2
  );
  const t2Bowling = bowlingImpact(
    { wicketsTaken: t1.wickets, economy: t1.economy, overs: t1.overs },
    t1
  );

  const chasingTeam = matchState.chasingTeam || null;
  const target = matchState.target ?? null;

  const t1Pressure = matchPressureFactor(t1, chasingTeam === team1, target);
  const t2Pressure = matchPressureFactor(t2, chasingTeam === team2, target);

  let t1Pitch = pitch.batting;
  let t2Pitch = pitch.bowling;
  if (matchState.homeTeam === team1) {
    t1Pitch += 0.08;
  } else if (matchState.homeTeam === team2) {
    t2Pitch += 0.08;
  }

  let t1Score = teamCompositeScore({
    batting: t1Batting,
    bowling: t1Bowling,
    pressure: t1Pressure,
    pitch: t1Pitch,
  });
  let t2Score = teamCompositeScore({
    batting: t2Batting,
    bowling: t2Bowling,
    pressure: t2Pressure,
    pitch: t2Pitch,
  });

  // Toss impact
  if (matchState.tossWinner === team1) {
    t1Score *= matchState.tossChoice === "bat" ? 1.06 : 1.04;
  } else if (matchState.tossWinner === team2) {
    t2Score *= matchState.tossChoice === "bat" ? 1.06 : 1.04;
  }

  // Momentum events (event-driven deltas)
  const momentumEvents = matchState.recentEvents || [];
  for (const ev of momentumEvents) {
    const delta = ev.type === "wicket" ? -0.1 : ev.type === "boundary" ? 0.05 : 0;
    if (ev.team === team1) t1Score += delta;
    if (ev.team === team2) t2Score += delta;
  }

  t1Score = Math.max(0.05, t1Score);
  t2Score = Math.max(0.05, t2Score);

  const total = t1Score + t2Score;
  const team1Probability = Math.round((t1Score / total) * 1000) / 10;
  const team2Probability = Math.round((100 - team1Probability) * 10) / 10;

  let momentum = "Even contest";
  const diff = team1Probability - team2Probability;
  if (diff >= 15) momentum = `${team1} in control`;
  else if (diff <= -15) momentum = `${team2} in control`;
  else if (chasingTeam && target) {
    const need = target - (chasingTeam === team1 ? t1.runs : t2.runs);
    momentum = need > 0 ? `Chase on — ${need} needed` : "Target achieved pressure";
  }

  const keyFactors = [
    `${team1} batting impact: ${(t1Batting * 100).toFixed(0)}%`,
    `${team2} batting impact: ${(t2Batting * 100).toFixed(0)}%`,
    `${team1} bowling control: ${(t1Bowling * 100).toFixed(0)}%`,
    `Pitch: ${pitch.label}`,
    matchState.tossWinner
      ? `Toss: ${matchState.tossWinner} chose ${matchState.tossChoice || "—"}`
      : "Toss: pending",
  ];

  if (chasingTeam && target != null) {
    const oversLeft = T20_OVERS - (chasingTeam === team1 ? t1.overs : t2.overs);
    const runsNeed = target - (chasingTeam === team1 ? t1.runs : t2.runs);
    keyFactors.push(`Required RR pressure: ${(runsNeed / Math.max(oversLeft, 0.1)).toFixed(1)}`);
  }

  return {
    team1Probability,
    team2Probability,
    momentum,
    keyFactors,
  };
}

/** Build normalized match state from loose inputs */
function normalizeMatchState(raw = {}) {
  const t1s = parseScoreLine(raw.score1 || raw.team1Score);
  const t2s = parseScoreLine(raw.score2 || raw.team2Score);
  const t1o = parseOvers(raw.overs1 ?? raw.team1Overs);
  const t2o = parseOvers(raw.overs2 ?? raw.team2Overs);

  return {
    team1: raw.team1 || raw.team1Code || "T1",
    team2: raw.team2 || raw.team2Code || "T2",
    venue: raw.venue || "",
    homeTeam: raw.homeTeam || null,
    target: raw.target != null ? Number(raw.target) : null,
    chasingTeam: raw.chasingTeam || null,
    tossWinner: raw.tossWinner || raw.toss?.winner || null,
    tossChoice: raw.tossChoice || raw.toss?.choice || null,
    team1Innings: {
      runs: t1s.runs,
      wickets: t1s.wickets,
      overs: t1o,
      runsConceded: t2s.runs,
      economy: t2o > 0 ? t2s.runs / t2o : 9,
      boundaryRate: raw.team1BoundaryRate,
    },
    team2Innings: {
      runs: t2s.runs,
      wickets: t2s.wickets,
      overs: t2o,
      runsConceded: t1s.runs,
      economy: t1o > 0 ? t1s.runs / t1o : 9,
      boundaryRate: raw.team2BoundaryRate,
    },
    recentEvents: raw.recentEvents || [],
  };
}

module.exports = {
  calculateWinProbability,
  normalizeMatchState,
  parseScoreLine,
  parseOvers,
  resolvePitchFactor,
};
