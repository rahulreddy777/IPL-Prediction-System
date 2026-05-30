import { useState, useEffect } from "react";
import DashboardCards       from "../components/dashboard/DashboardCards";
import HeroBanner           from "../components/dashboard/HeroBanner";
import PlayoffBracketLive   from "../components/playoffs/PlayoffBracketLive";
import socket               from "../services/socket";

export default function Prediction2026() {
  const [selectedMatchId, setSelectedMatchId] = useState(70);

  /* ── WebSocket event relay ── */
  useEffect(() => {
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "PLAYOFF_BRACKET_UPDATE":
          window.dispatchEvent(new CustomEvent("PLAYOFF_BRACKET_UPDATE"));
          break;
        case "AI_PREDICTION_UPDATE":
          window.dispatchEvent(new CustomEvent("AI_PREDICTION_UPDATE"));
          break;
        case "POINTS_UPDATED":
          window.dispatchEvent(new CustomEvent("POINTS_UPDATED"));
          break;
        case "MATCH_COMPLETED":
          window.dispatchEvent(new CustomEvent("MATCH_COMPLETED"));
          window.dispatchEvent(new CustomEvent("PLAYOFF_BRACKET_UPDATE"));
          break;
      }
    };
    return () => { socket.onmessage = null; };
  }, []);

  const handleCardClick = (id) => {
    window.dispatchEvent(new CustomEvent("dashboard-nav", { detail: { target: id } }));
  };

  const handleSelectMatch = (matchId) => {
    setSelectedMatchId(matchId);
    window.dispatchEvent(new CustomEvent("pm26-select-match", { detail: { matchId } }));
  };

  return (
    <>
      <style>{`
        .dash-page {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-height: calc(100vh - 60px);
          background: linear-gradient(180deg,
            #020617 0%,
            #081229 40%,
            #091d44 100%
          );
        }
        /* Single-column layout for a cleaner experience */
        .dash-main {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }
        @media (max-width: 700px) {
          .dash-page { padding: 12px; }
        }
      `}</style>

      <div className="dash-page">

        {/* ── Row 1: Dashboard Navigation Cards ─────────────────────── */}
        <DashboardCards onCardClick={handleCardClick} />

        {/* ── Row 2: Main Layout ─────────────────── */}
        <div className="dash-main">

          {/* Hero — IPL 2026 Playoffs team cards */}
          <HeroBanner />

          {/* Live Playoff Bracket — auto-updates every 15 s */}
          <PlayoffBracketLive />


        </div>
      </div>
    </>
  );
}
