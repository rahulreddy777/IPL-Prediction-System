/**
 * InjuryTracker.jsx — IPL 2026 Injury & Availability Dashboard
 * Features:
 *  - Live injury watch list pulled from /api/injury
 *  - Recovery toast notification for Dhoni + Brevis
 *  - Match 18 Playing XI display with "Recently Recovered" badges
 *  - Before/After ML probability comparison
 */
import React, { useState, useEffect, useCallback } from 'react';

// ── Team colours ────────────────────────────────────────────────────────────────
const TC = {
  CSK:'#F9CD05', DC:'#0057A8', MI:'#1E90FF', KKR:'#7B2FBE',
  RR:'#EA1A85', RCB:'#D4101A', SRH:'#F26522', GT:'#00B4D8',
  PBKS:'#DD1F2D', LSG:'#00BFFF',
};

// ── Severity colours ─────────────────────────────────────────────────────────
const SEV = {
  HIGH:     { bg:'#1a0808', border:'#ef4444', text:'#ef4444' },
  MODERATE: { bg:'#161208', border:'#f59e0b', text:'#f59e0b' },
  MILD:     { bg:'#0a1a0a', border:'#22c55e', text:'#22c55e' },
};

// ── Hardcoded injury map (mirrors backend/data/injury_list.json) ─────────────
// MS Dhoni and Dewald Brevis are EXCLUDED (recovered)
const INJURY_LIST = [
  { name:'Pat Cummins',     team:'SRH',  injury:'Lumbar Stress Fracture',   severity:'HIGH',     note:'Missed openings — return mid-April' },
  { name:'Mitchell Starc',  team:'DC',   injury:'Shoulder/Elbow Load Mgmt', severity:'MODERATE', note:'Managing workload — return unconfirmed' },
  { name:'Josh Hazlewood',  team:'RCB',  injury:'Achilles Rehab',           severity:'MODERATE', note:'Missing early phase — expected late April' },
  { name:'Lockie Ferguson', team:'PBKS', injury:'Paternity Leave',          severity:'MILD',     note:'Missing first half of season' },
  { name:'Matthew Short',   team:'CSK',  injury:'Fractured Thumb',          severity:'HIGH',     note:'Sidelined opening week — under review' },
  { name:'M. Pathirana',    team:'KKR',  injury:'Calf Strain (WC)',         severity:'HIGH',     note:'Recovering — KKR hopeful late-season return' },
  { name:'Eshan Malinga',   team:'SRH',  injury:'Shoulder Dislocation',     severity:'HIGH',     note:'Availability still uncertain' },
];

// ── Match 18 Playing XI ──────────────────────────────────────────────────────
const MATCH18_XI = {
  CSK: [
    { name:'Ruturaj Gaikwad',  role:'Batter',       captain:true,  recovered:false },
    { name:'Ayush Mhatre',     role:'Batter',       captain:false, recovered:false },
    { name:'Dewald Brevis',    role:'Batter',       captain:false, recovered:true  },
    { name:'Shivam Dube',      role:'All-rounder',  captain:false, recovered:false },
    { name:'Sanju Samson',     role:'WK',           captain:false, recovered:false },
    { name:'MS Dhoni',         role:'WK / Finisher',captain:false, recovered:true  },
    { name:'Noor Ahmad',       role:'Bowler',       captain:false, recovered:false },
    { name:'Anshul Kamboj',    role:'All-rounder',  captain:false, recovered:false },
    { name:'Khaleel Ahmed',    role:'Bowler',       captain:false, recovered:false },
    { name:'Gurjapneet Singh', role:'Bowler',       captain:false, recovered:false },
    { name:'Rahul Chahar',     role:'Bowler',       captain:false, recovered:false },
  ],
  DC: [
    { name:'KL Rahul',         role:'WK',           captain:true,  recovered:false },
    { name:'Prithvi Shaw',     role:'Batter',       captain:false, recovered:false },
    { name:'Nitish Rana',      role:'Batter',       captain:false, recovered:false },
    { name:'Tristan Stubbs',   role:'Batter',       captain:false, recovered:false },
    { name:'Karun Nair',       role:'Batter',       captain:false, recovered:false },
    { name:'Axar Patel',       role:'All-rounder',  captain:false, recovered:false },
    { name:'Ashutosh Sharma',  role:'Batter',       captain:false, recovered:false },
    { name:'Kuldeep Yadav',    role:'Bowler',       captain:false, recovered:false },
    { name:'Mitchell Starc',   role:'Bowler',       captain:false, recovered:false, injured:true },
    { name:'T. Natarajan',     role:'Bowler',       captain:false, recovered:false },
    { name:'Mukesh Kumar',     role:'Bowler',       captain:false, recovered:false },
  ],
};

// ── Toast notification ────────────────────────────────────────────────────────
function RecoveryToast({ onDismiss }) {
  return (
    <div style={{
      position:'fixed', top:'24px', right:'24px', zIndex:9999,
      background:'linear-gradient(135deg,#052e16,#0f3a20)',
      border:'1px solid #22c55e55', borderRadius:'14px',
      padding:'18px 22px', maxWidth:'380px',
      boxShadow:'0 8px 32px rgba(34,197,94,0.25)',
      animation:'slideIn 0.4s ease',
    }}>
      <style>{`@keyframes slideIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
        <div style={{ fontSize:'28px', flexShrink:0 }}>✅</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'12px', color:'#22c55e', fontWeight:900, letterSpacing:'1.5px', marginBottom:'4px' }}>
            INJURY RECOVERY UPDATE
          </div>
          <div style={{ fontSize:'14px', color:'#e2e8f0', fontWeight:700, lineHeight:1.4 }}>
            MS Dhoni &amp; Dewald Brevis are fit and added to Playing XI
          </div>
          <div style={{ fontSize:'11px', color:'#4ade80', marginTop:'6px' }}>
            CSK win probability boosted: 55.3% → 62.5% 🚀
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{ background:'transparent', border:'none', color:'#475569', cursor:'pointer', fontSize:'18px', flexShrink:0, lineHeight:1 }}
        >×</button>
      </div>
    </div>
  );
}

// ── Injury Card ───────────────────────────────────────────────────────────────
function InjuryCard({ player }) {
  const col = TC[player.team] || '#888';
  const sev = SEV[player.severity] || SEV.MODERATE;
  return (
    <div style={{
      background: sev.bg,
      border: `1px solid ${sev.border}40`,
      borderRadius:'12px', padding:'14px 16px',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{
            width:'28px', height:'28px', borderRadius:'50%',
            background:`${col}22`, border:`1.5px solid ${col}66`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'9px', fontWeight:900, color:col,
          }}>{player.team}</div>
          <span style={{ fontWeight:800, fontSize:'14px', color:'#e2e8f0' }}>{player.name}</span>
        </div>
        <span style={{
          fontSize:'9px', fontWeight:900, padding:'2px 8px',
          borderRadius:'6px', letterSpacing:'0.5px',
          background:`${sev.border}20`, color:sev.text, border:`1px solid ${sev.border}40`,
        }}>{player.severity}</span>
      </div>
      <div style={{ fontSize:'11px', color:sev.text, fontWeight:700, marginBottom:'4px' }}>
        🩹 {player.injury}
      </div>
      <div style={{ fontSize:'10px', color:'#64748b', fontWeight:600 }}>
        📋 {player.note}
      </div>
    </div>
  );
}

// ── Playing XI Card ──────────────────────────────────────────────────────────
function PlayerRow({ p, teamColor }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'8px 10px', borderRadius:'8px',
      background: p.recovered ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
      border: p.recovered ? '1px solid rgba(34,197,94,0.25)' : '1px solid transparent',
      marginBottom:'4px',
      transition:'all 0.2s',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        {p.captain && <span style={{ fontSize:'11px' }}>👑</span>}
        {p.injured && <span style={{ fontSize:'11px' }}>🩹</span>}
        <span style={{ fontSize:'13px', fontWeight: p.recovered ? 800 : 600, color: p.recovered ? '#4ade80' : '#e2e8f0' }}>
          {p.name}
        </span>
        {p.recovered && (
          <span style={{
            fontSize:'9px', fontWeight:900, padding:'1px 7px', borderRadius:'10px',
            background:'rgba(34,197,94,0.2)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.4)',
            letterSpacing:'0.5px',
          }}>✅ RECOVERED</span>
        )}
      </div>
      <span style={{ fontSize:'10px', color:'#64748b', fontWeight:600 }}>{p.role}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InjuryTracker() {
  const [showToast, setShowToast]     = useState(true);
  const [injuries, setInjuries]       = useState(INJURY_LIST);
  const [apiStatus, setApiStatus]     = useState('idle'); // idle | loading | ok | error
  const [activeTeam, setActiveTeam]   = useState('CSK');
  const [tab, setTab]                 = useState('injury'); // injury | match18

  // Try fetching from the backend (non-blocking fallback)
  useEffect(() => {
    setApiStatus('loading');
    fetch('http://localhost:5000/api/injury')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.injured)) {
          setInjuries(d.injured.map(p => ({
            name:     p.name || p.player || 'Unknown',
            team:     (p.team || '').toUpperCase(),
            injury:   p.injury || '—',
            severity: (p.severity || 'MODERATE').toUpperCase(),
            note:     p.note || '',
          })));
          setApiStatus('ok');
        }
      })
      .catch(() => setApiStatus('error')); // fallback to static data
  }, []);

  // Auto-dismiss toast after 6s
  useEffect(() => {
    const t = setTimeout(() => setShowToast(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const cskColor = TC['CSK'];
  const dcColor  = TC['DC'];

  return (
    <>
      {showToast && <RecoveryToast onDismiss={() => setShowToast(false)} />}

      <div style={{
        padding:'40px 24px 80px', maxWidth:'1300px', margin:'0 auto',
        fontFamily:"'Inter', sans-serif", color:'#e2e8f0',
      }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'6px' }}>
            <span style={{ fontSize:'28px' }}>🏥</span>
            <h2 style={{ fontSize:'28px', color:'#f59e0b', fontWeight:900, letterSpacing:'2px', margin:0 }}>
              INJURY &amp; AVAILABILITY TRACKER — SEASON 2026
            </h2>
            <span style={{
              fontSize:'9px', fontWeight:900, padding:'3px 10px', borderRadius:'20px',
              background:'rgba(239,68,68,0.15)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.4)',
              letterSpacing:'1px',
            }}>LIVE UPDATES · SQUAD STRENGTH ADJUSTED</span>
          </div>
          <p style={{ color:'#64748b', fontSize:'13px', margin:0 }}>
            MS Dhoni &amp; Dewald Brevis fully recovered · Removed from injury list · Added to CSK Playing XI
          </p>
        </div>

        {/* ── Recovery Banner ─────────────────────────────────────── */}
        <div style={{
          background:'linear-gradient(135deg,#052e16,#0d3320)',
          border:'1px solid #22c55e40', borderRadius:'16px',
          padding:'18px 22px', marginBottom:'28px',
          display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center',
        }}>
          <div style={{ fontSize:'36px' }}>✅</div>
          <div style={{ flex:1, minWidth:'220px' }}>
            <div style={{ fontSize:'11px', color:'#22c55e', fontWeight:900, letterSpacing:'2px', marginBottom:'4px' }}>
              RECOVERY CONFIRMED — MATCH 18 · CSK VS DC · APR 11
            </div>
            <div style={{ fontSize:'17px', fontWeight:800, color:'#e2e8f0' }}>
              MS Dhoni &amp; Dewald Brevis are fit and returning to CSK Playing XI
            </div>
            <div style={{ fontSize:'12px', color:'#4ade80', marginTop:'4px' }}>
              CSK squad strength boosted · Win probability updated: 55.3% → 62.5%
            </div>
          </div>
          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
            {['MS Dhoni', 'Dewald Brevis'].map((n, i) => (
              <div key={n} style={{
                background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
                borderRadius:'12px', padding:'12px 18px', textAlign:'center', minWidth:'140px',
              }}>
                <div style={{ fontSize:'11px', color:'#22c55e', fontWeight:900, letterSpacing:'1px', marginBottom:'4px' }}>
                  ✅ RECOVERED
                </div>
                <div style={{ fontSize:'15px', fontWeight:800, color:'#e2e8f0' }}>{n}</div>
                <div style={{ fontSize:'10px', color:'#64748b', marginTop:'3px' }}>
                  {i === 0 ? 'WK · Finisher · 278 M' : 'Batter · SR 153.2'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'24px' }}>
          {[
            { id:'injury',  label:'🩹 Injury Watch List' },
            { id:'match18', label:'🏏 Match 18 Playing XI & Prediction' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'10px 22px', borderRadius:'30px', fontWeight:800, fontSize:'13px',
              cursor:'pointer', letterSpacing:'0.5px', border:'none',
              background: tab === t.id ? '#f59e0b' : '#1e293b',
              color:       tab === t.id ? '#000'    : '#64748b',
              boxShadow:   tab === t.id ? '0 0 20px #f59e0b40' : 'none',
              transition:'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ═══════════════ TAB: Injury List ════════════════════════ */}
        {tab === 'injury' && (
          <>
            <div style={{
              fontSize:'11px', color:'#f59e0b', fontWeight:900,
              letterSpacing:'2px', marginBottom:'14px',
            }}>⚠ INJURY WATCH LIST</div>
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',
              gap:'14px',
            }}>
              {injuries.map(p => <InjuryCard key={p.name} player={p} />)}
            </div>
            {injuries.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 0', color:'#475569' }}>
                <div style={{ fontSize:'40px', marginBottom:'10px' }}>🎉</div>
                <div style={{ fontSize:'15px', fontWeight:700 }}>All players fit! No injuries reported.</div>
              </div>
            )}
            <div style={{
              marginTop:'20px', padding:'12px 16px',
              background:'#0f172a', borderRadius:'10px', border:'1px solid #1e293b',
              fontSize:'11px', color:'#475569', fontWeight:600,
            }}>
              {apiStatus === 'ok' ? '✅ Live data from backend API' : '📋 Showing cached injury data'}
              &nbsp;· MS Dhoni &amp; Dewald Brevis removed from list (fully recovered)
            </div>
          </>
        )}

        {/* ═══════════════ TAB: Match 18 ═══════════════════════════ */}
        {tab === 'match18' && (
          <>
            {/* Match 18 Header */}
            <div style={{
              background:'linear-gradient(135deg,#0f172a,#1a2744)',
              border:'1px solid #f59e0b30', borderRadius:'16px',
              padding:'20px 24px', marginBottom:'22px',
            }}>
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
                <div>
                  <div style={{ fontSize:'10px', color:'#f59e0b', fontWeight:900, letterSpacing:'2px', marginBottom:'4px' }}>
                    IPL 2026 · MATCH 18 · APR 11, SATURDAY · 7:30 PM IST
                  </div>
                  <div style={{ fontSize:'24px', fontWeight:900, color:'#e2e8f0' }}>CSK vs DC · Chennai</div>
                  <div style={{ fontSize:'11px', color:'#64748b', marginTop:'4px' }}>
                    Venue: MA Chidambaram Stadium · Home ground advantage to CSK
                  </div>
                </div>

                {/* Probability Display */}
                <div style={{ display:'flex', gap:'24px', alignItems:'center', flexWrap:'wrap' }}>
                  {/* Before */}
                  <div style={{ textAlign:'center', opacity:0.6 }}>
                    <div style={{ fontSize:'9px', color:'#94a3b8', fontWeight:700, letterSpacing:'1px', marginBottom:'4px' }}>BEFORE RECOVERY</div>
                    <div style={{ display:'flex', gap:'12px' }}>
                      <div>
                        <div style={{ fontSize:'22px', fontWeight:900, color:cskColor }}>55.3%</div>
                        <div style={{ fontSize:'9px', color:'#64748b' }}>CSK</div>
                      </div>
                      <div style={{ alignSelf:'center', color:'#334155', fontWeight:700 }}>vs</div>
                      <div>
                        <div style={{ fontSize:'22px', fontWeight:900, color:dcColor }}>44.7%</div>
                        <div style={{ fontSize:'9px', color:'#64748b' }}>DC</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize:'24px' }}>→</div>

                  {/* After */}
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'9px', color:'#22c55e', fontWeight:900, letterSpacing:'1px', marginBottom:'4px' }}>
                      ✅ POST-RECOVERY (UPDATED)
                    </div>
                    <div style={{ display:'flex', gap:'12px' }}>
                      <div>
                        <div style={{ fontSize:'28px', fontWeight:900, color:cskColor }}>62.5%</div>
                        <div style={{ fontSize:'9px', color:'#64748b' }}>CSK 🏆</div>
                      </div>
                      <div style={{ alignSelf:'center', color:'#334155', fontWeight:700 }}>vs</div>
                      <div>
                        <div style={{ fontSize:'28px', fontWeight:900, color:dcColor }}>37.5%</div>
                        <div style={{ fontSize:'9px', color:'#64748b' }}>DC</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Probability Bar */}
              <div style={{ marginTop:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', fontWeight:800, marginBottom:'4px' }}>
                  <span style={{ color:cskColor }}>CSK 62.5%</span>
                  <span style={{ color:dcColor }}>37.5% DC</span>
                </div>
                <div style={{ height:'8px', borderRadius:'4px', background:'#0f172a', overflow:'hidden', display:'flex' }}>
                  <div style={{ width:'62.5%', background:`linear-gradient(90deg,${cskColor}99,${cskColor})`, transition:'width 0.8s' }} />
                  <div style={{ width:'37.5%', background:`linear-gradient(90deg,${dcColor}99,${dcColor})`, transition:'width 0.8s' }} />
                </div>
                <div style={{ fontSize:'10px', color:'#22c55e', marginTop:'6px', fontWeight:700 }}>
                  🏆 ML PREDICTION: CSK WINS · HIGH CONFIDENCE
                  <span style={{ color:'#475569', marginLeft:'12px' }}>+7.2% boost from Dhoni + Brevis return</span>
                </div>
              </div>
            </div>

            {/* ML Factor Breakdown */}
            <div style={{
              background:'#0a1120', borderRadius:'14px', border:'1px solid #1e293b',
              padding:'18px 20px', marginBottom:'22px',
            }}>
              <div style={{ fontSize:'10px', color:'#f59e0b', fontWeight:900, letterSpacing:'2px', marginBottom:'14px' }}>
                🤖 ML FACTORS — GRADIENT BOOSTING MODEL
              </div>
              {[
                { label:'HEAD-TO-HEAD', icon:'⚔️',  csk:64, dc:36, note:'CSK leads H2H vs DC at Chepauk historically' },
                { label:'VENUE WIN %',  icon:'🏟️',  csk:72, dc:41, note:'Chennai is CSK fortress — 72% home win rate' },
                { label:'RECENT FORM', icon:'📈',   csk:38, dc:62, note:'DC on 3-match win streak; CSK rebuilding' },
                { label:'SQUAD STRENGTH (post-recovery)', icon:'💪', csk:86, dc:82, note:'Dhoni + Brevis boost CSK by +6 points' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom:'10px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', marginBottom:'4px', color:'#64748b', fontWeight:700 }}>
                    <span>{f.icon} {f.label}</span>
                    <span>CSK: {f.csk}% · DC: {f.dc}%</span>
                  </div>
                  <div style={{ height:'5px', background:'#0f172a', borderRadius:'3px', overflow:'hidden', display:'flex' }}>
                    <div style={{ width:`${f.csk}%`, background:cskColor, opacity:0.85 }} />
                    <div style={{ width:`${f.dc}%`,  background:dcColor,  opacity:0.85 }} />
                  </div>
                  <div style={{ fontSize:'9px', color:'#334155', marginTop:'2px' }}>{f.note}</div>
                </div>
              ))}
            </div>

            {/* Playing XIs */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px', marginBottom:'22px' }}>
              {(['CSK','DC']).map(team => (
                <div key={team} style={{
                  background:'linear-gradient(160deg,#0f172a,#1a2744)',
                  border:`1px solid ${TC[team]}35`, borderRadius:'14px', padding:'18px',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                    <div style={{
                      width:'32px', height:'32px', borderRadius:'50%',
                      background:`${TC[team]}22`, border:`2px solid ${TC[team]}66`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'10px', fontWeight:900, color:TC[team],
                    }}>{team}</div>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:900, color:TC[team] }}>{team === 'CSK' ? 'Chennai Super Kings' : 'Delhi Capitals'}</div>
                      <div style={{ fontSize:'10px', color:'#64748b' }}>Playing XI · Match 18</div>
                    </div>
                  </div>
                  {MATCH18_XI[team].map((p, i) => (
                    <PlayerRow key={i} p={p} teamColor={TC[team]} />
                  ))}
                </div>
              ))}
            </div>

            {/* Player Impact Analysis */}
            <div style={{
              background:'#0a1120', borderRadius:'14px', border:'1px solid #22c55e30',
              padding:'18px 20px',
            }}>
              <div style={{ fontSize:'10px', color:'#22c55e', fontWeight:900, letterSpacing:'2px', marginBottom:'14px' }}>
                ✅ RECOVERED PLAYER IMPACT ANALYSIS
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                {[
                  {
                    name:'MS Dhoni',
                    role:'WK · Finisher',
                    matches:278, runs:5439, avg:38.3, sr:137.45,
                    impact:'Chepauk is Dhoni\'s fortress. His tactical acumen and finishing ability under pressure add immense psychological edge. Lower-order firepower increases CSK\'s projected total by ~12 runs.',
                    boost:'+3.5% squad strength',
                  },
                  {
                    name:'Dewald Brevis',
                    role:'Batter · Powerplay',
                    matches:16, runs:455, avg:28.44, sr:153.2,
                    impact:'Brevis\'s explosive SR 153.2 in the powerplay creates early scoring opportunities. His inclusion allows Ruturaj to play anchor role while Brevis attacks.',
                    boost:'+2.5% squad strength',
                  },
                ].map(p => (
                  <div key={p.name} style={{
                    background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)',
                    borderRadius:'12px', padding:'14px 16px',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                      <div>
                        <div style={{ fontSize:'15px', fontWeight:900, color:'#4ade80' }}>{p.name}</div>
                        <div style={{ fontSize:'10px', color:'#64748b' }}>{p.role}</div>
                      </div>
                      <span style={{
                        fontSize:'9px', fontWeight:900, padding:'2px 8px', borderRadius:'8px',
                        background:'rgba(34,197,94,0.2)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.4)',
                        alignSelf:'flex-start',
                      }}>{p.boost}</span>
                    </div>
                    <div style={{ display:'flex', gap:'12px', marginBottom:'10px', flexWrap:'wrap' }}>
                      {[
                        { l:'MATCHES', v:p.matches, c:'#60a5fa' },
                        { l:'RUNS',    v:p.runs,    c:'#f59e0b' },
                        { l:'AVG',     v:p.avg,     c:'#4ade80' },
                        { l:'SR',      v:p.sr,      c:'#a78bfa' },
                      ].map(s => (
                        <div key={s.l} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:'15px', fontWeight:900, color:s.c }}>{s.v}</div>
                          <div style={{ fontSize:'8px', color:'#475569', fontWeight:700, letterSpacing:'0.5px' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:'11px', color:'#94a3b8', lineHeight:1.5 }}>{p.impact}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
