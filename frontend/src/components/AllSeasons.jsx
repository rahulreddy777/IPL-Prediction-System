import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

const SEASONS = Array.from({ length: 2025 - 2008 + 1 }, (_, i) => 2025 - i);

const col = (width, align = 'left') => ({
  width,
  minWidth: width,
  padding: '14px 16px',
  textAlign: align,
  whiteSpace: 'nowrap',
});

const AllSeasons = () => {
  const [selectedSeason, setSelectedSeason] = useState(2025);
  const [allMatches, setAllMatches] = useState([]);
  const [seasonMatches, setSeasonMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [capsData, setCapsData] = useState([]);
  const [activeTab, setActiveTab] = useState('matches'); // matches, orange, purple

  useEffect(() => { 
    fetchAllMatches(); 
    fetchCapsData();
  }, []);

  const fetchCapsData = async () => {
    try {
      const response = await api.get('/all-seasons-caps');
      // sort by season descending
      const sorted = (Array.isArray(response.data) ? response.data : []).sort((a,b) => b.Season - a.Season);
      setCapsData(sorted);
    } catch (err) {
      console.error("Failed to fetch caps data", err);
    }
  };

  useEffect(() => {
    const filtered = allMatches.filter(m => Number(m.season) === Number(selectedSeason));
    setSeasonMatches(filtered);
  }, [selectedSeason, allMatches]);

  const fetchAllMatches = async () => {
    setLoadingMatches(true);
    try {
      const response = await api.get('/matches');
      setAllMatches(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAllMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      padding: '40px 24px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px', fontWeight: '900', color: '#f8fafc',
            display: 'flex', alignItems: 'center', gap: '12px',
            letterSpacing: '-0.5px', marginBottom: '4px'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #facc15, #f97316)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>✏️</span>
            IPL MATCHES 2008–2025
          </h1>
          <div style={{ height: '3px', width: '80px', background: 'linear-gradient(90deg, #facc15, #f97316)', borderRadius: '2px' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('matches')}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px',
              background: activeTab === 'matches' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'matches' ? '#fff' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            🏏 Matches
          </button>
          <button
            onClick={() => setActiveTab('orange')}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px',
              background: activeTab === 'orange' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(234,88,12,0.1)',
              color: activeTab === 'orange' ? '#fff' : '#f97316', border: '1px solid rgba(234,88,12,0.3)',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            🟠 Orange Cap (2008-2025)
          </button>
          <button
            onClick={() => setActiveTab('purple')}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px',
              background: activeTab === 'purple' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(124,58,237,0.1)',
              color: activeTab === 'purple' ? '#fff' : '#a855f7', border: '1px solid rgba(124,58,237,0.3)',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            🟣 Purple Cap (2008-2025)
          </button>
        </div>

        {/* Controls - Only show for Matches */}
        {activeTab === 'matches' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            marginBottom: '20px', flexWrap: 'wrap',
          }}>
          <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Season
          </label>
          <select
            value={selectedSeason}
            onChange={e => setSelectedSeason(Number(e.target.value))}
            style={{
              background: '#1e293b', color: '#f1f5f9',
              border: '1px solid #334155', borderRadius: '8px',
              padding: '8px 14px', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer', outline: 'none',
              appearance: 'auto',
            }}
          >
            {SEASONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {!loadingMatches && seasonMatches.length > 0 && (
            <span style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '20px', padding: '5px 14px',
              color: '#94a3b8', fontSize: '12px', fontWeight: '600',
              letterSpacing: '0.5px',
            }}>
              <span style={{ color: '#facc15', fontWeight: '800' }}>{seasonMatches.length}</span> matches
            </span>
          )}
        </div>
        )}

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}>
          
          {activeTab === 'matches' && (
            <>
              {loadingMatches ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '16px' }}>
                  Loading matches...
                </div>
          ) : seasonMatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '15px' }}>
              No matches found for {selectedSeason}.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: '13px', color: '#cbd5e1',
                tableLayout: 'fixed',
              }}>
                <colgroup>
                  <col style={{ width: '72px' }} />
                  <col style={{ width: '72px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: 'auto', minWidth: '160px' }} />
                </colgroup>

                <thead>
                  <tr style={{
                    background: '#0f172a',
                    borderBottom: '1px solid rgba(250,204,21,0.25)',
                  }}>
                    {[
                      ['#',          '72px',  'center'],
                      ['Season',     '72px',  'center'],
                      ['Teams',      '180px', 'left'  ],
                      ['T1 Score',   '120px', 'center'],
                      ['T2 Score',   '120px', 'center'],
                      ['Winner',     '90px',  'center'],
                      ['Margin',     '120px', 'center'],
                      ['Toss Winner','120px', 'center'],
                      ['Venue',      'auto',  'left'  ],
                    ].map(([label, , align]) => (
                      <th key={label} style={{
                        padding: '14px 16px',
                        textAlign: align,
                        color: '#facc15',
                        fontSize: '10px',
                        fontWeight: '800',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        userSelect: 'none',
                      }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {seasonMatches.map((m, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        transition: 'background 0.15s',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(250,204,21,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                    >
                      {/* Match # */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '12px' }}>
                        {m.matchNumber ?? idx + 1}
                      </td>

                      {/* Season */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#60a5fa', fontWeight: '700' }}>
                        {m.season}
                      </td>

                      {/* Teams */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                          <span style={{ color: '#fde68a', fontWeight: '700', fontSize: '12px' }}>{m.team1}</span>
                          <span style={{ color: '#475569', fontSize: '10px', fontWeight: '600' }}>vs</span>
                          <span style={{ color: '#6ee7b7', fontWeight: '700', fontSize: '12px' }}>{m.team2}</span>
                        </div>
                      </td>

                      {/* T1 Score */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                        {m.team1Score || '—'}
                      </td>

                      {/* T2 Score */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                        {m.team2Score || '—'}
                      </td>

                      {/* Winner */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          background: 'rgba(74,222,128,0.12)',
                          border: '1px solid rgba(74,222,128,0.25)',
                          color: '#4ade80',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontWeight: '700',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}>
                          {m.winner || 'N/A'}
                        </span>
                      </td>

                      {/* Margin */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#fb923c', fontWeight: '600', fontSize: '12px' }}>
                        {m.margin || '—'}
                      </td>

                      {/* Toss Winner */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#a78bfa', fontWeight: '600', fontSize: '12px' }}>
                        {m.tossWinner || '—'}
                      </td>

                      {/* Venue */}
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px', whiteSpace: 'normal', lineHeight: 1.4 }}>
                        {m.venue || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </>
          )}

          {activeTab === 'orange' && (
            <div style={{ overflowX: 'auto', padding: '24px' }}>
              <h2 style={{ color: '#f97316', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🟠 Orange Cap Winners (2008-2025)
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '2px solid rgba(234,88,12,0.5)' }}>
                    <th style={{ padding: '14px', textAlign: 'left', color: '#fb923c', fontSize: '13px', textTransform: 'uppercase' }}>Season</th>
                    <th style={{ padding: '14px', textAlign: 'left', color: '#fb923c', fontSize: '13px', textTransform: 'uppercase' }}>Player (Team)</th>
                    <th style={{ padding: '14px', textAlign: 'center', color: '#fb923c', fontSize: '13px', textTransform: 'uppercase' }}>Runs</th>
                  </tr>
                </thead>
                <tbody>
                  {capsData.map((c, idx) => (
                    <tr key={idx} style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                    }}>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: '#60a5fa' }}>{c.Season}</td>
                      <td style={{ padding: '14px', fontWeight: '600' }}>{c.OrangeCap}</td>
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800', color: '#facc15' }}>{c.Runs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'purple' && (
            <div style={{ overflowX: 'auto', padding: '24px' }}>
              <h2 style={{ color: '#a855f7', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🟣 Purple Cap Winners (2008-2025)
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '2px solid rgba(124,58,237,0.5)' }}>
                    <th style={{ padding: '14px', textAlign: 'left', color: '#c084fc', fontSize: '13px', textTransform: 'uppercase' }}>Season</th>
                    <th style={{ padding: '14px', textAlign: 'left', color: '#c084fc', fontSize: '13px', textTransform: 'uppercase' }}>Player (Team)</th>
                    <th style={{ padding: '14px', textAlign: 'center', color: '#c084fc', fontSize: '13px', textTransform: 'uppercase' }}>Wickets</th>
                  </tr>
                </thead>
                <tbody>
                  {capsData.map((c, idx) => (
                    <tr key={idx} style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                    }}>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: '#60a5fa' }}>{c.Season}</td>
                      <td style={{ padding: '14px', fontWeight: '600' }}>{c.PurpleCap}</td>
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800', color: '#a855f7' }}>{c.Wickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        {seasonMatches.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '16px', color: '#475569', fontSize: '11px', letterSpacing: '0.5px' }}>
            IPL 2008–2025 • All match data sourced from official records
          </div>
        )}
      </div>
    </div>
  );
};

export default AllSeasons;
