import React from "react"
import CaptainCard from "../components/CaptainCard"
import { teamsData } from "../data/mockData"
import { Users } from "lucide-react"

export default function Captains() {
  return (
    <div style={{ padding: "40px 20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 30 }}>
        <Users color="#eab308" size={28} />
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: 1 }}>IPL 2026 Team Captains</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
        {teamsData.map((team) => (
          <CaptainCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  )
}
