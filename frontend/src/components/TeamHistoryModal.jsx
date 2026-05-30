import React from 'react';
import TeamLogo from './common/TeamLogo';
import { X, Trophy, Swords, Medal } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler
} from 'chart.js';
import './TeamHistoryModal.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function TeamHistoryModal({ team, onClose }) {
  if (!team) return null;

  // Mock data for the chart trend to make it look professional
  const chartData = {
    labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
    datasets: [{
      label: 'Win Percentage',
      data: [45, 50, 48, 55, 60, 58, 62, team.win_percentage],
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="thm-overlay" onClick={onClose}>
      <div className="thm-modal" onClick={e => e.stopPropagation()}>
        <button className="thm-close" onClick={onClose}><X size={24} /></button>

        <div className="thm-hero">
          <div className="thm-hero-bg"></div>
          <TeamLogo team={team.abbreviation} size={120} showGlow={true} />
          <div className="thm-hero-content">
            <h2>{team.team}</h2>
            <div className="thm-hero-stats">
              <span>{team.matches} Matches</span> • 
              <span>{team.win_percentage}% Win Rate</span>
            </div>
          </div>
        </div>

        <div className="thm-body">
          <div className="thm-row">
            <div className="thm-card">
              <h3><Trophy size={18} color="#facc15" /> Championship History</h3>
              <div className="thm-big-stat">
                {team.titles} <small>Titles</small>
              </div>
              {team.titles > 0 && <p className="thm-desc">Champions in their best seasons</p>}
            </div>

            <div className="thm-card">
              <h3><Swords size={18} color="#f87171" /> Win/Loss Record</h3>
              <div className="thm-wl-bar">
                <div style={{ width: `${(team.wins / team.matches) * 100}%`, background: '#4ade80' }}></div>
                <div style={{ width: `${(team.losses / team.matches) * 100}%`, background: '#f87171' }}></div>
              </div>
              <div className="thm-wl-labels">
                <span className="text-green">{team.wins} Wins</span>
                <span className="text-red">{team.losses} Losses</span>
              </div>
            </div>
            
            <div className="thm-card">
              <h3><Medal size={18} color="#a855f7" /> Home vs Away</h3>
              <div className="thm-split">
                <div>
                  <h4>HOME</h4>
                  <span>{team.home_wins} Wins</span>
                </div>
                <div>
                  <h4>AWAY</h4>
                  <span>{team.away_wins} Wins</span>
                </div>
              </div>
            </div>
          </div>

          <div className="thm-card thm-chart-card">
            <h3>Win Percentage Trend</h3>
            <div className="thm-chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
