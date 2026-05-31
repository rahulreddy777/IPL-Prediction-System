import React, { useState, useEffect, useRef } from 'react';

const QUICK_ACTIONS = [
  { label: '🔴 Live Score',     msg: 'live score'             },
  { label: '🪙 Toss',           msg: 'who won the toss'       },
  { label: '📅 Next Match',     msg: 'next match'             },
  { label: '📊 Results',        msg: 'match results'          },
  { label: '🤖 ML Accuracy',    msg: 'prediction accuracy'    },
  { label: '💪 Best Team',      msg: 'who will win IPL 2026'  },
  { label: '🏏 MI Squad',       msg: 'tell me about MI'       },
  { label: '👑 Predict M6',     msg: 'predict match 6'        },
  { label: '❓ Help',           msg: 'help'                   },
];

const TEAM_COLORS = {
  CSK:'#F9CD05', MI:'#1E90FF', KKR:'#7B2FBE', RR:'#EA1A85',
  RCB:'#D4101A', DC:'#0057A8', SRH:'#F26522', GT:'#00B4D8',
  PBKS:'#DD1F2D', LSG:'#00BFFF'
};

/* Render markdown-lite: **bold**, bullet points */
function renderMarkdown(text = '') {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rich = parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p);

    // Bullet indented line
    const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
    // Header-like (emoji line)
    const isEmpty = line.trim() === '';

    if (isEmpty) return <div key={i} style={{ height: '6px' }} />;
    return (
      <div key={i} style={{
        paddingLeft: isBullet ? '8px' : '0',
        lineHeight: '1.55',
        marginBottom: '1px',
      }}>
        {rich}
      </div>
    );
  });
}

/* Typing indicator dots */
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#f59e0b',
          animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

export default function IPLChatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "👋 **Hey Cricket Fan!** I'm your **IPL 2026 AI Assistant!**\n\nI use the **live score API** (RapidAPI) + **CricAPI agent cache**, **auto toss** parsing, and **ML predictions**. Ask me anything!\n\n🏏 Try: *live score*, *toss*, *next match*, *predict match 6*, or *help*",
      ts: new Date().toISOString(),
    }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Poll live match count for the badge
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL}/api/live-scores`);
        const j = await r.json();
        const live = (j.data || []).filter(m => m.matchStarted && !m.matchEnded);
        setLiveCount(live.length);
      } catch { /* ignore */ }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: msg, ts: new Date().toISOString() }]);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.reply, ts: data.timestamp }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ Connection error. Make sure the backend is running.', ts: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => setMessages([{
    role: 'bot',
    text: "🔄 Chat cleared! How can I help you?\n\nType **help** to see what I can do.",
    ts: new Date().toISOString(),
  }]);

  return (
    <div style={{
      backgroundColor: '#0d1627',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 0 40px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Keyframe styles */}
      <style>{`
        @keyframes typingBounce {
          0%,60%,100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .chat-input::placeholder { color: #475569; }
        .chat-input:focus { outline: none; border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.15) !important; }
        .quick-btn:hover { background: #f59e0b !important; color: #000 !important; transform: translateY(-2px); }
        .send-btn:hover { background: linear-gradient(135deg,#f59e0b,#eab308) !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,158,11,0.5) !important; }
        .chat-msg { animation: fadeInUp 0.25s ease; }
      `}</style>

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(160deg, #0a1628 0%, #1a2744 50%, #0a1628 100%)',
        borderBottom: '2px solid rgba(245,158,11,0.2)',
        padding: '36px 20px 28px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '28px',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Live badge */}
          {liveCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '20px', padding: '4px 12px', marginBottom: '12px', fontSize: '11px',
              fontWeight: 800, color: '#ef4444', letterSpacing: '1px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />
              {liveCount} MATCH{liveCount > 1 ? 'ES' : ''} LIVE NOW
            </div>
          )}
          <h1 style={{
            fontSize: '42px', fontWeight: 900, margin: '0 0 8px',
            background: 'linear-gradient(90deg, #f59e0b, #fde68a, #f59e0b)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '1px',
          }}>
            🏏 IPL 2026 AI CHATBOT
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, letterSpacing: '1.5px' }}>
            LIVE SCORE API · AUTO TOSS · CRICAPI AGENT · ML PREDICTIONS
          </div>
        </div>
      </div>

      {/* ── Main Chat Container ───────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: '820px', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(qa => (
            <button key={qa.msg} className="quick-btn" onClick={() => sendMessage(qa.msg)}
              style={{
                padding: '7px 14px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.25)',
                background: 'rgba(245,158,11,0.08)', color: '#f59e0b',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s ease', letterSpacing: '0.3px',
              }}>
              {qa.label}
            </button>
          ))}
          <button onClick={clearChat}
            style={{
              marginLeft: 'auto', padding: '7px 14px', borderRadius: '20px',
              border: '1px solid rgba(100,116,139,0.3)', background: 'transparent',
              color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.borderColor='#475569'; }}
            onMouseLeave={e => { e.currentTarget.style.color='#475569'; e.currentTarget.style.borderColor='rgba(100,116,139,0.3)'; }}>
            🗑️ Clear
          </button>
        </div>

        {/* Chat Window */}
        <div style={{
          background: 'linear-gradient(160deg, #0f172a, #1e293b)',
          border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          {/* Chat header */}
          <div style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(245,158,11,0.1)',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #eab308)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>🏏</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0' }}>IPL AI Assistant</div>
              <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Online · Real-time data
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#334155', fontWeight: 700, letterSpacing: '1px' }}>
              Live API + ML Agent
            </div>
          </div>

          {/* Messages area */}
          <div style={{
            height: '480px', overflowY: 'auto', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '14px',
            scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent',
          }}>
            {messages.map((msg, i) => (
              <div key={i} className="chat-msg" style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: '10px', alignItems: 'flex-end',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px',
                }}>
                  {msg.role === 'user' ? '👤' : '🏏'}
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: '75%',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #1d4ed8, #1e40af)'
                    : 'linear-gradient(135deg, #0f172a, #1e293b)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(59,130,246,0.4)'
                    : '1px solid rgba(245,158,11,0.15)',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '12px 16px',
                  fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0',
                  boxShadow: msg.role === 'user'
                    ? '0 4px 16px rgba(59,130,246,0.2)'
                    : '0 4px 16px rgba(0,0,0,0.4)',
                }}>
                  {msg.role === 'bot' ? renderMarkdown(msg.text) : msg.text}
                  <div style={{ fontSize: '9px', color: '#334155', marginTop: '5px', textAlign: msg.role === 'user' ? 'left' : 'right' }}>
                    {new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="chat-msg" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
                }}>🏏</div>
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: '18px 18px 18px 4px', padding: '12px 16px',
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: '16px 20px', borderTop: '1px solid rgba(245,158,11,0.1)',
            background: 'rgba(15,23,42,0.6)', display: 'flex', gap: '10px', alignItems: 'flex-end',
          }}>
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about live scores, predictions, results..."
              disabled={loading}
              style={{
                flex: 1, background: 'rgba(30,41,59,0.8)',
                border: '1.5px solid rgba(71,85,105,0.5)',
                borderRadius: '14px', padding: '12px 16px',
                color: '#e2e8f0', fontSize: '13px', fontFamily: 'inherit',
                resize: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                cursor: loading ? 'not-allowed' : 'text',
                opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                padding: '12px 22px', borderRadius: '14px', border: 'none',
                background: loading || !input.trim()
                  ? 'rgba(71,85,105,0.4)'
                  : 'linear-gradient(135deg,#f59e0b,#d97706)',
                color: loading || !input.trim() ? '#475569' : '#000',
                fontWeight: 800, fontSize: '13px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: loading || !input.trim() ? 'none' : '0 4px 12px rgba(245,158,11,0.35)',
                flexShrink: 0,
              }}>
              {loading ? '⏳' : '➤'} {loading ? 'Thinking' : 'Send'}
            </button>
          </div>
        </div>

        {/* Info footer */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px',
        }}>
          {[
            { icon: '📡', label: 'Data Source', val: 'RapidAPI + CricAPI' },
            { icon: '🤖', label: 'ML Engine', val: 'Ensemble Voting Classifier' },
            { icon: '🎯', label: 'ML Accuracy', val: 'Real-time from Agent' },
            { icon: '⚡', label: 'Response Time', val: '< 500ms' },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{
              background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(71,85,105,0.2)',
              borderRadius: '12px', padding: '10px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
              <div style={{ fontSize: '9px', color: '#475569', fontWeight: 700, letterSpacing: '1px', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
