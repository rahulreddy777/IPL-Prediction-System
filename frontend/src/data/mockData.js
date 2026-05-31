export const teamsData = [
  {
    id: 'CSK',
    name: 'Chennai Super Kings',
    shortName: 'CSK',
    stadium: 'Chennai • Chepauk',
    titles: 5,
    stats: { squad: 26, retained: 12, overseas: 9 },
    logo: '/teams/csk.jpg',
    color: '#F9CD05',
    captain: {
      name: 'Ruturaj Gaikwad',
      role: 'Captain • Right-hand Bat',
      captainStats: { matches: 19, won: 8, lost: 11, winPct: '42.11%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/ruthuraj  gaikwad CSK.png`
    }
  },
  {
    id: 'MI',
    name: 'Mumbai Indians',
    shortName: 'MI',
    stadium: 'Mumbai • Wankhede',
    titles: 5,
    stats: { squad: 25, retained: 11, overseas: 6 },
    logo: '/teams/mi.jpg',
    color: '#1E90FF',
    captain: {
      name: 'Hardik Pandya',
      role: 'Captain • All-rounder',
      captainStats: { matches: 60, won: 35, lost: 25, winPct: '58.33%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/hardik pandya MI.jpg`
    }
  },
  {
    id: 'KKR',
    name: 'Kolkata Knight Riders',
    shortName: 'KKR',
    stadium: 'Kolkata • Eden Gardens',
    titles: 3,
    stats: { squad: 24, retained: 12, overseas: 6 },
    logo: '/teams/kkr.jpg',
    color: '#7B2FBE',
    captain: {
      name: 'Ajinkya Rahane',
      role: 'Captain • Right-hand Bat',
      captainStats: { matches: 38, won: 14, lost: 23, winPct: '36.84%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/ajinkya rahane KKR.jpeg`
    }
  },
  {
    id: 'RR',
    name: 'Rajasthan Royals',
    shortName: 'RR',
    stadium: 'Jaipur • Sawai Mansingh',
    titles: 1,
    stats: { squad: 26, retained: 13, overseas: 8 },
    logo: '/teams/rr.jpg',
    color: '#EA1A85',
    captain: {
      name: 'Riyan Parag',
      role: 'Captain • Right-hand Bat',
      captainStats: { matches: 8, won: 2, lost: 6, winPct: '25.00%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/Riyan parag 💗.jpg`
    }
  },
  {
    id: 'RCB',
    name: 'Royal Challengers Bengaluru',
    shortName: 'RCB',
    stadium: 'Bengaluru • Chinnaswamy',
    titles: 1,
    stats: { squad: 25, retained: 14, overseas: 8 },
    logo: '/teams/rcb.jpg',
    color: '#D4101A',
    captain: {
      name: 'Rajat Patidar',
      role: 'Captain • Right-hand Bat',
      captainStats: { matches: 15, won: 11, lost: 4, winPct: '73.33%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/rajat patidar RCB.jpg`
    }
  },
  {
    id: 'DC',
    name: 'Delhi Capitals',
    shortName: 'DC',
    stadium: 'Delhi • Arun Jaitley',
    titles: 0,
    stats: { squad: 24, retained: 13, overseas: 6 },
    logo: '/teams/dc.jpg',
    color: '#0057A8',
    captain: {
      name: 'Axar Patel',
      role: 'Captain • All-rounder',
      captainStats: { matches: 13, won: 5, lost: 6, winPct: '38.46%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/Axar-Patel DC.jpg`
    }
  },
  {
    id: 'SRH',
    name: 'Sunrisers Hyderabad',
    shortName: 'SRH',
    stadium: 'Hyderabad • Uppal',
    titles: 1,
    stats: { squad: 25, retained: 14, overseas: 7 },
    logo: '/teams/srh.jpg',
    color: '#F26522',
    captain: {
      name: 'Ishan Kishan (Interim)',
      role: 'Captain • WK-Batter',
      captainStats: { matches: 0, won: 0, lost: 0, winPct: '0.00%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/pat cummins.jpg`
    }
  },
  {
    id: 'GT',
    name: 'Gujarat Titans',
    shortName: 'GT',
    stadium: 'Ahmedabad • Narendra Modi',
    titles: 1,
    stats: { squad: 25, retained: 16, overseas: 7 },
    logo: '/teams/gt.jpg',
    color: '#00B4D8',
    captain: {
      name: 'Shubman Gill',
      role: 'Captain • Right-hand Bat',
      captainStats: { matches: 27, won: 14, lost: 13, winPct: '51.85%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/Shubman gill  GT.jpg`
    }
  },
  {
    id: 'PBKS',
    name: 'Punjab Kings',
    shortName: 'PBKS',
    stadium: 'Chandigarh • Mullanpur',
    titles: 0,
    stats: { squad: 25, retained: 13, overseas: 8 },
    logo: '/teams/pbks.jpg',
    color: '#DD1F2D',
    captain: {
      name: 'Shreyas Iyer',
      role: 'Captain • Right-hand Bat',
      captainStats: { matches: 87, won: 48, lost: 35, winPct: '55.17%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/shreyas iyer PBKS.jpg`
    }
  },
  {
    id: 'LSG',
    name: 'Lucknow Super Giants',
    shortName: 'LSG',
    stadium: 'Lucknow • Ekana',
    titles: 0,
    stats: { squad: 25, retained: 14, overseas: 7 },
    logo: '/teams/lsg.jpg',
    color: '#00BFFF',
    captain: {
      name: 'Rishabh Pant',
      role: 'Captain • WK-Batter',
      captainStats: { matches: 59, won: 29, lost: 27, winPct: '49.15%' },
      image: `${import.meta.env.VITE_API_URL}/data/captains/Rishab pant LSG.jpg`
    }
  }
];
