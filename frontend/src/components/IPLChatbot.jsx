import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const SUGGESTED_QUESTIONS = [
  "Who will win IPL 2026?",
  "Predict RCB vs GT",
  "Top batsmen this season",
  "Playoff qualification chances",
  "Best bowling attack",
  "Orange Cap contenders",
  "Head to head CSK vs MI"
];

/* Render markdown-lite: **bold**, bullet points */
function renderMarkdown(text = '') {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rich = parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{color: '#f8fafc'}}>{p}</strong> : p);

    // Bullet indented line
    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
    // Header-like (starts with [ or is all caps without much punctuation)
    const isHeader = line.startsWith('[') && line.endsWith(']');
    const isEmpty = line.trim() === '';

    if (isEmpty) return <div key={i} style={{ height: '8px' }} />;
    
    if (isHeader) {
      return (
        <div key={i} style={{ 
          fontSize: '13px', 
          fontWeight: '800', 
          color: '#fbbf24', 
          marginTop: '12px', 
          marginBottom: '4px',
          letterSpacing: '0.5px'
        }}>
          {rich}
        </div>
      );
    }

    return (
      <div key={i} style={{
        paddingLeft: isBullet ? '12px' : '0',
        display: 'flex',
        gap: isBullet ? '8px' : '0',
        lineHeight: '1.6',
        marginBottom: '4px',
        color: '#cbd5e1'
      }}>
        {isBullet && <span style={{ color: '#fbbf24', flexShrink: 0 }}>•</span>}
        <div style={{ flex: 1 }}>{rich}</div>
      </div>
    );
  });
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '12px 16px', background: '#1e293b', borderRadius: '12px', width: 'fit-content' }}>
      <Bot size={16} color="#fbbf24" style={{ marginRight: '8px' }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#fbbf24',
          animation: `typingBounce 1s ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function IPLChatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "👋 **Welcome to the IPL 2026 Cricket Assistant!**\n\nI'm powered by live MongoDB data and an intent-based engine. Ask me about live scores, predictions, results, upcoming matches, or team info!",
      ts: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: msg, ts: new Date().toISOString() }]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/chat`, { message: msg });
      const data = res.data;

      setMessages(prev => [...prev, { role: 'bot', text: data.reply, ts: data.timestamp }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: '⚠️ **Connection Error:** Unable to reach the backend. Please check your network connection.', 
        ts: new Date().toISOString(),
        isError: true
      }]);
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
    text: "🔄 Chat cleared! How can I help you next?",
    ts: new Date().toISOString(),
  }]);

  return (
    <div style={{
      backgroundColor: '#020617', // Deep tailwind slate-950
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      color: '#f8fafc'
    }}>
      <style>{`
        @keyframes typingBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); opacity: 0.5; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {/* Header */}
      <div style={{ 
        padding: '20px 24px', 
        background: 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%)', 
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <Sparkles size={24} color="#fbbf24" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '0.5px' }}>AI Cricket Assistant</h2>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              Connected to MongoDB Atlas
            </div>
          </div>
        </div>
        <button onClick={clearChat} title="Clear Chat" style={{
          background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: '0.2s'
        }} onMouseOver={e => e.currentTarget.style.color = '#f8fafc'} onMouseOut={e => e.currentTarget.style.color = '#64748b'}>
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} style={{
              display: 'flex',
              gap: '12px',
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              animation: 'slideUp 0.3s ease-out forwards',
            }}>
              {!isUser && (
                <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', border: '1px solid #4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} color="#818cf8" />
                </div>
              )}
              
              <div style={{
                background: isUser ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : m.isError ? '#450a0a' : '#0f172a',
                border: `1px solid ${isUser ? '#3b82f6' : m.isError ? '#7f1d1d' : '#1e293b'}`,
                padding: '14px 18px',
                borderRadius: '16px',
                borderTopRightRadius: isUser ? '4px' : '16px',
                borderTopLeftRadius: !isUser ? '4px' : '16px',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                {renderMarkdown(m.text)}
                <div style={{ fontSize: '10px', color: isUser ? '#93c5fd' : '#64748b', marginTop: '8px', textAlign: 'right' }}>
                  {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {isUser && (
                <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="#94a3b8" />
                </div>
              )}
            </div>
          );
        })}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length < 3 && (
        <div style={{ padding: '0 24px 12px', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none' }}>
          {SUGGESTED_QUESTIONS.map(q => (
            <button key={q} onClick={() => sendMessage(q)} disabled={loading} style={{
              background: '#0f172a', border: '1px solid #1e293b', color: '#94a3b8', padding: '8px 16px', borderRadius: '20px',
              fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
            }} onMouseOver={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#bfdbfe'; }}
               onMouseOut={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#94a3b8'; }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div style={{ padding: '20px 24px', background: '#0f172a', borderTop: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', gap: '12px', maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask the AI Assistant..."
            rows={1}
            style={{
              flex: 1, background: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
              padding: '16px 50px 16px 20px', borderRadius: '24px', outline: 'none',
              fontSize: '14px', resize: 'none', lineHeight: '1.4', overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)', transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#334155'}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              position: 'absolute', right: '6px', top: '6px', bottom: '6px', width: '40px',
              background: input.trim() && !loading ? '#3b82f6' : '#334155', border: 'none', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s'
            }}
          >
            <Send size={18} color={input.trim() && !loading ? '#fff' : '#94a3b8'} style={{ marginLeft: '2px' }} />
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569', marginTop: '12px' }}>
          Responses are based on live data. Always verify important info.
        </div>
      </div>
    </div>
  );
}
