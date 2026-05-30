import React, { useEffect, useMemo, useState } from "react"
import API from "../services/api"
import { MapPin } from "lucide-react"

export default function Stadiums() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await API.get("/stadiums")
        if (!alive) return
        setRows(Array.isArray(res.data) ? res.data : [])
      } catch (e) {
        if (!alive) return
        setError(e?.message || "Failed to load stadiums")
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((s) => {
      const name = String(s?.name || "").toLowerCase()
      const city = String(s?.city || "").toLowerCase()
      const home = String(s?.homeTeam || "").toLowerCase()
      return name.includes(q) || city.includes(q) || home.includes(q)
    })
  }, [rows, query])

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MapPin color="#38bdf8" size={26} />
          <h2 style={{ margin: 0, fontSize: 26, letterSpacing: 1 }}>Stadiums</h2>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stadium, city, or home team…"
          style={{
            width: 360,
            maxWidth: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #1e293b",
            background: "#0f172a",
            color: "white",
          }}
        />
      </div>

      <div style={{ marginTop: 18 }}>
        {loading && <div style={{ color: "#94a3b8" }}>Loading…</div>}
        {error && <div style={{ color: "#f87171" }}>{error}</div>}
      </div>

      {!loading && !error && (
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((s, idx) => (
            <div
              key={`${s?._id || s?.name || idx}`}
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: 16 }}>{s?.name || "Unknown stadium"}</div>
              <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>
                {s?.city ? <span>{s.city}</span> : <span>City: —</span>}
                {" · "}
                {s?.capacity ? <span>Capacity: {s.capacity.toLocaleString()}</span> : <span>Capacity: —</span>}
              </div>
              {s?.homeTeam && (
                <div style={{ marginTop: 10, color: "#38bdf8", fontSize: 13, fontWeight: 700 }}>
                  Home: {s.homeTeam}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color: "#94a3b8" }}>No stadiums match your search.</div>}
        </div>
      )}
    </div>
  )
}

