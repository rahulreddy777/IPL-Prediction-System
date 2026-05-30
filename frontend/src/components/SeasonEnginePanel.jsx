/**
 * SeasonEnginePanel.jsx — Official standings + live match updates
 */
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import "./SeasonEnginePanel.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws";

const TEAM_COLORS = {
  MI: "#1E90FF", CSK: "#F9CD05", KKR: "#F8C300", RCB: "#D4101A",
  DC: "#0057A8", RR: "#EA1A85", SRH: "#F26522", GT: "#00B4D8",
  PBKS: "#DD1F2D", LSG: "#00BFFF",
};

/** Official IPL 2026 table after Match 67 (before M68) */
const OFFICIAL_TABLE_2026 = {
  season: 2026,
  type: "points_table",
  updatedAt: "2026-05-23",
  teams: [
    { rank: 1, team: "RCB", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.783, status: "Q" },
    { rank: 2, team: "GT", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.695, status: "Q" },
    { rank: 3, team: "SRH", played: 14, won: 9, lost: 5, noResult: 0, points: 18, nrr: 0.524, status: "Q" },
    { rank: 4, team: "RR", played: 13, won: 7, lost: 6, noResult: 0, points: 14, nrr: 0.083, status: "Q" },
    { rank: 5, team: "PBKS", played: 13, won: 6, lost: 6, noResult: 1, points: 13, nrr: 0.227, status: "E" },
    { rank: 6, team: "KKR", played: 13, won: 6, lost: 6, noResult: 1, points: 13, nrr: 0.011, status: "E" },
    { rank: 7, team: "CSK", played: 14, won: 6, lost: 8, noResult: 0, points: 12, nrr: -0.345, status: "E" },
    { rank: 8, team: "DC", played: 13, won: 6, lost: 7, noResult: 0, points: 12, nrr: -0.871, status: "E" },
    { rank: 9, team: "MI", played: 13, won: 4, lost: 9, noResult: 0, points: 8, nrr: -0.51, status: "E" },
    { rank: 10, team: "LSG", played: 13, won: 4, lost: 9, noResult: 0, points: 8, nrr: -0.702, status: "E" },
  ],
};

function normalizeTable(rows) {
  if (!Array.isArray(rows)) return [];
  
  // Defensive deduplication by team key
  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    const teamKey = row.team || row.Team || '';
    if (teamKey && !seen.has(teamKey)) {
      seen.add(teamKey);
      deduped.push(row);
    }
  }

  return deduped
    .map((row, i) => ({
      team: row.team,
      played: row.played ?? 0,
      won: row.won ?? 0,
      lost: row.lost ?? 0,
      noResult: row.noResult ?? 0,
      points: row.points ?? 0,
      nrr: row.nrr ?? 0,
      status: formatStatus(row.status),
      rank: row.rank ?? i + 1,
    }))
    .sort((a, b) => a.rank - b.rank);
}

function formatStatus(s) {
  const u = String(s || "").toUpperCase();
  if (u === "Q" || u === "QUALIFIED") return "Q";
  if (u === "E" || u === "ELIMINATED") return "E";
  return s || "—";
}

function eventDedupKey(msg) {
  return [
    msg.type,
    msg.matchId ?? msg.matchNumber ?? "",
    msg.winner ?? "",
    msg.champion ?? "",
    msg.phase ?? "",
    msg.message ?? "",
  ].join("|");
}

function formatEventLabel(ev) {
  const mid = ev.matchId ?? ev.matchNumber;
  switch (ev.type) {
    case "MATCH_RESULT_UPDATE":
      return mid
        ? `Match ${mid} result — ${ev.team1 || "?"} vs ${ev.team2 || "?"}${ev.winner ? ` · ${ev.winner} won` : ""}`
        : `Match result${ev.winner ? ` · ${ev.winner} won` : ""}`;
    case "PLAYOFF_UPDATE":
      return `Playoff · ${ev.label || `M${mid}`}${ev.winner ? ` · ${ev.winner}` : ""}`;
    case "PLAYOFF_QUALIFIERS":
      return `Top 4: ${(ev.qualifiedTeams || []).join(", ")}`;
    case "FINAL_UPDATE":
      return `Champion: ${ev.champion}${ev.runnerUp ? ` · Runner-up ${ev.runnerUp}` : ""}`;
    case "SEASON_ENGINE_START":
      return "Season engine started";
    case "SEASON_ENGINE_PHASE":
      return `Phase: ${ev.phase || "—"}`;
    case "SEASON_LEAGUE_COMPLETE":
      return "League stage M68–70 complete";
    case "SEASON_ENGINE_COMPLETE":
      return `Season complete${ev.champion ? ` · ${ev.champion}` : ""}`;
    case "POINTS_TABLE_UPDATE":
      if (mid === "official_import") return "Official standings loaded";
      if (mid === "league_complete") return "Standings after league M68–70";
      if (mid === "season_complete") return "Final standings snapshot";
      if (typeof mid === "number") return `Standings updated after M${mid}`;
      return "Points table updated";
    case "ERROR":
      return ev.message || "Something went wrong";
    default:
      return ev.type;
  }
}

function eventTone(type) {
  if (type === "ERROR") return "error";
  if (type === "FINAL_UPDATE" || type === "SEASON_ENGINE_COMPLETE") return "success";
  if (type === "MATCH_RESULT_UPDATE" || type === "POINTS_TABLE_UPDATE") return "info";
  return "default";
}

export default function SeasonEnginePanel() {
  const [pointsTable, setPointsTable] = useState([]);
  const [tableMeta, setTableMeta] = useState({ updatedAt: "2026-05-23", source: "official" });
  const [champion, setChampion] = useState(null);
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(false);
  const [wsOn, setWsOn] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const wsRef = useRef(null);
  const seenEventsRef = useRef(new Set());

  const applyPointsTable = useCallback((table, meta = {}) => {
    if (table?.length) {
      setPointsTable(normalizeTable(table));
      setTableMeta((m) => ({ ...m, ...meta }));
      setErrorBanner(null);
    }
  }, []);

  const pushEvent = useCallback((msg) => {
    const key = eventDedupKey(msg);
    if (seenEventsRef.current.has(key)) return;
    seenEventsRef.current.add(key);
    const label = formatEventLabel(msg);
    setEvents((prev) => [
      {
        ...msg,
        label,
        tone: eventTone(msg.type),
        at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      },
      ...prev,
    ].slice(0, 15));
  }, []);

  const loadPointsTable = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/season/points-table`);
      if (data.pointsTable?.length) {
        applyPointsTable(data.pointsTable, { source: "mongodb", updatedAt: new Date().toLocaleDateString() });
        return true;
      }
    } catch {
      /* fallback below */
    }
    return false;
  }, [applyPointsTable]);

  const loadOfficialTable = useCallback(async () => {
    setRunning(true);
    setErrorBanner(null);
    try {
      const { data } = await axios.post(`${API}/api/season/set-points-table`, OFFICIAL_TABLE_2026);
      applyPointsTable(data.pointsTable || OFFICIAL_TABLE_2026.teams, {
        source: "official",
        updatedAt: OFFICIAL_TABLE_2026.updatedAt,
      });
      pushEvent({ type: "POINTS_TABLE_UPDATE", matchId: "official_import" });
    } catch (e) {
      applyPointsTable(OFFICIAL_TABLE_2026.teams, {
        source: "official (local)",
        updatedAt: OFFICIAL_TABLE_2026.updatedAt,
      });
      setErrorBanner(
        e.response?.data?.error ||
          "Backend offline — showing official table locally. Start backend to save to MongoDB."
      );
    } finally {
      setRunning(false);
    }
  }, [applyPointsTable, pushEvent]);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/season/status`);
      if (data.pointsTable?.length) {
        applyPointsTable(data.pointsTable, { source: "mongodb" });
      }
      if (data.champion) setChampion(data.champion);
    } catch {
      /* use official fallback on first paint */
    }
  }, [applyPointsTable]);

  const handleWsMessage = useCallback(
    (msg) => {
      const seasonTypes = new Set([
        "MATCH_RESULT_UPDATE",
        "PLAYOFF_UPDATE",
        "PLAYOFF_QUALIFIERS",
        "FINAL_UPDATE",
        "SEASON_ENGINE_START",
        "SEASON_ENGINE_COMPLETE",
        "SEASON_LEAGUE_COMPLETE",
        "SEASON_ENGINE_PHASE",
        "POINTS_TABLE_UPDATE",
        "AUTO_REFRESH",
      ]);
      if (!seasonTypes.has(msg.type)) return;

      if (msg.type === "AUTO_REFRESH") {
        loadPointsTable();
        return;
      }

      pushEvent(msg);

      const table = msg.updatedPointsTable || msg.updatedTable;
      if (table?.length) {
        applyPointsTable(table, { source: "live", updatedAt: new Date().toLocaleDateString() });
      }

      if (msg.type === "FINAL_UPDATE" && msg.champion) {
        setChampion({
          championTeam: msg.champion,
          runnerUp: msg.runnerUp,
        });
      }

      if (msg.type === "SEASON_ENGINE_COMPLETE") {
        loadPointsTable();
      }
    },
    [pushEvent, applyPointsTable, loadPointsTable]
  );

  useEffect(() => {
    (async () => {
      const ok = await loadPointsTable();
      if (!ok) {
        applyPointsTable(OFFICIAL_TABLE_2026.teams, {
          source: "official",
          updatedAt: OFFICIAL_TABLE_2026.updatedAt,
        });
      }
      await loadStatus();
    })();

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setWsOn(true);
      ws.onmessage = (ev) => {
        try {
          handleWsMessage(JSON.parse(ev.data));
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setWsOn(false);
        setTimeout(connect, 5000);
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, [loadPointsTable, loadStatus, handleWsMessage, applyPointsTable]);

  const syncMatch68 = async () => {
    setRunning(true);
    setErrorBanner(null);
    try {
      const { data } = await axios.post(`${API}/api/season/sync-match-68`, {
        allowPredicted: true,
      });
      if (data.skipped) {
        pushEvent({
          type: "ERROR",
          message: data.reason === "already_processed"
            ? "Match 68 already applied to standings"
            : data.reason || "Skipped",
        });
      } else {
        const table = data.updatedPointsTable;
        if (table?.length) applyPointsTable(table, { source: "after M68" });
        pushEvent({
          type: "MATCH_RESULT_UPDATE",
          matchId: 68,
          winner: data.winner,
          team1: "LSG",
          team2: "PBKS",
        });
        await loadPointsTable();
      }
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setErrorBanner(msg);
      pushEvent({ type: "ERROR", message: msg });
    } finally {
      setRunning(false);
    }
  };

  const clearEvents = () => {
    seenEventsRef.current.clear();
    setEvents([]);
  };

  return (
    <section className="season-engine">
      <header className="season-engine__header">
        <div>
          <h2 className="season-engine__title">IPL 2026 Points Table</h2>
          <p className="season-engine__sub">
            After Match 67 · Next: M68 LSG vs PBKS ·{" "}
            <span className={wsOn ? "season-engine__ws-on" : "season-engine__ws-off"}>
              {wsOn ? "Live" : "Reconnecting…"}
            </span>
          </p>
        </div>
        <div className="season-engine__actions">
          <button type="button" onClick={loadOfficialTable} disabled={running} className="season-engine__primary">
            {running ? "Loading…" : "Load official table"}
          </button>
          <button type="button" onClick={loadPointsTable} disabled={running}>
            Refresh from DB
          </button>
          <button type="button" onClick={syncMatch68} disabled={running} className="season-engine__accent">
            Apply Match 68
          </button>
        </div>
      </header>

      {errorBanner && (
        <div className="season-engine__alert" role="alert">
          {errorBanner}
          <button type="button" onClick={() => setErrorBanner(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <p className="season-engine__meta">
        Source: <strong>{tableMeta.source}</strong>
        {tableMeta.updatedAt && <> · Updated {tableMeta.updatedAt}</>}
      </p>

      {champion?.championTeam && (
        <div className="season-engine__champion">
          <span className="season-engine__trophy">🏆</span>
          <div>
            <div className="season-engine__champ-name" style={{ color: TEAM_COLORS[champion.championTeam] }}>
              {champion.championTeam} — simulated champion
            </div>
            <div className="season-engine__runner">Runner-up: {champion.runnerUp}</div>
            <button type="button" className="season-engine__dismiss" onClick={() => setChampion(null)}>
              Hide
            </button>
          </div>
        </div>
      )}

      <div className="season-engine__grid">
        <div className="season-engine__card season-engine__card--table">
          <div className="season-engine__card-head">
            <h3>Standings</h3>
            <span className="season-engine__legend">
              <span className="season-engine__q">Q</span> Playoffs
            </span>
          </div>
          <div className="season-engine__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>L</th>
                  <th>Pts</th>
                  <th>NRR</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.map((row) => (
                  <tr
                    key={row.team}
                    className={row.status === "Q" ? "season-engine__qualified" : ""}
                  >
                    <td>{row.rank}</td>
                    <td style={{ color: TEAM_COLORS[row.team], fontWeight: 700 }}>{row.team}</td>
                    <td>{row.played}</td>
                    <td>{row.won}</td>
                    <td>{row.lost}</td>
                    <td className="season-engine__pts">{row.points}</td>
                    <td className={row.nrr >= 0 ? "season-engine__nrr-pos" : "season-engine__nrr-neg"}>
                      {typeof row.nrr === "number" ? row.nrr.toFixed(3) : row.nrr}
                    </td>
                    <td>
                      <span className={`season-engine__badge season-engine__badge--${row.status === "Q" ? "q" : "e"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pointsTable.length === 0 && (
            <p className="season-engine__empty">Click “Load official table” to show standings.</p>
          )}
        </div>

        <div className="season-engine__card">
          <div className="season-engine__card-head">
            <h3>Activity</h3>
            <button type="button" className="season-engine__clear" onClick={clearEvents}>
              Clear
            </button>
          </div>
          <ul className="season-engine__events">
            {events.length === 0 && (
              <li className="season-engine__empty">
                Updates appear here when Match 68 finishes or standings change.
              </li>
            )}
            {events.map((ev, i) => (
              <li key={`${eventDedupKey(ev)}-${i}`} className={`season-engine__event season-engine__event--${ev.tone}`}>
                <span className="season-engine__event-label">{ev.label}</span>
                <span className="season-engine__time">{ev.at}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <details className="season-engine__advanced">
        <summary>Advanced simulation (optional)</summary>
        <p className="season-engine__hint">
          Only use if you want AI to simulate M68–70 and playoffs. This can overwrite the official table.
        </p>
        <button
          type="button"
          className="season-engine__run"
          disabled={running}
          onClick={async () => {
            if (!window.confirm("Run full AI simulation? This may change the points table.")) return;
            setRunning(true);
            seenEventsRef.current.clear();
            try {
              const { data } = await axios.post(`${API}/api/season/run-full`);
              if (data.skipped) {
                pushEvent({ type: "ERROR", message: data.message || "Already running" });
              } else if (data.league?.updatedPointsTable) {
                applyPointsTable(data.league.updatedPointsTable, { source: "simulation" });
              }
            } catch (e) {
              pushEvent({ type: "ERROR", message: e.response?.data?.error || e.message });
            } finally {
              setRunning(false);
              await loadPointsTable();
            }
          }}
        >
          Run full season simulation
        </button>
      </details>
    </section>
  );
}
