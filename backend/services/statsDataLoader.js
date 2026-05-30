/**
 * statsDataLoader.js — Centralized ML stats bootstrap from MongoDB (ipl_prediction)
 */
const playerService = require("./playerService");
const bowlingService = require("./bowlingService");

let initialized = false;

/**
 * Load all player/bowling collections once at server startup.
 */
async function loadMLStats() {
  if (initialized) {
    return getCache();
  }

  console.log("[statsDataLoader] Loading ML data from MongoDB (ipl_prediction)...");

  const [{ playerStats, battingStats }, bowlingStats] = await Promise.all([
    playerService.loadPlayerData(),
    bowlingService.loadBowlingData(),
  ]);

  const playerStatsService = require("./playerStatsService");
  playerStatsService.hydrateFromMongo({ playerStats, battingStats, bowlingStats });

  initialized = true;

  console.log(
    `[statsDataLoader] Ready — players: ${playerStats.length}, batting: ${battingStats.length}, bowling: ${bowlingStats.length}`
  );

  return getCache();
}

function getCache() {
  return {
    playerStats: playerService.getPlayerStats(),
    battingStats: playerService.getBattingStats(),
    bowlingStats: bowlingService.getBowlingStats(),
  };
}

function isInitialized() {
  return initialized;
}

/** Ensure ML collections are loaded (idempotent). */
async function ensureMLStats() {
  if (!initialized) {
    await loadMLStats();
  }
  return getCache();
}

module.exports = {
  loadMLStats,
  ensureMLStats,
  getCache,
  isInitialized,
  playerService,
  bowlingService,
};
