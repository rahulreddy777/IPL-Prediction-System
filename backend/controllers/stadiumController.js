const { predictionDB } = require("../config/db");

exports.getStadiums = async (req, res) => {
  try {
    const rawStadiums = await predictionDB.collection("pitch_analysis").find({}).toArray();
    
    // Map to frontend structure
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

      // Match actual filenames in backend/data/stadiums/
      const nameLower = (st.name || "").toLowerCase();
      let filename = `${st.name}, ${st.city}.png`; // fallback
      let soil = "Mixed Soil";

      if (nameLower.includes("wankhede")) { 
        soil = "Red Soil"; tip = "Sea breeze = true bounce + high boundary% (>18%)"; 
        filename = "Wankhede, Mumbai.png";
      }
      else if (nameLower.includes("chinnaswamy")) { 
        soil = "Mixed Soil"; tip = "Smallest IPL boundaries - SR 160+ standard"; 
        filename = "M.Chinnaswamy, Bengaluru.png";
      }
      else if (nameLower.includes("modi") || nameLower.includes("ahmedabad")) { 
        soil = "Black/Red Mix"; tip = "Belter pitch - T20WC 2026 avg score 218"; 
        filename = "Narendra Modi, Ahmedabad.png";
      }
      else if (nameLower.includes("sawai") || nameLower.includes("jaipur")) { 
        soil = "Black Soil"; tip = "Large square boundaries, favors gap-finders"; 
        filename = "Sawai Mansingh, Jaipur.png";
      }
      else if (nameLower.includes("chidambaram") || nameLower.includes("chepauk")) { 
        soil = "Dry/Slow"; tip = "Classic slow deck - ball grips and turns"; tierName = "TACTICAL GRIND"; tierLevel=2; color="#eab308"; 
        filename = "Chepauk, Chennai.png";
      }
      else if (nameLower.includes("ekana")) { 
        soil = "Black Soil"; tip = "Low bounce - rewards cutters and variations"; tierName = "TACTICAL GRIND"; tierLevel=2; color="#eab308"; 
        filename = "Ekana, Lucknow.png";
      }
      else if (nameLower.includes("eden")) { 
        soil = "Black Cotton"; tip = "Slows significantly after 12th over"; 
        filename = "Eden Gardens, Kolkata.png";
      }
      else if (nameLower.includes("jaitley")) { 
        soil = "Slow/Low"; tip = "Variable bounce - high caught at boundary prob"; 
        filename = "Arun-Jaitley-Stadium-Delhi.jpg";
      }
      else if (nameLower.includes("dharamsala")) { 
        soil = "Cool/Lush"; tip = "1457m altitude + grass = massive swing for pace"; tierName = "SEAMER'S DELIGHT"; tierLevel=1; color="#06b6d4"; 
        filename = "HPCA, Dharamsala.png";
      }
      else if (nameLower.includes("mullanpur")) { 
        soil = "Hard/Sticky"; tip = "Two-paced surface - inconsistent carry"; tierName = "SEAMER'S DELIGHT"; tierLevel=1; color="#06b6d4"; 
        filename = "Mullanpur, Chandigarh.png";
      }
      else if (nameLower.includes("guwahati") || nameLower.includes("barsapara")) { 
        soil = "High Humidity"; tip = "Significant night swing - chasing difficult"; tierName = "SEAMER'S DELIGHT"; tierLevel=1; color="#06b6d4"; 
        filename = "ACA, Guwahati.jpg";
      }
      else if (nameLower.includes("raipur")) {
        soil = "Medium"; tip = "Good balance of bat and ball";
        filename = "Shaheed Veer Narayan Singh Stadium raipur.jpg";
      }
      else if (nameLower.includes("rajiv") || nameLower.includes("hyderabad")) {
        soil = "Black Soil"; tip = "True bounce early, can grip later for spinners under lights"; tierName = "BATTING PARADISE"; tierLevel=3; color="#f43f5e";
        filename = "Rajiv Gandhi International Cricket Stadium,hyderabad.png";
      }
      
      const API_URL = process.env.VITE_API_URL || 'http://localhost:5000';
      let image = `${API_URL}/data/stadiums/${filename}`;

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
        image
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching stadiums:", error);
    res.status(500).json({ error: error.message });
  }
};