/**
 * generatePlayoffBracket.js — Client-side mirror of playoff rules
 */

export function sortPointsTable(table = []) {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.nrr !== a.nrr) return b.nrr - a.nrr;
    return (b.won || 0) - (a.won || 0);
  });
}

export function buildDisabledPlayoffCards() {
  return ["Qualifier 1", "Eliminator", "Qualifier 2", "Final"].map((stage, i) => ({
    key: ["Q1", "ELIM", "Q2", "FINAL"][i],
    matchId: 71 + i,
    stage,
    homeTeam: "TBD",
    awayTeam: "TBD",
    team1: "TBD",
    team2: "TBD",
    label: "TBD vs TBD",
    disabled: true,
    winner: null,
  }));
}

export function generatePlayoffBracket({ leagueComplete, top4 = [], q1, elim, q2, finalMatch }) {
  if (!leagueComplete || top4.length < 4) {
    return buildDisabledPlayoffCards();
  }

  const [t1, t2, t3, t4] = top4;
  return [
    { stage: "Qualifier 1", team1: t1, team2: t2, homeTeam: t1, awayTeam: t2, disabled: false },
    { stage: "Eliminator", team1: t3, team2: t4, homeTeam: t3, awayTeam: t4, disabled: false },
    {
      stage: "Qualifier 2",
      team1: q1?.loser || "TBD",
      team2: elim?.winner || "TBD",
      disabled: false,
    },
    {
      stage: "Final",
      team1: q1?.winner || "TBD",
      team2: q2?.winner || "TBD",
      disabled: false,
    },
  ].map((s, i) => ({
    ...s,
    key: ["Q1", "ELIM", "Q2", "FINAL"][i],
    matchId: 71 + i,
    label: `${s.team1} vs ${s.team2}`,
  }));
}

export default generatePlayoffBracket;
