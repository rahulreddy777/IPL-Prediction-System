const { predictionDB } = require("../config/db");

// Map each stadium to a clean slug served from frontend/public/stadiums/
const STADIUM_IMAGE_MAP = {
  wankhede:     "/stadiums/wankhede.png",
  chinnaswamy:  "/stadiums/chinnaswamy.png",
  modi:         "/stadiums/modiahmedabad.png",
  ahmedabad:    "/stadiums/modiahmedabad.png",
  sawai:        "/stadiums/sawaijaipur.png",
  jaipur:       "/stadiums/sawaijaipur.png",
  chidambaram:  "/stadiums/chepauk.png",
  chepauk:      "/stadiums/chepauk.png",
  ekana:        "/stadiums/ekanasports.png",
  lucknow:      "/stadiums/ekanasports.png",
  eden:         "/stadiums/edengardens.png",
  jaitley:      "/stadiums/arunjaitley.jpg",
  delhi:        "/stadiums/arunjaitley.jpg",
  dharamsala:   "/stadiums/dharamsala.png",
  mullanpur:    "/stadiums/mullanpur.png",
  chandigarh:   "/stadiums/mullanpur.png",
  guwahati:     "/stadiums/guwahati.jpg",
  barsapara:    "/stadiums/guwahati.jpg",
  raipur:       "/stadiums/raipur.png",
  rajiv:        "/stadiums/hyderabad.png",
  hyderabad:    "/stadiums/hyderabad.png",
};

function getStadiumImage(name = "") {
  const lower = name.toLowerCase();
  for (const [key, path] of Object.entries(STADIUM_IMAGE_MAP)) {
    if (lower.includes(key)) return path;
  }
  return "/stadiums/fallback.png";
}

exports.getStadiums = async (req, res) => {
  try {
    const rawStadiums = await predictionDB.collection("pitch_analysis").find({}).toArray();

    const mapped = rawStadiums.map(st => {
      let tierName = "BATTING PARADISE";
      let tierLevel = 3;
      let color = "#f43f5e";
      let tip = "Batting friendly pitch";

      if (st.type === "balanced_batting_shifted" || st.type === "balanced") {
        tierName = "TACTICAL GRIND";
        tierLevel = 2;
        color = "#eab308";
        tip = "Balanced pitch - tactical approach needed";
      } else if (st.type === "bowling_friendly" || st.type === "seam_friendly" || st.type === "spin_friendly") {
        tierName = "SEAMER'S DELIGHT";
        tierLevel = 1;
        color = "#06b6d4";
        tip = "Bowling friendly - expect low scores";
      }

      const nameLower = (st.name || "").toLowerCase();
      let soil = "Mixed Soil";

      if (nameLower.includes("wankhede")) {
        soil = "Red Soil"; tip = "Sea breeze = true bounce + high boundary% (>18%)";
      } else if (nameLower.includes("chinnaswamy")) {
        soil = "Mixed Soil"; tip = "Smallest IPL boundaries - SR 160+ standard";
      } else if (nameLower.includes("modi") || nameLower.includes("ahmedabad")) {
        soil = "Black/Red Mix"; tip = "Belter pitch - T20WC 2026 avg score 218";
      } else if (nameLower.includes("sawai") || nameLower.includes("jaipur")) {
        soil = "Black Soil"; tip = "Large square boundaries, favors gap-finders";
      } else if (nameLower.includes("chidambaram") || nameLower.includes("chepauk")) {
        soil = "Dry/Slow"; tip = "Classic slow deck - ball grips and turns";
        tierName = "TACTICAL GRIND"; tierLevel = 2; color = "#eab308";
      } else if (nameLower.includes("ekana")) {
        soil = "Black Soil"; tip = "Low bounce - rewards cutters and variations";
        tierName = "TACTICAL GRIND"; tierLevel = 2; color = "#eab308";
      } else if (nameLower.includes("eden")) {
        soil = "Black Cotton"; tip = "Slows significantly after 12th over";
      } else if (nameLower.includes("jaitley")) {
        soil = "Slow/Low"; tip = "Variable bounce - high caught at boundary prob";
      } else if (nameLower.includes("dharamsala")) {
        soil = "Cool/Lush"; tip = "1457m altitude + grass = massive swing for pace";
        tierName = "SEAMER'S DELIGHT"; tierLevel = 1; color = "#06b6d4";
      } else if (nameLower.includes("mullanpur")) {
        soil = "Hard/Sticky"; tip = "Two-paced surface - inconsistent carry";
        tierName = "SEAMER'S DELIGHT"; tierLevel = 1; color = "#06b6d4";
      } else if (nameLower.includes("guwahati") || nameLower.includes("barsapara")) {
        soil = "High Humidity"; tip = "Significant night swing - chasing difficult";
        tierName = "SEAMER'S DELIGHT"; tierLevel = 1; color = "#06b6d4";
      } else if (nameLower.includes("raipur")) {
        soil = "Medium"; tip = "Good balance of bat and ball";
      } else if (nameLower.includes("rajiv") || nameLower.includes("hyderabad")) {
        soil = "Black Soil"; tip = "True bounce early, can grip later for spinners under lights";
        tierName = "BATTING PARADISE"; tierLevel = 3; color = "#f43f5e";
      }

      // Use frontend public path — works on localhost AND production (Render)
      const image = getStadiumImage(st.name + " " + (st.city || ""));

      return {
        _id: st._id,
        tierName,
        tierLevel,
        color,
        name: `${st.name}, ${st.city}`,
        avgScore: st.avg_first_innings?.toString() || "170",
        chase: `${Math.round((st.chase_advantage || 0.5) * 100)}%`,
        soil,
        tip,
        image,
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching stadiums:", error);
    res.status(500).json({ error: error.message });
  }
};