import React, { useState, useEffect, useCallback, useRef } from 'react';
import API from '../services/api';

// ── TEAM COLORS ──────────────────────────────────────────────────────────────
const TEAM = {
  RCB:  { bg: '#c0392b', light: 'rgba(192,57,43,0.18)',   text: '#ff6b6b',  emoji: '🔴', full: 'Royal Challengers Bengaluru' },
  SRH:  { bg: '#e67e22', light: 'rgba(230,126,34,0.18)',  text: '#f39c12',  emoji: '🟠', full: 'Sunrisers Hyderabad' },
  MI:   { bg: '#1a5276', light: 'rgba(26,82,118,0.18)',   text: '#5dade2',  emoji: '🔵', full: 'Mumbai Indians' },
  KKR:  { bg: '#6c3483', light: 'rgba(108,52,131,0.18)',  text: '#bb8fce',  emoji: '🟣', full: 'Kolkata Knight Riders' },
  CSK:  { bg: '#b7950b', light: 'rgba(183,149,11,0.18)',  text: '#f7dc6f',  emoji: '🟡', full: 'Chennai Super Kings' },
  RR:   { bg: '#a93226', light: 'rgba(169,50,38,0.18)',   text: '#f1948a',  emoji: '🩷', full: 'Rajasthan Royals' },
  GT:   { bg: '#1f618d', light: 'rgba(31,97,141,0.18)',   text: '#85c1e9',  emoji: '🔵', full: 'Gujarat Titans' },
  PBKS: { bg: '#c0392b', light: 'rgba(192,57,43,0.15)',   text: '#fadbd8',  emoji: '🔴', full: 'Punjab Kings' },
  LSG:  { bg: '#1e8449', light: 'rgba(30,132,73,0.18)',   text: '#82e0aa',  emoji: '🟢', full: 'Lucknow Super Giants' },
  DC:   { bg: '#154360', light: 'rgba(21,67,96,0.18)',    text: '#7fb3d3',  emoji: '🔵', full: 'Delhi Capitals' },
  TBD:  { bg: '#374151', light: 'rgba(55,65,81,0.18)',    text: '#9ca3af',  emoji: '❓', full: 'To Be Decided' },
};
const tc = (code) => TEAM[code] || TEAM.TBD;

const STATUS_META = {
  completed: { label: 'COMPLETED', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
  upcoming:  { label: 'UPCOMING',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  live:      { label: '🔴 LIVE',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.5)'  },
  no_result: { label: 'NO RESULT', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' },
};
const sm = (s) => STATUS_META[s] || STATUS_META.upcoming;

const PLAYOFF_LABELS = {
  71: 'Qualifier 1', 72: 'Eliminator', 73: 'Qualifier 2', 74: '🏆 Final'
};

// ── ORANGE/PURPLE CAP DATA ────────────────────────────────────────────────────
const ORANGE_CAP = [
  { rank: 1, name: 'Sai Sudharsan',      team: 'GT',   matches: 14, innings: 14, runs: 638, average: 49.08, strikeRate: 157.92, fours: 62, sixes: 29 },
  { rank: 2, name: 'Shubman Gill',        team: 'GT',   matches: 13, innings: 13, runs: 616, average: 47.38, strikeRate: 161.68, fours: 57, sixes: 30 },
  { rank: 3, name: 'Vaibhav Sooryavanshi',team: 'RR',   matches: 13, innings: 13, runs: 579, average: 44.54, strikeRate: 236.33, fours: 50, sixes: 53 },
  { rank: 4, name: 'Mitchell Marsh',      team: 'PBKS', matches: 13, innings: 13, runs: 563, average: 43.31, strikeRate: 163.19, fours: 51, sixes: 36 },
  { rank: 5, name: 'Heinrich Klaasen',    team: 'SRH',  matches: 13, innings: 13, runs: 555, average: 50.45, strikeRate: 155.90, fours: 44, sixes: 25 },
  { rank: 6, name: 'Virat Kohli',         team: 'RCB',  matches: 13, innings: 13, runs: 542, average: 54.20, strikeRate: 164.74, fours: 57, sixes: 21 },
  { rank: 7, name: 'KL Rahul',            team: 'DC',   matches: 13, innings: 13, runs: 533, average: 44.42, strikeRate: 171.94, fours: 51, sixes: 27 },
  { rank: 8, name: 'Abhishek Sharma',     team: 'SRH',  matches: 13, innings: 13, runs: 507, average: 42.25, strikeRate: 201.99, fours: 46, sixes: 38 },
  { rank: 9, name: 'Ishan Kishan',        team: 'SRH',  matches: 13, innings: 13, runs: 490, average: 37.69, strikeRate: 179.49, fours: 49, sixes: 26 },
  { rank: 10,name: 'Sanju Samson',        team: 'RR',   matches: 14, innings: 14, runs: 477, average: 43.36, strikeRate: 165.63, fours: 53, sixes: 24 },
];
const PURPLE_CAP = [
  { rank: 1, name: 'Bhuvneshwar Kumar', team: 'RCB', matches: 13, overs: 51.0,  wickets: 24, average: 16.38, economy: 7.71  },
  { rank: 2, name: 'Kagiso Rabada',     team: 'GT',  matches: 14, overs: 53.4,  wickets: 24, average: 20.54, economy: 9.18  },
  { rank: 3, name: 'Anshul Kamboj',    team: 'MI',  matches: 14, overs: 50.2,  wickets: 21, average: 25.24, economy: 10.53 },
  { rank: 4, name: 'Rashid Khan',       team: 'GT',  matches: 14, overs: 47.5,  wickets: 19, average: 21.95, economy: 8.72  },
  { rank: 5, name: 'Jofra Archer',      team: 'RR',  matches: 13, overs: 48.0,  wickets: 18, average: 24.39, economy: 9.15  },
  { rank: 6, name: 'Kartik Tyagi',      team: 'KKR', matches: 13, overs: 47.0,  wickets: 18, average: 24.61, economy: 9.43  },
  { rank: 7, name: 'Mohammed Siraj',    team: 'GT',  matches: 14, overs: 51.0,  wickets: 17, average: 25.76, economy: 8.59  },
  { rank: 8, name: 'Eshan Malinga',     team: 'MI',  matches: 13, overs: 46.2,  wickets: 17, average: 25.53, economy: 9.37  },
];

// ── GLOBAL STYLES ─────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; }

  .m26-glass {
    background: linear-gradient(135deg, rgba(14,22,42,0.92) 0%, rgba(20,33,61,0.92) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  }
  .m26-glass:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 48px rgba(0,0,0,0.55);
    border-color: rgba(255,255,255,0.14);
  }

  .m26-tab-bar {
    display: flex;
    justify-content: center;
    gap: 8px;
    background: rgba(0,0,0,0.3);
    padding: 6px;
    border-radius: 50px;
    border: 1px solid rgba(255,255,255,0.06);
    max-width: 720px;
    margin: 0 auto 36px;
  }
  .m26-tab {
    background: transparent;
    border: none;
    color: #6b7280;
    padding: 11px 22px;
    border-radius: 50px;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition: all 0.25s;
  }
  .m26-tab:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
  .m26-tab.active {
    background: linear-gradient(135deg, #ffb703, #f97316);
    color: #000;
    box-shadow: 0 0 20px rgba(255,183,3,0.4);
  }

  .m26-table { width:100%; border-collapse:collapse; font-size:14px; color:#e2e8f0; }
  .m26-table th {
    background: rgba(255,255,255,0.03);
    padding: 13px 14px;
    text-align: left;
    font-weight: 700;
    color: #ffb703;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .m26-table tr { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.18s; }
  .m26-table tr:hover { background: rgba(255,255,255,0.025); }
  .m26-table td { padding: 13px 14px; vertical-align: middle; }

  .m26-score-chip {
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.5px;
  }

  @keyframes m26-live-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
  @keyframes m26-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .m26-shimmer {
    background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
    background-size: 200% 100%;
    animation: m26-shimmer 1.4s infinite;
    border-radius: 8px;
  }

  .playoff-bracket-row {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding-bottom: 10px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,183,3,0.3) transparent;
  }
  .playoff-bracket-row::-webkit-scrollbar { height: 4px; }
  .playoff-bracket-row::-webkit-scrollbar-track { background: transparent; }
  .playoff-bracket-row::-webkit-scrollbar-thumb { background: rgba(255,183,3,0.3); border-radius: 4px; }

  .playoff-match-card {
    min-width: 280px;
    flex: 0 0 280px;
    background: linear-gradient(135deg, rgba(14,22,42,0.96) 0%, rgba(20,33,61,0.96) 100%);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
    transition: all 0.3s;
  }
  .playoff-match-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
  }
  .playoff-match-card.completed { border-color: rgba(16,185,129,0.35); }
  .playoff-match-card.upcoming  { border-color: rgba(245,158,11,0.3); }
  .playoff-match-card.final     { min-width: 320px; flex: 0 0 320px; border-color: rgba(255,183,3,0.5); box-shadow: 0 0 40px rgba(255,183,3,0.15); }

  .team-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    transition: background 0.2s;
  }
  .team-row.winner-row { background: rgba(255,255,255,0.06); }

  @media (max-width: 640px) {
    .m26-tab-bar { flex-wrap: wrap; border-radius: 20px; }
    .m26-tab { flex: 1; text-align: center; font-size: 11px; padding: 9px 10px; }
  }
`;

// ── SCORE CARD COMPONENT ──────────────────────────────────────────────────────
function MatchCard({ match }) {
  const meta  = sm(match.status);
  const t1    = tc(match.team1?.code);
  const t2    = tc(match.team2?.code);
  const isPlayoff = match.stage === 'playoff';
  const playoffLabel = match.label || PLAYOFF_LABELS[match.matchNumber] || '';
  const winnerCode = typeof match.winner === 'object' ? match.winner?.code : match.winner;

  return (
    <div className="m26-glass" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
      {/* Top glow accent */}
      {match.status === 'live' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />
      )}
      {isPlayoff && match.status === 'completed' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPlayoff && (
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#ffb703', background: 'rgba(255,183,3,0.12)', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(255,183,3,0.3)', letterSpacing: '0.3px' }}>
              {playoffLabel}
            </span>
          )}
          {!isPlayoff && match.matchNumber && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>M{match.matchNumber}</span>
          )}
        </div>
        <span style={{ fontSize: '11px', fontWeight: '800', color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
          {meta.label}
        </span>
      </div>

      {/* Venue & Date */}
      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <span>📍 {match.venue}</span>
        <span>📅 {match.date}</span>
      </div>

      {/* Score section */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
        {/* Team 1 */}
        <div style={{
          flex: 1, background: winnerCode === match.team1?.code ? `${t1.light}` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${winnerCode === match.team1?.code ? t1.bg + '60' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '12px', padding: '12px 14px', transition: 'all 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
            <span style={{ fontSize: '16px' }}>{t1.emoji}</span>
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#fff', letterSpacing: '0.5px' }}>{match.team1?.code}</span>
            {winnerCode === match.team1?.code && match.status === 'completed' && (
              <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '800', color: '#fff', background: t1.bg, padding: '2px 7px', borderRadius: '8px' }}>WON ✓</span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.team1?.name}</div>
          {match.team1?.score ? (
            <div className="m26-score-chip" style={{ color: t1.text }}>{match.team1.score}</div>
          ) : (
            <div style={{ fontSize: '14px', color: '#374151', fontStyle: 'italic' }}>—</div>
          )}
        </div>

        {/* VS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontWeight: '900', fontSize: '13px', minWidth: '28px' }}>VS</div>

        {/* Team 2 */}
        <div style={{
          flex: 1, background: winnerCode === match.team2?.code ? `${t2.light}` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${winnerCode === match.team2?.code ? t2.bg + '60' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '12px', padding: '12px 14px', transition: 'all 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
            <span style={{ fontSize: '16px' }}>{t2.emoji}</span>
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#fff', letterSpacing: '0.5px' }}>{match.team2?.code}</span>
            {winnerCode === match.team2?.code && match.status === 'completed' && (
              <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '800', color: '#fff', background: t2.bg, padding: '2px 7px', borderRadius: '8px' }}>WON ✓</span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.team2?.name}</div>
          {match.team2?.score ? (
            <div className="m26-score-chip" style={{ color: t2.text }}>{match.team2.score}</div>
          ) : (
            <div style={{ fontSize: '14px', color: '#374151', fontStyle: 'italic' }}>—</div>
          )}
        </div>
      </div>

      {/* Result */}
      {match.result && match.status === 'completed' && (
        <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(16,185,129,0.07)', borderRadius: '8px', borderLeft: '3px solid #10b981', fontSize: '12px', color: '#6ee7b7', fontWeight: '700' }}>
          🏆 {match.result}
        </div>
      )}
      {match.status === 'upcoming' && match.result && (
        <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(245,158,11,0.07)', borderRadius: '8px', borderLeft: '3px solid #f59e0b', fontSize: '12px', color: '#fde68a', fontWeight: '600' }}>
          ⏰ Scheduled
        </div>
      )}
    </div>
  );
}

// ── PLAYOFF BRACKET ───────────────────────────────────────────────────────────
function PlayoffBracket({ playoffs }) {
  if (!playoffs || playoffs.length === 0) return null;

  // Deduplicate by matchNumber — keep the one with actual team data
  const seen = new Map();
  playoffs.forEach(m => {
    const existing = seen.get(m.matchNumber);
    if (!existing || (m.team1?.code && m.team1.code !== 'TBD')) {
      seen.set(m.matchNumber, m);
    }
  });
  const q1  = seen.get(71);
  const eli = seen.get(72);
  const q2  = seen.get(73);
  const fin = seen.get(74);

  // Derive final teams from results
  const q1Winner  = q1?.winner;
  const q1Loser   = q1Winner ? (q1Winner === q1?.team1?.code ? q1?.team2?.code : q1?.team1?.code) : null;
  const elimWinner = eli?.winner;
  const q2Winner  = q2?.winner;
  const q2Loser   = q2Winner ? (q2Winner === q2?.team1?.code ? q2?.team2?.code : q2?.team1?.code) : null;

  const FULL_NAMES = {
    RCB:'Royal Challengers Bengaluru', GT:'Gujarat Titans', RR:'Rajasthan Royals',
    SRH:'Sunrisers Hyderabad', CSK:'Chennai Super Kings', MI:'Mumbai Indians',
    KKR:'Kolkata Knight Riders', DC:'Delhi Capitals', PBKS:'Punjab Kings', LSG:'Lucknow Super Giants'
  };

  function PlayoffCard({ match, isFinal }) {
    if (!match) return null;
    const meta = sm(match.status);
    const winnerCode = typeof match.winner === 'object' ? match.winner?.code : match.winner;
    const label = match.label || PLAYOFF_LABELS[match.matchNumber] || '';

    // Build result line: "🔵 GT wins · 219-3 (18.4)"
    const winnerInfo = winnerCode ? tc(winnerCode) : null;
    const winnerTeam = winnerCode === match.team1?.code ? match.team1 : match.team2;
    const resultLine = winnerCode && winnerCode !== 'TBD'
      ? `${winnerInfo?.emoji || ''} ${FULL_NAMES[winnerCode] || winnerCode} wins${winnerTeam?.score ? ' · ' + winnerTeam.score : ''}`
      : null;

    // Always: team1 (batted first) on top, team2 (chased) on bottom
    const rows = [
      { team: match.team1, code: match.team1?.code },
      { team: match.team2, code: match.team2?.code },
    ];

    return (
      <div className={`playoff-match-card ${match.status} ${isFinal ? 'final' : ''}`}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isFinal ? 'rgba(255,183,3,0.04)' : 'transparent' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '900', color: isFinal ? '#ffb703' : (match.status === 'completed' ? '#10b981' : '#94a3b8'), letterSpacing: '0.5px' }}>
              {match.status === 'completed' ? '✅ ' : match.status === 'upcoming' ? '⚡ ' : ''}{label}
            </div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>M{match.matchNumber} · {match.date || 'TBD'}</div>
          </div>
          <span style={{ fontSize: '10px', fontWeight: '800', color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: '3px 9px', borderRadius: '20px', letterSpacing: '0.5px' }}>
            {meta.label}
          </span>
        </div>

        {/* Teams — team1 (batting first) on top, team2 (chaser) below */}
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rows.map(({ team, code }, i) => {
            const info = tc(code);
            const isWinner = match.status === 'completed' && winnerCode && winnerCode === code;
            const isLoser  = match.status === 'completed' && winnerCode && winnerCode !== code && code && code !== 'TBD';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px',
                background: isWinner ? info.light : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isWinner ? info.bg + '70' : 'rgba(255,255,255,0.05)'}`,
                opacity: isLoser ? 0.65 : 1,
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{info.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: isWinner ? '#fff' : (isLoser ? '#6b7280' : '#cbd5e1'), letterSpacing: '0.4px' }}>
                    {code || 'TBD'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team?.name || FULL_NAMES[code] || 'To Be Decided'}
                  </div>
                </div>
                {team?.score ? (
                  <div style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '15px', color: isWinner ? info.text : '#475569', textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {team.score}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#374151', flexShrink: 0 }}>—</div>
                )}
                {isWinner && (
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#10b981', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.5)', padding: '3px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    WON
                  </span>
                )}
                {isLoser && match.status === 'completed' && (
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', padding: '3px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    OUT
                  </span>
                )}
              </div>
            );
          })}</div>

        {/* Result / Status banner */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {resultLine ? (
            <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: '700', background: 'rgba(16,185,129,0.08)', padding: '7px 12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
              🏆 {resultLine}
            </div>
          ) : match.status === 'upcoming' ? (
            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', background: 'rgba(245,158,11,0.06)', padding: '7px 12px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
              ⏰ Match to be played · {match.venue?.split(',')[0] || 'TBD'}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Advancement labels
  const AdvLabel = ({ team, direction, color }) => {
    if (!team) return null;
    const info = tc(team);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: color || info.text, marginTop: '8px' }}>
        <span>{direction === 'up' ? '↗' : direction === 'cross' ? '✗' : '→'}</span>
        <span style={{ background: `${info.bg}25`, border: `1px solid ${info.bg}50`, padding: '2px 8px', borderRadius: '10px' }}>
          {info.emoji} {team}
        </span>
        <span style={{ color: '#475569', fontWeight: '600' }}>
          {direction === 'cross' ? '← Eliminated' : direction === 'up' ? '→ Final' : '→ Q2'}
        </span>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '40px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ffb703', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🏆 IPL 2026 PLAYOFF BRACKET
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
          Final · May 31 · Ahmedabad
        </span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 40px auto 40px auto', alignItems: 'start', gap: '0', overflowX: 'auto', paddingBottom: '8px' }}>

        {/* Col 1: Q1 + Eliminator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Stage 1 · Semi</div>
            <PlayoffCard match={q1} />
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {q1Winner && <AdvLabel team={q1Winner} direction="up" />}
              {q1Loser  && <AdvLabel team={q1Loser}  direction="none" color="#6b7280" />}
            </div>
          </div>
          <div>
            <PlayoffCard match={eli} />
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {elimWinner && <AdvLabel team={elimWinner} direction="none" color="#a3e635" />}
              {eli?.winner && (() => {
                const loser = eli.winner === eli?.team1?.code ? eli?.team2?.code : eli?.team1?.code;
                return <AdvLabel team={loser} direction="cross" color="#ef4444" />;
              })()}
            </div>
          </div>
        </div>

        {/* Arrow col */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '80px', gap: '120px', color: '#1e3a5f', fontSize: '24px', fontWeight: '900' }}>
          <span style={{ color: '#0ea5e9' }}>→</span>
          <span style={{ color: '#0ea5e9' }}>→</span>
        </div>

        {/* Col 2: Q2 */}
        <div>
          <div style={{ fontSize: '10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Stage 2 · Qualifier 2</div>
          <PlayoffCard match={q2} />
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {q2Winner && <AdvLabel team={q2Winner} direction="up" />}
            {q2Loser  && <AdvLabel team={q2Loser}  direction="cross" color="#ef4444" />}
          </div>
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255,183,3,0.04)', borderRadius: '10px', border: '1px solid rgba(255,183,3,0.1)', fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '700', color: '#fbbf24', marginBottom: '4px' }}>📋 Q2 Path</div>
            Q1 Loser ({q1Loser || '?'}) vs Eliminator Winner ({elimWinner || '?'})<br/>
            → Winner advances to Grand Final
          </div>
        </div>

        {/* Arrow col */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '80px', color: '#0ea5e9', fontSize: '24px', fontWeight: '900' }}>→</div>

        {/* Col 3: Final */}
        <div>
          <div style={{ fontSize: '10px', color: '#ffb703', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>🏆 Grand Final</div>
          <PlayoffCard match={fin} isFinal />
          {fin?.status === 'upcoming' && (
            <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,183,3,0.06)', borderRadius: '12px', border: '1px solid rgba(255,183,3,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '800', marginBottom: '4px' }}>🏟️ Narendra Modi Stadium</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Sun, May 31 2026 · Ahmedabad</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── POINTS TABLE ──────────────────────────────────────────────────────────────
function PointsTable({ data }) {
  if (!data || data.length === 0) return null;
  const seen = new Set();
  const rows = data.filter(r => r && r.team && !seen.has(r.team) && seen.add(r.team));

  return (
    <div className="m26-glass" style={{ padding: '24px', marginBottom: '32px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffb703', marginBottom: '16px' }}>
        📊 FINAL POINTS TABLE — IPL 2026
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="m26-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: '40px' }}>#</th>
              <th>Team</th>
              <th style={{ textAlign: 'center' }}>P</th>
              <th style={{ textAlign: 'center' }}>W</th>
              <th style={{ textAlign: 'center' }}>L</th>
              <th style={{ textAlign: 'center' }}>NR</th>
              <th style={{ textAlign: 'center' }}>PTS</th>
              <th style={{ textAlign: 'center' }}>NRR</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const info = tc(row.team);
              const isTop4 = idx < 4;
              const statusColor = row.status === 'Qualified'
                ? { c: '#10b981', bg: 'rgba(16,185,129,0.12)', b: 'rgba(16,185,129,0.35)' }
                : row.status === 'Contender'
                ? { c: '#f59e0b', bg: 'rgba(245,158,11,0.12)', b: 'rgba(245,158,11,0.35)' }
                : { c: '#4b5563', bg: 'rgba(75,85,99,0.1)',    b: 'rgba(75,85,99,0.2)'    };
              return (
                <tr key={idx} style={{ background: isTop4 ? 'rgba(255,183,3,0.02)' : 'none', borderLeft: isTop4 ? '3px solid rgba(255,183,3,0.2)' : '3px solid transparent' }}>
                  <td style={{ textAlign: 'center', fontWeight: '900', color: isTop4 ? '#ffb703' : '#4b5563' }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{info.emoji}</span>
                      <span style={{ fontWeight: '700', color: isTop4 ? '#fff' : '#9ca3af' }}>{row.team}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.played}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#10b981', fontWeight: '700' }}>{row.won}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#ef4444' }}>{row.lost}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#6b7280' }}>{row.noResult}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '900', fontSize: '16px', color: isTop4 ? '#ffb703' : '#e2e8f0' }}>{row.points}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', color: row.nrr?.startsWith('+') ? '#10b981' : '#f87171' }}>{row.nrr}</td>
                  <td>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: statusColor.c, background: statusColor.bg, border: `1px solid ${statusColor.b}`, padding: '3px 9px', borderRadius: '12px', letterSpacing: '0.3px' }}>
                      {row.status === 'Qualified' ? '✅ ' : row.status === 'Contender' ? '⚔️ ' : '❌ '}
                      {(row.status || '').toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CAP LEADERBOARD ───────────────────────────────────────────────────────────
function CapLeaderboard({ data, type }) {
  const isOrange = type === 'orange';
  const accentColor = isOrange ? '#f97316' : '#a855f7';
  const accentLight = isOrange ? 'rgba(249,115,22,0.15)' : 'rgba(168,85,247,0.15)';
  const gradFrom    = isOrange ? '#f97316' : '#a855f7';
  const gradTo      = isOrange ? '#ffb703' : '#7c3aed';

  const top3 = data.slice(0, 3);
  const rest  = data.slice(3);
  const medalColors = ['#ffb703', '#94a3b8', '#cd7f32'];
  const medalEmojis = ['👑', '🥈', '🥉'];

  return (
    <div>
      {/* Podium */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {[top3[1], top3[0], top3[2]].map((p, i) => {
          if (!p) return null;
          const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
          const info = tc(p.team);
          const height = realRank === 1 ? 200 : 170;
          return (
            <div key={p.rank} style={{
              flex: '0 0 200px', background: `linear-gradient(160deg, rgba(14,22,42,0.95) 0%, rgba(20,33,61,0.95) 100%)`,
              border: `1px solid ${medalColors[realRank - 1]}40`, borderRadius: '18px', padding: '24px 16px',
              textAlign: 'center', minHeight: `${height}px`, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', position: 'relative',
              boxShadow: realRank === 1 ? `0 0 30px ${accentColor}22` : 'none',
              transition: 'all 0.3s',
            }}>
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: medalColors[realRank - 1], color: realRank === 1 ? '#000' : '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', boxShadow: `0 0 12px ${medalColors[realRank - 1]}60` }}>
                {medalEmojis[realRank - 1]}
              </div>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{info.emoji}</div>
              <div style={{ fontWeight: '900', fontSize: '16px', color: realRank === 1 ? accentColor : '#e2e8f0', marginBottom: '4px' }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>{p.team}</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: accentColor, fontFamily: 'monospace' }}>
                {isOrange ? p.runs : p.wickets}
              </div>
              <div style={{ fontSize: '10px', color: '#4b5563', marginBottom: '8px' }}>{isOrange ? 'RUNS' : 'WICKETS'}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {isOrange ? (
                  <>
                    <span style={{ fontSize: '10px', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: '6px' }}>AVG {p.average}</span>
                    <span style={{ fontSize: '10px', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: '6px' }}>SR {p.strikeRate}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '10px', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: '6px' }}>AVG {p.average}</span>
                    <span style={{ fontSize: '10px', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: '6px' }}>ECO {p.economy}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Table */}
      <div className="m26-glass" style={{ padding: '4px', overflowX: 'auto' }}>
        <table className="m26-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center', width: '50px' }}>RANK</th>
              <th>PLAYER</th>
              <th>TEAM</th>
              <th style={{ textAlign: 'center' }}>M</th>
              {isOrange ? (
                <>
                  <th>RUNS (progress)</th>
                  <th style={{ textAlign: 'center' }}>AVG</th>
                  <th style={{ textAlign: 'center' }}>S/R</th>
                  <th style={{ textAlign: 'center' }}>4s</th>
                  <th style={{ textAlign: 'center' }}>6s</th>
                </>
              ) : (
                <>
                  <th>WKTS (bar)</th>
                  <th style={{ textAlign: 'center' }}>AVG</th>
                  <th style={{ textAlign: 'center' }}>ECO</th>
                  <th style={{ textAlign: 'center' }}>OV</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((p, idx) => {
              const info = tc(p.team);
              const isTop = p.rank <= 3;
              const barPct = isOrange ? (p.runs / (data[0]?.runs || 1)) * 100 : (p.wickets / (data[0]?.wickets || 1)) * 100;
              return (
                <tr key={idx}>
                  <td style={{ textAlign: 'center', fontWeight: '900', color: isTop ? medalColors[p.rank - 1] : '#4b5563' }}>
                    {p.rank === 1 ? '👑' : p.rank}
                  </td>
                  <td style={{ fontWeight: '700', color: isTop ? '#fff' : '#cbd5e1' }}>{p.name}</td>
                  <td>
                    <span style={{ fontSize: '12px', background: info.light, color: info.text, padding: '3px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {info.emoji} {p.team}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{p.matches}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '800', minWidth: '36px', color: accentColor }}>{isOrange ? p.runs : p.wickets}</span>
                      <div style={{ flex: 1, minWidth: '80px', height: '7px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '600' }}>{isOrange ? p.average : p.average}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '600' }}>{isOrange ? p.strikeRate : p.economy}</td>
                  {isOrange ? (
                    <>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{p.fours}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{p.sixes}</td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{p.overs}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Matches2026() {
  const [matches,    setMatches]    = useState([]);
  const [pointsData, setPointsData] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('playoffs');  // playoffs | league | orange | purple | predictions
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [matchesRes, pointsRes] = await Promise.all([
        API.get('/matches2026'),
        API.get('/matches2026/points-table').catch(() => ({ data: [] })),
      ]);
      setMatches(matchesRes.data || []);
      setPointsData(pointsRes.data || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load matches:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPredictions = useCallback(async () => {
    try {
      const res = await API.get('/matches2026/predictions');
      setPredictions(res.data || null);
    } catch (err) {
      console.warn('Predictions fetch failed:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab === 'predictions') fetchPredictions();
  }, [tab, fetchPredictions]);

  const playoffs    = matches.filter(m => m.stage === 'playoff').sort((a, b) => a.matchNumber - b.matchNumber);
  const leagueAll   = matches.filter(m => m.stage !== 'playoff').sort((a, b) => a.matchNumber - b.matchNumber);

  const filtered = leagueAll.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    const q = search.toLowerCase();
    return !q
      || m.team1?.code?.toLowerCase().includes(q)
      || m.team2?.code?.toLowerCase().includes(q)
      || m.team1?.name?.toLowerCase().includes(q)
      || m.team2?.name?.toLowerCase().includes(q)
      || m.venue?.toLowerCase().includes(q);
  });

  const completedCount = leagueAll.filter(m => m.status === 'completed').length;
  const upcomingCount  = leagueAll.filter(m => m.status === 'upcoming').length;
  const playoffCompleted = playoffs.filter(m => m.status === 'completed').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>🏏</div>
        <div style={{ color: '#ffb703', fontSize: '18px', fontWeight: '700' }}>Loading IPL 2026...</div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 20px', fontFamily: "'Inter', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── PAGE HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(255,183,3,0.08)', border: '1px solid rgba(255,183,3,0.2)', borderRadius: '50px', padding: '8px 24px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>🏆</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffb703', letterSpacing: '2px', textTransform: 'uppercase' }}>Indian Premier League 2026</span>
          <span style={{ fontSize: '20px' }}>🏏</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '900', color: '#fff', margin: '0 0 8px', lineHeight: 1.1 }}>
          IPL 2026 <span style={{ background: 'linear-gradient(135deg, #ffb703, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Match Centre</span>
        </h1>
        <p style={{ color: '#475569', fontSize: '14px', letterSpacing: '1px', margin: '0' }}>
          Live Scores · Playoff Bracket · Leaderboards · AI Predictions
        </p>
        {lastRefresh && (
          <p style={{ color: '#374151', fontSize: '11px', marginTop: '8px' }}>
            🔄 Last updated: {lastRefresh.toLocaleTimeString('en-IN')}
            <button onClick={fetchData} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', padding: '2px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', marginLeft: '10px' }}>↻ Refresh</button>
          </p>
        )}
      </div>

      {/* ── STATS STRIP ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Matches', value: matches.length, color: '#ffb703', icon: '🏏' },
          { label: 'League Completed', value: completedCount, color: '#10b981', icon: '✅' },
          { label: 'Playoffs Done', value: `${playoffCompleted}/4`, color: '#818cf8', icon: '🏆' },
          { label: 'Upcoming', value: upcomingCount + (playoffs.filter(m => m.status === 'upcoming').length), color: '#f59e0b', icon: '⏳' },
        ].map(s => (
          <div key={s.label} className="m26-glass" style={{ padding: '18px 28px', textAlign: 'center', minWidth: '130px' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '30px', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── TAB BAR ── */}
      <div className="m26-tab-bar">
        {[
          { id: 'playoffs',    label: '🏆 Playoffs'      },
          { id: 'league',      label: '🏏 League Matches' },
          { id: 'orange',      label: '🟠 Orange Cap'     },
          { id: 'purple',      label: '🟣 Purple Cap'     },
          { id: 'predictions', label: '🤖 AI Predictions' },
        ].map(t => (
          <button key={t.id} className={`m26-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PLAYOFFS TAB ── */}
      {tab === 'playoffs' && (
        <div>
          {/* Points Table */}
          {pointsData.length > 0 && <PointsTable data={pointsData} />}

          {/* If no DB points table, show hardcoded final standings */}
          {pointsData.length === 0 && (
            <PointsTable data={[
              { team: 'RCB',  played: 14, won: 9,  lost: 5,  noResult: 0, points: 18, nrr: '+0.783', status: 'Qualified' },
              { team: 'GT',   played: 14, won: 9,  lost: 5,  noResult: 0, points: 18, nrr: '+0.695', status: 'Qualified' },
              { team: 'SRH',  played: 14, won: 9,  lost: 5,  noResult: 0, points: 18, nrr: '+0.524', status: 'Qualified' },
              { team: 'RR',   played: 14, won: 8,  lost: 6,  noResult: 0, points: 16, nrr: '+0.083', status: 'Qualified' },
              { team: 'PBKS', played: 14, won: 7,  lost: 6,  noResult: 0, points: 15, nrr: '+0.227', status: 'Eliminated' },
              { team: 'DC',   played: 14, won: 7,  lost: 7,  noResult: 0, points: 14, nrr: '-0.871', status: 'Eliminated' },
              { team: 'KKR',  played: 14, won: 6,  lost: 7,  noResult: 0, points: 13, nrr: '+0.011', status: 'Eliminated' },
              { team: 'CSK',  played: 14, won: 6,  lost: 8,  noResult: 0, points: 12, nrr: '-0.345', status: 'Eliminated' },
              { team: 'MI',   played: 14, won: 4,  lost: 10, noResult: 0, points: 8,  nrr: '-0.510', status: 'Eliminated' },
              { team: 'LSG',  played: 14, won: 4,  lost: 10, noResult: 0, points: 8,  nrr: '-0.702', status: 'Eliminated' },
            ]} />
          )}

          {/* Bracket */}
          {playoffs.length > 0 ? (
            <PlayoffBracket playoffs={playoffs} />
          ) : (
            <div className="m26-glass" style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔄</div>
              <div style={{ fontWeight: '700' }}>Loading playoff data...</div>
            </div>
          )}
        </div>
      )}

      {/* ── LEAGUE MATCHES TAB ── */}
      {tab === 'league' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search team or venue..."
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '25px', padding: '10px 20px', color: '#fff', fontSize: '13px', outline: 'none', width: '240px', fontFamily: 'inherit' }}
            />
            {['all', 'completed', 'upcoming'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '10px 20px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'capitalize', fontFamily: 'inherit',
                background: filter === f ? '#ffb703' : 'rgba(255,255,255,0.07)', color: filter === f ? '#000' : '#9ca3af', transition: 'all 0.2s',
              }}>{f === 'all' ? 'All Matches' : f}</button>
            ))}
          </div>

          <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '13px', marginBottom: '24px' }}>
            Showing <strong style={{ color: '#ffb703' }}>{filtered.length}</strong> of {leagueAll.length} league matches
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {filtered.map((m, i) => <MatchCard key={`league-${m.matchNumber || i}`} match={m} />)}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#374151' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏏</div>
              <div style={{ fontSize: '18px' }}>No matches found for your filters.</div>
            </div>
          )}
        </div>
      )}

      {/* ── ORANGE CAP TAB ── */}
      {tab === 'orange' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <span style={{ fontSize: '32px' }}>🟠</span>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#f97316', margin: 0 }}>Orange Cap Leaderboard</h2>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>Top run-scorers · IPL 2026 League Stage</p>
            </div>
          </div>
          <CapLeaderboard data={ORANGE_CAP} type="orange" />
        </div>
      )}

      {/* ── PURPLE CAP TAB ── */}
      {tab === 'purple' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <span style={{ fontSize: '32px' }}>🟣</span>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#a855f7', margin: 0 }}>Purple Cap Leaderboard</h2>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>Top wicket-takers · IPL 2026 League Stage</p>
            </div>
          </div>
          <CapLeaderboard data={PURPLE_CAP} type="purple" />
        </div>
      )}

      {/* ── AI PREDICTIONS TAB ── */}
      {tab === 'predictions' && (
        <div>
          {predictions ? (
            <div>
              {/* Playoff Predictions */}
              {predictions.playoffs && (
                <div className="m26-glass" style={{ padding: '28px', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#ffb703', marginBottom: '20px' }}>
                    🔮 AI Playoff Predictions
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {predictions.matches && predictions.matches.map((m, i) => {
                      const teams = m.matchTitle?.split(':')[1]?.trim()?.split(' vs ') || [];
                      const t1code = teams[0]?.trim();
                      const t2code = teams[1]?.trim();
                      const c1 = tc(t1code);
                      const c2 = tc(t2code);
                      const p1 = m.winProbability?.[t1code] || 50;
                      const p2 = m.winProbability?.[t2code] || 50;
                      return (
                        <div key={i} className="m26-glass" style={{ padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontWeight: '800', fontSize: '15px', color: '#fff', marginBottom: '12px' }}>{m.matchTitle}</div>
                          <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', overflow: 'hidden', marginBottom: '8px' }}>
                            <div style={{ width: `${p1}%`, background: `linear-gradient(90deg, ${c1.bg}, ${c1.bg}cc)`, transition: 'width 1s ease' }} />
                            <div style={{ width: `${p2}%`, background: `linear-gradient(90deg, ${c2.bg}cc, ${c2.bg})`, transition: 'width 1s ease' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px' }}>
                            <span style={{ color: c1.text, fontWeight: '700' }}>{c1.emoji} {t1code} ({p1}%)</span>
                            <span style={{ color: c2.text, fontWeight: '700' }}>({p2}%) {t2code} {c2.emoji}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: '700', background: 'rgba(16,185,129,0.08)', padding: '6px 10px', borderRadius: '8px' }}>
                            🔮 Predicted: <span style={{ color: tc(m.predictedWinner).text }}>{m.predictedWinner}</span>
                            {m.confidenceMeter && <span style={{ color: '#64748b', marginLeft: '8px' }}>· {m.confidenceMeter} Confidence</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Awards */}
                  {predictions.playoffs?.awards && (
                    <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                      {[
                        { label: '🏆 Champion', value: predictions.playoffs.awards.champion, color: '#ffb703' },
                        { label: '🥈 Runner-up', value: predictions.playoffs.awards.runnerUp, color: '#94a3b8' },
                        { label: '🟠 Orange Cap', value: predictions.playoffs.awards.orangeCap, color: '#f97316' },
                        { label: '🟣 Purple Cap', value: predictions.playoffs.awards.purpleCap, color: '#a855f7' },
                        { label: '⭐ MVP', value: predictions.playoffs.awards.mvp, color: '#38bdf8' },
                        { label: '👶 Emerging', value: predictions.playoffs.awards.emergingPlayer, color: '#10b981' },
                      ].map(a => (
                        <div key={a.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>{a.label}</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: a.color }}>{a.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <div style={{ textAlign: 'center', color: '#475569' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>🔮</div>
                <div style={{ fontWeight: '700' }}>Loading AI predictions...</div>
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
