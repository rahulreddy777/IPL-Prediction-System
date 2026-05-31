/**
 * PredictionMatches2026 — Match browser + live points table + cap leaderboards
 * GET /api/matches  (league 1–70 + playoffs 71–74)
 * GET /api/points-table  → MongoDB points_table_2026
 * GET /api/orange-cap    → MongoDB batting_stats (top 10 by runs)
 * GET /api/purple-cap    → MongoDB bowling_stats (top 10 by wickets)
 */
import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import axios from "axios";
import TeamLogo from "./common/TeamLogo";
import "./PredictionMatches2026.css";

const API    = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;
const WS_URL = import.meta.env.VITE_WS_URL  || `${import.meta.env.VITE_WS_URL}`;

// ── Static maps ───────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  MI: "#1E90FF", CSK: "#F9CD05", KKR: "#F8C300", RCB: "#D4101A",
  DC: "#0057A8", RR: "#EA1A85",  SRH: "#F26522", GT: "#00B4D8",
  PBKS: "#DD1F2D", LSG: "#00BFFF", TBD: "#64748b",
};

const FILTERS = ["ALL", "LEAGUE", "LIVE", "RESULT", "UPCOMING", "PLAYOFFS"];

// ── Qualified / Eliminated badge lookup (can be overridden by live DB data) ───
// ── Qualified / Eliminated badge lookup (can be overridden by live DB data) ───
const STATUS_MAP = {};

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusBadge(status) {
  if (status === "result")   return { text: "RESULT",   cls: "pm26-badge--result" };
  if (status === "live")     return { text: "LIVE",     cls: "pm26-badge--live" };
  return                            { text: "UPCOMING", cls: "pm26-badge--upcoming" };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function GridButton({ m, active, onSelect }) {
  const isPlayoff = m.stage === "playoff";
  const label = isPlayoff ? m.buttonText : `M${m.matchNumber}`;
  const sub   = isPlayoff ? m.label      : `${m.team1.short} vs ${m.team2.short}`;

  return (
    <button
      type="button"
      className={`pm26-grid-btn ${active ? "pm26-grid-btn--active" : ""} ${
        m.status === "live"   ? "pm26-grid-btn--live" : ""
      } ${m.status === "result" ? "pm26-grid-btn--done" : ""}`}
      onClick={() => onSelect(m)}
      title={`${m.label} · ${m.venue}`}
    >
      <span className="pm26-grid-btn__main">{label}</span>
      <span className="pm26-grid-btn__sub">{sub}</span>
    </button>
  );
}

function MatchDetailCard({ match, loading }) {
  if (loading) return <p className="pm26-placeholder">Loading match…</p>;
  if (!match)  return <p className="pm26-placeholder">Select a match from the grid</p>;

  const badge = statusBadge(match.status);
  const wp    = match.prediction?.winProbability || {};
  const p1    = wp[match.team1.short] ?? match.prediction?.team1Probability ?? null;
  const p2    = wp[match.team2.short] ?? match.prediction?.team2Probability ?? null;

  return (
    <article className="pm26-detail-card">
      <header className="pm26-detail-card__head">
        <h3 className="pm26-detail-card__title">M{match.matchNumber} · IPL 2026</h3>
        <span className={`pm26-badge ${badge.cls}`}>{badge.text}</span>
      </header>

      <p className="pm26-detail-card__stage">{match.label}</p>

      <div className="pm26-detail-card__teams">
        <div className="pm26-detail-team">
          <div style={{ margin: "0 auto 8px", display: "flex", justifyContent: "center" }}>
            <TeamLogo team={match.team1.short} size={48} showGlow={false} />
          </div>
          <div className="pm26-detail-team__name" style={{ color: TEAM_COLORS[match.team1.short] }}>
            {match.team1.short}
          </div>
          <div className="pm26-detail-team__full">{match.team1.name}</div>
          <div className="pm26-detail-team__score">{match.team1.score || match.score_team_1 || "—"}</div>
        </div>

        <div className="pm26-detail-card__vs">VS</div>

        <div className="pm26-detail-team">
          <div style={{ margin: "0 auto 8px", display: "flex", justifyContent: "center" }}>
            <TeamLogo team={match.team2.short} size={48} showGlow={false} />
          </div>
          <div className="pm26-detail-team__name" style={{ color: TEAM_COLORS[match.team2.short] }}>
            {match.team2.short}
          </div>
          <div className="pm26-detail-team__full">{match.team2.name}</div>
          <div className="pm26-detail-team__score">{match.team2.score || match.score_team_2 || "—"}</div>
        </div>
      </div>

      {match.winner && (
        <div className="pm26-winner-strip">
          Winner: <strong style={{ color: TEAM_COLORS[typeof match.winner === 'object' ? match.winner.code : match.winner] }}>{typeof match.winner === 'object' ? match.winner.code : match.winner}</strong>
          {match.result && <span className="pm26-winner-strip__margin"> · {match.result}</span>}
        </div>
      )}

      <dl className="pm26-meta-list">
        <div><dt>Venue</dt><dd>{match.venue || "—"}</dd></div>
        <div><dt>Date</dt><dd>{match.dateISO || match.date || "—"} {match.timeIST || ""}</dd></div>
        <div><dt>Status</dt><dd>{match.dbStatus || match.status}</dd></div>
        {(match.tossWinner || match.tossDecision) && (
          <div>
            <dt>Toss</dt>
            <dd>{match.tossWinner || "—"}{match.tossDecision ? ` · ${match.tossDecision}` : ""}</dd>
          </div>
        )}
      </dl>

      {match.prediction?.predictedWinner && (
        <div className="pm26-ai-pick">
          AI pick:{" "}
          <strong style={{ color: TEAM_COLORS[match.prediction.predictedWinner] }}>
            {match.prediction.predictedWinner}
          </strong>
          {p1 != null && (
            <span className="pm26-ai-pick__pct"> ({p1}% / {p2}%)</span>
          )}
        </div>
      )}
    </article>
  );
}

// ── Points Table (inline, auto-refreshed) ─────────────────────────────────────
const PointsTablePanel = memo(function PointsTablePanel({ rows, lastRefresh }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="pm26-points-panel">
      <div className="pm26-points-header">
        <span className="pm26-points-title">📊 IPL 2026 Points Table</span>
        {lastRefresh && (
          <span className="pm26-points-refresh">
            Updated {new Date(lastRefresh).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="pm26-points-table-wrap">
        <table className="pm26-points-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>L</th>
              <th>NR</th>
              <th>PTS</th>
              <th>NRR</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const teamKey  = row.team || row.Team || "";
              const color    = TEAM_COLORS[teamKey] || "#94a3b8";
              /* Determine status: prefer DB field, fallback to static map */
              const rawStatus = row.status || row.Status || STATUS_MAP[teamKey] || "";
              const isQ  = rawStatus === "Q"        || rawStatus === "Qualified";
              const isE  = rawStatus === "E"        || rawStatus === "Eliminated";
              const rank = row.rank ?? row.Rank ?? (i + 1);

              return (
                <tr key={teamKey || i} className={isQ ? "pt-row--q" : isE ? "pt-row--e" : ""}>
                  <td className="pt-rank">{rank}</td>
                  <td className="pt-team">
                    <TeamLogo team={teamKey} size={24} showGlow={false} style={{ marginRight: '8px' }} />
                    <span style={{ color }}>{teamKey}</span>
                  </td>
                  <td>{row.played ?? row.P ?? "—"}</td>
                  <td className="pt-w">{row.won  ?? row.W ?? "—"}</td>
                  <td className="pt-l">{row.lost ?? row.L ?? "—"}</td>
                  <td>{row.noResult ?? row.NR ?? 0}</td>
                  <td className="pt-pts">{row.points ?? row.PTS ?? "—"}</td>
                  <td className="pt-nrr">{row.nrr ?? row.NRR ?? "—"}</td>
                  <td>
                    {isQ && <span className="pt-badge pt-badge--q">Q</span>}
                    {isE && <span className="pt-badge pt-badge--e">E</span>}
                    {!isQ && !isE && <span className="pt-badge pt-badge--m">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ── Orange Cap Modal ──────────────────────────────────────────────────────────
const OrangeCapModal = memo(function OrangeCapModal({ data, onClose }) {
  return (
    <div className="cap-overlay" onClick={onClose}>
      <div className="cap-modal cap-modal--orange" onClick={(e) => e.stopPropagation()}>
        <div className="cap-modal__header cap-modal__header--orange">
          <span className="cap-modal__title">🏏 Orange Cap Leaders</span>
          <button className="cap-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cap-modal__body">
          {data.length === 0 ? (
            <p className="cap-empty">No data available. Check MongoDB batting_stats collection.</p>
          ) : (
            <table className="cap-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Runs</th>
                  <th>M</th>
                  <th>Avg</th>
                  <th>SR</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p, i) => {
                  const team  = p.team || p.Team || "";
                  const color = TEAM_COLORS[team] || "#f59e0b";
                  return (
                    <tr key={i}>
                      <td className="cap-rank">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </td>
                      <td className="cap-player">{p.name || p.player || p.Player || "—"}</td>
                      <td className="cap-team-cell">
                        <TeamLogo team={team} size={20} showGlow={false} style={{ marginRight: '6px' }} />
                        <span style={{ color }}>{team}</span>
                      </td>
                      <td className="cap-stat cap-stat--orange">{p.runs ?? p.Runs ?? "—"}</td>
                      <td>{p.matches ?? p.innings ?? p.M ?? "—"}</td>
                      <td>{p.average != null ? Number(p.average).toFixed(1) : (p.avg != null ? Number(p.avg).toFixed(1) : "—")}</td>
                      <td>{p.strikeRate != null ? Number(p.strikeRate).toFixed(1) : (p.strike_rate != null ? Number(p.strike_rate).toFixed(1) : "—")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Purple Cap Modal ──────────────────────────────────────────────────────────
const PurpleCapModal = memo(function PurpleCapModal({ data, onClose }) {
  return (
    <div className="cap-overlay" onClick={onClose}>
      <div className="cap-modal cap-modal--purple" onClick={(e) => e.stopPropagation()}>
        <div className="cap-modal__header cap-modal__header--purple">
          <span className="cap-modal__title">💜 Purple Cap Leaders</span>
          <button className="cap-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cap-modal__body">
          {data.length === 0 ? (
            <p className="cap-empty">No data available. Check MongoDB bowling_stats collection.</p>
          ) : (
            <table className="cap-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Wkts</th>
                  <th>Econ</th>
                  <th>Avg</th>
                  <th>M</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p, i) => {
                  const team  = p.team || p.Team || "";
                  const color = TEAM_COLORS[team] || "#a855f7";
                  return (
                    <tr key={i}>
                      <td className="cap-rank">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </td>
                      <td className="cap-player">{p.name || p.player || p.Player || "—"}</td>
                      <td className="cap-team-cell">
                        <TeamLogo team={team} size={20} showGlow={false} style={{ marginRight: '6px' }} />
                        <span style={{ color }}>{team}</span>
                      </td>
                      <td className="cap-stat cap-stat--purple">{p.wickets ?? p.Wickets ?? "—"}</td>
                      <td>{p.economy != null ? Number(p.economy).toFixed(2) : "—"}</td>
                      <td>{p.average != null ? Number(p.average).toFixed(1) : (p.avg != null ? Number(p.avg).toFixed(1) : "—")}</td>
                      <td>{p.matches ?? p.M ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function PredictionMatches2026({ onSelectMatch }) {
  // Match browsing state
  const [matches,       setMatches]       = useState([]);
  const [top4,          setTop4]          = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [detail,        setDetail]        = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState("ALL");
  const [error,         setError]         = useState(null);

  // Points table state
  const [pointsTable,   setPointsTable]   = useState([]);
  const [pointsRefresh, setPointsRefresh] = useState(null);
  const [loadingPts,    setLoadingPts]    = useState(false);

  // Cap leaderboard state
  const [orangeCapData, setOrangeCapData] = useState([]);
  const [purpleCapData, setPurpleCapData] = useState([]);
  const [showOrangeCap, setShowOrangeCap] = useState(false);
  const [showPurpleCap, setShowPurpleCap] = useState(false);
  const [loadingOrange, setLoadingOrange] = useState(false);
  const [loadingPurple, setLoadingPurple] = useState(false);

  const selectedRef = useRef(null);

  // ── Fetch: match list ──────────────────────────────────────────────────────
  const loadMatches = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/matches`, {
        params: { search: search.trim() || undefined, stage: filter },
        timeout: 30000,
      });
      if (!data.success) throw new Error(data.error || "Failed to load matches");
      setMatches(data.matches || []);
      setTop4(data.top4 || []);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [search, filter]);

  // ── Fetch: match detail ────────────────────────────────────────────────────
  const loadDetail = useCallback(async (match) => {
    if (!match) return;
    selectedRef.current = match.matchNumber;
    setSelected(match);
    setLoadingDetail(true);
    onSelectMatch?.(match.matchNumber);
    try {
      const matchRes = await axios.get(`${API}/api/matches/${match.matchNumber}`);
      let predRes = null;
      try {
        predRes = await axios.get(`${API}/api/prediction/${match.matchNumber}`);
      } catch (err) {
        console.warn("Failed to fetch central prediction:", err.message);
      }
      if (selectedRef.current === match.matchNumber) {
        const enrichedMatch = {
          ...matchRes.data.match,
          prediction: predRes ? predRes.data : (matchRes.data.match?.prediction || null)
        };
        setDetail(enrichedMatch);
      }
    } catch (e) {
      setDetail(match);
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoadingDetail(false);
    }
  }, [onSelectMatch]);

  // ── Fetch: points table (MongoDB) ──────────────────────────────────────────
  const loadPoints = useCallback(async () => {
    setLoadingPts(true);
    try {
      const res  = await fetch(`${API}/api/points-table`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const seen = new Set();
        const deduped = [];
        for (const row of data) {
          const teamKey = row.team || row.Team || '';
          if (teamKey && !seen.has(teamKey)) {
            seen.add(teamKey);
            deduped.push(row);
          }
        }
        setPointsTable(deduped);
        setPointsRefresh(Date.now());
        console.log("[POINTS TABLE LOADED]", deduped.length, "teams");
      }
    } catch (err) {
      console.warn("[POINTS TABLE] fetch error:", err.message);
    } finally {
      setLoadingPts(false);
    }
  }, []);

  // ── Fetch: orange cap (MongoDB) ────────────────────────────────────────────
  const loadOrangeCap = useCallback(async () => {
    setLoadingOrange(true);
    try {
      const res  = await fetch(`${API}/api/orange-cap`);
      const data = await res.json();
      setOrangeCapData(Array.isArray(data) ? data : []);
      console.log("[ORANGE CAP LOADED]", data.length, "batters");
    } catch (err) {
      console.warn("[ORANGE CAP] fetch error:", err.message);
      setOrangeCapData([]);
    } finally {
      setLoadingOrange(false);
    }
  }, []);

  const openOrangeCap = useCallback(() => {
    setShowOrangeCap(true);
    loadOrangeCap();
  }, [loadOrangeCap]);

  // ── Fetch: purple cap (MongoDB) ────────────────────────────────────────────
  const loadPurpleCap = useCallback(async () => {
    setLoadingPurple(true);
    try {
      const res  = await fetch(`${API}/api/purple-cap`);
      const data = await res.json();
      setPurpleCapData(Array.isArray(data) ? data : []);
      console.log("[PURPLE CAP LOADED]", data.length, "bowlers");
    } catch (err) {
      console.warn("[PURPLE CAP] fetch error:", err.message);
      setPurpleCapData([]);
    } finally {
      setLoadingPurple(false);
    }
  }, []);

  const openPurpleCap = useCallback(() => {
    setShowPurpleCap(true);
    loadPurpleCap();
  }, [loadPurpleCap]);

  // ── Effect: initial match load + re-load on filter/search change ───────────
  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 15000);
    return () => clearInterval(interval);
  }, [loadMatches]);

  // ── Effect: initial fetch of caps ──────────────────────────────────────────
  useEffect(() => {
    loadOrangeCap();
    loadPurpleCap();
  }, [loadOrangeCap, loadPurpleCap]);

  // ── Effect: auto-refresh points table every 15 s ───────────────────────────
  useEffect(() => {
    loadPoints();
    const interval = setInterval(loadPoints, 15000);
    return () => clearInterval(interval);
  }, [loadPoints]);

  // Unified WebSocket custom event subscription
  useEffect(() => {
    const handleUpdate = () => {
      loadMatches();
      if (selectedRef.current) {
        loadDetail({ matchNumber: selectedRef.current });
      }
    };

    const handlePointsUpdate = () => {
      loadPoints();
    };

    window.addEventListener("PLAYOFF_BRACKET_UPDATE", handleUpdate);
    window.addEventListener("AI_PREDICTION_UPDATE", handleUpdate);
    window.addEventListener("MATCH_COMPLETED", handleUpdate);
    window.addEventListener("POINTS_UPDATED", handlePointsUpdate);

    return () => {
      window.removeEventListener("PLAYOFF_BRACKET_UPDATE", handleUpdate);
      window.removeEventListener("AI_PREDICTION_UPDATE", handleUpdate);
      window.removeEventListener("MATCH_COMPLETED", handleUpdate);
      window.removeEventListener("POINTS_UPDATED", handlePointsUpdate);
    };
  }, [loadMatches, loadPoints, loadDetail]);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const league   = useMemo(() => matches.filter((m) => m.stage === "league"),  [matches]);
  const playoffs = useMemo(() => matches.filter((m) => m.stage === "playoff"), [matches]);

  // ── Keyboard: Escape closes modals ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setShowOrangeCap(false); setShowPurpleCap(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="pm26">

      {/* ── Header ── */}
      <header className="pm26-header">
        <h2 className="pm26-title">Match Schedule</h2>
        <p className="pm26-sub">
          League M1–M70 · Playoffs · click a match for scores and result
        </p>

        {top4.length >= 4 && (
          <p className="pm26-top4">
            Top 4:{" "}
            {top4.map((t, i) => <span key={t}>{i + 1}. {t} </span>)}
          </p>
        )}

        {/* ── Action Buttons Bar ── */}
        <div className="pm26-action-bar">
          {/* Run AI Prediction */}
          <button
            type="button"
            className="pm26-action-btn pm26-action-btn--gold"
            onClick={loadMatches}
          >
            ⚡ Run AI Prediction
          </button>

          {/* Fix from Live API */}
          <button
            type="button"
            className="pm26-action-btn pm26-action-btn--blue"
            onClick={() => {
              axios.post(`${API}/api/live-scores/refresh`).catch(() => {});
              loadMatches();
            }}
          >
            🔄 Fix from Live API
          </button>

          {/* Apply Match 68 */}
          <button
            type="button"
            className="pm26-action-btn pm26-action-btn--gold"
            onClick={async () => {
              try {
                await axios.post(`${API}/api/season/sync-match-68`, { allowPredicted: true });
                loadPoints();
                loadMatches();
                alert("Match 68 applied to standings!");
              } catch (e) {
                alert("Error: " + (e.response?.data?.error || e.message));
              }
            }}
          >
            ⏭️ Apply Match 68
          </button>

          {/* Refresh Points */}
          <button
            type="button"
            className="pm26-action-btn pm26-action-btn--teal"
            onClick={loadPoints}
            disabled={loadingPts}
          >
            {loadingPts ? "⏳ Refreshing…" : "📊 Refresh Points"}
          </button>

          {/* Orange Cap */}
          <button
            type="button"
            className="pm26-action-btn pm26-action-btn--orange"
            onClick={openOrangeCap}
            disabled={loadingOrange}
          >
            {loadingOrange ? "⏳ Loading…" : "🏏 Orange Cap"}
          </button>

          {/* Purple Cap */}
          <button
            type="button"
            className="pm26-action-btn pm26-action-btn--purple"
            onClick={openPurpleCap}
            disabled={loadingPurple}
          >
            {loadingPurple ? "⏳ Loading…" : "💜 Purple Cap"}
          </button>
        </div>

        {/* ── Search + Filter Toolbar ── */}
        <div className="pm26-toolbar">
          <input
            type="search"
            className="pm26-search"
            placeholder="Search team, venue, stage…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="pm26-filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`pm26-filter-btn ${filter === f ? "pm26-filter-btn--on" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && <div className="pm26-error">{error}</div>}

      {/* ── Match Grid + Detail ── */}
      <div className="pm26-layout">
        <div className="pm26-list">
          <h3 className="pm26-section-label">League · M1 – M70</h3>
          <div className="pm26-match-grid">
            {league.map((m) => (
              <GridButton
                key={m.matchNumber}
                m={m}
                active={selected?.matchNumber === m.matchNumber}
                onSelect={loadDetail}
              />
            ))}
          </div>

          <h3 className="pm26-section-label pm26-section-label--playoff">Playoffs</h3>
          <div className="pm26-match-grid pm26-match-grid--playoffs">
            {playoffs.map((m) => (
              <GridButton
                key={m.matchNumber}
                m={m}
                active={selected?.matchNumber === m.matchNumber}
                onSelect={loadDetail}
              />
            ))}
          </div>
        </div>

        <div className="pm26-detail">
          <MatchDetailCard match={detail || selected} loading={loadingDetail} />
        </div>
      </div>

      {/* ── Orange Cap Modal ── */}
      {showOrangeCap && (
        <OrangeCapModal
          data={orangeCapData}
          onClose={() => setShowOrangeCap(false)}
        />
      )}

      {/* ── Purple Cap Modal ── */}
      {showPurpleCap && (
        <PurpleCapModal
          data={purpleCapData}
          onClose={() => setShowPurpleCap(false)}
        />
      )}
    </section>
  );
}
