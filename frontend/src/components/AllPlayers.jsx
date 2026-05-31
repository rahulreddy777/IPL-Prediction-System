import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, User, Search, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

const TEAM_COLORS = {
  CSK: '#F9CD05', MI: '#004BA0', KKR: '#3A225D', GT: '#1C8CBF',
  RR: '#EA1A85', SRH: '#F26522', RCB: '#D4101A', DC: '#00008B',
  PBKS: '#ED1B24', LSG: '#005087',
};

const ROLE_COLORS = {
  'Batter': '#22c55e',
  'Bowler': '#f59e0b',
  'All-rounder': '#a855f7',
  'Wicketkeeper': '#06b6d4',
  'WK-Batter': '#06b6d4',
};

const getTeamColor = (team) => {
  if (!team) return '#475569';
  const t = String(team).toUpperCase();
  for (const [key, val] of Object.entries(TEAM_COLORS)) {
    if (t.includes(key)) return val;
  }
  return '#475569';
};

const getRoleColor = (role) => {
  if (!role) return '#94a3b8';
  for (const [key, val] of Object.entries(ROLE_COLORS)) {
    if (String(role).includes(key)) return val;
  }
  return '#94a3b8';
};

const TEAMS = ['All', 'CSK', 'MI', 'RCB', 'KKR', 'GT', 'SRH', 'DC', 'RR', 'PBKS', 'LSG'];
const ROLES = ['All', 'Batter', 'Bowler', 'All-rounder', 'Wicketkeeper'];

const AllPlayers = () => {
  const [players, setPlayers]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedTeam, setSelectedTeam]     = useState('All');
  const [selectedRole, setSelectedRole]     = useState('All');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Primary: MongoDB players_2026 (248 players)
        const res = await axios.get(`${API_BASE}/api/players2026`);
        const data = Array.isArray(res.data) ? res.data : [];
        setPlayers(data);
      } catch (err) {
        console.error('players2026 failed, trying fallback:', err);
        try {
          // Fallback: ipl_players_stats_2026
          const res2 = await axios.get(`${API_BASE}/api/players/stats`);
          const flat = [];
          const raw = res2.data;
          if (Array.isArray(raw)) {
            raw.forEach(doc => {
              if (doc.Player || doc.player) {
                flat.push(doc);
              } else {
                for (const teamKey in doc) {
                  if (teamKey === '_id' || teamKey === '__v') continue;
                  const bucket = doc[teamKey];
                  for (const pName in bucket) {
                    flat.push({ Player: pName, Team: teamKey.toUpperCase(), ...bucket[pName] });
                  }
                }
              }
            });
          }
          setPlayers(flat.sort((a, b) => (a.Player || '').localeCompare(b.Player || '')));
        } catch (err2) {
          setError('Failed to load players from MongoDB.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const filtered = players.filter(p => {
    const matchSearch = (p.Player || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchTeam   = selectedTeam === 'All' || String(p.Team || '').toUpperCase().includes(selectedTeam);
    const matchRole   = selectedRole === 'All' || String(p.Role || p.Type || '').includes(selectedRole);
    return matchSearch && matchTeam && matchRole;
  });

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>🏏</div>
      <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Loading all players from MongoDB…</div>
    </div>
  );

  return (
    <div style={{ padding: '32px 20px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <Users color="#a855f7" size={32} />
          <h2 style={{ fontSize: '28px', color: '#a855f7', margin: 0, textTransform: 'uppercase', fontFamily: 'Oswald, sans-serif', letterSpacing: '1px' }}>
            ALL PLAYERS · IPL 2026
          </h2>
          <span style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', borderRadius: '20px', padding: '3px 14px', fontSize: '13px', fontWeight: '700' }}>
            {filtered.length} / {players.length}
          </span>
        </div>
        <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>
          Live from MongoDB{' '}
          <code style={{ background: 'rgba(168,85,247,0.1)', padding: '1px 6px', borderRadius: '4px', color: '#a855f7' }}>
            players_2026
          </code>
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#f87171', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '28px', alignItems: 'flex-start' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search players…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px 11px 40px', borderRadius: '24px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Team pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {TEAMS.map(t => (
            <button key={t} onClick={() => setSelectedTeam(t)} style={{
              padding: '6px 14px', borderRadius: '20px', border: '1px solid',
              fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s',
              background: selectedTeam === t ? (TEAM_COLORS[t] || '#a855f7') : 'rgba(255,255,255,0.04)',
              borderColor: selectedTeam === t ? (TEAM_COLORS[t] || '#a855f7') : 'rgba(255,255,255,0.1)',
              color: selectedTeam === t ? (t === 'All' ? '#fff' : '#000') : '#94a3b8',
              letterSpacing: '0.5px',
            }}>{t}</button>
          ))}
        </div>

        {/* Role pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {ROLES.map(r => (
            <button key={r} onClick={() => setSelectedRole(r)} style={{
              padding: '6px 12px', borderRadius: '20px', border: '1px solid',
              fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
              background: selectedRole === r ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
              borderColor: selectedRole === r ? '#a855f7' : 'rgba(255,255,255,0.1)',
              color: selectedRole === r ? '#a855f7' : '#64748b',
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Player Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '16px' }}>
        {filtered.map((player, idx) => {
          const teamColor = getTeamColor(player.Team);
          const roleColor = getRoleColor(player.Role || player.Type);
          return (
            <div
              key={idx}
              onClick={() => setSelectedPlayer(player)}
              style={{
                background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '20px 16px',
                textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = teamColor + '60';
                e.currentTarget.style.boxShadow = `0 12px 30px ${teamColor}20`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Team color top bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${teamColor}, transparent)` }} />

              {/* Avatar */}
              <div style={{
                width: '68px', height: '68px', margin: '0 auto 12px',
                background: `radial-gradient(circle, ${teamColor}22 0%, rgba(0,0,0,0.3) 100%)`,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${teamColor}50`,
              }}>
                <User size={32} color={teamColor} />
              </div>

              {/* Name */}
              <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: '700', marginBottom: '8px', lineHeight: 1.3, minHeight: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {player.Player}
              </div>

              {/* Team badge */}
              <span style={{
                background: `${teamColor}20`, color: teamColor,
                border: `1px solid ${teamColor}40`,
                padding: '3px 10px', borderRadius: '10px',
                fontSize: '11px', fontWeight: '800', display: 'inline-block', marginBottom: '8px',
              }}>
                {player.Team || 'TBA'}
              </span>

              {/* Role badge */}
              {(player.Role || player.Type) && (
                <div style={{
                  background: `${roleColor}15`, color: roleColor,
                  border: `1px solid ${roleColor}30`,
                  padding: '3px 8px', borderRadius: '8px',
                  fontSize: '10px', fontWeight: '700', marginTop: '4px',
                }}>
                  {player.Role || player.Type}
                </div>
              )}

              {/* Acquisition */}
              {player.Acquisition && player.Acquisition !== '—' && (
                <div style={{ color: '#475569', fontSize: '9px', marginTop: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {player.Acquisition}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#64748b' }}>No players found</div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>Try adjusting your search or filters</div>
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div
          onClick={() => setSelectedPlayer(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
              border: `1px solid ${getTeamColor(selectedPlayer.Team)}40`,
              borderRadius: '24px', width: '100%', maxWidth: '460px',
              position: 'relative', overflow: 'hidden',
              boxShadow: `0 30px 80px ${getTeamColor(selectedPlayer.Team)}30`,
            }}
          >
            <button
              onClick={() => setSelectedPlayer(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px', zIndex: 2,
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            {/* Modal header */}
            <div style={{
              background: `linear-gradient(135deg, ${getTeamColor(selectedPlayer.Team)}33, ${getTeamColor(selectedPlayer.Team)}11)`,
              padding: '40px 24px 28px', textAlign: 'center',
              borderBottom: `1px solid ${getTeamColor(selectedPlayer.Team)}25`,
            }}>
              <div style={{
                width: '88px', height: '88px', margin: '0 auto 16px',
                background: `radial-gradient(circle, ${getTeamColor(selectedPlayer.Team)}30 0%, rgba(0,0,0,0.4) 100%)`,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `3px solid ${getTeamColor(selectedPlayer.Team)}60`,
                boxShadow: `0 0 28px ${getTeamColor(selectedPlayer.Team)}40`,
              }}>
                <User size={42} color={getTeamColor(selectedPlayer.Team)} />
              </div>
              <h2 style={{ color: '#f1f5f9', margin: '0 0 10px', fontSize: '22px', fontFamily: 'Oswald, sans-serif', fontWeight: '800' }}>
                {selectedPlayer.Player}
              </h2>
              <span style={{
                background: `${getTeamColor(selectedPlayer.Team)}25`,
                color: getTeamColor(selectedPlayer.Team),
                border: `1px solid ${getTeamColor(selectedPlayer.Team)}50`,
                padding: '4px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '800',
              }}>
                {selectedPlayer.Team}
              </span>
            </div>

            {/* Modal stats */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Role',        value: selectedPlayer.Role },
                  { label: 'Acquisition', value: selectedPlayer.Acquisition },
                  { label: 'Player Type', value: selectedPlayer.Type },
                  { label: 'Price',       value: selectedPlayer.Price },
                  { label: 'No.',         value: selectedPlayer.No },
                ].filter(item => item.value && String(item.value) !== '—' && String(item.value) !== 'null').map(({ label, value }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.04)', padding: '14px',
                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700' }}>{label}</div>
                    <div style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '700' }}>{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPlayers;
