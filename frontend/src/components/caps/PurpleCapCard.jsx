import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

const MEDAL = ["🥇", "🥈", "🥉"];

function rankColor(rank) {
  if (rank === 1) return { badge: "#FFD700", text: "#FFD700" };
  if (rank === 2) return { badge: "#C0C0C0", text: "#C0C0C0" };
  if (rank === 3) return { badge: "#CD7F32", text: "#CD7F32" };
  return { badge: "#8b5cf6", text: "#a78bfa" };
}

function econColor(econ) {
  const v = parseFloat(econ);
  if (isNaN(v)) return "#94a3b8";
  if (v <= 7.0) return "#34d399";
  if (v <= 8.0) return "#fbbf24";
  return "#f87171";
}

/* ── All Time Bowlers Modal ─────────────────────────────────────── */
function AllTimeBowlersModal({ onClose }) {
  const [bowlers, setBowlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    const fetchBowlers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/players/all-time-bowlers`);
        const sorted = (Array.isArray(res.data) ? res.data : [])
          .slice()
          .sort((a, b) => (b.wkts || 0) - (a.wkts || 0));
        setBowlers(sorted);
      } catch (e) {
        setError("Failed to load bowlers from MongoDB.");
      } finally {
        setLoading(false);
      }
    };
    fetchBowlers();
  }, []);

  const filtered = bowlers.filter(b =>
    !search || (b.player || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "40px 16px",
        overflowY: "auto",
      }}
    >
      <div style={{
        background: "linear-gradient(180deg,#0d1a35 0%,#080f22 100%)",
        border: "1px solid rgba(168,85,247,0.3)",
        borderRadius: "20px",
        width: "100%", maxWidth: "960px",
        boxShadow: "0 24px 80px rgba(168,85,247,0.15)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px",
          background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(168,85,247,0.08))",
          borderBottom: "1px solid rgba(168,85,247,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>🏆</span>
            <div>
              <div style={{
                fontFamily: "'Oswald',sans-serif", fontSize: "20px",
                fontWeight: "800", color: "#e9d5ff", letterSpacing: "1px",
              }}>ALL TIME BOWLERS — IPL 2008–2025</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                Top wicket takers across all seasons · Live from MongoDB
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#94a3b8", borderRadius: "8px", padding: "6px 14px",
              cursor: "pointer", fontSize: "13px", fontWeight: "700",
            }}
          >✕ Close</button>
        </div>

        {/* Toolbar */}
        <div style={{
          padding: "14px 24px",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
            <input
              type="text"
              placeholder="Search player..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)",
                color: "#e9d5ff", borderRadius: "8px", padding: "8px 36px 8px 14px",
                fontSize: "13px", outline: "none", fontFamily: "'Inter',sans-serif",
              }}
            />
            <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "14px" }}>🔍</span>
          </div>

          {/* Economy Legend */}
          <div style={{ display: "flex", gap: "12px", marginLeft: "auto" }}>
            {[["≤7.0", "#34d399", "Great"], ["≤8.0", "#fbbf24", "Avg"], [">8.0", "#f87171", "Expensive"]].map(([v, c, l]) => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c }} />
                <span style={{ color: "#64748b", fontSize: "11px" }}>{l} {v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Table Body */}
        <div style={{ padding: "0", overflowY: "auto", maxHeight: "60vh" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "60px", color: "#a855f7", fontSize: "16px" }}>
              ⏳ Fetching bowlers from MongoDB…
            </div>
          )}
          {error && (
            <div style={{ textAlign: "center", padding: "40px", color: "#f87171", fontSize: "14px" }}>
              ⚠️ {error}
            </div>
          )}
          {!loading && !error && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{
                  background: "linear-gradient(90deg,#1a1535,#0f0a23)",
                  borderBottom: "2px solid rgba(109,40,217,0.3)",
                }}>
                  {["#", "Player", "Wickets", "Matches", "Avg", "Economy", "Best Figure"].map((h, i) => (
                    <th key={h} style={{
                      padding: "13px 16px",
                      textAlign: i === 0 || i > 1 ? "center" : "left",
                      fontSize: "10px", fontWeight: "800", letterSpacing: "0.1em",
                      color: i === 2 ? "#a78bfa" : i === 5 ? "#34d399" : i === 6 ? "#f59e0b" : "#64748b",
                      textTransform: "uppercase",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#475569" }}>
                      {search ? `No bowler found for "${search}"` : "No data available"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, index) => {
                    const rank = index + 1;
                    const rc = rankColor(rank);
                    const eColor = econColor(b.economy);
                    return (
                      <tr
                        key={index}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Rank */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: "32px", height: "32px", borderRadius: "50%",
                            background: rank <= 3 ? `${rc.badge}22` : "#1e1b4b",
                            border: `1.5px solid ${rc.badge}`,
                            color: rc.text, fontWeight: "800", fontSize: "12px",
                          }}>
                            {rank <= 3 ? MEDAL[rank - 1] : `#${rank}`}
                          </span>
                        </td>
                        {/* Player */}
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "14px" }}>{b.player}</span>
                        </td>
                        {/* Wickets */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{
                            background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(76,29,149,0.2))",
                            border: "1px solid rgba(124,58,237,0.4)",
                            color: "#a78bfa", fontWeight: "800", fontSize: "16px",
                            borderRadius: "8px", padding: "3px 12px", display: "inline-block",
                          }}>{b.wkts}</span>
                        </td>
                        {/* Matches */}
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "#94a3b8", fontWeight: "600", fontSize: "13px" }}>
                          {b.matches ?? "—"}
                        </td>
                        {/* Average */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{ color: "#38bdf8", fontWeight: "700", fontSize: "14px" }}>
                            {b.bowling_average ?? "—"}
                          </span>
                        </td>
                        {/* Economy */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{
                            background: `${eColor}22`, border: `1px solid ${eColor}55`,
                            color: eColor, fontWeight: "700", fontSize: "13px",
                            borderRadius: "6px", padding: "3px 10px", display: "inline-block", minWidth: "46px",
                          }}>{b.economy ?? "—"}</span>
                        </td>
                        {/* Best Figure */}
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{
                            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)",
                            color: "#fbbf24", fontWeight: "700", fontSize: "13px",
                            borderRadius: "6px", padding: "3px 10px", display: "inline-block",
                          }}>{b.best_figure ?? "—"}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div style={{
            padding: "12px 24px", borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: "11px", color: "#334155", letterSpacing: "0.05em", textAlign: "center",
          }}>
            DATA SOURCE: IPL 2008–2025 · MONGODB · {filtered.length} BOWLERS SHOWN
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Purple Cap Card (dashboard widget) ────────────────────────── */
export default function PurpleCapCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{`
        .cap-card-purple {
          border-radius: 16px;
          padding: 16px;
          background: linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #5b21b6 100%);
          border: 1px solid rgba(168,85,247,0.4);
          box-shadow: 0 4px 24px rgba(168,85,247,0.2);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .cap-card-purple:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 36px rgba(168,85,247,0.4);
        }
        .cap-card-purple::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 100px; height: 100px;
          border-radius: 50%;
          background: rgba(168,85,247,0.12);
          filter: blur(20px);
        }
        .cap-btn-purple {
          width: 100%;
          background: rgba(168,85,247,0.2);
          border: 1px solid rgba(168,85,247,0.4);
          color: #e9d5ff;
          border-radius: 8px;
          padding: 8px 0;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.05em;
          transition: all 0.2s;
          position: relative;
          z-index: 1;
        }
        .cap-btn-purple:hover { background: rgba(168,85,247,0.35); }
      `}</style>

      <div className="cap-card-purple" onClick={() => setShowModal(true)}>
        {/* Title */}
        <div style={{
          fontSize: "10px", fontWeight: "800", letterSpacing: "0.12em",
          color: "#e9d5ff", display: "flex", alignItems: "center", gap: "6px",
          marginBottom: "12px", position: "relative", zIndex: 1,
        }}>
          <span style={{ fontSize: "14px" }}>🎳</span>
          ALL TIME BOWLERS
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "rgba(233,213,255,0.5)" }}>
            Top Wicket Taker
          </span>
        </div>

        {/* Player row */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          position: "relative", zIndex: 1, marginBottom: "12px",
        }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "12px",
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px", flexShrink: 0,
            boxShadow: "0 4px 12px rgba(168,85,247,0.4)",
          }}>🎳</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Oswald',sans-serif", fontSize: "16px",
              fontWeight: "700", color: "#ede9fe", lineHeight: 1.1,
            }}>Bhuvneshwar Kumar</div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              fontSize: "9px", color: "#e9d5ff",
              background: "rgba(0,0,0,0.3)", padding: "2px 8px",
              borderRadius: "10px", marginTop: "3px", fontWeight: "600",
            }}>🟠 SRH</span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontFamily: "'Oswald',sans-serif", fontSize: "28px",
              fontWeight: "900", color: "#a855f7", lineHeight: 1,
            }}>24</div>
            <div style={{ fontSize: "9px", color: "#e9d5ff", fontWeight: "700", letterSpacing: "0.1em" }}>WICKETS</div>
            <div style={{ fontSize: "9px", color: "rgba(233,213,255,0.6)", marginTop: "1px" }}>ECO 7.71</div>
          </div>
        </div>

        <button className="cap-btn-purple" onClick={e => { e.stopPropagation(); setShowModal(true); }}>
          View Full Table →
        </button>
      </div>

      {showModal && <AllTimeBowlersModal onClose={() => setShowModal(false)} />}
    </>
  );
}
