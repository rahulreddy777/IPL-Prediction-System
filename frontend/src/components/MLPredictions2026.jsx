import React, { useState, useEffect, useCallback } from 'react';

const TEAM_COLORS = {
  CSK: '#F9CD05', MI: '#1E90FF', KKR: '#7B2FBE', RR: '#EA1A85',
  RCB: '#D4101A', DC: '#0057A8', SRH: '#F26522', GT: '#00B4D8',
  PBKS: '#DD1F2D', LSG: '#00BFFF'
};

const TEAM_LOGOS = {
  CSK: '/teams/csk.jpg', MI: '/teams/mi.jpg', KKR: '/teams/kkr.jpg',
  RR: '/teams/rr.jpg', RCB: '/teams/rcb.jpg', DC: '/teams/dc.jpg',
  SRH: '/teams/srh.jpg', GT: '/teams/gt.jpg', PBKS: '/teams/pbks.jpg',
  LSG: '/teams/lsg.jpg'
};

const TEAM_FULL_NAMES = {
  CSK: 'Chennai Super Kings', MI: 'Mumbai Indians', KKR: 'Kolkata Knight Riders',
  RR: 'Rajasthan Royals', RCB: 'Royal Challengers Bengaluru', DC: 'Delhi Capitals',
  SRH: 'Sunrisers Hyderabad', GT: 'Gujarat Titans', PBKS: 'Punjab Kings',
  LSG: 'Lucknow Super Giants'
};

// ── Probability Bar ─────────────────────────────────────────────────────────
const ProbBar = ({ t1, t2, p1, p2, c1, c2 }) => (
  <div style={{ margin: '8px 0 4px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, marginBottom: '3px' }}>
      <span style={{ color: c1 }}>{t1} {Math.round(p1)}%</span>
      <span style={{ color: c2 }}>{Math.round(p2)}% {t2}</span>
    </div>
    <div style={{ height: '6px', borderRadius: '3px', background: '#0f172a', overflow: 'hidden', display: 'flex' }}>
      <div style={{ width: `${p1}%`, background: `linear-gradient(90deg,${c1}99,${c1})`, borderRadius: '3px 0 0 3px', transition: 'width 0.8s ease' }} />
      <div style={{ width: `${p2}%`, background: `linear-gradient(90deg,${c2}99,${c2})`, borderRadius: '0 3px 3px 0', transition: 'width 0.8s ease' }} />
    </div>
  </div>
);

// ── Match Card ──────────────────────────────────────────────────────────────
const MLMatchCard = ({ pred, index }) => {
  const [expanded, setExpanded] = useState(false);

  const t1 = pred.team1;
  const t2 = pred.team2;
  const matchId = pred.match_id;
  const winner = pred.predicted_winner;
  const winProb = pred.win_probability || {};
  const p1 = winProb[t1] ?? 50;
  const p2 = winProb[t2] ?? 50;
  const confidence = pred.confidence ?? Math.abs(p1 - 50);
  const c1 = TEAM_COLORS[t1] || '#888';
  const c2 = TEAM_COLORS[t2] || '#888';
  const wColor = TEAM_COLORS[winner] || '#f59e0b';
  const isT1Winner = winner === t1;

  const confLevel = confidence >= 30 ? 'HIGH' : confidence >= 15 ? 'MEDIUM' : 'LOW';
  const confColor = confidence >= 30 ? '#22c55e' : confidence >= 15 ? '#f59e0b' : '#94a3b8';

  // ML factor values from MongoDB
  const factors = [
    {
      label: 'RECENT FORM (5 games)', icon: '📈',
      v1: pred.recent_form_t1 ?? 0.5,
      v2: pred.recent_form_t2 ?? 0.5,
    },
    {
      label: `VENUE WIN % (${pred.venue || 'Venue'})`, icon: '🏟️',
      v1: pred.venue_pct_t1 ?? 0.5,
      v2: pred.venue_pct_t2 ?? 0.5,
    },
    {
      label: 'HEAD-TO-HEAD WIN %', icon: '⚔️',
      v1: pred.h2h_pct_t1 ?? 0.5,
      v2: pred.h2h_pct_t2 ?? 0.5,
    },
    {
      label: 'TOSS ADVANTAGE', icon: '🎲',
      v1: pred.toss_winner_is_t1 ?? 0.5,
      v2: 1 - (pred.toss_winner_is_t1 ?? 0.5),
    },
  ];

  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1a2744 100%)',
        border: `1px solid ${wColor}35`,
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: `0 4px 16px ${wColor}15`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 32px ${wColor}35`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 16px ${wColor}15`; }}
      onClick={() => setExpanded(x => !x)}
    >
      {/* Card Header */}
      <div style={{
        background: `linear-gradient(90deg,${c1}15,transparent 40%,transparent 60%,${c2}15)`,
        borderBottom: '1px solid #1e293b',
        padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, letterSpacing: '1px' }}>
            MATCH {matchId}
          </span>
          {pred.date && (
            <span style={{ fontSize: '8px', color: '#475569', fontWeight: 700 }}>
              · {pred.day} {pred.date}
            </span>
          )}
          <span style={{
            fontSize: '8px', fontWeight: 900, padding: '1px 6px',
            borderRadius: '4px', letterSpacing: '0.5px',
            background: `${confColor}20`, color: confColor, border: `1px solid ${confColor}40`
          }}>
            {confLevel} CONF
          </span>
        </div>
        <div style={{ fontSize: '8px', color: '#334155', fontWeight: 700 }}>
          {pred.venue && `📍 ${pred.venue}`}
        </div>
      </div>

      {/* Teams */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Team 1 */}
        <div style={{ flex: 1, textAlign: 'center', opacity: isT1Winner ? 1 : 0.55 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={TEAM_LOGOS[t1]} alt={t1}
              style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${isT1Winner ? c1 : '#334155'}`, boxShadow: isT1Winner ? `0 0 14px ${c1}55` : 'none' }}
              onError={e => { e.target.style.display = 'none'; }} />
            {isT1Winner && <div style={{ position: 'absolute', top: -4, right: -4, background: c1, borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>🏆</div>}
          </div>
          <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 900, color: c1 }}>{t1}</div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>{TEAM_FULL_NAMES[t1]?.split(' ').slice(-1)[0]}</div>
        </div>

        {/* Center */}
        <div style={{ textAlign: 'center', minWidth: '64px' }}>
          <div style={{ fontSize: '10px', color: '#475569', fontWeight: 800, letterSpacing: '2px', marginBottom: '4px' }}>VS</div>
          <div style={{ background: `linear-gradient(135deg, ${wColor}, ${wColor}99)`, color: '#fff', fontSize: '9px', fontWeight: 900, padding: '4px 8px', borderRadius: '10px', letterSpacing: '0.5px', boxShadow: `0 2px 10px ${wColor}50`, marginBottom: '4px' }}>
            {winner} WINS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: wColor }}>{Math.max(p1, p2).toFixed(1)}%</div>
          <div style={{ fontSize: '7px', color: '#475569', fontWeight: 700, letterSpacing: '1px' }}>CONFIDENCE</div>
        </div>

        {/* Team 2 */}
        <div style={{ flex: 1, textAlign: 'center', opacity: !isT1Winner ? 1 : 0.55 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={TEAM_LOGOS[t2]} alt={t2}
              style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${!isT1Winner ? c2 : '#334155'}`, boxShadow: !isT1Winner ? `0 0 14px ${c2}55` : 'none' }}
              onError={e => { e.target.style.display = 'none'; }} />
            {!isT1Winner && <div style={{ position: 'absolute', top: -4, right: -4, background: c2, borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>🏆</div>}
          </div>
          <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 900, color: c2 }}>{t2}</div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>{TEAM_FULL_NAMES[t2]?.split(' ').slice(-1)[0]}</div>
        </div>
      </div>

      {/* Win Probability Bar */}
      <div style={{ padding: '0 16px 8px' }}>
        <ProbBar t1={t1} t2={t2} p1={p1} p2={p2} c1={c1} c2={c2} />
      </div>

      {/* Expand Toggle */}
      <div style={{ textAlign: 'center', padding: '5px', color: '#334155', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', borderTop: '1px solid #1e293b' }}>
        {expanded ? '▲ LESS' : '▼ ML FACTORS'}
      </div>

      {/* Expanded ML Factors */}
      {expanded && (
        <div style={{ padding: '12px 16px 14px', borderTop: '1px solid #1e293b', background: '#060d1a' }}>
          <div style={{ fontSize: '8px', color: '#475569', fontWeight: 800, letterSpacing: '1.5px', marginBottom: '10px' }}>
            🤖 GRADIENT BOOSTING ML FACTORS
          </div>

          {factors.map(({ label, icon, v1, v2 }) => {
            const pct1 = Math.round(v1 * 100);
            const pct2 = Math.round(v2 * 100);
            return (
              <div key={label} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#475569', fontWeight: 700, marginBottom: '2px', letterSpacing: '0.5px' }}>
                  <span>{icon} {label}</span>
                  <span style={{ color: '#334155' }}>{t1}: {pct1}% · {t2}: {pct2}%</span>
                </div>
                <div style={{ height: '3px', background: '#0f172a', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${pct1}%`, background: c1, opacity: 0.85, transition: 'width 0.8s ease' }} />
                  <div style={{ width: `${pct2}%`, background: c2, opacity: 0.85, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: '10px', padding: '8px', background: '#0a1120', borderRadius: '8px', border: `1px solid ${wColor}20` }}>
            <div style={{ fontSize: '8px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>🏆 PREDICTION SUMMARY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={TEAM_LOGOS[winner]} alt={winner} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 900, color: wColor }}>{winner}</span>
                <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>
                  {Math.max(p1, p2).toFixed(1)}% win probability
                </span>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '8px', color: confColor, fontWeight: 800, background: `${confColor}15`, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${confColor}30` }}>
                {confLevel} · {confidence.toFixed(1)} pts
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Win Tally Bar Chart ─────────────────────────────────────────────────────
const WinTallyChart = ({ predictions }) => {
  const tally = {};
  predictions.forEach(p => {
    const w = p.predicted_winner;
    if (w) tally[w] = (tally[w] || 0) + 1;
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const maxWins = sorted[0]?.[1] || 1;

  return (
    <div style={{ padding: '16px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', marginBottom: '24px' }}>
      <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '2px', marginBottom: '14px' }}>
        🏆 ML WIN PROJECTIONS — ALL 70 LEAGUE MATCHES
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
        {sorted.map(([team, wins], i) => {
          const col = TEAM_COLORS[team] || '#888';
          const pct = Math.round((wins / maxWins) * 100);
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={team} style={{
              background: i < 3 ? `${col}12` : '#0a1120',
              border: `1px solid ${i < 3 ? col + '40' : '#1e293b'}`,
              borderRadius: '10px', padding: '10px 12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                <span style={{ fontSize: '14px' }}>{medals[i] || <span style={{ fontSize: '10px', color: '#475569', fontWeight: 800 }}>#{i + 1}</span>}</span>
                <img src={TEAM_LOGOS[team]} alt={team} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                <span style={{ fontSize: '13px', fontWeight: 900, color: col }}>{team}</span>
                <span style={{ marginLeft: 'auto', fontSize: '20px', fontWeight: 900, color: col }}>{wins}</span>
              </div>
              <div style={{ height: '4px', background: '#0a1120', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${col}80,${col})`, borderRadius: '2px', transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ fontSize: '8px', color: '#475569', marginTop: '3px', fontWeight: 600 }}>{wins} predicted wins of 70</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
export default function MLPredictions2026({ onClose }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [log, setLog] = useState('');
  const [progress, setProgress] = useState('');
  const [searchMatch, setSearchMatch] = useState('');
  const [showLog, setShowLog] = useState(false);

  // ── Check status on mount ─────────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ml2026/status`);
      const data = await res.json();
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  // ── Load predictions from MongoDB ─────────────────────────────────────────
  const loadPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ml2026/predictions`);
      const data = await res.json();
      if (data.success) {
        setPredictions(data.predictions || []);
      } else {
        setError(data.hint || data.error || 'Failed to load predictions');
      }
    } catch (err) {
      setError('Cannot reach backend. Make sure it is running on port 5000.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Run full ML pipeline ──────────────────────────────────────────────────
  const runPipeline = async () => {
    setRunning(true);
    setError(null);
    setLog('');
    setProgress('⏳ Connecting to MongoDB...');

    const steps = [
      '⏳ Connecting to MongoDB...',
      '📊 Loading ipl_history collections (2008–2025)...',
      '🧹 Cleaning & standardising team names...',
      '⚙️ Engineering features: H2H rates, form, venue %...',
      '🎯 Training GradientBoostingClassifier...',
      '🔍 Running GridSearchCV (5-fold CV)...',
      '📈 Evaluating model accuracy...',
      '🔮 Generating 2026 match predictions...',
      '💾 Saving to MongoDB ipl_prediction.match_predictions_2026...',
    ];

    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setProgress(steps[stepIdx]);
      }
    }, 8000);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ml2026/run-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      clearInterval(stepTimer);

      const data = await res.json();
      if (data.success) {
        setProgress(`✅ Pipeline complete! ${data.totalPredictions} predictions saved.`);
        setLog(data.log || '');
        // Reload predictions
        await loadPredictions();
        await checkStatus();
      } else {
        setError(data.error || 'Pipeline failed');
        setLog(data.details || '');
        setProgress('❌ Pipeline failed. Check log below.');
      }
    } catch (err) {
      clearInterval(stepTimer);
      setError('Request failed: ' + err.message);
      setProgress('❌ Request failed.');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    checkStatus().then(s => {
      if (s?.ready) loadPredictions();
    });
  }, [checkStatus, loadPredictions]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const teams = ['ALL', 'CSK', 'MI', 'KKR', 'RR', 'RCB', 'DC', 'SRH', 'GT', 'PBKS', 'LSG'];
  const filtered = predictions.filter(p => {
    const teamOk = filter === 'ALL' || p.team1 === filter || p.team2 === filter;
    const numOk = searchMatch === '' || String(p.match_id).includes(searchMatch);
    return teamOk && numOk;
  });

  const highConf = predictions.filter(p => (p.confidence ?? 0) >= 30).length;
  const avgConf = predictions.length > 0
    ? (predictions.reduce((s, p) => s + (p.confidence ?? 25), 0) / predictions.length).toFixed(1)
    : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent',
      padding: '28px 24px',
    }}>
      {/* ── Modal Header ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(90deg, #0a1628, #1a2744)',
        borderBottom: '2px solid #f59e0b40',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', gap: '16px',
        flexShrink: 0,
        borderRadius: '16px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '3px', marginBottom: '3px' }}>
            🤖 MACHINE LEARNING · GRADIENTBOOSTING CLASSIFIER
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#e2e8f0', letterSpacing: '1px' }}>
            IPL 2026 — ML PREDICTIONS
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
            Trained on IPL 2008–2025 · MongoDB → Feature Engineering → GridSearchCV → 70 Match Predictions
          </div>
        </div>

        {/* Stats badges */}
        {predictions.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#f59e0b' }}>{predictions.length}</div>
              <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>MATCHES</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#22c55e' }}>{avgConf}%</div>
              <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>AVG CONF</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#7c3aed' }}>{highConf}</div>
              <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>HIGH CONF</div>
            </div>
          </div>
        )}

        {/* Status badge */}
        {status?.ready && (
          <div style={{ fontSize: '9px', color: '#22c55e', background: '#052e16', border: '1px solid #22c55e33', borderRadius: '6px', padding: '4px 10px', fontWeight: 700 }}>
            ● {status.predictionsCount} PREDICTIONS READY
            {status.lastUpdated && <div style={{ color: '#16a34a', marginTop: '1px' }}>{new Date(status.lastUpdated).toLocaleDateString()}</div>}
          </div>
        )}

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: '#1e293b', border: '1px solid #334155',
              color: '#94a3b8', borderRadius: '10px',
              padding: '10px 18px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 800, letterSpacing: '1px',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            ✕ CLOSE
          </button>
        )}
      </div>

      {/* ── Scrollable Content ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* ── Pipeline Control Panel ────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(160deg, #0a1628, #111827)',
          border: '2px solid #f59e0b30',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '2px', marginBottom: '16px' }}>
            🔧 ML PIPELINE CONTROL — FULL DATA PIPELINE
          </div>

          {/* Pipeline Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginBottom: '20px' }}>
            {[
              { icon: '🗄️', step: '1. Load Data', desc: 'Pull all 10 MongoDB collections' },
              { icon: '🧹', step: '2. Clean Data', desc: 'Standardise names, drop no-results' },
              { icon: '⚙️', step: '3. Feature Eng.', desc: 'H2H rates, form, venue %, toss' },
              { icon: '🎯', step: '4. Train Model', desc: 'GradientBoostingClassifier' },
              { icon: '🔍', step: '5. GridSearchCV', desc: 'Hyperparameter tuning (5-fold)' },
              { icon: '🔮', step: '6. Predict 2026', desc: 'Generate 70 match predictions' },
              { icon: '💾', step: '7. Save to DB', desc: 'Write to ipl_prediction.match_predictions_2026' },
            ].map(({ icon, step, desc }) => (
              <div key={step} style={{ background: '#0a1120', borderRadius: '8px', padding: '8px 10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '14px', marginBottom: '3px' }}>{icon}</div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#e2e8f0' }}>{step}</div>
                <div style={{ fontSize: '8px', color: '#475569', marginTop: '2px' }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Progress */}
          {progress && (
            <div style={{
              background: running ? '#0a1628' : (progress.startsWith('✅') ? '#052e16' : '#1a0f0f'),
              border: `1px solid ${running ? '#3b82f640' : (progress.startsWith('✅') ? '#22c55e30' : '#ef444430')}`,
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '11px', fontWeight: 700,
              color: running ? '#60a5fa' : (progress.startsWith('✅') ? '#22c55e' : '#f87171'),
              marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {running && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1s infinite' }} />}
              {progress}
            </div>
          )}

          {/* Error */}
          {error && !running && (
            <div style={{ background: '#1a0f0f', border: '1px solid #ef444440', borderRadius: '8px', padding: '10px 14px', fontSize: '11px', color: '#f87171', marginBottom: '14px' }}>
              ❌ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={runPipeline}
              disabled={running}
              id="run-ml-pipeline-btn"
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                border: '2px solid #f59e0b',
                background: running ? '#1e293b' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: running ? '#f59e0b' : '#000',
                fontWeight: 900, fontSize: '13px', letterSpacing: '1px',
                cursor: running ? 'not-allowed' : 'pointer',
                boxShadow: running ? 'none' : '0 0 24px #f59e0b40',
                transition: 'all 0.2s, transform 0.1s',
                opacity: running ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
              onMouseEnter={e => { if (!running) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px #f59e0b60'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = running ? 'none' : '0 0 24px #f59e0b40'; }}
            >
              {running ? '⏳ RUNNING PIPELINE...' : '🚀 RUN FULL ML PIPELINE'}
            </button>

            <button
              onClick={loadPredictions}
              disabled={running || loading}
              id="load-predictions-btn"
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: '2px solid #3b82f6',
                background: 'linear-gradient(135deg, #3b82f622, #3b82f611)',
                color: '#3b82f6',
                fontWeight: 800, fontSize: '12px', letterSpacing: '1px',
                cursor: (running || loading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: (running || loading) ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!running && !loading) { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (!running && !loading) { e.currentTarget.style.background = 'linear-gradient(135deg,#3b82f622,#3b82f611)'; e.currentTarget.style.color = '#3b82f6'; } }}
            >
              {loading ? '⏳ LOADING...' : '📥 LOAD FROM MONGODB'}
            </button>

            {log && (
              <button
                onClick={() => setShowLog(x => !x)}
                style={{
                  padding: '12px 20px', borderRadius: '12px',
                  border: '1px solid #334155', background: '#1e293b',
                  color: '#64748b', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {showLog ? '🙈 HIDE LOG' : '📋 VIEW LOG'}
              </button>
            )}
          </div>

          {/* Python Log */}
          {showLog && log && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '9px', color: '#475569', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>📋 PYTHON PIPELINE LOG</div>
              <pre style={{
                background: '#020617', border: '1px solid #1e293b', borderRadius: '8px',
                padding: '12px', fontSize: '10px', color: '#4ade80',
                maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace',
                lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {log}
              </pre>
            </div>
          )}
        </div>

        {/* ── ✅ MATCH 18 RECOVERY ALERT BANNER ─────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #052e16, #0a3d22)',
          border: '1px solid #22c55e40',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Glow */}
          <div style={{ position:'absolute', top:0, right:0, width:'220px', height:'100%', background:'radial-gradient(ellipse at right, #22c55e15 0%, transparent 70%)', pointerEvents:'none' }} />

          <div style={{ display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center', position:'relative' }}>
            {/* Left: text */}
            <div style={{ flex:1, minWidth:'240px' }}>
              <div style={{ fontSize:'10px', color:'#22c55e', fontWeight:900, letterSpacing:'2.5px', marginBottom:'5px' }}>
                ✅ INJURY UPDATE · MATCH 18 · CSK vs DC · APR 11
              </div>
              <div style={{ fontSize:'17px', fontWeight:900, color:'#e2e8f0', marginBottom:'6px' }}>
                MS Dhoni &amp; Dewald Brevis — Fully Recovered, Back in Playing XI
              </div>
              <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
                {[
                  { label:'BEFORE RECOVERY', csk:'55.3%', dc:'44.7%', dim:true },
                  { label:'AFTER RECOVERY ✅', csk:'62.5%', dc:'37.5%', dim:false },
                ].map(s => (
                  <div key={s.label} style={{ opacity: s.dim ? 0.55 : 1 }}>
                    <div style={{ fontSize:'9px', color:'#64748b', fontWeight:700, letterSpacing:'1px', marginBottom:'3px' }}>{s.label}</div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <span style={{ fontSize:'15px', fontWeight:900, color:'#F9CD05' }}>{s.csk} CSK</span>
                      <span style={{ color:'#334155', fontSize:'11px' }}>vs</span>
                      <span style={{ fontSize:'15px', fontWeight:900, color:'#0057A8' }}>{s.dc} DC</span>
                    </div>
                  </div>
                ))}
                <div style={{ alignSelf:'center', fontSize:'12px', color:'#4ade80', fontWeight:800 }}>
                  +7.2% boost to CSK 🚀
                </div>
              </div>
            </div>

            {/* Right: recovered player badges */}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[
                { name:'MS Dhoni', role:'WK · Finisher', stat:'278 M · Avg 38.3 · SR 137', boost:'+3.5%' },
                { name:'Dewald Brevis', role:'Batter · Powerplay', stat:'16 M · SR 153.2 · Avg 28.4', boost:'+2.5%' },
              ].map(p => (
                <div key={p.name} style={{
                  background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)',
                  borderRadius:'12px', padding:'12px 16px', minWidth:'160px',
                }}>
                  <div style={{ fontSize:'10px', color:'#22c55e', fontWeight:900, letterSpacing:'1px', marginBottom:'2px' }}>✅ RECOVERED</div>
                  <div style={{ fontSize:'14px', fontWeight:900, color:'#e2e8f0', marginBottom:'2px' }}>{p.name}</div>
                  <div style={{ fontSize:'9px', color:'#64748b', marginBottom:'4px' }}>{p.role}</div>
                  <div style={{ fontSize:'9px', color:'#94a3b8' }}>{p.stat}</div>
                  <div style={{ fontSize:'9px', color:'#22c55e', fontWeight:800, marginTop:'4px' }}>Squad power {p.boost}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Playing XI Row */}
          <div style={{ marginTop:'16px', paddingTop:'14px', borderTop:'1px solid #22c55e20' }}>
            <div style={{ fontSize:'9px', color:'#475569', fontWeight:800, letterSpacing:'1.5px', marginBottom:'8px' }}>
              CSK PLAYING XI — MATCH 18 (CONFIRMED)
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {[
                { n:'Ruturaj Gaikwad', cap:true, rec:false },
                { n:'Ayush Mhatre', cap:false, rec:false },
                { n:'Dewald Brevis', cap:false, rec:true },
                { n:'Shivam Dube', cap:false, rec:false },
                { n:'Sanju Samson', cap:false, rec:false },
                { n:'MS Dhoni', cap:false, rec:true },
                { n:'Noor Ahmad', cap:false, rec:false },
                { n:'Anshul Kamboj', cap:false, rec:false },
                { n:'Khaleel Ahmed', cap:false, rec:false },
                { n:'Gurjapneet Singh', cap:false, rec:false },
                { n:'Rahul Chahar', cap:false, rec:false },
              ].map(p => (
                <span key={p.n} style={{
                  fontSize:'10px', fontWeight: p.rec ? 900 : 600,
                  padding:'3px 9px', borderRadius:'12px',
                  background: p.rec ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                  color: p.rec ? '#4ade80' : '#94a3b8',
                  border: p.rec ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {p.cap ? '👑 ' : ''}{p.n}{p.rec ? ' ✅' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Predictions section (only when loaded) */}
        {predictions.length > 0 && (
          <>
            {/* Win Tally */}
            <WinTallyChart predictions={predictions} />

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
              {teams.map(t => (
                <button key={t} onClick={() => setFilter(t)} style={{
                  padding: '7px 14px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                  background: filter === t ? (TEAM_COLORS[t] || '#f59e0b') : '#1e293b',
                  color: filter === t ? '#000' : '#94a3b8',
                  fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px',
                  transition: 'all 0.2s',
                  boxShadow: filter === t ? `0 3px 10px ${TEAM_COLORS[t] || '#f59e0b'}50` : 'none',
                }}>
                  {t === 'ALL' ? '🌐 All Matches' : t}
                </button>
              ))}

              <input
                type="number"
                placeholder="Match #"
                value={searchMatch}
                onChange={e => setSearchMatch(e.target.value)}
                min="1"
                style={{
                  marginLeft: 'auto',
                  padding: '7px 12px', borderRadius: '10px',
                  border: '1px solid #334155', background: '#1e293b',
                  color: '#e2e8f0', fontSize: '11px', fontWeight: 700,
                  width: '90px', outline: 'none',
                }}
              />
            </div>

            {/* Match count */}
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, letterSpacing: '1px', marginBottom: '18px' }}>
              SHOWING {filtered.length} OF {predictions.length} MATCHES · CLICK CARD FOR ML FACTOR BREAKDOWN
            </div>

            {/* Match Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filtered.map((pred, i) => (
                <MLMatchCard key={pred._id || pred.match_id || i} pred={pred} index={i} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>No matches found for this filter</div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '32px', padding: '16px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '1.5px', marginBottom: '6px' }}>
                🤖 GRADIENTBOOSTINGCLASSIFIER — GRIDSERCHCV TUNED · TRAINED ON IPL 2008–2025
              </div>
              <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600, marginBottom: '4px' }}>
                Features: Head-to-Head Win Rate · Recent Form (last 5) · Venue Win % · Toss Impact
              </div>
              <div style={{ fontSize: '9px', color: '#334155', fontWeight: 600 }}>
                Predictions stored in: ipl_prediction.match_predictions_2026 · Backend source: ipl_history
              </div>
            </div>
          </>
        )}

        {/* Empty state — pipeline not yet run */}
        {!loading && predictions.length === 0 && !running && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤖</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#e2e8f0', marginBottom: '8px' }}>
              ML Pipeline Not Yet Run
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
              Click <strong style={{ color: '#f59e0b' }}>🚀 RUN FULL ML PIPELINE</strong> above to train the
              GradientBoosting model on MongoDB IPL 2008–2025 data and generate predictions for all 70 matches.
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
              {['📊 Connect MongoDB', '🧹 Clean & Standardise', '⚙️ Engineer Features', '🎯 Train & Tune', '🔮 Predict 70 Matches', '💾 Save Results'].map(s => (
                <div key={s} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px 14px', fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#f59e0b' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚙️</div>
            <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '2px' }}>LOADING PREDICTIONS FROM MONGODB...</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
