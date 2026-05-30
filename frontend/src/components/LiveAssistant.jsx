/**
 * LiveAssistant.jsx — Real-time IPL 2026 AI Intelligence Panel
 * Features:
 *  - Live score display with in-play probability bars
 *  - Toss AI auto-detector (manual entry + SSE auto-update)
 *  - Recent results with ML accuracy tracking
 *  - Manual score injection form
 *  - SSE real-time connection to backend
 */
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Team assets ────────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  MI:'#004BA0', CSK:'#F9CD05', KKR:'#3A225D', RCB:'#EC1C24',
  DC:'#0078BC', RR:'#EA1A85', SRH:'#FB643C', GT:'#1C1C1C',
  PBKS:'#ED1B24', LSG:'#A72056',
};
const TEAM_LOGOS = {
  MI:'https://documents.iplt20.com/ipl/MI/Logos/Logooutline/MIoutline.png',
  CSK:'https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png',
  KKR:'https://documents.iplt20.com/ipl/KKR/Logos/Logooutline/KKRoutline.png',
  RCB:'https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png',
  DC:'https://documents.iplt20.com/ipl/DC/Logos/Logooutline/DCoutline.png',
  RR:'https://documents.iplt20.com/ipl/RR/Logos/Logooutline/RRoutline.png',
  SRH:'https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png',
  GT:'https://documents.iplt20.com/ipl/GT/Logos/Logooutline/GToutline.png',
  PBKS:'https://documents.iplt20.com/ipl/PBKS/Logos/Logooutline/PBKSoutline.png',
  LSG:'https://documents.iplt20.com/ipl/LSG/Logos/Logooutline/LSGoutline.png',
};
const ALL_TEAMS = ['MI','CSK','KKR','RCB','DC','RR','SRH','GT','PBKS','LSG'];
const VENUES = ['Mumbai','Chennai','Kolkata','Bengaluru','Delhi','Jaipur','Hyderabad',
  'Ahmedabad','Mullanpur','Lucknow','Guwahati','Dharamshala'];

export default function LiveAssistant() {
  const [liveData,   setLiveData]   = useState(null);
  const [connected,  setConnected]  = useState(false);
  const [log,        setLog]        = useState([]);
  const [activeTab,  setActiveTab]  = useState('live');   // live | toss | result | history
  const [tossForm,   setTossForm]   = useState({ matchNumber:'', team1:'', team2:'', venue:'', tossWinner:'', tossChoice:'' });
  const [resultForm, setResultForm] = useState({ matchNumber:'', team1:'', team2:'', venue:'', date:'', winner:'', margin:'', mlPredicted:'' });
  const [scoreForm,  setScoreForm]  = useState({ matchNumber:'', team1:'', team2:'', venue:'', score1:'', score2:'', overs1:'', overs2:'', target:'' });
  const [submitting, setSubmitting] = useState(false);
  const [lastMsg,    setLastMsg]    = useState('🤖 AI Assistant ready. Connecting to live server…');
  const [toast,      setToast]      = useState(null);
  const logRef = useRef(null);
  const sseRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const addLog = useCallback((msg, type='info') => {
    const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setLog(prev => [{ ts, msg, type }, ...prev.slice(0, 49)]);
  }, []);

  // ── SSE connection ───────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    try {
      const es = new EventSource('http://localhost:5000/api/live-intel/stream');
      sseRef.current = es;

      es.onopen = () => {
        setConnected(true);
        addLog('✅ Connected to live stream', 'success');
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'connected') { addLog(data.msg, 'success'); return; }
          if (data.type === 'toss') {
            setLastMsg(data.commentary || '🎲 Toss recorded!');
            addLog(`🎲 TOSS: ${data.winner} won, elected to ${data.choice}`, 'toss');
            setLiveData(prev => prev ? { ...prev, currentLive: { ...(prev.currentLive || {}), toss: { winner:data.winner, choice:data.choice } } } : prev);
          } else if (data.type === 'result') {
            addLog(`✅ RESULT: ${data.result?.winner} won Match ${data.result?.matchNumber}`, 'result');
            setLastMsg(`🏆 ${data.result?.winner} won! ${data.result?.margin || ''}`);
            fetch('http://localhost:5000/api/live-intel').then(r=>r.json()).then(setLiveData).catch(()=>{});
          } else if (data.type === 'live-score') {
            if (data.cleared) {
              setLiveData(prev => prev ? { ...prev, currentLive: null } : prev);
              addLog('🔴 Live match cleared', 'info');
              return;
            }
            addLog(`📡 SCORE: ${data.team1} ${data.score1} | ${data.team2} ${data.score2}`, 'live');
            if (data.commentary) setLastMsg(data.commentary);
            // Immediately update local live card
            setLiveData(prev => ({
              ...(prev || {}),
              currentLive: { ...(prev?.currentLive || {}), ...data },
            }));
          } else if (data.type === 'update') {
            // Full refresh — use it to update the entire dashboard state
            setLiveData(data);
            if (data.currentLive?.commentary) setLastMsg(data.currentLive.commentary);
            addLog(`🔄 Dashboard refreshed — ${data.stats?.totalCompleted || 0} matches done`, 'info');
          }
        } catch {}
      };

      es.onerror = () => {
        setConnected(false);
        addLog('⚠️ Stream disconnected — retrying in 15s…', 'warn');
        es.close();
        setTimeout(connectSSE, 15000);
      };
    } catch { setConnected(false); }
  }, [addLog]);

  // Fetch once on mount, then connect SSE
  useEffect(() => {
    fetch('http://localhost:5000/api/live-intel')
      .then(r => r.json())
      .then(d => { setLiveData(d); addLog('✅ Initial data loaded', 'success'); })
      .catch(() => addLog('⚠️ Backend offline — check localhost:5000', 'warn'));
    connectSSE();
    return () => sseRef.current?.close();
  }, [connectSSE, addLog]);

  // ── POST helpers ─────────────────────────────────────────────────────────────
  async function postToss(e) {
    e.preventDefault();
    if (!tossForm.tossWinner || !tossForm.tossChoice) return;
    setSubmitting(true);
    try {
      const r = await fetch('http://localhost:5000/api/live-intel/toss', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(tossForm),
      });
      const d = await r.json();
      if (d.success) {
        setLastMsg(d.commentary);
        addLog(`🎲 TOSS posted: ${d.winner} elected to ${d.choice}`, 'toss');
        setActiveTab('live');
      }
    } catch { addLog('❌ Toss POST failed', 'error'); }
    setSubmitting(false);
  }

  async function postResult(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch('http://localhost:5000/api/live-intel/result', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(resultForm),
      });
      const d = await r.json();
      if (d.success) {
        addLog(`✅ RESULT saved: ${d.result.winner} won M${d.result.matchNumber}`, 'result');
        fetch('http://localhost:5000/api/live-intel').then(r=>r.json()).then(setLiveData).catch(()=>{});
        setActiveTab('history');
      }
    } catch { addLog('❌ Result POST failed', 'error'); }
    setSubmitting(false);
  }

  async function postLiveScore(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch('http://localhost:5000/api/live-intel/live-score', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(scoreForm),
      });
      const d = await r.json();
      if (d.success) {
        setLastMsg(d.commentary || `📡 LIVE: ${scoreForm.team1} ${scoreForm.score1} | ${scoreForm.team2} ${scoreForm.score2}`);
        addLog(`📡 SCORE broadcast: ${scoreForm.team1} ${scoreForm.score1} | ${scoreForm.team2} ${scoreForm.score2}`, 'live');
        showToast(`✅ Score broadcast! ${scoreForm.team1} ${scoreForm.score1} vs ${scoreForm.team2} ${scoreForm.score2}`, 'success');
        // Immediately reflect in live card without waiting for SSE
        setLiveData(prev => ({
          ...(prev || {}),
          currentLive: {
            ...(prev?.currentLive || {}),
            matchNumber: scoreForm.matchNumber ? +scoreForm.matchNumber : prev?.currentLive?.matchNumber,
            team1: scoreForm.team1,
            team2: scoreForm.team2,
            venue: scoreForm.venue || prev?.currentLive?.venue,
            score1: scoreForm.score1,
            score2: scoreForm.score2,
            overs1: scoreForm.overs1,
            overs2: scoreForm.overs2,
            target: scoreForm.target,
            winProb: d.winProb,
            toss: d.toss || prev?.currentLive?.toss,
            isLive: true,
          },
        }));
        setActiveTab('live');
      } else {
        addLog(`❌ Score POST error: ${d.error}`, 'error');
        showToast('❌ Score update failed', 'error');
      }
    } catch (err) { addLog(`❌ Score POST failed: ${err.message}`, 'error'); showToast('❌ Network error', 'error'); }
    setSubmitting(false);
  }

  async function clearLive() {
    try {
      await fetch('http://localhost:5000/api/live-intel/clear-live', { method:'POST' });
      setLiveData(prev => prev ? { ...prev, currentLive: null } : prev);
      addLog('🔴 Live match card cleared', 'info');
      showToast('Live match cleared', 'info');
    } catch { addLog('❌ Clear failed', 'error'); }
  }

  // ── Shared styles ─────────────────────────────────────────────────────────────
  const card = { background:'#0f172a', borderRadius:'12px', border:'1px solid #1e293b', padding:'14px' };
  const inputStyle = { background:'#0a1120', border:'1px solid #334155', borderRadius:'8px', color:'#e2e8f0',
    padding:'8px 12px', fontSize:'12px', width:'100%', outline:'none' };
  const selectStyle = { ...inputStyle, cursor:'pointer' };
  const btnPrimary = (col='#3b82f6') => ({
    background:`linear-gradient(135deg,${col},${col}cc)`, color:'#fff', border:'none',
    borderRadius:'8px', padding:'10px 20px', fontWeight:800, fontSize:'12px',
    cursor:'pointer', width:'100%', marginTop:'8px', letterSpacing:'0.5px',
  });
  const logTypeColor = { info:'#64748b', success:'#22c55e', warn:'#f59e0b', error:'#ef4444', toss:'#a78bfa', live:'#38bdf8', result:'#4ade80' };

  const current = liveData?.currentLive;
  const completed = liveData?.completed || [];
  const stats = liveData?.stats || {};
  const liveMatchDisplay = current ? 1 : (liveData?.apiMatchCount || 0);

  return (
    <div style={{ fontFamily:"'Inter',sans-serif", color:'#e2e8f0', width:'100%', position:'relative' }}>

      {/* ── Toast notification ───────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position:'fixed', top:'20px', right:'20px', zIndex:9999,
          background: toast.type === 'success' ? '#052e16' : toast.type === 'error' ? '#1f0a0a' : '#0f172a',
          border: `1px solid ${toast.type === 'success' ? '#22c55e55' : toast.type === 'error' ? '#ef444455' : '#3b82f655'}`,
          color: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#60a5fa',
          borderRadius:'12px', padding:'12px 20px', fontSize:'13px', fontWeight:700,
          boxShadow:'0 8px 32px rgba(0,0,0,0.5)', maxWidth:'360px',
          animation:'slideIn 0.3s ease',
        }}>{toast.msg}</div>
      )}

      {/* ── Connection status bar ─────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px',
        padding:'8px 14px', background: connected ? '#052e16' : '#1f0a0a',
        border:`1px solid ${connected ? '#22c55e33' : '#ef444433'}`, borderRadius:'10px' }}>
        <span style={{ width:'8px', height:'8px', borderRadius:'50%',
          background: connected ? '#22c55e' : '#ef4444',
          boxShadow: connected ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
          animation: connected ? 'pulse 1.5s infinite' : 'none',
          flexShrink:0 }} />
        <span style={{ fontSize:'11px', fontWeight:700, color: connected ? '#22c55e' : '#ef4444' }}>
          {connected ? '🔴 LIVE — Connected to IPL Intelligence Stream' : '⚠️ DISCONNECTED — Reconnecting…'}
        </span>
        <span style={{ marginLeft:'auto', fontSize:'9px', color:'#475569' }}>
          {liveData?.lastUpdated ? new Date(liveData.lastUpdated).toLocaleTimeString('en-IN') : '—'}
        </span>
        <span style={{ fontSize:'9px', color:'#475569', background:'#1e293b', borderRadius:'4px', padding:'2px 6px' }}>
          {liveData?.liveProvider || liveData?.source || '—'}
        </span>
      </div>

      {/* ── AI Commentary ticker ──────────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#0a1628,#1a2040)', border:'1px solid #3b82f640',
        borderRadius:'10px', padding:'10px 14px', marginBottom:'12px',
        display:'flex', alignItems:'center', gap:'10px' }}>
        <span style={{ fontSize:'18px', flexShrink:0 }}>🤖</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'10px', color:'#3b82f6', fontWeight:800, letterSpacing:'1px', marginBottom:'2px' }}>
            AI ASSISTANT — LIVE COMMENTARY
          </div>
          <div style={{ fontSize:'12px', color:'#94a3b8', lineHeight:1.4 }}>{lastMsg}</div>
        </div>
        {stats.totalCompleted > 0 && (
          <div style={{ textAlign:'center', flexShrink:0, background:'#1e293b', borderRadius:'8px', padding:'6px 12px' }}>
            <div style={{ fontSize:'20px', fontWeight:900, color:'#22c55e' }}>{stats.accuracy}%</div>
            <div style={{ fontSize:'8px', color:'#64748b', fontWeight:700 }}>ML ACCURACY</div>
          </div>
        )}
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'12px' }}>
        {[
          { label:'COMPLETED', val: stats.totalCompleted || 0, col:'#3b82f6' },
          { label:'ML CORRECT', val: stats.correct || 0, col:'#22c55e' },
          { label:'ML ACCURACY', val: `${stats.accuracy || 0}%`, col:'#f59e0b' },
          { label:'LIVE MATCHES', val: liveMatchDisplay, col:'#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign:'center', padding:'10px' }}>
            <div style={{ fontSize:'22px', fontWeight:900, color:s.col }}>{s.val}</div>
            <div style={{ fontSize:'8px', color:'#475569', fontWeight:700, letterSpacing:'1px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Currently LIVE match card ─────────────────────────────────────── */}
      {current && (
        <div style={{ marginBottom:'12px', background:'linear-gradient(160deg,#1a0a08,#0f172a)',
          border:'1px solid #fb923c55', borderRadius:'14px', padding:'16px',
          boxShadow:'0 0 30px #fb923c20' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
            <span style={{ background:'#ef4444', borderRadius:'50%', width:'8px', height:'8px',
              boxShadow:'0 0 10px #ef4444', animation:'pulse 1s infinite', flexShrink:0 }} />
            <span style={{ fontSize:'11px', fontWeight:800, color:'#fb923c', letterSpacing:'2px' }}>
              MATCH {current.matchNumber} · LIVE NOW · {current.venue}
            </span>
            <span style={{ marginLeft:'auto', fontSize:'10px', color:'#64748b' }}>{current.status}</span>
          </div>

          {/* Teams + scores */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'12px', alignItems:'center' }}>
            {[current.team1, current.team2].map((team, i) => {
              const prob = current.winProb?.[team] || 50;
              const score = i === 0 ? current.score1 : current.score2;
              const overs = i === 0 ? current.overs1 : current.overs2;
              const col = TEAM_COLORS[team] || '#888';
              return (
                <div key={team} style={{ textAlign: i === 0 ? 'left' : 'right' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent: i === 0 ? 'flex-start' : 'flex-end' }}>
                    <img src={TEAM_LOGOS[team]} alt={team} style={{ width:'36px', height:'36px', borderRadius:'50%', border:`2px solid ${col}`, objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                    <div>
                      <div style={{ fontSize:'18px', fontWeight:900, color:col }}>{team}</div>
                      {score && <div style={{ fontSize:'16px', fontWeight:800, color:'#e2e8f0' }}>{score}{overs ? ` (${overs})` : ''}</div>}
                    </div>
                  </div>
                  {current.target && i===1 && <div style={{ fontSize:'9px', color:'#64748b', marginTop:'2px' }}>Target: {current.target}</div>}
                  <div style={{ marginTop:'6px', fontSize:'11px', fontWeight:700, color: prob >= 55 ? '#22c55e' : '#f59e0b' }}>
                    {prob}% WIN PROB
                  </div>
                </div>
              );
            })}
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'15px', color:'#475569', fontWeight:800 }}>VS</div>
              {current.toss && (
                <div style={{ marginTop:'4px', fontSize:'9px', color:'#a78bfa', background:'#2d1b69', borderRadius:'5px', padding:'3px 6px' }}>
                  🎲 {current.toss.winner} {current.toss.choice === 'field' ? 'Fields' : 'Bats'}
                </div>
              )}
            </div>
          </div>

          {/* Win probability bar */}
          {current.winProb && (() => {
            const p1 = current.winProb[current.team1] || 50;
            const p2 = 100 - p1;
            return (
              <div style={{ marginTop:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#64748b', marginBottom:'4px' }}>
                  <span style={{ color:TEAM_COLORS[current.team1], fontWeight:800 }}>{current.team1} {p1}%</span>
                  <span style={{ color:TEAM_COLORS[current.team2], fontWeight:800 }}>{p2}% {current.team2}</span>
                </div>
                <div style={{ height:'8px', borderRadius:'4px', background:'#1e293b', overflow:'hidden', display:'flex' }}>
                  <div style={{ width:`${p1}%`, background:`linear-gradient(90deg,${TEAM_COLORS[current.team1]},${TEAM_COLORS[current.team1]}aa)`, transition:'width 0.6s' }} />
                  <div style={{ flex:1, background:`linear-gradient(90deg,${TEAM_COLORS[current.team2]}aa,${TEAM_COLORS[current.team2]})` }} />
                </div>
              </div>
            );
          })()}
          {/* Clear live button */}
          <div style={{ marginTop:'12px', display:'flex', gap:'8px' }}>
            <button onClick={clearLive} style={{
              flex:1, padding:'8px 12px', borderRadius:'8px', border:'1px solid #ef444430',
              background:'#1f0a0a', color:'#ef4444', cursor:'pointer',
              fontSize:'11px', fontWeight:700,
            }}>🔴 End Match / Clear Live</button>
          </div>
        </div>
      )}

      {/* ── Tab navigation ───────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'12px' }}>
        {[
          { id:'live',    label:'📡 Live Score' },
          { id:'toss',    label:'🎲 Toss Update' },
          { id:'result',  label:'✅ Add Result' },
          { id:'history', label:'📊 History' },
          { id:'log',     label:'💬 Log' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, padding:'8px 6px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'10px', fontWeight:700,
            background: activeTab === tab.id ? '#3b82f6' : '#1e293b',
            color:       activeTab === tab.id ? '#fff'    : '#64748b',
            transition:  'all 0.2s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── TAB: Live Score update ────────────────────────────────────────── */}
      {activeTab === 'live' && (
        <form onSubmit={postLiveScore} style={{ ...card, display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontSize:'11px', color:'#38bdf8', fontWeight:800, letterSpacing:'1px', marginBottom:'4px' }}>📡 UPDATE LIVE SCORE</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>MATCH #</label>
              <input style={inputStyle} type="number" placeholder="7" value={scoreForm.matchNumber} onChange={e=>setScoreForm(f=>({...f,matchNumber:e.target.value}))} required /></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>TEAM 1</label>
              <select style={selectStyle} value={scoreForm.team1} onChange={e=>setScoreForm(f=>({...f,team1:e.target.value}))} required>
                <option value="">--</option>{ALL_TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>TEAM 2</label>
              <select style={selectStyle} value={scoreForm.team2} onChange={e=>setScoreForm(f=>({...f,team2:e.target.value}))} required>
                <option value="">--</option>{ALL_TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>VENUE</label>
              <select style={selectStyle} value={scoreForm.venue} onChange={e=>setScoreForm(f=>({...f,venue:e.target.value}))}>
                <option value="">--</option>{VENUES.map(v=><option key={v}>{v}</option>)}</select></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>TARGET (if 2nd inn)</label>
              <input style={inputStyle} placeholder="170" value={scoreForm.target} onChange={e=>setScoreForm(f=>({...f,target:e.target.value}))} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px' }}>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>T1 SCORE</label>
              <input style={inputStyle} placeholder="152/4" value={scoreForm.score1} onChange={e=>setScoreForm(f=>({...f,score1:e.target.value}))} /></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>T1 OVERS</label>
              <input style={inputStyle} placeholder="18.3" value={scoreForm.overs1} onChange={e=>setScoreForm(f=>({...f,overs1:e.target.value}))} /></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>T2 SCORE</label>
              <input style={inputStyle} placeholder="98/6" value={scoreForm.score2} onChange={e=>setScoreForm(f=>({...f,score2:e.target.value}))} /></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>T2 OVERS</label>
              <input style={inputStyle} placeholder="12.0" value={scoreForm.overs2} onChange={e=>setScoreForm(f=>({...f,overs2:e.target.value}))} /></div>
          </div>
          <button type="submit" disabled={submitting} style={btnPrimary('#0ea5e9')}>
            {submitting ? '📡 Updating…' : '📡 BROADCAST LIVE SCORE UPDATE'}
          </button>
        </form>
      )}

      {/* ── TAB: Toss update ─────────────────────────────────────────────── */}
      {activeTab === 'toss' && (
        <form onSubmit={postToss} style={{ ...card, display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontSize:'11px', color:'#a78bfa', fontWeight:800, letterSpacing:'1px', marginBottom:'4px' }}>🎲 RECORD TOSS — AI WILL AUTO-UPDATE WIN PROBABILITY</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>MATCH #</label>
              <input style={inputStyle} type="number" placeholder="7" value={tossForm.matchNumber} onChange={e=>setTossForm(f=>({...f,matchNumber:e.target.value}))} /></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>TEAM 1</label>
              <select style={selectStyle} value={tossForm.team1} onChange={e=>setTossForm(f=>({...f,team1:e.target.value,tossWinner:e.target.value}))}>
                <option value="">--</option>{ALL_TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>TEAM 2</label>
              <select style={selectStyle} value={tossForm.team2} onChange={e=>setTossForm(f=>({...f,team2:e.target.value}))}>
                <option value="">--</option>{ALL_TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>VENUE</label>
            <select style={selectStyle} value={tossForm.venue} onChange={e=>setTossForm(f=>({...f,venue:e.target.value}))}>
              <option value="">--</option>{VENUES.map(v=><option key={v}>{v}</option>)}</select></div>
          <div style={{ fontSize:'10px', color:'#64748b', fontWeight:700, marginTop:'4px' }}>TOSS WINNER:</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {[tossForm.team1, tossForm.team2].filter(Boolean).map(team => (
              <button type="button" key={team} onClick={() => setTossForm(f=>({...f,tossWinner:team}))} style={{
                padding:'10px', borderRadius:'8px', cursor:'pointer', fontWeight:800, fontSize:'12px',
                background: tossForm.tossWinner === team ? `${TEAM_COLORS[team]}33` : '#1e293b',
                color: tossForm.tossWinner === team ? TEAM_COLORS[team] : '#64748b',
                border: `1px solid ${tossForm.tossWinner === team ? TEAM_COLORS[team] : '#334155'}`,
              }}>{team} WINS TOSS</button>
            ))}
          </div>
          <div style={{ fontSize:'10px', color:'#64748b', fontWeight:700, marginTop:'4px' }}>TOSS CHOICE:</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {[{ val:'bat', label:'🏏 BATS FIRST' }, { val:'field', label:'🎯 FIELDS (CHASES)' }].map(opt => (
              <button type="button" key={opt.val} onClick={() => setTossForm(f=>({...f,tossChoice:opt.val}))} style={{
                padding:'10px', borderRadius:'8px', cursor:'pointer', fontWeight:800, fontSize:'12px',
                background: tossForm.tossChoice === opt.val ? '#1a2f1a' : '#1e293b',
                color:       tossForm.tossChoice === opt.val ? '#22c55e' : '#64748b',
                border:`1px solid ${tossForm.tossChoice === opt.val ? '#22c55e' : '#334155'}`,
              }}>{opt.label}</button>
            ))}
          </div>
          <button type="submit" disabled={submitting || !tossForm.tossWinner || !tossForm.tossChoice} style={btnPrimary('#7c3aed')}>
            {submitting ? '🎲 Recording…' : '🎲 RECORD TOSS & UPDATE ALL PREDICTIONS'}
          </button>
        </form>
      )}

      {/* ── TAB: Add Result ───────────────────────────────────────────────── */}
      {activeTab === 'result' && (
        <form onSubmit={postResult} style={{ ...card, display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontSize:'11px', color:'#22c55e', fontWeight:800, letterSpacing:'1px', marginBottom:'4px' }}>✅ INJECT MATCH RESULT</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>MATCH #</label>
              <input style={inputStyle} type="number" placeholder="7" value={resultForm.matchNumber} onChange={e=>setResultForm(f=>({...f,matchNumber:+e.target.value}))} required /></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>TEAM 1</label>
              <select style={selectStyle} value={resultForm.team1} onChange={e=>setResultForm(f=>({...f,team1:e.target.value}))}>
                <option value="">--</option>{ALL_TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>TEAM 2</label>
              <select style={selectStyle} value={resultForm.team2} onChange={e=>setResultForm(f=>({...f,team2:e.target.value}))}>
                <option value="">--</option>{ALL_TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>VENUE</label>
              <select style={selectStyle} value={resultForm.venue} onChange={e=>setResultForm(f=>({...f,venue:e.target.value}))}>
                <option value="">--</option>{VENUES.map(v=><option key={v}>{v}</option>)}</select></div>
            <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>DATE (e.g. Apr 03)</label>
              <input style={inputStyle} placeholder="Apr 03" value={resultForm.date} onChange={e=>setResultForm(f=>({...f,date:e.target.value}))} /></div>
          </div>
          <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>WINNER</label>
            <select style={selectStyle} value={resultForm.winner} onChange={e=>setResultForm(f=>({...f,winner:e.target.value}))} required>
              <option value="">-- Select Winner --</option>{ALL_TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>WIN MARGIN (optional)</label>
            <input style={inputStyle} placeholder="e.g. CSK won by 6 wickets" value={resultForm.margin} onChange={e=>setResultForm(f=>({...f,margin:e.target.value}))} /></div>
          <div><label style={{ fontSize:'9px', color:'#64748b', display:'block', marginBottom:'3px' }}>ML PREDICTED WINNER</label>
            <select style={selectStyle} value={resultForm.mlPredicted} onChange={e=>setResultForm(f=>({...f,mlPredicted:e.target.value}))}>
              <option value="">-- Select --</option>{ALL_TEAMS.map(t=><option key={t}>{t}</option>)}</select></div>
          <button type="submit" disabled={submitting} style={btnPrimary('#22c55e')}>
            {submitting ? '✅ Saving…' : '✅ SAVE RESULT & UPDATE LEADERBOARD'}
          </button>
        </form>
      )}

      {/* ── TAB: History ─────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={card}>
          <div style={{ fontSize:'11px', color:'#f59e0b', fontWeight:800, letterSpacing:'1px', marginBottom:'12px' }}>
            📊 MATCH HISTORY (MOST RECENT FIRST)
          </div>
          {completed.length === 0 && <div style={{ color:'#475569', fontSize:'12px' }}>No results yet.</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {completed.map(m => (
              <div key={m.matchNumber} style={{ display:'flex', alignItems:'center', gap:'10px',
                background:'#0a1120', borderRadius:'8px', padding:'10px 12px',
                border:`1px solid ${m.mlCorrect ? '#22c55e22' : '#ef444422'}` }}>
                <span style={{ fontSize:'11px', color:'#475569', fontWeight:700, minWidth:'28px' }}>M{m.matchNumber}</span>
                <img src={TEAM_LOGOS[m.winner]} alt={m.winner} style={{ width:'22px', height:'22px', borderRadius:'50%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'12px', fontWeight:800, color:TEAM_COLORS[m.winner] || '#e2e8f0' }}>{m.matchup}</div>
                  <div style={{ fontSize:'10px', color:'#64748b' }}>{m.margin}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'9px', fontWeight:800,
                    color: m.mlCorrect ? '#22c55e' : '#ef4444',
                    background: m.mlCorrect ? '#22c55e15' : '#ef444415',
                    border: `1px solid ${m.mlCorrect ? '#22c55e33' : '#ef444433'}`,
                    borderRadius:'4px', padding:'2px 6px' }}>
                    {m.mlCorrect ? '✅ CORRECT' : '❌ WRONG'}
                  </div>
                  <div style={{ fontSize:'8px', color:'#475569', marginTop:'2px' }}>ML: {m.mlPredicted}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Activity Log ────────────────────────────────────────────── */}
      {activeTab === 'log' && (
        <div ref={logRef} style={{ ...card, maxHeight:'300px', overflowY:'auto' }}>
          <div style={{ fontSize:'11px', color:'#64748b', fontWeight:800, letterSpacing:'1px', marginBottom:'8px' }}>💬 ACTIVITY LOG</div>
          {log.length === 0 && <div style={{ color:'#334155', fontSize:'12px' }}>No activity yet.</div>}
          {log.map((l, i) => (
            <div key={i} style={{ fontSize:'11px', color: logTypeColor[l.type] || '#64748b',
              borderBottom:'1px solid #0a1120', padding:'3px 0', display:'flex', gap:'8px' }}>
              <span style={{ color:'#334155', fontFamily:'monospace', flexShrink:0 }}>{l.ts}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        input:focus, select:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px #3b82f620; }
      `}</style>
    </div>
  );
}
