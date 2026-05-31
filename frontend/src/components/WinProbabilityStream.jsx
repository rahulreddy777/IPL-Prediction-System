/**
 * WinProbabilityStream.jsx — Live AI win % via WebSocket (no polling)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import "./WinProbabilityStream.css";

const WS_URL = import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_WS_URL}`;
const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const TEAM_COLORS = {
  MI: "#1E90FF",
  CSK: "#F9CD05",
  KKR: "#F8C300",
  RCB: "#D4101A",
  DC: "#0057A8",
  RR: "#EA1A85",
  SRH: "#F26522",
  GT: "#00B4D8",
  PBKS: "#DD1F2D",
  LSG: "#00BFFF",
};

function ProbBar({ label, pct, color }) {
  const width = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="wp-bar">
      <div className="wp-bar__header">
        <span className="wp-bar__team" style={{ color }}>
          {label}
        </span>
        <span className="wp-bar__pct">{width.toFixed(1)}%</span>
      </div>
      <div className="wp-bar__track">
        <div
          className="wp-bar__fill"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function WinProbabilityStream({ defaultMatchId = 68, selectedMatchId }) {
  const [update, setUpdate] = useState(null);
  const [matchId, setMatchId] = useState(String(selectedMatchId ?? defaultMatchId));
  const [error, setError] = useState(null);

  const triggerUpdateForId = useCallback(async (id) => {
    try {
      setError(null);
      const { data } = await axios.get(`${API_BASE}/api/prediction/${id}`);
      setUpdate(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, []);

  useEffect(() => {
    if (selectedMatchId != null) {
      setMatchId(String(selectedMatchId));
      triggerUpdateForId(selectedMatchId);
    }
  }, [selectedMatchId, triggerUpdateForId]);

  useEffect(() => {
    triggerUpdateForId(matchId);
    const interval = setInterval(() => triggerUpdateForId(matchId), 15000);
    return () => clearInterval(interval);
  }, [matchId, triggerUpdateForId]);

  useEffect(() => {
    const onPick = (e) => {
      const id = e.detail?.matchId;
      if (id) {
        setMatchId(String(id));
        triggerUpdateForId(id);
      }
    };
    window.addEventListener("pm26-select-match", onPick);
    return () => {
      window.removeEventListener("pm26-select-match", onPick);
    };
  }, [triggerUpdateForId]);

  // Unified WebSocket custom event subscription
  useEffect(() => {
    const handleUpdate = () => {
      triggerUpdateForId(matchId);
    };
    window.addEventListener("AI_PREDICTION_UPDATE", handleUpdate);
    window.addEventListener("PLAYOFF_BRACKET_UPDATE", handleUpdate);
    return () => {
      window.removeEventListener("AI_PREDICTION_UPDATE", handleUpdate);
      window.removeEventListener("PLAYOFF_BRACKET_UPDATE", handleUpdate);
    };
  }, [matchId, triggerUpdateForId]);

  const triggerUpdate = () => triggerUpdateForId(matchId);

  const simulateBall = async (eventType) => {
    const team = update?.team1;
    if (!team) return;
    try {
      await axios.post(`${API_BASE}/api/simulate-ball/${matchId}`, {
        eventType,
        team,
      });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const t1 = update?.team1 || "T1";
  const t2 = update?.team2 || "T2";
  const p1 = update?.team1Probability ?? 50;
  const p2 = update?.team2Probability ?? 50;

  return (
    <section className="wp-stream">
      <header className="wp-stream__header">
        <div>
          <h2 className="wp-stream__title">AI Win Probability</h2>
          <p className="wp-stream__sub">
            Real-time stream ·{" "}
            <span className="wp-stream__on">
              Synced
            </span>
          </p>
        </div>
        <div className="wp-stream__controls">
          <input
            type="number"
            min={1}
            max={74}
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="wp-stream__input"
            aria-label="Match number"
          />
          <button type="button" className="wp-stream__btn" onClick={triggerUpdate}>
            Refresh AI
          </button>
        </div>
      </header>

      {error && <p className="wp-stream__error">{error}</p>}

      {update ? (
        <div className="wp-stream__card">
          <div className="wp-stream__match">
            Match {update.matchId} · {t1} vs {t2}
          </div>

          <ProbBar label={t1} pct={p1} color={TEAM_COLORS[t1] || "#38bdf8"} />
          <ProbBar label={t2} pct={p2} color={TEAM_COLORS[t2] || "#f59e0b"} />

          <div className="wp-stream__momentum">
            <span className="wp-stream__momentum-label">Momentum</span>
            <span>{update.momentum || "—"}</span>
          </div>

          {Array.isArray(update.keyFactors) && update.keyFactors.length > 0 && (
            <div className="wp-stream__factors">
              <h3>Key factors</h3>
              <ul>
                {update.keyFactors.map((f, i) => {
                  // f may be a plain string OR an {icon, label, value, type} object
                  if (f && typeof f === "object") {
                    return (
                      <li key={i} style={{ listStyle: "none", display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "4px" }}>
                        {f.icon && <span>{f.icon}</span>}
                        {f.label && <strong style={{ color: "#94a3b8", fontSize: "12px" }}>{String(f.label)}</strong>}
                        {f.value != null && <span style={{ color: "#cbd5e1", fontSize: "12px" }}>{String(f.value)}</span>}
                      </li>
                    );
                  }
                  // Plain string
                  return <li key={i}>{String(f ?? "")}</li>;
                })}
              </ul>
            </div>
          )}

          <div className="wp-stream__sim">
            <span>Simulate event:</span>
            <button type="button" onClick={() => simulateBall("boundary")}>
              Boundary +5%
            </button>
            <button type="button" onClick={() => simulateBall("wicket")}>
              Wicket −10%
            </button>
          </div>

          <footer className="wp-stream__ts">
            Updated {new Date(update.timestamp).toLocaleTimeString()}
          </footer>
        </div>
      ) : (
        <p className="wp-stream__empty">
          Waiting for <code>AI_WIN_PROBABILITY_UPDATE</code>… Click Refresh AI or
          update a live score.
        </p>
      )}
    </section>
  );
}
