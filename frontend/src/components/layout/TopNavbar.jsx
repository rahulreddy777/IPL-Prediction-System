import React from "react";

export default function TopNavbar() {
  return (
    <header style={{
      height: "70px",
      background: "rgba(8,18,41,0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(139,92,246,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 20px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 2px 20px rgba(0,0,0,0.4)",
    }}>
      <h1 style={{
        margin: 0,
        fontSize: "28px",
        fontWeight: "900",
        fontFamily: "'Oswald', sans-serif",
        letterSpacing: "4px",
        color: "#f1f5f9",
        textTransform: "uppercase",
        background: "linear-gradient(135deg, #e2e8f0 0%, #eab308 50%, #f59e0b 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        textShadow: "none",
      }}>
        🏏 IPL ANALYSIS 2026
      </h1>
    </header>
  );
}

