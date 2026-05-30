import React from "react";
import "./DashboardCards.css";

const CARDS = [
  {
    id: "h2h",
    title: "HEAD TO HEAD",
    subtitle: "Compare any two teams",
    gradient: "linear-gradient(135deg, #b91c1c, #ef4444)",
    glow: "#ef4444"
  },
  {
    id: "history",
    title: "TEAM HISTORY",
    subtitle: "All-time statistics & trends",
    gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
    glow: "#3b82f6"
  },
  {
    id: "winners",
    title: "TOURNAMENT WINNERS",
    subtitle: "2008 – 2025 Champions",
    gradient: "linear-gradient(135deg, #fbbf24, #d97706)",
    glow: "#d97706"
  },
  {
    id: "allplayers",
    title: "ALL PLAYERS 2026",
    subtitle: "Complete IPL Roster",
    gradient: "linear-gradient(135deg, #7c3aed, #a855f7)",
    glow: "#a855f7"
  },
  {
    id: "live",
    title: "LIVE SCORE",
    subtitle: "Real-Time Updates",
    gradient: "linear-gradient(135deg, #ea580c, #f97316)",
    glow: "#f97316",
    pulse: true
  }
];

export default function DashboardCards({ onCardClick }) {
  return (
    <div className="dashboard-cards-container">
      {CARDS.map((card) => (
        <div
          key={card.id}
          className="dashboard-card"
          onClick={() => onCardClick(card.id)}
          style={{
            background: card.gradient,
            boxShadow: `0 4px 20px ${card.glow}40`,
          }}
        >
          {card.pulse && <div className="live-pulse" />}
          <div className="card-content">
            <h3 className="card-title">{card.title}</h3>
            <p className="card-subtitle">{card.subtitle}</p>
          </div>
          <div className="card-bg-pattern"></div>
        </div>
      ))}
    </div>
  );
}
