import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000";

const TEAM_META = {
  RCB:  { color: "#ef4444", bg: "linear-gradient(160deg,#7f1d1d 0%,#450a0a 100%)", full: "Royal Challengers Bengaluru" },
  GT:   { color: "#06b6d4", bg: "linear-gradient(160deg,#0e4f5c 0%,#042830 100%)", full: "Gujarat Titans" },
  SRH:  { color: "#f97316", bg: "linear-gradient(160deg,#7c2d12 0%,#431407 100%)", full: "Sunrisers Hyderabad" },
  RR:   { color: "#ec4899", bg: "linear-gradient(160deg,#831843 0%,#4a0d2b 100%)", full: "Rajasthan Royals" },
  MI:   { color: "#3b82f6", bg: "linear-gradient(160deg,#1e3a8a 0%,#0c1f57 100%)", full: "Mumbai Indians" },
  CSK:  { color: "#f59e0b", bg: "linear-gradient(160deg,#78350f 0%,#3d1a05 100%)", full: "Chennai Super Kings" },
  KKR:  { color: "#a855f7", bg: "linear-gradient(160deg,#4c1d95 0%,#1e0a40 100%)", full: "Kolkata Knight Riders" },
  DC:   { color: "#60a5fa", bg: "linear-gradient(160deg,#1e3a8a 0%,#0a1a4a 100%)", full: "Delhi Capitals" },
  PBKS: { color: "#f87171", bg: "linear-gradient(160deg,#7f1d1d 0%,#450a0a 100%)", full: "Punjab Kings" },
  LSG:  { color: "#4ade80", bg: "linear-gradient(160deg,#14532d 0%,#052e16 100%)", full: "Lucknow Super Giants" },
};

const TEAM_LOGOS = {
  SRH:  "/teams/srh.jpg",
  RCB:  "/teams/rcb.jpg",
  MI:   "/teams/mi.jpg",
  KKR:  "/teams/kkr.jpg",
  CSK:  "/teams/csk.jpg",
  RR:   "/teams/rr.jpg",
  DC:   "/teams/dc.jpg",
  PBKS: "/teams/pbks.jpg",
  GT:   "/teams/gt.jpg",
  LSG:  "/teams/lsg.jpg",
};

const CAPTAIN_LOCAL_IMAGES = {
  "Ruturaj Gaikwad": "ruthuraj  gaikwad CSK.png",   // double-space in actual filename
  "Hardik Pandya":   "hardik pandya MI.jpg",
  "Rajat Patidar":   "rajat patidar RCB.jpg",
  "Ishan Kishan":    "pat cummins.jpg",              // fallback — no Ishan img, use pat cummins
  "Pat Cummins":     "pat cummins.jpg",
  "Shubman Gill":    "Shubman gill  GT.jpg",          // double-space in actual filename
  "Riyan Parag":     "Riyan parag \uD83D\uDC97.jpg", // 💗 emoji in actual filename
  "Ajinkya Rahane":  "ajinkya rahane KKR.jpeg",
  "Axar Patel":      "Axar-Patel DC.jpg",
  "Shreyas Iyer":    "shreyas iyer PBKS.jpg",
  "Rishabh Pant":    "Rishab pant LSG.jpg",          // actual filename spells 'Rishab' (no h)
};

// Fallback: if captain name doesn't match, use team code to find image
const TEAM_CAPTAIN_FALLBACK = {
  CSK:  "ruthuraj  gaikwad CSK.png",
  MI:   "hardik pandya MI.jpg",
  RCB:  "rajat patidar RCB.jpg",
  SRH:  "pat cummins.jpg",
  GT:   "Shubman gill  GT.jpg",
  RR:   "Riyan parag \uD83D\uDC97.jpg",
  KKR:  "ajinkya rahane KKR.jpeg",
  DC:   "Axar-Patel DC.jpg",
  PBKS: "shreyas iyer PBKS.jpg",
  LSG:  "Rishab pant LSG.jpg",
};

const CAPTAIN_ROLES = {
  "Ruturaj Gaikwad": "Opening Batter",
  "Hardik Pandya":   "All-rounder",
  "Shubman Gill":    "Opening Batter",
  "Ishan Kishan":    "WK-Batter",
  "Rishabh Pant":    "Wicketkeeper-Batter",
  "Axar Patel":      "All-rounder",
  "Shreyas Iyer":    "Middle-order Batter",
  "Rajat Patidar":   "Top-order Batter",
  "Riyan Parag":     "Batter",
  "Ajinkya Rahane":  "Top-order Batter",
};

/* ─── Captain Card ─── */
function CaptainCard({ c, meta, code, name, role, type, imgSrc }) {
  const [hovered, setHovered] = useState(false);
  const [imgErr,  setImgErr]  = useState(false);

  const initials = name
    ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "20px",
        overflow: "hidden",
        border: `1px solid ${meta.color}40`,
        boxShadow: hovered
          ? `0 24px 64px ${meta.color}55, 0 0 0 1.5px ${meta.color}70`
          : `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${meta.color}22`,
        transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
        transform: hovered ? "translateY(-10px) scale(1.02)" : "translateY(0) scale(1)",
        cursor: "pointer",
        position: "relative",
        background: meta.bg,
      }}
    >
      {/* ── Hero Image Area ── */}
      <div style={{ position: "relative", height: "320px", overflow: "hidden" }}>

        {/* Gradient overlays */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: `linear-gradient(to top, ${meta.bg.includes("0f172a") ? "#0f172a" : "rgba(0,0,0,0.9)"} 0%, rgba(0,0,0,0.15) 45%, transparent 70%),
                       radial-gradient(ellipse at top right, ${meta.color}55 0%, transparent 65%)`,
        }} />
        {/* Hover glow */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: `radial-gradient(ellipse at bottom left, ${meta.color}30 0%, transparent 65%)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.4s ease",
        }} />

        {/* Captain photo */}
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={name}
            onError={() => setImgErr(true)}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "top center",
              transition: "transform 0.6s ease",
              transform: hovered ? "scale(1.08)" : "scale(1)",
            }}
          />
        ) : (
          /* Fallback letter avatar */
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `radial-gradient(circle at 50% 40%, ${meta.color}33 0%, transparent 70%)`,
            fontSize: "90px", fontWeight: "900", color: `${meta.color}80`,
            fontFamily: "'Oswald',sans-serif", letterSpacing: "4px",
            userSelect: "none",
          }}>
            {initials}
          </div>
        )}

        {/* ── Team Logo Badge (top-left, BIGGER) ── */}
        <div style={{
          position: "absolute", top: "16px", left: "16px", zIndex: 3,
          width: "58px", height: "58px", borderRadius: "50%",
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(10px)",
          padding: "5px",
          border: `2.5px solid ${meta.color}`,
          boxShadow: `0 0 20px ${meta.color}70, 0 4px 12px rgba(0,0,0,0.6)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img
            src={TEAM_LOGOS[code]}
            alt={code}
            onError={e => { e.target.style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        </div>

        {/* Team short name pill (top-right) */}
        <div style={{
          position: "absolute", top: "20px", right: "16px", zIndex: 3,
          background: `${meta.color}22`,
          backdropFilter: "blur(10px)",
          border: `1px solid ${meta.color}55`,
          borderRadius: "20px",
          padding: "4px 12px",
          fontSize: "10px", fontWeight: "800",
          letterSpacing: "2.5px", color: meta.color,
          textTransform: "uppercase",
        }}>
          {code}
        </div>

        {/* Status badge */}
        <div style={{
          position: "absolute", top: "54px", right: "16px", zIndex: 3,
          background: type === "Confirmed"
            ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)",
          border: `1px solid ${type === "Confirmed" ? "rgba(34,197,94,0.45)" : "rgba(245,158,11,0.45)"}`,
          borderRadius: "20px",
          padding: "3px 10px",
          fontSize: "9px", fontWeight: "800",
          color: type === "Confirmed" ? "#4ade80" : "#fbbf24",
          letterSpacing: "0.05em",
        }}>
          ✓ {type}
        </div>

        {/* Bottom name overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
          padding: "14px 20px 6px",
        }}>
          <div style={{
            color: meta.color, fontSize: "9px", textTransform: "uppercase",
            letterSpacing: "3px", fontWeight: "800", marginBottom: "3px",
          }}>
            {code} CAPTAIN
          </div>
          <h3 style={{
            fontSize: "22px", fontWeight: "900", margin: "0 0 2px",
            color: "#f1f5f9",
            textShadow: `0 2px 16px ${meta.color}90`,
            fontFamily: "'Oswald', sans-serif",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ fontSize: "18px" }}>👑</span> {name}
          </h3>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", margin: "0 0 14px", fontWeight: "500" }}>
            {role}
          </p>
        </div>
      </div>

      {/* ── Stats Section ── */}
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{
          borderTop: `1px solid ${meta.color}30`,
          paddingTop: "14px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "6px",
        }}>
          {[
            { label: "PLAYED", value: c.matches ?? "—",                  color: "#e2e8f0" },
            { label: "WON",    value: c.won    ?? "—",                   color: "#22c55e" },
            { label: "LOST",   value: c.lost   ?? "—",                   color: "#ef4444" },
            { label: "WIN %",  value: c.win_percentage || c.winPercentage || "—", color: meta.color },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              textAlign: "center", padding: "10px 4px",
              background: `${color}11`,
              borderRadius: "10px",
              border: `1px solid ${color}25`,
            }}>
              <div style={{
                fontSize: "17px", fontWeight: "900", color,
                lineHeight: 1, marginBottom: "5px",
                fontVariantNumeric: "tabular-nums",
              }}>{value}</div>
              <div style={{
                fontSize: "7.5px", color: "rgba(255,255,255,0.4)",
                letterSpacing: "1px", fontWeight: "700", textTransform: "uppercase",
              }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function CaptainsPage() {
  const [captains, setCaptains] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/captains`)
      .then(res => setCaptains(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load captains data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "400px", flexDirection: "column", gap: "16px",
    }}>
      <div style={{ fontSize: "48px" }}>🏏</div>
      <div style={{ color: "#64748b", fontSize: "14px" }}>Loading captains from MongoDB…</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700;900&display=swap');

        .captains-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        @media (min-width: 1400px) {
          .captains-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1100px) and (max-width: 1399px) {
          .captains-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 700px) and (max-width: 1099px) {
          .captains-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 699px) {
          .captains-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ padding: "28px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: "32px", fontWeight: "900",
            color: "#f1f5f9", margin: "0 0 8px",
            letterSpacing: "1.5px",
          }}>
            🏆 IPL 2026 — TEAM CAPTAINS
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            {captains.length} teams · Live from MongoDB{" "}
            <span style={{ color: "#475569", fontFamily: "monospace" }}>ipl_captains_2026</span>
          </p>
        </div>

        {error && (
          <div style={{
            padding: "14px 18px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px", color: "#f87171",
            marginBottom: "24px", fontSize: "13px",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Cards */}
        <div className="captains-grid">
          {captains.map((c, i) => {
            const code    = c.team_code || c.teamCode || c.team || "";
            const meta    = TEAM_META[code] || { color: "#94a3b8", bg: "linear-gradient(160deg,#1e293b,#0f172a)", full: code };
            const name    = c.captain || c.captainName || c.name || "—";
            const role    = c.role || CAPTAIN_ROLES[name] || "Team Captain";
            const type    = c.appointment_type || c.appointmentType || "Confirmed";
            // Case-insensitive image lookup + team fallback
            const localFile = CAPTAIN_LOCAL_IMAGES[name]
              || Object.entries(CAPTAIN_LOCAL_IMAGES).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1]
              || TEAM_CAPTAIN_FALLBACK[code]
              || null;
            const imgSrc  = localFile
              ? `${API_BASE}/data/captains/${encodeURIComponent(localFile)}`
              : null;

            return (
              <CaptainCard
                key={i}
                c={c}
                meta={meta}
                code={code}
                name={name}
                role={role}
                type={type}
                imgSrc={imgSrc}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
