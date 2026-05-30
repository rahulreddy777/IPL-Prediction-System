/**
 * update_playoffs.js
 * Updates the ipl_matches_2026 individual playoff documents with real results
 * and inserts the aggregated tournament document if not present.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ipl_prediction';

const PLAYOFF_RESULTS = [
  {
    matchNumber: 71,
    stage: 'qualifier1',
    label: 'Qualifier 1',
    date: '2026-05-26',
    venue: 'Himachal Pradesh Cricket Association Stadium, Dharamsala',
    team1: { name: 'Royal Challengers Bengaluru', code: 'RCB', score: '189-9 (20)' },
    team2: { name: 'Gujarat Titans', code: 'GT', score: '190-4 (18.2)' },
    result: 'Gujarat Titans won by 6 wkts',
    winner: { name: 'Gujarat Titans', code: 'GT' },
    status: 'completed'
  },
  {
    matchNumber: 72,
    stage: 'eliminator',
    label: 'Eliminator',
    date: '2026-05-27',
    venue: 'Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    team1: { name: 'Sunrisers Hyderabad', code: 'SRH', score: '214-5 (20)' },
    team2: { name: 'Rajasthan Royals', code: 'RR', score: '191-8 (20)' },
    result: 'Sunrisers Hyderabad won by 23 runs',
    winner: { name: 'Sunrisers Hyderabad', code: 'SRH' },
    status: 'completed'
  },
  {
    matchNumber: 73,
    stage: 'qualifier2',
    label: 'Qualifier 2',
    date: '2026-05-29',
    venue: 'Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    team1: { name: 'Royal Challengers Bengaluru', code: 'RCB', score: '163-8 (20)' },
    team2: { name: 'Sunrisers Hyderabad', code: 'SRH', score: '167-5 (19.2)' },
    result: 'Sunrisers Hyderabad won by 5 wkts',
    winner: { name: 'Sunrisers Hyderabad', code: 'SRH' },
    status: 'completed'
  },
  {
    matchNumber: 74,
    stage: 'final',
    label: '🏆 Final',
    date: '2026-05-31',
    venue: 'Narendra Modi Stadium, Ahmedabad',
    team1: { name: 'Gujarat Titans', code: 'GT', score: null },
    team2: { name: 'Sunrisers Hyderabad', code: 'SRH', score: null },
    result: null,
    winner: null,
    status: 'upcoming'
  }
];

async function run() {
  console.log('[update_playoffs] Connecting to MongoDB...');
  const conn = mongoose.createConnection(MONGO_URI);
  await conn.asPromise();
  console.log('[update_playoffs] Connected.');

  const col = conn.db.collection('ipl_matches_2026');

  for (const m of PLAYOFF_RESULTS) {
    // Upsert each playoff match by matchNumber
    const res = await col.replaceOne(
      { matchNumber: m.matchNumber },
      { ...m, updatedAt: new Date() },
      { upsert: true }
    );
    console.log(`[update_playoffs] M${m.matchNumber} (${m.label}): ${res.upsertedCount ? 'inserted' : 'updated'} — status: ${m.status}`);
  }

  // Also update the aggregated tournament doc
  const jsonPath = path.join(__dirname, 'data', 'ipl_2026_tournament_data.json');
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  await col.deleteMany({ league_stage_matches: { $exists: true } });
  await col.insertOne({
    _type: 'tournament_data',
    tournament: raw.tournament || {},
    league_stage_matches: raw.league_stage_matches,
    playoffs: raw.playoffs || [],
    seededAt: new Date()
  });
  console.log('[update_playoffs] ✅ Tournament aggregated doc also refreshed.');

  await conn.close();
  process.exit(0);
}

run().catch(err => {
  console.error('[update_playoffs] Fatal:', err.message);
  process.exit(1);
});
