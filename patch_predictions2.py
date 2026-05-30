"""
Patch 2: Update MatchCard to show completed vs predicted badges
and show the actual result text for completed matches.
"""
import os

JSX_PATH = os.path.join(os.path.dirname(__file__),
                        'frontend', 'src', 'pages', 'Predictions2026.jsx')

with open(JSX_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ── Patch 1: MatchCard outer div – add green border for completed matches ──────
OLD_BORDER = "border: `1px solid ${pred.winnerColor}30`,"
NEW_BORDER = "border: pred.isCompleted ? '1.5px solid #22c55e88' : `1px solid ${pred.winnerColor}30`,"
content = content.replace(OLD_BORDER, NEW_BORDER, 1)

# ── Patch 2: MatchCard header – replace static MATCH N label with badge ────────
OLD_HDR = """        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '1px' }}>
          MATCH {pred.match}
        </div>"""

NEW_HDR = """        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '1px' }}>
            MATCH {pred.match}
          </span>
          {pred.isCompleted
            ? <span style={{ fontSize:'9px', fontWeight:900, color:'#22c55e', background:'#22c55e18', border:'1px solid #22c55e44', borderRadius:'6px', padding:'2px 6px', letterSpacing:'0.5px' }}>✅ RESULT</span>
            : <span style={{ fontSize:'9px', fontWeight:900, color:'#f59e0b', background:'#f59e0b18', border:'1px solid #f59e0b44', borderRadius:'6px', padding:'2px 6px', letterSpacing:'0.5px' }}>🤖 PREDICTED</span>
          }
        </div>"""

content = content.replace(OLD_HDR, NEW_HDR, 1)

# ── Patch 3: Add actual result banner just below the confidence bar (before expand toggle) ──
OLD_EXPAND = """      {/* Expand toggle */}
      <div style={{ textAlign: 'center', padding: '6px', color: '#475569', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', borderTop: '1px solid #1e293b' }}>
        {expanded ? '▲ LESS' : '▼ BREAKDOWN'}
      </div>"""

NEW_EXPAND = """      {/* Actual result banner for completed matches */}
      {pred.isCompleted && (
        <div style={{ margin:'0 16px 10px', background:'#22c55e15', border:'1px solid #22c55e40', borderRadius:'8px', padding:'7px 12px', display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{fontSize:'14px'}}>✅</span>
          <div>
            <div style={{fontSize:'9px', color:'#22c55e', fontWeight:800, letterSpacing:'1px', marginBottom:'1px'}}>ACTUAL RESULT</div>
            <div style={{fontSize:'11px', color:'#e2e8f0', fontWeight:700}}>{pred.actualResult}</div>
          </div>
        </div>
      )}

      {/* Expand toggle */}
      <div style={{ textAlign: 'center', padding: '6px', color: '#475569', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', borderTop: '1px solid #1e293b' }}>
        {expanded ? '▲ LESS' : '▼ BREAKDOWN'}
      </div>"""

content = content.replace(OLD_EXPAND, NEW_EXPAND, 1)

# ── Patch 4: Update hero subtitle to reflect actual results ───────────────────
OLD_SUB = '🤖 ML-POWERED · ENSEMBLE WEIGHTED MODEL · IPL 2008-2025 TRAINING DATA'
NEW_SUB = '🤖 ML-POWERED · MATCHES 1–4 ACTUAL RESULTS · MATCHES 5–20 ENSEMBLE PREDICTIONS'
content = content.replace(OLD_SUB, NEW_SUB, 1)

# ── Patch 5: Win tally label ──────────────────────────────────────────────────
OLD_TALLY = '🏆 PREDICTED WIN LEADERS (MATCHES 1–20)'
NEW_TALLY = '🏆 WIN LEADERS — MATCHES 1–4 ACTUAL + 5–20 PREDICTED'
content = content.replace(OLD_TALLY, NEW_TALLY, 1)

# ── Patch 6: Footer description ──────────────────────────────────────────────
OLD_FOOT = 'Weighted Ensemble: Squad Strength 25% | Head-to-Head 20% | Venue 15% | Recent Form 15% | Key Players 15% | Toss Impact 10%'
NEW_FOOT = 'Matches 1–4: Actual IPL 2026 Results (chasing team won all 4) · Matches 5–20: Ensemble ML weighted model'
content = content.replace(OLD_FOOT, NEW_FOOT, 1)

with open(JSX_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify patches
checks = [NEW_BORDER, '✅ RESULT', 'ACTUAL RESULT', 'MATCHES 1–4 ACTUAL RESULTS']
print('Verification:')
for c in checks:
    found = c in content
    print(f'  {"OK" if found else "MISSING"}: {c[:60]}')

print(f'\nSUCCESS — {len(content)} bytes written')
