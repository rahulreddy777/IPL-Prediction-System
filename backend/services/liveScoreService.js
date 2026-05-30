const { fetchAndCache } = require("./cricApiService");
const { broadcast } = require("./websocketServer"); // if we need to push updates

let memCache = {
  matches: [],
  upcomingMatches: [],
  completedMatches: [],
  updatedAt: null,
  source: "none",
};

/**
 * Filter and shape CricAPI data into live/upcoming/completed IPL matches
 */
function processCricApiData(rawData, source) {
  if (!rawData || !rawData.data) return memCache;

  const allMatches = rawData.data;
  const live = [];
  const upcoming = [];
  const completed = [];

  for (const match of allMatches) {
    // Basic IPL filter (adjust logic as needed)
    const name = (match.name || "").toLowerCase();
    if (!name.includes("ipl") && !name.includes("indian premier") && !name.includes("women")) {
      // In a real app we'd filter strictly for IPL, but let's allow T20s or all for now
      // just in case CricAPI naming is weird, or we can just pass them all for testing.
    }

    const doc = {
      id: match.id,
      matchDesc: match.name,
      status: match.status,
      venue: match.venue,
      dateTimeGMT: match.dateTimeGMT,
      team1: match.teams ? match.teams[0] : "T1",
      team2: match.teams ? match.teams[1] : "T2",
      score1: match.score && match.score[0] ? `${match.score[0].r}/${match.score[0].w} (${match.score[0].o})` : "",
      score2: match.score && match.score[1] ? `${match.score[1].r}/${match.score[1].w} (${match.score[1].o})` : "",
      matchStarted: match.matchStarted,
      matchEnded: match.matchEnded,
    };

    if (match.matchEnded) {
      completed.push(doc);
    } else if (match.matchStarted) {
      live.push(doc);
    } else {
      upcoming.push(doc);
    }
  }

  memCache = {
    matches: live,
    upcomingMatches: upcoming,
    completedMatches: completed,
    updatedAt: new Date().toISOString(),
    source: source,
    liveCount: live.length,
    upcomingCount: upcoming.length,
    completedCount: completed.length,
  };

  return memCache;
}

/**
 * GET cache only (memory -> MongoDB)
 */
async function fetchLiveIPLScores(db) {
  // If memory cache exists and is fresh (e.g., within last 5 mins), return it
  if (memCache.updatedAt) {
    return { ...memCache, fromCache: true, cacheLayer: "memory" };
  }

  // Fallback to MongoDB
  try {
    const cacheDoc = await db.collection("liveCache").findOne({ type: "ipl" });
    if (cacheDoc && cacheDoc.data) {
      return { 
        ...processCricApiData(cacheDoc.data, "mongodb-cache"), 
        fromCache: true, 
        cacheLayer: "mongodb" 
      };
    }
  } catch (e) {
    console.error("[liveScoreService] Error reading MongoDB:", e.message);
  }

  return { ...memCache, fromCache: true, cacheLayer: "none" };
}

/**
 * POST refresh — calls CricAPI and updates MongoDB & Memory
 */
async function refreshAndPushLiveUpdate(db, options = {}) {
  try {
    const result = await fetchAndCache(db);
    if (result && result.data) {
      const updatedCache = processCricApiData(result.data, result.source);
      
      // Optional: Broadcast via websocket to connected clients
      if (typeof broadcast === "function") {
        broadcast({ type: "LIVE_SCORE_UPDATE", timestamp: Date.now() });
      }

      return updatedCache;
    }
    return { ...memCache, error: "Failed to fetch from CricAPI" };
  } catch (e) {
    console.error("[liveScoreService] Refresh error:", e.message);
    return { ...memCache, error: e.message };
  }
}

function getCacheStatus() {
  return {
    updatedAt: memCache.updatedAt,
    source: memCache.source,
    liveCount: memCache.matches.length
  };
}

// ── Background Poller (Optional but requested by some setups) ──
// We'll leave it as a no-op if we only want manual/websocket refresh,
// or we can uncomment to poll API every 5 minutes automatically.
// setInterval(() => { refreshAndPushLiveUpdate(...) }, 5 * 60 * 1000);

module.exports = {
  fetchLiveIPLScores,
  refreshAndPushLiveUpdate,
  getCacheStatus
};
