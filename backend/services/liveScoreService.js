const { getLiveScores } = require("./cricbuzzService");
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
  if (!rawData) return memCache;

  let allMatches = [];
  if (Array.isArray(rawData.data)) {
    allMatches = rawData.data;
  } else if (Array.isArray(rawData.response)) {
    allMatches = rawData.response;
  } else if (rawData.response && Array.isArray(rawData.response.typeMatches)) {
    // Flatten RapidAPI structure
    rawData.response.typeMatches.forEach(tm => {
      if (Array.isArray(tm.seriesMatches)) {
        tm.seriesMatches.forEach(sm => {
          if (sm.seriesAdWrapper && Array.isArray(sm.seriesAdWrapper.matches)) {
            allMatches.push(...sm.seriesAdWrapper.matches);
          }
        });
      }
    });
  }

  const live = [];
  const upcoming = [];
  const completed = [];

  for (const match of allMatches) {
    // RapidAPI format vs CricAPI format
    const isRapid = !!match.matchInfo;
    const info = isRapid ? match.matchInfo : match;
    const scoreInfo = isRapid ? match.matchScore : match;

    const name = (info.name || info.matchDesc || info.seriesName || "").toLowerCase();
    
    // Accept all matches for now to ensure UI populates if there are matches
    // if (!name.includes("ipl") && !name.includes("indian premier") && !name.includes("women")) {}

    let t1 = "T1", t2 = "T2";
    if (isRapid) {
      t1 = info.team1?.teamSName || info.team1?.teamName || "T1";
      t2 = info.team2?.teamSName || info.team2?.teamName || "T2";
    } else if (match.teams) {
      t1 = match.teams[0] || "T1";
      t2 = match.teams[1] || "T2";
    }

    let s1 = "", s2 = "";
    if (isRapid && scoreInfo?.team1Score) {
      s1 = `${scoreInfo.team1Score.inngs1?.runs || 0}/${scoreInfo.team1Score.inngs1?.wickets || 0} (${scoreInfo.team1Score.inngs1?.overs || 0})`;
    } else if (match.score && match.score[0]) {
      s1 = `${match.score[0].r}/${match.score[0].w} (${match.score[0].o})`;
    }

    if (isRapid && scoreInfo?.team2Score) {
      s2 = `${scoreInfo.team2Score.inngs1?.runs || 0}/${scoreInfo.team2Score.inngs1?.wickets || 0} (${scoreInfo.team2Score.inngs1?.overs || 0})`;
    } else if (match.score && match.score[1]) {
      s2 = `${match.score[1].r}/${match.score[1].w} (${match.score[1].o})`;
    }

    const state = isRapid ? info.state : match.status;
    const matchStarted = isRapid ? state !== "Upcoming" : match.matchStarted;
    const matchEnded = isRapid ? state === "Complete" || state === "Result" : match.matchEnded;

    const doc = {
      id: info.matchId || info.id,
      matchDesc: info.name || info.matchDesc || `${t1} vs ${t2}`,
      status: state || info.status,
      venue: info.venue?.name || info.venue?.city || info.venue || "Unknown Venue",
      dateTimeGMT: info.matchStartTimestamp ? new Date(info.matchStartTimestamp).toISOString() : info.dateTimeGMT,
      team1: t1,
      team2: t2,
      score1: s1,
      score2: s2,
      matchStarted: matchStarted,
      matchEnded: matchEnded,
    };

    if (matchEnded) {
      completed.push(doc);
    } else if (matchStarted) {
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

async function fetchAndCache(db) {
  const data = await getLiveScores();

  if (data && Array.isArray(data.typeMatches) || data) {
    try {
      await db.asPromise();
      await db.collection("liveCache").updateOne(
        { type: "ipl" },
        { $set: { data, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (e) {
      console.warn("[RAPIDAPI] MongoDB save failed:", e.message);
    }
    return { source: "rapidapi", data };
  }

  // Fallback to MongoDB cache
  try {
    await db.asPromise();
    const cache = await db.collection("liveCache").findOne({ type: "ipl" });
    if (cache) {
      return { source: "mongodb-cache", data: cache.data };
    }
  } catch (e) {
    console.warn("[RAPIDAPI] MongoDB read failed:", e.message);
  }

  return null;
}

/**
 * POST refresh — calls Rapid API and updates MongoDB & Memory
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
    return { ...memCache, error: "Failed to fetch from Rapid API" };
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
