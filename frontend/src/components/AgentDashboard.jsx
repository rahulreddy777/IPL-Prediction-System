import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  Bot, RefreshCw, TrendingUp, CheckCircle2, XCircle,
  Clock, Trophy, Target, Zap, Radio, Activity,
  BarChart3, Wifi, WifiOff, ChevronRight
} from "lucide-react";

/* ─── Team colours ────────────────────────────────────────── */
const TEAM_CLR = {
  MI:   "#004ba0", CSK: "#f7a800", KKR: "#3a225d",
  RCB:  "#cc0000", DC:  "#0078bc", RR:  "#2d4b8c",
  SRH:  "#f7430a", PBKS:"#dd1f2d", LSG: "#07b4e8",
  GT:   "#1c4b8c",
};
const teamClr = (code) => TEAM_CLR[code] || "#334155";

/* ─── Win-rate chart bar ──────────────────────────────────── */
function WinBar({ team, wins, total }) {
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0;
  return (
    <div className="ag-win-bar">
      <span className="ag-win-team" style={{ color: teamClr(team) }}>{team}</span>
      <div className="ag-bar-track">
        <div
          className="ag-bar-fill"
          style={{ width: `${pct}%`, background: teamClr(team) }}
        />
      </div>
      <span className="ag-win-count">{wins}W / {pct}%</span>
    </div>
  );
}

/* ─── Single result card ──────────────────────────────────── */
function ResultCard({ r, idx }) {
  const correct = r.predictionCorrect;
  const winner  = r.actualWinner;
  const pred    = r.predictedWinner;
  const conf    = r.confidence ? `${(r.confidence * 1).toFixed(1)}%` : "—";

  return (
    <div className={`ag-card ${correct ? "ag-card--ok" : correct === false ? "ag-card--wrong" : "ag-card--na"}`}>
      {/* Match badge */}
      <div className="ag-card-top">
        <span className="ag-match-num">Match {r.matchNumber ?? `#${idx + 1}`}</span>
        <span className="ag-match-date">{r.date ?? ""} · {r.venue ?? ""}</span>
      </div>

      {/* Teams */}
      <div className="ag-card-matchup">{r.matchup}</div>

      {/* Result vs Prediction */}
      <div className="ag-card-body">
        <div className="ag-result-row">
          <span className="ag-label">Actual Winner</span>
          <span className="ag-winner-pill" style={{ background: `${teamClr(winner)}33`, color: teamClr(winner), border: `1px solid ${teamClr(winner)}66` }}>
            <Trophy size={12} /> {winner}
          </span>
        </div>
        <div className="ag-result-row">
          <span className="ag-label">ML Predicted</span>
          {pred
            ? <span className="ag-pred-pill" style={{ color: correct ? "#22c55e" : "#ef4444" }}>
                {correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {pred}
              </span>
            : <span className="ag-no-pred">No prediction</span>
          }
        </div>
        <div className="ag-result-row">
          <span className="ag-label">ML Confidence</span>
          <span className="ag-conf">{conf}</span>
        </div>
      </div>

      {/* Margin */}
      {r.winMargin && (
        <div className="ag-margin">{r.actualWinnerFull} · {r.winMargin.replace(r.actualWinnerFull, "").trim()}</div>
      )}

      {/* Correct badge */}
      <div className={`ag-verdict ${correct ? "ag-verdict--ok" : correct === false ? "ag-verdict--wrong" : "ag-verdict--na"}`}>
        {correct === true  && <><CheckCircle2 size={13} /> Prediction Correct</>}
        {correct === false && <><XCircle size={13} /> Prediction Wrong</>}
        {correct === null  && <><Clock size={13} /> No Prediction Data</>}
      </div>
    </div>
  );
}

/* ─── Stat pill ───────────────────────────────────────────── */
function StatPill({ icon, label, value, color = "#eab308" }) {
  return (
    <div className="ag-stat">
      <div className="ag-stat-icon" style={{ color }}>{icon}</div>
      <div>
        <div className="ag-stat-val" style={{ color }}>{value}</div>
        <div className="ag-stat-lbl">{label}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN AGENT DASHBOARD
═══════════════════════════════════════════════════════════ */
export default function AgentDashboard() {
  const [results,     setResults]     = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdate,  setLastUpdate]  = useState(null);
  const [triggering,  setTriggering]  = useState(false);
  const [sseStatus,   setSseStatus]   = useState("connecting"); // connecting | live | off
  const [newFlash,    setNewFlash]    = useState(false);
  const [liveIntel,   setLiveIntel]   = useState(null);
  const sseRef = useRef(null);

  /* ── HTTP fetch ── */
  const fetchData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/agent/results`);
      setResults(data.results || []);
      setStats(data.stats   || null);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Cannot reach agent server.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLiveIntel = useCallback(async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/live-intel`);
      setLiveIntel(data);
    } catch { /* optional */ }
  }, []);

  /* ── SSE stream ── */
  useEffect(() => {
    fetchData();
    fetchLiveIntel();
    const li = setInterval(fetchLiveIntel, 45000);

    // Connect SSE
    const es = new EventSource(`${import.meta.env.VITE_API_URL}/api/agent/stream`);
    sseRef.current = es;
    setSseStatus("connecting");

    es.onopen = () => setSseStatus("live");
    es.onerror = () => setSseStatus("off");
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "init" || payload.type === "update") {
          fetchData();
        }
        if (payload.type === "newResult") {
          setNewFlash(true);
          setTimeout(() => setNewFlash(false), 3000);
          fetchData();
        }
      } catch { /* ignore */ }
    };

    return () => {
      clearInterval(li);
      es.close();
    };
  }, [fetchData, fetchLiveIntel]);

  /* ── Manual trigger ── */
  const triggerNow = async () => {
    setTriggering(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/agent/trigger`);
      setResults(data.results || []);
      setStats(data.stats   || null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.response?.data?.error || "Trigger failed.");
    } finally {
      setTriggering(false);
    }
  };

  /* ── Team wins for chart ── */
  const teamWinsArr = stats?.teamWins
    ? Object.entries(stats.teamWins)
        .sort((a, b) => b[1] - a[1])
    : [];

  /* ─── render ─── */
  return (
    <div className="ag-root">

      {/* ── Header ── */}
      <div className="ag-header">
        <div className="ag-header-left">
          <div className="ag-title-row">
            <Bot color="#a78bfa" size={28} />
            <h2 className="ag-title">LIVE MATCH AGENT</h2>
            <div className={`ag-sse-dot ${sseStatus}`} title={`SSE: ${sseStatus}`}>
              {sseStatus === "live" ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{sseStatus === "live" ? "Live Stream" : sseStatus === "connecting" ? "Connecting…" : "Offline"}</span>
            </div>
          </div>
          <p className="ag-sub">
           ML result polling · Live scores from MongoDB cache · ML accuracy tracking
          </p>
        </div>

        <div className="ag-header-right">
          {lastUpdate && (
            <span className="ag-updated">
              <Clock size={11} /> {lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            className={`ag-btn ${triggering ? "ag-btn--spin" : ""}`}
            onClick={triggerNow}
            disabled={triggering}
            title="Force a manual poll now"
          >
            <Zap size={14} />
            {triggering ? "Polling…" : "Poll Now"}
          </button>
        </div>
      </div>

      {/* ── Live feed (API) ── */}
      {liveIntel?.currentLive && (
        <div style={{
          marginBottom: "20px",
          padding: "14px 18px",
          borderRadius: "12px",
          border: "1px solid rgba(239,68,68,0.35)",
          background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(15,23,42,0.9))",
          fontFamily: "Inter, sans-serif",
          fontSize: "13px",
          color: "#e2e8f0",
        }}>
          <div style={{ fontSize: "11px", color: "#f87171", fontWeight: 800, letterSpacing: "1px", marginBottom: "6px" }}>
            🔴 LIVE (feed) · {liveIntel.liveProvider || liveIntel.source}
          </div>
          <strong>M{liveIntel.currentLive.matchNumber}</strong> · {liveIntel.currentLive.team1} vs {liveIntel.currentLive.team2} · {liveIntel.currentLive.venue}
          {liveIntel.currentLive.toss && (
            <div style={{ marginTop: "6px", color: "#a5b4fc", fontSize: "12px" }}>
              🪙 Toss: {liveIntel.currentLive.toss.winner} — {liveIntel.currentLive.toss.choice === "field" ? "field (chase)" : "bat first"}
            </div>
          )}
          {(liveIntel.currentLive.score1 || liveIntel.currentLive.score2) && (
            <div style={{ marginTop: "6px", fontSize: "12px", color: "#94a3b8" }}>
              📊 {liveIntel.currentLive.team1} {liveIntel.currentLive.score1 || "—"}
              {" · "}
              {liveIntel.currentLive.team2} {liveIntel.currentLive.score2 || "—"}
            </div>
          )}
        </div>
      )}

      {/* ── New result flash ── */}
      {newFlash && (
        <div className="ag-flash">
          <Activity size={14} /> New match result detected!
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="ag-error">
          <WifiOff size={16} /> {error}
        </div>
      )}

      {/* ── Stats row ── */}
      {stats && (
        <div className="ag-stats-row">
          <StatPill icon={<BarChart3 size={18} />}  label="Matches Done"     value={stats.totalCompleted}     color="#60a5fa" />
          <StatPill icon={<Target size={18} />}     label="With Prediction"  value={stats.withPrediction}     color="#a78bfa" />
          <StatPill icon={<CheckCircle2 size={18}/>} label="Correct"         value={stats.correctPredictions} color="#22c55e" />
          <StatPill icon={<TrendingUp size={18} />} label="ML Accuracy"      value={`${stats.accuracyPct}%`}  color="#eab308" />
        </div>
      )}

      {/* ── Accuracy progress bar ── */}
      {stats && stats.withPrediction > 0 && (
        <div className="ag-accuracy-block">
          <div className="ag-acc-label">
            <span>ML Prediction Accuracy</span>
            <span className="ag-acc-pct">{stats.accuracyPct}%</span>
          </div>
          <div className="ag-acc-track">
            <div
              className="ag-acc-fill"
              style={{ width: `${stats.accuracyPct}%` }}
            />
          </div>
          <div className="ag-acc-note">
            {stats.correctPredictions} correct out of {stats.withPrediction} predicted matches
          </div>
        </div>
      )}

      {/* ── Two column layout ── */}
      <div className="ag-columns">

        {/* Left – results */}
        <div className="ag-col-results">
          <div className="ag-section-title">
            <Radio size={14} color="#ef4444" />
            Match Results &amp; Predictions
            <span className="ag-badge-count">{results.length}</span>
          </div>

          {loading && (
            <div className="ag-center">
              <div className="ag-spinner" />
              <p>Agent initialising…</p>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="ag-empty">
              <Bot size={48} color="#1e293b" />
              <h3>No Results Yet</h3>
              <p>The agent is monitoring live matches. Results will appear here as IPL 2026 matches complete.</p>
              <button className="ag-btn" onClick={triggerNow} disabled={triggering}>
                <Zap size={13} /> Force Check Now
              </button>
            </div>
          )}

          <div className="ag-results-grid">
            {[...results].reverse().map((r, i) => (
              <ResultCard key={r.cricApiId || i} r={r} idx={results.length - 1 - i} />
            ))}
          </div>
        </div>

        {/* Right – team wins chart */}
        <div className="ag-col-chart">
          <div className="ag-section-title">
            <Trophy size={14} color="#f59e0b" />
            Team Win Leaderboard
          </div>

          {teamWinsArr.length === 0 ? (
            <div className="ag-chart-empty">
              <BarChart3 size={36} color="#1e293b" />
              <p>Win data will appear once matches complete</p>
            </div>
          ) : (
            <div className="ag-win-list">
              {teamWinsArr.map(([team, wins]) => (
                <WinBar
                  key={team}
                  team={team}
                  wins={wins}
                  total={results.length}
                />
              ))}
            </div>
          )}

          {/* Agent status */}
          <div className="ag-agent-status">
            <div className="ag-status-title">
              <Bot size={14} /> Agent Status
            </div>
            <div className="ag-status-rows">
              <div className="ag-status-row">
                <span>Poll interval</span><span>5 minutes</span>
              </div>
              <div className="ag-status-row">
                <span>Stream</span>
                <span style={{ color: sseStatus === "live" ? "#22c55e" : "#ef4444" }}>
                  {sseStatus === "live" ? "● Connected" : "○ Offline"}
                </span>
              </div>
              <div className="ag-status-row">
                <span>Last poll</span>
                <span>{lastUpdate ? lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
              </div>
              <div className="ag-status-row">
                <span>Results stored</span><span>{results.length}</span>
              </div>
            </div>

            <button className="ag-btn ag-btn--full" onClick={triggerNow} disabled={triggering}>
              <ChevronRight size={14} />
              {triggering ? "Polling…" : "Trigger Manual Poll"}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════ STYLES ══════════ */}
      <style>{`
        .ag-root { padding: 36px 24px 80px; max-width: 1400px; margin: 0 auto; }

        /* Header */
        .ag-header { display:flex; justify-content:space-between; align-items:flex-start;
          flex-wrap:wrap; gap:20px; margin-bottom:24px; }
        .ag-header-left {}
        .ag-header-right { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
        .ag-title-row { display:flex; align-items:center; gap:14px; margin-bottom:6px; flex-wrap:wrap; }
        .ag-title { font-size:28px; color:#a78bfa; letter-spacing:2px; }
        .ag-sub { color:#64748b; font-size:13px; margin:0;
          font-family:'Inter',sans-serif; text-transform:none; letter-spacing:0; }

        /* SSE dot */
        .ag-sse-dot { display:flex; align-items:center; gap:6px;
          padding:4px 12px; border-radius:20px; font-size:11px;
          font-family:'Inter',sans-serif; font-weight:600;
          border:1px solid; }
        .ag-sse-dot.live { color:#22c55e; border-color:rgba(34,197,94,.35);
          background:rgba(34,197,94,.1); }
        .ag-sse-dot.connecting { color:#f59e0b; border-color:rgba(245,158,11,.35);
          background:rgba(245,158,11,.1); }
        .ag-sse-dot.off { color:#ef4444; border-color:rgba(239,68,68,.35);
          background:rgba(239,68,68,.1); }

        /* Updated */
        .ag-updated { display:flex; align-items:center; gap:5px;
          font-size:12px; color:#64748b; font-family:'Inter',sans-serif; }

        /* Button */
        .ag-btn { display:flex; align-items:center; gap:8px;
          background:rgba(167,139,250,.12); border:1px solid rgba(167,139,250,.35);
          color:#c4b5fd; padding:9px 18px; border-radius:8px; cursor:pointer;
          font-size:13px; font-family:'Inter',sans-serif; font-weight:600;
          transition:all .2s; white-space:nowrap; }
        .ag-btn:hover:not(:disabled) { background:rgba(167,139,250,.2); border-color:rgba(167,139,250,.6); }
        .ag-btn:disabled { opacity:.5; cursor:not-allowed; }
        .ag-btn--spin svg { animation:agSpin .8s linear infinite; }
        .ag-btn--full { width:100%; justify-content:center; margin-top:16px; }
        @keyframes agSpin { to { transform:rotate(360deg); } }

        /* Flash */
        .ag-flash { display:flex; align-items:center; gap:10px;
          background:rgba(34,197,94,.12); border:1px solid rgba(34,197,94,.35);
          color:#22c55e; padding:12px 20px; border-radius:10px;
          font-family:'Inter',sans-serif; font-size:14px; font-weight:600;
          margin-bottom:20px; animation:agFlash .3s ease; }
        @keyframes agFlash { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }

        /* Error */
        .ag-error { display:flex; align-items:center; gap:10px;
          background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3);
          color:#f87171; padding:12px 20px; border-radius:10px;
          font-family:'Inter',sans-serif; font-size:13px; margin-bottom:20px; }

        /* Stats row */
        .ag-stats-row { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:24px; }
        .ag-stat { display:flex; align-items:center; gap:14px;
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
          border-radius:12px; padding:16px 20px; flex:1; min-width:140px; }
        .ag-stat-icon {}
        .ag-stat-val { font-size:24px; font-weight:800; font-family:'Oswald',sans-serif; }
        .ag-stat-lbl { font-size:12px; color:#64748b; font-family:'Inter',sans-serif; margin-top:2px; }

        /* Accuracy bar */
        .ag-accuracy-block { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.09);
          border-radius:14px; padding:20px 24px; margin-bottom:28px; }
        .ag-acc-label { display:flex; justify-content:space-between; align-items:center;
          font-family:'Inter',sans-serif; font-size:14px; color:#94a3b8; margin-bottom:10px; }
        .ag-acc-pct { font-size:24px; font-weight:800; color:#eab308; font-family:'Oswald',sans-serif; }
        .ag-acc-track { height:10px; background:rgba(255,255,255,.07); border-radius:10px; overflow:hidden; }
        .ag-acc-fill { height:100%; border-radius:10px;
          background:linear-gradient(90deg, #eab308, #22c55e); transition:width .6s ease; }
        .ag-acc-note { font-size:12px; color:#475569; font-family:'Inter',sans-serif; margin-top:10px; }

        /* Two columns */
        .ag-columns { display:grid; grid-template-columns:1fr 340px; gap:24px; }
        @media(max-width:900px) { .ag-columns { grid-template-columns:1fr; } }

        /* Section title */
        .ag-section-title { display:flex; align-items:center; gap:8px;
          font-size:14px; color:#94a3b8; font-family:'Inter',sans-serif; font-weight:700;
          text-transform:uppercase; letter-spacing:1px; margin-bottom:18px; }
        .ag-badge-count { background:rgba(255,255,255,.08); color:#64748b;
          padding:2px 10px; border-radius:20px; font-size:11px; margin-left:4px; }

        /* Results grid */
        .ag-results-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:18px; }

        /* Result card */
        .ag-card { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
          border-radius:14px; padding:18px; transition:transform .2s, box-shadow .2s; }
        .ag-card:hover { transform:translateY(-4px); box-shadow:0 14px 40px -12px rgba(0,0,0,.5); }
        .ag-card--ok    { border-color:rgba(34,197,94,.25); }
        .ag-card--wrong { border-color:rgba(239,68,68,.25); }
        .ag-card--na    { border-color:rgba(255,255,255,.1); }
        .ag-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .ag-match-num  { font-size:12px; color:#a78bfa; font-family:'Oswald',sans-serif;
          font-weight:700; letter-spacing:1px; }
        .ag-match-date { font-size:11px; color:#475569; font-family:'Inter',sans-serif; }
        .ag-card-matchup { font-size:16px; font-weight:800; color:#f1f5f9;
          font-family:'Oswald',sans-serif; letter-spacing:.5px; margin-bottom:14px; }

        .ag-card-body { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
        .ag-result-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .ag-label { font-size:12px; color:#64748b; font-family:'Inter',sans-serif; }
        .ag-winner-pill { display:flex; align-items:center; gap:5px; padding:3px 10px;
          border-radius:20px; font-size:12px; font-weight:700; font-family:'Oswald',sans-serif; }
        .ag-pred-pill { display:flex; align-items:center; gap:5px; font-size:13px;
          font-weight:700; font-family:'Oswald',sans-serif; }
        .ag-no-pred { font-size:12px; color:#334155; font-family:'Inter',sans-serif; font-style:italic; }
        .ag-conf { font-size:14px; font-weight:700; color:#60a5fa; font-family:'Oswald',sans-serif; }
        .ag-margin { font-size:11px; color:#475569; font-family:'Inter',sans-serif;
          background:rgba(0,0,0,.2); border-radius:6px; padding:6px 10px;
          margin-bottom:10px; line-height:1.5; }

        /* Verdict */
        .ag-verdict { display:flex; align-items:center; gap:6px; font-size:12px;
          font-family:'Inter',sans-serif; font-weight:700; padding:6px 0;
          border-top:1px solid rgba(255,255,255,.08); }
        .ag-verdict--ok    { color:#22c55e; }
        .ag-verdict--wrong { color:#ef4444; }
        .ag-verdict--na    { color:#64748b; }

        /* Right col */
        .ag-col-chart {}
        .ag-win-list { display:flex; flex-direction:column; gap:10px; margin-bottom:24px; }
        .ag-win-bar { display:flex; align-items:center; gap:10px; }
        .ag-win-team { font-size:12px; font-weight:800; font-family:'Oswald',sans-serif;
          width:40px; flex-shrink:0; }
        .ag-bar-track { flex:1; height:6px; background:rgba(255,255,255,.07);
          border-radius:6px; overflow:hidden; }
        .ag-bar-fill { height:100%; border-radius:6px; transition:width .5s ease; }
        .ag-win-count { font-size:11px; color:#64748b; font-family:'Inter',sans-serif;
          width:70px; text-align:right; flex-shrink:0; }

        /* Chart empty */
        .ag-chart-empty { display:flex; flex-direction:column; align-items:center;
          gap:12px; padding:30px 10px; color:#334155;
          font-family:'Inter',sans-serif; font-size:13px; text-align:center; }

        /* Agent status box */
        .ag-agent-status { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.09);
          border-radius:12px; padding:18px; }
        .ag-status-title { display:flex; align-items:center; gap:8px; color:#94a3b8;
          font-size:13px; font-family:'Inter',sans-serif; font-weight:700;
          text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; }
        .ag-status-rows { display:flex; flex-direction:column; gap:10px; }
        .ag-status-row { display:flex; justify-content:space-between;
          font-size:13px; font-family:'Inter',sans-serif;
          color:#64748b; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,.05); }
        .ag-status-row:last-child { border:none; padding:0; }
        .ag-status-row span:last-child { color:#94a3b8; font-weight:600; }

        /* Spinner / empty */
        .ag-center { display:flex; flex-direction:column; align-items:center;
          gap:16px; padding:60px 20px; color:#64748b; font-family:'Inter',sans-serif; }
        .ag-spinner { width:40px; height:40px; border:3px solid rgba(255,255,255,.08);
          border-top-color:#a78bfa; border-radius:50%; animation:agSpin .85s linear infinite; }
        .ag-empty { display:flex; flex-direction:column; align-items:center; gap:14px;
          padding:60px 20px; text-align:center; font-family:'Inter',sans-serif; color:#475569; }
        .ag-empty h3 { color:#64748b; font-size:18px; margin:0;
          font-family:'Inter',sans-serif; font-weight:700;
          text-transform:none; letter-spacing:0; }
        .ag-empty p { margin:0; font-size:14px; max-width:360px; line-height:1.7; }
      `}</style>
    </div>
  );
}
