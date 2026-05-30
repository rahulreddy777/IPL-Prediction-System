const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ipl_history').then(async () => {
  const db = mongoose.connection.db;
  const updates = {
    '2008': { Captain: 'Shane Warne', Runner_up: 'Chennai Super Kings', Final_venue: 'DY Patil Stadium, Mumbai', Summary: 'Rajasthan Royals won the inaugural IPL season against all odds.' },
    '2009': { Captain: 'Adam Gilchrist', Runner_up: 'Royal Challengers Bangalore', Final_venue: 'Wanderers Stadium, Johannesburg', Summary: 'Deccan Chargers lifted the trophy in South Africa.' },
    '2010': { Captain: 'MS Dhoni', Runner_up: 'Mumbai Indians', Final_venue: 'DY Patil Stadium, Mumbai', Summary: 'CSK won their first ever IPL title.' },
    '2011': { Captain: 'MS Dhoni', Runner_up: 'Royal Challengers Bangalore', Final_venue: 'M. A. Chidambaram Stadium, Chennai', Summary: 'CSK defended their title at home.' },
    '2012': { Captain: 'Gautam Gambhir', Runner_up: 'Chennai Super Kings', Final_venue: 'M. A. Chidambaram Stadium, Chennai', Summary: 'KKR won their first title defeating defending champions CSK.' },
    '2013': { Captain: 'Rohit Sharma', Runner_up: 'Chennai Super Kings', Final_venue: 'Eden Gardens, Kolkata', Summary: 'Mumbai Indians secured their maiden IPL title.' },
    '2014': { Captain: 'Gautam Gambhir', Runner_up: 'Kings XI Punjab', Final_venue: 'M. Chinnaswamy Stadium, Bangalore', Summary: 'KKR won a thrilling final chased down 200.' },
    '2015': { Captain: 'Rohit Sharma', Runner_up: 'Chennai Super Kings', Final_venue: 'Eden Gardens, Kolkata', Summary: 'MI defeated CSK for their second title.' },
    '2016': { Captain: 'David Warner', Runner_up: 'Royal Challengers Bangalore', Final_venue: 'M. Chinnaswamy Stadium, Bangalore', Summary: 'SRH defended 208 against a strong RCB side.' },
    '2017': { Captain: 'Rohit Sharma', Runner_up: 'Rising Pune Supergiant', Final_venue: 'Rajiv Gandhi Intl Stadium, Hyderabad', Summary: 'MI won a nail-biting final by just 1 run.' },
    '2018': { Captain: 'MS Dhoni', Runner_up: 'Sunrisers Hyderabad', Final_venue: 'Wankhede Stadium, Mumbai', Summary: 'CSK returned from suspension to win their third title.' },
    '2019': { Captain: 'Rohit Sharma', Runner_up: 'Chennai Super Kings', Final_venue: 'Rajiv Gandhi Intl Stadium, Hyderabad', Summary: 'MI won another final against CSK by 1 run.' },
    '2020': { Captain: 'Rohit Sharma', Runner_up: 'Delhi Capitals', Final_venue: 'Dubai Intl Cricket Stadium, Dubai', Summary: 'MI dominated the UAE season for their 5th title.' },
    '2021': { Captain: 'MS Dhoni', Runner_up: 'Kolkata Knight Riders', Final_venue: 'Dubai Intl Cricket Stadium, Dubai', Summary: 'CSK defeated KKR to win their fourth title.' },
    '2022': { Captain: 'Hardik Pandya', Runner_up: 'Rajasthan Royals', Final_venue: 'Narendra Modi Stadium, Ahmedabad', Summary: 'Gujarat Titans won the title in their debut season.' },
    '2023': { Captain: 'MS Dhoni', Runner_up: 'Gujarat Titans', Final_venue: 'Narendra Modi Stadium, Ahmedabad', Summary: 'CSK won a rain-affected thriller on the last ball.' },
    '2024': { Captain: 'Shreyas Iyer', Runner_up: 'Sunrisers Hyderabad', Final_venue: 'M. A. Chidambaram Stadium, Chennai', Summary: 'KKR dominated SRH to win their 3rd title.' },
    '2025': { Captain: 'Virat Kohli', Runner_up: 'Mumbai Indians', Final_venue: 'Wankhede Stadium, Mumbai', Summary: 'RCB finally won their maiden IPL title in an epic clash.' }
  };
  
  for (const [season, data] of Object.entries(updates)) {
    await db.collection('winners').updateOne({ Season: season }, { $set: data });
  }
  console.log('Winners collection updated successfully.');
  process.exit(0);
}).catch(console.error);
