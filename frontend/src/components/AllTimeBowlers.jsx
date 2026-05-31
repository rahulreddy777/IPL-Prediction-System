import React, { useState, useEffect } from 'react'
import api from '../services/api.js'

const MEDAL = ['🥇', '🥈', '🥉']

const rankColor = (rank) => {
  if (rank === 1) return { badge: '#FFD700', text: '#FFD700', glow: '0 0 16px #FFD70066' }
  if (rank === 2) return { badge: '#C0C0C0', text: '#C0C0C0', glow: '0 0 12px #C0C0C066' }
  if (rank === 3) return { badge: '#CD7F32', text: '#CD7F32', glow: '0 0 12px #CD7F3266' }
  return { badge: '#8b5cf6', text: '#a78bfa', glow: 'none' }
}

const econColor = (econ) => {
  const v = parseFloat(econ)
  if (isNaN(v)) return '#94a3b8'
  if (v <= 7.0) return '#34d399'
  if (v <= 8.0) return '#fbbf24'
  return '#f87171'
}

const AllTimeBowlers = () => {
  const [bowlers, setBowlers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchBowlers() }, [])

  const fetchBowlers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/purple-cap')
      setBowlers(response.data || [])
    } catch (e) {
      console.error('Error fetching bowlers:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#a78bfa', fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>⏳ Loading 2026 Bowlers...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', padding: '32px 16px', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1150, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,#1e1b4b,#0f0a23)', border: '1px solid #6d28d944', borderRadius: 16, padding: '12px 32px', marginBottom: 12, boxShadow: '0 0 40px #7c3aed22' }}>
            <span style={{ fontSize: 32 }}>🏆</span>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, background: 'linear-gradient(90deg,#8b5cf6,#a78bfa,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              IPL 2026 BOWLING STATS
            </span>
            <span style={{ fontSize: 32 }}>🏆</span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: 14, letterSpacing: 1 }}>TOP WICKET TAKERS (PURPLE CAP CONTENDERS)</div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginBottom: 12, paddingRight: 8 }}>
          {[['≤7.0', '#34d399', 'Great'], ['≤8.0', '#fbbf24', 'Avg'], ['>8.0', '#f87171', 'Expensive']].map(([val, col, label]) => (
            <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col }} />
              <span style={{ color: '#64748b', fontSize: 12 }}>{label} Economy {val}</span>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div style={{ background: 'linear-gradient(180deg,#160f2e,#0d1117)', border: '1px solid #1e293b', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px #00000088' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(90deg,#1a1535,#0f0a23)', borderBottom: '2px solid #6d28d944' }}>
                  {['#', 'Player', 'Wickets', 'Matches', 'Avg', 'Economy', 'Best Figure'].map((h, i) => (
                    <th key={h} style={{
                      padding: '14px 18px',
                      textAlign: i === 0 || i > 1 ? 'center' : 'left',
                      fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                      color: i === 2 ? '#a78bfa' : i === 5 ? '#34d399' : i === 6 ? '#f59e0b' : '#64748b',
                      textTransform: 'uppercase', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bowlers.map((b, index) => {
                  const rank = index + 1
                  const rc = rankColor(rank)
                  const eColor = econColor(b.economy)
                  return (
                    <tr key={index}
                      style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s', cursor: 'default' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1e1b4b55'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Rank */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 36, height: 36, borderRadius: '50%',
                          background: rank <= 3 ? `${rc.badge}22` : '#1e1b4b',
                          border: `1.5px solid ${rc.badge}`,
                          color: rc.text, fontWeight: 800, fontSize: 13,
                          boxShadow: rc.glow
                        }}>
                          {rank <= 3 ? MEDAL[rank - 1] : `#${rank}`}
                        </span>
                      </td>

                      {/* Player */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{b.player || b.Player}</span>
                          <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{b.team || b.Team}</span>
                        </div>
                      </td>

                      {/* Wickets */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{
                          background: 'linear-gradient(135deg,#7c3aed22,#4c1d9522)',
                          border: '1px solid #7c3aed55',
                          color: '#a78bfa', fontWeight: 800, fontSize: 17,
                          borderRadius: 8, padding: '4px 14px', display: 'inline-block'
                        }}>{b.wkts || b.Wickets || 0}</span>
                      </td>

                      {/* Matches */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 14 }}>
                        {b.matches || b.Matches || '—'}
                      </td>

                      {/* Average */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: 15 }}>{b.avg || b.Avg || '—'}</span>
                      </td>

                      {/* Economy */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{
                          background: `${eColor}22`,
                          border: `1px solid ${eColor}66`,
                          color: eColor, fontWeight: 700, fontSize: 14,
                          borderRadius: 6, padding: '3px 10px', display: 'inline-block', minWidth: 48
                        }}>{b.econ || b.Econ || b.economy || '—'}</span>
                      </td>

                      {/* Best Figure */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{
                          background: '#f59e0b18',
                          border: '1px solid #f59e0b44',
                          color: '#fbbf24', fontWeight: 700, fontSize: 14,
                          borderRadius: 6, padding: '3px 10px', display: 'inline-block', letterSpacing: 0.5
                        }}>{b.best || b.Best || b.best_figure || '—'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 20, letterSpacing: 1 }}>
          DATA SOURCE: MONGODB ATLAS (BOWLING_STATS_2026)
        </div>
      </div>
    </div>
  )
}

export default AllTimeBowlers
