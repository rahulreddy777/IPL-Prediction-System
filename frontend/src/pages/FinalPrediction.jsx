/**
 * FinalPrediction.jsx
 * IPL 2026 Final — RCB vs GT
 * Premium AI Match Intelligence Engine — Fully MongoDB-driven
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import axios from 'axios';
import TeamLogo from '../components/common/TeamLogo';
import './FinalPrediction.css';

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
);

const API = (import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`) + '/api/final-prediction/rcb-vs-gt';
const RCB_C = '#D4101A';
const GT_C  = '#1B6CA8';
const GOLD  = '#F59E0B';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const safe = (v, fb = 0) => (v != null && isFinite(v) ? v : fb);

function ProbBar({ label, v1, v2, c1 = RCB_C, c2 = GT_C, t1 = 'RCB', t2 = 'GT', unit = '' }) {
  const tot = (safe(v1) + safe(v2)) || 100;
  const p1 = Math.round((safe(v1) / tot) * 100);
  return (
    <div className="fp2-prob-row">
      <span style={{ color: c1, fontWeight: 800 }}>{t1} {v1}{unit}</span>
      {label && <span className="fp2-prob-label">{label}</span>}
      <span style={{ color: c2, fontWeight: 800 }}>{v2}{unit} {t2}</span>
      <div className="fp2-bar-track">
        <div style={{ width: `${p1}%`, background: `linear-gradient(90deg,${c1}cc,${c1})`, height: '100%', borderRadius: '4px 0 0 4px', transition: 'width 1s ease' }} />
        <div style={{ width: `${100 - p1}%`, background: `linear-gradient(90deg,${c2}88,${c2})`, height: '100%', borderRadius: '0 4px 4px 0', transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = GOLD, icon }) {
  return (
    <div className="fp2-stat-card">
      {icon && <div className="fp2-stat-icon">{icon}</div>}
      <div className="fp2-stat-label">{label}</div>
      <div className="fp2-stat-value" style={{ color }}>{value}</div>
      {sub && <div className="fp2-stat-sub">{sub}</div>}
    </div>
  );
}

function SectionHead({ icon, title, mod, badge }) {
  return (
    <div className="fp2-section-head">
      <div className="fp2-section-mod">MODULE {mod}</div>
      <div className="fp2-section-title">{icon} {title}</div>
      {badge && <div className="fp2-section-badge">{badge}</div>}
    </div>
  );
}

function MiniBar({ label, v, max = 100, color }) {
  return (
    <div className="fp2-mini-bar-row">
      <span className="fp2-mini-bar-label">{label}</span>
      <div className="fp2-mini-bar-track">
        <div className="fp2-mini-bar-fill" style={{ width: `${Math.round((safe(v) / max) * 100)}%`, background: color }} />
      </div>
      <span className="fp2-mini-bar-val">{v}</span>
    </div>
  );
}

/* ─── Radar Chart ─────────────────────────────────────────────────────────── */
function TeamRadar({ labels, d1, d2, t1 = 'RCB', t2 = 'GT', title }) {
  const data = {
    labels,
    datasets: [
      { label: t1, data: d1, backgroundColor: `${RCB_C}22`, borderColor: RCB_C, borderWidth: 2, pointBackgroundColor: RCB_C },
      { label: t2, data: d2, backgroundColor: `${GT_C}22`,  borderColor: GT_C,  borderWidth: 2, pointBackgroundColor: GT_C  },
    ],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
    scales: {
      r: {
        min: 0, max: 100,
        angleLines: { color: '#1e293b' },
        grid: { color: '#1e293b' },
        pointLabels: { color: '#64748b', font: { size: 9 } },
        ticks: { color: '#334155', backdropColor: 'transparent', stepSize: 25 },
      },
    },
  };
  return (
    <div className="fp2-radar-wrap">
      {title && <div className="fp2-radar-title">{title}</div>}
      <div style={{ height: 230 }}><Radar data={data} options={opts} /></div>
    </div>
  );
}

/* ─── Score Distribution ──────────────────────────────────────────────────── */
function DistChart({ dist = [] }) {
  const labels = dist.map(d => `${d.score}`);
  const vals   = dist.map(d => d.pct);
  const peak   = Math.max(...vals);
  const data = {
    labels,
    datasets: [{
      label: '% of simulations',
      data: vals,
      backgroundColor: vals.map(v => v === peak ? `${GOLD}cc` : `${GT_C}44`),
      borderColor: vals.map(v => v === peak ? GOLD : GT_C),
      borderWidth: 1, borderRadius: 3,
    }],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#475569', font: { size: 8 } }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#475569', font: { size: 8 } }, grid: { color: '#1e293b' } },
    },
  };
  return <div style={{ height: 180 }}><Bar data={data} options={opts} /></div>;
}

/* ─── Player Card ─────────────────────────────────────────────────────────── */
function PlayerCard({ p, teamColor, type = 'bat' }) {
  const roleMap = { bat: '🏏', bowl: '🎳', ar: '⚡' };
  const ri = p.formIndex || p.ppRating || 0;
  const riColor = ri >= 80 ? '#4ade80' : ri >= 65 ? GOLD : '#64748b';
  return (
    <div className="fp2-player-card" style={{ borderColor: `${teamColor}33` }}>
      <div className="fp2-player-card-top">
        <span className="fp2-player-role" style={{ background: `${teamColor}22`, color: teamColor }}>
          {type === 'bat' ? '🏏' : '🎳'} {type.toUpperCase()}
        </span>
        <span className="fp2-player-fi" style={{ color: riColor }}>{ri}</span>
      </div>
      <div className="fp2-player-name">{p.name}</div>
      {type === 'bat' ? (
        <>
          <MiniBar label="Form"     v={p.formIndex}     color={teamColor} />
          <MiniBar label="Pressure" v={p.pressureRating} color={teamColor} />
          <MiniBar label="Final"    v={p.finalRating}    color={teamColor} />
          <div className="fp2-player-stats-row">
            <span>{p.runs} Runs</span>
            <span>Avg {safe(p.average, 0).toFixed(1)}</span>
            <span>SR {safe(p.strikeRate, 0).toFixed(0)}</span>
          </div>
        </>
      ) : (
        <>
          <MiniBar label="Form"   v={p.formIndex}   color={teamColor} />
          <MiniBar label="PP"     v={p.ppRating}    color={teamColor} />
          <MiniBar label="Death"  v={p.deathRating} color={teamColor} />
          <div className="fp2-player-stats-row">
            <span>{p.wickets} Wkts</span>
            <span>Econ {safe(p.economy, 0).toFixed(2)}</span>
            <span>Avg {safe(p.average, 0).toFixed(1)}</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Matchup Card ────────────────────────────────────────────────────────── */
function MatchupCard({ m }) {
  const advC = m.advantage === 'RCB' ? RCB_C : GT_C;
  return (
    <div className="fp2-matchup-card">
      <div className="fp2-matchup-header">
        <span style={{ color: m.advantage === 'RCB' ? GT_C : RCB_C, fontWeight: 900 }}>{m.batter}</span>
        <span className="fp2-vs-pill">⚔️ VS</span>
        <span style={{ color: m.advantage === 'RCB' ? RCB_C : GT_C, fontWeight: 900 }}>{m.bowler}</span>
      </div>
      <div className="fp2-matchup-chips">
        <div className="fp2-chip"><span>{m.expectedRuns}</span><small>Exp. Runs</small></div>
        <div className="fp2-chip"><span>{m.dismissalPct}%</span><small>Dismissal</small></div>
        <div className="fp2-chip" style={{ borderColor: advC }}>
          <span style={{ color: advC }}>{m.advantage} +{m.advantagePct}%</span>
          <small>Advantage</small>
        </div>
      </div>
      <div className="fp2-matchup-insight">💡 {m.insight}</div>
    </div>
  );
}

/* ─── Impact Player Card ──────────────────────────────────────────────────── */
function ImpactCard({ label, icon, player }) {
  const c = player?.team === 'RCB' ? RCB_C : GT_C;
  return (
    <div className="fp2-impact-card" style={{ borderColor: `${c}44` }}>
      <div className="fp2-impact-icon">{icon}</div>
      <div className="fp2-impact-label">{label}</div>
      <div className="fp2-impact-name" style={{ color: c }}>{player?.name}</div>
      <div className="fp2-impact-team">{player?.team}</div>
      <div className="fp2-impact-reason">{player?.reason}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* MAIN PAGE                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'overview',   label: '📊 Overview' },
  { id: 'venue',      label: '🏟️ Venue' },
  { id: 'h2h',        label: '⚔️ H2H' },
  { id: 'batting',    label: '🏏 Batting' },
  { id: 'bowling',    label: '🎳 Bowling' },
  { id: 'phases',     label: '📈 Phases' },
  { id: 'matchups',   label: '🎯 Matchups' },
  { id: 'impact',     label: '⭐ Impact' },
  { id: 'simulation', label: '🎲 Simulation' },
  { id: 'verdict',    label: '🏅 Verdict' },
];

export default function FinalPrediction() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab]     = useState('overview');
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await axios.get(API);
      setData(r.data);
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message || "Failed to load prediction data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="fp2-loading">
      <div className="fp2-spinner" />
      <div className="fp2-loading-title">🤖 AI Engine Loading...</div>
      <div className="fp2-loading-sub">Querying MongoDB · Computing 14 modules · 10,000 simulations</div>
    </div>
  );

  if (error || !data) return (
    <div className="fp2-error">
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div className="fp2-error-msg">Backend Error</div>
      <div className="fp2-error-detail">{error}</div>
      <div className="fp2-error-hint">Make sure the backend is running on port 5000</div>
      <button className="fp2-retry" onClick={load}>🔄 Retry</button>
    </div>
  );

  const { h2h, venue, batting, bowling, matchups, phases, topPlayers, mvp, captains, points, winProbability: wp, simulation: sim, verdict } = data;
  const rc = RCB_C, gc = GT_C;

  /* Batting radar data */
  const batLabels = ['Opening','Middle Order','Finishing','Form Index','Avg Rating'];
  const rcbBatRadar = [batting?.RCB?.openingScore, batting?.RCB?.middleScore, batting?.RCB?.finishingScore, batting?.RCB?.overallRating, batting?.RCB?.overallRating];
  const gtBatRadar  = [batting?.GT?.openingScore,  batting?.GT?.middleScore,  batting?.GT?.finishingScore,  batting?.GT?.overallRating,  batting?.GT?.overallRating];

  /* Bowling radar data */
  const bowlLabels = ['PP Rating','Mid-Over Rating','Death Rating','Form Index','Wickets'];
  const rcbBowlRadar = [bowling?.RCB?.ppRating, bowling?.RCB?.moRating, bowling?.RCB?.deathRating, bowling?.RCB?.overallRating, Math.min(100, (bowling?.RCB?.players?.reduce((s,p)=>s+p.wickets,0)||0) * 2)];
  const gtBowlRadar  = [bowling?.GT?.ppRating,  bowling?.GT?.moRating,  bowling?.GT?.deathRating,  bowling?.GT?.overallRating,  Math.min(100, (bowling?.GT?.players?.reduce((s,p)=>s+p.wickets,0)||0) * 2)];

  return (
    <div className="fp2-root">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="fp2-hero">
        <div className="fp2-hero-badge">🏆 IPL 2026 FINAL · AI MATCH INTELLIGENCE ENGINE</div>
        <div className="fp2-hero-venue">📍 {data.meta?.venue} · {data.meta?.date} · {data.meta?.time}</div>

        {/* VS Row */}
        <div className="fp2-vs-row">
          <div className="fp2-hero-team" style={{ borderColor: rc }}>
            <TeamLogo team="RCB" size={80} showGlow={true} />
            <div className="fp2-hero-teamname" style={{ color: rc }}>RCB</div>
            <div className="fp2-hero-fullname">Royal Challengers Bengaluru</div>
            <div className="fp2-hero-prob" style={{ color: rc }}>{wp?.RCB}%</div>
            <div className="fp2-hero-prob-label">Win Probability</div>
          </div>

          <div className="fp2-hero-center">
            <div className="fp2-vs-text">VS</div>
            <div className="fp2-confidence-box">
              <div className="fp2-conf-label">AI Confidence</div>
              <div className="fp2-conf-val" style={{ color: GOLD }}>{wp?.confidence}%</div>
            </div>
            <div className="fp2-db-badge">📦 Live MongoDB Data</div>
          </div>

          <div className="fp2-hero-team" style={{ borderColor: gc }}>
            <TeamLogo team="GT" size={80} showGlow={true} />
            <div className="fp2-hero-teamname" style={{ color: gc }}>GT</div>
            <div className="fp2-hero-fullname">Gujarat Titans</div>
            <div className="fp2-hero-prob" style={{ color: gc }}>{wp?.GT}%</div>
            <div className="fp2-hero-prob-label">Win Probability</div>
          </div>
        </div>

        {/* Big probability bar */}
        <div className="fp2-hero-bigbar-wrap">
          <div className="fp2-hero-bigbar">
            <div style={{ width: `${wp?.RCB}%`, background: `linear-gradient(90deg,${rc}88,${rc})`, height: '100%', borderRadius: '6px 0 0 6px', transition: 'width 1.2s ease' }} />
            <div style={{ width: `${wp?.GT}%`,  background: `linear-gradient(90deg,${gc}88,${gc})`,  height: '100%', borderRadius: '0 6px 6px 0', transition: 'width 1.2s ease' }} />
          </div>
          <div className="fp2-hero-bigbar-labels">
            <span style={{ color: rc }}>RCB {wp?.RCB}%</span>
            <span style={{ color: '#475569', fontSize: 10 }}>WIN PROBABILITY</span>
            <span style={{ color: gc }}>{wp?.GT}% GT</span>
          </div>
        </div>

        <div className="fp2-hero-meta">
          🤖 AI Report · MongoDB ipl_prediction · {lastFetch ? lastFetch.toLocaleTimeString('en-IN') : '...'} IST
          <button className="fp2-refresh-btn" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────────── */}
      <div className="fp2-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`fp2-tab${tab === t.id ? ' fp2-tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="fp2-body">

        {/* ══════════════════════════ OVERVIEW ══════════════════════════ */}
        {tab === 'overview' && (
          <div className="fp2-grid-2">

            {/* Win Probability Factors */}
            <div className="fp2-card">
              <SectionHead icon="🎯" title="Win Probability Engine" mod="12" badge="14-Factor Model" />
              <div style={{ marginBottom: 12 }}>
                {[
                  ['Batting Strength', wp?.factors?.rcbBat, wp?.factors?.gtBat],
                  ['Bowling Strength', wp?.factors?.rcbBowl, wp?.factors?.gtBowl],
                  ['Recent Form', wp?.factors?.rcbForm, wp?.factors?.gtForm],
                  ['Head-to-Head', wp?.factors?.rcbH2h, wp?.factors?.gtH2h],
                  ['Venue Advantage', wp?.factors?.rcbVenue, wp?.factors?.gtVenue],
                  ['Captaincy', wp?.factors?.rcbCaptain, wp?.factors?.gtCaptain],
                ].map(([label, v1, v2]) => (
                  <ProbBar key={label} label={label} v1={v1} v2={v2} />
                ))}
              </div>
              <div className="fp2-overall-bar-wrap">
                <ProbBar label="OVERALL WIN PROBABILITY" v1={wp?.RCB} v2={wp?.GT} unit="%" />
              </div>
            </div>

            {/* Points Table Summary */}
            <div className="fp2-card">
              <SectionHead icon="📊" title="League Stage Summary" mod="0" />
              <div className="fp2-pts-grid">
                {['RCB','GT'].map(t => {
                  const c = t === 'RCB' ? rc : gc;
                  const pt = points?.[t] || {};
                  const cap = captains?.[t] || {};
                  return (
                    <div key={t} className="fp2-pts-team" style={{ borderColor: `${c}44` }}>
                      <div className="fp2-pts-team-label" style={{ color: c }}>{t}</div>
                      <div className="fp2-pts-row"><span>Rank</span><strong style={{ color: c }}>#{pt.rank || '—'}</strong></div>
                      <div className="fp2-pts-row"><span>Won</span><strong style={{ color: '#4ade80' }}>{pt.won || '—'}</strong></div>
                      <div className="fp2-pts-row"><span>Lost</span><strong style={{ color: '#f87171' }}>{pt.lost || '—'}</strong></div>
                      <div className="fp2-pts-row"><span>Points</span><strong style={{ color: GOLD }}>{pt.points || '—'}</strong></div>
                      <div className="fp2-pts-row"><span>NRR</span><strong style={{ color: c }}>{pt.nrr || '—'}</strong></div>
                      <div className="fp2-pts-divider" />
                      <div className="fp2-pts-row"><span>Captain</span><strong style={{ color: c, fontSize: 11 }}>{cap.name}</strong></div>
                      <div className="fp2-pts-row"><span>Win%</span><strong style={{ color: c }}>{cap.winPct}%</strong></div>
                      <div className="fp2-pts-row"><span>Titles</span><strong style={{ color: GOLD }}>{cap.titles} 🏆</strong></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* H2H Quick */}
            <div className="fp2-card">
              <SectionHead icon="⚔️" title="Head-to-Head Summary" mod="2" />
              <div className="fp2-h2h-circles">
                <div className="fp2-h2h-circle" style={{ borderColor: rc }}>
                  <div className="fp2-h2h-big" style={{ color: rc }}>{h2h?.rcbWins}</div>
                  <div className="fp2-h2h-sub">RCB Wins</div>
                  <div className="fp2-h2h-pct" style={{ color: rc }}>{h2h?.rcbWinPct}%</div>
                </div>
                <div className="fp2-h2h-mid">
                  <div className="fp2-h2h-total">{h2h?.total} total</div>
                  <div className="fp2-h2h-adv">
                    {h2h?.rcbWinPct >= 50 ? `RCB lead H2H` : `GT lead H2H`}
                  </div>
                  <div className="fp2-h2h-qual">🏆 Q1: RCB won by 92 runs</div>
                </div>
                <div className="fp2-h2h-circle" style={{ borderColor: gc }}>
                  <div className="fp2-h2h-big" style={{ color: gc }}>{h2h?.gtWins}</div>
                  <div className="fp2-h2h-sub">GT Wins</div>
                  <div className="fp2-h2h-pct" style={{ color: gc }}>{h2h?.gtWinPct}%</div>
                </div>
              </div>
              <ProbBar label="H2H SERIES" v1={h2h?.rcbWins} v2={h2h?.gtWins} />
            </div>

            {/* Batting vs Bowling quick */}
            <div className="fp2-card">
              <SectionHead icon="💪" title="Team Strength Ratings" mod="4+5" badge="From MongoDB" />
              {[
                ['🏏 Batting Rating', batting?.RCB?.overallRating, batting?.GT?.overallRating],
                ['🎳 Bowling Rating', bowling?.RCB?.overallRating, bowling?.GT?.overallRating],
                ['⚡ PP Bowling',     bowling?.RCB?.ppRating,      bowling?.GT?.ppRating],
                ['💀 Death Bowling',  bowling?.RCB?.deathRating,   bowling?.GT?.deathRating],
                ['🏏 Opening Bat',   batting?.RCB?.openingScore,  batting?.GT?.openingScore],
                ['🏁 Finishing Bat', batting?.RCB?.finishingScore, batting?.GT?.finishingScore],
              ].map(([label, v1, v2]) => (
                <ProbBar key={label} label={label} v1={v1} v2={v2} />
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════ VENUE ═══════════════════════════════ */}
        {tab === 'venue' && (
          <div className="fp2-card">
            <SectionHead icon="🏟️" title="Venue & Pitch Analysis" mod="3" badge="Narendra Modi Stadium" />
            <div className="fp2-venue-grid">
              {[
                ['🏏 Type',           venue?.type?.replace(/_/g,' ')?.toUpperCase()],
                ['📈 Avg 1st Innings',venue?.avgFirstInnings],
                ['📉 Avg 2nd Innings',venue?.avgSecondInnings],
                ['🏃 Chase Win %',    `${venue?.chaseWinPct}%`],
                ['🛡️ Defend Win %',   `${venue?.defendWinPct}%`],
                ['💧 Dew Factor',     venue?.dewFactor?.replace(/_/g,' ')?.toUpperCase()],
                ['🏟️ Boundary Size',  venue?.boundarySize?.toUpperCase()],
                ['🌀 Spin Assist',    venue?.spinAssistance?.toUpperCase()],
                ['⚡ Pace Assist',    venue?.paceAssistance?.toUpperCase()],
                ['⭐ AI Rating',      `${venue?.aiVenueRating}/10`],
              ].map(([label, val]) => (
                <div key={label} className="fp2-venue-stat">
                  <div className="fp2-venue-stat-label">{label}</div>
                  <div className="fp2-venue-stat-val">{val}</div>
                </div>
              ))}
            </div>
            <div className="fp2-venue-phases">
              <StatCard label="⚡ Powerplay Par Score"     value={venue?.powerplayPar}  sub="Runs in 6 overs"   color={RCB_C} />
              <StatCard label="🔄 Middle Overs Par Score"  value={venue?.middleOversPar} sub="Overs 7–15"        color={GOLD} />
              <StatCard label="💀 Death Overs Par Score"   value={venue?.deathOversPar}  sub="Overs 16–20"       color={GT_C} />
            </div>
            <div className="fp2-venue-insight">
              <div className="fp2-venue-insight-title">🤖 AI Venue Insight</div>
              <div className="fp2-venue-insight-text">
                Narendra Modi Stadium (Ahmedabad) is a batting paradise with large boundaries.
                Chase success rate is <strong style={{ color: GOLD }}>{venue?.chaseWinPct}%</strong> — teams winning the toss should elect to field.
                Dew factor: <strong style={{ color: GOLD }}>{venue?.dewFactor}</strong>.
                With a {venue?.boundary_size === 'large' ? 'large' : 'big'} ground, boundary hitting is slightly harder here than at Wankhede or Chinnaswamy.
                Pace bowlers dominate in the first 6 overs, spin takes over from over 9+.
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════ H2H ═════════════════════════════════ */}
        {tab === 'h2h' && (
          <div className="fp2-card">
            <SectionHead icon="⚔️" title="Head-to-Head Analysis" mod="2" badge="IPL All-Time + 2026" />
            <div className="fp2-h2h-big-row">
              <div className="fp2-h2h-big-team" style={{ borderColor: rc }}>
                <TeamLogo team="RCB" size={60} showGlow={true} />
                <div className="fp2-h2h-big-wins" style={{ color: rc }}>{h2h?.rcbWins}</div>
                <div className="fp2-h2h-big-label">RCB Wins ({h2h?.rcbWinPct}%)</div>
              </div>
              <div className="fp2-h2h-big-center">
                <div style={{ fontSize: 26, fontWeight: 900, color: '#334155' }}>{h2h?.total} TOTAL</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>All IPL meetings + 2026</div>
              </div>
              <div className="fp2-h2h-big-team" style={{ borderColor: gc }}>
                <TeamLogo team="GT" size={60} showGlow={true} />
                <div className="fp2-h2h-big-wins" style={{ color: gc }}>{h2h?.gtWins}</div>
                <div className="fp2-h2h-big-label">GT Wins ({h2h?.gtWinPct}%)</div>
              </div>
            </div>
            <ProbBar label="OVERALL H2H" v1={h2h?.rcbWins} v2={h2h?.gtWins} />

            {/* 2026 results */}
            <div className="fp2-h2h-2026">
              <div className="fp2-h2h-section-title">📅 2026 SEASON MEETINGS</div>
              {(h2h?.recentH2h || []).map((m, i) => (
                <div key={i} className="fp2-h2h-match-row" style={{ borderLeftColor: m.winner === 'RCB' ? rc : gc }}>
                  <span className="fp2-h2h-match-winner" style={{ color: m.winner === 'RCB' ? rc : gc }}>{m.winner} WON</span>
                  <span className="fp2-h2h-match-detail">{m.result}</span>
                  <span className="fp2-h2h-match-margin">{m.margin}</span>
                </div>
              ))}
              {h2h?.qualifier && (
                <div className="fp2-h2h-qualifier" style={{ borderColor: GOLD }}>
                  <div className="fp2-h2h-q-badge">🏆 {h2h.qualifier.label}</div>
                  <div className="fp2-h2h-q-scores">
                    <span style={{ color: rc }}>RCB {h2h.qualifier.rcbScore}</span>
                    <span style={{ color: '#334155' }}>vs</span>
                    <span style={{ color: gc }}>GT {h2h.qualifier.gtScore}</span>
                  </div>
                  <div className="fp2-h2h-q-result" style={{ color: rc }}>RCB won by {h2h.qualifier.margin}</div>
                </div>
              )}
            </div>

            {/* Breakdown */}
            <div className="fp2-h2h-breakdown">
              {[
                ['🏟️ Venue H2H', `${h2h?.venueH2h?.location}: GT ${h2h?.venueH2h?.gtWins}-${h2h?.venueH2h?.rcbWins} RCB`, h2h?.venueH2h?.advantage === 'GT' ? gc : rc, h2h?.venueH2h?.advantage],
                ['🏆 Playoff H2H', h2h?.playoffH2h?.advantage, rc, 'RCB'],
                ['🎯 Momentum', `RCB ${h2h?.momentumScore?.RCB} vs GT ${h2h?.momentumScore?.GT}`, rc, 'RCB'],
                ['🧊 Pressure H2H', `RCB ${h2h?.pressureH2h?.RCB} vs GT ${h2h?.pressureH2h?.GT}`, rc, 'RCB'],
              ].map(([label, detail, c, adv]) => (
                <div key={label} className="fp2-h2h-breakdown-card" style={{ borderColor: `${c}44` }}>
                  <div className="fp2-h2h-bd-label">{label}</div>
                  <div className="fp2-h2h-bd-detail">{detail}</div>
                  <div className="fp2-h2h-bd-adv" style={{ color: c }}>Advantage: {adv}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════ BATTING ═════════════════════════════ */}
        {tab === 'batting' && (
          <div className="fp2-dept-wrap">
            <div className="fp2-card">
              <SectionHead icon="🏏" title="Batting Department Analysis" mod="4" badge="batting_stats_2026 + ipl_players_stats_2026" />
              <div className="fp2-dept-grid">
                <TeamRadar title="BATTING RADAR" labels={batLabels} d1={rcbBatRadar} d2={gtBatRadar} />
                <div className="fp2-dept-ratings">
                  {['RCB','GT'].map(t => {
                    const c = t === 'RCB' ? rc : gc;
                    const b = batting?.[t];
                    return (
                      <div key={t} className="fp2-dept-block" style={{ borderColor: `${c}44` }}>
                        <div className="fp2-dept-block-label" style={{ color: c }}>{t} BATTING</div>
                        <div className="fp2-dept-rating-bar">
                          <span className="fp2-dept-rating-label">AI RATING</span>
                          <div className="fp2-dept-rating-track">
                            <div style={{ width: `${b?.overallRating}%`, background: c, height: '100%', borderRadius: 4, transition: 'width 1s' }} />
                          </div>
                          <span style={{ color: c, fontWeight: 900 }}>{b?.overallRating}/100</span>
                        </div>
                        <div className="fp2-dept-sub-bars">
                          <MiniBar label="Opening"    v={b?.openingScore}   color={c} />
                          <MiniBar label="Middle"     v={b?.middleScore}    color={c} />
                          <MiniBar label="Finishing"  v={b?.finishingScore} color={c} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Player cards */}
            {['RCB','GT'].map(t => {
              const c = t === 'RCB' ? rc : gc;
              return (
                <div key={t} className="fp2-card">
                  <div className="fp2-players-team-hdr" style={{ borderColor: c }}>
                    <img src={`/teams/${t.toLowerCase()}.jpg`} alt={t} className="fp2-hdr-logo" onError={e=>e.target.style.display='none'} />
                    <span style={{ color: c, fontWeight: 900, fontSize: 18 }}>{t} BATTERS</span>
                    <span className="fp2-hdr-sub">Batting AI Rating: <strong style={{ color: c }}>{batting?.[t]?.overallRating}/100</strong></span>
                  </div>
                  <div className="fp2-players-grid">
                    {(batting?.[t]?.players || []).map((p, i) => <PlayerCard key={i} p={p} teamColor={c} type="bat" />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════ BOWLING ═════════════════════════════ */}
        {tab === 'bowling' && (
          <div className="fp2-dept-wrap">
            <div className="fp2-card">
              <SectionHead icon="🎳" title="Bowling Department Analysis" mod="5" badge="bowling_stats_2026 + ipl_players_stats_2026" />
              <div className="fp2-dept-grid">
                <TeamRadar title="BOWLING RADAR" labels={bowlLabels} d1={rcbBowlRadar} d2={gtBowlRadar} />
                <div className="fp2-dept-ratings">
                  {['RCB','GT'].map(t => {
                    const c = t === 'RCB' ? rc : gc;
                    const b = bowling?.[t];
                    return (
                      <div key={t} className="fp2-dept-block" style={{ borderColor: `${c}44` }}>
                        <div className="fp2-dept-block-label" style={{ color: c }}>{t} BOWLING</div>
                        <div className="fp2-dept-rating-bar">
                          <span className="fp2-dept-rating-label">AI RATING</span>
                          <div className="fp2-dept-rating-track">
                            <div style={{ width: `${b?.overallRating}%`, background: c, height: '100%', borderRadius: 4, transition: 'width 1s' }} />
                          </div>
                          <span style={{ color: c, fontWeight: 900 }}>{b?.overallRating}/100</span>
                        </div>
                        <div className="fp2-dept-sub-bars">
                          <MiniBar label="Powerplay"  v={b?.ppRating}    color={c} />
                          <MiniBar label="Mid Overs"  v={b?.moRating}    color={c} />
                          <MiniBar label="Death"      v={b?.deathRating} color={c} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {['RCB','GT'].map(t => {
              const c = t === 'RCB' ? rc : gc;
              return (
                <div key={t} className="fp2-card">
                  <div className="fp2-players-team-hdr" style={{ borderColor: c }}>
                    <img src={`/teams/${t.toLowerCase()}.jpg`} alt={t} className="fp2-hdr-logo" onError={e=>e.target.style.display='none'} />
                    <span style={{ color: c, fontWeight: 900, fontSize: 18 }}>{t} BOWLERS</span>
                    <span className="fp2-hdr-sub">Bowling AI Rating: <strong style={{ color: c }}>{bowling?.[t]?.overallRating}/100</strong></span>
                  </div>
                  <div className="fp2-players-grid">
                    {(bowling?.[t]?.players || []).map((p, i) => <PlayerCard key={i} p={p} teamColor={c} type="bowl" />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════ PHASES ══════════════════════════════ */}
        {tab === 'phases' && (
          <div className="fp2-phases-wrap">
            {[
              { label: '⚡ POWERPLAY — Overs 1–6', mod: '7', key: 'powerplay', color: '#7c3aed' },
              { label: '🔄 MIDDLE OVERS — Overs 7–15', mod: '8', key: 'middleOvers', color: GOLD },
              { label: '💀 DEATH OVERS — Overs 16–20', mod: '9', key: 'deathOvers', color: '#ef4444' },
            ].map(({ label, mod, key, color }) => {
              const pd = phases?.[key];
              return (
                <div key={key} className="fp2-card">
                  <SectionHead icon="" title={label} mod={mod} />
                  <div className="fp2-phase-teams-grid">
                    {['RCB','GT'].map(t => {
                      const c = t === 'RCB' ? rc : gc;
                      const td = pd?.[t];
                      if (!td) return null;
                      return (
                        <div key={t} className="fp2-phase-block" style={{ borderColor: `${c}55` }}>
                          <div className="fp2-phase-block-label" style={{ color: c }}>{t}</div>
                          {Object.entries(td).map(([k, v]) => (
                            <div key={k} className="fp2-phase-stat">
                              <span className="fp2-phase-stat-k">{k.replace(/([A-Z])/g,' $1')}</span>
                              <span className="fp2-phase-stat-v" style={{ color: c }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  {pd?.keyBattle && (
                    <div className="fp2-phase-key">🔑 Key Battle: <strong>{pd.keyBattle}</strong></div>
                  )}
                  {pd?.bestBowler && (
                    <div className="fp2-phase-key">🏆 Best PP Bowler: <strong style={{ color: gc }}>{pd.bestBowler} ({pd.bestBowlerTeam})</strong></div>
                  )}
                  {pd?.bestDeathBowler && (
                    <div className="fp2-phase-key">🏆 Best Death Bowler: <strong style={{ color: rc }}>{pd.bestDeathBowler} ({pd.bestDeathBowlerTeam})</strong></div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════ MATCHUPS ════════════════════════════ */}
        {tab === 'matchups' && (
          <div className="fp2-card">
            <SectionHead icon="🎯" title="Player vs Player Matchup Engine" mod="6" badge="AI-generated from MongoDB stats" />
            <div className="fp2-matchups-grid">
              {(matchups || []).map((m, i) => <MatchupCard key={i} m={m} />)}
            </div>
          </div>
        )}

        {/* ════════════════════════ IMPACT ══════════════════════════════ */}
        {tab === 'impact' && (
          <div className="fp2-impact-wrap">
            <div className="fp2-card">
              <SectionHead icon="⭐" title="AI MVP & Impact Player Engine" mod="11" badge="Form model from MongoDB" />
              <div className="fp2-impact-grid">
                <ImpactCard label="🏅 Player of the Match" icon="🏅" player={mvp?.playerOfMatch} />
                <ImpactCard label="🏏 Highest Run Scorer"  icon="🏏" player={mvp?.highestRunScorer} />
                <ImpactCard label="🎳 Highest Wicket Taker" icon="🎳" player={mvp?.highestWicketTaker} />
                <ImpactCard label="⚡ X-Factor Player"     icon="⚡" player={mvp?.xFactor} />
                <ImpactCard label="🎰 Game Changer"        icon="🎰" player={mvp?.gameChanger} />
                <ImpactCard label="🏆 Most Valuable Player" icon="🏆" player={mvp?.mostValuable} />
              </div>
            </div>
            <div className="fp2-card">
              <SectionHead icon="📈" title="Top 10 Impact Players by Form Index" mod="10" badge="ipl_players_stats_2026" />
              <div className="fp2-top10-grid">
                {(topPlayers || []).map((p, i) => {
                  const c = p.team === 'RCB' ? rc : gc;
                  const fi = p.formIndex || 0;
                  return (
                    <div key={i} className="fp2-top10-row" style={{ borderColor: `${c}33` }}>
                      <div className="fp2-top10-rank" style={{ background: i < 3 ? GOLD : '#1e293b', color: i < 3 ? '#000' : '#475569' }}>#{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="fp2-top10-name">{p.name}</div>
                        <div style={{ fontSize: 10, color: c, fontWeight: 800 }}>{p.team} · {p.type.toUpperCase()}</div>
                      </div>
                      <div className="fp2-top10-bar-wrap">
                        <div className="fp2-top10-bar-track">
                          <div style={{ width: `${fi}%`, background: c, height: '100%', borderRadius: 3 }} />
                        </div>
                        <span style={{ color: c, fontWeight: 900, fontSize: 13, width: 32, textAlign: 'right' }}>{fi}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════ SIMULATION ══════════════════════════ */}
        {tab === 'simulation' && (
          <div className="fp2-card">
            <SectionHead icon="🎲" title="Match Simulation Engine" mod="13" badge={`${(sim?.iterations||10000).toLocaleString()} simulations`} />
            <div className="fp2-sim-stats">
              {[
                ['Most Likely 1st Innings', sim?.mostLikelyScore, GOLD, '🏏'],
                ['Avg 2nd Innings', sim?.avgSecondInnings, rc, '🎯'],
                ['Chase Win %', `${sim?.chaseWinPct}%`, GT_C, '🏃'],
                ['Defend Win %', `${sim?.defenseWinPct}%`, rc, '🛡️'],
              ].map(([label, val, color, icon]) => (
                <StatCard key={label} label={label} value={val} color={color} icon={icon} />
              ))}
            </div>
            <div className="fp2-sim-chart-wrap">
              <div className="fp2-sim-chart-title">SCORE DISTRIBUTION — FIRST INNINGS (10,000 simulations)</div>
              <DistChart dist={sim?.distribution || []} />
            </div>
            <ProbBar label="CHASE vs DEFEND PREDICTION" v1={sim?.defenseWinPct} v2={sim?.chaseWinPct} t1="Defending" t2="Chasing" unit="%" />
            <div className="fp2-sim-note">
              ℹ️ Simulation powered by deterministic Monte Carlo with batting/bowling ratings from MongoDB.
              Mean derived from Narendra Modi Stadium historical avg ({venue?.avgFirstInnings} runs) adjusted for team strengths.
            </div>
          </div>
        )}

        {/* ════════════════════════ VERDICT ═════════════════════════════ */}
        {tab === 'verdict' && (
          <div className="fp2-verdict-wrap">
            {/* Winner Banner */}
            <div className="fp2-winner-banner" style={{
              borderColor: verdict?.winner === 'RCB' ? rc : gc,
              boxShadow: `0 0 80px ${verdict?.winner === 'RCB' ? rc : gc}22`,
            }}>
              <div className="fp2-winner-ai-badge">🤖 AI FINAL VERDICT · SECTION 14</div>
              <TeamLogo team={verdict?.winner} size={100} showGlow={true} />
              <div className="fp2-winner-name" style={{ color: verdict?.winner === 'RCB' ? rc : gc }}>
                {verdict?.winnerFull}
              </div>
              <div className="fp2-winner-sub">PREDICTED IPL 2026 CHAMPIONS</div>
              <div className="fp2-winner-prob" style={{ color: verdict?.winner === 'RCB' ? rc : gc }}>
                {verdict?.winProbability}% Win Probability
              </div>
              <div className="fp2-winner-conf">AI Confidence: <strong style={{ color: GOLD }}>{verdict?.confidence}%</strong></div>
            </div>

            {/* Scorecard */}
            <div className="fp2-card">
              <SectionHead icon="📋" title="Expected Scorecard" mod="14" />
              <div className="fp2-scorecard-grid">
                <StatCard label="Expected 1st Innings" value={verdict?.expectedScorecard?.firstInnings} color={GOLD} icon="🏏" />
                <StatCard label="Expected 2nd Innings"  value={verdict?.expectedScorecard?.secondInnings} color={rc} icon="🎯" />
              </div>
            </div>

            {/* Key battles */}
            <div className="fp2-card">
              <SectionHead icon="⚔️" title="Key Battles" mod="14" />
              {(verdict?.keyBattles || []).map((b, i) => (
                <div key={i} className="fp2-key-battle">
                  <div className="fp2-kb-num" style={{ background: GOLD, color: '#000' }}>{i + 1}</div>
                  <div className="fp2-kb-text">{b}</div>
                </div>
              ))}
            </div>

            {/* Top 5 reasons */}
            <div className="fp2-card">
              <div className="fp2-reasons-title">
                🏆 5 REASONS WHY {verdict?.winner} WINS
              </div>
              {(verdict?.topReasons || []).map((r, i) => (
                <div key={i} className="fp2-reason-row">
                  <div className="fp2-reason-num"
                    style={{ background: i === 0 ? GOLD : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#1e293b', color: i <= 2 ? '#000' : '#475569' }}>
                    #{i + 1}
                  </div>
                  <div className="fp2-reason-text">{r}</div>
                </div>
              ))}
            </div>

            {/* Risk Factors */}
            <div className="fp2-card">
              <SectionHead icon="⚠️" title="Risk Factors" mod="14" />
              {(verdict?.riskFactors || []).map((r, i) => (
                <div key={i} className="fp2-risk-row">
                  <span className="fp2-risk-icon">⚠️</span>
                  <span className="fp2-risk-text">{r}</span>
                </div>
              ))}
            </div>

            {/* Turning Point */}
            <div className="fp2-card">
              <SectionHead icon="🔑" title="Turning Point Prediction" mod="14" />
              <div className="fp2-turning-point">{verdict?.turningPoint}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
