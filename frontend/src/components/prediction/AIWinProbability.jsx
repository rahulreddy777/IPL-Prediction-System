/**
 * AIWinProbability.jsx
 * Matches the screenshot: dark card, match input, Refresh AI button,
 * team probability bars, MOMENTUM row, KEY FACTORS list, Simulate events.
 * Fetches from /api/prediction/:matchId (same as WinProbabilityStream)
 */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

const TEAM_COLORS = {
  MI:   "#1E90FF", CSK:  "#F9CD05", KKR:  "#A855F7",
  RCB:  "#EF4444", DC:   "#3B82F6", RR:   "#EC4899",
  SRH:  "#F97316", GT:   "#06B6D4", PBKS: "#F87171", LSG:  "#4ADE80",
};
const tc = (code) => TEAM_COLORS[code] || "#94a3b8";

function ProbBar({ label, pct, color }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0, Math.min(100, pct || 0))), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: "18px", fontWeight: "700", color, letterSpacing: "1px" }}>
          {label}
        </span>
        <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: "20px", fontWeight: "900", color: "#f1f5f9" }}>
          {(pct || 0).toFixed(1)}%
        </span>
      </div>
      <div style={{ height: "10px", background: "rgba(51,65,85,0.6)", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${w}%`,
          background: color, borderRadius: "999px",
          transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: `0 0 12px ${color}80`,
        }} />
      </div>
    </div>
  );
}

export default function AIWinProbability() {
  const [matchId, setMatchId]   = useState("latest");
  const [data,    setData]      = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);
  const [synced,  setSynced]    = useState(false);

  const fetchPrediction = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    setSynced(false);
    try {
      const res = await axios.get(`${API_BASE}/api/prediction/${id}`);
      setData(res.data);
      if (res.data.matchId && id === "latest") {
         setMatchId(String(res.data.matchId));
      }
      setSynced(true);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchPrediction(matchId); }, []);

  // Polling loop
  useEffect(() => {
    const timer = setInterval(() => {
      fetchPrediction(matchId);
    }, 15000);
    return () => clearInterval(timer);
  }, [matchId, fetchPrediction]);

  // Listen for match selection from elsewhere in the app
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.matchId;
      if (id) { setMatchId(String(id)); fetchPrediction(id); }
    };
    window.addEventListener("pm26-select-match", handler);
    window.addEventListener("AI_PREDICTION_UPDATE", () => fetchPrediction(matchId));
    return () => {
      window.removeEventListener("pm26-select-match", handler);
      window.removeEventListener("AI_PREDICTION_UPDATE", () => {});
    };
  }, [matchId, fetchPrediction]);

  const simulate = async (eventType) => {
    const team = data?.team1 || "RCB";
    try {
      await axios.post(`${API_BASE}/api/simulate-ball/${matchId}`, { eventType, team });
      fetchPrediction(matchId);
    } catch {}
  };

  const t1  = data?.team1 || "—";
  const t2  = data?.team2 || "—";
  const p1  = data?.team1Probability ?? 50;
  const p2  = data?.team2Probability ?? 50;
  const mom = data?.momentum || "—";
  const factors = Array.isArray(data?.keyFactors) ? data.keyFactors : [];

  return (
    <>
      <style>{`
        .ai-wp-section {
          background: linear-gradient(180deg, #0d1a35 0%, #080f22 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
        }
        .ai-wp-header {
          padding: 18px 20px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ai-wp-title {
          font-family: 'Oswald', sans-serif;
          font-size: 20px;
          font-weight: 900;
          color: #fbbf24;
          letter-spacing: 1px;
          line-height: 1;
          margin-bottom: 4px;
        }
        .ai-wp-sub {
          font-size: 11px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .synced-dot {
          color: #22c55e;
          font-weight: 700;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ai-wp-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ai-wp-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: #f1f5f9;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 700;
          width: 72px;
          outline: none;
          text-align: center;
          font-family: 'Oswald', sans-serif;
        }
        .ai-wp-input:focus { border-color: rgba(251,191,36,0.5); }
        .ai-wp-refresh {
          background: linear-gradient(135deg, #d97706, #f59e0b);
          border: none;
          color: #0a0a0a;
          border-radius: 8px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: 0.04em;
          transition: filter 0.2s;
          font-family: 'Oswald', sans-serif;
        }
        .ai-wp-refresh:hover { filter: brightness(1.1); }
        .ai-wp-refresh:disabled { opacity: 0.6; cursor: default; }
        .ai-wp-body { padding: 18px 20px; }
        .ai-wp-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 16px;
        }
        .ai-wp-match-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 14px;
          font-weight: 600;
        }
        .momentum-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(30,41,59,0.7);
          border-radius: 10px;
          border-left: 3px solid #3b82f6;
          margin-bottom: 16px;
        }
        .momentum-label {
          font-size: 10px;
          font-weight: 900;
          color: #3b82f6;
          letter-spacing: 0.1em;
          flex-shrink: 0;
        }
        .momentum-value {
          font-size: 13px;
          color: #e2e8f0;
          font-weight: 600;
        }
        .kf-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 16px;
        }
        .kf-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
        }
        .kf-label {
          color: #64748b;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
          font-size: 11px;
        }
        .kf-val { color: #cbd5e1; }
        .sim-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sim-label { font-size: 11px; color: #64748b; font-weight: 600; flex-shrink: 0; }
        .sim-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          color: #94a3b8;
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s;
        }
        .sim-btn:hover { background: rgba(255,255,255,0.10); color: #e2e8f0; }
        .ai-wp-ts {
          margin-top: 10px;
          font-size: 10px;
          color: #334155;
          text-align: right;
        }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      <section className="ai-wp-section">
        {/* Header */}
        <div className="ai-wp-header">
          <div>
            <div className="ai-wp-title">AI WIN PROBABILITY</div>
            <div className="ai-wp-sub">
              Real-time stream ·{" "}
              {synced
                ? <span className="synced-dot">● Synced</span>
                : loading
                ? <span style={{ color: "#f59e0b" }}>Loading…</span>
                : <span style={{ color: "#64748b" }}>—</span>
              }
            </div>
          </div>
          <div className="ai-wp-controls">
            <input
              type="number" min={1} max={74}
              className="ai-wp-input"
              value={matchId}
              onChange={e => setMatchId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchPrediction(matchId)}
            />
            <button
              className="ai-wp-refresh"
              disabled={loading}
              onClick={() => fetchPrediction(matchId)}
            >
              {loading ? "..." : "Refresh AI"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="ai-wp-body">
          {error && (
            <div style={{ padding: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", color: "#f87171", fontSize: "12px", marginBottom: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          {data ? (
            <div className="ai-wp-card">
              {/* Match label */}
              <div className="ai-wp-match-label">
                Match {data.matchId} · {t1} vs {t2}
              </div>

              {/* Probability Bars */}
              <ProbBar label={t1} pct={p1} color={tc(t1)} />
              <ProbBar label={t2} pct={p2} color={tc(t2)} />

              {/* Momentum */}
              <div className="momentum-row">
                <span className="momentum-label">MOMENTUM</span>
                <span className="momentum-value">{mom}</span>
              </div>

              {/* Key Factors */}
              {factors.length > 0 && (
                <>
                  <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", letterSpacing: "0.1em", marginBottom: "8px" }}>
                    KEY FACTORS
                  </div>
                  <div className="kf-list">
                    {factors.slice(0, 6).map((f, i) => {
                      if (typeof f === "string") {
                        return (
                          <div key={i} className="kf-row">
                            <span>📌</span>
                            <span className="kf-val">{f}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="kf-row">
                          {f.icon && <span style={{ fontSize: "14px", flexShrink: 0 }}>{f.icon}</span>}
                          {f.label && <span className="kf-label">{f.label}</span>}
                          {f.value != null && <span className="kf-val">{String(f.value)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Simulate events */}
              <div className="sim-row">
                <span className="sim-label">Simulate event:</span>
                <button className="sim-btn" onClick={() => simulate("boundary")}>Boundary +5%</button>
                <button className="sim-btn" onClick={() => simulate("wicket")}>Wicket −10%</button>
              </div>

              {/* Timestamp */}
              {data.timestamp && (
                <div className="ai-wp-ts">
                  Updated {new Date(data.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : !loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#475569", fontSize: "13px" }}>
              Enter a match number and click <strong>Refresh AI</strong>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "28px", animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
