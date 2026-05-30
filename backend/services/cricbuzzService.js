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

module.exports = {
  getLiveScores
};
