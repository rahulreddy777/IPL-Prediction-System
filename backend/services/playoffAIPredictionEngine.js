/**
 * playoffAIPredictionEngine.js
 * ═══════════════════════════════════════════════════════════════════════════════
 * Advanced IPL 2026 Playoff AI Prediction Engine
 *
 * Formula:
 *   predictionScore = recentForm*20 + battingStrength*20 + bowlingStrength*20
 *                   + pitchSuitability*15 + headToHead*10 + tossImpact*5
 *                   + squadBalance*10
 *
 * Analyzes 20+ factors:
 *   team strengths / weaknesses, pitch, toss, venue, recent form,
 *   H2H, batting depth, bowling depth, death bowling, powerplay,
 *   spin vs pace, captaincy, playoff pressure, middle-order stability,
 *   injury impact, squad balance, player form, home/away, venue dims,
 *   weather, dew, Orange/Purple cap impact
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { getTeamMetricsFrom2026 } = require("./seasonPredictionEngine");
const playerStatsService = require("./playerStatsService");

// ─── Venue Knowledge Base ─────────────────────────────────────────────────────
const VENUE_DB = {
  dharamsala: {
    name: "Dharamsala — HPCA Stadium",
    altitude: "high",
    avgScore: 175,
    chaseAdvantage: 58,
    seamFriendly: true,
    spinFriendly: false,
    dewFactor: "moderate",
    dewProbability: 0.55,
    powerplayBonus: 0.65,  // seam helps in powerplay
    deathBowlingDifficulty: 0.7,
    carryFactor: "excellent",
    conditions: "Fast outfield · Good carry · Seam early · Big hitting later",
    weather: "Cool evening (21°C) · Low humidity (35%) · Clear sky · Strong early swing",
    teamAdvantage: { RCB: 0.04, GT: 0.03, SRH: 0.05, RR: 0.04 },
    pitchType: "seam_friendly",
    paceSpinRatio: 0.72, // pace has 72% advantage
    tossBowlFirst: 0.62, // 62% of teams prefer bowling first
    tossBatFirst: 0.38,
  },
  mullanpur: {
    name: "Mullanpur — MYSI Stadium",
    altitude: "normal",
    avgScore: 168,
    chaseAdvantage: 56,
    seamFriendly: false,
    spinFriendly: true,
    dewFactor: "high",
    dewProbability: 0.72,
    powerplayBonus: 0.5,
    deathBowlingDifficulty: 0.8, // dew makes death tough
    carryFactor: "moderate",
    conditions: "Balanced · New-ball movement · Slows later · Spinners useful mid-overs",
    weather: "Pleasant spring evening (27°C) · Moderate humidity (52%) · Mild breeze",
    teamAdvantage: { SRH: 0.03, RR: 0.04, GT: 0.02, RCB: 0.02 },
    pitchType: "balanced",
    paceSpinRatio: 0.52,
    tossBowlFirst: 0.68,
    tossBatFirst: 0.32,
  },
  ahmedabad: {
    name: "Ahmedabad — Narendra Modi Stadium",
    altitude: "normal",
    avgScore: 172,
    chaseAdvantage: 62,
    seamFriendly: false,
    spinFriendly: true,
    dewFactor: "very_high",
    dewProbability: 0.85,
    powerplayBonus: 0.45,
    deathBowlingDifficulty: 0.9, // very hard with dew
    carryFactor: "good",
    conditions: "Batting paradise · Large boundaries · Dew major factor · 2nd innings advantage",
    weather: "Warm and humid (33°C) · Heavy dew expected (82% humidity) · Clear sky",
    teamAdvantage: { GT: 0.07, RCB: 0.02, SRH: 0.03, RR: 0.03 },
    pitchType: "batting_friendly",
    paceSpinRatio: 0.48,
    tossBowlFirst: 0.78,
    tossBatFirst: 0.22,
  },
};

function resolveVenue(venueStr = "") {
  const v = String(venueStr).toLowerCase();
  if (v.includes("dharamsala") || v.includes("dharamshala") || v.includes("hpca")) return VENUE_DB.dharamsala;
  if (v.includes("mullanpur") || v.includes("maharaja") || v.includes("mysi")) return VENUE_DB.mullanpur;
  if (v.includes("ahmedabad") || v.includes("narendra") || v.includes("motera")) return VENUE_DB.ahmedabad;
  return VENUE_DB.ahmedabad; // default
}

// ─── Team Intelligence Database ───────────────────────────────────────────────
const TEAM_INTEL = {
  RCB: {
    fullName: "Royal Challengers Bengaluru",
    captain: "Rajat Patidar",
    strengths: [
      "Virat Kohli in historic form — 600 runs, avg 50, SR 164.7",
      "Elite pace attack (Bhuvneshwar Kumar 26 wkts + Hazlewood 17 wkts)",
      "Crushed GT by 92 runs in Qualifier 1 — massive psychological edge",
      "Rajat Patidar 73.68% captain win rate — best of all finalists",
    ],
    weaknesses: [
      "Middle-overs collapse risk if Kohli dismissed cheaply",
      "Spin vulnerability vs Rashid Khan (economy 6.07)",
      "Death bowling with dew — wet ball hurts Bhuvi's swing",
    ],
    recentFormWins: 4,  // Won Q1 by 92 runs + 3W in last 5 league
    recentFormLosses: 1,
    recentNRR: +0.852,
    playoffExperience: "medium",  // Never won IPL
    playoffPressureRating: 0.80,  // Won Q1 by 92 runs — handles pressure well now
    powerplayStrength: 0.83,
    deathBowlingStrength: 0.74,
    deathBattingStrength: 0.80,  // Tim David SR 226
    spinVulnerability: 0.64, // lower = more vulnerable
    paceStrength: 0.85,
    middleOrderStability: 0.70,
    finishingAbility: 0.78,
    squadDepth: 0.79,
    captainRating: 0.80,  // Patidar's 73.68% win rate
    keyPlayer: "Virat Kohli",
    orangeCapContributor: "Virat Kohli (600 runs, SR 164.7)",
    purpleCapContributor: "Bhuvneshwar Kumar (26 wickets, eco 7.71)",
    injuryRisk: 0.12,
  },
  GT: {
    fullName: "Gujarat Titans",
    captain: "Shubman Gill",
    strengths: [
      "Shubman Gill on home ground — 722 runs, avg 48.1, SR 163.5",
      "Kagiso Rabada 28 wickets — tournament's purple cap leader",
      "Rashid Khan at home (economy 6.07) — deadliest spin weapon on this pitch",
      "Two IPL titles (2022, 2023) — playoff experience and composure",
    ],
    weaknesses: [
      "Lost Q1 by 92 runs — significant psychological deficit entering Final",
      "Powerplay batting slow — vulnerable to Hazlewood's outswing",
      "Rabada's economy rises in must-win pressure games",
    ],
    recentFormWins: 3,  // Won Q2 but lost Q1 by 92 runs
    recentFormLosses: 2,
    recentNRR: +0.612,
    playoffExperience: "high",  // 2 IPL titles (2022, 2023)
    playoffPressureRating: 0.82,  // Q1 loss at 162 dented slightly
    powerplayStrength: 0.73,
    deathBowlingStrength: 0.76,
    deathBattingStrength: 0.78,
    spinVulnerability: 0.80,
    paceStrength: 0.80,  // Rabada 28 wkts
    middleOrderStability: 0.78,
    finishingAbility: 0.76,
    squadDepth: 0.82,
    captainRating: 0.80,
    keyPlayer: "Shubman Gill",
    orangeCapContributor: "Sai Sudharsan (710 runs, SR 157.9) / Gill (722)",
    purpleCapContributor: "Kagiso Rabada (28 wkts) / Rashid Khan (19 wkts)",
    injuryRisk: 0.12,
  },
  SRH: {
    fullName: "Sunrisers Hyderabad",
    captain: "Pat Cummins",
    strengths: [
      "Explosive powerplay batting (Abhishek, Ishan Kishan)",
      "Heinrich Klaasen's finishing power",
      "Travis Head's attacking starts",
      "Team NRR +0.524 — dominant wins",
    ],
    weaknesses: [
      "Middle-order inconsistency",
      "Batting collapses after quick starts",
      "Death bowling fragility",
    ],
    recentFormWins: 3,
    recentFormLosses: 2,
    recentNRR: +0.524,
    playoffExperience: "medium",
    playoffPressureRating: 0.74,
    powerplayStrength: 0.92,  // best powerplay in tournament
    deathBowlingStrength: 0.68,
    deathBattingStrength: 0.82,
    spinVulnerability: 0.70,
    paceStrength: 0.76,
    middleOrderStability: 0.62,
    finishingAbility: 0.78,
    squadDepth: 0.74,
    captainRating: 0.82,
    keyPlayer: "Heinrich Klaasen",
    orangeCapContributor: "Abhishek Sharma (507 runs, SR 201.99)",
    purpleCapContributor: "Pat Cummins",
    injuryRisk: 0.18,
  },
  RR: {
    fullName: "Rajasthan Royals",
    captain: "Sanju Samson",
    strengths: [
      "Balanced batting (Sooryavanshi, Samson, Buttler)",
      "Jofra Archer's pace and bounce",
      "Excellent finishing ability",
      "Young talent (Vaibhav Sooryavanshi impact)",
    ],
    weaknesses: [
      "Death overs bowling leakage",
      "Middle batting susceptible to good pace",
      "Dew exposure at death hurts bowlers",
    ],
    recentFormWins: 2,
    recentFormLosses: 3,
    recentNRR: +0.083,
    playoffExperience: "high",  // 1 IPL title (2008)
    playoffPressureRating: 0.76,
    powerplayStrength: 0.76,
    deathBowlingStrength: 0.64,  // weakness
    deathBattingStrength: 0.80,
    spinVulnerability: 0.74,
    paceStrength: 0.78,
    middleOrderStability: 0.76,
    finishingAbility: 0.82,
    squadDepth: 0.76,
    captainRating: 0.80,
    keyPlayer: "Vaibhav Sooryavanshi",
    orangeCapContributor: "Vaibhav Sooryavanshi (579 runs, SR 236.33)",
    purpleCapContributor: "Jofra Archer (18 wkts, eco 9.15)",
    injuryRisk: 0.14,
  },
};

// ─── Head-to-Head Historical Database ─────────────────────────────────────────
// Updated with complete 2026 season data:
//   Apr 24: RCB chased 206 vs GT → RCB won
//   Apr 30: GT chased 156 vs RCB → GT won
//   May 26: Qualifier 1 — RCB 254/5 vs GT 162 → RCB won by 92 runs
// All-time: 9 matches, RCB 5 wins, GT 4 wins
const H2H_DATA = {
  "RCB-GT": { total: 9, rcbWins: 5, gtWins: 4, gtAdvantage: false, rcbAdvantage: true, recentWinner: "RCB", recentGames: ["RCB", "GT", "RCB"] },
  "GT-RCB": { total: 9, rcbWins: 5, gtWins: 4, gtAdvantage: false, rcbAdvantage: true, recentWinner: "RCB", recentGames: ["RCB", "GT", "RCB"] },
  "SRH-RR": { total: 18, srhWins: 10, rrWins: 8, srhAdvantage: true, recentWinner: "SRH", recentGames: ["SRH", "RR", "SRH"] },
  "RR-SRH": { total: 18, srhWins: 10, rrWins: 8, srhAdvantage: true, recentWinner: "SRH", recentGames: ["SRH", "RR", "SRH"] },
};

function getH2H(team1, team2) {
  const key = `${team1}-${team2}`;
  const rev = `${team2}-${team1}`;
  return H2H_DATA[key] || H2H_DATA[rev] || null;
}

function clamp(n, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function normalize100(val, maxExpected) {
  return clamp(val / maxExpected) * 100;
}

// ─── Core Prediction Formula ──────────────────────────────────────────────────

function calcRecentForm(intel) {
  const wins = intel.recentFormWins;
  const total = wins + intel.recentFormLosses;
  const winRate = total > 0 ? wins / total : 0.5;
  const nrrBonus = clamp((intel.recentNRR + 1) / 2); // normalize NRR
  const pressure = intel.playoffPressureRating;
  return (winRate * 0.5 + nrrBonus * 0.3 + pressure * 0.2) * 100;
}

function calcBattingStrength(intel, venue) {
  const powerplay = intel.powerplayStrength;
  const deathBat = intel.deathBattingStrength;
  const middleOrder = intel.middleOrderStability;
  const finishing = intel.finishingAbility;

  // Venue modifier
  let venueBonus = 0;
  if (venue.pitchType === "batting_friendly") venueBonus = 5;
  else if (venue.pitchType === "seam_friendly") venueBonus = -3;

  // Orange Cap contributor form modifier (+4% to overall batting strength)
  let capBonus = intel.orangeCapContributor ? 4 : 0;

  const raw = (powerplay * 0.3 + deathBat * 0.25 + middleOrder * 0.25 + finishing * 0.2) * 100;
  return clamp(raw + venueBonus + capBonus, 0, 100);
}

function calcBowlingStrength(intel, venue) {
  const paceStr = intel.paceStrength;
  const deathBowl = intel.deathBowlingStrength;
  const squad = intel.squadDepth;

  // Venue modifier — dew impacts death bowling
  const dewPenalty = venue.dewProbability * 8;
  const pitchBonus = venue.seamFriendly ? (paceStr * 8) : (venue.spinFriendly ? 5 : 0);

  // Purple Cap contributor form modifier (+4% to overall bowling strength)
  let capBonus = intel.purpleCapContributor ? 4 : 0;

  // Weather modifier: high humidity makes ball slippery and hurts spinners/death bowlers
  let weatherPenalty = 0;
  if (venue.weather && venue.weather.toLowerCase().includes("humid")) {
    weatherPenalty = 3;
  }

  const raw = (paceStr * 0.35 + deathBowl * 0.35 + squad * 0.3) * 100;
  return clamp(raw + pitchBonus + capBonus - dewPenalty - weatherPenalty, 0, 100);
}

function calcPitchSuitability(intel, venue) {
  let score = 50;

  // Pace vs spin match
  if (venue.seamFriendly) {
    score += (intel.paceStrength - 0.5) * 40;
  } else if (venue.spinFriendly) {
    score -= intel.spinVulnerability * 20;
    score += (intel.spinVulnerability > 0.75 ? 10 : 0);
  }

  // Powerplay venue bonus
  score += (intel.powerplayStrength - 0.5) * venue.powerplayBonus * 30;

  // Altitude bonus for Dharamsala (good for pacers)
  if (venue.altitude === "high") {
    score += intel.paceStrength * 8;
  }

  // Weather impact
  if (venue.weather && venue.weather.toLowerCase().includes("cool")) {
    score += intel.paceStrength * 6; // enhanced swing
  }

  return clamp(score, 0, 100);
}

function calcH2HScore(team1, team2) {
  const h2h = getH2H(team1, team2);
  if (!h2h) return 50;

  const total = h2h.total || 1;
  const wins = h2h[`${team1.toLowerCase()}Wins`] ||
    (h2h.recentWinner === team1 ? Math.ceil(total / 2) : Math.floor(total / 2));
  const rate = wins / total;

  // Weight recent games more
  const recentGames = h2h.recentGames || [];
  const recentWins = recentGames.filter(w => w === team1).length;
  const recentScore = recentGames.length > 0 ? recentWins / recentGames.length : 0.5;

  return clamp(rate * 0.5 + recentScore * 0.5, 0, 1) * 100;
}

function calcTossImpact(intel, venue) {
  // How much does toss advantage help this team at this venue?
  const dewImpact = venue.dewProbability;
  const chaseStrength = intel.deathBattingStrength * 0.6 + intel.finishingAbility * 0.4;

  // Teams that are good at chasing benefit more from toss
  const tossValue = dewImpact * chaseStrength * 100;
  return clamp(tossValue, 0, 100);
}

function calcSquadBalance(intel) {
  const depth = intel.squadDepth;
  const captain = intel.captainRating;
  const experience = intel.playoffExperience === "high" ? 0.9 : intel.playoffExperience === "medium" ? 0.7 : 0.5;
  const injuryFactor = 1 - intel.injuryRisk;

  return (depth * 0.35 + captain * 0.25 + experience * 0.25 + injuryFactor * 0.15) * 100;
}

// ─── Main Prediction Function ─────────────────────────────────────────────────

function predictPlayoffMatch({ team1, team2, venue: venueStr, matchLabel, matchDate, tossWinner = null, tossDecision = null }) {
  const t1 = String(team1).toUpperCase();
  const t2 = String(team2).toUpperCase();
  const venue = resolveVenue(venueStr);

  const intel1 = TEAM_INTEL[t1];
  const intel2 = TEAM_INTEL[t2];

  if (!intel1 || !intel2) {
    return { error: `Team data not found for ${!intel1 ? t1 : t2}` };
  }

  // ── Calculate all component scores ───────────────────────────────────────────
  const t1Scores = {
    recentForm:       calcRecentForm(intel1),
    battingStrength:  calcBattingStrength(intel1, venue),
    bowlingStrength:  calcBowlingStrength(intel1, venue),
    pitchSuitability: calcPitchSuitability(intel1, venue),
    headToHead:       calcH2HScore(t1, t2),
    tossImpact:       calcTossImpact(intel1, venue),
    squadBalance:     calcSquadBalance(intel1),
  };

  const t2Scores = {
    recentForm:       calcRecentForm(intel2),
    battingStrength:  calcBattingStrength(intel2, venue),
    bowlingStrength:  calcBowlingStrength(intel2, venue),
    pitchSuitability: calcPitchSuitability(intel2, venue),
    headToHead:       100 - calcH2HScore(t1, t2),  // inverse
    tossImpact:       calcTossImpact(intel2, venue),
    squadBalance:     calcSquadBalance(intel2),
  };

  // ── Weighted formula ──────────────────────────────────────────────────────────
  // predictionScore = recentForm*20 + battingStrength*20 + bowlingStrength*20
  //                 + pitchSuitability*15 + headToHead*10 + tossImpact*5 + squadBalance*10
  const WEIGHTS = {
    recentForm: 20,
    battingStrength: 20,
    bowlingStrength: 20,
    pitchSuitability: 15,
    headToHead: 10,
    tossImpact: 5,
    squadBalance: 10,
  };
  const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((s, v) => s + v, 0); // 100

  let t1Raw = 0, t2Raw = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    t1Raw += (t1Scores[key] / 100) * weight;
    t2Raw += (t2Scores[key] / 100) * weight;
  }

  // Normalize to probabilities
  const total = t1Raw + t2Raw;
  let t1Prob = Math.round((t1Raw / total) * 1000) / 10;
  let t2Prob = Math.round((100 - t1Prob) * 10) / 10;

  // Apply Toss Impact Adjustment if toss data is provided!
  if (tossWinner) {
    const isAhmedabad = venueStr.toLowerCase().includes("ahmedabad");
    const isDharamsala = venueStr.toLowerCase().includes("dharamsala") || venueStr.toLowerCase().includes("dharamshala");
    const isMullanpur = venueStr.toLowerCase().includes("mullanpur");

    let t1Bonus = 0;
    let t2Bonus = 0;

    if (isAhmedabad) {
      // Ahmedabad: toss winner gets +5%
      if (tossWinner === t1) t1Bonus = 5;
      if (tossWinner === t2) t2Bonus = 5;
    } else if (isDharamsala) {
      // Dharamsala: bowl first gets +4%
      const bowlFirstTeam = tossDecision === "Bowl First" ? tossWinner : (tossWinner === t1 ? t2 : t1);
      if (bowlFirstTeam === t1) t1Bonus = 4;
      if (bowlFirstTeam === t2) t2Bonus = 4;
    } else if (isMullanpur) {
      // Mullanpur: chasing gets +3%
      const chasingTeam = tossDecision === "Bowl First" ? tossWinner : (tossWinner === t1 ? t2 : t1);
      if (chasingTeam === t1) t1Bonus = 3;
      if (chasingTeam === t2) t2Bonus = 3;
    }

    t1Prob += t1Bonus - t2Bonus;
    t2Prob += t2Bonus - t1Bonus;

    // Clamp to ensure probabilities remain within reasonable bounds
    t1Prob = Math.max(10, Math.min(90, t1Prob));
    t2Prob = 100 - t1Prob;
  }

  // Ensure minimum 35% for each team (no extreme predictions in IPL)
  if (!tossWinner) {
    if (t1Prob < 35) { t1Prob = 35; t2Prob = 65; }
    if (t2Prob < 35) { t2Prob = 35; t1Prob = 65; }
  }

  const predictedWinner = t1Prob >= t2Prob ? t1 : t2;
  const gap = Math.abs(t1Prob - t2Prob);

  // ── Confidence ────────────────────────────────────────────────────────────────
  let confidence = "Medium";
  let confidenceScore = 50;
  if (gap >= 15) { confidence = "High"; confidenceScore = 80; }
  else if (gap >= 8) { confidence = "Medium-High"; confidenceScore = 65; }
  else if (gap <= 4) { confidence = "Low"; confidenceScore = 35; }

  // ── Momentum ──────────────────────────────────────────────────────────────────
  const winnerIntel = predictedWinner === t1 ? intel1 : intel2;
  const loserIntel = predictedWinner === t1 ? intel2 : intel1;
  let momentum;
  if (gap >= 12) momentum = `${predictedWinner} strong edge`;
  else if (gap >= 6) momentum = `${predictedWinner} slight edge`;
  else momentum = "Too close to call";

  // ── Key Factors ───────────────────────────────────────────────────────────────
  const keyFactors = [];

  // Pitch factor
  if (venue.seamFriendly) {
    keyFactors.push({ icon: "🏏", label: "Pitch", value: "Seam-friendly — pace attack advantage", type: "pitch" });
  } else if (venue.spinFriendly) {
    keyFactors.push({ icon: "🌀", label: "Pitch", value: "Spin-assist — spinners in middle overs", type: "pitch" });
  } else {
    keyFactors.push({ icon: "🏏", label: "Pitch", value: "Balanced surface — all-round contest", type: "pitch" });
  }

  // Toss factor
  const tossImportance = venue.dewProbability > 0.6 ? "Very Important" : venue.dewProbability > 0.4 ? "Important" : "Moderate";
  keyFactors.push({
    icon: "🪙", label: "Toss",
    value: `${tossImportance} — ${Math.round(venue.dewProbability * 100)}% dew probability`,
    type: "toss"
  });

  // Dew factor
  keyFactors.push({
    icon: "💧", label: "Dew Factor",
    value: `${venue.dewFactor.toUpperCase()} — impacts death bowling significantly`,
    type: "dew",
    severity: venue.dewProbability > 0.7 ? "high" : "medium"
  });

  // Orange cap
  keyFactors.push({
    icon: "🧡", label: "Orange Cap Impact",
    value: t1Scores.battingStrength > t2Scores.battingStrength
      ? intel1.orangeCapContributor
      : intel2.orangeCapContributor,
    type: "orange"
  });

  // Purple cap
  keyFactors.push({
    icon: "💜", label: "Purple Cap Impact",
    value: t1Scores.bowlingStrength > t2Scores.bowlingStrength
      ? intel1.purpleCapContributor
      : intel2.purpleCapContributor,
    type: "purple"
  });

  // Strengths driving prediction
  if (t1Prob > t2Prob) {
    keyFactors.push({
      icon: "⚡", label: `${t1} Advantage`,
      value: intel1.strengths[0],
      type: "strength"
    });
  } else {
    keyFactors.push({
      icon: "⚡", label: `${t2} Advantage`,
      value: intel2.strengths[0],
      type: "strength"
    });
  }

  // Head-to-head
  const h2h = getH2H(t1, t2);
  if (h2h) {
    const t1Wins = h2h[`${t1.toLowerCase()}Wins`] || (t1Prob > t2Prob ? Math.ceil(h2h.total / 2) : Math.floor(h2h.total / 2));
    const t2Wins = h2h.total - t1Wins;
    keyFactors.push({
      icon: "📊", label: "Head-to-Head",
      value: `${t1} ${t1Wins}–${t2Wins} ${t2} all-time · Recent: ${h2h.recentWinner} won last`,
      type: "h2h"
    });
  }

  // Playoff experience
  const expDiff = intel1.playoffPressureRating - intel2.playoffPressureRating;
  if (Math.abs(expDiff) > 0.1) {
    const betterTeam = expDiff > 0 ? t1 : t2;
    const betterIntel = expDiff > 0 ? intel1 : intel2;
    keyFactors.push({
      icon: "🏆", label: "Playoff Experience",
      value: `${betterTeam} better under pressure (${betterIntel.playoffExperience} experience)`,
      type: "experience"
    });
  }

  // ── Toss scenario analysis ────────────────────────────────────────────────────
  const tossScenario = {
    dewProbability: Math.round(venue.dewProbability * 100),
    preferBowlFirst: Math.round(venue.tossBowlFirst * 100),
    preferBatFirst: Math.round(venue.tossBatFirst * 100),
    tossWinnerBonus: Math.round(venue.dewProbability * 6), // % bonus for toss winner
    recommendation: venue.tossBowlFirst > 0.6 ? "Bowl First" : "Bat First",
    reason: venue.dewProbability > 0.6
      ? "High dew will aid second-innings batting significantly"
      : venue.seamFriendly
      ? "Early seam movement — bowl first to exploit conditions"
      : "Balanced — captains may prefer to chase",
  };

  // ── Detailed team analysis ────────────────────────────────────────────────────
  const teamAnalysis = {
    [t1]: {
      team: t1,
      fullName: intel1.fullName,
      captain: intel1.captain,
      winProbability: t1Prob,
      predictionScore: Math.round(t1Raw * 10) / 10,
      scores: {
        recentForm: Math.round(t1Scores.recentForm),
        battingStrength: Math.round(t1Scores.battingStrength),
        bowlingStrength: Math.round(t1Scores.bowlingStrength),
        pitchSuitability: Math.round(t1Scores.pitchSuitability),
        headToHead: Math.round(t1Scores.headToHead),
        tossImpact: Math.round(t1Scores.tossImpact),
        squadBalance: Math.round(t1Scores.squadBalance),
      },
      strengths: intel1.strengths,
      weaknesses: intel1.weaknesses,
      keyPlayer: intel1.keyPlayer,
      recentForm: `${intel1.recentFormWins}W-${intel1.recentFormLosses}L (NRR: ${intel1.recentNRR > 0 ? "+" : ""}${intel1.recentNRR})`,
      playoffExperience: intel1.playoffExperience,
      captainRating: Math.round(intel1.captainRating * 100),
      injuryRisk: Math.round(intel1.injuryRisk * 100),
    },
    [t2]: {
      team: t2,
      fullName: intel2.fullName,
      captain: intel2.captain,
      winProbability: t2Prob,
      predictionScore: Math.round(t2Raw * 10) / 10,
      scores: {
        recentForm: Math.round(t2Scores.recentForm),
        battingStrength: Math.round(t2Scores.battingStrength),
        bowlingStrength: Math.round(t2Scores.bowlingStrength),
        pitchSuitability: Math.round(t2Scores.pitchSuitability),
        headToHead: Math.round(t2Scores.headToHead),
        tossImpact: Math.round(t2Scores.tossImpact),
        squadBalance: Math.round(t2Scores.squadBalance),
      },
      strengths: intel2.strengths,
      weaknesses: intel2.weaknesses,
      keyPlayer: intel2.keyPlayer,
      recentForm: `${intel2.recentFormWins}W-${intel2.recentFormLosses}L (NRR: ${intel2.recentNRR > 0 ? "+" : ""}${intel2.recentNRR})`,
      playoffExperience: intel2.playoffExperience,
      captainRating: Math.round(intel2.captainRating * 100),
      injuryRisk: Math.round(intel2.injuryRisk * 100),
    },
  };

  // ── Summary reasoning ─────────────────────────────────────────────────────────
  const predWinnerIntel = predictedWinner === t1 ? intel1 : intel2;
  const reason = [
    `${predWinnerIntel.fullName} hold ${gap.toFixed(1)}% edge`,
    venue.seamFriendly ? `Dharamsala's seam conditions suit ${t1Scores.bowlingStrength > t2Scores.bowlingStrength ? t1 : t2}'s pace attack` : "",
    venue.dewFactor !== "moderate" ? `${venue.dewFactor.replace("_", " ")} dew at ${venue.name.split("—")[0].trim()} benefits chase team` : "",
    `${predictedWinner} playoff pressure rating: ${Math.round(predWinnerIntel.playoffPressureRating * 100)}%`,
  ].filter(Boolean).join(" · ");

  return {
    success: true,
    matchLabel: matchLabel || `${t1} vs ${t2}`,
    matchDate,
    venue: {
      name: venue.name,
      conditions: venue.conditions,
      weather: venue.weather,
      pitchType: venue.pitchType,
      avgScore: venue.avgScore,
      dewProbability: Math.round(venue.dewProbability * 100),
      chaseAdvantage: venue.chaseAdvantage,
    },
    prediction: {
      team1: t1,
      team2: t2,
      team1Probability: t1Prob,
      team2Probability: t2Prob,
      predictedWinner,
      winnerProbability: Math.max(t1Prob, t2Prob),
      loser: predictedWinner === t1 ? t2 : t1,
      confidence,
      confidenceScore,
      momentum,
      gap: parseFloat(gap.toFixed(1)),
      reason,
    },
    tossWinner,
    tossDecision,
    tossAnalysis: tossScenario,
    keyFactors,
    teamAnalysis,
    formula: {
      weights: WEIGHTS,
      team1Raw: Math.round(t1Raw * 10) / 10,
      team2Raw: Math.round(t2Raw * 10) / 10,
      totalWeight: TOTAL_WEIGHT,
    },
    generatedAt: new Date().toISOString(),
    source: "playoff_ai_engine_v3",
    liveUpdate: false,
  };
}

// ─── All Playoff Predictions ──────────────────────────────────────────────────

const PLAYOFF_MATCHES = [
  { matchId: 71, label: "Qualifier 1", team1: "RCB", team2: "GT",  venue: "Dharamsala", date: "May 26, 2026",  stage: "Q1" },
  { matchId: 72, label: "Eliminator",  team1: "SRH", team2: "RR",  venue: "Mullanpur",  date: "May 27, 2026", stage: "ELIM" },
  { matchId: 73, label: "Qualifier 2", team1: "TBD", team2: "TBD", venue: "Mullanpur",  date: "May 29, 2026", stage: "Q2" },
  { matchId: 74, label: "Final",       team1: "TBD", team2: "TBD", venue: "Ahmedabad",  date: "May 31, 2026", stage: "FINAL" },
];

function getAllPlayoffPredictions(playoffState = {}) {
  const predictions = [];

  for (const match of PLAYOFF_MATCHES) {
    const t1 = playoffState[match.stage]?.team1 || match.team1;
    const t2 = playoffState[match.stage]?.team2 || match.team2;

    if (t1 === "TBD" || t2 === "TBD") {
      predictions.push({
        matchId: match.matchId,
        label: match.label,
        stage: match.stage,
        date: match.date,
        venue: resolveVenue(match.venue).name,
        status: "TBD",
        pending: true,
        message: `Teams TBD — prediction will auto-generate once ${match.stage === "Q2" ? "Q1 & ELIM" : "Q2"} conclude`,
      });
    } else {
      const pred = predictPlayoffMatch({
        team1: t1,
        team2: t2,
        venue: match.venue,
        matchLabel: match.label,
        matchDate: match.date,
        tossWinner: playoffState[match.stage]?.tossWinner || null,
        tossDecision: playoffState[match.stage]?.tossDecision || null,
      });
      predictions.push({ matchId: match.matchId, stage: match.stage, ...pred });
    }
  }

  return {
    success: true,
    predictions,
    top4: ["RCB", "GT", "SRH", "RR"],
    generatedAt: new Date().toISOString(),
  };
}

// ─── Live recalculation trigger ───────────────────────────────────────────────

function recalcFromLiveScore(matchId, liveData, playoffState = {}, tossWinner = null, tossDecision = null) {
  const match = PLAYOFF_MATCHES.find(m => m.matchId === Number(matchId));
  if (!match) return null;

  const t1 = playoffState[match.stage]?.team1 || match.team1;
  const t2 = playoffState[match.stage]?.team2 || match.team2;
  if (t1 === "TBD" || t2 === "TBD") return null;

  // Adjust prediction based on live score and simulated toss
  const pred = predictPlayoffMatch({
    team1: t1,
    team2: t2,
    venue: match.venue,
    matchLabel: match.label,
    matchDate: match.date,
    tossWinner,
    tossDecision
  });
  if (!pred.success) return pred;

  // If live data has score, tilt probability toward chasing team with dew
  if (liveData?.score1 || liveData?.score2) {
    const venue = resolveVenue(match.venue);
    const dewBonus = venue.dewProbability * 8; // max 8% bonus for chase
    if (liveData.chasingTeam === t1) {
      pred.prediction.team1Probability += dewBonus;
      pred.prediction.team1Probability = Math.min(95, pred.prediction.team1Probability);
      pred.prediction.team2Probability = 100 - pred.prediction.team1Probability;
    }
    if (liveData.chasingTeam === t2) {
      pred.prediction.team2Probability += dewBonus;
      pred.prediction.team2Probability = Math.min(95, pred.prediction.team2Probability);
      pred.prediction.team1Probability = 100 - pred.prediction.team2Probability;
    }
    pred.liveUpdate = true;
    pred.liveScore = liveData;
  }

  if (tossWinner || liveData?.score1 || liveData?.score2) {
    pred.liveUpdate = true;
    pred.tossWinner = tossWinner;
    pred.tossDecision = tossDecision;
  }

  return pred;
}

module.exports = {
  predictPlayoffMatch,
  getAllPlayoffPredictions,
  recalcFromLiveScore,
  PLAYOFF_MATCHES,
  TEAM_INTEL,
  VENUE_DB,
};
