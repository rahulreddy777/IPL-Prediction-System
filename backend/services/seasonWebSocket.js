/**
 * seasonWebSocket.js — Deduplicated WebSocket emissions for season engine
 */
const websocketServer = require("./websocketServer");

// TTL-based dedup: event keys expire after DEDUP_TTL_MS.
// This prevents the old "permanent Set" from silencing re-broadcasts when
// clients reconnect after a disconnect or page reload.
const DEDUP_TTL_MS = 60_000; // 60 s
const emittedEvents = new Map(); // key → timestamp

/** Clear dedup cache (call on season reset / new run) */
function clearEmittedEvents() {
  emittedEvents.clear();
  console.log("[SeasonWS] Emitted-events cache cleared");
}

/**
 * Stable dedup key (ignores timestamps and large nested objects)
 */
function buildDedupKey(eventType, payload = {}) {
  const stable = {
    type: eventType,
    matchId: payload.matchId ?? payload.matchNumber ?? null,
    matchNumber: payload.matchNumber ?? null,
    champion: payload.champion ?? null,
    phase: payload.phase ?? null,
    season: payload.season ?? null,
    winner: payload.winner ?? null,
  };
  return `${eventType}:${JSON.stringify(stable)}`;
}

/** Deep clone — safe for WebSocket JSON (strips Mongo ObjectId issues) */
function deepClone(data) {
  return JSON.parse(JSON.stringify(data));
}

/** Sanitize points table rows for client */
function clonePointsTable(pointsTable) {
  if (!Array.isArray(pointsTable)) return [];
  return deepClone(pointsTable).map((row, i) => ({
    team: row.team,
    played: row.played ?? 0,
    won: row.won ?? 0,
    lost: row.lost ?? 0,
    noResult: row.noResult ?? 0,
    points: row.points ?? 0,
    nrr: row.nrr ?? 0,
    status: row.status ?? "",
    rank: row.rank ?? i + 1,
  }));
}

/**
 * Emit WebSocket event at most once per unique (type + stable payload) within DEDUP_TTL_MS.
 * After the TTL the same event is allowed through again (e.g. after a client reconnect).
 */
function emitOnce(eventType, payload = {}) {
  const key = buildDedupKey(eventType, payload);
  const now = Date.now();
  const last = emittedEvents.get(key);

  if (last !== undefined && now - last < DEDUP_TTL_MS) {
    console.log(`[SeasonWS] Skipped duplicate (within ${DEDUP_TTL_MS / 1000}s): ${eventType}`);
    return { sent: 0, skipped: true, key };
  }

  emittedEvents.set(key, now);

  const safePayload = deepClone({
    type: eventType,
    ...payload,
    timestamp: Date.now(),
  });

  if (safePayload.updatedPointsTable) {
    safePayload.updatedPointsTable = clonePointsTable(safePayload.updatedPointsTable);
  }

  const sent = websocketServer.broadcast(safePayload);
  console.log(`[SeasonWS] Emitted ${eventType} → ${sent} client(s)`);
  return { sent, skipped: false, key };
}

/** Points table snapshot event (deduped per match) */
function emitPointsTableUpdate(matchId, pointsTable) {
  emitOnce("POINTS_TABLE_UPDATE", {
    matchId,
    updatedPointsTable: clonePointsTable(pointsTable),
  });
  return emitOnce("POINTS_UPDATED", {
    matchId,
    pointsTable: clonePointsTable(pointsTable),
  });
}

function emitMatchUpdated(payload = {}) {
  return emitOnce("MATCH_UPDATED", { type: "MATCH_UPDATED", ...payload });
}

function emitPlayoffsUpdated(payload = {}) {
  emitOnce("PLAYOFF_BRACKET_UPDATE", payload);
  return emitOnce("PLAYOFFS_UPDATED", { type: "PLAYOFFS_UPDATED", ...payload });
}

module.exports = {
  emitOnce,
  emitPointsTableUpdate,
  emitMatchUpdated,
  emitPlayoffsUpdated,
  clearEmittedEvents,
  clonePointsTable,
  deepClone,
  buildDedupKey,
};
