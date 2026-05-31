/**
 * PointsTableService — Load & sort IPL 2026 points table
 */
import axios from "axios";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

export async function fetchPointsTable() {
  const { data } = await axios.get(`${API}/api/season/points-table`);
  const rows = data.pointsTable || data.table || [];
  return normalizeTable(rows);
}

export function normalizeTable(rows = []) {
  return [...rows]
    .map((row, i) => ({
      team: row.team,
      played: row.played ?? 0,
      won: row.won ?? 0,
      lost: row.lost ?? 0,
      points: row.points ?? 0,
      nrr: row.nrr ?? 0,
      rank: row.rank ?? i + 1,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.nrr !== a.nrr) return b.nrr - a.nrr;
      return b.won - a.won;
    });
}

export function getTop4FromTable(table) {
  return normalizeTable(table).slice(0, 4).map((r) => r.team);
}

export default { fetchPointsTable, normalizeTable, getTop4FromTable };
