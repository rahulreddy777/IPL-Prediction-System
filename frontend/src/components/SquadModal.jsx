import React, { useState, useEffect } from 'react';
import { X, Search, User, TrendingUp, Zap } from 'lucide-react';
import axios from 'axios';
import TeamLogo from './common/TeamLogo';

const SquadModal = ({ team, onClose }) => {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [teamSquad, setTeamSquad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [error, setError] = useState(null);

  const teamId = typeof team === 'string' ? team : (team?.shortName || team?.id);
  const teamName = typeof team === 'string' ? team : (team?.name || team?.shortName || 'Unknown Team');
  const teamColor = typeof team === 'string' ? '#facc15' : (team?.color || '#facc15');

  useEffect(() => {
    if (!teamId) return;

    const fetchSquad = async () => {
      try {
        setLoading(true);
        setError(null);
        setFilter('All');
        setSearchQuery('');
        setSelectedPlayer(null);
        // Hit the new MongoDB-integrated API
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/teams/${teamId}/players`);
        const data = response.data?.players || [];
        setTeamSquad(data);
      } catch (err) {
        console.error('Error fetching squad:', err);
        setTeamSquad([]);
        setError('Failed to load squad');
      } finally {
        setLoading(false);
      }
    };

    fetchSquad();
  }, [teamId]);

  const filteredSquad = teamSquad.filter(p => {
    const matchesFilter = filter === 'All' ? true : p.role === filter;
    const matchesSearch = p?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPlayers = teamSquad.length;
  const retainedCount = teamSquad.filter(p => p.acquisition === 'Retained').length;
  const auctionCount = teamSquad.filter(p => p.acquisition === 'Auction').length;
  const tradeCount = teamSquad.filter(p => p.acquisition === 'Trade').length;
  const overseasCount = teamSquad.filter(p => p?.type?.includes('Overseas')).length;

  const getAcquisitionStyle = (type) => {
    switch (type) {
      case 'Retained': return { color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' };
      case 'Auction': return { color: '#facc15', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)' };
      case 'Trade': return { color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' };
      default: return { color: 'white', background: '#334155', border: '1px solid #475569' };
    }
  };

  const getRoleStyle = (role) => {
    switch (role) {
      case 'Batter': return { color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' };
      case 'Wicketkeeper': return { color: '#2dd4bf', background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)' };
      case 'All-rounder': return { color: '#c084fc', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)' };
      case 'Bowler': return { color: '#f472b6', background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.3)' };
      default: return { color: 'white', background: '#334155', border: '1px solid #475569' };
    }
  };

  const renderType = (type) => {
    const t = String(type || '').trim();
    const flag = t.toLowerCase().includes('overseas') ? '✈️' : '🇮🇳';
    return <span style={{ color: '#94a3b8' }}>{flag} {t || '—'}</span>;
  };

  // Render the player detail popup
  const renderPlayerPopup = () => {
    if (!selectedPlayer) return null;
    const s = selectedPlayer.stats;
    const role = String(selectedPlayer.role || '').toLowerCase();
    const isBowler = role === 'bowler';
    const isAllRounder = role === 'all-rounder';

    let statItems = [];
    if (s) {
      if (isBowler) {
        statItems = [
          { label: 'MATCHES', value: s.matches, color: '#60a5fa' },
          { label: 'WICKETS', value: s.wkts, color: '#f472b6' },
          { label: 'ECONOMY', value: s.econ, color: '#fb923c' },
          { label: 'BEST FIGS', value: s.bestFigures || '—', color: '#a78bfa' },
        ];
      } else if (isAllRounder) {
        statItems = [
          { label: 'MATCHES', value: s.matches, color: '#60a5fa' },
          { label: 'RUNS', value: s.runs != null ? Number(s.runs).toLocaleString() : null, color: '#facc15' },
          { label: 'STRIKE RATE', value: s.sr, color: '#4ade80' },
          { label: 'WICKETS', value: s.wkts, color: '#f472b6' },
          { label: 'ECONOMY', value: s.econ, color: '#fb923c' },
        ];
      } else {
        statItems = [
          { label: 'MATCHES', value: s.matches, color: '#60a5fa' },
          { label: 'RUNS', value: s.runs != null ? Number(s.runs).toLocaleString() : null, color: '#facc15' },
          { label: 'AVERAGE', value: s.avg, color: '#4ade80' },
          { label: 'STRIKE RATE', value: s.sr, color: '#a78bfa' },
          { label: '50s', value: s.fifties || 0, color: '#e879f9' },
          { label: '100s', value: s.hundreds || 0, color: '#c084fc' },
        ];
      }
    }

    const cols = statItems.length <= 4 ? statItems.length : 3;
    const playerImageFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.name)}&background=0f172a&color=cbd5e1&size=128`;

    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
        onClick={() => setSelectedPlayer(null)}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            width: '90%', maxWidth: '420px', borderRadius: '20px',
            border: `1px solid ${teamColor}44`,
            padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
            position: 'relative', textAlign: 'center',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setSelectedPlayer(null)}
            style={{
              position: 'absolute', top: '15px', right: '15px',
              background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer',
            }}
          ><X size={20} /></button>

          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: `${teamColor}22`,
            border: `2px solid ${teamColor}55`,
            margin: '0 auto 16px',
            overflow: 'hidden'
          }}>
            <img 
              src={`/data/players/${selectedPlayer.name}.jpg`}
              onError={(e) => { e.target.src = playerImageFallback; }}
              alt={selectedPlayer.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <h3 style={{ fontSize: '24px', color: 'white', margin: '0 0 8px 0', fontWeight: '800' }}>{selectedPlayer.name}</h3>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', ...getRoleStyle(selectedPlayer.role) }}>
              {selectedPlayer.role}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', ...getAcquisitionStyle(selectedPlayer.acquisition) }}>
              {selectedPlayer.acquisition}
            </span>
          </div>

          {/* Ratings Progress Bars */}
          {selectedPlayer.ratings && (
            <div style={{ marginBottom: '24px', background: '#0a0f1c', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
              {/* Form */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '80px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px' }}>
                  FORM
                </div>
                <div style={{ flex: 1, height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${selectedPlayer.ratings.form}%`, height: '100%', background: 'linear-gradient(90deg, #facc15, #fb923c)', borderRadius: '4px' }} />
                </div>
                <div style={{ width: '30px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: '#facc15' }}>
                  {selectedPlayer.ratings.form}
                </div>
              </div>
              {/* Impact */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '80px', textAlign: 'left', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px' }}>
                  IMPACT
                </div>
                <div style={{ flex: 1, height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${selectedPlayer.ratings.impact}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: '4px' }} />
                </div>
                <div style={{ width: '30px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>
                  {selectedPlayer.ratings.impact}
                </div>
              </div>
            </div>
          )}

          {/* Price + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ background: '#0a0f1c', padding: '12px 16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', letterSpacing: '1px' }}>PRICE</div>
              <div style={{ color: '#facc15', fontSize: '16px', fontWeight: 'bold' }}>{selectedPlayer.price || 'Undisclosed'}</div>
            </div>
            <div style={{ background: '#0a0f1c', padding: '12px 16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', letterSpacing: '1px' }}>TYPE</div>
              <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{selectedPlayer.type || '—'}</div>
            </div>
          </div>

          {/* IPL Career Stats */}
          <div style={{ marginBottom: '16px', color: '#94a3b8', fontSize: '10px', fontWeight: '800', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ height: '1px', flex: 1, background: '#1e293b' }} />
            IPL STATS
            <div style={{ height: '1px', flex: 1, background: '#1e293b' }} />
          </div>

          {s ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}>
              {statItems.map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b',
                  borderRadius: '12px', padding: '12px 6px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: value != null ? color : '#475569', marginBottom: '4px' }}>
                    {value != null ? value : '—'}
                  </div>
                  <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px', fontWeight: '700' }}>{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', background: '#0a0f1c', borderRadius: '12px', border: '1px solid #1e293b', color: '#475569', fontSize: '13px', fontWeight: '600' }}>
              No MongoDB career stats available
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{ color: teamColor, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold' }}>
          <TeamLogo team={teamId} size={48} showGlow={true} />
          Loading squad data...
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .squad-scroll::-webkit-scrollbar { width: 8px; }
        .squad-scroll::-webkit-scrollbar-track { background: #0f172a; border-radius: 4px; }
        .squad-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .squad-scroll::-webkit-scrollbar-thumb:hover { background: ${teamColor}; }
        .filter-btn {
          background: transparent; border: 1px solid #334155; color: #94a3b8;
          padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .filter-btn:hover { border-color: #64748b; color: #cbd5e1; }
        .filter-btn.active { border-color: ${teamColor}; color: ${teamColor}; background: ${teamColor}15; }
        .search-area {
          display: flex; align-items: center; background: #0f172a; border: 1px solid #334155;
          border-radius: 20px; padding: 8px 16px; flex: 1; max-width: 320px; margin-left: auto;
        }
        .search-area input {
          background: transparent; border: none; color: white; outline: none; margin-left: 10px; width: 100%;
          font-size: 14px;
        }
        .search-area input::placeholder { color: #64748b; font-weight: 500; }
        .player-row { border-bottom: 1px solid #1e293b; cursor: pointer; transition: all 0.2s; position: relative; }
        .player-row:hover { background: rgba(255,255,255,0.03); transform: translateY(-1px); }
        .player-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent; transition: background 0.2s; }
        .player-row:hover::before { background: ${teamColor}; }
      `}</style>

      {/* Main Modal Overlay */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15,23,42,0.85)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #0a0f1c 100%)', 
          width: '95%', maxWidth: '1100px', height: '90vh',
          borderRadius: '24px', border: `1px solid ${teamColor}33`, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: `0 30px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px ${teamColor}22`,
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 32px', borderBottom: '1px solid #1e293b',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: `linear-gradient(90deg, ${teamColor}11, transparent)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <TeamLogo team={teamId} size={72} showGlow={true} />
              <div>
                <div style={{ fontSize: '28px', color: teamColor, fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', textShadow: `0 0 20px ${teamColor}66` }}>
                  {teamName}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700', marginTop: 4 }}>
                  IPL 2026 SQUAD • {totalPlayers} PLAYERS
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1',
                cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#cbd5e1'; }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Captain Section */}
          {typeof team === 'object' && team?.captain && (
            <div style={{
              margin: '24px 32px 0',
              padding: '20px 24px',
              background: `linear-gradient(135deg, ${teamColor}15 0%, ${teamColor}05 100%)`,
              borderRadius: '16px',
              border: `1px solid ${teamColor}44`,
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 10px 30px -10px ${teamColor}33`,
            }}>
              <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: '300px',
                background: `radial-gradient(ellipse at right, ${teamColor}20 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
                border: `3px solid ${teamColor}88`,
                boxShadow: `0 0 20px ${teamColor}66`,
                overflow: 'hidden',
                background: `${teamColor}22`,
              }}>
                <img
                  src={`/data/players/${team.captain.name}.jpg`}
                  alt={team.captain.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  onError={e => { e.target.src = team.captain.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.captain.name)}`; }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: teamColor, fontSize: '10px', fontWeight: '800', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>👑</span> TEAM CAPTAIN
                </div>
                <div style={{ color: 'white', fontSize: '24px', fontWeight: '900', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {team.captain.name}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '600' }}>
                  {team.captain.role}
                </div>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div style={{
            padding: '24px 32px', display: 'flex', gap: '12px',
            borderBottom: '1px solid #1e293b', alignItems: 'center', flexWrap: 'wrap',
          }}>
            {['All', 'Batter', 'Wicketkeeper', 'All-rounder', 'Bowler'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
            <div className="search-area">
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search players by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="squad-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {error && (
              <div style={{ padding: '16px 32px', color: '#ef4444', fontWeight: 'bold' }}>{error}</div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1', fontSize: '14px' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
                <tr style={{ color: '#94a3b8', textAlign: 'left', fontSize: '11px', letterSpacing: '1.5px', fontWeight: '800', textTransform: 'uppercase' }}>
                  <th style={{ padding: '16px 12px 16px 32px', borderBottom: '1px solid #1e293b', width: '44px' }}>#</th>
                  <th style={{ padding: '16px 12px', borderBottom: '1px solid #1e293b' }}>Player</th>
                  <th style={{ padding: '16px 12px', borderBottom: '1px solid #1e293b' }}>Acquisition</th>
                  <th style={{ padding: '16px 12px', borderBottom: '1px solid #1e293b' }}>Type</th>
                  <th style={{ padding: '16px 12px', borderBottom: '1px solid #1e293b' }}>Role</th>
                  <th style={{ padding: '16px 12px', borderBottom: '1px solid #1e293b' }}>MongoDB Stats</th>
                  <th style={{ padding: '16px 12px', borderBottom: '1px solid #1e293b' }}>Form / Impact</th>
                  <th style={{ padding: '16px 32px 16px 12px', borderBottom: '1px solid #1e293b', textAlign: 'right' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredSquad.map((player, idx) => {
                  const s = player.stats;
                  const role = String(player?.role || '').toLowerCase();
                  const isBowler = role === 'bowler';
                  const statPreview = s
                    ? (isBowler
                      ? `${s.wkts ?? '—'} wkts · ${s.econ ?? '—'} eco`
                      : `${s.runs != null ? Number(s.runs).toLocaleString() : '—'} runs · ${s.avg ?? '—'} avg`)
                    : null;

                  return (
                    <tr
                      key={idx}
                      className="player-row"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <td style={{ padding: '16px 12px 16px 32px', color: '#64748b', fontWeight: 'bold' }}>{player.number || (idx + 1)}</td>
                      <td style={{ padding: '16px 12px', fontWeight: '800', color: 'white', fontSize: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img 
                            src={`/data/players/${player.name}.jpg`} 
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', background: '#1e293b' }}
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1e293b&color=cbd5e1`; }}
                            alt=""
                          />
                          {player.name}
                          {player.ratings?.impact >= 75 && <Zap size={14} color="#facc15" fill="#facc15" title="High Impact Player" />}
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                          ...getAcquisitionStyle(player.acquisition),
                        }}>{player.acquisition}</span>
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: '500' }}>{renderType(player.type)}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                          ...getRoleStyle(player.role),
                        }}>{player.role}</span>
                      </td>
                      <td style={{ padding: '16px 12px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>
                        {statPreview || <span style={{ color: '#475569' }}>—</span>}
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        {player.ratings ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ flex: 1, height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${player.ratings.form}%`, height: '100%', background: '#facc15' }} />
                              </div>
                              <span style={{ fontSize: '10px', color: '#facc15', fontWeight: 'bold', width: '16px' }}>{player.ratings.form}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ flex: 1, height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${player.ratings.impact}%`, height: '100%', background: '#38bdf8' }} />
                              </div>
                              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 'bold', width: '16px' }}>{player.ratings.impact}</span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '12px', fontWeight: '600' }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 32px 16px 12px', color: '#facc15', fontWeight: '800', textAlign: 'right' }}>
                        {player.price || '—'}
                      </td>
                    </tr>
                  );
                })}
                {filteredSquad.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#ef4444', fontWeight: 'bold', fontSize: '16px' }}>
                      {error ? 'Failed to load players' : 'No players found matching your criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Player Popup */}
      {renderPlayerPopup()}
    </>
  );
};

export default SquadModal;