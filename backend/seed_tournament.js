/**
 * seed_tournament.js
 * Seeds the ipl_matches_2026 collection with the tournament data from
 * data/ipl_2026_tournament_data.json (replaces the 78 old flat docs with one
 * aggregated document that the matches2026 route expects).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ipl_prediction';

async function seed() {
  console.log('[seed_tournament] Connecting to MongoDB…');
  const conn = mongoose.createConnection(MONGO_URI);
  await conn.asPromise();
  console.log('[seed_tournament] Connected.');

  const col = conn.db.collection('ipl_matches_2026');

  // Load the master JSON file
  const jsonPath = path.join(__dirname, 'data', 'ipl_2026_tournament_data.json');
  const raw      = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  if (!raw.league_stage_matches) {
    console.error('[seed_tournament] ERROR: ipl_2026_tournament_data.json missing league_stage_matches');
    await conn.close();
    process.exit(1);
  }

  console.log(`[seed_tournament] league_stage_matches: ${raw.league_stage_matches.length}`);
  console.log(`[seed_tournament] playoffs:             ${raw.playoffs ? raw.playoffs.length : 0}`);

  // Remove the old aggregated document (keep individual match docs intact)
  const removed = await col.deleteMany({ league_stage_matches: { $exists: true } });
  console.log(`[seed_tournament] Removed ${removed.deletedCount} old aggregated doc(s).`);

  // Insert fresh aggregated document
  await col.insertOne({
    _type: 'tournament_data',
    tournament: raw.tournament || {},
    league_stage_matches: raw.league_stage_matches,
    playoffs: raw.playoffs || [],
    seededAt: new Date()
  });

  console.log('[seed_tournament] ✅ Tournament data seeded successfully.');
  await conn.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('[seed_tournament] Fatal error:', err.message);
  process.exit(1);
});
