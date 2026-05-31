import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TeamLogo from '../components/common/TeamLogo';
import { Swords, Activity, Crosshair, BarChart2, Database } from 'lucide-react';
import './HeadToHeadCenter.css';

const API = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const TEAMS = ['CSK', 'DC', 'GT', 'KKR', 'LSG', 'MI', 'PBKS', 'RCB', 'RR', 'SRH'];

export default function HeadToHeadCenter() {
  const [teamA, setTeamA] = useState('RCB');
  const [teamB, setTeamB] = useState('GT');
  const [fullData, setFullData] = useState(null);
  const [h2hData, setH2hData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/head-to-head`);
        setFullData(res.data);
      } catch (error) {
        console.error(error);
        setError(error.message || "Failed to fetch head to head data");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!fullData) return;
    
    if (teamA === teamB) {
      setError("Please select two different teams");
      setH2hData(null);
      return;
    }
    setError('');

    try {
      const splits = fullData.head_to_head_splits;
      if (!splits || !splits[teamA] || !splits[teamA][teamB]) {
        // Fallback for old schema if it exists
        if (fullData[teamA]) {
          const m = fullData[teamA].find(x => x.opponent === teamB);
          if (m) {
            setH2hData(m);
            return;
          }
        }
        setError(`Matchup not found between ${teamA} and ${teamB}`);
        setH2hData(null);
        return;
      }

      const matchupData = splits[teamA][teamB];
      setH2hData({
        opponent: teamB,
        total: matchupData.total_matches,
        wins: matchupData.overall_wins,
        losses: matchupData.overall_losses,
        home: matchupData.home_wins,
        away: matchupData.away_neutral_wins
      });
    } catch (err) {
      setError("Error parsing matchup data");
      setH2hData(null);
    }
  }, [teamA, teamB, fullData]);

  return (
    <div className="h2h-page">
      <div className="h2h-header">
        <Swords size={32} color="#ef4444" />
        <h2>HEAD TO HEAD CENTER</h2>
        <p>Advanced Matchup Analytics & Win Probability</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: 600, marginTop: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <Database size={16} />
          <span>Connected to MongoDB Atlas</span>
        </div>
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

          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 40, letterSpacing: 1 }}>
            DATA SOURCE: MONGODB ATLAS (IPL_TEAMS_HEAD_TO_HEAD)
          </div>

        </div>
      ) : null}
    </div>
  );
}
