import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

const SEASONS = ['all', '2008', '2009', '2010', '2011', '2012', '2013', '2014',
                 '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022',
                 '2023', '2024', '2025'];

const PlayerStats = () => {
  const [season, setSeason] = useState('all');
  const [allCaps, setAllCaps] = useState([]);   // full list for table
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  // Fetch the full history once on mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/players/stats/caps?season=all');
        const data = Array.isArray(res.data) ? res.data : [];
        setAllCaps(data);
      } catch (e) {
        console.error('Error fetching caps:', e);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Derive what to show from client-side filter (no extra API calls)
  const selectedRow = season === 'all' ? null : allCaps.find(c => String(c.season) === season);

  /* ── helpers ── */
  const labelFor = (s) => s === 'all' ? 'ALL SEASONS' : `IPL ${s}`;

  if (loading) return (
    <div style={{ color: '#eab308', textAlign: 'center', padding: '80px', fontSize: 20 }}>
      Loading caps data…
    </div>
  );

  if (error) return (
    <div style={{ color: '#f87171', textAlign: 'center', padding: '80px', fontSize: 18 }}>
      {error}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e3a5f 100%)',
      padding: '2rem 1rem',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Title */}
        <h1 style={{
          textAlign: 'center', color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          fontWeight: 900, marginBottom: '1.5rem', letterSpacing: 1,
        }}>
          🏏 IPL Orange &amp; Purple Caps
        </h1>

        {/* Season selector */}
        <div style={{
          background: 'rgba(255,255,255,0.07)', borderRadius: 16,
          padding: '1rem 1.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <label style={{ color: '#cbd5e1', fontWeight: 600, fontSize: 15 }}>
            Select Season:
          </label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8, fontSize: 15, fontWeight: 700,
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
              outline: 'none',
            }}
          >
            {SEASONS.map(s => (
              <option key={s} value={s} style={{ background: '#1e1b4b', color: '#fff' }}>
                {s === 'all' ? 'ALL' : s}
              </option>
            ))}
          </select>

          <span style={{
            marginLeft: 'auto', color: '#94a3b8', fontSize: 13, fontStyle: 'italic',
          }}>
            {season === 'all'
              ? `${allCaps.length} seasons of data`
              : (selectedRow ? `Showing IPL ${season}` : `No data for ${season}`)}
          </span>
        </div>

        {/* ── ALL SEASONS: full table ── */}
        {season === 'all' && (
          <div style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden',
          }}>
            <h2 style={{
              color: '#fff', textAlign: 'center', padding: '1.2rem',
              fontSize: '1.3rem', fontWeight: 800, letterSpacing: 1,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.2)', margin: 0,
            }}>
              🏆 All Seasons Caps History 🎩
            </h2>

            {allCaps.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem' }}>
                No data available
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <th style={thStyle('#93c5fd')}>Season</th>
                      <th style={thStyle('#fb923c')}>🟠 Orange Cap (Runs)</th>
                      <th style={thStyle('#c084fc')}>🟣 Purple Cap (Wickets)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCaps.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSeason(String(row.season))}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={tdStyle('#93c5fd', true)}>{row.season}</td>
                        <td style={tdStyle('#fff')}>
                          <span style={{ fontWeight: 700 }}>{row.orangeCap?.player}</span>
                          <span style={badgeStyle('rgba(251,146,60,0.18)', '#fb923c')}>
                            {row.orangeCap?.runs} runs
                          </span>
                        </td>
                        <td style={tdStyle('#fff')}>
                          <span style={{ fontWeight: 700 }}>{row.purpleCap?.player}</span>
                          <span style={badgeStyle('rgba(192,132,252,0.18)', '#c084fc')}>
                            {row.purpleCap?.wickets} wkts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SPECIFIC SEASON: two big cards ── */}
        {season !== 'all' && (
          <>
            {!selectedRow ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '4rem', fontSize: 18 }}>
                No data available for season {season}.
              </p>
            ) : (
              <>
                <h2 style={{
                  textAlign: 'center', color: '#e2e8f0', fontSize: '1.4rem',
                  fontWeight: 800, marginBottom: '1.5rem', letterSpacing: 2,
                  textTransform: 'uppercase',
                }}>
                  🏆 IPL {season} Cap Winners
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                  {/* Orange Cap Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fbbf24 100%)',
                    borderRadius: 24, padding: '2rem', color: '#fff',
                    boxShadow: '0 20px 60px rgba(234,88,12,0.4)',
                    position: 'relative', overflow: 'hidden',
                    transform: 'translateY(0)', transition: 'transform 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ position: 'absolute', top: 12, right: 20, fontSize: 80, opacity: 0.12 }}>🏏</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <span style={{ fontSize: 40 }}>🟠</span>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: 1 }}>
                        ORANGE CAP
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8, margin: '0 0 4px' }}>
                      Most Runs
                    </p>
                    <p style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, margin: '0 0 1.5rem', lineHeight: 1.2 }}>
                      {selectedRow.orangeCap?.player}
                    </p>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8, margin: '0 0 2px' }}>Runs</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>{selectedRow.orangeCap?.runs}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8, margin: '0 0 2px' }}>Season</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{season}</p>
                      </div>
                    </div>
                  </div>

                  {/* Purple Cap Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)',
                    borderRadius: 24, padding: '2rem', color: '#fff',
                    boxShadow: '0 20px 60px rgba(124,58,237,0.4)',
                    position: 'relative', overflow: 'hidden',
                    transform: 'translateY(0)', transition: 'transform 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ position: 'absolute', top: 12, right: 20, fontSize: 80, opacity: 0.12 }}>🎯</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <span style={{ fontSize: 40 }}>🟣</span>
                      <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: 1 }}>
                        PURPLE CAP
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8, margin: '0 0 4px' }}>
                      Most Wickets
                    </p>
                    <p style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, margin: '0 0 1.5rem', lineHeight: 1.2 }}>
                      {selectedRow.purpleCap?.player}
                    </p>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                      <div>
                        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8, margin: '0 0 2px' }}>Wickets</p>
                        <p style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>{selectedRow.purpleCap?.wickets}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.8, margin: '0 0 2px' }}>Season</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{season}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Back link */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <button
                    onClick={() => setSeason('all')}
                    style={{
                      background: 'rgba(255,255,255,0.1)', color: '#cbd5e1',
                      border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                      padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: 14,
                      fontWeight: 600, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  >
                    ← Back to All Seasons
                  </button>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
};

/* ── style helpers ── */
const thStyle = (color) => ({
  padding: '0.9rem 1.2rem', textAlign: 'left', color,
  fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1,
});

const tdStyle = (color, center = false) => ({
  padding: '0.75rem 1.2rem', color,
  fontSize: 14, textAlign: center ? 'center' : 'left',
  fontWeight: center ? 800 : 400,
});

const badgeStyle = (bg, color) => ({
  display: 'inline-block', marginLeft: 8,
  padding: '2px 8px', borderRadius: 6,
  background: bg, color, fontSize: 12, fontWeight: 700,
});

export default PlayerStats;
