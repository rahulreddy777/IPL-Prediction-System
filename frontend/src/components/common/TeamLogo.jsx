import React from 'react';

const TEAM_COLORS = {
  MI:   '#1E90FF',
  CSK:  '#F9CD05',
  KKR:  '#3A0CA3',
  RCB:  '#D4101A',
  DC:   '#0057A8',
  RR:   '#EA1A85',
  SRH:  '#F26522',
  GT:   '#00B4D8',
  PBKS: '#DD1F2D',
  LSG:  '#00BFFF',
  TBD:  '#334155'
};

const TeamLogo = ({ team, size = 28, showGlow = true, style = {} }) => {
  const code = (team || 'TBD').toUpperCase();
  const safeCode = code === 'TBD' ? 'tbd' : code.toLowerCase();
  
  // Use known colors or fallback to TBD color
  const color = TEAM_COLORS[code] || TEAM_COLORS.TBD;
  
  // Default to a fallback UI if it's TBD
  if (code === 'TBD') {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
        border: '1px dashed rgba(100, 116, 139, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, size * 0.4),
        color: '#94a3b8',
        fontWeight: 'bold',
        ...style
      }}>
        ?
      </div>
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: `${color}22`,
      border: `2px solid ${color}`,
      boxShadow: showGlow ? `0 0 ${size * 0.3}px ${color}66` : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      ...style
    }}>
      <img 
        src={`/teams/${safeCode}.jpg`} 
        alt={`${code} Logo`}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onError={(e) => {
          // Fallback if image fails to load
          e.target.style.display = 'none';
          if (e.target.parentNode) {
            e.target.parentNode.innerHTML = `<span style="font-size: ${size * 0.4}px; font-weight: bold; color: ${color};">${code.substring(0, 2)}</span>`;
          }
        }}
      />
    </div>
  );
};

export default TeamLogo;
