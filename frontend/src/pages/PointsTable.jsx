import React, { useState, useEffect, useCallback } from 'react';
import TeamLogo from '../components/common/TeamLogo';

const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const teamMeta = {
  RCB:  { name: 'Royal Challengers Bengaluru', border: '#c0392b' },
  SRH:  { name: 'Sunrisers Hyderabad',          border: '#e67e22' },
  MI:   { name: 'Mumbai Indians',                border: '#1a5276' },
  KKR:  { name: 'Kolkata Knight Riders',         border: '#6c3483' },
  CSK:  { name: 'Chennai Super Kings',           border: '#b7950b' },
  RR:   { name: 'Rajasthan Royals',              border: '#c0392b' },
  GT:   { name: 'Gujarat Titans',                border: '#1f618d' },
  PBKS: { name: 'Punjab Kings',                  border: '#c0392b' },
  LSG:  { name: 'Lucknow Super Giants',          border: '#1e8449' },
  DC:   { name: 'Delhi Capitals',                border: '#154360' },
};

const positionMedal = ['🥇','🥈','🥉'];

const STATUS_MAP = {
  RCB: 'Q', GT: 'Q', SRH: 'Q', RR: 'Q',
  PBKS: 'E', DC: 'E', KKR: 'E', CSK: 'E', MI: 'E', LSG: 'E',
};

// Generate realistic mock form based on team's W/L stats
const generateForm = (won, lost, total=5) => {
  let form = [];
  const totalMatches = won + lost;
  if(totalMatches === 0) return Array(total).fill('-');
  const winProb = won / totalMatches;
  for(let i=0; i<total; i++) {
    form.push(Math.random() < winProb ? 'W' : 'L');
  }
  return form;
}

export default function PointsTable() {
  const [table,     setTable]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [highlight, setHighlight] = useState(null);
  const [lastSync,  setLastSync]  = useState(null);

  const loadTable = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/points-table`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Defensive deduplication
        const seen = new Set();
        const deduped = [];
        for (const row of data) {
          const teamKey = row.team || row.Team || '';
          if (teamKey && !seen.has(teamKey)) {
            seen.add(teamKey);
            row.form = generateForm(row.won || 0, row.lost || 0);
            deduped.push(row);
          }
        }
        setTable(deduped);
        setLastSync(new Date().toLocaleTimeString());
        console.log('[POINTS TABLE LOADED]', deduped.length, 'teams');
      } else {
        // Fallback to matches2026 endpoint if MongoDB collection is empty
        const r2 = await fetch(`${API_BASE}/api/matches2026/points-table`);
        const d2 = await r2.json();
        const fallbackData = Array.isArray(d2) ? d2 : [];
        const seen = new Set();
        const deduped = [];
        for (const row of fallbackData) {
          const teamKey = row.team || row.Team || '';
          if (teamKey && !seen.has(teamKey)) {
            seen.add(teamKey);
            row.form = generateForm(row.won || 0, row.lost || 0);
            deduped.push(row);
          }
        }
        setTable(deduped);
      }
    } catch (err) {
      console.warn('[POINTS TABLE] fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTable();
    const interval = setInterval(loadTable, 15000);
    return () => clearInterval(interval);
  }, [loadTable]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <div style={{ color: '#eab308', fontSize: '18px', fontWeight: '600' }}>Loading points table...</div>
      </div>
    </div>
  );

  const topFour = table.slice(0, 4);
  const eliminated = table.slice(6);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#eab308', margin: '0 0 8px', letterSpacing: '2px' }}>
          📊 IPL 2026 POINTS TABLE
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          League Stage Standings{lastSync ? ` · Synced ${lastSync}` : ' · Loading…'}
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(16,185,129,0.2)', border: '#10b981', label: 'Qualify (Top 4)' },
          { color: 'rgba(245,158,11,0.15)', border: '#f59e0b', label: 'In contention (5-6)' },
          { color: 'rgba(239,68,68,0.1)',  border: '#ef4444', label: 'Eliminated (7-10)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: l.color, border: `2px solid ${l.border}` }} />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #131e32)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '50px 1fr 60px 60px 60px 60px 80px 64px 100px',
          padding: '14px 20px',
          background: 'linear-gradient(90deg, #1e3a8a, #3b82f6)',
          fontSize: '11px', fontWeight: '800', color: '#fff',
          letterSpacing: '1px', textTransform: 'uppercase',
          gap: '4px',
        }}>
          <div style={{ textAlign: 'center' }}>#</div>
          <div>Team</div>
          <div style={{ textAlign: 'center' }}>P</div>
          <div style={{ textAlign: 'center' }}>W</div>
          <div style={{ textAlign: 'center' }}>L</div>
          <div style={{ textAlign: 'center' }}>NR</div>
          <div style={{ textAlign: 'center' }}>PTS</div>
          <div style={{ textAlign: 'center', fontSize: '9px' }}>NRR</div>
          <div style={{ textAlign: 'center', fontSize: '10px' }}>FORM</div>
        </div>

        {/* Rows */}
        {table.map((row, i) => {
          const teamKey = row.team || row.Team || '';
          const meta = teamMeta[teamKey] || { name: teamKey, border: '#555' };
          const rawStatus = row.status || row.Status || STATUS_MAP[teamKey] || '';
          const isTop4 = rawStatus === 'Q' || rawStatus === 'Qualified' || i < 4;
          const isMid  = !isTop4 && i >= 4 && i < 6;
          const isElim = rawStatus === 'E' || rawStatus === 'Eliminated' || i >= 6;
          const rowBg = isTop4
            ? 'rgba(16,185,129,0.07)'
            : isMid
            ? 'rgba(245,158,11,0.05)'
            : 'rgba(239,68,68,0.04)';
          const leftBorder = isTop4 ? '#10b981' : isMid ? '#f59e0b' : '#ef4444';
          const isHovered = highlight === i;

          return (
            <div
              key={row.team}
              onMouseEnter={() => setHighlight(i)}
              onMouseLeave={() => setHighlight(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr 60px 60px 60px 60px 80px 64px 100px',
                padding: '16px 20px',
                background: isHovered ? 'rgba(255,255,255,0.05)' : rowBg,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                borderLeft: `4px solid ${isHovered ? meta.border : leftBorder}`,
                transition: 'all 0.2s',
                cursor: 'default',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {/* Rank */}
              <div style={{ textAlign: 'center', fontWeight: '800', fontSize: '20px' }}>
                {i < 3 ? positionMedal[i] : <span style={{ color: '#475569', fontSize: '16px' }}>{i + 1}</span>}
              </div>

              {/* Team */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <TeamLogo team={teamKey} size={36} showGlow={true} />
                <div>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: '#fff' }}>{teamKey}</div>
                  <div style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{meta.name}</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ textAlign: 'center', color: '#94a3b8', fontWeight: '600', fontSize: '14px' }}>{row.played ?? row.P ?? '—'}</div>
              <div style={{ textAlign: 'center', color: '#10b981', fontWeight: '700', fontSize: '14px' }}>{row.won ?? row.W ?? '—'}</div>
              <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: '700', fontSize: '14px' }}>{row.lost ?? row.L ?? '—'}</div>
              <div style={{ textAlign: 'center', color: '#f59e0b', fontWeight: '600', fontSize: '14px' }}>{row.noResult ?? row.NR ?? 0}</div>

              {/* Points */}
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  fontWeight: '900', fontSize: '18px',
                  color: isTop4 ? '#10b981' : isMid ? '#f59e0b' : '#ef4444',
                  background: isTop4 ? 'rgba(16,185,129,0.12)' : isMid ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.08)',
                  padding: '4px 12px', borderRadius: '20px',
                  border: `1px solid ${isTop4 ? 'rgba(16,185,129,0.3)' : isMid ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  {row.points ?? row.PTS ?? '—'}
                </span>
              </div>

              {/* NRR */}
              <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                {row.nrr ?? row.NRR ?? '—'}
              </div>

              {/* Form Badge */}
              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                {row.form && row.form.map((f, idx) => (
                  <div key={idx} style={{
                    width: '16px', height: '16px',
                    background: f === 'W' ? '#10b981' : f === 'L' ? '#ef4444' : '#64748b',
                    color: '#fff', fontSize: '10px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '3px'
                  }}>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Qualification zone info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '16px', marginTop: '28px' }}>
        {[
          { title: '🏆 Playoffs', desc: 'Top 4 teams qualify for playoffs', color: '#10b981', teams: topFour.map(r=>r.team).join(', ') },
          { title: '❌ Eliminated', desc: 'Teams 7–10 are out of playoffs', color: '#ef4444', teams: eliminated.map(r=>r.team).join(', ') },
        ].map(z => (
          <div key={z.title} style={{ background: 'linear-gradient(135deg,#131e32,#1a2744)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '14px', padding: '18px' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: z.color, marginBottom: '6px' }}>{z.title}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{z.desc}</div>
            <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>{z.teams}</div>
          </div>
        ))}
      </div>

      {/* Remaining Matches Note */}
      <div style={{ marginTop: '24px', padding: '16px 20px', background: 'rgba(234,179,8,0.08)', borderRadius: '14px', border: '1px solid rgba(234,179,8,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: '#eab308', fontWeight: '700', marginBottom: '4px' }}>⚠️ 4 League Matches Remaining</div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Match 67–70 still to be played. Standings may change.</div>
      </div>
    </div>
  );
}
