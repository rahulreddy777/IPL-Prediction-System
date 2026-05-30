/**
 * Live Intelligence Service v2.0
 * Powers: real-time scores, toss detection, auto-prediction updates, AI commentary
 * Sources: Live score API (RapidAPI + agent cache) → Manual injection (always)
 */
const fs    = require('fs');
const path  = require('path');
const { EventEmitter } = require('events');

const liveScoreSvc = require('./liveScoreService');
const {
  toCode,
  flattenScoresForTeams,
  isLiveMatchState,
  parseTossFromStatus,
} = require('./liveMatchEnrichment');

const STATE_PATH    = path.join(__dirname, '../data/live_match_state.json');
const RESULTS_PATH  = path.join(__dirname, '../data/live_results_2026.json');
const SCHEDULE_PATH = path.join(__dirname, '../data/ipl_2026_matches_schedule.json');

let SCHEDULE_CACHE = [];
try {
  SCHEDULE_CACHE = JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'));
} catch { SCHEDULE_CACHE = []; }

const intelBus = new EventEmitter();

// ── Constants ────────────────────────────────────────────────────────────────
const VENUE_CHASE = {
  'Bengaluru':62,'Mumbai':58,'Kolkata':55,'Hyderabad':57,'Ahmedabad':56,
  'Lucknow':55,'Delhi':50,'Chennai':40,'Mullanpur':54,'Jaipur':48,
  'Guwahati':50,'Dharamshala':50,'Raipur':50,'New Chandigarh':53,
};

const SQUAD_STRENGTH = {
  MI:{batting:92,bowling:95,allRound:88,overall:92},
  PBKS:{batting:90,bowling:89,allRound:92,overall:90},
  GT:{batting:88,bowling:93,allRound:85,overall:89},
  CSK:{batting:91,bowling:84,allRound:86,overall:87},
  SRH:{batting:94,bowling:82,allRound:80,overall:85},
  DC:{batting:84,bowling:90,allRound:82,overall:85},
  RR:{batting:82,bowling:86,allRound:88,overall:85},
  KKR:{batting:87,bowling:78,allRound:90,overall:85},
  RCB:{batting:89,bowling:80,allRound:84,overall:84},
  LSG:{batting:85,bowling:83,allRound:81,overall:83},
};

// ── State management ─────────────────────────────────────────────────────────
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH,'utf8')); } catch { return {}; }
}
function writeState(data) {
  try { fs.writeFileSync(STATE_PATH, JSON.stringify({ ...readState(), ...data, lastUpdated: new Date().toISOString() }, null, 2)); } catch(e) { console.error('[LiveIntel] writeState error:', e.message); }
}
function readResults() {
  try { return JSON.parse(fs.readFileSync(RESULTS_PATH,'utf8')).matchResults || []; } catch { return []; }
}
function saveResult(result) {
  try {
    const data = JSON.parse(fs.readFileSync(RESULTS_PATH,'utf8'));
    const existing = data.matchResults || [];
    const idx = existing.findIndex(r => r.matchNumber === result.matchNumber);
    if (idx >= 0) existing[idx] = result; else existing.push(result);
    fs.writeFileSync(RESULTS_PATH, JSON.stringify({ matchResults: existing }, null, 2));
  } catch(e) { console.error('[LiveIntel] saveResult error:', e.message); }
}

function scheduleMatchForTeams(codeA, codeB) {
  if (!codeA || !codeB) return null;
  return SCHEDULE_CACHE.find((s) => {
    const parts = s.Matchup.split(' vs ').map((t) => t.trim().toUpperCase());
    return (
      (parts[0] === codeA && parts[1] === codeB) ||
      (parts[0] === codeB && parts[1] === codeA)
    );
  }) || null;
}

function venueKeyFromRow(row, fallback = '') {
  const v = row?.Venue || fallback || '';
  return String(v).split(',')[0].trim();
}

function persistAutoToss({
  matchNumber,
  team1,
  team2,
  venue,
  tossWinner,
  tossChoice,
  sourceTag = 'api',
}) {
  if (!matchNumber || !team1 || !team2 || !tossWinner || !tossChoice) return null;
  const state = readState();
  const key = `m${matchNumber}`;
  const prev = state.tossResults?.[key];
  if (prev && prev.winner === tossWinner && prev.choice === tossChoice) {
    return prev;
  }
  const winProb = computeWinProb(team1, team2, venue, tossWinner, tossChoice);
  const tossData = {
    matchNumber,
    team1,
    team2,
    venue,
    winner: tossWinner,
    choice: tossChoice,
    winProb,
    recordedAt: new Date().toISOString(),
    source: sourceTag,
  };
  const tossResults = { ...(state.tossResults || {}), [key]: tossData };
  writeState({ tossResults });
  const commentary = generateAICommentary(
    { team1, team2, venue, tossWinner, tossChoice, liveWinPct: winProb },
    'toss'
  );
  intelBus.emit('auto-toss', { ...tossData, commentary, key });
  return tossData;
}

// ── Probability engine ────────────────────────────────────────────────────────
function computeWinProb(team1, team2, venue, tossWinner=null, tossChoice=null) {
  const s1 = SQUAD_STRENGTH[team1] || { overall: 80 };
  const s2 = SQUAD_STRENGTH[team2] || { overall: 80 };
  const total = s1.overall + s2.overall;
  let prob1 = (s1.overall / total) * 100;

  // Home advantage
  const HOME = { MI:'Mumbai',CSK:'Chennai',KKR:'Kolkata',RCB:'Bengaluru',
    DC:'Delhi',RR:'Jaipur',SRH:'Hyderabad',GT:'Ahmedabad',PBKS:'Mullanpur',LSG:'Lucknow' };
  if (HOME[team1] === venue) prob1 += 3.5;
  if (HOME[team2] === venue) prob1 -= 3.5;

  // Toss adjustment
  if (tossWinner && tossChoice) {
    const chaseAdv = VENUE_CHASE[venue] || 50;
    const boost = tossChoice === 'field' ? (chaseAdv - 50) * 0.75 : (50 - chaseAdv) * 0.5;
    if (tossWinner === team1) prob1 += boost;
    else prob1 -= boost;
  }

  prob1 = Math.round(Math.min(80, Math.max(20, prob1)));
  return { [team1]: prob1, [team2]: 100 - prob1 };
}

function generateAICommentary(matchData, event) {
  const { team1, team2, venue, tossWinner, tossChoice, score1, score2, liveWinPct } = matchData;
  const chaseRate = VENUE_CHASE[venue] || 50;
  const s1 = SQUAD_STRENGTH[team1] || {};
  const s2 = SQUAD_STRENGTH[team2] || {};

  if (event === 'toss') {
    const chasing = tossChoice === 'field';
    const preferChase = chaseRate > 52;
    const decision = preferChase && chasing ? '✅ Correct decision' : preferChase && !chasing ? '⚠️ Against venue trend' : '📊 Balanced venue';
    return [
      `🎲 TOSS: ${tossWinner} won the toss and elected to ${tossChoice === 'field' ? 'field (chase)' : 'bat first'}.`,
      `📍 ${venue} chase-win rate: ${chaseRate}% — ${decision}.`,
      `🤖 AI Win Probability updated → ${team1}: ${liveWinPct?.[team1]}% · ${team2}: ${liveWinPct?.[team2]}%`,
      `🏏 ${team1} strengths: Bat ${s1.batting}% · Bowl ${s1.bowling}% | ${team2}: Bat ${s2.batting}% · Bowl ${s2.bowling}%`,
    ].join(' | ');
  }
  if (event === 'live') {
    return `📡 LIVE: ${score1 || 'N/A'} | ${team2} ${score2 || 'yet to bat'} | AI: ${team1} ${liveWinPct?.[team1]}% · ${team2} ${liveWinPct?.[team2]}%`;
  }
  if (event === 'result') {
    return `🏆 RESULT: ${matchData.winner} won! ${matchData.margin || ''} | Next: ${matchData.nextMatch || 'TBD'}`;
  }
  return '🤖 AI Assistant ready. Toss/score updates will appear here.';
}

// ── Main live intelligence (single path via live score API service) ───────────
function isLiveListRow(m) {
  if (!m || m.source === 'schedule') return false;
  if (m.matchEnded) return false;
  return Boolean(m.matchStarted || isLiveMatchState(m));
}

async function getLiveIntelligence() {
  const state   = readState();
  const results = readResults();
  const doneSet = new Set(results.map((r) => r.matchNumber));

  // ── Always check manually injected state FIRST ───────────────────────────
  // If a live score was manually broadcast (POST /api/live-intel/live-score),
  // use it immediately without waiting for API — show it on the dashboard.
  const injectedLive = state.currentLive;
  const injectedIsActive = injectedLive &&
    injectedLive.team1 && injectedLive.team2 &&
    injectedLive.isLive !== false;

  let lsPayload = { data: [], provider: 'manual', liveCount: 0 };
  try {
    lsPayload = await liveScoreSvc.getLiveScores();
  } catch (e) {
    console.warn('[LiveIntel] getLiveScores:', e.message);
  }

  const all = lsPayload.data || [];

  const completed = results.map((r) => ({
    matchNumber: r.matchNumber,
    matchup: r.matchup,
    venue: r.venue,
    date: r.date,
    winner: r.actualWinner,
    margin: r.winMargin,
    mlPredicted: r.predictedWinner,
    mlCorrect: r.predictionCorrect,
    source: r.source || 'manual',
  })).sort((a, b) => b.matchNumber - a.matchNumber);

  // API live row (only used if no manual injection is current)
  let liveRow = all.find(isLiveListRow);

  let currentLive = null;

  // ── Priority 1: Manually injected currentLive state ─────────────────────
  if (injectedIsActive) {
    const mn  = injectedLive.matchNumber;
    const t1  = injectedLive.team1;
    const t2  = injectedLive.team2;
    const venue = injectedLive.venue || '';
    const toss = state.tossResults?.[`m${mn}`] || injectedLive.toss || null;
    const wp  = injectedLive.winProb || computeWinProb(t1, t2, venue, toss?.winner, toss?.choice);
    const commentary = generateAICommentary(
      { team1: t1, team2: t2, venue, liveWinPct: wp,
        score1: injectedLive.score1, score2: injectedLive.score2 }, 'live'
    );
    currentLive = {
      ...injectedLive,
      winProb: wp,
      toss,
      commentary,
      isLive: true,
      source: 'manual-injection',
    };
  }
  // ── Priority 2: Live row from API (if no manual data) ───────────────────
  else if (liveRow) {
    const teamNames = liveRow.teams || [];
    let t1 = toCode(teamNames[0] || '');
    let t2 = toCode(teamNames[1] || '');
    if (!t1 || !t2) {
      const parts = String(liveRow.name || '').split(/\s+vs\s+/i);
      if (parts.length === 2) {
        t1 = t1 || toCode(parts[0].trim());
        t2 = t2 || toCode(parts[1].split(',')[0].trim());
      }
    }

    if (t1 && t2) {
      const sched = scheduleMatchForTeams(t1, t2);
      const nextSched =
        SCHEDULE_CACHE.find((s) => !doneSet.has(s.Match)) || null;
      const matchNumber =
        sched?.Match ??
        nextSched?.Match ??
        (completed.length ? Math.max(...completed.map((c) => c.matchNumber)) + 1 : 1);

      const venue = venueKeyFromRow(sched, liveRow.venue);

      let toss = state.tossResults?.[`m${matchNumber}`];
      const tw = liveRow.tossWinner;
      const tc = liveRow.tossChoice;
      if (tw && tc) {
        const tnew = persistAutoToss({
          matchNumber,
          team1: t1,
          team2: t2,
          venue,
          tossWinner: tw,
          tossChoice: tc,
        });
        if (tnew) toss = tnew;
      } else {
        const parsed = parseTossFromStatus(liveRow.status || '');
        if (parsed?.choice) {
          const w = toCode(parsed.winnerFull || '');
          if (w) {
            const tnew = persistAutoToss({
              matchNumber,
              team1: t1,
              team2: t2,
              venue,
              tossWinner: w,
              tossChoice: parsed.choice,
            });
            if (tnew) toss = tnew;
          }
        }
      }
      if (!toss) toss = state.tossResults?.[`m${matchNumber}`];

      const flat = flattenScoresForTeams(liveRow.teams, liveRow.score || []);
      const wp = computeWinProb(t1, t2, venue, toss?.winner, toss?.choice);
      const commentaryLive = generateAICommentary(
        {
          team1: t1,
          team2: t2,
          venue,
          liveWinPct: wp,
          score1: flat.score1,
          score2: flat.score2,
        },
        'live'
      );

      currentLive = {
        matchNumber,
        team1: t1,
        team2: t2,
        venue,
        status: liveRow.status || 'Live',
        score: liveRow.score || [],
        score1: flat.score1,
        score2: flat.score2,
        overs1: flat.overs1,
        overs2: flat.overs2,
        winProb: wp,
        toss: toss || null,
        isLive: true,
        source: liveRow.source || 'live-api',
        provider: lsPayload.provider,
        apiId: liveRow.id,
        commentary: commentaryLive,
      };
    }
  }

  const tossData = readState().tossResults || {};

  const totalCompleted = completed.length;
  const graded = completed.filter((m) => m.mlCorrect === true || m.mlCorrect === false);
  const correct = completed.filter((m) => m.mlCorrect).length;
  const accuracy =
    graded.length > 0 ? Math.round((correct / graded.length) * 100) : 0;

  return {
    success: true,
    currentLive,
    completed,
    tossData,
    apiMatchCount: lsPayload.liveCount ?? all.filter(isLiveListRow).length,
    stats: { totalCompleted, correct, accuracy },
    lastUpdated: new Date().toISOString(),
    source: liveRow ? lsPayload.provider || 'live-api' : 'manual',
    liveProvider: lsPayload.provider,
  };
}

// ── Toss update handler ───────────────────────────────────────────────────────
function recordToss({ matchNumber, team1, team2, venue, tossWinner, tossChoice }) {
  const key = `m${matchNumber}`;
  const state = readState();
  const winProb = computeWinProb(team1, team2, venue, tossWinner, tossChoice);
  const winner = winProb[team1] >= winProb[team2] ? team1 : team2;
  const tossData = {
    matchNumber, team1, team2, venue,
    winner: tossWinner, choice: tossChoice,
    winProb, predictedWinner: winner,
    recordedAt: new Date().toISOString(),
  };
  const tossResults = { ...(state.tossResults || {}), [key]: tossData };
  writeState({ tossResults, currentLive: { matchNumber, team1, team2, venue, toss: tossData, winProb, isLive: true } });
  const commentary = generateAICommentary(
    { team1, team2, venue, tossWinner, tossChoice, liveWinPct: winProb }, 'toss'
  );
  return { ...tossData, commentary };
}

// ── Manual result injection ───────────────────────────────────────────────────
function injectResult({ matchNumber, team1, team2, venue, date, winner, margin, mlPredicted }) {
  const result = {
    cricApiId: `manual-m${matchNumber}`,
    matchNumber, matchup: `${team1} vs ${team2}`,
    date: date || new Date().toLocaleDateString('en-IN', { month:'short', day:'2-digit'}),
    venue: venue || '',
    actualWinner: winner, actualWinnerFull: winner,
    winMargin: margin || `${winner} won`,
    predictedWinner: mlPredicted || winner,
    predictionCorrect: mlPredicted === winner,
    confidence: 50,
    predictedProb: { [team1]: 50, [team2]: 50 },
    source: 'manual-injection',
    updatedAt: new Date().toISOString(),
  };
  saveResult(result);
  return result;
}

module.exports = {
  getLiveIntelligence,
  recordToss,
  injectResult,
  computeWinProb,
  generateAICommentary,
  readState,
  writeState,
  intelBus,
};
