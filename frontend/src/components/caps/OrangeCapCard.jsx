import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

/* ── Full All-Seasons Modal ─────────────────────────────────────── */
function AllSeasonsModal({ onClose }) {
  const [allCaps, setAllCaps]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [season, setSeason]     = useState("all");

  const SEASONS = [
    "all","2008","2009","2010","2011","2012","2013","2014",
    "2015","2016","2017","2018","2019","2020","2021","2022",
    "2023","2024","2025",
  ];

  useEffect(() => {
    const fetchCaps = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/players/stats/caps?season=all`);
        setAllCaps(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setError("Failed to load caps data from MongoDB.");
      } finally {
        setLoading(false);
      }
    };
    fetchCaps();
  }, []);

  const selectedRow =
    season === "all" ? null : allCaps.find(c => String(c.season) === season);

  /* close on backdrop */
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
        border: "1px solid rgba(249,115,22,0.3)",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "860px",
        boxShadow: "0 24px 80px rgba(249,115,22,0.15)",
        overflow: "hidden",
      }}>
        {/* Modal Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px",
          background: "linear-gradient(135deg,rgba(234,88,12,0.15),rgba(249,115,22,0.08))",
          borderBottom: "1px solid rgba(249,115,22,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>🟠</span>
            <div>
              <div style={{
                fontFamily: "'Oswald',sans-serif", fontSize: "20px",
                fontWeight: "800", color: "#fed7aa", letterSpacing: "1px",
              }}>
                ALL SEASONS — ORANGE CAP
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                Top run-scorer every IPL season · Live from MongoDB
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

        {/* Season Filter */}
        <div style={{
          padding: "16px 24px",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>SEASON:</span>
          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            style={{
              background: "rgba(234,88,12,0.12)", border: "1px solid rgba(249,115,22,0.3)",
              color: "#fed7aa", borderRadius: "8px", padding: "6px 14px",
              fontSize: "13px", fontWeight: "700", cursor: "pointer", outline: "none",
            }}
          >
            {SEASONS.map(s => (
              <option key={s} value={s} style={{ background: "#0d1a35" }}>
                {s === "all" ? "ALL SEASONS" : `IPL ${s}`}
              </option>
            ))}
          </select>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b" }}>
            {loading ? "Loading..." : `${allCaps.length} seasons in database`}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "60px", color: "#f97316", fontSize: "16px" }}>
              ⏳ Fetching data from MongoDB…
            </div>
          )}
          {error && (
            <div style={{ textAlign: "center", padding: "40px", color: "#f87171", fontSize: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* All seasons table */}
          {!loading && !error && season === "all" && (
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(249,115,22,0.15)",
              borderRadius: "14px", overflow: "hidden",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(234,88,12,0.12)" }}>
                    {["Season", "🟠 Orange Cap Winner", "Runs", "🟣 Purple Cap Winner", "Wickets"].map((h, i) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: i > 1 ? "center" : "left",
                        fontSize: "11px", fontWeight: "800", letterSpacing: "0.08em",
                        color: i === 1 ? "#fb923c" : i === 3 ? "#c084fc" : "#64748b",
                        textTransform: "uppercase",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allCaps.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#475569" }}>
                        No data available
                      </td>
                    </tr>
                  ) : (
                    allCaps.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSeason(String(row.season))}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          cursor: "pointer", transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(249,115,22,0.06)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "11px 16px", color: "#93c5fd", fontWeight: "800", fontSize: "14px" }}>
                          {row.season}
                        </td>
                        <td style={{ padding: "11px 16px", color: "#f1f5f9", fontWeight: "600", fontSize: "14px" }}>
                          {row.orangeCap?.player || "—"}
                        </td>
                        <td style={{ padding: "11px 16px", textAlign: "center" }}>
                          <span style={{
                            background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.35)",
                            color: "#fb923c", fontWeight: "700", fontSize: "13px",
                            borderRadius: "6px", padding: "2px 10px",
                          }}>
                            {row.orangeCap?.runs ?? "—"} runs
                          </span>
                        </td>
                        <td style={{ padding: "11px 16px", color: "#f1f5f9", fontWeight: "600", fontSize: "14px" }}>
                          {row.purpleCap?.player || "—"}
                        </td>
                        <td style={{ padding: "11px 16px", textAlign: "center" }}>
                          <span style={{
                            background: "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.35)",
                            color: "#c084fc", fontWeight: "700", fontSize: "13px",
                            borderRadius: "6px", padding: "2px 10px",
                          }}>
                            {row.purpleCap?.wickets ?? "—"} wkts
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Specific season detail */}
          {!loading && !error && season !== "all" && (
            <div>
              {!selectedRow ? (
                <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px" }}>
                  No data for IPL {season}
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {/* Orange Cap */}
                  <div style={{
                    background: "linear-gradient(135deg,#431407,#7c2d12)",
                    border: "1px solid rgba(249,115,22,0.4)",
                    borderRadius: "16px", padding: "24px",
                    boxShadow: "0 8px 32px rgba(249,115,22,0.2)",
                  }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>🟠</div>
                    <div style={{ fontSize: "10px", color: "#fed7aa", letterSpacing: "0.15em", fontWeight: "700", marginBottom: "6px" }}>
                      ORANGE CAP — IPL {season}
                    </div>
                    <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: "22px", fontWeight: "800", color: "#fef3c7", marginBottom: "12px" }}>
                      {selectedRow.orangeCap?.player}
                    </div>
                    <div style={{ fontSize: "40px", fontWeight: "900", color: "#f97316", fontFamily: "'Oswald',sans-serif" }}>
                      {selectedRow.orangeCap?.runs}
                    </div>
                    <div style={{ fontSize: "11px", color: "#fed7aa", fontWeight: "700", letterSpacing: "0.1em" }}>RUNS</div>
                  </div>
                  {/* Purple Cap */}
                  <div style={{
                    background: "linear-gradient(135deg,#2e1065,#4c1d95)",
                    border: "1px solid rgba(168,85,247,0.4)",
                    borderRadius: "16px", padding: "24px",
                    boxShadow: "0 8px 32px rgba(168,85,247,0.2)",
                  }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>🟣</div>
                    <div style={{ fontSize: "10px", color: "#e9d5ff", letterSpacing: "0.15em", fontWeight: "700", marginBottom: "6px" }}>
                      PURPLE CAP — IPL {season}
                    </div>
                    <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: "22px", fontWeight: "800", color: "#ede9fe", marginBottom: "12px" }}>
                      {selectedRow.purpleCap?.player}
                    </div>
                    <div style={{ fontSize: "40px", fontWeight: "900", color: "#a855f7", fontFamily: "'Oswald',sans-serif" }}>
                      {selectedRow.purpleCap?.wickets}
                    </div>
                    <div style={{ fontSize: "11px", color: "#e9d5ff", fontWeight: "700", letterSpacing: "0.1em" }}>WICKETS</div>
                  </div>
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <button
                  onClick={() => setSeason("all")}
                  style={{
                    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                    color: "#94a3b8", borderRadius: "8px", padding: "8px 20px",
                    cursor: "pointer", fontSize: "13px", fontWeight: "600",
                  }}
                >← Back to All Seasons</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Orange Cap Card (dashboard widget) ────────────────────────── */
export default function OrangeCapCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{`
        .cap-card-orange {
          border-radius: 16px;
          padding: 16px;
          background: linear-gradient(135deg, #431407 0%, #7c2d12 50%, #92400e 100%);
          border: 1px solid rgba(249,115,22,0.4);
          box-shadow: 0 4px 24px rgba(249,115,22,0.2);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .cap-card-orange:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 36px rgba(249,115,22,0.4);
        }
        .cap-card-orange::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 100px; height: 100px;
          border-radius: 50%;
          background: rgba(249,115,22,0.12);
          filter: blur(20px);
        }
        .cap-btn-orange {
          width: 100%;
          background: rgba(249,115,22,0.2);
          border: 1px solid rgba(249,115,22,0.4);
          color: #fed7aa;
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
        .cap-btn-orange:hover { background: rgba(249,115,22,0.35); }
      `}</style>

      <div className="cap-card-orange" onClick={() => setShowModal(true)}>
        {/* Title */}
        <div style={{
          fontSize: "10px", fontWeight: "800", letterSpacing: "0.12em",
          color: "#fed7aa", display: "flex", alignItems: "center", gap: "6px",
          marginBottom: "12px", position: "relative", zIndex: 1,
        }}>
          <span style={{ fontSize: "14px" }}>🏏</span>
          ORANGE CAP — ALL SEASONS
          <span style={{ marginLeft: "auto", fontSize: "9px", color: "rgba(254,215,170,0.5)" }}>
            Top Run Scorer
          </span>
        </div>

        {/* Player row */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          position: "relative", zIndex: 1, marginBottom: "12px",
        }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "12px",
            background: "linear-gradient(135deg,#ea580c,#f97316)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px", flexShrink: 0,
            boxShadow: "0 4px 12px rgba(249,115,22,0.4)",
          }}>🏏</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Oswald',sans-serif", fontSize: "16px",
              fontWeight: "700", color: "#fef3c7", lineHeight: 1.1,
            }}>Sai Sudharsan</div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              fontSize: "9px", color: "#fed7aa",
              background: "rgba(0,0,0,0.3)", padding: "2px 8px",
              borderRadius: "10px", marginTop: "3px", fontWeight: "600",
            }}>🔵 GT</span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontFamily: "'Oswald',sans-serif", fontSize: "28px",
              fontWeight: "900", color: "#f97316", lineHeight: 1,
            }}>638</div>
            <div style={{ fontSize: "9px", color: "#fed7aa", fontWeight: "700", letterSpacing: "0.1em" }}>RUNS</div>
            <div style={{ fontSize: "9px", color: "rgba(254,215,170,0.6)", marginTop: "1px" }}>SR 157.92</div>
          </div>
        </div>

        <button className="cap-btn-orange" onClick={e => { e.stopPropagation(); setShowModal(true); }}>
          View Full Table →
        </button>
      </div>

      {showModal && <AllSeasonsModal onClose={() => setShowModal(false)} />}
    </>
  );
}
