import React, { useState, useEffect } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopNavbar from "./components/layout/TopNavbar";
import Prediction2026 from "./pages/Prediction2026";
import LiveScores from "./components/LiveScores";
import MatchesPage from "./pages/MatchesPage";
import PointsTable from "./pages/PointsTable";
import CaptainsPage from "./pages/CaptainsPage";
import Teams from "./pages/Teams";
import CaptainCard from "./components/CaptainCard";
import ChampionsGallery from "./components/ChampionsGallery";
import PlayerStats from "./components/PlayerStats";
import AllPlayers from "./components/AllPlayers";
import InjuryTracker from "./components/InjuryTracker";
import MLPredictions2026 from "./components/MLPredictions2026";
import HeroBanner from "./components/dashboard/HeroBanner";
import PlayoffBracketLive from "./components/playoffs/PlayoffBracketLive";
import FinalPrediction from "./pages/FinalPrediction";
import TeamHistory from "./pages/TeamHistory";
import HeadToHeadCenter from "./pages/HeadToHeadCenter";
import AllTimeBatters from "./components/AllTimeBatters";
import AllTimeBowlers from "./components/AllTimeBowlers";
import AllSeasons from "./components/AllSeasons";
import Venues from "./components/Venues";
import IPLChatbot from "./components/IPLChatbot";
import LiveFinalDashboard from "./components/LiveFinalDashboard";
import { Users } from "lucide-react";

const SIDEBAR_W_EXPANDED = 220;
const SIDEBAR_W_COLLAPSED = 64;

function App() {
  const [activeTab, setActiveTab] = useState("prediction2026");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Map sidebar tab IDs → content tab IDs
  const TAB_MAP = {
    prediction2026: "prediction2026",
    ai: "ai",
    livescores: "livescores",
    teams: "teams",
    captains2026: "captains2026",    // IPL Captains 2026
    points: "points",
    matches: "matches",
    playoffs: "playoffs",
    allplayers: "allplayers",
    orangecap: "playerstats",
    settings: "prediction2026",
    captains: "captains2026",
    champions: "champions",
    injuries: "injuries",
    final: "final",
    history: "history",
    h2h: "h2h",
    batters: "batters",
    purplecap: "bowlers",
    allseasons: "allseasons",
    venues: "venues",
    chatbot: "chatbot",
    livefinal: "livefinal",
  };

  const handleSidebarTab = (id) => {
    setActiveTab(TAB_MAP[id] || "prediction2026");
  };

  const handleQuickAction = (id) => {
    const map = {
      ai: "ai",
      live: "livescores",
      orangecap: "playerstats",   // ALL SEASONS button
      purplecap: "bowlers",       // ALL TIME BOWLERS button
    };
    setActiveTab(map[id] || "prediction2026");
  };

  useEffect(() => {
    const handleNav = (e) => {
      const { target } = e.detail;
      const navMap = {
        teams: "teams",
        players: "allplayers",
        allplayers: "allplayers",
        matches: "matches",
        winner2025: "champions",
        winners: "champions",
        live: "livescores",
        h2h: "h2h",
        history: "history",
        records: "allseasons",
        venues: "venues"
      };
      if (navMap[target]) {
        setActiveTab(navMap[target]);
      }
    };
    window.addEventListener("dashboard-nav", handleNav);
    return () => window.removeEventListener("dashboard-nav", handleNav);
  }, []);


  const renderCaptains = () => (
    <div style={{ padding: "40px 20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "30px" }}>
        <Users color="#f59e0b" size={32} />
        <h2 style={{ fontSize: "28px", color: "#eab308", margin: 0 }}>IPL 2026 TEAM CAPTAINS</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "24px" }}>
        {teamsData.map(team => <CaptainCard key={team.id} team={team} />)}
      </div>
    </div>
  );

  const sidebarWidth = sidebarOpen ? SIDEBAR_W_EXPANDED : SIDEBAR_W_COLLAPSED;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body, html {
          margin: 0; padding: 0;
          font-family: 'Inter', sans-serif;
          background: #020617;
          color: #f1f5f9;
          min-height: 100vh;
          overflow-x: hidden;
        }
        h1, h2, h3, h4 {
          font-family: 'Oswald', sans-serif;
          margin: 0;
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #080f22; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }

        /* slide transition for sidebar */
        .main-shell {
          transition: margin-left 0.28s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>

      {/* ── Sidebar (fixed) ── */}
      <Sidebar activeTab={activeTab} setActiveTab={handleSidebarTab} />

      {/* ── Main Shell (pushed right of sidebar) ── */}
      <div
        className="main-shell"
        style={{
          marginLeft: `${sidebarWidth}px`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #020617 0%, #081229 40%, #091d44 100%)",
        }}
      >
        {/* Top Navbar */}
        <TopNavbar onQuickAction={handleQuickAction} />

        {/* Page Content */}
        <main style={{ flex: 1 }}>
          {activeTab === "prediction2026" && <Prediction2026 />}
          {activeTab === "ai" && <MLPredictions2026 />}
          {activeTab === "playoffs" && (
            <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <h2 style={{ fontSize: "26px", color: "#eab308", margin: 0, fontFamily: "'Oswald', sans-serif" }}>🏆 IPL 2026 PLAYOFFS — BRACKET & TEAMS</h2>
              <HeroBanner />
              <PlayoffBracketLive />
            </div>
          )}
          {activeTab === "livescores" && <LiveScores />}
          {activeTab === "matches" && <MatchesPage />}
          {activeTab === "points" && <PointsTable />}
          {activeTab === "captains2026" && <CaptainsPage />}
          {activeTab === "teams" && <Teams />}
          {activeTab === "captains" && renderCaptains()}
          {activeTab === "champions" && <ChampionsGallery />}
          {activeTab === "allplayers" && <AllPlayers />}
          {activeTab === "playerstats" && <PlayerStats />}
          {activeTab === "injuries" && <InjuryTracker />}
          {activeTab === "final" && <FinalPrediction />}
          {activeTab === "history" && <TeamHistory />}
          {activeTab === "h2h" && <HeadToHeadCenter />}
          {activeTab === "batters" && <AllTimeBatters />}
          {activeTab === "bowlers" && <AllTimeBowlers />}
          {activeTab === "allseasons" && <AllSeasons />}
          {activeTab === "venues" && <Venues />}
          {activeTab === "chatbot" && <IPLChatbot />}
          {activeTab === "livefinal" && <LiveFinalDashboard />}
        </main>
      </div>
    </>
  );
}

export default App;