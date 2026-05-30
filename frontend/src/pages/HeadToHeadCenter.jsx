import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TeamLogo from '../components/common/TeamLogo';
import { Swords, Activity, Crosshair, BarChart2 } from 'lucide-react';
import './HeadToHeadCenter.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TEAMS = ['CSK', 'DC', 'GT', 'KKR', 'LSG', 'MI', 'PBKS', 'RCB', 'RR', 'SRH'];

export default function HeadToHeadCenter() {
  const [teamA, setTeamA] = useState('RCB');
  const [teamB, setTeamB] = useState('GT');
  const [h2hData, setH2hData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchH2H = async () => {
    if (teamA === teamB) {
      setError("Please select two different teams");
      setH2hData(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/api/head-to-head/${teamA}/${teamB}`);
      if (res.data && res.data.success) {
        setH2hData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch head to head data");
      setH2hData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchH2H();
  }, [teamA, teamB]);

  return (
    <div className="h2h-page">
      <div className="h2h-header">
        <Swords size={32} color="#ef4444" />
        <h2>HEAD TO HEAD CENTER</h2>
        <p>Advanced Matchup Analytics & Win Probability</p>
      </div>

      <div className="h2h-selectors">
        <div className="h2h-select-box">
          <label>TEAM 1</label>
          <select value={teamA} onChange={e => setTeamA(e.target.value)}>
            {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="h2h-vs-badge">VS</div>
        <div className="h2h-select-box">
          <label>TEAM 2</label>
          <select value={teamB} onChange={e => setTeamB(e.target.value)}>
            {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="h2h-error">{error}</div>}

      {loading ? (
        <div className="h2h-loading">Loading matchup data...</div>
      ) : h2hData ? (
        <div className="h2h-dashboard">
          
          <div className="h2h-hero-row">
            <div className="h2h-hero-team">
              <TeamLogo team={teamA} size={100} showGlow={true} />
              <div className="h2h-big-score">{h2hData.wins}</div>
              <div className="h2h-hero-label">WINS</div>
            </div>

            <div className="h2h-hero-center">
              <div className="h2h-total-matches">
                <span>{h2hData.total}</span>
                <small>TOTAL MEETINGS</small>
              </div>
              <div className="h2h-bar">
                <div 
                  className="h2h-bar-fill team1" 
                  style={{ width: `${(h2hData.wins / h2hData.total) * 100}%` }}
                ></div>
                <div 
                  className="h2h-bar-fill team2" 
                  style={{ width: `${(h2hData.losses / h2hData.total) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="h2h-hero-team">
              <TeamLogo team={teamB} size={100} showGlow={true} />
              <div className="h2h-big-score">{h2hData.losses}</div>
              <div className="h2h-hero-label">WINS</div>
            </div>
          </div>

          <div className="h2h-stats-grid">
            <div className="h2h-stat-card">
              <Activity className="h2h-icon" />
              <h4>WIN PERCENTAGE</h4>
              <div className="h2h-compare">
                <span className="t1">{((h2hData.wins / h2hData.total) * 100).toFixed(1)}%</span>
                <span className="t2">{((h2hData.losses / h2hData.total) * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="h2h-stat-card">
              <Crosshair className="h2h-icon" />
              <h4>HOME WINS</h4>
              <div className="h2h-compare">
                <span className="t1">{h2hData.home}</span>
                <span className="t2">{h2hData.losses - h2hData.away}</span>
              </div>
            </div>

            <div className="h2h-stat-card">
              <BarChart2 className="h2h-icon" />
              <h4>AWAY WINS</h4>
              <div className="h2h-compare">
                <span className="t1">{h2hData.away}</span>
                <span className="t2">{h2hData.losses - h2hData.home}</span>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}
