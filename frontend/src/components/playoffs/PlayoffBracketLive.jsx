import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const POLL_MS = 15000;

const TEAM_COLORS = {
  MI:   { gradient: "linear-gradient(90deg, #1E90FF, #0057A8)" },
  CSK:  { gradient: "linear-gradient(90deg, #F9CD05, #ca8a04)" },
  KKR:  { gradient: "linear-gradient(90deg, #3A0CA3, #2e1065)" },
  RCB:  { gradient: "linear-gradient(90deg, #D4101A, #991b1b)" },
  DC:   { gradient: "linear-gradient(90deg, #0057A8, #1e3a8a)" },
  RR:   { gradient: "linear-gradient(90deg, #EA1A85, #be185d)" },
  SRH:  { gradient: "linear-gradient(90deg, #F26522, #c2410c)" },
  GT:   { gradient: "linear-gradient(90deg, #00B4D8, #0369a1)" },
  PBKS: { gradient: "linear-gradient(90deg, #DD1F2D, #9f1239)" },
  LSG:  { gradient: "linear-gradient(90deg, #00BFFF, #0284c7)" },
  TBD:  { gradient: "linear-gradient(90deg, rgba(30,58,138,0.5), rgba(15,23,42,0.5))" },
};

function tc(code) {
  return TEAM_COLORS[code] || TEAM_COLORS.TBD;
}

function TeamBox({ team, labelIfEmpty, defaultGradient }) {
  let code = labelIfEmpty;
  if (team) {
    if (typeof team === 'object') {
      code = team.code || team.shortName || team.name || labelIfEmpty;
    } else if (typeof team === 'string') {
      code = team;
    }
  }
  
  const isPlaceholder = code === labelIfEmpty || code === 'TBD' || code.includes('WINNER') || code.includes('LOSER');
  
  const bg = isPlaceholder 
    ? defaultGradient || 'linear-gradient(180deg, rgba(30,64,175,0.4), rgba(15,23,42,0.6))'
    : tc(code).gradient;

  return (
    <div style={{
      background: bg,
      height: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isPlaceholder ? '#60a5fa' : '#fff',
      fontWeight: '900',
      fontSize: isPlaceholder ? '16px' : '28px',
      fontFamily: "'Oswald', sans-serif",
      letterSpacing: '1px',
      border: isPlaceholder ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.2)',
      borderRadius: '4px',
      textShadow: isPlaceholder ? 'none' : '0 2px 4px rgba(0,0,0,0.5)',
      boxShadow: isPlaceholder ? 'none' : '0 4px 10px rgba(0,0,0,0.3)',
      textTransform: 'uppercase',
      zIndex: 2,
      position: 'relative'
    }}>
      {code}
    </div>
  );
}

export default function PlayoffBracketLive() {
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyBracket = useCallback((data) => {
    if (!data || !data.success) return;
    setBracket(data);
    setError(null);
    setLoading(false);
  }, []);

  const fetchBracket = useCallback(async () => {
    try {
      const [bracketRes, matchesRes] = await Promise.all([
        axios.get(`${API}/api/playoffs/auto-bracket`).catch(() => ({ data: null })),
        axios.get(`${API}/api/matches2026`).catch(() => ({ data: [] }))
      ]);
      
      let data = bracketRes.data;
      if (!data || !data.success) {
        try {
          const fallback = await axios.get(`${API}/api/playoffs/bracket`);
          data = fallback.data;
        } catch (e) {
          setError("Could not load playoff bracket.");
          setLoading(false);
          return;
        }
      }

      if (matchesRes.data && matchesRes.data.length > 0) {
        let playoffMatches = matchesRes.data.filter(m => m.stage === 'playoff');
        const m71 = playoffMatches.find(m => m.matchNumber === 71);
        const m72 = playoffMatches.find(m => m.matchNumber === 72);
        const m73 = playoffMatches.find(m => m.matchNumber === 73);
        const m74 = playoffMatches.find(m => m.matchNumber === 74);

        if (m71 && m72 && m73 && m74) {
          const _getCode = (v) => v ? (typeof v === 'object' ? v.code : (v === 'TBD' ? null : v)) : null;
          const nrm = (n) => {
            if (!n) return 'TBD';
            if (n.toUpperCase() === 'ROYAL CHALLENGERS BENGALURU') return 'RCB';
            if (n.toUpperCase() === 'GUJARAT TITANS') return 'GT';
            return n;
          };
          const w = nrm(_getCode(m71.winner));
          const t1 = nrm(m71.team1?.code || m71.team1?.shortName || m71.team1?.name);
          const t2 = nrm(m71.team2?.code || m71.team2?.shortName || m71.team2?.name);
          const q1LoserCode = w ? (w === t1 ? t2 : t1) : null;
          const elimWinnerCode = nrm(_getCode(m72.winner));
          const q2WinnerCode = nrm(_getCode(m73.winner));
          const q1WinnerCode = w;

          if (q1LoserCode && (!m73.team1?.code || m73.team1.code === 'TBD')) m73.team1 = { code: q1LoserCode };
          if (elimWinnerCode && (!m73.team2?.code || m73.team2.code === 'TBD')) m73.team2 = { code: elimWinnerCode };
          if (q1WinnerCode && (!m74.team1?.code || m74.team1.code === 'TBD')) m74.team1 = { code: q1WinnerCode };
          if (q2WinnerCode && q2WinnerCode !== 'TBD') m74.team2 = { code: q2WinnerCode };
        }

        const updateCards = (cardArray) => cardArray.map(card => {
          const pMatch = playoffMatches.find(pm => pm.matchNumber === card.matchId);
          if (pMatch) {
            return {
              ...card, team1: pMatch.team1, team2: pMatch.team2, winner: pMatch.winner || card.winner,
              liveStatus: pMatch.status === 'completed' ? 'FINISHED' : (pMatch.status === 'live' ? 'LIVE' : 'UPCOMING')
            };
          }
          return card;
        });

        if (data.cards) data.cards = updateCards(data.cards);
        if (data.playoffs) data.playoffs = updateCards(data.playoffs);
      }
      applyBracket(data);
    } catch (e) {
      setError("Error: " + e.message);
      setLoading(false);
    }
  }, [applyBracket]);

  useEffect(() => {
    fetchBracket();
    const poll = setInterval(fetchBracket, POLL_MS);
    return () => clearInterval(poll);
  }, [fetchBracket]);

  if (loading) return <div style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>Loading Playoffs...</div>;
  if (error && !bracket) return <div style={{ color: 'red', textAlign: 'center', padding: '40px' }}>{error}</div>;
  if (!bracket) return null;

  const cards = bracket.playoffs || bracket.cards || [];
  const getCard = (id) => cards.find((c) => c.matchId === id) || {};
  const q1Card = getCard(71);
  const elimCard = getCard(72);
  const q2Card = getCard(73);
  const finalCard = getCard(74);

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #012e73, #001233)',
      borderRadius: '16px',
      overflow: 'hidden',
      padding: '40px 20px',
      position: 'relative',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '60px', position: 'relative', zIndex: 10 }}>
        <div style={{ fontSize: '18px', letterSpacing: '4px', fontWeight: '800', color: '#fff', textTransform: 'uppercase' }}>Indian Premier League</div>
        <div style={{ fontSize: '72px', fontWeight: '900', color: '#fff', lineHeight: 1, fontFamily: "'Oswald', sans-serif", letterSpacing: '2px', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>PLAYOFFS 2026</div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
        {/* Bracket Container */}
        <div style={{ position: 'relative', width: '850px', margin: '0 auto', height: '560px' }}>
          
          {/* SVG Lines */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
            <defs>
              <marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
              </marker>
              <marker id="arrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
              </marker>
            </defs>

            {/* Q1 Win (250, 53) -> FINAL Top (580, 133) */}
            <path d="M 250 53 L 550 53 L 550 133 L 575 133" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrowGreen)" />
            
            {/* Q1 Lose (250, 133) -> Q2 Top (290, 293) */}
            <path d="M 250 133 L 270 133 L 270 293 L 285 293" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrowRed)" />
            
            {/* Elim Win (250, 495) -> Q2 Bot (290, 373) */}
            <path d="M 250 495 L 270 495 L 270 373 L 285 373" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrowGreen)" />
            
            {/* Q2 Win (540, 325) -> FINAL Bot (580, 213) */}
            <path d="M 540 325 L 560 325 L 560 213 L 575 213" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrowGreen)" />
          </svg>

          {/* QUALIFIER 1 */}
          <div style={{ position: 'absolute', top: 10, left: 0, width: '250px', zIndex: 2, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'linear-gradient(90deg, #1e40af, #3b82f6)', color: '#fff', textAlign: 'center', fontSize: '13px', fontWeight: '800', padding: '6px' }}>QUALIFIER 1</div>
            <TeamBox team={q1Card.team1} labelIfEmpty="TBD" />
            <div style={{ background: '#0f172a', color: '#fff', textAlign: 'center', fontSize: '12px', fontWeight: '700', padding: '8px' }}>26 MAY | DHARAMSHALA</div>
            <TeamBox team={q1Card.team2} labelIfEmpty="TBD" />
          </div>

          {/* ELIMINATOR */}
          <div style={{ position: 'absolute', top: 420, left: 0, width: '250px', zIndex: 2, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'linear-gradient(90deg, #1e40af, #3b82f6)', color: '#fff', textAlign: 'center', fontSize: '13px', fontWeight: '800', padding: '6px' }}>ELIMINATOR</div>
            <TeamBox team={elimCard.team1} labelIfEmpty="TBD" />
            <div style={{ background: '#0f172a', color: '#fff', textAlign: 'center', fontSize: '12px', fontWeight: '700', padding: '8px' }}>27 MAY | MULLANPUR</div>
            <TeamBox team={elimCard.team2} labelIfEmpty="TBD" />
          </div>

          {/* QUALIFIER 2 */}
          <div style={{ position: 'absolute', top: 250, left: 290, width: '250px', zIndex: 2, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'linear-gradient(90deg, #1e40af, #3b82f6)', color: '#fff', textAlign: 'center', fontSize: '13px', fontWeight: '800', padding: '6px' }}>QUALIFIER 2</div>
            <TeamBox team={q2Card.team1} labelIfEmpty="Q1 LOSER" defaultGradient="linear-gradient(180deg, rgba(30,58,138,0.8), rgba(15,23,42,0.8))" />
            <div style={{ background: '#0f172a', color: '#fff', textAlign: 'center', fontSize: '12px', fontWeight: '700', padding: '8px' }}>29 MAY | MULLANPUR</div>
            <TeamBox team={q2Card.team2} labelIfEmpty="ELIMINATOR WINNER" defaultGradient="linear-gradient(180deg, rgba(30,58,138,0.8), rgba(15,23,42,0.8))" />
          </div>

          {/* FINAL */}
          <div style={{ position: 'absolute', top: 90, left: 580, width: '260px', zIndex: 2, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'linear-gradient(90deg, #ca8a04, #facc15)', color: '#fff', textAlign: 'center', fontSize: '14px', fontWeight: '900', padding: '6px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>FINAL</div>
            <TeamBox team={finalCard.team1} labelIfEmpty="Q1 WINNER" defaultGradient="linear-gradient(180deg, rgba(30,58,138,0.8), rgba(15,23,42,0.8))" />
            <div style={{ background: '#0f172a', color: '#fff', textAlign: 'center', fontSize: '12px', fontWeight: '700', padding: '8px' }}>31 MAY | AHMEDABAD</div>
            <TeamBox team={finalCard.team2} labelIfEmpty="Q2 WINNER" defaultGradient="linear-gradient(180deg, rgba(30,58,138,0.8), rgba(15,23,42,0.8))" />
          </div>

        </div>
      </div>
    </div>
  );
}
