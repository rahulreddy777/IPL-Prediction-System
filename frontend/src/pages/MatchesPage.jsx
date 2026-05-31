import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

/* ─────────────────────── colour helpers ─────────────────────── */
const TEAM_COLORS = {
  MI:   { color: "#1E90FF", bg: "rgba(30,144,255,0.12)", border: "rgba(30,144,255,0.35)" },
  CSK:  { color: "#F9CD05", bg: "rgba(249,205,5,0.12)",  border: "rgba(249,205,5,0.35)"  },
  KKR:  { color: "#A855F7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.35)" },
  RCB:  { color: "#EF4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)"  },
  DC:   { color: "#3B82F6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)" },
  RR:   { color: "#EC4899", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.35)" },
  SRH:  { color: "#F97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.35)" },
  GT:   { color: "#06B6D4", bg: "rgba(6,182,212,0.12)",  border: "rgba(6,182,212,0.35)"  },
  PBKS: { color: "#F87171", bg: "rgba(248,113,113,0.12)",border: "rgba(248,113,113,0.35)"},
  LSG:  { color: "#4ADE80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.35)" },
};

const TEAM_NAME_MAP = {
  "CHENNAI SUPER KINGS": "CSK",
  "MUMBAI INDIANS": "MI",
  "KOLKATA KNIGHT RIDERS": "KKR",
  "RAJASTHAN ROYALS": "RR",
  "ROYAL CHALLENGERS BENGALURU": "RCB",
  "DELHI CAPITALS": "DC",
  "SUNRISERS HYDERABAD": "SRH",
  "GUJARAT TITANS": "GT",
  "PUNJAB KINGS": "PBKS",
  "LUCKNOW SUPER GIANTS": "LSG"
};

const getShortCode = (name) => {
  if (!name) return "TBD";
  const upper = name.toUpperCase();
  if (TEAM_NAME_MAP[upper]) return TEAM_NAME_MAP[upper];
  return upper;
};

const tc  = (c) => TEAM_COLORS[c] || { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" };

const STATUS_COLORS = {
  completed: { label: "RESULT",   bg: "rgba(16,185,129,0.12)", color: "#4ade80", border: "rgba(16,185,129,0.3)" },
  live:      { label: "LIVE",     bg: "rgba(239,68,68,0.15)",  color: "#f87171", border: "rgba(239,68,68,0.5)"  },
  upcoming:  { label: "UPCOMING", bg: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "rgba(59,130,246,0.3)" },
};

const STAGE_COLORS = {
  league:    { label: "LEAGUE",    bg: "rgba(99,102,241,0.15)",  color: "#a5b4fc" },
  playoffs:  { label: "PLAYOFFS",  bg: "rgba(245,158,11,0.15)",  color: "#fbbf24" },
  qualifier1:{ label: "Q1",        bg: "rgba(16,185,129,0.15)",  color: "#4ade80" },
  eliminator:{ label: "ELIMINATOR",bg: "rgba(239,68,68,0.15)",  color: "#f87171" },
  qualifier2:{ label: "Q2",        bg: "rgba(6,182,212,0.15)",   color: "#22d3ee" },
  final:     { label: "FINAL 🏆",  bg: "rgba(245,158,11,0.25)",  color: "#fbbf24" },
};

const MATCH_FILTERS = ["ALL","LEAGUE","PLAYOFFS","COMPLETED","UPCOMING"];
const MEDAL = ["🥇","🥈","🥉"];

/* ─────────────────────── Orange Cap Tab ─────────────────────── */
function OrangeCapTab() {
  const [caps, setCaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/all-seasons-caps`);
        const sorted = (Array.isArray(res.data) ? res.data : []).sort((a,b) => b.Season - a.Season);
        setCaps(sorted);
      } catch {
        setError("Could not fetch Orange Cap data.");
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  if (loading) return <Spinner color="#f97316" label="Fetching Orange Caps from MongoDB…" />;
  if (error) return <ErrorBox msg={error} />;

  return (
    <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: "14px", overflow: "hidden", marginTop: "20px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "linear-gradient(90deg,rgba(234,88,12,0.2),rgba(249,115,22,0.1))" }}>
            {["Season", "Player (Team)", "Runs"].map((h, i) => (
              <th key={h} style={{
                padding: "16px",
                textAlign: i === 2 ? "center" : "left",
                fontSize: "12px", fontWeight: "800", letterSpacing: "0.1em",
                color: "#fb923c", textTransform: "uppercase",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {caps.map((c, idx) => (
            <tr key={idx}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(249,115,22,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "16px", color: "#60a5fa", fontWeight: "800", fontSize: "15px" }}>{c.Season}</td>
              <td style={{ padding: "16px", color: "#f1f5f9", fontWeight: "700", fontSize: "15px" }}>{c.OrangeCap}</td>
              <td style={{ padding: "16px", textAlign: "center" }}>
                <span style={{
                  background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)",
                  color: "#fb923c", fontWeight: "900", fontSize: "16px",
                  borderRadius: "8px", padding: "4px 14px", display: "inline-block",
                }}>{c.Runs}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: "10px 16px", fontSize: "10px", color: "#334155", letterSpacing: "0.08em", textAlign: "center" }}>
        DATA: MongoDB `all_seasons_caps` · {caps.length} SEASONS
      </div>
    </div>
  );
}

/* ─────────────────────── Purple Cap Tab ─────────────────────── */
function PurpleCapTab() {
  const [caps, setCaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/all-seasons-caps`);
        const sorted = (Array.isArray(res.data) ? res.data : []).sort((a,b) => b.Season - a.Season);
        setCaps(sorted);
      } catch {
        setError("Could not fetch Purple Cap data.");
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  if (loading) return <Spinner color="#a855f7" label="Fetching Purple Caps from MongoDB…" />;
  if (error) return <ErrorBox msg={error} />;

  return (
    <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: "14px", overflow: "hidden", marginTop: "20px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "linear-gradient(90deg,rgba(124,58,237,0.2),rgba(168,85,247,0.1))" }}>
            {["Season", "Player (Team)", "Wickets"].map((h, i) => (
              <th key={h} style={{
                padding: "16px",
                textAlign: i === 2 ? "center" : "left",
                fontSize: "12px", fontWeight: "800", letterSpacing: "0.1em",
                color: "#c084fc", textTransform: "uppercase",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {caps.map((c, idx) => (
            <tr key={idx}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "16px", color: "#60a5fa", fontWeight: "800", fontSize: "15px" }}>{c.Season}</td>
              <td style={{ padding: "16px", color: "#f1f5f9", fontWeight: "700", fontSize: "15px" }}>{c.PurpleCap}</td>
              <td style={{ padding: "16px", textAlign: "center" }}>
                <span style={{
                  background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)",
                  color: "#c084fc", fontWeight: "900", fontSize: "16px",
                  borderRadius: "8px", padding: "4px 14px", display: "inline-block",
                }}>{c.Wickets}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: "10px 16px", fontSize: "10px", color: "#334155", letterSpacing: "0.08em", textAlign: "center" }}>
        DATA: MongoDB `all_seasons_caps` · {caps.length} SEASONS
      </div>
    </div>
  );
}

/* ─────────────────────── Matches Tab ─────────────────────── */
function MatchesTab() {
  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState("ALL");
  const [search,   setSearch]   = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [seedStatus, setSeedStatus] = useState(null); // null | 'loading' | 'ok' | 'error'

  const fetchMatches = useCallback(async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_BASE}/api/matches2026`);
      const raw = Array.isArray(res.data) ? res.data : (res.data?.matches || []);

      // FRONTEND CALCULATION: Dynamically update Q2 and Final based on Q1 and Eliminator outcomes
      const m71 = raw.find(m => m.matchNumber === 71);
      const m72 = raw.find(m => m.matchNumber === 72);
      const m73 = raw.find(m => m.matchNumber === 73);
      const m74 = raw.find(m => m.matchNumber === 74);

      if (m71 && m72 && m73 && m74) {
        const _getCode = (v) => v ? (typeof v === 'object' ? v.code : getShortCode(v)) : null;
        
        const q1WinnerCode = _getCode(m71.winner);
        const q1T1Code = m71.team1?.code || getShortCode(m71.team1?.name);
        const q1T2Code = m71.team2?.code || getShortCode(m71.team2?.name);
        const q1LoserCode = q1WinnerCode ? (q1WinnerCode === q1T1Code ? q1T2Code : q1T1Code) : null;
        
        const elimWinnerCode = _getCode(m72.winner);
        const q2WinnerCode = _getCode(m73.winner);

        const getFullName = (code) => {
          if (!code || code === 'TBD') return 'TBD';
          const map = {
            'RCB': 'Royal Challengers Bengaluru', 'GT': 'Gujarat Titans',
            'RR': 'Rajasthan Royals', 'SRH': 'Sunrisers Hyderabad',
            'CSK': 'Chennai Super Kings', 'MI': 'Mumbai Indians',
            'KKR': 'Kolkata Knight Riders', 'DC': 'Delhi Capitals',
            'PBKS': 'Punjab Kings', 'LSG': 'Lucknow Super Giants'
          };
          return map[code] || code;
        };

        // Only override if teams are currently TBD (don't swap teams that already have data)
        if (q1LoserCode && (!m73.team1?.code || m73.team1.code === 'TBD')) {
          m73.team1 = { ...m73.team1, code: q1LoserCode, shortName: q1LoserCode, name: getFullName(q1LoserCode) };
        }
        if (elimWinnerCode && (!m73.team2?.code || m73.team2.code === 'TBD')) {
          m73.team2 = { ...m73.team2, code: elimWinnerCode, shortName: elimWinnerCode, name: getFullName(elimWinnerCode) };
        }
        if (q1WinnerCode && (!m74.team1?.code || m74.team1.code === 'TBD')) {
          m74.team1 = { ...m74.team1, code: q1WinnerCode, shortName: q1WinnerCode, name: getFullName(q1WinnerCode) };
        }
        if (q2WinnerCode && q2WinnerCode !== 'TBD') {
          m74.team2 = { ...m74.team2, code: q2WinnerCode, shortName: q2WinnerCode, name: getFullName(q2WinnerCode) };
        } else if (!m74.team2?.code || m74.team2.code === 'TBD') {
          m74.team2 = { code: 'TBD', shortName: 'TBD', name: 'TBD' };
        }

      }

      setMatches(raw);
      setLastSync(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      try {
        const r2 = await axios.get(`${API_BASE}/api/matches?season=2026`);
        setMatches(Array.isArray(r2.data?.matches) ? r2.data.matches : []);
        setLastSync(new Date().toLocaleTimeString());
      } catch {
        setError("Could not load matches.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSeedData = useCallback(async () => {
    setSeedStatus("loading");
    try {
      const r = await axios.post(`${API_BASE}/api/admin/seed-matches`);
      if (r.data?.success) {
        setSeedStatus("ok");
        setTimeout(() => setSeedStatus(null), 3500);
        fetchMatches(); // refresh the grid immediately
      } else {
        setSeedStatus("error");
        setTimeout(() => setSeedStatus(null), 4000);
      }
    } catch {
      setSeedStatus("error");
      setTimeout(() => setSeedStatus(null), 4000);
    }
  }, [fetchMatches]);

  useEffect(() => { fetchMatches(); const p = setInterval(fetchMatches, 30000); return () => clearInterval(p); }, [fetchMatches]);

  const filtered = matches.filter(m => {
    const t1  = (m.team1?.shortName || m.team1?.name || m.team1 || "").toUpperCase();
    const t2  = (m.team2?.shortName || m.team2?.name || m.team2 || "").toUpperCase();
    const lbl = (m.label || m.stage || "").toLowerCase();
    const sta = (m.status || "").toLowerCase();
    const typ = (m.matchType || m.stage || "").toLowerCase();
    const ok  = !search || t1.includes(search.toUpperCase()) || t2.includes(search.toUpperCase()) || lbl.includes(search.toLowerCase());
    if (!ok) return false;
    if (filter === "ALL")       return true;
    if (filter === "LEAGUE")    return typ === "league";
    if (filter === "PLAYOFFS")  return m.stage === "playoff" || typ !== "league";
    if (filter === "COMPLETED") return sta === "completed" || sta === "result";
    if (filter === "UPCOMING")  return sta === "upcoming"  || sta === "scheduled";
    return true;
  });

  if (loading) return <Spinner color="#7c3aed" label="Loading matches from MongoDB…" />;
  if (error)   return <ErrorBox msg={error} />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        {MATCH_FILTERS.map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: "20px", fontSize: "10px", fontWeight: "700",
              cursor: "pointer", letterSpacing: "0.06em", border: "1px solid",
              background: filter === f ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
              borderColor: filter === f ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.1)",
              color: filter === f ? "#c4b5fd" : "#64748b", transition: "all 0.18s",
            }}
          >{f}</button>
        ))}
        <SearchBar value={search} onChange={setSearch} placeholder="Search team…" style={{ marginLeft: "auto" }} />
        <button onClick={fetchMatches} style={{
          background: "linear-gradient(135deg,#7c3aed,#3b82f6)", border: "none",
          color: "#fff", borderRadius: "8px", padding: "6px 14px", fontSize: "11px",
          fontWeight: "700", cursor: "pointer",
        }}>↻ Refresh</button>
        <button
          id="btn-insert-matches"
          onClick={handleSeedData}
          disabled={seedStatus === "loading"}
          style={{
            background: seedStatus === "ok"
              ? "linear-gradient(135deg,#10b981,#059669)"
              : seedStatus === "error"
              ? "linear-gradient(135deg,#ef4444,#b91c1c)"
              : "linear-gradient(135deg,#f59e0b,#d97706)",
            border: "none", color: "#fff", borderRadius: "8px",
            padding: "6px 14px", fontSize: "11px", fontWeight: "700",
            cursor: seedStatus === "loading" ? "wait" : "pointer",
            opacity: seedStatus === "loading" ? 0.7 : 1,
            transition: "all 0.25s",
          }}
        >
          {seedStatus === "loading" ? "⏳ Inserting…"
            : seedStatus === "ok"    ? "✅ Inserted!"
            : seedStatus === "error" ? "❌ Failed"
            : "📥 Insert Data"}
        </button>
      </div>
      <p style={{ fontSize: "11px", color: "#475569", marginBottom: "14px" }}>
        {filtered.length} matches · MongoDB `ipl_matches_2026`{lastSync && ` · Synced ${lastSync}`}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: "12px" }}>
        {filtered.map((m, idx) => {
          const t1    = m.team1?.shortName || getShortCode(m.team1?.name || m.team1 || "TBD");
          const t2    = m.team2?.shortName || getShortCode(m.team2?.name || m.team2 || "TBD");
          const t1c   = tc(t1);  const t2c = tc(t2);
          const sta   = (m.status || "upcoming").toLowerCase();
          const stCol = STATUS_COLORS[sta] || STATUS_COLORS.upcoming;
          const typ   = (m.matchType || m.stage || "league").toLowerCase();
          const stgCl = STAGE_COLORS[typ] || (m.stage === "playoff" ? STAGE_COLORS.playoffs : STAGE_COLORS.league);
          const isExp = expanded === (m._id || idx);
          const isLiv = sta === "live";
          const win   = m.winner || "";
          const s1    = m.team1?.score || m.score_team_1 || null;
          const s2    = m.team2?.score || m.score_team_2 || null;

          return (
            <div key={m._id || idx}
              onClick={() => setExpanded(p => p === (m._id || idx) ? null : (m._id || idx))}
              style={{
                background: "rgba(15,23,42,0.85)", border: `1px solid ${isExp ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: "14px", overflow: "hidden", cursor: "pointer",
                transition: "all 0.2s", transform: isExp ? "translateY(-2px)" : "none",
              }}
            >
              {/* Top bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: isLiv ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ fontSize: "9px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px", background: stgCl.bg, color: stgCl.color }}>{stgCl.label}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>M{m.matchNumber}{m.label ? ` · ${m.label}` : ""}</span>
                </div>
                <span style={{ fontSize: "9px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px", background: stCol.bg, color: stCol.color, border: `1px solid ${stCol.border}`, animation: isLiv ? "blink 1.2s infinite" : "none" }}>
                  {isLiv ? "🔴 LIVE" : stCol.label}
                </span>
              </div>
              {/* Teams + Scores */}
              <div style={{ padding: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <TeamPill code={t1} meta={t1c} isWinner={win === t1} score={s1} />
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: "10px", color: "#475569", fontWeight: "700" }}>VS</div>
                  <div style={{ fontSize: "9px", color: "#334155" }}>
                    {m.dateISO ? new Date(m.dateISO).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : m.date || ""}
                  </div>
                </div>
                <TeamPill code={t2} meta={t2c} isWinner={win === t2} score={s2} />
              </div>
              {/* Result / venue */}
              <div style={{ padding: "0 14px 12px" }}>
                {sta === "completed" && m.result && (
                  <div style={{ padding: "5px 10px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "7px", fontSize: "11px", color: "#4ade80", fontWeight: "600", marginBottom: "6px" }}>
                    🏆 {m.result}
                  </div>
                )}
                {m.venue && <div style={{ fontSize: "10px", color: "#475569" }}>📍 {m.venue}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─────────────────────── tiny shared components ─────────────── */
const TEAM_LOGOS = {
  SRH: "/teams/srh.jpg",
  RCB: "/teams/rcb.jpg",
  MI: "/teams/mi.jpg",
  KKR: "/teams/kkr.jpg",
  CSK: "/teams/csk.jpg",
  RR: "/teams/rr.jpg",
  DC: "/teams/dc.jpg",
  PBKS: "/teams/pbks.jpg",
  GT: "/teams/gt.jpg",
  LSG: "/teams/lsg.jpg"
};

function TeamPill({ code, meta, isWinner, score }) {
  const logo = TEAM_LOGOS[code];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <div className="team-circle" style={{
        boxShadow: isWinner ? `0 0 14px ${meta.color}60` : "none",
        border: `2px solid ${isWinner ? meta.color : meta.border}`
      }}>
        {logo && (
          <img
            src={logo}
            alt={code}
            className="team-logo"
          />
        )}
      </div>
      <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: "15px", fontWeight: "800", color: isWinner ? meta.color : "#f1f5f9", letterSpacing: "1px" }}>{code}</span>
      {score && (
        <span style={{
          fontSize: "10px", fontWeight: "700",
          color: isWinner ? meta.color : "#94a3b8",
          background: isWinner ? `${meta.color}18` : "rgba(255,255,255,0.04)",
          border: `1px solid ${isWinner ? meta.color + "40" : "rgba(255,255,255,0.08)"}`,
          borderRadius: "6px", padding: "2px 7px",
          letterSpacing: "0.5px", whiteSpace: "nowrap",
        }}>{score}</span>
      )}
      <style>{`
        .team-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #16213e;
        }
        .team-logo {
          width: 50px;
          height: 50px;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}

function Spinner({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", flexDirection: "column", gap: "12px" }}>
      <div style={{ width: "32px", height: "32px", border: `3px solid rgba(255,255,255,0.1)`, borderTop: `3px solid ${color}`, borderRadius: "50%", animation: "spinR 0.8s linear infinite" }} />
      <div style={{ color: "#64748b", fontSize: "13px" }}>{label}</div>
      <style>{`@keyframes spinR { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ padding: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#f87171", fontSize: "13px" }}>
      ⚠️ {msg}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder, style = {} }) {
  return (
    <div style={{ position: "relative", ...style }}>
      <input
        type="text" placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#e2e8f0", borderRadius: "8px", padding: "7px 34px 7px 14px",
          fontSize: "12px", outline: "none", width: "200px",
          fontFamily: "'Inter',sans-serif", transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
      />
      <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: "12px", pointerEvents: "none" }}>🔍</span>
    </div>
  );
}

/* ─────────────────────── Main Page ─────────────────────── */
const TABS = [
  { id: "matches",    label: "🗓️ All Matches",        color: "#7c3aed" },
  { id: "orangecap",  label: "🟠 Orange Cap (2008-2025)", color: "#f97316" },
  { id: "purplecap",  label: "🟣 Purple Cap (2008-2025)", color: "#a855f7" },
];

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState("matches");

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
      <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{
            fontFamily: "'Oswald',sans-serif", fontSize: "26px", fontWeight: "800",
            color: "#f1f5f9", margin: "0 0 4px", letterSpacing: "1px",
          }}>IPL 2026 — MATCHES & CAP LEADERS</h1>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
            Live data from MongoDB · ipl_matches_2026 · orange_cap_2026 · purple_cap_2026
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: `1px solid ${activeTab === t.id ? t.color + "80" : "rgba(255,255,255,0.08)"}`,
                background: activeTab === t.id
                  ? `linear-gradient(135deg,${t.color}30,${t.color}10)`
                  : "rgba(255,255,255,0.03)",
                color: activeTab === t.id ? t.color : "#64748b",
                fontWeight: "700", fontSize: "13px", cursor: "pointer",
                letterSpacing: "0.05em",
                transition: "all 0.2s",
                boxShadow: activeTab === t.id ? `0 0 16px ${t.color}25` : "none",
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Active tab content */}
        {activeTab === "matches"    && <MatchesTab />}
        {activeTab === "orangecap"  && <OrangeCapTab />}
        {activeTab === "purplecap"  && <PurpleCapTab />}
      </div>
    </>
  );
}
