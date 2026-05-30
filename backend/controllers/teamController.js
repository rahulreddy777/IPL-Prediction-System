const Team = require("../models/Team");
const { predictionDB } = require("../config/db");

exports.getTeams = async (req, res) => {
  const teams = await Team.find();
  const plainTeams = teams.map(t => t.toObject());
  
  try {
    const allSquads = await predictionDB.collection("players_2026").find({}).toArray();
    
    // Group them by team
    const squadsByTeam = {};
    for (const player of allSquads) {
      const t = player.Team?.toLowerCase();
      if (!t) continue;
      if (!squadsByTeam[t]) squadsByTeam[t] = [];
      squadsByTeam[t].push(player);
    }
    
    plainTeams.forEach(team => {
      const teamCode = (team.shortName || "").toLowerCase();
      const squadList = squadsByTeam[teamCode] || [];
      team.stats = {
        squad: squadList.length,
        retained: squadList.filter(p => p.Acquisition === 'Retained').length,
        overseas: squadList.filter(p => (p.Type || "").includes('Overseas')).length
      };
    });
  } catch (err) {
    console.error("Failed to inject squad stats into teams:", err);
  }
  
  res.json(plainTeams);
}

exports.addTeam = async (req, res) => {

 const team = new Team(req.body)

 await team.save()

 res.json(team)

}