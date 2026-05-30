/**
 * PlayoffAIPrediction.jsx
 * Advanced IPL 2026 Playoff AI Prediction Engine — Premium UI
 */
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws";

const TEAM_CONFIG = {
  RCB:  { color: "#D4101A", gradient: "linear-gradient(135deg,#D4101A,#8B0000)", emoji: "🔴", light: "#ff6b6b" },
  GT:   { color: "#00B4D8", gradient: "linear-gradient(135deg,#00B4D8,#0077b6)", emoji: "🔵", light: "#7dd3fc" },
  SRH:  { color: "#F26522", gradient: "linear-gradient(135deg,#F26522,#c0392b)", emoji: "🟠", light: "#fdba74" },
  RR:   { color: "#EA1A85", gradient: "linear-gradient(135deg,#EA1A85,#9d174d)", emoji: "💗", light: "#f9a8d4" },
  TBD:  { color: "#475569", gradient: "linear-gradient(135deg,#475569,#1e293b)", emoji: "❓", light: "#94a3b8" },
};

function tc(code) { return TEAM_CONFIG[code] || TEAM_CONFIG.TBD; }

// ─── Meter Component ──────────────────────────────────────────────────────────
function Meter({ label, value, max = 100, color = "#10b981", icon = "📊", subtitle, animated = true }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!animated) { setDisplay(value); return; }
    let frame;
    let start = null;
    const duration = 800;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(ease * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, animated]);

  const displayPct = Math.min((display / max) * 100, 100);

  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
          {icon} {label}
        </span>
        <span style={{ fontSize: "13px", fontWeight: "700", color }}>
          {display}%
        </span>
      </div>
      <div style={{
        height: "6px", background: "rgba(51,65,85,0.6)", borderRadius: "999px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${displayPct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: "999px",
          transition: "width 0.05s linear",
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
      {subtitle && <p style={{ fontSize: "10px", color: "#475569", margin: "3px 0 0" }}>{subtitle}</p>}
    </div>
  );
}

// ─── Win Probability Arc ──────────────────────────────────────────────────────
function WinProbabilityArc({ team1, team2, prob1, prob2, winner }) {
  const c1 = tc(team1);
  const c2 = tc(team2);
  const [anim, setAnim] = useState(50);

  useEffect(() => {
    const t = setTimeout(() => setAnim(prob1), 100);
    return () => clearTimeout(t);
  }, [prob1]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
      <div style={{ position: "relative", width: "200px", height: "110px" }}>
        <svg viewBox="0 0 200 110" style={{ width: "100%", height: "100%" }}>
          {/* Background arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth="14" strokeLinecap="round"
          />
          {/* Team 2 arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none" stroke={c2.color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray="283" strokeDashoffset="0" opacity="0.4"
          />
          {/* Team 1 arc (animated) */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none" stroke={c1.color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={`${283 * (1 - anim / 100)}`}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}
          />
          {/* Center text */}
          <text x="100" y="88" textAnchor="middle" fontSize="20" fontWeight="900" fill={c1.color}>
            {Math.round(anim)}%
          </text>
          <text x="100" y="105" textAnchor="middle" fontSize="9" fill="#64748b">vs {Math.round(100 - anim)}%</text>
        </svg>
      </div>
      <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: c1.color }}>{c1.emoji} {team1}</span>
        <span style={{ fontSize: "11px", color: "#475569" }}>vs</span>
        <span style={{ fontSize: "13px", fontWeight: "700", color: c2.color }}>{c2.emoji} {team2}</span>
      </div>
      {winner && (
        <div style={{
          marginTop: "8px", padding: "4px 16px", borderRadius: "20px",
          background: `${tc(winner).color}20`, border: `1px solid ${tc(winner).color}50`,
          fontSize: "11px", fontWeight: "700", color: tc(winner).color,
        }}>
          🏆 {winner} predicted winner
        </div>
      )}
    </div>
  );
}

// ─── Team Analysis Card (with overall strength and weakness meters) ───────────
function TeamAnalysisCard({ data, isWinner }) {
  const color = tc(data.team);
  const s = data.scores;

  // Quantitative Strength and Weakness metrics based on 20+ weighted factors
  const strengthRating = Math.round((s.battingStrength * 0.4 + s.bowlingStrength * 0.4 + s.squadBalance * 0.2));
  const weaknessRating = Math.round((100 - s.squadBalance) * 0.7 + data.injuryRisk * 0.3);

  return (
    <div style={{
      background: isWinner
        ? `linear-gradient(135deg, ${color.color}12 0%, rgba(15,23,42,0.9) 100%)`
        : "rgba(15,23,42,0.7)",
      border: isWinner ? `1.5px solid ${color.color}44` : "1px solid rgba(51,65,85,0.5)",
      borderRadius: "16px",
      padding: "20px",
      flex: 1,
      minWidth: "280px",
      boxShadow: isWinner ? `0 0 30px ${color.color}18` : "none",
      position: "relative",
      overflow: "hidden",
    }}>
      {isWinner && (
        <div style={{
          position: "absolute", top: "10px", right: "10px",
          fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
          background: `${color.color}25`, color: color.color, border: `1px solid ${color.color}44`,
        }}>
          PREDICTED ✓
        </div>
      )}

      {/* Team header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "12px",
          background: color.gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "22px", boxShadow: `0 4px 12px ${color.color}44`,
        }}>
          {color.emoji}
        </div>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "900", color: color.color }}>{data.team}</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>🏟️ {data.captain} (C) · {data.recentForm}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "#f1f5f9" }}>{data.winProbability}%</div>
          <div style={{ fontSize: "10px", color: "#64748b" }}>win prob</div>
        </div>
      </div>

      {/* Overall Strength & Weakness Gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <div style={{
          padding: "10px 8px", background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.15)", borderRadius: "10px", textAlign: "center"
        }}>
          <div style={{ fontSize: "16px", color: "#10b981", fontWeight: "900" }}>{strengthRating}%</div>
          <div style={{ fontSize: "9px", color: "#10b981", fontWeight: "700", marginTop: "2px" }}>STRENGTH RATING</div>
        </div>
        <div style={{
          padding: "10px 8px", background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.15)", borderRadius: "10px", textAlign: "center"
        }}>
          <div style={{ fontSize: "16px", color: "#ef4444", fontWeight: "900" }}>{weaknessRating}%</div>
          <div style={{ fontSize: "9px", color: "#ef4444", fontWeight: "700", marginTop: "2px" }}>WEAKNESS RATING</div>
        </div>
      </div>

      {/* Meters */}
      <div style={{ marginBottom: "14px" }}>
        <Meter label="Recent Form" value={s.recentForm} color={color.color} icon="🔥" />
        <Meter label="Batting Strength" value={s.battingStrength} color="#f59e0b" icon="🏏" />
        <Meter label="Bowling Strength" value={s.bowlingStrength} color="#06b6d4" icon="🎯" />
        <Meter label="Pitch Suitability" value={s.pitchSuitability} color="#10b981" icon="🏟️" />
        <Meter label="Squad Balance" value={s.squadBalance} color="#8b5cf6" icon="⚖️" />
        <Meter label="Head to Head" value={s.headToHead} color="#ec4899" icon="📊" />
        <Meter label="Toss Impact" value={s.tossImpact} color="#f97316" icon="🪙" />
      </div>

      {/* Strengths */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#10b981", letterSpacing: "0.08em", marginBottom: "6px" }}>
          💪 STRENGTHS
        </div>
        {data.strengths.slice(0, 2).map((s, i) => (
          <div key={i} style={{
            fontSize: "11px", color: "#94a3b8", padding: "4px 8px", background: "rgba(16,185,129,0.06)",
            borderRadius: "6px", marginBottom: "3px", borderLeft: "2px solid rgba(16,185,129,0.3)",
          }}>
            {s}
          </div>
        ))}
      </div>

      {/* Weaknesses */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", color: "#ef4444", letterSpacing: "0.08em", marginBottom: "6px" }}>
          ⚠️ WEAKNESSES
        </div>
        {data.weaknesses.slice(0, 2).map((w, i) => (
          <div key={i} style={{
            fontSize: "11px", color: "#94a3b8", padding: "4px 8px", background: "rgba(239,68,68,0.06)",
            borderRadius: "6px", marginBottom: "3px", borderLeft: "2px solid rgba(239,68,68,0.3)",
          }}>
            {w}
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { label: "Captaincy", value: `${data.captainRating}%` },
          { label: "Experience", value: data.playoffExperience },
          { label: "Injury Risk", value: `${data.injuryRisk}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: "1", minWidth: "80px", padding: "6px 8px", textAlign: "center",
            background: "rgba(30,41,59,0.6)", borderRadius: "8px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#f1f5f9" }}>{value}</div>
            <div style={{ fontSize: "9px", color: "#475569" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Double-Sided Momentum Comparison Bar ─────────────────────────────────────
function MomentumBar({ team1, team2, val1, val2 }) {
  const c1 = tc(team1);
  const c2 = tc(team2);
  const total = (val1 || 50) + (val2 || 50);
  const pct1 = Math.max(15, Math.min(85, ((val1 || 50) / total) * 100));
  const pct2 = 100 - pct1;

  return (
    <div style={{
      margin: "20px 0", padding: "14px 18px", background: "rgba(15,23,42,0.6)",
      borderRadius: "14px", border: "1px solid rgba(51,65,85,0.3)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", fontWeight: "800", letterSpacing: "0.05em" }}>
        <span style={{ color: c1.color }}>🔥 {team1}: {Math.round(val1)}% FORM</span>
        <span style={{ color: "#ffb703" }}>⚡ LIVE MOMENTUM BAR ⚡</span>
        <span style={{ color: c2.color }}>FORM: {Math.round(val2)}% {team2} 🔥</span>
      </div>
      <div style={{ height: "10px", background: "rgba(51,65,85,0.4)", borderRadius: "999px", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${pct1}%`, background: c1.gradient, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        <div style={{ width: `${pct2}%`, background: c2.gradient, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </div>
    </div>
  );
}

// ─── Confidence Meter Dial ────────────────────────────────────────────────────
function ConfidenceDial({ confidence, score }) {
  const cColor = confidence === "High" ? "#10b981" : confidence === "Medium-High" ? "#84cc16" : confidence === "Medium" ? "#f59e0b" : "#ef4444";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "16px", background: "rgba(15,23,42,0.8)", borderRadius: "14px",
      border: `1px solid ${cColor}30`, flex: 1, minWidth: "120px",
      boxShadow: `0 4px 20px ${cColor}08`
    }}>
      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "10px" }}>CONFIDENCE METER</span>
      <div style={{ position: "relative", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(51,65,85,0.4)" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={cColor} strokeWidth="3" strokeDasharray={`${score || 50}, 100`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <span style={{ position: "absolute", fontSize: "14px", fontWeight: "900", color: "#fff" }}>{score || 50}%</span>
      </div>
      <span style={{ fontSize: "12px", fontWeight: "800", color: cColor, marginTop: "8px" }}>{confidence}</span>
    </div>
  );
}

// ─── Key Factors Panel ────────────────────────────────────────────────────────
function KeyFactorsPanel({ factors }) {
  const typeColor = {
    pitch: "#10b981", toss: "#f59e0b", dew: "#06b6d4",
    orange: "#f97316", purple: "#8b5cf6", strength: "#ffb703",
    h2h: "#ec4899", experience: "#10b981",
  };

  const safeFactors = Array.isArray(factors) ? factors : [];

  return (
    <div style={{
      background: "rgba(15,23,42,0.8)", borderRadius: "14px", padding: "18px",
      border: "1px solid rgba(51,65,85,0.5)",
    }}>
      <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "12px" }}>
        🔍 KEY FACTORS
      </div>
      {safeFactors.length === 0 && (
        <div style={{ fontSize: "12px", color: "#475569" }}>No factor data available.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {safeFactors.map((f, i) => {
          // Guard: f must be an object with at least one renderable property
          if (!f || typeof f !== "object") {
            return (
              <div key={i} style={{ fontSize: "12px", color: "#94a3b8", padding: "6px 8px",
                background: "rgba(30,41,59,0.5)", borderRadius: "6px" }}>
                {String(f ?? "")}
              </div>
            );
          }
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 10px",
              background: "rgba(30,41,59,0.5)", borderRadius: "8px",
              borderLeft: `3px solid ${typeColor[f.type] || "#475569"}`,
            }}>
              <span style={{ fontSize: "15px", flexShrink: 0 }}>{f.icon || "📌"}</span>
              <div>
                <div style={{ fontSize: "10px", fontWeight: "700", color: typeColor[f.type] || "#94a3b8", letterSpacing: "0.08em" }}>
                  {f.label ? String(f.label).toUpperCase() : "FACTOR"}
                </div>
                <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "2px" }}>
                  {f.value != null ? String(f.value) : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Toss Analysis Panel ──────────────────────────────────────────────────────
function TossPanel({ toss, venue }) {
  return (
    <div style={{
      background: "rgba(15,23,42,0.8)", borderRadius: "14px", padding: "18px",
      border: "1px solid rgba(245,158,11,0.2)",
    }}>
      <div style={{ fontSize: "12px", fontWeight: "700", color: "#f59e0b", letterSpacing: "0.1em", marginBottom: "14px" }}>
        🪙 TOSS & DEW ANALYSIS
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
        {[
          { label: "Dew Probability", value: `${toss.dewProbability}%`, color: "#06b6d4", icon: "💧" },
          { label: "Toss Winner Bonus", value: `+${toss.tossWinnerBonus}%`, color: "#f59e0b", icon: "🪙" },
          { label: "Bowl First Trend", value: `${toss.preferBowlFirst}%`, color: "#10b981", icon: "🎯" },
          { label: "Bat First Trend", value: `${toss.preferBatFirst}%`, color: "#8b5cf6", icon: "🏏" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{
            padding: "10px", background: "rgba(30,41,59,0.6)", borderRadius: "10px", textAlign: "center",
          }}>
            <div style={{ fontSize: "16px", marginBottom: "4px" }}>{icon}</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color }}>{value}</div>
            <div style={{ fontSize: "10px", color: "#475569" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "10px 14px", borderRadius: "10px",
        background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
      }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", marginBottom: "4px" }}>
          ✅ RECOMMENDATION: {toss.recommendation}
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{toss.reason}</div>
      </div>
    </div>
  );
}

// ─── Match Prediction Card (with interactive Toss Simulator) ──────────────────
function MatchPredictionCard({ prediction, expanded, onToggle, onRecalculate }) {
  const [simTossWinner, setSimTossWinner] = useState(prediction?.tossWinner || "");
  const [simTossDecision, setSimTossDecision] = useState(prediction?.tossDecision || "Bowl First");
  const [loadingRecalc, setLoadingRecalc] = useState(false);

  useEffect(() => {
    if (prediction) {
      setSimTossWinner(prediction.tossWinner || "");
      setSimTossDecision(prediction.tossDecision || "Bowl First");
    }
  }, [prediction]);

  // Debug logs
  console.log("[MatchPredictionCard] prediction prop:", prediction);
  console.log("[MatchPredictionCard] nested pred:", prediction?.prediction);

  if (!prediction) return null;
  if (prediction.pending) {
    return (
      <div style={{
        background: "rgba(15,23,42,0.7)", borderRadius: "16px", padding: "24px",
        border: "1px dashed rgba(71,85,105,0.5)", marginBottom: "16px",
        opacity: 0.7,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            fontSize: "12px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px",
            background: "rgba(71,85,105,0.2)", color: "#64748b", border: "1px solid rgba(71,85,105,0.3)",
          }}>
            {prediction.label || prediction.stage}
          </div>
          <span style={{ fontSize: "12px", color: "#475569" }}>{prediction.date}</span>
        </div>
        <div style={{ marginTop: "12px", fontSize: "13px", color: "#475569", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>⏳</span>
          <span>{prediction.message}</span>
        </div>
      </div>
    );
  }

  const { prediction: pred, teamAnalysis, keyFactors, tossAnalysis, venue } = prediction;

  // Guard: if nested prediction object is missing, show loading state
  if (!pred) {
    return (
      <div style={{
        background: "rgba(15,23,42,0.7)", borderRadius: "16px", padding: "24px",
        border: "1px dashed rgba(71,85,105,0.5)", marginBottom: "16px", opacity: 0.7,
      }}>
        <div style={{ fontSize: "13px", color: "#475569", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>⏳</span>
          <span>Loading match prediction…</span>
        </div>
      </div>
    );
  }

  const c1 = tc(pred?.team1 || "TBD");
  const c2 = tc(pred?.team2 || "TBD");

  // Guard: teamAnalysis must have entries for both teams
  const safeTeamAnalysis = teamAnalysis || {};
  const team1Analysis = safeTeamAnalysis[pred.team1] || { scores: { recentForm: 0, tossImpact: 0, pitchSuitability: 0, squadBalance: 0 } };
  const team2Analysis = safeTeamAnalysis[pred.team2] || { scores: { recentForm: 0, tossImpact: 0, pitchSuitability: 0, squadBalance: 0 } };
  const winnerAnalysis = safeTeamAnalysis[pred.predictedWinner] || { scores: { pitchSuitability: 0, squadBalance: 0 } };
  const safeVenue = venue || {};
  const safeTossAnalysis = tossAnalysis || {};

  const confidenceColors = {
    "High": "#10b981", "Medium-High": "#84cc16", "Medium": "#f59e0b", "Low": "#ef4444",
  };
  const cColor = confidenceColors[pred.confidence] || "#f59e0b";

  const handleApplyToss = async () => {
    setLoadingRecalc(true);
    await onRecalculate(prediction.matchId, simTossWinner, simTossDecision);
    setLoadingRecalc(false);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.9) 100%)",
      borderRadius: "20px",
      border: "1px solid rgba(255,183,3,0.15)",
      marginBottom: "20px",
      overflow: "hidden",
      boxShadow: prediction.liveUpdate ? "0 0 35px rgba(16,185,129,0.15)" : "0 4px 30px rgba(0,0,0,0.3)",
      transition: "all 0.4s ease",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px",
        padding: "20px 24px", borderBottom: "1px solid rgba(51,65,85,0.3)"
      }}>
        <div style={{
          fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px",
          background: "rgba(255,183,3,0.12)", color: "#ffb703", border: "1px solid rgba(255,183,3,0.3)",
          flexShrink: 0,
        }}>
          {prediction.matchLabel?.toUpperCase() || prediction.stage}
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px", minWidth: "150px" }}>
          <span style={{ fontSize: "18px", fontWeight: "900", color: c1.color }}>{pred.team1}</span>
          <span style={{ fontSize: "12px", color: "#475569" }}>vs</span>
          <span style={{ fontSize: "18px", fontWeight: "900", color: c2.color }}>{pred.team2}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Glowing Live Update Badge */}
          {prediction.liveUpdate && (
            <span style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: "900",
              padding: "4px 10px",
              borderRadius: "12px",
              boxShadow: "0 0 10px rgba(16,185,129,0.5)",
              animation: "livePing 1.5s infinite",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}>
              ● SIMULATED TOSS / LIVE
            </span>
          )}

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: "800", color: tc(pred.predictedWinner).color }}>
              {pred.predictedWinner} wins
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              {pred.winnerProbability}% probability
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px", padding: "6px 12px", cursor: "pointer", color: "#fff", fontSize: "12px",
            }}
          >
            {expanded ? "Hide Factors ▲" : "View Factors ▼"}
          </button>
        </div>
      </div>

      {/* Quick stats bar */}
      <div style={{
        display: "flex", gap: "0", borderTop: "1px solid rgba(51,65,85,0.3)",
        background: "rgba(15,23,42,0.5)",
      }}>
        {[
          { label: pred?.team1 || "TBD", value: `${pred?.team1Probability ?? "—"}%`, color: c1.color },
          { label: "Confidence", value: pred?.confidence || "—", color: cColor },
          { label: pred?.team2 || "TBD", value: `${pred?.team2Probability ?? "—"}%`, color: c2.color },
        ].map(({ label, value, color }, i) => (
          <div key={i} style={{
            flex: 1, padding: "8px", textAlign: "center",
            borderRight: i < 2 ? "1px solid rgba(51,65,85,0.3)" : "none",
          }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color }}>{value}</div>
            <div style={{ fontSize: "9px", color: "#475569" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "24px" }}>
          {/* Venue + momentum + Weather */}
          <div style={{
            display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center",
          }}>
            <div style={{
              padding: "8px 14px", borderRadius: "10px", background: "rgba(30,41,59,0.6)",
              fontSize: "12px", color: "#94a3b8",
            }}>
              📍 {safeVenue?.name || "Venue TBD"}
            </div>
            <div style={{
              padding: "8px 14px", borderRadius: "10px",
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
              fontSize: "12px", color: "#10b981",
            }}>
              ⚡ {pred?.momentum || "—"}
            </div>
            {safeVenue?.weather && (
              <div style={{
                padding: "8px 14px", borderRadius: "10px",
                background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
                fontSize: "12px", color: "#06b6d4",
              }}>
                ☁️ {safeVenue.weather}
              </div>
            )}
            <div style={{
              padding: "8px 14px", borderRadius: "10px",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              fontSize: "12px", color: "#f59e0b",
            }}>
              🏟️ Avg Score: {safeVenue?.avgScore ?? "—"} · Chase: {safeVenue?.chaseAdvantage ?? "—"}% win rate
            </div>
          </div>

          {/* Win probability arc + reasoning + Confidence Dial */}
          <div style={{
            display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center",
          }}>
            <WinProbabilityArc
              team1={pred?.team1 || "TBD"} team2={pred?.team2 || "TBD"}
              prob1={pred?.team1Probability} prob2={pred?.team2Probability}
              winner={pred?.predictedWinner}
            />

            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{
                padding: "14px 16px", borderRadius: "12px",
                background: `${tc(pred?.predictedWinner || "").color}10`,
                border: `1px solid ${tc(pred?.predictedWinner || "").color}30`,
                marginBottom: "12px",
              }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: tc(pred?.predictedWinner || "").color, marginBottom: "6px" }}>
                  AI REASONING
                </div>
                <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5" }}>
                  {pred?.reason || "—"}
                </div>
              </div>

              {/* Pitch Conditions & Type Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ padding: "8px", borderRadius: "8px", textAlign: "center", background: "rgba(30,41,59,0.6)" }}>
                  <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>Pitch Type</div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8" }}>
                    {safeVenue?.pitchType?.replace("_", " ").toUpperCase() || "—"}
                  </div>
                </div>
                <div style={{ padding: "8px", borderRadius: "8px", textAlign: "center", background: "rgba(30,41,59,0.6)" }}>
                  <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>Dew Probability</div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#06b6d4" }}>
                    {safeVenue?.dewProbability ?? "—"}% Probability
                  </div>
                </div>
              </div>
            </div>

            <ConfidenceDial confidence={pred?.confidence} score={pred?.confidenceScore} />
          </div>

          {/* Double-Sided Momentum Bar */}
          <MomentumBar
            team1={pred?.team1 || "TBD"}
            team2={pred?.team2 || "TBD"}
            val1={team1Analysis.scores.recentForm}
            val2={team2Analysis.scores.recentForm}
          />

          {/* Team Analysis Cards */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
            <TeamAnalysisCard
              data={team1Analysis}
              isWinner={pred?.predictedWinner === pred?.team1}
            />
            <TeamAnalysisCard
              data={team2Analysis}
              isWinner={pred?.predictedWinner === pred?.team2}
            />
          </div>

          {/* Sub-Metric Cards: Pitch Support, Toss Impact, and Squad Balance */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Pitch Support", value: `${Math.round(winnerAnalysis.scores.pitchSuitability)}%`, color: "#10b981", desc: "pitch compatibility score", icon: "🏟️" },
              { label: "Toss Impact Factor", value: `${Math.round((team1Analysis.scores.tossImpact + team2Analysis.scores.tossImpact) / 2)}%`, color: "#f59e0b", desc: "dew & chase leverage factor", icon: "🪙" },
              { label: "Squad Balance rating", value: `${Math.round(winnerAnalysis.scores.squadBalance)}%`, color: "#8b5cf6", desc: "experience & captain stability", icon: "⚖️" },
            ].map(({ label, value, color, desc, icon }) => (
              <div key={label} style={{
                padding: "16px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "14px", textAlign: "center"
              }}>
                <span style={{ fontSize: "24px" }}>{icon}</span>
                <div style={{ fontSize: "22px", fontWeight: "900", color, margin: "6px 0" }}>{value}</div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#f8fafc" }}>{label}</div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Key factors + Toss Analysis panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
            <KeyFactorsPanel factors={keyFactors} />
            <TossPanel toss={safeTossAnalysis} venue={safeVenue} />
          </div>

          {/* Premium Toss Simulator Panel */}
          <div style={{
            padding: "20px", background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(255,183,3,0.2)", borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
          }}>
            <div style={{
              fontSize: "12px", fontWeight: "800", color: "#ffb703",
              letterSpacing: "0.08em", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px"
            }}>
              🪙 LIVE PLAYOFF TOSS SIMULATOR
            </div>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 16px" }}>
              Select a toss winner and decision to evaluate the venue impact (Ahmedabad: toss +5%, Dharamsala: bowl +4%, Mullanpur: chasing +3%) instantly on all prediction meters.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700" }}>TOSS WINNER</label>
                <select
                  value={simTossWinner}
                  onChange={(e) => setSimTossWinner(e.target.value)}
                  style={{
                    background: "#0f172a", border: "1px solid rgba(71,85,105,0.6)",
                    color: "#fff", borderRadius: "8px", padding: "8px 16px", fontSize: "12px",
                    fontWeight: "600", cursor: "pointer", minWidth: "140px"
                  }}
                >
                  <option value="">None (Reset)</option>
                  <option value={pred.team1}>{pred.team1}</option>
                  <option value={pred.team2}>{pred.team2}</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700" }}>TOSS DECISION</label>
                <select
                  value={simTossDecision}
                  onChange={(e) => setSimTossDecision(e.target.value)}
                  disabled={!simTossWinner}
                  style={{
                    background: "#0f172a", border: "1px solid rgba(71,85,105,0.6)",
                    color: "#fff", borderRadius: "8px", padding: "8px 16px", fontSize: "12px",
                    fontWeight: "600", cursor: "pointer", minWidth: "140px",
                    opacity: simTossWinner ? 1 : 0.5
                  }}
                >
                  <option value="Bowl First">Bowl First</option>
                  <option value="Bat First">Bat First</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleApplyToss}
                disabled={loadingRecalc}
                style={{
                  alignSelf: "flex-end",
                  background: "linear-gradient(135deg, #ffb703, #d48c00)",
                  border: "none",
                  color: "#0a101e",
                  fontWeight: "900",
                  borderRadius: "8px",
                  padding: "10px 24px",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(255,183,3,0.3)",
                  opacity: loadingRecalc ? 0.7 : 1,
                }}
              >
                {loadingRecalc ? "Simulating..." : "Simulate Toss Effect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlayoffAIPrediction() {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({ 0: true }); // Q1 expanded by default
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [liveFlash, setLiveFlash] = useState(false);
  const wsRef = useRef(null);

  const fetchPredictions = useCallback(async () => {
    try {
      const p71 = await axios.get(`${API}/api/prediction/71`);
      const p72 = await axios.get(`${API}/api/prediction/72`);
      const p73 = await axios.get(`${API}/api/prediction/73`);
      const p74 = await axios.get(`${API}/api/prediction/74`);

      setPredictions({
        success: true,
        predictions: [p71.data, p72.data, p73.data, p74.data]
      });
      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRecalculate = useCallback(async (matchId, tossWinner, tossDecision) => {
    try {
      const response = await axios.post(`${API}/api/playoff-predictions/recalc`, {
        matchId: Number(matchId),
        tossWinner: tossWinner || null,
        tossDecision: tossDecision || null,
      });
      if (response.data?.success) {
        setLiveFlash(true);
        setTimeout(() => setLiveFlash(false), 1500);

        setPredictions(prev => {
          if (!prev) return prev;
          const updatedPreds = prev.predictions.map(p => {
            if (p.matchId === Number(matchId)) {
              return { ...p, ...response.data };
            }
            return p;
          });
          return { ...prev, predictions: updatedPreds };
        });
        setLastUpdate(new Date());
      }
    } catch (e) {
      console.warn("Toss recalculation failed:", e.message);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
    const poll = setInterval(fetchPredictions, 30000); // refresh every 30s
    return () => clearInterval(poll);
  }, [fetchPredictions]);

  // Unified WebSocket custom event subscription
  useEffect(() => {
    const handleUpdate = () => {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2000);
      fetchPredictions();
    };
    window.addEventListener("AI_PREDICTION_UPDATE", handleUpdate);
    window.addEventListener("PLAYOFF_BRACKET_UPDATE", handleUpdate);
    return () => {
      window.removeEventListener("AI_PREDICTION_UPDATE", handleUpdate);
      window.removeEventListener("PLAYOFF_BRACKET_UPDATE", handleUpdate);
    };
  }, [fetchPredictions]);

  const toggleExpand = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <section style={{
      background: "linear-gradient(180deg, rgba(10,16,30,0.98) 0%, rgba(15,23,42,0.95) 100%)",
      borderRadius: "24px",
      padding: "32px",
      marginBottom: "32px",
      border: "1px solid rgba(255,183,3,0.12)",
      boxShadow: liveFlash ? "0 0 40px rgba(16,185,129,0.15)" : "0 8px 40px rgba(0,0,0,0.3)",
      transition: "box-shadow 0.4s ease",
    }}>
      <style>{`
        @keyframes shimmer { 0%{opacity:0.7} 50%{opacity:1} 100%{opacity:0.7} }
        @keyframes livePing { 0%{transform:scale(1);opacity:1} 75%{transform:scale(1.5);opacity:0} 100%{transform:scale(1);opacity:0} }
        @keyframes liveDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#f1f5f9", margin: 0 }}>
              🤖 IPL 2026 Playoff AI Engine
            </h2>
            <span style={{
              fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
              background: "rgba(255,183,3,0.12)", color: "#ffb703", border: "1px solid rgba(255,183,3,0.3)",
            }}>
              ADVANCED v2.0
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            20+ weighted factors · Weather · Venue · Dew · Pitch · H2H · Form · Toss Simulator · Squad Balance
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {lastUpdate && (
            <span style={{ fontSize: "11px", color: "#334155" }}>
              Updated {lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <div style={{
              position: "absolute",
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#10b981",
              animation: "livePing 2s infinite",
            }} />
            <span style={{
              marginLeft: "12px", fontSize: "11px", fontWeight: "700",
              color: "#10b981",
            }}>
              Synced
            </span>
          </div>
          <button
            type="button"
            onClick={fetchPredictions}
            style={{
              padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,183,3,0.3)",
              background: "rgba(255,183,3,0.08)", color: "#ffb703", cursor: "pointer",
              fontSize: "11px", fontWeight: "700",
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Formula display */}
      <div style={{
        background: "rgba(15,23,42,0.6)", borderRadius: "12px", padding: "14px 18px",
        border: "1px solid rgba(51,65,85,0.4)", marginBottom: "24px",
        fontSize: "11px", color: "#64748b", fontFamily: "monospace",
      }}>
        <span style={{ color: "#ffb703", fontWeight: "700" }}>predictionScore</span>
        {" = "}
        <span style={{ color: "#f59e0b" }}>recentForm×20</span>
        {" + "}
        <span style={{ color: "#fbbf24" }}>batting×20</span>
        {" + "}
        <span style={{ color: "#06b6d4" }}>bowling×20</span>
        {" + "}
        <span style={{ color: "#10b981" }}>pitch×15</span>
        {" + "}
        <span style={{ color: "#ec4899" }}>H2H×10</span>
        {" + "}
        <span style={{ color: "#f97316" }}>toss×5</span>
        {" + "}
        <span style={{ color: "#8b5cf6" }}>squadBalance×10</span>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px", color: "#475569" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px", animation: "shimmer 1.5s infinite" }}>🤖</div>
          <p>Calculating playoff predictions…</p>
        </div>
      )}

      {/* Error */}
      {error && !predictions && (
        <div style={{
          padding: "20px", borderRadius: "12px", background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", textAlign: "center",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Predictions */}
      {predictions?.predictions?.map((pred, i) => (
        <MatchPredictionCard
          key={pred.matchId || i}
          prediction={pred}
          expanded={!!expanded[i]}
          onToggle={() => toggleExpand(i)}
          onRecalculate={handleRecalculate}
        />
      ))}

      {/* Footer note */}
      <div style={{
        marginTop: "8px", padding: "12px 16px", borderRadius: "10px",
        background: "rgba(15,23,42,0.5)", fontSize: "11px", color: "#334155",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <span>⚡</span>
        <span>
          Predictions auto-update when live API scores arrive. Simulate a toss using the controls on each card to recalculate instant weighted probabilities. Powered by 20+ weighted factors.
        </span>
      </div>
    </section>
  );
}
