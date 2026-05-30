/**
 * IPL Chatbot Service — Smart intent-based responses using real live data
 * No external LLM API key needed. All data from CricAPI + ML Agent.
 */
const liveAgent    = require("./liveMatchAgent");
const liveScores   = require("./liveScoreService");
const path         = require("path");
const fs           = require("fs");

/* ── Schedule JSON (fields: Match, Date, Day, Matchup, Venue, Time_IST) ── */
let SCHEDULE = [];
try {
  const p = path.join(__dirname, "../data/ipl_2026_matches_schedule.json");
  SCHEDULE = JSON.parse(fs.readFileSync(p, "utf8"));
} catch { SCHEDULE = []; }

const TEAM_NAMES = {
  CSK:"Chennai Super Kings", MI:"Mumbai Indians", KKR:"Kolkata Knight Riders",
  RCB:"Royal Challengers Bengaluru", DC:"Delhi Capitals", RR:"Rajasthan Royals",
  SRH:"Sunrisers Hyderabad", GT:"Gujarat Titans", PBKS:"Punjab Kings",
  LSG:"Lucknow Super Giants"
};

const KEY_PLAYERS = {
  MI:  ["Jasprit Bumrah (World #1 bowler)","Rohit Sharma","Surya Kumar Yadav","Tilak Varma","Will Jacks"],
  CSK: ["Sanju Samson","Ruturaj Gaikwad","Ravindra Jadeja","Noor Ahmad","Matheesha Pathirana"],
  KKR: ["Varun Chakravarthy","Finn Allen","Cameron Green","Rinku Singh","Sunil Narine"],
  RCB: ["Virat Kohli","Jacob Bethell","Josh Hazlewood","Faf du Plessis","Krunal Pandya"],
  DC:  ["Axar Patel","Kuldeep Yadav","KL Rahul","David Miller","Tristan Stubbs"],
  RR:  ["Vaibhav Suryavanshi","Riyan Parag","Jofra Archer","Shimron Hetmyer","Yuzvendra Chahal"],
  SRH: ["Travis Head","Abhishek Sharma","Heinrich Klaasen","Harshal Patel","Nitish Reddy"],
  GT:  ["Rashid Khan","Sai Sudharsan","Kagiso Rabada","Prasidh Krishna","Shubman Gill"],
  PBKS:["Shreyas Iyer","Arshdeep Singh","Glenn Maxwell","Jonny Bairstow","Marco Jansen"],
  LSG: ["Rishabh Pant","Nicholas Pooran","Mohammed Shami","Ravi Bishnoi","Marcus Stoinis"]
};

const STRENGTH = {
  MI:{overall:97,rank:1}, GT:{overall:94,rank:2}, DC:{overall:89,rank:3},
  KKR:{overall:88,rank:4}, SRH:{overall:83,rank:5}, RCB:{overall:80,rank:6},
  CSK:{overall:79,rank:7}, RR:{overall:76,rank:8}, LSG:{overall:74,rank:9}, PBKS:{overall:71,rank:10}
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function detectTeam(msg) {
  const m = msg.toUpperCase();
  for (const [code, name] of Object.entries(TEAM_NAMES)) {
    if (m.includes(code) || m.includes(name.toUpperCase())) return code;
  }
  return null;
}

function detectMatchNum(msg) {
  const m = msg.match(/match\s*(\d+)/i) || msg.match(/\bm(\d+)\b/i);
  return m ? parseInt(m[1]) : null;
}

// Matchup field is "KKR vs SRH" — split it
function parseTeams(sched) {
  if (!sched || !sched.Matchup) return [null, null];
  const parts = sched.Matchup.split(" vs ");
  return [parts[0]?.trim() || null, parts[1]?.trim() || null];
}

function fmtMatch(s) {
  return `📅 Match ${s.Match}: **${s.Matchup}**\n📍 ${s.Venue} | 🗓️ ${s.Date}, ${s.Day} at ${s.Time_IST}`;
}

/* ── INTENT HANDLERS ─────────────────────────────────────────────────────── */

async function handleLiveScore() {
  const results = liveAgent.getResults();
  const stats = liveAgent.getStats();
  const upcoming = SCHEDULE.filter((s) => !results.find((r) => r.matchNumber === s.Match));

  let ls = { data: [], provider: "offline", liveCount: 0 };
  try {
    ls = await liveScores.getLiveScores();
  } catch {
    /* offline */
  }

  const rows = ls.data || [];
  const live = rows.filter(
    (m) =>
      m &&
      m.source !== "schedule" &&
      !m.matchEnded &&
      (m.matchStarted ||
        String(m.status || "")
          .toLowerCase()
          .includes("live"))
  );

  if (live.length > 0) {
    const lines = live.map((m) => {
      const toss =
        m.tossWinner && m.tossChoice
          ? `\n  🪙 **Toss:** ${m.tossWinner} elected to ${
              m.tossChoice === "field" ? "field (chase)" : "bat first"
            }`
          : "";
      const scores = (m.score || []).length
        ? (m.score || [])
            .map(
              (s) => `  📊 **${s.inning}:** ${s.r}/${s.w} (${s.o} ov)`
            )
            .join("\n")
        : `  📡 _Status:_ ${String(m.status || "").slice(0, 140)}`;
      return `🔴 **${m.name}**${toss}\n${scores}\n📌 ${m.status}\n🔗 _Source:_ ${m.source || ls.provider}`;
    });
    return (
      `🔴 **LIVE IPL — Right Now** (${ls.provider})\n\n` +
      `${lines.join("\n\n")}\n\n` +
      `_Live scores from MongoDB cache + WebSocket (no polling). API refresh manual only._`
    );
  }

  const justFinished = rows.filter(
    (m) => m.matchEnded && /won|win/i.test(String(m.status || ""))
  );
  let reply = "";

  if (justFinished.length > 0) {
    reply += `🏁 **RECENT COMPLETE (from feed):**\n\n`;
    for (const m of justFinished.slice(0, 2)) {
      reply += `🏏 **${m.name}**\n🏆 ${m.status}\n\n`;
    }
  }

  reply += `📡 **No IPL match is live in the feed right now.**\n`;
  reply += `_(Provider: ${ls.provider})_\n\n`;

  if (results.length > 0) {
    const latest = [...results].reverse().slice(0, 3);
    reply += `🏁 **STORED RESULTS (2026):**\n`;
    for (const r of latest) {
      const tick =
        r.predictionCorrect === true
          ? "✅"
          : r.predictionCorrect === false
          ? "❌"
          : "⚪";
      reply += `${tick} **M${r.matchNumber}** ${r.matchup}\n`;
      reply += `   🏆 ${r.winMargin || r.actualWinner + " won"}\n\n`;
    }
    reply += `🤖 ML Accuracy: **${stats.accuracyPct}%** (${stats.correctPredictions}/${
      stats.withPrediction || stats.totalCompleted
    })\n\n`;
  }

  if (upcoming.length > 0) {
    const next = upcoming[0];
    const [t1, t2] = next.Matchup.split(" vs ");
    const s1 = STRENGTH[t1?.trim()],
      s2 = STRENGTH[t2?.trim()];
    const fav =
      s1 && s2 ? (s1.overall > s2.overall ? t1?.trim() : t2?.trim()) : null;
    reply += `📅 **NEXT MATCH:**\n`;
    reply += `🏏 **${next.Matchup}**\n`;
    reply += `📍 ${next.Venue} | 🗓️ ${next.Date}, ${next.Day} at **${next.Time_IST}**\n`;
    if (fav)
      reply += `🤖 ML Favourite: **${fav}** (${s1?.overall} vs ${s2?.overall})`;
  }

  return reply;
}

async function handleTossIntel() {
  try {
    const intel = require("./liveIntelService");
    const d = await intel.getLiveIntelligence();
    const cur = d.currentLive;
    if (!cur) {
      return (
        "🪙 **Toss / live state:** No live IPL match is synced from the API right now.\n\n" +
        "Try **live score** when a game is on air — toss is parsed automatically from the feed when available."
      );
    }
    const t = cur.toss;
    const tossLine = t
      ? `🪙 **Toss:** ${t.winner} elected to ${t.choice === "field" ? "field (chase)" : "bat first"}`
      : "🪙 **Toss:** _Not captured yet (waiting for feed or toss line in status)._";
    const prob = cur.winProb
      ? `🤖 **AI win %:** ${cur.team1} ${cur.winProb[cur.team1]}% · ${cur.team2} ${cur.winProb[cur.team2]}%`
      : "";
    return (
      `**Match ${cur.matchNumber}** · ${cur.team1} vs ${cur.team2}\n📍 ${cur.venue}\n${tossLine}\n${prob}\n📌 ${cur.status || ""}`
    );
  } catch (e) {
    return `⚠️ Could not load toss intel: ${e.message}`;
  }
}


function handleSchedule() {
  if (!SCHEDULE.length) return "📋 Schedule data unavailable.";
  const results = liveAgent.getResults();
  const done    = new Set(results.map(r => r.matchNumber));
  const upcoming = SCHEDULE.filter(s => !done.has(s.Match)).slice(0, 5);
  if (!upcoming.length) return "✅ All scheduled matches have been played!";
  return "📋 **UPCOMING IPL 2026 MATCHES:**\n\n" + upcoming.map(fmtMatch).join("\n\n");
}

function handlePrediction(msg) {
  const results = liveAgent.getResults();
  const stats   = liveAgent.getStats();
  const team    = detectTeam(msg);
  const matchN  = detectMatchNum(msg);

  if (matchN) {
    const sched = SCHEDULE.find(s => s.Match === matchN);
    if (!sched) return `❓ Match ${matchN} not found in schedule (only 20 scheduled).`;
    const [t1, t2] = parseTeams(sched);
    const result    = results.find(r => r.matchNumber === matchN);
    if (result) {
      const verdict = result.predictionCorrect === true  ? "✅ ML was CORRECT"
                    : result.predictionCorrect === false ? "❌ ML was WRONG"
                    : "⚪ Prediction not stored";
      return `🏏 **Match ${matchN}: ${t1} vs ${t2}**\n\n` +
        `📍 ${sched.Venue} | ${sched.Date}\n\n` +
        `🏆 **Actual Winner:** ${result.actualWinner}\n` +
        `🤖 **ML Predicted:** ${result.predictedWinner || "N/A"}\n` +
        `${verdict}\n\n` +
        `📊 ML Accuracy so far: **${stats.accuracyPct}%** (${stats.correctPredictions}/${stats.totalCompleted})`;
    }
    // Not yet played
    const s1 = STRENGTH[t1], s2 = STRENGTH[t2];
    const fav = s1 && s2 ? (s1.overall > s2.overall ? t1 : t2) : (t1 || "TBD");
    return `🏏 **Match ${matchN}: ${t1} vs ${t2}**\n\n` +
      `📍 ${sched.Venue} | ${sched.Date} at ${sched.Time_IST}\n\n` +
      `🤖 **ML Favourite:** ${fav}\n` +
      `💪 Squad Strength: **${t1} ${s1?.overall ?? "?"}**  vs  **${t2} ${s2?.overall ?? "?"}**`;
  }

  if (team) {
    const teamResults = results.filter(r => r.matchup?.includes(team));
    const wins = teamResults.filter(r => r.actualWinner === team).length;
    const str  = STRENGTH[team];
    return `🏏 **${TEAM_NAMES[team] || team} (${team})**\n\n` +
      `💪 Squad Strength: **${str?.overall ?? "?"}/100** | Rank #${str?.rank ?? "?"}\n` +
      `📊 2026 Matches: ${teamResults.length} | Wins: ${wins}\n` +
      `⭐ Key Players: ${(KEY_PLAYERS[team] || []).slice(0,3).join(", ")}\n\n` +
      `🤖 Overall ML Accuracy: **${stats.accuracyPct}%**`;
  }

  // General accuracy
  return `🤖 **IPL 2026 ML Prediction Accuracy:**\n\n` +
    `✅ Matches Done: **${stats.totalCompleted}**\n` +
    `🎯 Correct: **${stats.correctPredictions}**\n` +
    `📊 Accuracy: **${stats.accuracyPct}%**\n\n` +
    `Match-by-match:\n` +
    results.map(r => {
      const tick = r.predictionCorrect === true ? "✅" : r.predictionCorrect === false ? "❌" : "⚪";
      return `${tick} M${r.matchNumber} ${r.matchup}: **${r.actualWinner}** won`;
    }).join("\n");
}

function handleTeamInfo(msg) {
  const team = detectTeam(msg);
  if (!team) return "🤔 Which team? Try: MI, CSK, KKR, RCB, DC, RR, SRH, GT, PBKS, LSG";
  const s = STRENGTH[team];
  const players = KEY_PLAYERS[team] || [];
  return `🏏 **${TEAM_NAMES[team] || team}**\n\n` +
    `💪 Squad Strength: **${s?.overall}/100** | Rank: **#${s?.rank}**\n\n` +
    `⭐ **Key Players:**\n${players.map(p => `• ${p}`).join("\n")}\n\n` +
    `📋 Try: "predict match X" or "who will win KKR"`;
}

function handleResults() {
  const results = liveAgent.getResults();
  const stats   = liveAgent.getStats();
  if (!results.length) return "📋 No match results recorded yet for IPL 2026.";
  const wins = stats.teamWins || {};
  const leaderboard = Object.entries(wins).sort((a,b) => b[1]-a[1])
    .map(([t,w],i) => `${i+1}. **${t}** — ${w} win${w>1?"s":""}`).join("\n");
  return `🏆 **IPL 2026 RESULTS**\n\n` +
    results.map(r => {
      const tick = r.predictionCorrect === true ? "✅" : r.predictionCorrect === false ? "❌" : "⚪";
      return `${tick} **M${r.matchNumber}** ${r.matchup} → **${r.actualWinner}**`;
    }).join("\n") +
    `\n\n📊 **Win Leaderboard:**\n${leaderboard}\n\n` +
    `🤖 ML Accuracy: **${stats.accuracyPct}%**`;
}

function handleHelp() {
  return `🏏 **IPL 2026 AI Chatbot — What I can do:**\n\n` +
    `📡 **Live Scores**  → "live score", "score", "live"\n` +
    `🪙 **Toss**         → "toss", "who won the toss"\n` +
    `📅 **Schedule**     → "next match", "upcoming", "schedule"\n` +
    `🤖 **Predictions**  → "predict match 6", "who will win KKR"\n` +
    `📊 **Results**      → "results", "who won", "match results"\n` +
    `💪 **Team Info**    → "tell me about MI", "CSK squad"\n` +
    `🎯 **ML Accuracy**  → "ml accuracy", "prediction accuracy"\n\n` +
    `_Live scores: cache + event-driven WebSocket; CricAPI only via manual refresh._`;
}

/* ── MAIN ENGINE ─────────────────────────────────────────────────────────── */
async function processMessage(userMsg) {
  const msg = (userMsg || "").toLowerCase().trim();
  if (!msg) return "👋 Hi! Ask me anything about IPL 2026. Type **help** to see what I can do.";

  if (/\b(hi|hello|hey|helo|hii|howdy)\b/.test(msg))
    return "👋 **Hey Cricket Fan!** I'm your IPL 2026 AI Assistant!\n\nAsk about live scores, predictions, results, or team info.\nType **help** for the full menu! 🏏";

  if (/\b(help|menu|what can|commands?)\b/.test(msg))
    return handleHelp();

  if (/\b(toss|coin flip|who won the toss)\b/.test(msg))
    return await handleTossIntel();

  if (/\b(live|score|scorecard|batting|bowling|wicket|run|over|ipl score)\b/.test(msg))
    return await handleLiveScore();

  if (/\b(schedule|upcoming|next match|fixture|today|tomorrow|when)\b/.test(msg))
    return handleSchedule();

  if (/\b(result|results|who won|winner|completed|finished|won)\b/.test(msg))
    return handleResults();

  if (/\b(predict|prediction|accuracy|ml|model|forecast|who will|win|favourite|favorite)\b/.test(msg))
    return handlePrediction(msg);

  if (/\b(team|squad|player|roster|about|info|tell|strength|key)\b/.test(msg) || detectTeam(msg))
    return handleTeamInfo(msg);

  return `🏏 I'm focused on **IPL 2026 real-time data**!\n\nTry:\n• "live score"\n• "next match"\n• "predict match 6"\n• "MI squad"\n• "ml accuracy"\n\nType **help** for the full menu.`;
}

module.exports = { processMessage };
