import React from "react";

const RECENT_FORM = [
  {
    team: "RCB", emoji: "❤️", color: "#dc2626",
    form: ["W","W","L","L","W"],
  },
  {
    team: "GT",  emoji: "🔵", color: "#0ea5e9",
    form: ["W","W","W","L","W"],
  },
  {
    team: "SRH", emoji: "🟠", color: "#f97316",
    form: ["W","L","W","W","L"],
  },
  {
    team: "RR",  emoji: "💗", color: "#ec4899",
    form: ["W","L","W","W","L"],
  },
];

export default function RecentFormBar() {
  return (
    <>
      <style>{`
        .form-bar-wrap {
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 20px;
          overflow-x: auto;
        }
        .form-team-section {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .form-team-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Oswald', sans-serif;
          letter-spacing: 1px;
          white-space: nowrap;
        }
        .form-pill {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.03em;
        }
        .form-divider {
          width: 1px;
          height: 28px;
          background: rgba(255,255,255,0.08);
          flex-shrink: 0;
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "0.1em" }}>
          RECENT FORM (LAST 5 MATCHES)
        </span>
        <button style={{
          background: "transparent", border: "none",
          color: "#7c3aed", fontSize: "11px", fontWeight: "700", cursor: "pointer",
          letterSpacing: "0.05em",
        }}>
          View All Teams →
        </button>
      </div>

      <div className="form-bar-wrap">
        {RECENT_FORM.map((t, i) => (
          <React.Fragment key={t.team}>
            {i > 0 && <div className="form-divider" />}
            <div className="form-team-section">
              <div className="form-team-label" style={{ color: t.color }}>
                <span>{t.emoji}</span>
                {t.team}
              </div>
              <div style={{ display: "flex", gap: "3px" }}>
                {t.form.map((r, j) => (
                  <div
                    key={j}
                    className="form-pill"
                    style={{
                      background: r === "W"
                        ? "rgba(34,197,94,0.18)"
                        : "rgba(239,68,68,0.18)",
                      border: r === "W"
                        ? "1px solid rgba(34,197,94,0.4)"
                        : "1px solid rgba(239,68,68,0.4)",
                      color: r === "W" ? "#4ade80" : "#f87171",
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
