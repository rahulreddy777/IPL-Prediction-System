import React, { useEffect, useMemo, useState } from "react"
import API from "../services/api"
import { Trophy } from "lucide-react"

export default function WinnersHistory() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await API.get("/winners")
        if (!alive) return
        setRows(Array.isArray(res.data) ? res.data : [])
      } catch (e) {
        if (!alive) return
        setError(e?.message || "Failed to load winners history")
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const championsCount = useMemo(() => {
    const counts = new Map()
    rows.forEach((r) => {
      const w = r?.Winner
      if (!w) return
      counts.set(w, (counts.get(w) || 0) + 1)
    })
    return [...counts.entries()]
      .map(([team, titles]) => ({ team, titles }))
      .sort((a, b) => b.titles - a.titles)
  }, [rows])

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Trophy color="#eab308" size={28} />
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: 1 }}>IPL Winners (2008–2025)</h2>
      </div>

      {loading && <div style={{ color: "#94a3b8" }}>Loading…</div>}
      {error && <div style={{ color: "#f87171" }}>{error}</div>}

      {!loading && !error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18 }}>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b", color: "#cbd5e1" }}>
                Season results
              </div>
              <div style={{ maxHeight: 520, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Season</th>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Winner</th>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Orange cap</th>
                      <th style={{ textAlign: "left", padding: "10px 12px" }}>Purple cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={`${r?.Season || idx}`} style={{ borderTop: "1px solid #1e293b", color: "#e2e8f0" }}>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{r?.Season}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#fbbf24" }}>{r?.Winner}</td>
                        <td style={{ padding: "10px 12px", color: "#cbd5e1" }}>{r?.Orange_Cap}</td>
                        <td style={{ padding: "10px 12px", color: "#cbd5e1" }}>{r?.Purple_Cap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b", color: "#cbd5e1" }}>
                Most titles
              </div>
              <div style={{ padding: 14, display: "grid", gap: 10 }}>
                {championsCount.slice(0, 10).map((c) => (
                  <div
                    key={c.team}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      border: "1px solid #1e293b",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{c.team}</span>
                    <span style={{ color: "#a3e635" }}>{c.titles}</span>
                  </div>
                ))}
                {championsCount.length === 0 && <div style={{ color: "#94a3b8" }}>No data.</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

