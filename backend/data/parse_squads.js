const fs = require('fs');
const path = require('path');

const rawFile = path.join(__dirname, 'raw_squads.txt');
const outputFile = path.join(__dirname, 'ipl_2026_master_squad.json');

const lines = fs.readFileSync(rawFile, 'utf8').split('\n');
const squads = [];
let currentTeam = '';

lines.forEach(line => {
  const trimmed = line.trim();
  if (!trimmed) return;
  
  if (trimmed.endsWith('TEAM') || ['MI', 'LSG', 'SRH', 'RCB', 'RR', 'GT', 'PBKS', 'DC', 'KKR', 'CSK'].includes(trimmed)) {
    currentTeam = trimmed.replace(' TEAM', '');
    return;
  }
  
  if (trimmed.startsWith('No') || trimmed.startsWith('Player')) {
    return; // Skip header
  }

  // The fields are tab separated. If not, we have to handle spaces.
  // The provided text uses actual tabs '\t' for the columns.
  const parts = trimmed.split('\t');
  if (parts.length >= 6) {
    squads.push({
      No: parseInt(parts[0], 10),
      Player: parts[1],
      Acquisition: parts[2],
      Type: parts[3],
      Role: parts[4],
      Price: parts[5],
      Team: currentTeam
    });
  } else {
    // try space separated matching: No Player Acquisition Type Role Price
    // Example: 1 Rohit Sharma Retained Indian (capped) Batter -
    const match = trimmed.match(/^(\d+)\s+(.+?)\s+(Retained|Trade|Auction)\s+(Indian \(capped\)|Indian \(uncapped\)|Overseas \(capped\)|Overseas \(uncapped\)|Indian|Overseas)\s+(Batter|Wicketkeeper|All-rounder|Bowler)\s+(.+)$/);
    if (match) {
       squads.push({
          No: parseInt(match[1], 10),
          Player: match[2],
          Acquisition: match[3],
          Type: match[4],
          Role: match[5],
          Price: match[6],
          Team: currentTeam
       });
    } else {
        console.log("Could not parse line:", trimmed);
    }
  }
});

fs.writeFileSync(outputFile, JSON.stringify(squads, null, 2));
console.log(`Parsed ${squads.length} players. Output stored in ${outputFile}`);
