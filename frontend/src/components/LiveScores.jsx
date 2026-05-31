/**
 * LiveScores.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays live, upcoming, and completed IPL matches from the backend.
 *
 * Data flow:
 *  GET /api/live-scores      → reads MongoDB cache (fast, safe, no quota hit)
 *  POST /api/live-scores/refresh → triggers a fresh CricAPI fetch + re-cache
 *  ${import.meta.env.VITE_WS_URL}    → real-time push events (LIVE_SCORE_UPDATE etc.)
 *
 * Auto-polling: every 30 seconds (GET cache only, no API quota used)
 * Manual refresh: POST refresh button (uses 1 CricAPI hit)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import TeamLogo from "./common/TeamLogo";
import "./LiveScores.css";

// ── Config ────────────────────────────────────────────────────────────────────
const API_URL      = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;
const WS_URL       = import.meta.env.VITE_WS_URL  || `${import.meta.env.VITE_WS_URL}`;
const POLL_MS      = 30_000; // 30 seconds — cache-only, safe

const TEAM_COLORS = {
  MI: "#1E90FF", CSK: "#F9CD05", KKR: "#9B59B6", RCB: "#D4101A",
  DC: "#0057A8", RR: "#EA1A85", SRH: "#F26522", GT: "#00B4D8",
  PBKS: "#DD1F2D", LSG: "#00BFFF",
};
const teamColor = (code) => TEAM_COLORS[code] || "#94a3b8";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(isoString) {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
    }) + " IST";
  } catch { return null; }
}
function formatUpdatedAt(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return "—"; }
}
function extractTeamCode(match, side) {
  return match?.[side] || "";
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Live match card */
function LiveCard({ match }) {
  const t1 = extractTeamCode(match, "team1") || "TBA";
  const t2 = extractTeamCode(match, "team2") || "TBA";
  const c1 = teamColor(t1), c2 = teamColor(t2);

  return (
    <article className="live-card live-card--live">
      <div className="live-card__status live-card__status--live">
        <span className="live-scores__dot" />
        {match.status || "LIVE"}
      </div>

      <div className="live-card__match-name">
        {match.matchDesc || match.name || "IPL 2026 Match"}
      </div>

      <div className="live-card__teams">
        {/* Team 1 */}
        <div className="live-card__row">
          <div className="live-card__team" style={{ color: c1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamLogo team={t1} size={20} showGlow={false} /> {t1}
            {match.team1FullName && (
              <div className="live-card__team-full">{match.team1FullName}</div>
            )}
          </div>
          <div className="live-card__score" style={{ color: c1 }}>
            {match.score1 || "Yet to bat"}
          </div>
        </div>

        {/* Team 2 */}
        <div className="live-card__row">
          <div className="live-card__team" style={{ color: c2, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamLogo team={t2} size={20} showGlow={false} /> {t2}
            {match.team2FullName && (
              <div className="live-card__team-full">{match.team2FullName}</div>
            )}
          </div>
          <div className="live-card__score" style={{ color: c2 }}>
            {match.score2 || "Yet to bat"}
          </div>
        </div>
      </div>

      {/* Run rate / overs */}
      {(match.currentRunRate || match.requiredRunRate || match.overs) && (
        <div className="live-card__crr-row">
          {match.overs        && <span>⏱ Overs: {match.overs}</span>}
          {match.currentRunRate  && <span>CRR: {match.currentRunRate}</span>}
          {match.requiredRunRate && <span>RRR: {match.requiredRunRate}</span>}
        </div>
      )}

      {/* Venue */}
      {match.venue && (
        <div className="live-card__venue">📍 {match.venue}</div>
      )}
    </article>
  );
}

/** Upcoming match card */
function UpcomingCard({ match }) {
  const t1 = extractTeamCode(match, "team1") || "TBA";
  const t2 = extractTeamCode(match, "team2") || "TBA";
  const c1 = teamColor(t1), c2 = teamColor(t2);
  const timeStr = formatTime(match.dateTimeGMT || match.date);

  return (
    <article className="live-card live-card--upcoming">
      <div className="live-card__status live-card__status--upcoming">
        <span className="live-card__status-dot--upcoming" />
        UPCOMING
      </div>
      <div className="live-card__match-name">
        {match.matchDesc || match.name || "IPL 2026 Match"}
      </div>

      <div className="live-card__vs-layout">
        <div className="live-card__team-block">
          <span className="live-card__team-emoji"><TeamLogo team={t1} size={24} showGlow={false} /></span>
          <span className="live-card__team" style={{ color: c1 }}>{t1}</span>
        </div>

        <div className="live-card__vs-badge">VS</div>

        <div className="live-card__team-block live-card__team-block--right">
          <span className="live-card__team-emoji"><TeamLogo team={t2} size={24} showGlow={false} /></span>
          <span className="live-card__team" style={{ color: c2 }}>{t2}</span>
        </div>
      </div>

      <div className="live-card__upcoming-meta">
        {timeStr && <span className="live-card__time">🕗 {timeStr}</span>}
        {match.venue  && <span className="live-card__series">📍 {match.venue}</span>}
        {match.series && <span className="live-card__series">🏆 {match.series}</span>}
      </div>
    </article>
  );
}

/** Completed match card */
function CompletedCard({ match }) {
  const t1 = extractTeamCode(match, "team1") || "TBA";
  const t2 = extractTeamCode(match, "team2") || "TBA";
  const c1 = teamColor(t1), c2 = teamColor(t2);
  const winner = match.winner || match.winningTeam;
  const wColor = winner ? teamColor(winner) : "#34d399";

  return (
    <article className="live-card live-card--completed">
      <div className="live-card__status live-card__status--completed">
        ✅ COMPLETED
      </div>

      {winner && (
        <div className="live-card__winner-banner" style={{ color: wColor }}>
          🏆 {winner} won
        </div>
      )}

      <div className="live-card__match-name">
        {match.matchDesc || match.name || "IPL 2026 Match"}
      </div>

      <div className="live-card__teams">
        <div className="live-card__row">
          <div className="live-card__team" style={{ color: c1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamLogo team={t1} size={20} showGlow={false} /> {t1}
          </div>
          <div className="live-card__score" style={{ color: c1 }}>
            {match.score1 || "—"}
          </div>
        </div>
        <div className="live-card__row">
          <div className="live-card__team" style={{ color: c2, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamLogo team={t2} size={20} showGlow={false} /> {t2}
          </div>
          <div className="live-card__score" style={{ color: c2 }}>
            {match.score2 || "—"}
          </div>
        </div>
      </div>

      {match.status && (
        <div className="live-card__result-status">{match.status}</div>
      )}
    </article>
  );
}

/** Section header */
function SectionLabel({ icon, label, count, color }) {
  return (
    <div className="live-scores__section-label" style={{ color }}>
      <span>{icon}</span>
      <span>{label}</span>
      {count > 0 && (
        <span className="live-scores__section-count">{count}</span>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LiveScores() {
  const [matches,          setMatches]          = useState([]);
  const [upcomingMatches,  setUpcomingMatches]  = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [uiState,          setUiState]          = useState("loading");
  const [source,           setSource]           = useState(null);
  const [updatedAt,        setUpdatedAt]        = useState(null);
  const [error,            setError]            = useState(null);
  const [hint,             setHint]             = useState(null);
  const [refreshing,       setRefreshing]       = useState(false);
  const [countdown,        setCountdown]        = useState(POLL_MS / 1000);

  const timerRef    = useRef(null);
  const countRef    = useRef(null);
  const mountedRef  = useRef(true);

  // ── Fetch cache (no API quota used) ──────────────────────────────────────
  const fetchCache = useCallback(async (silent = false) => {
    if (!silent) setUiState("loading");
    try {
      const { data } = await axios.get(`${API_URL}/api/live-scores`);
      if (!mountedRef.current) return;

      setMatches(data.matches          || []);
      setUpcomingMatches(data.upcomingMatches  || []);
      setCompletedMatches(data.completedMatches || []);
      setUiState(data.uiState || "no-live-match");
      setSource(data.displaySource     || data.source || null);
      setUpdatedAt(data.updatedAt      || null);
      setHint(data.hint                || null);
      setError(data.error              || null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || "Failed to reach backend");
      setUiState("api-unavailable");
    }
  }, []);

  // ── Manual API refresh (uses 1 CricAPI hit) ───────────────────────────────
  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/live-scores/refresh`);
      if (!mountedRef.current) return;

      setMatches(data.matches          || []);
      setUpcomingMatches(data.upcomingMatches  || []);
      setCompletedMatches(data.completedMatches || []);
      setUiState(data.uiState || "no-live-match");
      setSource(data.displaySource     || data.source || "CricAPI");
      setUpdatedAt(data.updatedAt      || new Date().toISOString());
      setHint(data.hint                || null);
      setError(data.error              || null);

      // Reset countdown
      setCountdown(POLL_MS / 1000);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || "Refresh failed");
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, []);

  // ── 30-second polling (cache only, zero API quota) ────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchCache();

    // Poll every 30s (silent — no loading flash)
    timerRef.current = setInterval(() => {
      fetchCache(true);
      setCountdown(POLL_MS / 1000);
    }, POLL_MS);

    // Countdown display (ticks every second)
    countRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? POLL_MS / 1000 : c - 1));
    }, 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
      clearInterval(countRef.current);
    };
  }, [fetchCache]);

  // ── WebSocket — real-time push events ────────────────────────────────────
  useEffect(() => {
    let ws;
    let retryTimeout;

    const connect = () => {
      ws = new WebSocket(WS_URL);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const types = [
            "LIVE_SCORE_UPDATE", "AUTO_REFRESH",
            "MATCH_STATUS_UPDATED", "LIVE_MATCH_STARTED",
            "MATCH_COMPLETED", "DATA_UPDATED", "UPDATED",
          ];
          if (types.includes(payload.type)) {
            fetchCache(true); // Silent refresh, no spinner
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        retryTimeout = setTimeout(connect, 5000); // Reconnect after 5s
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      ws?.close();
      clearTimeout(retryTimeout);
    };
  }, [fetchCache]);

  // ── Listen to global events from other components ─────────────────────────
  useEffect(() => {
    const handleRefetch = () => fetchCache(true);
    window.addEventListener("fetchLiveScores", handleRefetch);
    return () => window.removeEventListener("fetchLiveScores", handleRefetch);
  }, [fetchCache]);

  // ── Derived counts ─────────────────────────────────────────────────────────
  const liveCount     = matches.length;
  const upcomingCount = upcomingMatches.length;
  const completedCount= completedMatches.length;
  const totalShown    = liveCount + upcomingCount + completedCount;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="live-scores">

      {/* ── Header ── */}
      <div className="live-scores__header">
        <div>
          <h2 className="live-scores__title">
            🏏 LIVE IPL SCORES
            {liveCount > 0 && (
              <span className="live-scores__badge">
                <span className="live-scores__dot" />
                {liveCount} LIVE
              </span>
            )}
          </h2>
          <p className="live-scores__meta">
            Auto-refreshes every 30s · Next in{" "}
            <span style={{ color: "#eab308", fontWeight: 700 }}>{countdown}s</span>
            {source && (
              <> · <span style={{ color: "#64748b" }}>Source: {source}</span></>
            )}
            {updatedAt && (
              <> · Updated: {formatUpdatedAt(updatedAt)}</>
            )}
          </p>
        </div>

        {/* Manual refresh button */}
        <button
          className="live-scores__retry"
          onClick={handleManualRefresh}
          disabled={refreshing}
          title="Fetch latest from CricAPI (uses 1 API hit)"
        >
          {refreshing ? "⏳ Fetching…" : "⚡ Fetch from API"}
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="live-scores__error" style={{ marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading state ── */}
      {uiState === "loading" && (
        <div className="live-scores__loading">
          <div className="live-scores__spinner" />
          <span>Fetching live match data…</span>
        </div>
      )}

      {/* ── Content ── */}
      {uiState !== "loading" && (
        <>

          {/* Live matches */}
          {liveCount > 0 && (
            <div className="live-scores__section">
              <SectionLabel icon="🔴" label="LIVE NOW" count={liveCount} color="#22c55e" />
              <div className="live-scores__grid">
                {matches.map((m, i) => (
                  <LiveCard key={m.id || m.matchId || `live-${i}`} match={m} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming matches */}
          {upcomingCount > 0 && (
            <div className="live-scores__section">
              <SectionLabel icon="🕗" label="UPCOMING" count={upcomingCount} color="#f59e0b" />
              <div className="live-scores__grid">
                {upcomingMatches.map((m, i) => (
                  <UpcomingCard key={m.id || m.matchId || `up-${i}`} match={m} />
                ))}
              </div>
            </div>
          )}

          {/* Completed matches */}
          {completedCount > 0 && (
            <div className="live-scores__section">
              <SectionLabel icon="✅" label="COMPLETED" count={completedCount} color="#34d399" />
              <div className="live-scores__grid">
                {completedMatches.map((m, i) => (
                  <CompletedCard key={m.id || m.matchId || `done-${i}`} match={m} />
                ))}
              </div>
            </div>
          )}

          {/* Empty / status state */}
          {totalShown === 0 && uiState !== "api-unavailable" && (
            <div
              className="live-scores__status-box"
              style={{ borderColor: "rgba(234,179,8,0.2)" }}
            >
              <div style={{ fontSize: "2.5rem" }}>🏏</div>
              <p>
                <b>
                  {uiState === "no-live-match"
                    ? "No IPL match in progress right now."
                    : "Match data unavailable."}
                </b>
              </p>
              {hint && <p className="live-scores__empty-hint">{hint}</p>}
              <p className="live-scores__empty-hint">
                Use <b>"⚡ Fetch from API"</b> to pull the latest data from CricAPI.
              </p>
            </div>
          )}

          {/* API unavailable */}
          {uiState === "api-unavailable" && totalShown === 0 && (
            <div
              className="live-scores__status-box"
              style={{ borderColor: "rgba(239,68,68,0.25)" }}
            >
              <div style={{ fontSize: "2.5rem" }}>📡</div>
              <p>
                <b style={{ color: "#f87171" }}>CricAPI Unavailable</b>
              </p>
              <p className="live-scores__empty-hint">
                The backend cannot reach CricAPI. Check your{" "}
                <code>CRIC_API_KEY</code> in <code>.env</code> and ensure
                MongoDB is running.
              </p>
              <button className="live-scores__retry" onClick={handleManualRefresh} disabled={refreshing}>
                {refreshing ? "⏳ Retrying…" : "🔄 Retry Now"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}