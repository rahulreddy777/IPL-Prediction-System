import React, { useState } from 'react';
import SquadModal from './SquadModal';
import TeamLogo from './common/TeamLogo';

const CaptainCard = ({ team }) => {
  const [showSquad, setShowSquad] = useState(false);
  const [hovered, setHovered] = useState(false);

  const cs = team.captain.captainStats || {};

  const cardStyle = {
    background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
    borderRadius: '16px',
    overflow: 'hidden',
    border: `1px solid ${team.color}30`,
    boxShadow: hovered
      ? `0 20px 60px ${team.color}50, 0 0 0 1px ${team.color}60`
      : `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${team.color}20`,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: hovered ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
    cursor: 'pointer',
    position: 'relative',
  };

  return (
    <>
      <div
        style={cardStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Hero Image */}
        <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
          {/* Gradient overlays */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to top, #0f172a 0%, #0f172a20 40%, transparent 70%), radial-gradient(ellipse at top right, ${team.color}50 0%, transparent 60%)`,
            zIndex: 1
          }} />
          {/* Animated glow pulse */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at bottom left, ${team.color}25 0%, transparent 60%)`,
            zIndex: 1,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.4s ease'
          }} />

          <img
            src={team.captain.image}
            alt={team.captain.name}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'top',
              transition: 'transform 0.6s ease',
              transform: hovered ? 'scale(1.06)' : 'scale(1)'
            }}
          />

          {/* Team Logo Badge */}
          <div style={{
            position: 'absolute', top: '16px', left: '16px',
            zIndex: 2,
          }}>
            <TeamLogo team={team.shortName} size={44} showGlow={true} />
          </div>

          {/* Team label pill */}
          <div style={{
            position: 'absolute', top: '16px', right: '16px', zIndex: 2,
            background: `${team.color}25`,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${team.color}50`,
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '9px',
            color: team.color,
            fontWeight: '800',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            {team.shortName}
          </div>

          {/* Bottom name strip overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
            padding: '12px 20px 0',
          }}>
            <div style={{ color: team.color, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '800', marginBottom: '2px' }}>
              {team.shortName} CAPTAIN
            </div>
            <h3 style={{
              fontSize: '20px', fontWeight: '900', margin: '0 0 2px',
              display: 'flex', alignItems: 'center', gap: '8px',
              color: '#f1f5f9',
              textShadow: `0 2px 12px ${team.color}80`
            }}>
              <span style={{ fontSize: '16px' }}>👑</span> {team.captain.name}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '11px', margin: '0 0 14px', fontWeight: '500' }}>
              {team.captain.role}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{
            borderTop: `1px solid ${team.color}30`,
            paddingTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
          }}>
            <StatBox label="MATCHES" value={cs.matches ?? 0} color={team.color} />
            <StatBox label="WON" value={cs.won ?? 0} color="#22c55e" highlight />
            <StatBox label="LOST" value={cs.lost ?? 0} color="#ef4444" highlight />
            <StatBox label="WIN %" value={cs.winPct ?? '0%'} color={team.color} bright highlight />
          </div>

          {/* View Squad Button - always solid */}
          <button
            onClick={() => setShowSquad(true)}
            style={{
              width: '100%',
              marginTop: '16px',
              background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
              border: 'none',
              color: '#000',
              padding: '11px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              boxShadow: `0 4px 15px ${team.color}55`,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = `0 6px 25px ${team.color}88`;
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = `0 4px 15px ${team.color}55`;
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            VIEW SQUAD
          </button>
        </div>
      </div>

      {showSquad && <SquadModal team={team} onClose={() => setShowSquad(false)} />}
    </>
  );
};

const StatBox = ({ label, value, color, highlight, bright }) => (
  <div style={{
    textAlign: 'center',
    padding: '10px 4px',
    background: highlight ? `${color}12` : 'transparent',
    borderRadius: '8px',
    border: highlight ? `1px solid ${color}25` : '1px solid transparent',
  }}>
    <div style={{
      fontSize: highlight ? '18px' : '15px',
      fontWeight: '800',
      color: highlight ? color : bright ? '#ffffff' : '#e2e8f0',
      lineHeight: 1,
      marginBottom: '5px',
      fontVariantNumeric: 'tabular-nums',
      textShadow: bright && !highlight ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
    }}>
      {value ?? '—'}
    </div>
    <div style={{
      fontSize: '8px',
      color: '#94a3b8',
      letterSpacing: '1px',
      fontWeight: '700',
      textTransform: 'uppercase',
    }}>
      {label}
    </div>
  </div>
);

export default CaptainCard;
