const axios = require("axios");

async function getLiveScores() {
  const options = {
    method: "GET",
    url: "https://free-cricbuzz-cricket-api.p.rapidapi.com/cricket-livescores",
    headers: {
      "x-rapidapi-key": process.env.RAPID_API_KEY,
      "x-rapidapi-host": "free-cricbuzz-cricket-api.p.rapidapi.com"
    }
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (e) {
    console.error("RapidAPI Error:", e.response?.status, e.response?.data?.message || e.message);
    return [];
  }
}

async function fetchMatchInfo(matchId) {
  const options = {
    method: "GET",
    url: "https://free-cricbuzz-cricket-api.p.rapidapi.com/cricket-match-info",
    params: { matchid: matchId },
    headers: {
      "x-rapidapi-key": process.env.RAPID_API_KEY,
      "x-rapidapi-host": "free-cricbuzz-cricket-api.p.rapidapi.com"
    }
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (e) {
    console.error("RapidAPI Error (match info):", e.response?.status, e.response?.data?.message || e.message);
    return null;
  }
}

async function refreshCricbuzzLive(force) {
  // Simple wrapper around getLiveScores
  const data = await getLiveScores();
  return { data, source: "cricbuzz-rapidapi" };
}

async function getCricbuzzCache() {
  // Simple stub if they need cache
  return null;
}

module.exports = {
  getLiveScores,
  fetchMatchInfo,
  refreshCricbuzzLive,
  getCricbuzzCache
};
