import React from "react";

const TEAMS = [
  {
    code: "RCB",
    name: "Royal Challengers",
    gradient: "linear-gradient(135deg,#991b1b 0%,#450a0a 100%)",
    border: "rgba(220,38,38,0.5)",
    glow: "#dc2626",
    logo: "/teams/rcb.jpg",
    badge: "#1",
  },
  {
    code: "GT",
    name: "Gujarat Titans",
    gradient: "linear-gradient(135deg,#0369a1 0%,#082f49 100%)",
    border: "rgba(14,165,233,0.5)",
    glow: "#0ea5e9",
    logo: "/teams/gt.jpg",
    badge: "#2",
  },
  {
    code: "SRH",
    name: "Sunrisers Hyderabad",
    gradient: "linear-gradient(135deg,#c2410c 0%,#431407 100%)",
    border: "rgba(249,115,22,0.5)",
    glow: "#f97316",
    logo: "/teams/srh.jpg",
    badge: "#3",
  },
  {
    code: "RR",
    name: "Rajasthan Royals",
    gradient: "linear-gradient(135deg,#9d174d 0%,#3b0764 100%)",
    border: "rgba(236,72,153,0.5)",
    glow: "#ec4899",
    logo: "/teams/rr.jpg",
    badge: "#4",
  },
];

const FEATURES = [
  { icon: "🔴", text: "Real-time Analysis" },
  { icon: "✅", text: "20+ Weighted Factors" },
  { icon: "✅", text: "Advanced AI Engine" },
  { icon: "✅", text: "Live Probability Updates" },
];

export default function HeroBanner() {
  return (
    <>
      <style>{`
        .hero-team-card {
          flex: 1;
          min-width: 0;
          border-radius: 16px;
          padding: 18px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          border: 1px solid;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .hero-team-card:hover {
          transform: translateY(-5px) scale(1.03);
        }
        .hero-team-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at top, rgba(255,255,255,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .team-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 20px;
          background: rgba(0,0,0,0.4);
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.05em;
        }
        .team-emoji-wrap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          background: rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.12);
        }
        .team-code {
          font-family: 'Oswald', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: 2px;
        }
        .team-name {
          font-size: 9px;
          color: rgba(255,255,255,0.5);
          text-align: center;
          letter-spacing: 0.05em;
        }
        @keyframes hero-glow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .hero-live-badge {
          animation: hero-glow 2s infinite;
        }
      `}</style>

      <div style={{
        background: "linear-gradient(135deg, rgba(17,24,51,0.95) 0%, rgba(12,17,40,0.98) 100%)",
        border: "1px solid rgba(139,92,246,0.2)",
        borderRadius: "18px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background shimmer */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "24px", flexWrap: "wrap" }}>

          {/* Left: Text Content */}
          <div style={{ flex: "0 0 220px", minWidth: "180px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "20px", padding: "4px 12px", marginBottom: "12px",
            }}>
              <span className="hero-live-badge" style={{ color: "#ef4444", fontSize: "10px", fontWeight: "800" }}>
                ● AI POWERED PREDICTIONS
              </span>
            </div>

            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: "13px", fontWeight: "600", color: "#94a3b8",
              letterSpacing: "3px", marginBottom: "4px",
            }}>
              IPL 2026
            </div>
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: "40px", fontWeight: "900", lineHeight: 1.05,
              background: "linear-gradient(135deg,#f1f5f9 0%,#94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "16px",
            }}>
              PLAYOFFS
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px" }}>{f.icon}</span>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Team Cards */}
          <div style={{ flex: 1, display: "flex", gap: "10px", minWidth: 0 }}>
            {TEAMS.map(t => (
              <div
                key={t.code}
                className="hero-team-card"
                style={{
                  background: t.gradient,
                  borderColor: t.border,
                  boxShadow: `0 8px 30px ${t.glow}25`,
                }}
              >
                <span className="team-badge">{t.badge}</span>
                <div className="team-emoji-wrap">
                  <img src={t.logo} alt={t.code} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                </div>
                <div className="team-code">{t.code}</div>
                <div className="team-name">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
