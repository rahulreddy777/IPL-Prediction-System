const Match = require("../models/Match");
const playerStatsService = require("./playerStatsService");
const fs = require("fs");
const path = require("path");
const { predictionDB, historyDB } = require("../config/db");

const TEAM_ALIASES = {
  "Chennai Super Kings": "CSK",
  "Mumbai Indians": "MI",
  "Royal Challengers Bengaluru": "RCB",
  "Royal Challengers Bangalore": "RCB",
  "Rajasthan Royals": "RR",
  "Sunrisers Hyderabad": "SRH",
  "Deccan Chargers": "SRH",
  "Kolkata Knight Riders": "KKR",
  "Lucknow Super Giants": "LSG",
  "Gujarat Titans": "GT",
  "Delhi Capitals": "DC",
  "Delhi Daredevils": "DC",
  "Punjab Kings": "PBKS",
  "Kings XI Punjab": "PBKS",
  "Rising Pune Supergiant": "RPS",
  "Rising Pune Supergiants": "RPS",
  "Gujarat Lions": "GL",
};

function toTeamCode(nameOrCode) {
  const raw = String(nameOrCode || "").trim();
  if (!raw) return raw;
  const upper = raw.toUpperCase();
  if (["CSK", "MI", "RCB", "RR", "SRH", "KKR", "LSG", "GT", "DC", "PBKS", "RPS", "GL"].includes(upper)) return upper;
  if (TEAM_ALIASES[raw]) return TEAM_ALIASES[raw];
  const lower = raw.toLowerCase();
  const found = Object.keys(TEAM_ALIASES).find((k) => k.toLowerCase() === lower);
  return found ? TEAM_ALIASES[found] : raw;
}

function toDisplayName(nameOrCode) {
  const code = toTeamCode(nameOrCode);
  const entries = Object.entries(TEAM_ALIASES);
  const found = entries.find(([, v]) => v === code);
  return found ? found[0] : String(nameOrCode || code);
}

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
    powerplayBonus: 0.65,
    deathBowlingDifficulty: 0.7,
    carryFactor: "excellent",
    conditions: "Fast outfield · Good carry · Seam early · Big hitting later",
    weather: "Cool evening (21°C) · Low humidity (35%) · Clear sky · Strong early swing",
    pitchType: "seam_friendly",
    paceSpinRatio: 0.72,
    tossBowlFirst: 0.62,
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
    deathBowlingDifficulty: 0.8,
    carryFactor: "moderate",
    conditions: "Balanced · New-ball movement · Slows later · Spinners useful mid-overs",
    weather: "Pleasant spring evening (27°C) · Moderate humidity (52%) · Mild breeze",
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
    deathBowlingDifficulty: 0.9,
    carryFactor: "good",
    conditions: "Batting paradise · Large boundaries · Dew major factor · 2nd innings advantage",
    weather: "Warm and humid (33°C) · Heavy dew expected (82% humidity) · Clear sky",
    pitchType: "batting_friendly",
    paceSpinRatio: 0.48,
    tossBowlFirst: 0.78,
    tossBatFirst: 0.22,
  },
  bengaluru: {
    name: "Bengaluru — M. Chinnaswamy Stadium",
    altitude: "normal",
    avgScore: 180,
    chaseAdvantage: 60,
    seamFriendly: false,
    spinFriendly: false,
    dewFactor: "moderate",
    dewProbability: 0.50,
    powerplayBonus: 0.40,
    deathBowlingDifficulty: 0.95,
    carryFactor: "good",
    conditions: "Flat batting deck · Extremely small boundaries · Hard to defend score",
    weather: "Warm evening (28°C) · Low humidity (45%) · High wind factor",
    pitchType: "batting_friendly",
    paceSpinRatio: 0.50,
    tossBowlFirst: 0.70,
    tossBatFirst: 0.30,
  },
  chennai: {
    name: "Chennai — MA Chidambaram Stadium",
    altitude: "normal",
    avgScore: 160,
    chaseAdvantage: 48,
    seamFriendly: false,
    spinFriendly: true,
    dewFactor: "low",
    dewProbability: 0.30,
    powerplayBonus: 0.45,
    deathBowlingDifficulty: 0.75,
    carryFactor: "low",
    conditions: "Dry surface · Heavy spin assistance · Slow outfield · Hard to chase",
    weather: "Hot and dry (32°C) · Low dew probability",
    pitchType: "spin_friendly",
    paceSpinRatio: 0.35,
    tossBowlFirst: 0.40,
    tossBatFirst: 0.60,
  },
  mumbai: {
    name: "Mumbai — Wankhede Stadium",
    altitude: "normal",
    avgScore: 178,
    chaseAdvantage: 63,
    seamFriendly: true,
    spinFriendly: false,
    dewFactor: "very_high",
    dewProbability: 0.80,
    powerplayBonus: 0.60,
    deathBowlingDifficulty: 0.90,
    carryFactor: "excellent",
    conditions: "Red soil bounce · Dynamic swing in powerplay · True batting paradise",
    weather: "Humid coastal evening (29°C) · Strong breeze",
    pitchType: "batting_friendly",
    paceSpinRatio: 0.65,
    tossBowlFirst: 0.75,
    tossBatFirst: 0.25,
  },
  kolkata: {
    name: "Kolkata — Eden Gardens",
    altitude: "normal",
    avgScore: 175,
    chaseAdvantage: 58,
    seamFriendly: false,
    spinFriendly: true,
    dewFactor: "moderate",
    dewProbability: 0.60,
    powerplayBonus: 0.50,
    deathBowlingDifficulty: 0.85,
    carryFactor: "good",
    conditions: "Fast outfield · Flat batting track · High boundary count",
    weather: "Warm and clear (27°C)",
    pitchType: "batting_friendly",
    paceSpinRatio: 0.50,
    tossBowlFirst: 0.65,
    tossBatFirst: 0.35,
  },
  delhi: {
    name: "Delhi — Arun Jaitley Stadium",
    altitude: "normal",
    avgScore: 165,
    chaseAdvantage: 52,
    seamFriendly: false,
    spinFriendly: true,
    dewFactor: "moderate",
    dewProbability: 0.50,
    powerplayBonus: 0.40,
    deathBowlingDifficulty: 0.80,
    carryFactor: "moderate",
    conditions: "Slow and low deck · Small boundaries · Spinners rule middle overs",
    weather: "Dry hot air (34°C)",
    pitchType: "spin_friendly",
    paceSpinRatio: 0.40,
    tossBowlFirst: 0.55,
    tossBatFirst: 0.45,
  },
  jaipur: {
    name: "Jaipur — Sawai Mansingh Stadium",
    altitude: "normal",
    avgScore: 170,
    chaseAdvantage: 54,
    seamFriendly: false,
    spinFriendly: true,
    dewFactor: "low",
    dewProbability: 0.35,
    powerplayBonus: 0.48,
    deathBowlingDifficulty: 0.78,
    carryFactor: "moderate",
    conditions: "Large boundaries · Tough to hit sixes · Balanced surface for pace/spin",
    weather: "Cool dry breeze (26°C)",
    pitchType: "balanced",
    paceSpinRatio: 0.50,
    tossBowlFirst: 0.60,
    tossBatFirst: 0.40,
  },
  lucknow: {
    name: "Lucknow — Ekana Stadium",
    altitude: "normal",
    avgScore: 162,
    chaseAdvantage: 50,
    seamFriendly: false,
    spinFriendly: true,
    dewFactor: "low",
    dewProbability: 0.40,
    powerplayBonus: 0.42,
    deathBowlingDifficulty: 0.72,
    carryFactor: "low",
    conditions: "Black soil pitch · Sluggish bounce · Defensive bowling paradise",
    weather: "Pleasant spring night (28°C)",
    pitchType: "slow",
    paceSpinRatio: 0.45,
    tossBowlFirst: 0.50,
    tossBatFirst: 0.50,
  }
};

function resolveVenue(venueStr = "") {
  const v = String(venueStr).toLowerCase();
  for (const [key, venueObj] of Object.entries(VENUE_DB)) {
    if (v.includes(key)) return venueObj;
  }
  return VENUE_DB.ahmedabad; // fallback
}

// ─── Team Intelligence Database ───────────────────────────────────────────────
const TEAM_INTEL = {
  RCB: {
    fullName: "Royal Challengers Bengaluru",
    captain: "Rajat Patidar",
    strengths: [
      "Top-order consistency (Kohli, du Plessis, Patidar)",
      "Elite pace attack (Bhuvneshwar Kumar, Hazlewood)",
      "Strong powerplay exploitation",
    ],
    weaknesses: [
      "Middle-overs collapse risk",
      "Spin vulnerability in middle overs",
      "Death bowling can leak under dew",
    ],
    recentFormWins: 4,
    recentFormLosses: 1,
    recentNRR: +0.783,
    playoffExperience: "medium",
    playoffPressureRating: 0.72,
    powerplayStrength: 0.82,
    deathBowlingStrength: 0.74,
    deathBattingStrength: 0.76,
    spinVulnerability: 0.65,
    paceStrength: 0.84,
    middleOrderStability: 0.68,
    finishingAbility: 0.72,
    squadDepth: 0.78,
    captainRating: 0.72,
    keyPlayer: "Virat Kohli",
    orangeCapContributor: "Virat Kohli (542 runs, SR 164.74)",
    purpleCapContributor: "Bhuvneshwar Kumar (24 wickets, eco 7.71)",
    injuryRisk: 0.15,
  },
  GT: {
    fullName: "Gujarat Titans",
    captain: "Shubman Gill",
    strengths: [
      "Balanced XI with world-class spin (Rashid Khan)",
      "Stable batting top-to-bottom",
      "Kagiso Rabada's pace at death",
    ],
    weaknesses: [
      "Slow starts in powerplay",
      "Death bowling under pressure",
      "Middle-over batting can stall",
    ],
    recentFormWins: 3,
    recentFormLosses: 2,
    recentNRR: +0.695,
    playoffExperience: "high",
    playoffPressureRating: 0.88,
    powerplayStrength: 0.72,
    deathBowlingStrength: 0.76,
    deathBattingStrength: 0.78,
    spinVulnerability: 0.82,
    paceStrength: 0.78,
    middleOrderStability: 0.80,
    finishingAbility: 0.76,
    squadDepth: 0.82,
    captainRating: 0.85,
    keyPlayer: "Rashid Khan",
    orangeCapContributor: "Sai Sudharsan (638 runs, SR 157.92)",
    purpleCapContributor: "Rashid Khan (19 wkts, eco 8.72)",
    injuryRisk: 0.12,
  },
  SRH: {
    fullName: "Sunrisers Hyderabad",
    captain: "Pat Cummins",
    strengths: [
      "Explosive powerplay batting (Abhishek, Ishan Kishan)",
      "Heinrich Klaasen's finishing power",
      "Travis Head's attacking starts",
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
    powerplayStrength: 0.92,
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
    ],
    weaknesses: [
      "Death overs bowling leakage",
      "Middle batting susceptible to good pace",
      "Dew exposure at death hurts bowlers",
    ],
    recentFormWins: 2,
    recentFormLosses: 3,
    recentNRR: +0.083,
    playoffExperience: "high",
    playoffPressureRating: 0.76,
    powerplayStrength: 0.76,
    deathBowlingStrength: 0.64,
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
  CSK: {
    fullName: "Chennai Super Kings",
    captain: "Ruturaj Gaikwad",
    strengths: [
      "Elite spin options on home tracks",
      "Deep batting line-up and finishing power",
      "Strategic captaincy and high playoff pedigree"
    ],
    weaknesses: [
      "Powerplay acceleration",
      "Away pacers reliability"
    ],
    recentFormWins: 2,
    recentFormLosses: 3,
    recentNRR: -0.345,
    playoffExperience: "high",
    playoffPressureRating: 0.85,
    powerplayStrength: 0.70,
    deathBowlingStrength: 0.78,
    deathBattingStrength: 0.80,
    spinVulnerability: 0.85,
    paceStrength: 0.72,
    middleOrderStability: 0.75,
    finishingAbility: 0.82,
    squadDepth: 0.80,
    captainRating: 0.80,
    keyPlayer: "Ruturaj Gaikwad",
    orangeCapContributor: "Ruturaj Gaikwad (421 runs, SR 142.10)",
    purpleCapContributor: "Matheesha Pathirana (16 wkts)",
    injuryRisk: 0.10,
  },
  MI: {
    fullName: "Mumbai Indians",
    captain: "Hardik Pandya",
    strengths: [
      "Elite pace leader (Jasprit Bumrah)",
      "Dynamic boundary-hitting power",
      "High squad depth in local talent"
    ],
    weaknesses: [
      "Middle-overs spin control",
      "Unstable team momentum"
    ],
    recentFormWins: 1,
    recentFormLosses: 4,
    recentNRR: -0.510,
    playoffExperience: "high",
    playoffPressureRating: 0.75,
    powerplayStrength: 0.75,
    deathBowlingStrength: 0.85,
    deathBattingStrength: 0.78,
    spinVulnerability: 0.60,
    paceStrength: 0.86,
    middleOrderStability: 0.70,
    finishingAbility: 0.76,
    squadDepth: 0.82,
    captainRating: 0.70,
    keyPlayer: "Jasprit Bumrah",
    orangeCapContributor: "Suryakumar Yadav (398 runs, SR 155.60)",
    purpleCapContributor: "Jasprit Bumrah (22 wkts)",
    injuryRisk: 0.16,
  },
  KKR: {
    fullName: "Kolkata Knight Riders",
    captain: "Shreyas Iyer",
    strengths: [
      "Mystery spin variety (Sunil Narine)",
      "Aggressive all-rounder options",
      "Powerful lower-order hitters"
    ],
    weaknesses: [
      "Pace reliability under dew",
      "Vulnerability to short-pitch bowling"
    ],
    recentFormWins: 2,
    recentFormLosses: 3,
    recentNRR: +0.011,
    playoffExperience: "high",
    playoffPressureRating: 0.80,
    powerplayStrength: 0.80,
    deathBowlingStrength: 0.72,
    deathBattingStrength: 0.84,
    spinVulnerability: 0.78,
    paceStrength: 0.70,
    middleOrderStability: 0.74,
    finishingAbility: 0.86,
    squadDepth: 0.84,
    captainRating: 0.78,
    keyPlayer: "Sunil Narine",
    orangeCapContributor: "Phil Salt (412 runs, SR 162.30)",
    purpleCapContributor: "Varun Chakaravarthy (18 wkts)",
    injuryRisk: 0.12,
  },
  DC: {
    fullName: "Delhi Capitals",
    captain: "Rishabh Pant",
    strengths: [
      "Dynamic middle order (Rishabh Pant, Stubbs)",
      "Quality spinner variety",
      "Strong squad hunger and aggression"
    ],
    weaknesses: [
      "Death batting consistency",
      "Squad depth in bowling"
    ],
    recentFormWins: 2,
    recentFormLosses: 3,
    recentNRR: -0.871,
    playoffExperience: "medium",
    playoffPressureRating: 0.70,
    powerplayStrength: 0.74,
    deathBowlingStrength: 0.70,
    deathBattingStrength: 0.75,
    spinVulnerability: 0.68,
    paceStrength: 0.74,
    middleOrderStability: 0.78,
    finishingAbility: 0.72,
    squadDepth: 0.72,
    captainRating: 0.75,
    keyPlayer: "Rishabh Pant",
    orangeCapContributor: "Tristan Stubbs (385 runs, SR 158.40)",
    purpleCapContributor: "Kuldeep Yadav (17 wkts)",
    injuryRisk: 0.18,
  },
  PBKS: {
    fullName: "Punjab Kings",
    captain: "Shikhar Dhawan",
    strengths: [
      "Strong swing bowling unit (Arshdeep Singh)",
      "Excellent all-round balance",
      "Fearless approach in tight runs"
    ],
    weaknesses: [
      "Top-order strike rate",
      "Finishing stability under high pressure"
    ],
    recentFormWins: 2,
    recentFormLosses: 3,
    recentNRR: +0.227,
    playoffExperience: "low",
    playoffPressureRating: 0.60,
    powerplayStrength: 0.72,
    deathBowlingStrength: 0.74,
    deathBattingStrength: 0.70,
    spinVulnerability: 0.65,
    paceStrength: 0.78,
    middleOrderStability: 0.70,
    finishingAbility: 0.70,
    squadDepth: 0.75,
    captainRating: 0.68,
    keyPlayer: "Sam Curran",
    orangeCapContributor: "Shikhar Dhawan (360 runs, SR 138.50)",
    purpleCapContributor: "Arshdeep Singh (19 wkts)",
    injuryRisk: 0.14,
  },
  LSG: {
    fullName: "Lucknow Super Giants",
    captain: "KL Rahul",
    strengths: [
      "Consistent anchoring top order (KL Rahul)",
      "High middle-overs spin control",
      "Strong disciplined bowling unit"
    ],
    weaknesses: [
      "Powerplay intent",
      "Death overs pace leakage"
    ],
    recentFormWins: 1,
    recentFormLosses: 4,
    recentNRR: -0.702,
    playoffExperience: "medium",
    playoffPressureRating: 0.68,
    powerplayStrength: 0.68,
    deathBowlingStrength: 0.72,
    deathBattingStrength: 0.76,
    spinVulnerability: 0.72,
    paceStrength: 0.72,
    middleOrderStability: 0.74,
    finishingAbility: 0.78,
    squadDepth: 0.76,
    captainRating: 0.70,
    keyPlayer: "Nicholas Pooran",
    orangeCapContributor: "Nicholas Pooran (450 runs, SR 168.20)",
    purpleCapContributor: "Ravi Bishnoi (15 wkts)",
    injuryRisk: 0.11,
  }
};

function calcRecentForm(intel) {
  const wins = intel.recentFormWins;
  const total = wins + intel.recentFormLosses;
  const winRate = total > 0 ? wins / total : 0.5;
  const nrrBonus = Math.max(0, Math.min(1, (intel.recentNRR + 1) / 2));
  const pressure = intel.playoffPressureRating;
  return (winRate * 0.5 + nrrBonus * 0.3 + pressure * 0.2) * 100;
}

function calcBattingStrength(intel, venue) {
  const powerplay = intel.powerplayStrength;
  const deathBat = intel.deathBattingStrength;
  const middleOrder = intel.middleOrderStability;
  const finishing = intel.finishingAbility;

  let venueBonus = 0;
  if (venue.pitchType === "batting_friendly") venueBonus = 5;
  else if (venue.pitchType === "seam_friendly") venueBonus = -3;

  let capBonus = intel.orangeCapContributor ? 4 : 0;
  const raw = (powerplay * 0.3 + deathBat * 0.25 + middleOrder * 0.25 + finishing * 0.2) * 100;
  return Math.max(0, Math.min(100, raw + venueBonus + capBonus));
}

function calcBowlingStrength(intel, venue) {
  const paceStr = intel.paceStrength;
  const deathBowl = intel.deathBowlingStrength;
  const squad = intel.squadDepth;

  const dewPenalty = venue.dewProbability * 8;
  const pitchBonus = venue.seamFriendly ? (paceStr * 8) : (venue.spinFriendly ? 5 : 0);
  let capBonus = intel.purpleCapContributor ? 4 : 0;

  let weatherPenalty = 0;
  if (venue.weather && venue.weather.toLowerCase().includes("humid")) {
    weatherPenalty = 3;
  }

  const raw = (paceStr * 0.35 + deathBowl * 0.35 + squad * 0.3) * 100;
  return Math.max(0, Math.min(100, raw + pitchBonus + capBonus - dewPenalty - weatherPenalty));
}

function calcPitchSuitability(intel, venue) {
  let score = 50;
  if (venue.seamFriendly) {
    score += (intel.paceStrength - 0.5) * 40;
  } else if (venue.spinFriendly) {
    score -= intel.spinVulnerability * 20;
    score += (intel.spinVulnerability > 0.75 ? 10 : 0);
  }
  score += (intel.powerplayStrength - 0.5) * venue.powerplayBonus * 30;
  if (venue.altitude === "high") {
    score += intel.paceStrength * 8;
  }
  if (venue.weather && venue.weather.toLowerCase().includes("cool")) {
    score += intel.paceStrength * 6;
  }
  return Math.max(0, Math.min(100, score));
}

function calcTossImpact(intel, venue) {
  const dewImpact = venue.dewProbability;
  const chaseStrength = intel.deathBattingStrength * 0.6 + intel.finishingAbility * 0.4;
  const tossValue = dewImpact * chaseStrength * 100;
  return Math.max(0, Math.min(100, tossValue));
}

function calcSquadBalance(intel) {
  const depth = intel.squadDepth;
  const captain = intel.captainRating;
  const experience = intel.playoffExperience === "high" ? 0.9 : intel.playoffExperience === "medium" ? 0.7 : 0.5;
  const injuryFactor = 1 - intel.injuryRisk;
  return (depth * 0.35 + captain * 0.25 + experience * 0.25 + injuryFactor * 0.15) * 100;
}

const H2H_DATA = {
  "RCB-GT": { total: 6, rcbWins: 2, gtWins: 4, gtAdvantage: true, recentWinner: "GT", recentGames: ["GT", "GT", "RCB"] },
  "GT-RCB": { total: 6, rcbWins: 2, gtWins: 4, gtAdvantage: true, recentWinner: "GT", recentGames: ["GT", "GT", "RCB"] },
  "SRH-RR": { total: 18, srhWins: 10, rrWins: 8, srhAdvantage: true, recentWinner: "SRH", recentGames: ["SRH", "RR", "SRH"] },
  "RR-SRH": { total: 18, srhWins: 10, rrWins: 8, srhAdvantage: true, recentWinner: "SRH", recentGames: ["SRH", "RR", "SRH"] },
};

function calcH2HScore(t1, t2) {
  const key = `${t1}-${t2}`;
  const rev = `${t2}-${t1}`;
  const h2h = H2H_DATA[key] || H2H_DATA[rev];
  if (!h2h) return 50;

  const total = h2h.total || 1;
  const wins = h2h[`${t1.toLowerCase()}Wins`] || (h2h.recentWinner === t1 ? Math.ceil(total / 2) : Math.floor(total / 2));
  const rate = wins / total;

  const recentGames = h2h.recentGames || [];
  const recentWins = recentGames.filter(w => w === t1).length;
  const recentScore = recentGames.length > 0 ? recentWins / recentGames.length : 0.5;

  return Math.max(0, Math.min(100, (rate * 0.5 + recentScore * 0.5) * 100));
}

async function getPrediction(matchId, options = {}) {
  let mid = Number(matchId);
  
  // If matchId is not provided or NaN, find the latest match
  if (!mid || isNaN(mid)) {
    try {
      const allMatches = await predictionDB.collection("ipl_matches_2026").find({}).sort({ matchNumber: 1 }).toArray();
      const currentMatch = allMatches.find(m => m.status === "live") || 
                           allMatches.find(m => m.status === "upcoming") || 
                           allMatches.reverse().find(m => m.status === "completed" || m.status === "result");
      if (currentMatch) {
        mid = currentMatch.matchNumber;
      } else {
        mid = 71;
      }
    } catch (e) {
      mid = 71;
    }
  }

  let actualMatch = null;
  try {
    const allMatches = await predictionDB.collection("ipl_matches_2026").find({}).toArray();
    actualMatch = allMatches.find(m => {
      const numStr = String(m.match_number || m.matchNumber || "").toLowerCase();
      if (mid === 71 && numStr.includes("qualifier 1")) return true;
      if (mid === 72 && numStr.includes("eliminator")) return true;
      if (mid === 73 && numStr.includes("qualifier 2")) return true;
      if (mid === 74 && numStr.includes("final")) return true;
      return parseInt(numStr) === mid;
    });
  } catch (err) {
    console.error("Error querying ipl_matches_2026:", err.message);
  }

  if (!actualMatch) {
    return {
      matchId: mid,
      winner: "TBD",
      team1: "TBD",
      team2: "TBD",
      team1Probability: 50,
      team2Probability: 50,
      confidence: "Low",
      momentum: "Even contest",
      strength: 50,
      weakness: 50,
      pitchSupport: 50,
      tossImpact: 50,
      recentForm: 50,
      squadBalance: 50,
      reason: ["Match not found in ipl_matches_2026"],
      timestamp: Date.now()
    };
  }

  const team1Code = toTeamCode(actualMatch.team1?.code || actualMatch.team1?.name || actualMatch.team_1 || actualMatch.team1 || "TBD");
  const team2Code = toTeamCode(actualMatch.team2?.code || actualMatch.team2?.name || actualMatch.team_2 || actualMatch.team2 || "TBD");
  
  let predictedWinner = "TBD";
  let team1Prob = 50;
  let team2Prob = 50;
  let momentum = "Even contest";
  let reasonMsg = "";

  const s1 = actualMatch.score_team_1 || actualMatch.team1?.score || "";
  const s2 = actualMatch.score_team_2 || actualMatch.team2?.score || "";
  let rawWinner = (actualMatch.winner || "").trim();
  
  let mStatus = "upcoming";
  if (rawWinner && !rawWinner.toLowerCase().includes("upcoming")) mStatus = "completed";
  else if (s1 || s2) mStatus = "live";

  if (mStatus === "completed") {
    const winnerName = typeof actualMatch.winner === 'object' ? actualMatch.winner.code || actualMatch.winner.name : actualMatch.winner;
    // Clean up winner name if it has extra text like " (won via Super Over)"
    const cleanedWinner = winnerName.split('(')[0].trim();
    predictedWinner = toTeamCode(cleanedWinner);
    team1Prob = predictedWinner === team1Code ? 100 : 0;
    team2Prob = predictedWinner === team2Code ? 100 : 0;
    momentum = `Match Completed: ${predictedWinner} won`;
    reasonMsg = `Match has already concluded. ${predictedWinner} emerged victorious.`;
  } else if (mStatus === "live") {

    const parseScore = (str) => {
      if (!str) return { runs: 0, wkts: 0, overs: 0 };
      let runs = 0, wkts = 0, overs = 0;
      const match = str.match(/(\d+)(?:\/(\d+))?\s*(?:\(([\d.]+)\))?/);
      if (match) {
        runs = parseInt(match[1]) || 0;
        wkts = parseInt(match[2]) || 0;
        overs = parseFloat(match[3]) || 0;
      }
      return { runs, wkts, overs };
    };

    const t1Score = parseScore(s1);
    const t2Score = parseScore(s2);

    let t1Advantage = 50;
    
    // Very basic heuristic
    if (t2Score.runs > 0 || t2Score.overs > 0) {
      // Second innings
      const target = t1Score.runs + 1;
      const runsNeeded = target - t2Score.runs;
      const oversLeft = 20 - t2Score.overs;
      const wktsLeft = 10 - t2Score.wkts;
      
      const rrNeeded = oversLeft > 0 ? runsNeeded / oversLeft : 999;
      if (runsNeeded <= 0) {
        t1Advantage = 0;
      } else if (wktsLeft <= 0 || oversLeft <= 0) {
        t1Advantage = 100;
      } else {
        // Base probability for chasing team
        let chaseProb = 50;
        if (rrNeeded > 10) chaseProb -= (rrNeeded - 10) * 5;
        if (rrNeeded < 8) chaseProb += (8 - rrNeeded) * 5;
        chaseProb -= (10 - wktsLeft) * 5;
        
        t1Advantage = 100 - Math.max(5, Math.min(95, chaseProb));
      }
    } else if (t1Score.runs > 0 || t1Score.overs > 0) {
      // First innings
      const rr = t1Score.overs > 0 ? t1Score.runs / t1Score.overs : 0;
      const wktsLeft = 10 - t1Score.wkts;
      t1Advantage = 50 + (rr - 8) * 3 - (10 - wktsLeft) * 2;
      t1Advantage = Math.max(10, Math.min(90, t1Advantage));
    }

    team1Prob = parseFloat(t1Advantage.toFixed(1));
    team2Prob = parseFloat((100 - t1Advantage).toFixed(1));
    predictedWinner = team1Prob > team2Prob ? team1Code : team2Code;
    momentum = team1Prob > 60 ? `${team1Code} dominating` : team2Prob > 60 ? `${team2Code} dominating` : "Even contest";
    reasonMsg = "Live Match Probability based on current score line.";
  } else {
    // For upcoming matches, user requested random generation
    predictedWinner = Math.random() > 0.5 ? team1Code : team2Code;
    team1Prob = predictedWinner === team1Code ? 52.1 : 47.9;
    team2Prob = predictedWinner === team2Code ? 52.1 : 47.9;
    momentum = "Even contest";
    reasonMsg = `Upcoming match. Randomly predicted ${predictedWinner} as winner.`;
  }

  return {
    matchId: mid,
    winner: predictedWinner,
    team1: team1Code,
    team2: team2Code,
    team1Probability: team1Prob,
    team2Probability: team2Prob,
    confidence: actualMatch.status === "completed" ? "High" : "Medium",
    momentum: momentum,
    strength: 100,
    weakness: 0,
    pitchSupport: 100,
    tossImpact: 100,
    recentForm: 100,
    squadBalance: 100,
    reason: [reasonMsg],
    prediction: {
      team1: team1Code,
      team2: team2Code,
      team1Probability: team1Prob,
      team2Probability: team2Prob,
      predictedWinner: predictedWinner,
      winnerProbability: Math.max(team1Prob, team2Prob),
      loser: predictedWinner === team1Code ? team2Code : team1Code,
      confidence: actualMatch.status === "completed" ? "High" : "Medium",
      confidenceScore: 100,
      momentum: momentum,
      gap: Math.abs(team1Prob - team2Prob),
      reason: reasonMsg
    },
    venue: {
      name: actualMatch.venue || "",
    },
    tossWinner: toTeamCode(actualMatch.tossWinner) || null,
    keyFactors: [
      { icon: "🏆", label: "Status", value: actualMatch.status, type: "status" },
      { icon: "📊", label: "Source", value: "ipl_matches_2026", type: "source" }
    ],
    teamAnalysis: {
      [team1Code]: { team: team1Code, fullName: team1Code, winProbability: team1Prob, scores: { recentForm: 100, battingStrength: 100, bowlingStrength: 100, pitchSuitability: 100, headToHead: 100, tossImpact: 100, squadBalance: 100 }, strengths: [], weaknesses: [] },
      [team2Code]: { team: team2Code, fullName: team2Code, winProbability: team2Prob, scores: { recentForm: 100, battingStrength: 100, bowlingStrength: 100, pitchSuitability: 100, headToHead: 100, tossImpact: 100, squadBalance: 100 }, strengths: [], weaknesses: [] }
    },
    timestamp: Date.now()
  };
}

// Predict IPL 2026 Tournament Winner (Compatibility Fallback)
async function predictTournament2026() {
  const teams = ["PBKS", "RR", "RCB", "SRH", "KKR", "LSG", "MI", "DC", "GT", "CSK"];
  const squadStrength = playerStatsService.getAllTeamsStrength();
  const squadStrengthMap = {};
  squadStrength.forEach(t => {
    squadStrengthMap[t.team] = t.score;
  });
  const performance = playerStatsService.getHistoricalPerformance();
  const maxSquadScore = Math.max(...Object.values(squadStrengthMap));
  const teamScores = teams.map(team => {
    const squadNorm = (squadStrengthMap[team] / maxSquadScore) * 100;
    const recentFormNorm = performance[team].recentForm;
    const h2hScore = performance[team].allTimeWinRate;
    const combinedScore = (squadNorm * 0.85) + (recentFormNorm * 0.10) + (h2hScore * 0.05);
    return {
      team,
      squadScore: squadStrengthMap[team],
      recentForm: performance[team].recentForm,
      allTimeWinRate: performance[team].allTimeWinRate,
      combinedScore: Math.round(combinedScore),
      probability: 0
    };
  });
  teamScores.sort((a, b) => b.combinedScore - a.combinedScore);
  const totalScore = teamScores.reduce((sum, t) => sum + t.combinedScore, 0);
  teamScores.forEach(t => {
    t.probability = ((t.combinedScore / totalScore) * 100).toFixed(2);
  });
  return {
    predictions: teamScores,
    predictedWinner: teamScores[0].team,
    predictedRunnerUp: teamScores[1].team,
    methodology: "Methodology: 85% 2026 Squad Analytics + 10% Recent Form + 5% Historical Win Rate"
  };
}

async function predictPlayoffs2026() {
  const result = await predictTournament2026();
  return {
    qualifier1: result.predictions[0].team,
    qualifier2: result.predictions[1].team,
    eliminator1: result.predictions[2].team,
    eliminator2: result.predictions[3].team,
    top4: result.predictions.slice(0, 4).map(t => t.team),
    allRankings: result.predictions
  };
}

async function getTeamAnalysis() {
  const squadStrength = playerStatsService.getAllTeamsStrength();
  const performance = playerStatsService.getHistoricalPerformance();
  const teams = ["PBKS", "RR", "RCB", "SRH", "KKR", "LSG", "MI", "DC", "GT", "CSK"];
  const analysis = teams.map(team => {
    const squad = squadStrength.find(t => t.team === team);
    const perf = performance[team];
    return {
      team,
      squadStrength: squad ? squad.score : 0,
      recentForm: perf.recentForm,
      allTimeWinRate: perf.allTimeWinRate,
      playerCategories: squad ? squad.categories : {},
      topPlayers: squad ? squad.topPlayers : []
    };
  });
  return analysis.sort((a, b) => b.squadStrength - a.squadStrength);
}

async function getAllMatches(options = {}) {
  let out = [];
  try {
    // 1. Fetch 2008-2024 matches from MongoDB
    const d2008to2024 = await historyDB.collection("ipl_matches_2008_2024").find({}).toArray();
    if (Array.isArray(d2008to2024)) {
      d2008to2024.forEach((m, idx) => {
        let seasonStr = String(m.season ?? m.Season ?? "");
        let seasonNum = null;
        if (seasonStr.includes("/")) {
          const parts = seasonStr.split("/");
          if (parts[0].length === 4) {
            seasonNum = Number(parts[0]) + 1; // "2007/08" -> 2008
          }
        } else {
          seasonNum = Number(seasonStr);
        }
        if (!seasonNum && m.date) {
          seasonNum = new Date(m.date).getFullYear();
        }

        out.push({
          matchNumber: m.matchNumber ?? m.MatchNumber ?? m.id ?? idx + 1,
          season: seasonNum,
          team1: toTeamCode(m.team1 || m.Team1 || m["Team 1"]),
          team2: toTeamCode(m.team2 || m.Team2 || m["Team 2"]),
          team1Score: m.team1Score ?? m.Team1Score ?? m["Team 1 Score"] ?? m.target_runs ?? null,
          team2Score: m.team2Score ?? m.Team2Score ?? m["Team 2 Score"] ?? null,
          winner: toTeamCode(m.winner || m.WinningTeam || m["Winning Team"]),
          margin: m.result_margin ?? m.margin ?? m.winning_margin ?? null,
          tossWinner: toTeamCode(m.toss_winner ?? m.tossWinner ?? m["Toss winning team"]),
          venue: Array.isArray(m.venue) ? m.venue[0] : (m.venue || m.Venue || null)
        });
      });
    }

    // 2. Fetch 2025 matches from MongoDB
    const d2025 = await historyDB.collection("ipl_matches_2025").find({}).toArray();
    if (Array.isArray(d2025)) {
      d2025.forEach((m, idx) => {
        out.push({
          matchNumber: m["Match Number"] ?? m.matchNumber ?? idx + 1,
          season: 2025,
          team1: toTeamCode(m.team1 || m.Team1 || m["Team 1"]),
          team2: toTeamCode(m.team2 || m.Team2 || m["Team 2"]),
          team1Score: m.team1Score ?? m.Team1Score ?? m["Team 1 Score"] ?? null,
          team2Score: m.team2Score ?? m.Team2Score ?? m["Team 2 Score"] ?? null,
          winner: toTeamCode(m.winner || m.WinningTeam || m["Winning Team"]),
          margin: m.result_margin ?? m.margin ?? m.winning_margin ?? null,
          tossWinner: toTeamCode(m.toss_winner ?? m.tossWinner ?? m["Toss winning team"] ?? m.winner),
          venue: Array.isArray(m.venue) ? m.venue[0] : (Array.isArray(m.Venue) ? m.Venue[0] : (m.venue || m.Venue || null))
        });
      });
    }
  } catch (err) {
    console.error("Error fetching historical matches from MongoDB:", err.message);
  }
  return out;
}

module.exports = {
  predictWinner: async (t1, t2, ven) => {
    const pred = await getPrediction(71);
    return {
      team1: toDisplayName(t1),
      team2: toDisplayName(t2),
      team1Code: toTeamCode(t1),
      team2Code: toTeamCode(t2),
      venue: ven || null,
      prediction: toDisplayName(pred.winner),
      win_probability: {
        [toDisplayName(t1)]: pred.team1Probability.toFixed(2),
        [toDisplayName(t2)]: pred.team2Probability.toFixed(2),
      },
      debug: {}
    };
  },
  predictTournament2026,
  predictPlayoffs2026,
  getTeamAnalysis,
  getAllMatches,
  getPrediction,
};
