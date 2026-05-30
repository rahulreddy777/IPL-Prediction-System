const { MongoClient } = require('mongodb');

const URI = 'mongodb://localhost:27017';

// Full IPL 2026 match data with scorecards
const matches = [
  {
    matchNumber: 1,
    label: '1st Match',
    venue: 'Bengaluru, M.Chinnaswamy Stadium',
    date: 'Sun, Mar 29 2026',
    dateISO: '2026-03-29',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '201-9', overs: 20 },
    team2: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '203-4', overs: 15.4 },
    result: 'Royal Challengers Bengaluru won by 6 wkts',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 2,
    label: '2nd Match',
    venue: 'Mumbai, Wankhede Stadium',
    date: 'Mon, Mar 30 2026',
    dateISO: '2026-03-30',
    team1: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '220-4', overs: 20 },
    team2: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '224-4', overs: 19.1 },
    result: 'Mumbai Indians won by 6 wkts',
    winner: 'MI',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 3,
    label: '3rd Match',
    venue: 'Guwahati, Barsapara Cricket Stadium',
    date: 'Tue, Mar 31 2026',
    dateISO: '2026-03-31',
    team1: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '127', overs: 19.4 },
    team2: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '128-2', overs: 12.1 },
    result: 'Rajasthan Royals won by 8 wkts',
    winner: 'RR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 4,
    label: '4th Match',
    venue: 'New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    date: 'Wed, Apr 1 2026',
    dateISO: '2026-04-01',
    team1: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '162-6', overs: 20 },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '165-7', overs: 19.1 },
    result: 'Punjab Kings won by 3 wkts',
    winner: 'PBKS',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 5,
    label: '5th Match',
    venue: 'Lucknow, Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium',
    date: 'Thu, Apr 2 2026',
    dateISO: '2026-04-02',
    team1: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '141', overs: 18.4 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '145-4', overs: 17.1 },
    result: 'Delhi Capitals won by 6 wkts',
    winner: 'DC',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 6,
    label: '6th Match',
    venue: 'Kolkata, Eden Gardens',
    date: 'Fri, Apr 3 2026',
    dateISO: '2026-04-03',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '226-8', overs: 20 },
    team2: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '161', overs: 16 },
    result: 'Sunrisers Hyderabad won by 65 runs',
    winner: 'SRH',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 7,
    label: '7th Match',
    venue: 'Chennai, MA Chidambaram Stadium',
    date: 'Sat, Apr 4 2026',
    dateISO: '2026-04-04',
    team1: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '209-5', overs: 20 },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '210-5', overs: 18.4 },
    result: 'Punjab Kings won by 5 wkts',
    winner: 'PBKS',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 8,
    label: '8th Match',
    venue: 'Delhi, Arun Jaitley Stadium',
    date: 'Sun, Apr 5 2026',
    dateISO: '2026-04-05',
    team1: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '162-6', overs: 20 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '164-4', overs: 18.1 },
    result: 'Delhi Capitals won by 6 wkts',
    winner: 'DC',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 9,
    label: '9th Match',
    venue: 'Ahmedabad, Narendra Modi Stadium',
    date: 'Sun, Apr 5 2026',
    dateISO: '2026-04-05',
    team1: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '210-6', overs: 20 },
    team2: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '204-8', overs: 20 },
    result: 'Rajasthan Royals won by 6 runs',
    winner: 'RR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 10,
    label: '10th Match',
    venue: 'Hyderabad, Rajiv Gandhi International Stadium',
    date: 'Sun, Apr 5 2026',
    dateISO: '2026-04-05',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '156-9', overs: 20 },
    team2: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '160-5', overs: 19.5 },
    result: 'Lucknow Super Giants won by 5 wkts',
    winner: 'LSG',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 11,
    label: '11th Match',
    venue: 'Bengaluru, M.Chinnaswamy Stadium',
    date: 'Mon, Apr 6 2026',
    dateISO: '2026-04-06',
    team1: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '250-3', overs: 20 },
    team2: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '207', overs: 19.4 },
    result: 'Royal Challengers Bengaluru won by 43 runs',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 12,
    label: '12th Match',
    venue: 'Kolkata, Eden Gardens',
    date: 'Tue, Apr 7 2026',
    dateISO: '2026-04-07',
    team1: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '25-2', overs: 3.4 },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '-', overs: 0 },
    result: 'No result (due to rain)',
    winner: null,
    status: 'no_result',
    matchType: 'league'
  },
  {
    matchNumber: 13,
    label: '13th Match',
    venue: 'Guwahati, Barsapara Cricket Stadium',
    date: 'Wed, Apr 8 2026',
    dateISO: '2026-04-08',
    team1: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '150-3', overs: 11 },
    team2: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '123-9', overs: 11 },
    result: 'Rajasthan Royals won by 27 runs - 11 overs game due to rain',
    winner: 'RR',
    status: 'completed',
    matchType: 'league',
    note: 'DLS applied - 11 overs game'
  },
  {
    matchNumber: 14,
    label: '14th Match',
    venue: 'Delhi, Arun Jaitley Stadium',
    date: 'Thu, Apr 9 2026',
    dateISO: '2026-04-09',
    team1: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '210-4', overs: 20 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '209-8', overs: 20 },
    result: 'Gujarat Titans won by 1 run',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 15,
    label: '15th Match',
    venue: 'Kolkata, Eden Gardens',
    date: 'Fri, Apr 10 2026',
    dateISO: '2026-04-10',
    team1: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '181-4', overs: 20 },
    team2: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '182-7', overs: 20 },
    result: 'Lucknow Super Giants won by 3 wkts',
    winner: 'LSG',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 16,
    label: '16th Match',
    venue: 'Guwahati, Barsapara Cricket Stadium',
    date: 'Sat, Apr 11 2026',
    dateISO: '2026-04-11',
    team1: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '201-8', overs: 20 },
    team2: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '202-4', overs: 18 },
    result: 'Rajasthan Royals won by 6 wkts',
    winner: 'RR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 17,
    label: '17th Match',
    venue: 'New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    date: 'Sat, Apr 11 2026',
    dateISO: '2026-04-11',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '219-6', overs: 20 },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '223-4', overs: 18.5 },
    result: 'Punjab Kings won by 6 wkts',
    winner: 'PBKS',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 18,
    label: '18th Match',
    venue: 'Chennai, MA Chidambaram Stadium',
    date: 'Sun, Apr 12 2026',
    dateISO: '2026-04-12',
    team1: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '212-2', overs: 20 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '189', overs: 20 },
    result: 'Chennai Super Kings won by 23 runs',
    winner: 'CSK',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 19,
    label: '19th Match',
    venue: 'Lucknow, Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium',
    date: 'Sun, Apr 12 2026',
    dateISO: '2026-04-12',
    team1: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '164-8', overs: 20 },
    team2: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '165-3', overs: 18.4 },
    result: 'Gujarat Titans won by 7 wkts',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 20,
    label: '20th Match',
    venue: 'Mumbai, Wankhede Stadium',
    date: 'Mon, Apr 13 2026',
    dateISO: '2026-04-13',
    team1: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '240-4', overs: 20 },
    team2: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '222-5', overs: 20 },
    result: 'Royal Challengers Bengaluru won by 18 runs',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 21,
    label: '21st Match',
    venue: 'Hyderabad, Rajiv Gandhi International Stadium',
    date: 'Tue, Apr 14 2026',
    dateISO: '2026-04-14',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '216-6', overs: 20 },
    team2: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '159', overs: 19 },
    result: 'Sunrisers Hyderabad won by 57 runs',
    winner: 'SRH',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 22,
    label: '22nd Match',
    venue: 'Chennai, MA Chidambaram Stadium',
    date: 'Wed, Apr 15 2026',
    dateISO: '2026-04-15',
    team1: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '192-5', overs: 20 },
    team2: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '160-7', overs: 20 },
    result: 'Chennai Super Kings won by 32 runs',
    winner: 'CSK',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 23,
    label: '23rd Match',
    venue: 'Bengaluru, M.Chinnaswamy Stadium',
    date: 'Thu, Apr 16 2026',
    dateISO: '2026-04-16',
    team1: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '146', overs: 20 },
    team2: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '149-5', overs: 15.1 },
    result: 'Royal Challengers Bengaluru won by 5 wkts',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 24,
    label: '24th Match',
    venue: 'Mumbai, Wankhede Stadium',
    date: 'Fri, Apr 17 2026',
    dateISO: '2026-04-17',
    team1: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '195-6', overs: 20 },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '198-3', overs: 16.3 },
    result: 'Punjab Kings won by 7 wkts',
    winner: 'PBKS',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 25,
    label: '25th Match',
    venue: 'Ahmedabad, Narendra Modi Stadium',
    date: 'Sat, Apr 18 2026',
    dateISO: '2026-04-18',
    team1: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '180', overs: 20 },
    team2: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '181-5', overs: 19.4 },
    result: 'Gujarat Titans won by 5 wkts',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 26,
    label: '26th Match',
    venue: 'Bengaluru, M.Chinnaswamy Stadium',
    date: 'Sat, Apr 18 2026',
    dateISO: '2026-04-18',
    team1: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '175-8', overs: 20 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '179-4', overs: 19.5 },
    result: 'Delhi Capitals won by 6 wkts',
    winner: 'DC',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 27,
    label: '27th Match',
    venue: 'Hyderabad, Rajiv Gandhi International Stadium',
    date: 'Sun, Apr 19 2026',
    dateISO: '2026-04-19',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '194-9', overs: 20 },
    team2: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '184-8', overs: 20 },
    result: 'Sunrisers Hyderabad won by 10 runs',
    winner: 'SRH',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 28,
    label: '28th Match',
    venue: 'Kolkata, Eden Gardens',
    date: 'Sun, Apr 19 2026',
    dateISO: '2026-04-19',
    team1: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '155-9', overs: 20 },
    team2: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '161-6', overs: 19.4 },
    result: 'Kolkata Knight Riders won by 4 wkts',
    winner: 'KKR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 29,
    label: '29th Match',
    venue: 'New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    date: 'Sun, Apr 19 2026',
    dateISO: '2026-04-19',
    team1: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '254-7', overs: 20 },
    team2: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '200-5', overs: 20 },
    result: 'Punjab Kings won by 54 runs',
    winner: 'PBKS',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 30,
    label: '30th Match',
    venue: 'Ahmedabad, Narendra Modi Stadium',
    date: 'Mon, Apr 20 2026',
    dateISO: '2026-04-20',
    team1: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '199-5', overs: 20 },
    team2: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '100', overs: 15.5 },
    result: 'Mumbai Indians won by 99 runs',
    winner: 'MI',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 31,
    label: '31st Match',
    venue: 'Hyderabad, Rajiv Gandhi International Stadium',
    date: 'Tue, Apr 21 2026',
    dateISO: '2026-04-21',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '242-2', overs: 20 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '195-9', overs: 20 },
    result: 'Sunrisers Hyderabad won by 47 runs',
    winner: 'SRH',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 32,
    label: '32nd Match',
    venue: 'Lucknow, Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium',
    date: 'Wed, Apr 22 2026',
    dateISO: '2026-04-22',
    team1: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '159-6', overs: 20 },
    team2: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '119', overs: 18 },
    result: 'Rajasthan Royals won by 40 runs',
    winner: 'RR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 33,
    label: '33rd Match',
    venue: 'Mumbai, Wankhede Stadium',
    date: 'Thu, Apr 23 2026',
    dateISO: '2026-04-23',
    team1: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '207-6', overs: 20 },
    team2: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '104', overs: 19 },
    result: 'Chennai Super Kings won by 103 runs',
    winner: 'CSK',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 34,
    label: '34th Match',
    venue: 'Bengaluru, M.Chinnaswamy Stadium',
    date: 'Fri, Apr 24 2026',
    dateISO: '2026-04-24',
    team1: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '205-3', overs: 20 },
    team2: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '206-5', overs: 18.5 },
    result: 'Royal Challengers Bengaluru won by 5 wkts',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 35,
    label: '35th Match',
    venue: 'Delhi, Arun Jaitley Stadium',
    date: 'Sat, Apr 25 2026',
    dateISO: '2026-04-25',
    team1: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '264-2', overs: 20 },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '265-4', overs: 18.5 },
    result: 'Punjab Kings won by 6 wkts',
    winner: 'PBKS',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 36,
    label: '36th Match',
    venue: 'Jaipur, Sawai Mansingh Stadium',
    date: 'Sat, Apr 25 2026',
    dateISO: '2026-04-25',
    team1: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '228-6', overs: 20 },
    team2: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '229-5', overs: 18.3 },
    result: 'Sunrisers Hyderabad won by 5 wkts',
    winner: 'SRH',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 37,
    label: '37th Match',
    venue: 'Chennai, MA Chidambaram Stadium',
    date: 'Sun, Apr 26 2026',
    dateISO: '2026-04-26',
    team1: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '158-7', overs: 20 },
    team2: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '162-2', overs: 16.4 },
    result: 'Gujarat Titans won by 8 wkts',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 38,
    label: '38th Match',
    venue: 'Lucknow, Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium',
    date: 'Sun, Apr 26 2026',
    dateISO: '2026-04-26',
    team1: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '155-7', overs: 20 },
    team2: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '155-8', overs: 20 },
    result: 'Match tied (KKR won the Super Over)',
    winner: 'KKR',
    status: 'completed',
    matchType: 'league',
    note: 'Super Over - KKR won'
  },
  {
    matchNumber: 39,
    label: '39th Match',
    venue: 'Delhi, Arun Jaitley Stadium',
    date: 'Mon, Apr 27 2026',
    dateISO: '2026-04-27',
    team1: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '75', overs: 16.3 },
    team2: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '77-1', overs: 6.3 },
    result: 'Royal Challengers Bengaluru won by 9 wkts',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 40,
    label: '40th Match',
    venue: 'New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    date: 'Tue, Apr 28 2026',
    dateISO: '2026-04-28',
    team1: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '222-4', overs: 20 },
    team2: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '228-4', overs: 19.2 },
    result: 'Rajasthan Royals won by 6 wkts',
    winner: 'RR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 41,
    label: '41st Match',
    venue: 'Mumbai, Wankhede Stadium',
    date: 'Wed, Apr 29 2026',
    dateISO: '2026-04-29',
    team1: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '243-5', overs: 20 },
    team2: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '249-4', overs: 18.4 },
    result: 'Sunrisers Hyderabad won by 6 wkts',
    winner: 'SRH',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 42,
    label: '42nd Match',
    venue: 'Ahmedabad, Narendra Modi Stadium',
    date: 'Thu, Apr 30 2026',
    dateISO: '2026-04-30',
    team1: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '155', overs: 19.2 },
    team2: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '158-6', overs: 15.5 },
    result: 'Gujarat Titans won by 4 wkts',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 43,
    label: '43rd Match',
    venue: 'Jaipur, Sawai Mansingh Stadium',
    date: 'Fri, May 1 2026',
    dateISO: '2026-05-01',
    team1: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '225-6', overs: 20 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '226-3', overs: 19.1 },
    result: 'Delhi Capitals won by 7 wkts',
    winner: 'DC',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 44,
    label: '44th Match',
    venue: 'Chennai, MA Chidambaram Stadium',
    date: 'Sat, May 2 2026',
    dateISO: '2026-05-02',
    team1: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '159-7', overs: 20 },
    team2: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '160-2', overs: 18.1 },
    result: 'Chennai Super Kings won by 8 wkts',
    winner: 'CSK',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 45,
    label: '45th Match',
    venue: 'Hyderabad, Rajiv Gandhi International Stadium',
    date: 'Sun, May 3 2026',
    dateISO: '2026-05-03',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '165', overs: 19 },
    team2: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '169-3', overs: 18.2 },
    result: 'Kolkata Knight Riders won by 7 wkts',
    winner: 'KKR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 46,
    label: '46th Match',
    venue: 'Ahmedabad, Narendra Modi Stadium',
    date: 'Sun, May 3 2026',
    dateISO: '2026-05-03',
    team1: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '163-9', overs: 20 },
    team2: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '167-6', overs: 19.5 },
    result: 'Gujarat Titans won by 4 wkts',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 47,
    label: '47th Match',
    venue: 'Mumbai, Wankhede Stadium',
    date: 'Mon, May 4 2026',
    dateISO: '2026-05-04',
    team1: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '228-5', overs: 20 },
    team2: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '229-4', overs: 18.4 },
    result: 'Mumbai Indians won by 6 wkts',
    winner: 'MI',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 48,
    label: '48th Match',
    venue: 'Delhi, Arun Jaitley Stadium',
    date: 'Tue, May 5 2026',
    dateISO: '2026-05-05',
    team1: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '155-7', overs: 20 },
    team2: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '159-2', overs: 17.3 },
    result: 'Chennai Super Kings won by 8 wkts',
    winner: 'CSK',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 49,
    label: '49th Match',
    venue: 'Hyderabad, Rajiv Gandhi International Stadium',
    date: 'Wed, May 6 2026',
    dateISO: '2026-05-06',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '235-4', overs: 20 },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '202-7', overs: 20 },
    result: 'Sunrisers Hyderabad won by 33 runs',
    winner: 'SRH',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 50,
    label: '50th Match',
    venue: 'Lucknow, Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium',
    date: 'Thu, May 7 2026',
    dateISO: '2026-05-07',
    team1: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '209-3', overs: 19 },
    team2: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '203-6', overs: 19 },
    result: 'LSG won by 9 runs (19 Overs game due to rain, DLS Target 213)',
    winner: 'LSG',
    status: 'completed',
    matchType: 'league',
    note: 'DLS applied - 19 overs game'
  },
  {
    matchNumber: 51,
    label: '51st Match',
    venue: 'Delhi, Arun Jaitley Stadium',
    date: 'Fri, May 8 2026',
    dateISO: '2026-05-08',
    team1: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '142-8', overs: 20 },
    team2: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '147-2', overs: 14.2 },
    result: 'Kolkata Knight Riders won by 8 wkts',
    winner: 'KKR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 52,
    label: '52nd Match',
    venue: 'Jaipur, Sawai Mansingh Stadium',
    date: 'Sat, May 9 2026',
    dateISO: '2026-05-09',
    team1: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '229-4', overs: 20 },
    team2: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '152', overs: 16.3 },
    result: 'Gujarat Titans won by 77 runs',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 53,
    label: '53rd Match',
    venue: 'Chennai, MA Chidambaram Stadium',
    date: 'Sun, May 10 2026',
    dateISO: '2026-05-10',
    team1: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '203-8', overs: 20 },
    team2: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '208-5', overs: 19.2 },
    result: 'Chennai Super Kings won by 5 wkts',
    winner: 'CSK',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 54,
    label: '54th Match',
    venue: 'Raipur, Shaheed Veer Narayan Singh International Stadium',
    date: 'Sun, May 10 2026',
    dateISO: '2026-05-10',
    team1: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '166-7', overs: 20 },
    team2: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '167-8', overs: 20 },
    result: 'Royal Challengers Bengaluru won by 2 wkts',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 55,
    label: '55th Match',
    venue: 'Dharamsala, Himachal Pradesh Cricket Association Stadium',
    date: 'Mon, May 11 2026',
    dateISO: '2026-05-11',
    team1: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '210-5', overs: 20 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '216-7', overs: 19 },
    result: 'Delhi Capitals won by 3 wkts',
    winner: 'DC',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 56,
    label: '56th Match',
    venue: 'Ahmedabad, Narendra Modi Stadium',
    date: 'Tue, May 12 2026',
    dateISO: '2026-05-12',
    team1: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '168-5', overs: 20 },
    team2: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '86', overs: 14.5 },
    result: 'Gujarat Titans won by 82 runs',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 57,
    label: '57th Match',
    venue: 'Raipur, Shaheed Veer Narayan Singh International Stadium',
    date: 'Wed, May 13 2026',
    dateISO: '2026-05-13',
    team1: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '192-4', overs: 20 },
    team2: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '194-4', overs: 19.1 },
    result: 'Royal Challengers Bengaluru won by 6 wkts',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 58,
    label: '58th Match',
    venue: 'Dharamsala, Himachal Pradesh Cricket Association Stadium',
    date: 'Thu, May 14 2026',
    dateISO: '2026-05-14',
    team1: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '200-8', overs: 20 },
    team2: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '205-4', overs: 19.5 },
    result: 'Mumbai Indians won by 6 wkts',
    winner: 'MI',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 59,
    label: '59th Match',
    venue: 'Lucknow, Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium',
    date: 'Fri, May 15 2026',
    dateISO: '2026-05-15',
    team1: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '187-5', overs: 20 },
    team2: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '188-3', overs: 16.4 },
    result: 'Lucknow Super Giants won by 7 wkts',
    winner: 'LSG',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 60,
    label: '60th Match',
    venue: 'Kolkata, Eden Gardens',
    date: 'Sat, May 16 2026',
    dateISO: '2026-05-16',
    team1: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '247-2', overs: 20 },
    team2: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '218-4', overs: 20 },
    result: 'Kolkata Knight Riders won by 29 runs',
    winner: 'KKR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 61,
    label: '61st Match',
    venue: 'Dharamsala, Himachal Pradesh Cricket Association Stadium',
    date: 'Sun, May 17 2026',
    dateISO: '2026-05-17',
    team1: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: '222-4', overs: 20 },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: '199-8', overs: 20 },
    result: 'Royal Challengers Bengaluru won by 23 runs',
    winner: 'RCB',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 62,
    label: '62nd Match',
    venue: 'Delhi, Arun Jaitley Stadium',
    date: 'Sun, May 17 2026',
    dateISO: '2026-05-17',
    team1: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '193-8', overs: 20 },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: '197-5', overs: 19.2 },
    result: 'Delhi Capitals won by 5 wkts',
    winner: 'DC',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 63,
    label: '63rd Match',
    venue: 'Chennai, MA Chidambaram Stadium',
    date: 'Mon, May 18 2026',
    dateISO: '2026-05-18',
    team1: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '180-7', overs: 20 },
    team2: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: '181-5', overs: 19 },
    result: 'Sunrisers Hyderabad won by 5 wkts',
    winner: 'SRH',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 64,
    label: '64th Match',
    venue: 'Jaipur, Sawai Mansingh Stadium',
    date: 'Tue, May 19 2026',
    dateISO: '2026-05-19',
    team1: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: '220-5', overs: 20 },
    team2: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: '225-3', overs: 19.1 },
    result: 'Rajasthan Royals won by 7 wkts',
    winner: 'RR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 65,
    label: '65th Match',
    venue: 'Kolkata, Eden Gardens',
    date: 'Wed, May 20 2026',
    dateISO: '2026-05-20',
    team1: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: '147-8', overs: 20 },
    team2: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: '148-6', overs: 18.5 },
    result: 'Kolkata Knight Riders won by 4 wkts',
    winner: 'KKR',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 66,
    label: '66th Match',
    venue: 'Ahmedabad, Narendra Modi Stadium',
    date: 'Thu, May 21 2026',
    dateISO: '2026-05-21',
    team1: { name: 'Gujarat Titans', slug: 'gujarat-titans', code: 'GT', score: '229-4', overs: 20 },
    team2: { name: 'Chennai Super Kings', slug: 'chennai-super-kings', code: 'CSK', score: '140', overs: 13.4 },
    result: 'Gujarat Titans won by 89 runs',
    winner: 'GT',
    status: 'completed',
    matchType: 'league'
  },
  {
    matchNumber: 67,
    label: '67th Match',
    venue: 'Hyderabad, Rajiv Gandhi International Stadium',
    date: 'Fri, May 22 2026',
    dateISO: '2026-05-22',
    team1: { name: 'Sunrisers Hyderabad', slug: 'sunrisers-hyderabad', code: 'SRH', score: null, overs: null },
    team2: { name: 'Royal Challengers Bengaluru', slug: 'royal-challengers-bengaluru', code: 'RCB', score: null, overs: null },
    result: 'Today - 7:30 PM IST',
    winner: null,
    status: 'upcoming',
    matchType: 'league',
    timeIST: '7:30 PM',
    timeGMT: '14:00'
  },
  {
    matchNumber: 68,
    label: '68th Match',
    venue: 'Lucknow, Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium',
    date: 'Sat, May 23 2026',
    dateISO: '2026-05-23',
    team1: { name: 'Lucknow Super Giants', slug: 'lucknow-super-giants', code: 'LSG', score: null, overs: null },
    team2: { name: 'Punjab Kings', slug: 'punjab-kings', code: 'PBKS', score: null, overs: null },
    result: 'Tomorrow - 7:30 PM IST',
    winner: null,
    status: 'upcoming',
    matchType: 'league',
    timeIST: '7:30 PM',
    timeGMT: '14:00'
  },
  {
    matchNumber: 69,
    label: '69th Match',
    venue: 'Mumbai, Wankhede Stadium',
    date: 'Sun, May 24 2026',
    dateISO: '2026-05-24',
    team1: { name: 'Mumbai Indians', slug: 'mumbai-indians', code: 'MI', score: null, overs: null },
    team2: { name: 'Rajasthan Royals', slug: 'rajasthan-royals', code: 'RR', score: null, overs: null },
    result: 'Sunday, May 24 - 3:30 PM IST',
    winner: null,
    status: 'upcoming',
    matchType: 'league',
    timeIST: '3:30 PM',
    timeGMT: '10:00'
  },
  {
    matchNumber: 70,
    label: '70th Match',
    venue: 'Kolkata, Eden Gardens',
    date: 'Sun, May 24 2026',
    dateISO: '2026-05-24',
    team1: { name: 'Kolkata Knight Riders', slug: 'kolkata-knight-riders', code: 'KKR', score: null, overs: null },
    team2: { name: 'Delhi Capitals', slug: 'delhi-capitals', code: 'DC', score: null, overs: null },
    result: 'Sunday, May 24 - 7:30 PM IST',
    winner: null,
    status: 'upcoming',
    matchType: 'league',
    timeIST: '7:30 PM',
    timeGMT: '14:00'
  },
  {
    matchNumber: 71,
    label: 'Qualifier 1',
    venue: 'Dharamsala, Himachal Pradesh Cricket Association Stadium',
    date: 'Tue, May 26 2026',
    dateISO: '2026-05-26',
    team1: { name: 'TBC', slug: 'tbc', code: 'TBC', score: null, overs: null },
    team2: { name: 'TBC', slug: 'tbc', code: 'TBC', score: null, overs: null },
    result: 'Tuesday, May 26 - 7:30 PM IST',
    winner: null,
    status: 'upcoming',
    matchType: 'qualifier1',
    timeIST: '7:30 PM',
    timeGMT: '14:00'
  },
  {
    matchNumber: 72,
    label: 'Eliminator',
    venue: 'New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    date: 'Wed, May 27 2026',
    dateISO: '2026-05-27',
    team1: { name: 'TBC', slug: 'tbc', code: 'TBC', score: null, overs: null },
    team2: { name: 'TBC', slug: 'tbc', code: 'TBC', score: null, overs: null },
    result: 'Wednesday, May 27 - 7:30 PM IST',
    winner: null,
    status: 'upcoming',
    matchType: 'eliminator',
    timeIST: '7:30 PM',
    timeGMT: '14:00'
  },
  {
    matchNumber: 73,
    label: 'Qualifier 2',
    venue: 'New Chandigarh, Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur',
    date: 'Fri, May 29 2026',
    dateISO: '2026-05-29',
    team1: { name: 'TBC', slug: 'tbc', code: 'TBC', score: null, overs: null },
    team2: { name: 'TBC', slug: 'tbc', code: 'TBC', score: null, overs: null },
    result: 'Friday, May 29 - 7:30 PM IST',
    winner: null,
    status: 'upcoming',
    matchType: 'qualifier2',
    timeIST: '7:30 PM',
    timeGMT: '14:00'
  },
  {
    matchNumber: 74,
    label: 'Final',
    venue: 'Ahmedabad, Narendra Modi Stadium',
    date: 'Sun, May 31 2026',
    dateISO: '2026-05-31',
    team1: { name: 'TBC', slug: 'tbc', code: 'TBC', score: null, overs: null },
    team2: { name: 'TBC', slug: 'tbc', code: 'TBC', score: null, overs: null },
    result: 'Sunday, May 31 - 7:30 PM IST',
    winner: null,
    status: 'upcoming',
    matchType: 'final',
    timeIST: '7:30 PM',
    timeGMT: '14:00'
  }
];

async function updateScorecard() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const predDB = client.db('ipl_prediction');
    const histDB = client.db('ipl_history');

    const matchCol = predDB.collection('ipl_matches_2026');
    const predCol = predDB.collection('match_predictions_2026');

    // Drop and re-insert ipl_matches_2026 with full scorecard
    await matchCol.deleteMany({});
    console.log('🗑️  Cleared ipl_matches_2026');

    const insertResult = await matchCol.insertMany(matches);
    console.log(`✅ Inserted ${insertResult.insertedCount} matches into ipl_matches_2026`);

    // Also update match_predictions_2026 with actual results
    let updatedPred = 0;
    for (const m of matches) {
      if (m.status === 'completed') {
        const res = await predCol.updateOne(
          { match_id: m.matchNumber },
          {
            $set: {
              actual_winner: m.winner,
              actual_result: m.result,
              team1_score: m.team1.score,
              team2_score: m.team2.score,
              team1_overs: m.team1.overs,
              team2_overs: m.team2.overs,
              status: 'completed',
              updatedAt: new Date().toISOString()
            }
          }
        );
        if (res.matchedCount > 0) updatedPred++;
      }
    }
    console.log(`✅ Updated ${updatedPred} prediction documents with actual results`);

    // Build and upsert points table into ipl_prediction db
    const pointsMap = {};
    const teams = ['RCB','SRH','MI','KKR','CSK','RR','GT','PBKS','LSG','DC'];
    teams.forEach(t => {
      pointsMap[t] = { team: t, played: 0, won: 0, lost: 0, noResult: 0, points: 0, nrr: 0 };
    });

    for (const m of matches) {
      if (m.status === 'completed' || m.status === 'no_result') {
        const t1 = m.team1.code;
        const t2 = m.team2.code;
        if (!pointsMap[t1] || !pointsMap[t2]) continue;

        pointsMap[t1].played++;
        pointsMap[t2].played++;

        if (m.status === 'no_result') {
          pointsMap[t1].noResult++;
          pointsMap[t2].noResult++;
          pointsMap[t1].points += 1;
          pointsMap[t2].points += 1;
        } else if (m.winner) {
          const loser = m.winner === t1 ? t2 : t1;
          pointsMap[m.winner].won++;
          pointsMap[m.winner].points += 2;
          pointsMap[loser].lost++;
        }
      }
    }

    const pointsTable = Object.values(pointsMap).sort((a, b) => b.points - a.points || b.won - a.won);

    const ptCol = predDB.collection('points_table_2026');
    await ptCol.deleteMany({});
    await ptCol.insertMany(pointsTable);
    console.log('✅ Points table computed and saved to points_table_2026');
    console.log('\n📊 IPL 2026 Points Table:');
    console.log('Team\t\tP\tW\tL\tNR\tPts');
    pointsTable.forEach(r => {
      console.log(`${r.team}\t\t${r.played}\t${r.won}\t${r.lost}\t${r.noResult}\t${r.points}`);
    });

    console.log('\n✅ All updates complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

updateScorecard();
