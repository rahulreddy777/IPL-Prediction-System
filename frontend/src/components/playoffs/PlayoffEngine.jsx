/**
 * PlayoffEngine — Qualification in progress OR generated playoffs after league ends
 */
import { useState, useEffect, useCallback, useRef } from "react";
import PlayoffCard from "./PlayoffCard";
import { fetchPlayoffBracket } from "../../services/LiveResultService";
import "./PlayoffEngine.css";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws";
const REFRESH_MS = 15000;

function TeamBadge({ team, status }) {
  const confirmed = status === "CONFIRMED";
  return (
    <span className={`po-team-badge ${confirmed ? "po-team-badge--ok" : "po-team-badge--warn"}`}>
      {team} {confirmed ? "✅" : "⚠️"}
    </span>
  );
}

export default function PlayoffEngine({ onSelectMatch, activeMatchId }) {
  const [bracket, setBracket] = useState(null);
  const [updateBanner, setUpdateBanner] = useState(null);
  const [error, setError] = useState(null);
  const hashRef = useRef(null);

  const applyBracket = useCallback((data, showBanner = false) => {
    if (!data) return;
    if (showBanner && hashRef.current && data.hash !== hashRef.current) {
      const msg =
        data.message ||
        data.playoffStatus?.message ||
        "Playoffs updated from live results";
      setUpdateBanner(msg);
      setTimeout(() => setUpdateBanner(null), 5000);
    }
    hashRef.current = data.hash;
    setBracket(data);
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchPlayoffBracket();
      applyBracket(data, true);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [applyBracket]);

  useEffect(() => {
    load();
    const poll = setInterval(load, REFRESH_MS);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    let ws;
    let retryTimer;
    let active = true;

    const connect = () => {
      if (!active) return;
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("[PlayoffEngine][WS CONNECTED]");
        // Immediately fetch fresh bracket on (re)connect to catch any
        // PLAYOFF_BRACKET_UPDATE that fired while we were disconnected.
        load();
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (
            msg.type === "PLAYOFF_BRACKET_UPDATE" ||
            msg.type === "PLAYOFFS_UPDATED" ||
            msg.type === "POINTS_TABLE_UPDATE" ||
            msg.type === "POINTS_TABLE_UPDATED" ||
            msg.type === "MATCH_RESULTS_UPDATED" ||
            msg.type === "MATCH_COMPLETED" ||
            msg.type === "AUTO_REFRESH"
          ) {
            if (
              (msg.type === "PLAYOFF_BRACKET_UPDATE" || msg.type === "PLAYOFFS_UPDATED") &&
              (msg.playoffs || msg.cards)
            ) {
              applyBracket(msg, true);
            } else {
              load();
            }
            console.log("[PlayoffEngine][PLAYOFF AUTO UPDATED]", msg.type);
          }
        } catch {
          /* ignore parse errors */
        }
      };

      ws.onerror = () => {
        // Errors are followed by onclose, which handles reconnect.
      };

      ws.onclose = () => {
        if (!active) return;
        console.log("[PlayoffEngine][WS DISCONNECTED] — retrying in 5s");
        retryTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      active = false;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [load, applyBracket]);

  if (!bracket) {
    return <p className="po-loading">Loading playoff bracket…</p>;
  }

  const {
    leagueComplete,
    playoffStatus,
    remainingLeagueMatches,
    qualifiedTeams,
    contenders,
    top4,
    playoffs,
  } = bracket;

  const cards = playoffs || bracket.cards || [];

  return (
    <section className="po-engine">
      <header className="po-engine__header">
        <h3 className="po-engine__title">Playoffs & Final</h3>
        <p className="po-engine__sub">From live points table — playoffs lock after league match 70</p>
      </header>

      {updateBanner && <div className="po-banner">{updateBanner}</div>}
      {error && <div className="po-error">{error}</div>}

      {leagueComplete && (
        <div className="po-qualification po-qualification--confirmed">
          <p className="po-qualification__title">Top 4 confirmed</p>
          <p className="po-qualification__desc">{playoffStatus?.description}</p>
        </div>
      )}

      {!leagueComplete && playoffStatus && (
        <div className="po-qualification">
          <p className="po-qualification__title">{playoffStatus.subtitle || "Playoff teams not finalized"}</p>
          <p className="po-qualification__msg">{playoffStatus.message}</p>
          <p className="po-qualification__desc">{playoffStatus.description}</p>

          <div className="po-qualification__remaining">
            <span className="po-waiting__label">Remaining:</span>
            <ul>
              {(remainingLeagueMatches || [])
                .filter((m) => m.status !== "FINISHED")
                .map((m) => (
                  <li key={m.matchId}>
                    {m.homeTeam} vs {m.awayTeam}
                    {m.status === "LIVE" ? " (LIVE)" : ""}
                  </li>
                ))}
            </ul>
          </div>

          {qualifiedTeams?.length > 0 && (
            <div className="po-qualification__group">
              <span className="po-waiting__label">Qualification contenders</span>
              <div className="po-team-badges">
                {qualifiedTeams.map((t) => (
                  <TeamBadge key={t.team} team={t.team} status={t.status} />
                ))}
              </div>
            </div>
          )}

          {contenders?.length > 0 && (
            <div className="po-qualification__group">
              <div className="po-team-badges">
                {contenders.map((t) => (
                  <TeamBadge key={t.team} team={t.team} status={t.status} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {leagueComplete && top4?.length > 0 && (
        <div className="po-top4 po-top4--locked">
          <span className="po-banner po-banner--inline">
            {playoffStatus?.message || "Top 4 confirmed"}
          </span>
          <div className="po-top4__row">
            <span>Top 4:</span>
            {top4.map((t, i) => (
              <span key={t} className="po-top4__team">
                {i + 1}. {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="po-cards">
        {cards.map((card) => (
          <PlayoffCard
            key={card.key || card.matchId}
            card={card}
            active={activeMatchId === card.matchId}
            onSelect={onSelectMatch}
          />
        ))}
      </div>
    </section>
  );
}
