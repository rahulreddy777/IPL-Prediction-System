/**
 * config/db.js — MongoDB connections via Mongoose
 * Uses MONGO_URI and MONGO_HISTORY_URI from .env (dotenv loaded in server.js)
 * Falls back to localhost if env vars are not set.
 */
const mongoose = require('mongoose');

const MONGO_URI       = process.env.MONGO_URI       || 'mongodb://localhost:27017/ipl_prediction';
const MONGO_HISTORY_URI = process.env.MONGO_HISTORY_URI || 'mongodb://localhost:27017/ipl_history';

// ── Connection: ipl_prediction ────────────────────────────────────────────────
const predictionDB = mongoose.createConnection(MONGO_URI);

predictionDB.on('connected', () => {
  console.log('✅ MongoDB Connected →', MONGO_URI);
});

predictionDB.on('error', (err) => {
  console.error('❌ ipl_prediction connection error:', err?.message || err);
});

// ── Connection: ipl_history ────────────────────────────────────────────────────
const historyDB = mongoose.createConnection(MONGO_HISTORY_URI);

historyDB.on('connected', () => {
  console.log('✅ MongoDB Connected →', MONGO_HISTORY_URI);
});

historyDB.on('error', (err) => {
  console.error('❌ ipl_history connection error:', err?.message || err);
});

// ── connectDB() — awaitable helper used by app.js / server.js ─────────────────
const connectDB = async () => {
  try {
    await Promise.all([
      predictionDB.asPromise(),
      historyDB.asPromise(),
    ]);
    console.log('✅ All MongoDB connections established.');
  } catch (err) {
    console.error('⚠️  MongoDB connection failed. Continuing without DB.', err?.message || err);
  }
};

module.exports = { connectDB, predictionDB, historyDB };
