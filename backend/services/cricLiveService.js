/**
 * @deprecated Use liveScoreService.js — thin delegate (no direct API calls)
 */
const liveScoreService = require("./liveScoreService");

module.exports = {
  getLiveMatchData: () => liveScoreService.getLiveMatchData(),
  _clearCache: () => liveScoreService.clearCache(),
};
