/**
 * seasonPredictionEngine.js
 * Pre-match predictions using ONLY IPL 2026 MongoDB stats (no hardcoded winners).
 */
const { ensureMLStats } = require("./statsDataLoader");
const { resolvePitchFactor } = require("./winProbabilityEngine");

const VENUE_HOME = {
  Bengaluru: "RCB",
  Mumbai: "MI",
  Kolkata: "KKR",
  Chennai: "CSK",
  Hyderabad: "SRH",
  Delhi: "DC",
  Ahmedabad: "GT",
  Mullanpur: "PBKS",
  Lucknow: "LSG",
  Jaipur: "RR",
  Dharamshala: "PBKS",
  Guwahati: null,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeTeamCode(code) {
  return String(code || "").trim().toUpperCase();
}

function resolveVenueKey(venue = "") {
  return Object.keys(VENUE_HOME).find((v) =>
    String(venue).toLowerCase().includes(v.toLowerCase())
  );
}

/** Players from ipl_players_stats_2026 (has Team per player) */
function getSquadPlayersForTeam(teamCode) {
  const team = normalizeTeamCode(teamCode);
  const { getCache } = require("./statsDataLoader");
  const { playerStats = [] } = getCache();

  const rows = [];
  for (const doc of playerStats) {
    if (!doc || typeof doc !== "object") continue;
    if (doc.Player || doc.player) {
      const t = normalizeTeamCode(doc.Team || doc.team);
      if (t === team) rows.push(doc);
      continue;
    }
    for (const [teamKey, players] of Object.entries(doc)) {
      if (teamKey === "_id" || teamKey === "__v") continue;
      if (normalizeTeamCode(teamKey) !== team) continue;
      if (!players || typeof players !== "object") continue;
      for (const [name, stats] of Object.entries(players)) {
        rows.push({ Team: team, Player: name, ...stats });
      }
    }
  }
  return rows;
}

/** Aggregate 2026 stats from squad player documents */
function getTeamMetricsFrom2026(teamCode) {
  const team = normalizeTeamCode(teamCode);
  const squad = getSquadPlayersForTeam(team);

  const batters = squad.filter(
    (p) => (p.sr || p.strike_rate || p.runs) && Number(p.runs || 0) > 0
  );
  const bowlers = squad.filter(
    (p) => (p.econ || p.economy || p.wkts) && Number(p.wkts || p.wickets || 0) > 0
  );

  let battingSR = 140;
  let battingAvg = 28;
  if (batters.length > 0) {
    const srSum = batters.reduce(
      (s, b) => s + Number(b.sr || b.strike_rate || b.strikeRate || b.SR || 130),
      0
    );
    const avgSum = batters.reduce(
      (s, b) => s + Number(b.avg || b.batting_average || b.average || b.Avg || 25),
      0
    );
    battingSR = srSum / batters.length;
    battingAvg = avgSum / batters.length;
  }

  let bowlingEcon = 9;
  let wicketsPerMatch = 1.2;
  if (bowlers.length > 0) {
    const ecoSum = bowlers.reduce(
      (s, b) => s + Number(b.econ || b.economy || b.Economy || 9),
      0
    );
    const wktSum = bowlers.reduce(
      (s, b) => s + Number(b.wkts || b.wickets || b.Wickets || 0),
      0
    );
    const matSum = bowlers.reduce(
      (s, b) => s + Math.max(1, Number(b.matches || b.Matches || 1)),
      0
    );
    bowlingEcon = ecoSum / bowlers.length;
    wicketsPerMatch = wktSum / matSum;
  }

  const playerStatsService = require("./playerStatsService");
  const squadStrength = playerStatsService.calculateTeamStrength(team);
  const squadScore = squadStrength?.score
    ? squadStrength.score / Math.max(squadStrength.playerCount || 15, 1)
    : 50;

  return {
    team,
    battingSR,
    battingAvg,
    bowlingEcon,
    wicketsPerMatch,
    squadScore: clamp(squadScore, 30, 100),
    batterCount: batters.length,
    bowlerCount: bowlers.length,
  };
}

function teamMatchScore(metrics, venue, isHome) {
  const pitch = resolvePitchFactor(venue);
  const batting = clamp(metrics.battingSR / 180, 0.3, 1.2) * 0.5 +
    clamp(metrics.battingAvg / 45, 0.3, 1.2) * 0.3 +
    clamp(metrics.squadScore / 80, 0.3, 1.2) * 0.2;

  const bowling = clamp((10 - metrics.bowlingEcon) / 4, 0, 1.2) * 0.6 +
    clamp(metrics.wicketsPerMatch / 2, 0, 1) * 0.4;

  const venueBonus = isHome ? 0.08 : 0;
  const pitchBonus = pitch.batting * 0.1;

  return batting * 0.4 + bowling * 0.3 + venueBonus + pitchBonus;
}

/**
 * Predict match winner from 2026 MongoDB stats only.
 */
async function predictMatchFrom2026Stats(team1, team2, venue = "", options = {}) {
  await ensureMLStats();

  const t1 = normalizeTeamCode(team1);
  const t2 = normalizeTeamCode(team2);
  const venueKey = resolveVenueKey(venue);
  const homeTeam = venueKey ? VENUE_HOME[venueKey] : null;

  const m1 = getTeamMetricsFrom2026(t1);
  const m2 = getTeamMetricsFrom2026(t2);

  let s1 = teamMatchScore(m1, venue, homeTeam === t1);
  let s2 = teamMatchScore(m2, venue, homeTeam === t2);

  if (options.knockout) {
    s1 *= 1.02;
    s2 *= 1.02;
  }

  s1 = Math.max(0.05, s1);
  s2 = Math.max(0.05, s2);
  const total = s1 + s2;

  const team1Probability = Math.round((s1 / total) * 1000) / 10;
  const team2Probability = Math.round((100 - team1Probability) * 10) / 10;
  const predictedWinner = team1Probability >= team2Probability ? t1 : t2;

  return {
    team1: t1,
    team2: t2,
    venue,
    team1Probability,
    team2Probability,
    predictedWinner,
    winProbability: { [t1]: team1Probability, [t2]: team2Probability },
    confidence: Math.max(team1Probability, team2Probability),
    keyFactors: [
      `${t1} 2026 batting SR: ${m1.battingSR.toFixed(1)}`,
      `${t2} 2026 batting SR: ${m2.battingSR.toFixed(1)}`,
      `${t1} bowling economy: ${m1.bowlingEcon.toFixed(2)}`,
      `${t2} bowling economy: ${m2.bowlingEcon.toFixed(2)}`,
      venueKey ? `Venue: ${venueKey}${homeTeam ? ` (home: ${homeTeam})` : ""}` : "Venue: neutral",
      `Squad data: ${m1.batterCount} batters / ${m1.bowlerCount} bowlers (ipl_players_stats_2026)`,
    ],
    metrics: { team1: m1, team2: m2 },
  };
}

module.exports = {
  predictMatchFrom2026Stats,
  getTeamMetricsFrom2026,
};
