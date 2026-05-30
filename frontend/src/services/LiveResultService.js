/**
 * LiveResultService — Live scores + playoff refresh from API/MongoDB
 */
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function fetchLiveScores() {
  const { data } = await axios.get(`${API}/api/live-scores`);
  return data;
}

export async function refreshLiveCache() {
  const { data } = await axios.post(`${API}/api/live-scores/refresh`);
  return data;
}

export async function fetchPlayoffBracket() {
  const { data } = await axios.get(`${API}/api/playoffs/bracket`);
  return data;
}

export async function refreshPlayoffsFromLive() {
  const { data } = await axios.get(`${API}/api/playoffs/bracket`);
  return data;
}

export default {
  fetchLiveScores,
  refreshLiveCache,
  fetchPlayoffBracket,
  refreshPlayoffsFromLive,
};
