import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TeamLogo from '../components/common/TeamLogo';
import TeamHistoryModal from '../components/TeamHistoryModal';
import { History, Target, Shield, MapPin, Users } from 'lucide-react';
import './TeamHistory.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function TeamHistory() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API}/api/team-history`);
        if (res.data && res.data.success) {
          setHistoryData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch team history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="th-page">
      {/* Sidebar Menu */}
      <aside className="th-sidebar">
        <div className="th-sidebar-header">
          <History className="th-icon" />
          <span>Records Menu</span>
        </div>
        <nav className="th-nav">
          <button className="th-nav-item active"><History size={16} /> Team History</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="th-content">
        <div className="th-header">
          <h2 className="th-title">📜 TEAM HISTORY & STANDINGS</h2>
          <p className="th-subtitle">All-Time Statistics for Active IPL Franchises (2008 - 2025)</p>
        </div>

        {loading ? (
          <div className="th-loading">
            <div className="th-spinner"></div>
            Loading Team History...
          </div>
        ) : (
          <div className="th-grid">
            {historyData.map((team, idx) => (
              <div
                key={idx}
                className="th-card"
                onClick={() => setSelectedTeam(team)}
              >
                <div className="th-card-header">
                  <TeamLogo team={team.abbreviation} size={50} showGlow={true} />
                  <div className="th-card-title">
                    <h3>{team.abbreviation}</h3>
                    <span>{team.team}</span>
                  </div>
                </div>

                <div className="th-card-stats">
                  <div className="th-stat-box highlight">
                    <span className="th-stat-val">{team.titles}</span>
                    <span className="th-stat-label">TITLES</span>
                  </div>
                  <div className="th-stat-box">
                    <span className="th-stat-val">{team.win_percentage}%</span>
                    <span className="th-stat-label">WIN PCT</span>
                  </div>
                </div>

                <div className="th-card-metrics">
                  <div className="th-metric"><span>Matches:</span> <span>{team.matches}</span></div>
                  <div className="th-metric"><span>Wins:</span> <span className="text-green">{team.wins}</span></div>
                  <div className="th-metric"><span>Losses:</span> <span className="text-red">{team.losses}</span></div>
                </div>

                <button className="th-view-btn">VIEW DETAILS</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedTeam && (
        <TeamHistoryModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </div>
  );
}
