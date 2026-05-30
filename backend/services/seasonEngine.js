const ws = require("./websocketServer");

exports.update = async (data) => {
  ws.broadcast({
    type: "UPDATED",
    matchId: data.matchInfo?.matchId || data.id || null
  });
};
