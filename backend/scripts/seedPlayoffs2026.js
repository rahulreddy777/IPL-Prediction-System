/**
 * Reset playoff matches 71–74 to official schedule (upcoming unless real result)
 * node scripts/seedPlayoffs2026.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { predictionDB } = require("../config/db");
const { ensurePlayoffMatches } = require("../services/iplMatchesService");

async function main() {
  await predictionDB.asPromise();
  await predictionDB.collection("ipl_matches_2026").updateMany(
    { matchNumber: { $in: [71, 72, 73, 74] } },
    {
      $set: {
        status: "upcoming",
        winner: null,
        result: null,
        "team1.score": null,
        "team2.score": null,
        simulatedAt: null,
      },
    }
  );
  await ensurePlayoffMatches(predictionDB);
  console.log("[seedPlayoffs2026] Playoffs 71–74 set to upcoming (RCB vs GT, SRH vs RR)");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
