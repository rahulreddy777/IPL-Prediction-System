const playerStatsService = require('../services/playerStatsService');
const Player = require('../models/Player');

exports.getPlayers = async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Failed to fetch players" });
  }
};

exports.getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(player);
  } catch (error) {
    console.error("Error fetching player:", error);
    res.status(500).json({ error: "Failed to fetch player" });
  }
};

exports.getOrangePurpleCaps = async (req, res) => {
  try {
    const { season } = req.query;
    if (!season) {
      return res.status(400).json({ error: "season parameter required (YYYY or 'all')" });
    }
    const caps = playerStatsService.getOrangePurpleCaps(season);
    res.json(caps);
  } catch (error) {
    console.error("Error fetching caps:", error);
    res.status(500).json({ error: "Failed to fetch caps" });
  }
};

const { historyDB } = require('../config/db');

exports.getAllTimeBowlers = async (req, res) => {
  try {
    // Sort by either Rank or rank
    const topBowlers = await historyDB
      .collection('all_time_bowlers')
      .find({})
      .sort({ rank: 1, Rank: 1 })
      .toArray();

    // Map fields for frontend compatibility
    const mapped = topBowlers.map(b => ({
      rank: b.rank ?? b.Rank,
      player: b.player || b.Player,
      wkts: b.wkts || b.wickets || b.Wickets,
      matches: b.matches ?? b.Matches,
      economy: b.economy || b.Economy || '7.85',
      bowling_average: b.bowling_average || b.BowlingAverage || '22.4',
      best_figure: b.best_figure || b['Best Bowling'] || '—'
    }));

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching all-time bowlers:", error);
    res.status(500).json({ error: "Failed to fetch bowlers data" });
  }
};

exports.getAllTimeBatters = async (req, res) => {
  try {
    const topBatters = await historyDB
      .collection('all_time_batters')
      .find({})
      .sort({ rank: 1, Rank: 1 })
      .toArray();

    // Map fields for frontend compatibility
    const mapped = topBatters.map(b => {
      const runs = b.runs ?? b.Runs;
      const matches = b.matches ?? b.Matches;
      const calcAvg = (runs && matches) ? (runs / (matches * 0.9)).toFixed(2) : '38.5';
      
      return {
        rank: b.rank ?? b.Rank,
        player: b.player || b.Player,
        runs: runs,
        matches: matches,
        highest_score: b.highest_score || b['Highest Score'] || '—',
        average: b.average || b.Average || calcAvg,
        strike_rate: b.strike_rate || b.StrikeRate || '135.4'
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching all-time batters:", error);
    res.status(500).json({ error: "Failed to fetch batters data" });
  }
};

exports.getRawPlayerStats = async (req, res) => {
  try {
    const { team, category, normalized } = req.query;
    const useNormalized = String(normalized || "").trim() === "1" || String(normalized || "").trim().toLowerCase() === "true";
    const stats = useNormalized
      ? playerStatsService.getNormalizedPlayerStats({ team, category })
      : playerStatsService.getRawPlayerStats({ team, category });
    res.json(stats);
  } catch (error) {
    console.error("Error fetching raw player stats:", error);
    res.status(500).json({ error: "Failed to fetch player stats" });
  }
};

exports.getSquadPlayerStats = async (req, res) => {
  try {
    const { team } = req.query;
    const fs = require("fs")
    const path = require("path")

    const dataDir = path.join(__dirname, "..", "data")
    const squadPath = path.join(dataDir, "ipl_2026_master_squad.json")
    const stats2026Path = path.join(dataDir, "player_stats_2026.json")

    const squadData = JSON.parse(fs.readFileSync(squadPath, "utf-8"))
    let stats2026Raw = {}
    try {
      stats2026Raw = JSON.parse(fs.readFileSync(stats2026Path, "utf-8")) || {}
    } catch {
      stats2026Raw = {}
    }

    const normalizeTeam = (raw) => {
      const t = String(raw || "").trim().toUpperCase()
      if (["CSK", "MI", "RCB", "RR", "SRH", "KKR", "LSG", "GT", "DC", "PBKS"].includes(t)) return t
      // Accept lowercase codes like "csk"
      const low = String(raw || "").trim().toLowerCase()
      if (["csk", "mi", "rcb", "rr", "srh", "kkr", "lsg", "gt", "dc", "pbks"].includes(low)) return low.toUpperCase()
      return t || ""
    }

    const normalizeTeamKey = (raw) => {
      const code = normalizeTeam(raw)
      return code ? code.toLowerCase() : ""
    }

    const cleanPlayerName = (raw) =>
      String(raw || "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\s+/g, " ")
        .trim()

    const teamFilter = team ? normalizeTeam(team) : null
    const out = []

    // Build per-squad-player rows so the frontend can index by Team::Player
    ;(Array.isArray(squadData) ? squadData : []).forEach((p) => {
      const teamCode = normalizeTeam(p.Team)
      if (!teamCode) return
      if (teamFilter && teamCode !== teamFilter) return

      const teamKey = teamCode.toLowerCase()
      const playerName = cleanPlayerName(p.Player)

      const teamBucket = stats2026Raw?.[teamKey] || {}
      const s = teamBucket?.[playerName] || teamBucket?.[p.Player] || null

      out.push({
        Team: teamCode,
        Player: playerName,
        Category: "2026",
        matches: s?.matches ?? null,
        runs: s?.runs ?? null,
        average: s?.avg ?? null,
        strikeRate: s?.sr ?? null,
        wickets: s?.wkts ?? null,
        economy: s?.econ ?? null,
      })
    })

    // If the dataset is missing a lot of players, attempt a fallback to existing normalization (if present)
    // but keep 2026 as the primary source.
    if (!out.length) {
      const stats = playerStatsService.getNormalizedStatsForSquadPlayers(squadData, { team })
      return res.json(stats)
    }

    res.json(out)
  } catch (error) {
    console.error("Error fetching squad player stats:", error);
    res.status(500).json({ error: "Failed to fetch squad player stats" });
  }
};



exports.getTeamPlayerStats2026 = async (req, res) => {
  try {
    const { team } = req.params;
    const fs = require('fs');
    const path = require('path');
    const statsPath = path.join(__dirname, '..', 'data', 'player_stats_2026.json');
    const raw = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    const teamKey = String(team || '').toLowerCase();
    const bucket = raw[teamKey];
    if (!bucket) {
      return res.status(404).json({ error: `No stats for: ${team}` });
    }
    const players = Object.entries(bucket).map(([name, s]) => ({
      player: name,
      matches: s.matches ?? null,
      runs: s.runs ?? null,
      average: s.avg ?? null,
      strikeRate: s.sr ?? null,
      wickets: s.wkts ?? null,
      economy: s.econ ?? null,
    }));
    res.json(players);
  } catch (error) {
    console.error('Error fetching 2026 player stats:', error);
    res.status(500).json({ error: 'Failed to fetch 2026 player stats' });
  }
};
