import React, { useEffect, useState } from "react"
import api from "../services/api.js"

const MEDAL = ["🥇", "🥈", "🥉"]

const rankColor = (rank) => {
  if (rank === 1) return { badge: "#FFD700", text: "#FFD700", glow: "0 0 16px #FFD70066" }
  if (rank === 2) return { badge: "#C0C0C0", text: "#C0C0C0", glow: "0 0 12px #C0C0C066" }
  if (rank === 3) return { badge: "#CD7F32", text: "#CD7F32", glow: "0 0 12px #CD7F3266" }
  return { badge: "#3b82f6", text: "#93c5fd", glow: "none" }
}

const AllTimeBatters = () => {
  const [batters, setBatters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchBatters() }, [])

  const fetchBatters = async () => {
    setLoading(true)
    try {
      const response = await api.get("/players/all-time-batters")
      const rows = Array.isArray(response.data) ? response.data : []
      setBatters(rows.slice().sort((a, b) => Number(a.rank ?? 999999) - Number(b.rank ?? 999999)))
    } catch (e) {
      console.error("Error fetching batters:", e)
      setBatters([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f59e0b", fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>⏳ Loading All-Time Batters...</div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", padding: "32px 16px", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: "linear-gradient(135deg,#1e293b,#0f172a)", border: "1px solid #f59e0b44", borderRadius: 16, padding: "12px 32px", marginBottom: 12, boxShadow: "0 0 40px #f59e0b22" }}>
            <span style={{ fontSize: 32 }}>🏏</span>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, background: "linear-gradient(90deg,#f59e0b,#fbbf24,#fde68a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ALL-TIME IPL BATTERS
            </span>
            <span style={{ fontSize: 32 }}>🏏</span>
          </div>
          <div style={{ color: "#94a3b8", fontSize: 14, letterSpacing: 1 }}>TOP RUN SCORERS (2008–2025)</div>
        </div>

        {/* Table Card */}
        <div style={{ background: "linear-gradient(180deg,#161d2e,#0d1117)", border: "1px solid #1e293b", borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 40px #00000088" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "linear-gradient(90deg,#1e293b,#0f1a2a)", borderBottom: "2px solid #f59e0b44" }}>
                  {["#", "Player", "Runs", "Matches", "Average", "Strike Rate"].map((h, i) => (
                    <th key={h} style={{
                      padding: "14px 18px",
                      textAlign: i === 0 || i > 1 ? "center" : "left",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      color: i === 2 ? "#f59e0b" : i === 5 ? "#34d399" : "#64748b",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batters.map((b, index) => {
                  const rank = b.rank ?? index + 1
                  const rc = rankColor(rank)
                  return (
                    <tr key={index} style={{
                      borderBottom: "1px solid #1e293b",
                      transition: "background 0.2s",
                      cursor: "default"
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#1e293b88"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Rank */}
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 36, height: 36, borderRadius: "50%",
                          background: rank <= 3 ? `${rc.badge}22` : "#1e293b",
                          border: `1.5px solid ${rc.badge}`,
                          color: rc.text, fontWeight: 800, fontSize: 13,
                          boxShadow: rc.glow
                        }}>
                          {rank <= 3 ? MEDAL[rank - 1] : `#${rank}`}
                        </span>
                      </td>

                      {/* Player */}
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{b.player}</span>
                      </td>

                      {/* Runs */}
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <span style={{
                          background: "linear-gradient(135deg,#f59e0b22,#d9700022)",
                          border: "1px solid #f59e0b55",
                          color: "#fbbf24", fontWeight: 800, fontSize: 17,
                          borderRadius: 8, padding: "4px 14px", display: "inline-block"
                        }}>{b.runs?.toLocaleString()}</span>
                      </td>

                      {/* Matches */}
                      <td style={{ padding: "14px 18px", textAlign: "center", color: "#94a3b8", fontWeight: 600, fontSize: 14 }}>
                        {b.matches ?? "—"}
                      </td>

                      {/* Average */}
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: 15 }}>{b.average ?? "—"}</span>
                      </td>

                      {/* Strike Rate */}
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <span style={{
                          background: "#10b98122",
                          border: "1px solid #10b98155",
                          color: "#34d399", fontWeight: 700, fontSize: 14,
                          borderRadius: 6, padding: "3px 10px", display: "inline-block"
                        }}>{b.strike_rate ?? "—"}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#334155", fontSize: 12, marginTop: 20, letterSpacing: 1 }}>
          DATA SOURCE: IPL 2008–2025 • ALL STATS UPDATED
        </div>
      </div>
    </div>
  )
}

export default AllTimeBatters
