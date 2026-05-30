/**
 * /api/live-intel  — Real-time IPL 2026 Intelligence
 * Provides: live scores, toss recording, match results, AI commentary, SSE stream
 */
const express  = require('express');
const router   = express.Router();
const intel    = require('../services/liveIntelService');
const { predictionDB } = require('../config/db');
const { pushWinPredictionUpdate } = require('../services/winProbabilityStream');
const { pushLiveUpdate } = require('../services/liveScoreService');
const { onLiveScoreFinalized } = require('../services/matchResultService');

// ── SSE clients store ─────────────────────────────────────────────────────────
const sseClients = new Set();

function broadcastSSE(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => { try { res.write(msg); } catch {} });
}

intel.intelBus.on('auto-toss', (payload) => {
  broadcastSSE({
    type: 'toss',
    winner: payload.winner,
    choice: payload.choice,
    commentary: payload.commentary,
    matchNumber: payload.matchNumber,
  });
});

// ── GET /api/live-intel — full state ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const data = await intel.getLiveIntelligence();
    res.json(data);
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/live-intel/stream — SSE real-time push ──────────────────────────
router.get('/stream', async (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', msg: 'IPL Live Stream connected' })}\n\n`);

  // Send current state immediately
  try {
    const data = await intel.getLiveIntelligence();
    res.write(`data: ${JSON.stringify({ type: 'update', ...data })}\n\n`);
  } catch {}

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ── POST /api/live-intel/toss — record toss and get updated prediction ────────
router.post('/toss', express.json(), (req, res) => {
  try {
    const { matchNumber, team1, team2, venue, tossWinner, tossChoice } = req.body;
    if (!team1 || !team2 || !tossWinner || !tossChoice) {
      return res.status(400).json({ error: 'team1, team2, tossWinner, tossChoice required' });
    }
    const result = intel.recordToss({ matchNumber, team1, team2, venue, tossWinner, tossChoice });
    broadcastSSE({ type: 'toss', ...result });
    pushLiveUpdate(predictionDB).catch(() => {});
    res.json({ success: true, ...result });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/live-intel/result — inject match result ────────────────────────
router.post('/result', express.json(), (req, res) => {
  try {
    const { matchNumber, team1, team2, venue, date, winner, margin, mlPredicted } = req.body;
    if (!matchNumber || !winner) {
      return res.status(400).json({ error: 'matchNumber and winner are required' });
    }
    const result = intel.injectResult({ matchNumber, team1, team2, venue, date, winner, margin, mlPredicted });
    broadcastSSE({ type: 'result', result });
    res.json({ success: true, result });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/live-intel/live-score — update live in-play score ───────────────
router.post('/live-score', express.json(), async (req, res) => {
  try {
    const { matchNumber, team1, team2, venue, score1, score2, overs1, overs2, target, isLive, winner } = req.body;
    if (!team1 || !team2) {
      return res.status(400).json({ error: 'team1 and team2 are required' });
    }
    const state = intel.readState();
    const toss  = state.tossResults?.[`m${matchNumber}`];
    const wp    = intel.computeWinProb(team1, team2, venue, toss?.winner, toss?.choice);
    const liveData = {
      matchNumber, team1, team2, venue,
      score1, score2, overs1, overs2, target,
      winProb: wp, toss, isLive: isLive !== false,
    };
    intel.writeState({ currentLive: liveData });

    const commentary = intel.generateAICommentary(
      { team1, team2, venue, liveWinPct: wp, score1, score2 }, 'live'
    );

    // Broadcast immediate score update
    broadcastSSE({ type: 'live-score', ...liveData, commentary });

    // Event-driven live + AI updates (cache only — no API)
    pushLiveUpdate(predictionDB).catch((e) =>
      console.warn('[LiveScore] push:', e.message)
    );

    if (matchNumber && (isLive === false || winner)) {
      onLiveScoreFinalized(predictionDB, {
        matchNumber,
        team1,
        team2,
        winner,
        isLive: false,
      }).catch((e) => console.warn('[MatchResult] finalize:', e.message));
    }

    if (matchNumber) {
      const event = req.body.eventType && req.body.team
        ? { type: req.body.eventType, team: req.body.team }
        : null;
      pushWinPredictionUpdate(predictionDB, matchNumber, { event }).catch((e) =>
        console.warn('[WinProb] live-score push:', e.message)
      );
    }

    // Also broadcast full intelligence update so dashboard refreshes everything
    try {
      const fullData = await intel.getLiveIntelligence();
      broadcastSSE({ type: 'update', ...fullData });
    } catch {}

    res.json({ success: true, ...liveData, commentary });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/live-intel/clear-live — mark match as ended / clear live card ──
router.post('/clear-live', express.json(), (req, res) => {
  try {
    const state = intel.readState();
    if (state.currentLive) {
      intel.writeState({ currentLive: { ...state.currentLive, isLive: false } });
    }
    broadcastSSE({ type: 'live-score', isLive: false, cleared: true });
    res.json({ success: true, message: 'Live match cleared' });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/live-intel/current — return only the currentLive state ─────────
router.get('/current', (req, res) => {
  try {
    const state = intel.readState();
    res.json({ success: true, currentLive: state.currentLive || null });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/live-intel/stats — accuracy stats only ─────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const data = await intel.getLiveIntelligence();
    res.json({ success: true, stats: data.stats, completed: data.completed });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
