/**
 * cricApiService.js — Direct CricAPI gateway with MongoDB cache
 * ─────────────────────────────────────────────────────────────
 * Flow: CricAPI → MongoDB liveCache → WebSocket broadcast
 * GET  /api/live-scores      → cache only (memory → MongoDB)
 * POST /api/live-scores/refresh → triggers this service
 */
const axios = require("axios");

const API_KEY = process.env.CRIC_API_KEY;
const BASE_URL = process.env.CRIC_API_URL
  ? process.env.CRIC_API_URL.replace("/currentMatches", "")
  : "https://api.cricapi.com/v1";

// Debug on startup
console.log("[CRICAPI] API KEY:", API_KEY ? API_KEY.slice(0, 8) + "..." : "NOT SET ❌");

/**
 * Fetch live matches directly from CricAPI currentMatches endpoint.
 * Returns the full CricAPI response object or null on failure.
 */
async function getLiveMatches() {
  if (!API_KEY) {
    console.error("[CRICAPI ERROR] CRIC_API_KEY is not set in .env");
    return null;
  }

  try {
    const response = await axios.get(`${BASE_URL}/currentMatches`, {
      params: { apikey: API_KEY, offset: 0 },
      timeout: 15000,
    });

    const body = response.data;

    if (body?.status === "failure") {
      console.error("[CRICAPI ERROR] API returned failure:", body.reason || "unknown reason");
      return null;
    }

    console.log("[CRICAPI SUCCESS] Matches fetched:", body?.data?.length ?? 0);
    console.log("[CRICAPI] Live loaded:", body?.data?.length ?? 0);
    return body;
  } catch (err) {
    console.error(
      "[CRICAPI ERROR]",
      err.response?.data || err.message
    );
    return null;
  }
}

/**
 * Fetch live matches and persist to MongoDB liveCache collection.
 * @param {import('mongoose').Connection} db - Mongoose connection
 * @returns {object|null} CricAPI body or cached data
 */
async function fetchAndCache(db) {
  const data = await getLiveMatches();

  if (data) {
    try {
      await db.asPromise();
      await db.collection("liveCache").updateOne(
        { type: "ipl" },
        { $set: { data, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log("[CRICAPI] Cache saved to MongoDB liveCache");
    } catch (e) {
      console.warn("[CRICAPI] MongoDB save failed:", e.message);
    }
    return { source: "cricapi", data };
  }

  // Fallback to MongoDB cache
  try {
    await db.asPromise();
    const cache = await db.collection("liveCache").findOne({ type: "ipl" });
    if (cache) console.log("[CACHE READ] cricApiService fallback");
    if (cache) {
      return { source: "mongodb-cache", data: cache.data };
    }
  } catch (e) {
    console.warn("[CRICAPI] MongoDB read failed:", e.message);
  }

  return null;
}

module.exports = { getLiveMatches, fetchAndCache };
