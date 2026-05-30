import React from "react";
import TeamLogo from "./common/TeamLogo";

function TeamCard({ team, onOpenSquad }) {
  if (!team) return null;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #131e32 0%, #1a2a45 100%)",
        border: `1px solid ${team.color}44`,
        borderRadius: "16px",
        padding: "28px 20px 20px",
        cursor: "pointer",
        transition: "transform 0.25s, box-shadow 0.25s",
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = `0 16px 40px ${team.color}44`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35)";
      }}
    >
      {/* Subtle glow behind logo */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "180px", height: "180px", borderRadius: "50%",
        background: `radial-gradient(circle, ${team.color}22 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Team Logo - large, circular, centred */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 18,
        flexShrink: 0,
      }}>
        <TeamLogo team={team.shortName} size={110} showGlow={true} />
      </div>

      {/* Short name (big bold) */}
      <div style={{
        fontSize: "26px", fontWeight: "900", letterSpacing: 2,
        color: team.color, marginBottom: 4,
      }}>
        {team.shortName}
      </div>

      {/* Full name */}
      <div style={{ fontSize: "15px", fontWeight: 700, color: "#e2e8f0", marginBottom: 4, textAlign: "center" }}>
        {team.name}
      </div>

      {/* City / Stadium */}
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>
        <span>📍</span>
        <span>{team.stadium}</span>
      </div>

      {/* Titles badge */}
      {team.titles > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)",
          borderRadius: 20, padding: "4px 14px", marginBottom: 16,
        }}>
          <span style={{ fontSize: 14 }}>🏆</span>
          <span style={{ fontSize: "12px", color: "#eab308", fontWeight: 700 }}>
            {team.titles} {team.titles === 1 ? "Title" : "Titles"}
          </span>
        </div>
      )}
      {team.titles === 0 && <div style={{ marginBottom: 16, height: 28 }} />}

      {/* Divider */}
      <div style={{ width: "100%", height: 1, background: "#1e293b", marginBottom: 16 }} />

      {/* Squad stats — Squad | Retained | Overseas */}
      <div style={{ display: "flex", width: "100%", marginBottom: 18 }}>
        {[
          { label: "SQUAD", val: team.stats?.squad },
          { label: "RETAINED", val: team.stats?.retained },
          { label: "OVERSEAS", val: team.stats?.overseas },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, textAlign: "center",
            borderRight: i < 2 ? "1px solid #1e293b" : "none",
          }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>{s.val ?? "—"}</div>
            <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* VIEW SQUAD Button */}
      <button
        onClick={() => onOpenSquad && onOpenSquad(team)}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 24,
          background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
          border: `none`,
          color: '#000', fontWeight: 800, fontSize: 13,
          cursor: "pointer", letterSpacing: 1.5,
          transition: "all 0.2s ease",
          boxShadow: `0 4px 15px ${team.color}55`,
          textTransform: "uppercase",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = `0 6px 25px ${team.color}88`;
          e.currentTarget.style.transform = "scale(1.02)";
          e.currentTarget.style.background = `linear-gradient(135deg, ${team.color}dd, ${team.color})`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = `0 4px 15px ${team.color}55`;
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.background = `linear-gradient(135deg, ${team.color}, ${team.color}cc)`;
        }}
      >
        VIEW SQUAD
      </button>
    </div>
  );
}

export default TeamCard;
