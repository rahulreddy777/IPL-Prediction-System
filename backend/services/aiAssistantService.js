const { OpenAI } = require("openai");
const { predictionDB } = require("../config/db");
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Helper to get the 2026 schedule for basic context
 */
function getSchedule() {
  try {
    const p = path.join(__dirname, "../data/ipl_2026_matches_schedule.json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return [];
  }
}

/**
 * Fetch relevant database context based on the user message
 */
async function getDatabaseContext(userMessage) {
  let contextText = "--- DATABASE CONTEXT ---\n";
  const msg = userMessage.toLowerCase();

  try {
    if (!predictionDB) return "Database not connected.";

    // 1. Teams & Standings context
    if (msg.match(/point|standings|table|qualify|playoff/)) {
      const standings = await predictionDB.collection('points_table_2026').find({}).sort({ points: -1, nrr: -1 }).toArray();
      contextText += "\n[POINTS TABLE 2026]\n";
      standings.forEach((t, i) => {
        contextText += `${i+1}. ${t.team} - Pld: ${t.matches}, Won: ${t.won}, Pts: ${t.points}, NRR: ${t.nrr}\n`;
      });
    }

    // 2. Head to Head Context
    if (msg.match(/vs|versus|head to head|h2h/)) {
      const h2hData = await predictionDB.collection('ipl_teams_head_to_head').findOne({});
      if (h2hData) {
        contextText += "\n[HEAD TO HEAD HISTORY]\n";
        // To avoid passing the entire huge JSON, we look for mentioned teams
        const teams = ["CSK", "MI", "RCB", "KKR", "DC", "RR", "SRH", "GT", "PBKS", "LSG"];
        const mentioned = teams.filter(t => msg.includes(t.toLowerCase()));
        
        if (mentioned.length === 2) {
          const t1 = mentioned[0];
          const t2 = mentioned[1];
          const matchup = h2hData[t1]?.find(m => m.opponent === t2);
          if (matchup) {
            contextText += `${t1} vs ${t2}: Total: ${matchup.total}, ${t1} Wins: ${matchup.wins}, ${t2} Wins: ${matchup.losses}\n`;
          }
        }
      }
    }

    // 3. Orange/Purple Cap & Player Stats Context
    if (msg.match(/orange cap|purple cap|highest|most runs|most wickets|best batsman|best bowler|stats/)) {
      const batters = await predictionDB.collection('batting_stats_2026').find({}).sort({ runs: -1 }).limit(5).toArray();
      const bowlers = await predictionDB.collection('bowling_stats_2026').find({}).sort({ wkts: -1 }).limit(5).toArray();
      
      contextText += "\n[TOP 5 BATTERS (ORANGE CAP CONTENDERS)]\n";
      batters.forEach(b => {
        contextText += `${b.player} (${b.team}): ${b.runs} runs, Avg: ${b.avg}, SR: ${b.sr}\n`;
      });

      contextText += "\n[TOP 5 BOWLERS (PURPLE CAP CONTENDERS)]\n";
      bowlers.forEach(b => {
        contextText += `${b.player} (${b.team}): ${b.wkts} wkts, Econ: ${b.econ}, Best: ${b.best}\n`;
      });
    }

    // 4. Upcoming Matches Context
    const schedule = getSchedule();
    if (schedule.length > 0) {
      contextText += "\n[UPCOMING IPL 2026 MATCHES]\n";
      schedule.slice(0, 10).forEach(s => {
        contextText += `Match ${s.Match}: ${s.Matchup} at ${s.Venue} (${s.Date})\n`;
      });
    }

  } catch (err) {
    console.error("[AI Context Error]", err);
  }

  return contextText + "\n------------------------\n";
}

/**
 * Process a user message using OpenAI
 */
async function processMessage(userMessage) {
  try {
    const dbContext = await getDatabaseContext(userMessage);

    const systemPrompt = `You are a professional AI Cricket Assistant for an IPL Prediction System.
Your job is to provide accurate, insightful, and engaging answers about IPL 2026.
Use the provided DATABASE CONTEXT to back up your claims with real numbers. 
If the context doesn't contain the exact answer, use your general knowledge about cricket and the teams, but prioritize the provided database data.

Guidelines:
1. Be concise but analytical.
2. Use markdown formatting (bolding, lists) to make it easy to read.
3. Keep a professional yet enthusiastic tone, appropriate for a cricket fan dashboard.
4. If asked to predict a match, analyze the strengths (e.g. batting vs bowling, or head-to-head) and give a final predicted winner.

${dbContext}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use 3.5 turbo for speed, or gpt-4o if available
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;

  } catch (err) {
    console.error("[OpenAI Error]", err);
    throw new Error("Failed to get response from AI assistant.");
  }
}

module.exports = {
  processMessage
};
