/**
 * PlayoffCard — TBD placeholder (disabled) or live playoff matchup
 */
import "./PlayoffEngine.css";

const TEAM_COLORS = {
  MI: "#1E90FF", CSK: "#F9CD05", KKR: "#F8C300", RCB: "#D4101A",
  DC: "#0057A8", RR: "#EA1A85", SRH: "#F26522", GT: "#00B4D8",
  PBKS: "#DD1F2D", LSG: "#00BFFF", TBD: "#64748b",
};

export default function PlayoffCard({ card: match, active, onSelect }) {
  const disabled = match.disabled === true;
  
  const t1Name = match.team1?.name || match.team1?.code || match.homeTeam || match.team1 || "TBD";
  const t2Name = match.team2?.name || match.team2?.code || match.awayTeam || match.team2 || "TBD";
  const t1Code = match.team1?.code || match.homeTeam || match.team1 || "TBD";
  const t2Code = match.team2?.code || match.awayTeam || match.team2 || "TBD";

  const isLive = !disabled && (match.status === "live" || match.liveStatus === "LIVE");
  const isDone = !disabled && (match.status === "completed" || match.liveStatus === "FINISHED");
  const winner = typeof match.winner === 'object' ? match.winner?.code || match.winner?.name : match.winner;
  
  console.log("PLAYOFF:", match);

  return (
    <button
      type="button"
      className={`po-card ${active ? "po-card--active" : ""} ${disabled ? "po-card--disabled" : ""} ${isLive ? "po-card--live" : ""} ${isDone ? "po-card--done" : ""}`}
      onClick={() => !disabled && onSelect?.(match.matchId)}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}
    >
      <span className="po-card__stage">{match.stage || match.title}</span>
      
      <div className="po-card__matchup" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: '4px', marginTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ color: TEAM_COLORS[t1Code] || "#94a3b8" }}>{t1Name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ color: TEAM_COLORS[t2Code] || "#94a3b8" }}>{t2Name}</span>
        </div>
      </div>

      {(match.status === "completed" || match.liveStatus === "FINISHED") && (
        <div className="scoreRow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%', marginTop: '-40px', gap: '4px', fontSize: '0.85rem' }}>
          <span>{match.team1?.score || match.score_team_1 || ""}</span>
          <span>{match.team2?.score || match.score_team_2 || ""}</span>
        </div>
      )}

      {!disabled && winner && (
        <span className="po-card__winner" style={{ marginTop: '12px' }}>Winner: {winner} {match.result ? `- ${match.result}` : ''}</span>
      )}
    </button>
  );
}
