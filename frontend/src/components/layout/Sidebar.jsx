import React, { useState } from "react";

const NAV_ITEMS = [
  { id: "prediction2026", label: "Dashboard",           icon: "⚡",  badge: null },
  { id: "final",         label: "IPL 2026 FINAL",      icon: "🏆",  badge: "NEW" },
  { id: "teams",         label: "Teams",               icon: "🏏",  badge: null },
  { id: "captains2026",  label: "IPL Captains 2026",   icon: "🎖️",  badge: null },
  { id: "points",        label: "Points Table",        icon: "📊",  badge: null },
  { id: "matches",       label: "Matches",             icon: "🗓️",  badge: null },
  { id: "allseasons",    label: "All Seasons Matches", icon: "📅",  badge: null },
  { id: "venues",        label: "Venues",              icon: "📍",  badge: null },
  { id: "chatbot",       label: "AI Chatbot",          icon: "🤖",  badge: null },
];

const BADGE_STYLES = {
  NEW:  { bg: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" },
  LIVE: { bg: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#fff" },
};

export default function Sidebar({ activeTab, setActiveTab }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <style>{`
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.22s ease;
          position: relative;
          white-space: nowrap;
          overflow: hidden;
          border: 1px solid transparent;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.01em;
        }
        .sidebar-item:hover {
          background: rgba(139,92,246,0.10);
          border-color: rgba(139,92,246,0.2);
          color: #e2e8f0;
          transform: translateX(2px);
        }
        .sidebar-item.active {
          background: linear-gradient(135deg, rgba(139,92,246,0.22) 0%, rgba(59,130,246,0.12) 100%);
          border-color: rgba(139,92,246,0.4);
          color: #c4b5fd;
        }
        .sidebar-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 20%; bottom: 20%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, #7c3aed, #3b82f6);
        }
        .sidebar-icon {
          font-size: 16px;
          flex-shrink: 0;
          width: 20px;
          text-align: center;
        }
        .badge {
          margin-left: auto;
          font-size: 8px;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .badge-live { animation: pulse-live 1.4s infinite; }
      `}</style>

      <aside style={{
        width: collapsed ? "64px" : "220px",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0d1a35 0%, #080f22 60%, #050b18 100%)",
        borderRight: "1px solid rgba(139,92,246,0.12)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        zIndex: 200,
        overflowX: "hidden",
        overflowY: "auto",
        boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
      }}>

        {/* ── Logo ── */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "18px 14px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            cursor: "pointer", flexShrink: 0,
          }}
          onClick={() => setCollapsed(p => !p)}
        >
          <div style={{
            width: "36px", height: "36px", flexShrink: 0,
            background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
            borderRadius: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", fontWeight: "900",
            boxShadow: "0 0 16px rgba(124,58,237,0.5)",
          }}>🏏</div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div style={{
                fontSize: "15px", fontWeight: "800", color: "#e2e8f0",
                fontFamily: "'Oswald', sans-serif", letterSpacing: "1px", lineHeight: 1,
              }}>IPL 2026</div>
              <div style={{ fontSize: "9px", color: "#7c3aed", fontWeight: "700", letterSpacing: "2px" }}>
                PREDICTION HUB
              </div>
            </div>
          )}
        </div>

        {/* ── Nav Items ── */}
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            const badgeStyle = BADGE_STYLES[item.badge] || {};
            return (
              <div
                key={item.id}
                className={`sidebar-item${isActive ? " active" : ""}`}
                onClick={() => setActiveTab && setActiveTab(item.id)}
                title={collapsed ? item.label : ""}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`badge${item.badge === "LIVE" ? " badge-live" : ""}`}
                        style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        {!collapsed && (
          <div style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
            <div style={{
              background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(59,130,246,0.06))",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: "12px", padding: "12px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "18px", marginBottom: "4px" }}>🏆</div>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#c4b5fd", fontFamily: "'Oswald', sans-serif", letterSpacing: "1px" }}>
                IPL 2026
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                PREDICTION HUB
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
