import React, { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import axios from "axios";
import TeamCard from "../components/TeamCard";
import SquadModal from "../components/SquadModal";

const TEAM_META = {
  RCB:  { color: "#ef4444" },
  GT:   { color: "#06b6d4" },
  SRH:  { color: "#f97316" },
  RR:   { color: "#ec4899" },
  MI:   { color: "#3b82f6" },
  CSK:  { color: "#f59e0b" },
  KKR:  { color: "#a855f7" },
  DC:   { color: "#60a5fa" },
  PBKS: { color: "#f87171" },
  LSG:  { color: "#4ade80" },
};

export default function Teams() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/teams`,
          {
            timeout: 15000,
          }
        );

        setTeams(Array.isArray(response.data) ? response.data : []);
        setError("");
      } catch (err) {
        console.error("Failed to fetch teams:", err);

        if (err.code === "ECONNABORTED") {
          setError("Request timed out. Please try again.");
        } else {
          setError("Failed to load teams.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  return (
    <div
      style={{
        padding: window.innerWidth < 768 ? "20px 10px" : "40px 20px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <Shield size={22} color="#60a5fa" />

          <h2
            style={{
              fontSize: window.innerWidth < 768 ? "22px" : "28px",
              color: "#60a5fa",
              fontWeight: "800",
              letterSpacing: 2,
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            IPL 2026 Teams
          </h2>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            color: "#fff",
            textAlign: "center",
            padding: "30px",
            fontSize: "18px",
          }}
        >
          Loading Teams...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          style={{
            color: "#ef4444",
            textAlign: "center",
            padding: "30px",
            fontSize: "18px",
          }}
        >
          {error}
        </div>
      )}

      {/* Teams Grid */}
      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              window.innerWidth < 768
                ? "repeat(1, 1fr)"
                : "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "24px",
          }}
        >
          {teams.map((team) => {
            const shortCode = (team.shortName || "").toUpperCase();
            const meta = TEAM_META[shortCode] || { color: "#facc15" };

            return (
              <TeamCard
                key={team._id || team.id || team.shortName}
                team={{
                  ...team,
                  id: team.shortName?.toLowerCase(),
                  logo:
                    team.logoUrl ||
                    `/teams/${team.shortName?.toLowerCase()}.jpg`,
                  captain:
                    typeof team.captain === "object"
                      ? team.captain
                      : {
                        name: team.captain,
                        image: `${import.meta.env.VITE_API_URL}/data/captains/${team.captain}.jpg`,
                      },
                  titles: team.championshipWins?.length || 0,
                  color: meta.color,
                }}
                onOpenSquad={(t) => setSelectedTeam(t)}
              />
            );
          })}
        </div>
      )}

      {/* Squad Modal */}
      {selectedTeam && (
        <SquadModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}