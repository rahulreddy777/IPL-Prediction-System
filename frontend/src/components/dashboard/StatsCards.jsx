import React from "react";

const STATS = [
  {
    icon: "🛡️",
    value: "10",
    label: "TEAMS",
    sub: "Competing",
    gradient: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    glow: "#3b82f6",
    border: "rgba(59,130,246,0.3)",
  },
  {
    icon: "👥",
    value: "249",
    label: "PLAYERS",
    sub: "Registered",
    gradient: "linear-gradient(135deg,#7c3aed,#a855f7)",
    glow: "#a855f7",
    border: "rgba(168,85,247,0.3)",
  },
  {
    icon: "🗓️",
    value: "69",
    label: "MATCHES",
    sub: "In Season",
    gradient: "linear-gradient(135deg,#ea580c,#f97316)",
    glow: "#f97316",
    border: "rgba(249,115,22,0.3)",
  },
  {
    icon: "🏆",
    value: "RCB",
    label: "2025 CHAMPIONS",
    sub: "Royal Challengers Bengaluru",
    gradient: "linear-gradient(135deg,#b91c1c,#dc2626)",
    glow: "#dc2626",
    border: "rgba(220,38,38,0.3)",
  },
];

export default function StatsCards() {
  return (
    <>
      <style>{`
        .stat-card {
          flex: 1;
          min-width: 0;
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: default;
        }
        .stat-card:hover {
          transform: translateY(-3px);
        }
        .stat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: inherit;
          opacity: 0.06;
          border-radius: 14px;
        }
        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }
        .stat-value {
          font-family: 'Oswald', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
          line-height: 1;
        }
        .stat-label {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.08em;
          margin-top: 2px;
        }
        .stat-sub {
          font-size: 9px;
          color: #64748b;
          margin-top: 1px;
        }
        @keyframes live-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          animation: live-blink 1.2s infinite;
          display: inline-block;
          margin-left: 4px;
          vertical-align: middle;
          box-shadow: 0 0 6px #22c55e;
        }
      `}</style>

      <div style={{
        display: "flex",
        gap: "10px",
        flexWrap: "nowrap",
        overflowX: "auto",
        paddingBottom: "2px",
      }}>
        {STATS.map((s, i) => (
          <div
            key={i}
            className="stat-card"
            style={{
              background: s.gradient,
              borderColor: s.border,
              boxShadow: `0 4px 20px ${s.glow}30`,
            }}
          >
            <div className="stat-icon" style={{ background: "rgba(0,0,0,0.25)" }}>
              {s.icon}
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="stat-value">
                {s.value}
                {s.pulse && <span className="live-dot" />}
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
