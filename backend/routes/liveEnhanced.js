/**
 * GET /api/live-enhanced
 * Returns a merged payload:
 *  - agentResults   : completed matches with actual winners + prediction accuracy
 *  - liveMatches    : currently live IPL matches with live scores from CricAPI
 *                     + manually injected match from live_match_state.json
 *  - agentStats     : running accuracy stats
 * The frontend uses these to overlay live/completed data on the prediction cards.
 */
const express = require("express");
const router  = express.Router();
const fs      = require("fs");
const path    = require("path");
const agent   = require("../services/liveMatchAgent");
const liveSvc = require("../services/liveScoreService");
const { isLiveMatchState } = require("../services/liveMatchEnrichment");

const STATE_PATH = path.join(__dirname, "../data/live_match_state.json");

/* ── team-name → code helper ── */
const TEAM_MAP = {
  "mumbai indians":              "MI",
  "chennai super kings":         "CSK",
  "kolkata knight riders":       "KKR",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "royal challengers":           "RCB",
  "delhi capitals":              "DC",
  "rajasthan royals":            "RR",
  "sunrisers hyderabad":         "SRH",
  "punjab kings":                "PBKS",
  "lucknow super giants":        "LSG",
  "gujarat titans":              "GT",
};
const SHORT_CODES = new Set(Object.values(TEAM_MAP));
function toCode(name = "") {
  if (!name) return null;
  const upper = name.trim().toUpperCase();
  if (SHORT_CODES.has(upper)) return upper;
  const lower = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(TEAM_MAP)) {
    if (lower.includes(k)) return v;
  }
  return null;
}

/* ── Read manually injected currentLive from JSON file ── */
function getManualLiveEntry() {
  try {
    if (!fs.existsSync(STATE_PATH)) return null;
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const cl = state.currentLive;
    if (!cl || cl.isLive === false || !cl.team1 || !cl.team2) return null;

    const toss = state.tossResults?.[`m${cl.matchNumber}`];
    const scoreMap = {};

    if (cl.score1) {
      const [r, w] = cl.score1.split("/");
      const ovStr = cl.overs1 ? ` (${cl.overs1} ov)` : "";
      scoreMap[cl.team1] = `${cl.score1}${ovStr}`;
    }
    if (cl.score2) {
      const ovStr = cl.overs2 ? ` (${cl.overs2} ov)` : "";
      scoreMap[cl.team2] = `${cl.score2}${ovStr}`;
    }

    return {
      cricApiId:   `manual-m${cl.matchNumber}`,
      matchNumber: cl.matchNumber,
      name:        `${cl.team1} vs ${cl.team2}, Match ${cl.matchNumber}`,
      status:      cl.status || `${cl.team1} vs ${cl.team2} — Live`,
      statusText:  cl.statusText || "",
      teams:       [cl.team1, cl.team2],
      scoreMap,
      isLive:      true,
      isCompleted: false,
      tossWinner:  toss?.winner || cl.toss?.winner || null,
      tossChoice:  toss?.choice || cl.toss?.choice || null,
      source:      "manual",
    };
  } catch (e) {
    console.warn("[live-enhanced] getManualLiveEntry:", e.message);
    return null;
  }
}

router.get("/", async (req, res) => {
  try {
    /* 1 ── Agent completed results */
    const agentResults = agent.getResults();
    const agentStats   = agent.getStats();

    /* 2 ── Live scores from CricAPI */
    let liveMatches = [];
    try {
      const liveData = await liveSvc.getLiveScores();
      const all = liveData.data || [];

      liveMatches = all
        .filter(m => {
          if (!m || m.source === "schedule") return false;
          if (m.source === "manual-injection") return true;   // always include manual
          const st = (m.matchType || m.status || "").toLowerCase();
          return st.includes("t20") || st.includes("ipl");
        })
        .map(m => {
          const teamCodes = (m.teams || []).map(t => toCode(t)).filter(Boolean);
          const scoreMap = {};
          (m.score || []).forEach(s => {
            const code = toCode(s.inning || "");
            if (code) {
              const ovStr = s.o ? ` (${s.o} ov)` : "";
              scoreMap[code] = `${s.r}/${s.w}${ovStr}`;
            }
          });
          // Also read direct score fields for manual-injection entries
          if (m.source === "manual-injection") {
            if (m.team1 && m.team1Score) {
              const w = m.team1Wickets ?? "?";
              const o = m.team1Overs ? ` (${m.team1Overs} ov)` : "";
              scoreMap[m.team1] = `${m.team1Score}/${w}${o}`;
            }
            if (m.team2 && m.team2Score) {
              const w = m.team2Wickets ?? "?";
              const o = m.team2Overs ? ` (${m.team2Overs} ov)` : "";
              scoreMap[m.team2] = `${m.team2Score}/${w}${o}`;
            }
          }
          const inPlay = !m.matchEnded && !!(m.matchStarted || m.isLive || isLiveMatchState(m));
          return {
            cricApiId:   m.id,
            matchNumber: m.matchNumber || null,
            name:        m.name,
            status:      m.status,
            teams:       teamCodes.length === 2 ? teamCodes : [m.team1, m.team2].filter(Boolean),
            scoreMap,
            isLive:      inPlay,
            isCompleted: !!m.matchEnded,
            tossWinner:  m.tossWinner || null,
            tossChoice:  m.tossChoice || null,
            source:      m.source || "api",
          };
        })
        .filter(m => m.teams.length === 2);
    } catch (liveErr) {
      console.warn("[live-enhanced] Live scores fetch failed:", liveErr.message);
    }

    /* 3 ── Inject manually-set live match (takes priority over API if teams match) */
    const manual = getManualLiveEntry();
    if (manual) {
      const alreadyPresent = liveMatches.some(m =>
        m.teams.includes(manual.teams[0]) && m.teams.includes(manual.teams[1])
      );
      if (!alreadyPresent) {
        liveMatches.unshift(manual);
        console.log(`[live-enhanced] Manual live injected: M${manual.matchNumber} ${manual.teams[0]} vs ${manual.teams[1]}`);
      } else {
        // Merge scores from manual into the existing entry if API entry is missing scores
        liveMatches = liveMatches.map(m => {
          if (m.teams.includes(manual.teams[0]) && m.teams.includes(manual.teams[1])) {
            return {
              ...m,
              scoreMap: Object.keys(m.scoreMap || {}).length > 0 ? m.scoreMap : manual.scoreMap,
              status:   m.status || manual.status,
              tossWinner: m.tossWinner || manual.tossWinner,
              tossChoice: m.tossChoice || manual.tossChoice,
              isLive: true,
            };
          }
          return m;
        });
      }
    }

    res.json({
      success: true,
      agentResults,
      agentStats,
      liveMatches,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
