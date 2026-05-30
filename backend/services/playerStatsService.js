const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function readJsonSafe(filename, fallback) {
  try {
    const p = path.join(DATA_DIR, filename);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {
    return fallback;
  }
}

// Load 2026 squad data
let squadData = [];
try {
  squadData = readJsonSafe("ipl_2026_master_squad.json", []);
} catch (e) {
  console.log("Could not load squad data:", e.message);
}

// Populated from MongoDB via statsDataLoader → playerService (ipl_players_stats_2026)
let rawPlayerStats = [];

// Load player name aliases to improve stat matching across datasets
let nameAliases = {};
try {
  nameAliases = readJsonSafe("name_aliases.json", {});
  console.log("Name aliases loaded:", Object.keys(nameAliases).length);
} catch (e) {
  console.log("Name aliases not loaded:", e.message);
}

// Player role weights for scoring
const roleWeights = {
  "Batter": 1.0,
  "Wicketkeeper": 1.2,
  "All-rounder": 1.5,
  "Bowler": 1.0
};

// Type weights (capped players are generally more experienced)
const typeWeights = {
  "Indian (capped)": 1.2,
  "Indian (uncapped)": 0.8,
  "Overseas (capped)": 1.3,
  "Overseas (uncapped)": 0.9
};

// Parse price from string (e.g., "7.00 crore", "30 lakh")
function parsePrice(priceStr) {
  if (!priceStr || priceStr === "-") return 0;
  
  const croreMatch = priceStr.match(/(\d+\.?\d*)\s*crore/i);
  const lakhMatch = priceStr.match(/(\d+\.?\d*)\s*lakh/i);
  
  if (croreMatch) {
    return parseFloat(croreMatch[1]) * 100; // Convert to lakh
  } else if (lakhMatch) {
    return parseFloat(lakhMatch[1]);
  }
  return 0;
}

// Populated from MongoDB: bowling_stats_2026 (replaces bowler_metrics / advanced_bowlers)
let advancedBowlerStats = [];

// Populated from MongoDB: batting_stats_2026 (replaces raw_players)
let advancedBatterStats = [];

/**
 * Inject MongoDB-loaded datasets (called once at server startup).
 */
function hydrateFromMongo({ playerStats = [], battingStats = [], bowlingStats = [] } = {}) {
  rawPlayerStats = Array.isArray(playerStats) ? playerStats : [];
  advancedBatterStats = Array.isArray(battingStats) ? battingStats : [];
  advancedBowlerStats = Array.isArray(bowlingStats) ? bowlingStats : [];

  console.log(
    `[playerStatsService] MongoDB hydrated — players: ${rawPlayerStats.length}, batting: ${advancedBatterStats.length}, bowling: ${advancedBowlerStats.length}`
  );
}

function normalizeName(name) {
  if (!name) return "";
  return String(name)
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildAliasSet(playerName) {
  const base = String(playerName || "").trim();
  const aliases = new Set([base]);
  const fromMap = nameAliases[base];
  if (Array.isArray(fromMap)) fromMap.forEach(a => aliases.add(a));
  else if (typeof fromMap === "string") aliases.add(fromMap);

  // If no direct mapping exists, try reverse-lookup:
  // allow inputs that are stored as aliases (e.g. "Surya Kumar Yadav")
  if (!fromMap) {
    Object.entries(nameAliases).forEach(([canonical, value]) => {
      const list = Array.isArray(value) ? value : (value ? [value] : []);
      if (canonical === base || list.includes(base)) {
        aliases.add(canonical);
        list.forEach(a => aliases.add(a));
      }
    });
  }

  // Also try a simple initial-based form: "Virat Kohli" -> "V Kohli"
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    aliases.add(`${parts[0][0]} ${parts[parts.length - 1]}`);
  }

  // Return normalized forms for matching
  const normalized = new Set();
  aliases.forEach(a => normalized.add(normalizeName(a)));
  return normalized;
}

function findBatterStatForPlayer(playerName) {
  const aliasSet = buildAliasSet(playerName);
  return advancedBatterStats.find(b => aliasSet.has(normalizeName(b.batter)));
}

function findBowlerStatForPlayer(playerName) {
  const aliasSet = buildAliasSet(playerName);
  return advancedBowlerStats.find(b => aliasSet.has(normalizeName(b.bowler)));
}

// Calculate individual player score
function calculatePlayerScore(player) {
  const roleWeight = roleWeights[player.Role] || 1.0;
  const typeWeight = typeWeights[player.Type] || 1.0;
  const price = parsePrice(player.Price);
  
  // Base score from price (max ~18 crore = 1800 lakh normalized to ~15 points)
  const priceScore = Math.min(price / 120, 15);
  
  let baseScore = roleWeight * typeWeight * 10;
  let analyticsBonus = 0;

  // -- NEW PREDICTION UPGRADE: ADVANCED ANALYTICS INJECTION --
  
  // 1. Batter Analytics
  if (player.Role === "Batter" || player.Role === "Wicketkeeper" || player.Role === "All-rounder") {
    const batStat = findBatterStatForPlayer(player.Player);
    if (batStat) {
      const impactBonus = (batStat.player_impact_index || 20) / 4; // ~10 points for a 40 impact
      const consistencyBonus = (batStat.consistency_index || 30) / 6; // ~9 points for a 54 consistency
      const srBonus = Math.max(0, ((batStat.strike_rate || 120) - 120) / 10); // Reward high SR
      
      const roleMultiplier = player.Role === "All-rounder" ? 0.6 : 1.0;
      analyticsBonus += (impactBonus + consistencyBonus + srBonus) * roleMultiplier;
    }
  }

  // 2. Bowler Analytics
  if (player.Role === "Bowler" || player.Role === "All-rounder") {
    const bowlStat = findBowlerStatForPlayer(player.Player);
    if (bowlStat) {
      const consistencyBonus = (bowlStat.consistency_rating || 20) / 5; // e.g. 30 -> 6 points
      const ecoBonus = Math.max(0, (9.0 - (bowlStat.xECO || 8.0)) * 3); // 7.0 xECO -> 6 points
      const xwBonus = (bowlStat.xW || 0) / 30; // e.g. 150 -> 5 points
      const trueEcoBonus = Math.max(0, (1.0 - (bowlStat.true_eco_adj || 1.0)) * 10);
      const dotBallBonus = (bowlStat.dot_ball_pct || 30) / 10; 
      const boundaryPenalty = (bowlStat.boundary_pct_conceded || 50) / 20;
      
      const roleMultiplier = player.Role === "All-rounder" ? 0.6 : 1.0;
      const totalBowlBonus = consistencyBonus + ecoBonus + xwBonus + trueEcoBonus + dotBallBonus - boundaryPenalty;
      analyticsBonus += totalBowlBonus * roleMultiplier;
    }
  }
  
  // If player lacks advanced stats (e.g. uncapped/debutant), use price as a proxy for potential
  if (analyticsBonus === 0 && (player.Type === "Indian (uncapped)" || player.Type === "Overseas (uncapped)")) {
    analyticsBonus = priceScore * 0.75; 
  }

  return baseScore + priceScore + analyticsBonus;
}

// Calculate team strength from squad data
function calculateTeamStrength(teamName) {
  const teamPlayers = squadData.filter(p => p.Team === teamName);
  
  if (teamPlayers.length === 0) {
    return { team: teamName, score: 0, players: [], categories: {} };
  }
  
  let batters = 0, bowlers = 0, allRounders = 0, wicketKeepers = 0;
  let cappedIndian = 0, uncappedIndian = 0, cappedOverseas = 0, uncappedOverseas = 0;
  let totalScore = 0;
  const players = [];
  
  teamPlayers.forEach(player => {
    const playerScore = calculatePlayerScore(player);
    totalScore += playerScore;
    players.push({
      name: player.Player,
      role: player.Role,
      score: playerScore.toFixed(2)
    });
    
    // Count by role
    if (player.Role === "Batter") batters++;
    else if (player.Role === "Bowler") bowlers++;
    else if (player.Role === "All-rounder") allRounders++;
    else if (player.Role === "Wicketkeeper") wicketKeepers++;
    
    // Count by type
    if (player.Type === "Indian (capped)") cappedIndian++;
    else if (player.Type === "Indian (uncapped)") uncappedIndian++;
    else if (player.Type === "Overseas (capped)") cappedOverseas++;
    else if (player.Type === "Overseas (uncapped)") uncappedOverseas++;
  });
  
  // Sort players by score descending
  players.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  
  return {
    team: teamName,
    score: Math.round(totalScore),
    playerCount: teamPlayers.length,
    categories: {
      batters,
      bowlers,
      allRounders,
      wicketKeepers,
      cappedIndian,
      uncappedIndian,
      cappedOverseas,
      uncappedOverseas
    },
    topPlayers: players.slice(0, 5)
  };
}

// Get all teams with their strength
function getAllTeamsStrength() {
  const teams = ["PBKS", "RR", "RCB", "SRH", "KKR", "LSG", "MI", "DC", "GT", "CSK"];
  return teams.map(team => calculateTeamStrength(team))
    .sort((a, b) => b.score - a.score);
}

// Calculate team performance from historical data
function getHistoricalPerformance() {
  // Cache to avoid re-reading JSON files on every request
  if (getHistoricalPerformance._cache) return getHistoricalPerformance._cache;

  const path = require("path");

  const TEAM_ALIASES = {
    "Chennai Super Kings": "CSK",
    "Mumbai Indians": "MI",
    "Royal Challengers Bangalore": "RCB",
    "Royal Challengers Bengaluru": "RCB",
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
    if (!raw) return "";
    const upper = raw.toUpperCase();
    if (["CSK", "MI", "RCB", "RR", "SRH", "KKR", "LSG", "GT", "DC", "PBKS", "RPS", "GL"].includes(upper)) {
      return upper;
    }
    if (TEAM_ALIASES[raw]) return TEAM_ALIASES[raw];
    const lower = raw.toLowerCase();
    const found = Object.keys(TEAM_ALIASES).find((k) => k.toLowerCase() === lower);
    return found ? TEAM_ALIASES[found] : raw;
  }

  function safeReadJson(p) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      return null;
    }
  }

  // Load consolidated historical data (preferred)
  const dataDir = path.join(__dirname, "..", "data");
  const allMatches = [];

  const d2008to2024 = safeReadJson(path.join(dataDir, "ipl matches 2008 to 2024.json.json"));
  if (Array.isArray(d2008to2024)) {
    d2008to2024.forEach((m) => {
      const season = Number(m.season ?? m.Season);
      if (!Number.isFinite(season)) return;
      allMatches.push({
        season,
        team1: toTeamCode(m.team1 || m.Team1),
        team2: toTeamCode(m.team2 || m.Team2),
        winner: toTeamCode(m.winner || m.WinningTeam || m["Winning Team"]),
      });
    });
  }

  const d2025 = safeReadJson(path.join(dataDir, "ipl matches 2025.json.json"));
  if (Array.isArray(d2025)) {
    d2025.forEach((m) => {
      allMatches.push({
        season: 2025,
        team1: toTeamCode(m["Team 1"] || m.Team1 || m.team1),
        team2: toTeamCode(m["Team 2"] || m.Team2 || m.team2),
        winner: toTeamCode(m.winner || m["Winning Team"] || m.WinningTeam),
      });
    });
  }
  
  const teams = ["PBKS", "RR", "RCB", "SRH", "KKR", "LSG", "MI", "DC", "GT", "CSK"];
  const performance = {};
  
  teams.forEach(team => {
    // Recent form (2023-2025)
    const recentMatches = allMatches.filter(m => 
      m.season >= 2023 && m.season <= 2025 && (m.team1 === team || m.team2 === team)
    );
    const recentWins = recentMatches.filter(m => m.winner === team).length;
    const recentTotal = recentMatches.length;
    const recentForm = recentTotal > 0 ? (recentWins / recentTotal) * 100 : 50;
    
    // All-time stats (all seasons)
    const allTimeMatches = allMatches.filter(m => 
      m.team1 === team || m.team2 === team
    );
    const allTimeWins = allTimeMatches.filter(m => m.winner === team).length;
    const allTimeTotal = allTimeMatches.length;
    const allTimeWinRate = allTimeTotal > 0 ? (allTimeWins / allTimeTotal) * 100 : 50;
    
    performance[team] = {
      recentWins,
      recentTotal,
      recentForm: Math.round(recentForm),
      allTimeWins,
      allTimeTotal,
      allTimeWinRate: Math.round(allTimeWinRate)
    };
  });
  
  getHistoricalPerformance._cache = performance;
  return performance;
}

// Load caps data from dedicated JSON file
let capsData = [];
try {
  capsData = readJsonSafe("ipl_caps.json", []);
  console.log('IPL Caps data loaded:', capsData.length, 'seasons');
} catch (e) {
  console.log('Caps data not loaded:', e.message);
}

function getOrangePurpleCaps(season) {
  if (season === 'all') {
    return capsData.map(c => ({
      orangeCap: { player: c.OrangeCap, runs: c.Runs },
      purpleCap: { player: c.PurpleCap, wickets: c.Wickets },
      season: c.Season
    }));
  }

  const capSeason = capsData.find(c => c.Season == season);
  if (capSeason) {
    return {
      orangeCap: { player: capSeason.OrangeCap, runs: capSeason.Runs },
      purpleCap: { player: capSeason.PurpleCap, wickets: capSeason.Wickets },
      type: `Season ${season}`,
      season: capSeason.Season
    };
  }

  return {
    orangeCap: { player: 'N/A', runs: 0 },
    purpleCap: { player: 'N/A', wickets: 0 },
    type: `Season ${season} (Data N/A)`,
    season: parseInt(season)
  };
}

// Expose raw player stats, with optional basic filtering by team or category
function getRawPlayerStats({ team, category } = {}) {
  let result = rawPlayerStats;

  if (team) {
    const teamNorm = String(team).trim().toLowerCase();
    result = result.filter(p => String(p.Team || "").trim().toLowerCase() === teamNorm);
  }

  if (category) {
    const categoryNorm = String(category).trim().toLowerCase();
    result = result.filter(p => String(p.Category || "").trim().toLowerCase() === categoryNorm);
  }

  return result;
}

function toNumberMaybe(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/,/g, "").trim();
  if (!s || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeRawPlayerStatRow(row) {
  const matches = row.Matches ?? row.Mat ?? null;
  const runs = row.Runs ?? null;
  const avg = row.Avg ?? null;
  const hundredFifty = row["100s/50s"] ?? null;

  const wickets = row.Wickets ?? row.Wkts ?? null;
  const bestFigures = row.Best ?? null;
  const bowlingStyle = row.Style ?? null;
  const bowlingAverage = row["Bowl Avg"] ?? row["Bowling Average"] ?? row["Bowling Avg"] ?? null;
  const bowlingStrikeRate = row["Bowl SR"] ?? row["Bowling Strike Rate"] ?? row["Bowling SR"] ?? null;
  const catches = row.Catches ?? row.Catch ?? null;

  // Some rows store either strike rate or economy in "SR / Econ"
  const sr = row.SR ?? null;
  const econ = row.Econ ?? null;
  const srOrEcon = row["SR / Econ"] ?? null;

  const srNum = toNumberMaybe(srOrEcon);
  const strikeRate = sr ?? (srNum !== null && srNum >= 30 ? String(srOrEcon) : null);
  const economy = econ ?? (srNum !== null && srNum < 30 ? String(srOrEcon) : null);

  return {
    team: row.Team ?? row.team ?? null,
    category: row.Category ?? row.category ?? null,
    player: row.Player ?? row.player ?? null,
    role: row.Role ?? row.role ?? null,
    matches: matches ?? null,
    runs: runs ?? null,
    average: avg ?? null,
    strikeRate: strikeRate ?? null,
    hundredsFifties: hundredFifty ?? null,
    wickets: wickets ?? null,
    economy: economy ?? null,
    bestFigures: bestFigures ?? null,
    bowlingStyle: bowlingStyle ?? null,
    bowlingAverage: bowlingAverage ?? null,
    bowlingStrikeRate: bowlingStrikeRate ?? null,
    catches: catches ?? null
  };
}

function getNormalizedPlayerStats({ team, category } = {}) {
  return getRawPlayerStats({ team, category }).map(normalizeRawPlayerStatRow);
}

function normalizeRawPlayerStatRowForPlayerTeam(row, teamCode, playerName, role) {
  // Start from whatever exists in the custom sheet row (if any)
  const base = row ? normalizeRawPlayerStatRow(row) : {
    team: teamCode || null,
    category: null,
    player: playerName || null,
    role: role || null,
    matches: null,
    runs: null,
    average: null,
    strikeRate: null,
    hundredsFifties: null,
    wickets: null,
    economy: null,
    bestFigures: null,
    bowlingStyle: null
  };

  // If the custom sheet doesn't have data, try to fill from historical advanced datasets by name (team-agnostic)
  const playerKey = String(playerName || "").trim();

  // Batter dataset provides matches/runs/avg/strike_rate/hundreds/fifties
  const bat = findBatterStatForPlayer(playerKey);
  if (bat) {
    if (base.matches == null) base.matches = bat.matches != null ? String(bat.matches) : base.matches;
    if (base.runs == null) base.runs = bat.runs != null ? String(bat.runs) : base.runs;
    if (base.average == null) base.average = bat.batting_average != null ? Number(bat.batting_average).toFixed(2) : base.average;
    if (base.strikeRate == null) base.strikeRate = bat.strike_rate != null ? Number(bat.strike_rate).toFixed(2) : base.strikeRate;
    if (base.hundredsFifties == null && (bat.hundreds != null || bat.fifties != null)) {
      base.hundredsFifties = `${bat.hundreds ?? 0} / ${bat.fifties ?? 0}`;
    }
  }

  // Bowler dataset provides matches/wickets/eco/BBI
  const bowl = findBowlerStatForPlayer(playerKey);
  if (bowl) {
    if (base.matches == null) base.matches = bowl.matches != null ? String(bowl.matches) : base.matches;
    if (base.wickets == null) base.wickets = bowl.wickets != null ? String(bowl.wickets) : base.wickets;
    if (base.economy == null) base.economy = bowl.eco != null ? Number(bowl.eco).toFixed(2) : base.economy;
    if (base.bestFigures == null) base.bestFigures = bowl.BBI != null ? String(bowl.BBI) : base.bestFigures;
    if (base.bowlingAverage == null) base.bowlingAverage = bowl.bowling_avg != null ? Number(bowl.bowling_avg).toFixed(2) : base.bowlingAverage;
    if (base.bowlingStrikeRate == null) base.bowlingStrikeRate = bowl.bowling_sr != null ? Number(bowl.bowling_sr).toFixed(2) : base.bowlingStrikeRate;
    // bowlingStyle isn't in the advanced dataset; leave null
  }

  return base;
}

function normalizeKeyName(raw) {
  return String(raw || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeTeamCode(raw) {
  const t = String(raw || "").toLowerCase();
  if (t.includes("csk")) return "CSK";
  if (t.includes("mi")) return "MI";
  if (t.includes("lsg")) return "LSG";
  if (t.includes("srh")) return "SRH";
  if (t.includes("rcb")) return "RCB";
  if (t.includes("rr")) return "RR";
  if (t.includes("gt")) return "GT";
  if (t.includes("pbks")) return "PBKS";
  if (t.includes("dc")) return "DC";
  if (t.includes("kkr")) return "KKR";
  return String(raw || "").trim();
}

function buildRawPlayerStatsIndex() {
  const index = new Map();
  rawPlayerStats.forEach((row) => {
    const team = normalizeTeamCode(row.Team || row.team);
    const name = normalizeKeyName(row.Player || row.player);
    if (!team || !name) return;
    index.set(`${team}::${name}`, row);
  });
  return index;
}

function getNormalizedStatsForSquadPlayers(squadPlayers, { team } = {}) {
  const idx = buildRawPlayerStatsIndex();
  const list = Array.isArray(squadPlayers) ? squadPlayers : [];
  const filtered = team ? list.filter(p => String(p.Team || "").toUpperCase() === String(team).toUpperCase()) : list;

  return filtered.map((p) => {
    const teamCode = String(p.Team || "").toUpperCase();
    const playerName = p.Player;
    const role = p.Role;
    const key = `${teamCode}::${normalizeKeyName(playerName)}`;
    const rawRow = idx.get(key) || null;
    return normalizeRawPlayerStatRowForPlayerTeam(rawRow, teamCode, playerName, role);
  });
}

module.exports = {
  hydrateFromMongo,
  calculateTeamStrength,
  getAllTeamsStrength,
  getHistoricalPerformance,
  calculatePlayerScore,
  getOrangePurpleCaps,
  getRawPlayerStats,
  normalizeRawPlayerStatRow,
  getNormalizedPlayerStats,
  getNormalizedStatsForSquadPlayers,
};


