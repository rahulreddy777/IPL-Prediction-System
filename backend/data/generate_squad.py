import json
import os

csv_data = """1,Shreyas Iyer,Retained,Indian (capped),Batter,-,PBKS
2,Nehal Wadhera,Retained,Indian (uncapped),Batter,-,PBKS
3,Vishnu Vinod,Retained,Indian (uncapped),Wicketkeeper,-,PBKS
4,Harnoor Pannu,Retained,Indian (uncapped),Batter,-,PBKS
5,Pyla Avinash,Retained,Indian (uncapped),Batter,-,PBKS
6,Prabhsimran Singh,Retained,Indian (uncapped),Wicketkeeper,-,PBKS
7,Shashank Singh,Retained,Indian (uncapped),Batter,-,PBKS
8,Marcus Stoinis,Retained,Overseas (capped),All-rounder,-,PBKS
9,Harpreet Brar,Retained,Indian (uncapped),All-rounder,-,PBKS
10,Marco Jansen,Retained,Overseas (capped),All-rounder,-,PBKS
11,Azmatullah Omarzai,Retained,Overseas (capped),All-rounder,-,PBKS
12,Priyansh Arya,Retained,Indian (uncapped),All-rounder,-,PBKS
13,Musheer Khan,Retained,Indian (uncapped),All-rounder,-,PBKS
14,Suryansh Shedge,Retained,Indian (uncapped),All-rounder,-,PBKS
15,Mitch Owen,Retained,Overseas (capped),All-rounder,-,PBKS
16,Arshdeep Singh,Retained,Indian (capped),Bowler,-,PBKS
17,Yuzvendra Chahal,Retained,Indian (capped),Bowler,-,PBKS
18,Vyshak Vijaykumar,Retained,Indian (uncapped),Bowler,-,PBKS
19,Yash Thakur,Retained,Indian (uncapped),Bowler,-,PBKS
20,Xavier Bartlett,Retained,Overseas (capped),Bowler,-,PBKS
21,Lockie Ferguson,Retained,Overseas (capped),Bowler,-,PBKS
22,Cooper Connolly,Auction,Overseas (capped),All-rounder,3.00 crore,PBKS
23,Ben Dwarshuis,Auction,Overseas (capped),All-rounder,4.40 crore,PBKS
24,Vishal Nishad,Auction,Indian (uncapped),Bowler,30 lakh,PBKS
25,Pravin Dubey,Auction,Indian (uncapped),Bowler,30 lakh,PBKS
1,Shubham Dubey,Retained,Indian (uncapped),Batter,-,RR
2,Vaibhav Suryavanshi,Retained,Indian (uncapped),Batter,-,RR
3,Lhuan-dre Pretorius,Retained,Overseas (capped),Batter,-,RR
4,Shimron Hetmyer,Retained,Overseas (capped),Batter,-,RR
5,Yashasvi Jaiswal,Retained,Indian (capped),Batter,-,RR
6,Dhruv Jurel,Retained,Indian (capped),Wicketkeeper,-,RR
7,Riyan Parag,Retained,Indian (capped),Batter,-,RR
8,Yudhvir Singh Charak,Retained,Indian (uncapped),All-rounder,-,RR
9,Jofra Archer,Retained,Overseas (capped),Bowler,-,RR
10,Tushar Deshpande,Retained,Indian (capped),Bowler,-,RR
11,Sandeep Sharma,Retained,Indian (uncapped),Bowler,-,RR
12,Kwena Maphaka,Retained,Overseas (capped),Bowler,-,RR
13,Nandre Burger,Retained,Overseas (capped),Bowler,-,RR
14,Ravindra Jadeja,Trade,Indian (capped),All-rounder,-,RR
15,Sam Curran,Trade,Overseas (capped),All-rounder,-,RR
16,Donovan Ferreira,Trade,Overseas (capped),Wicketkeeper,-,RR
17,Ravi Bishnoi,Auction,Indian (capped),Bowler,7.20 crore,RR
18,Sushant Mishra,Auction,Indian (uncapped),Bowler,90 lakh,RR
19,Vignesh Puthur,Auction,Indian (uncapped),Bowler,30 lakh,RR
20,Yash Raj Punja,Auction,Indian (uncapped),Bowler,30 lakh,RR
21,Ravi Singh,Auction,Indian (uncapped),Wicketkeeper,95 lakh,RR
22,Brijesh Sharma,Auction,Indian (uncapped),Bowler,30 lakh,RR
23,Aman Rao,Auction,Indian (uncapped),Batter,30 lakh,RR
24,Adam Milne,Auction,Overseas (capped),Bowler,2.40 crore,RR
25,Kuldeep Sen,Auction,Indian (capped),Bowler,75 lakh,RR
1,Rajat Patidar,Retained,Indian (capped),Batter,-,RCB
2,Virat Kohli,Retained,Indian (capped),Batter,-,RCB
3,Tim David,Retained,Overseas (capped),All-rounder,-,RCB
4,Devdutt Padikkal,Retained,Indian (capped),Batter,-,RCB
5,Phil Salt,Retained,Overseas (capped),Wicketkeeper,-,RCB
6,Jitesh Sharma,Retained,Indian (capped),Wicketkeeper,-,RCB
7,Krunal Pandya,Retained,Indian (capped),All-rounder,-,RCB
8,Jacob Bethell,Retained,Overseas (capped),All-rounder,-,RCB
9,Romario Shepherd,Retained,Overseas (capped),All-rounder,-,RCB
10,Swapnil Singh,Retained,Indian (uncapped),All-rounder,-,RCB
11,Josh Hazlewood,Retained,Overseas (capped),Bowler,-,RCB
12,Bhuvneshwar Kumar,Retained,Indian (capped),Bowler,-,RCB
13,Rasikh Salam,Retained,Indian (uncapped),Bowler,-,RCB
14,Yash Dayal,Retained,Indian (uncapped),Bowler,-,RCB
15,Suyash Sharma,Retained,Indian (uncapped),Bowler,-,RCB
16,Nuwan Thushara,Retained,Overseas (capped),Bowler,-,RCB
17,Abhinandan Singh,Retained,Indian (uncapped),Bowler,-,RCB
18,Venkatesh Iyer,Auction,Indian (capped),All-rounder,7.00 crore,RCB
19,Jacob Duffy,Auction,Overseas (capped),Bowler,2.00 crore,RCB
20,Mangesh Yadav,Auction,Indian (uncapped),All-rounder,5.20 crore,RCB
21,Satvik Deswal,Auction,Indian (uncapped),All-rounder,30 lakh,RCB
22,Jordan Cox,Auction,Overseas (capped),Batter,75 lakh,RCB
23,Kanishk Chouhan,Auction,Indian (uncapped),All-rounder,30 lakh,RCB
24,Vihaan Malhotra,Auction,Indian (uncapped),All-rounder,30 lakh,RCB
25,Vicky Ostwal,Auction,Indian (uncapped),All-rounder,30 lakh,RCB
1,Travis Head,Retained,Overseas (capped),Batter,-,SRH
2,Abhishek Sharma,Retained,Indian (capped),All-rounder,-,SRH
3,Aniket Verma,Retained,Indian (uncapped),Batter,-,SRH
4,R Smaran,Retained,Indian (uncapped),Batter,-,SRH
5,Ishan Kishan,Retained,Indian (capped),Wicketkeeper,-,SRH
6,Heinrich Klaasen,Retained,Overseas (capped),Wicketkeeper,-,SRH
7,Nitish Kumar Reddy,Retained,Indian (capped),All-rounder,-,SRH
8,Harsh Dubey,Retained,Indian (uncapped),All-rounder,-,SRH
9,Kamindu Mendis,Retained,Overseas (capped),All-rounder,-,SRH
10,Harshal Patel,Retained,Indian (capped),All-rounder,-,SRH
11,Brydon Carse,Retained,Overseas (capped),All-rounder,-,SRH
12,Pat Cummins,Retained,Overseas (capped),Bowler,-,SRH
13,Jaydev Unadkat,Retained,Indian (capped),Bowler,-,SRH
14,Eshan Malinga,Retained,Overseas (capped),Bowler,-,SRH
15,Zeeshan Ansari,Retained,Indian (uncapped),Bowler,-,SRH
16,Shivang Kumar,Auction,Indian (uncapped),All-rounder,30 lakh,SRH
17,Salil Arora,Auction,Indian (uncapped),Wicketkeeper,1.50 crore,SRH
18,Krains Fuletra,Auction,Indian (uncapped),Bowler,30 lakh,SRH
19,Praful Hinge,Auction,Indian (uncapped),Bowler,30 lakh,SRH
20,Amit Kumar,Auction,Indian (uncapped),Bowler,30 lakh,SRH
21,Onkar Tarmale,Auction,Indian (uncapped),Bowler,30 lakh,SRH
22,Sakib Hussain,Auction,Indian (uncapped),Bowler,30 lakh,SRH
23,Liam Livingstone,Auction,Overseas (capped),All-rounder,13.00 crore,SRH
24,Shivam Mavi,Auction,Indian (capped),Bowler,75 lakh,SRH
25,Jack Edwards,Auction,Overseas (uncapped),All-rounder,3.00 crore,SRH
1,Ajinkya Rahane,Retained,Indian (capped),Batter,-,KKR
2,Rinku Singh,Retained,Indian (capped),Batter,-,KKR
3,Angkrish Raghuvanshi,Retained,Indian (uncapped),Batter,-,KKR
4,Manish Pandey,Retained,Indian (capped),Batter,-,KKR
5,Rovman Powell,Retained,Overseas (capped),All-rounder,-,KKR
6,Anukul Roy,Retained,Indian (uncapped),All-rounder,-,KKR
7,Ramandeep Singh,Retained,Indian (capped),Batter,-,KKR
8,Vaibhav Arora,Retained,Indian (uncapped),Bowler,-,KKR
9,Sunil Narine,Retained,Overseas (capped),All-rounder,-,KKR
10,Varun Chakaravarthy,Retained,Indian (capped),Bowler,-,KKR
11,Harshit Rana,Retained,Indian (capped),Bowler,-,KKR
12,Umran Malik,Retained,Indian (capped),Bowler,-,KKR
13,Cameron Green,Auction,Overseas (capped),All-rounder,25.20 crore,KKR
14,Matheesha Pathirana,Auction,Overseas (capped),Bowler,18.00 crore,KKR
15,Finn Allen,Auction,Overseas (capped),Wicketkeeper,2.00 crore,KKR
16,Tejasvi Singh,Auction,Indian (uncapped),Wicketkeeper,3.00 crore,KKR
17,Prashant Solanki,Auction,Indian (uncapped),Bowler,30 lakh,KKR
18,Kartik Tyagi,Auction,Indian (uncapped),Bowler,30 lakh,KKR
19,Rahul Tripathi,Auction,Indian (capped),Batter,75 lakh,KKR
20,Tim Seifert,Auction,Overseas (capped),Wicketkeeper,1.50 crore,KKR
21,Sarthak Ranjan,Auction,Indian (uncapped),All-rounder,30 lakh,KKR
22,Daksh Kamra,Auction,Indian (uncapped),All-rounder,30 lakh,KKR
23,Akash Deep,Auction,Indian (capped),Bowler,1.00 crore,KKR
24,Rachin Ravindra,Auction,Overseas (capped),All-rounder,2.00 crore,KKR
1,Rishabh Pant,Retained,Indian (capped),Wicketkeeper,-,LSG
2,Ayush Badoni,Retained,Indian (uncapped),All-rounder,-,LSG
3,Abdul Samad,Retained,Indian (uncapped),Batter,-,LSG
4,Aiden Markram,Retained,Overseas (capped),Batter,-,LSG
5,Himmat Singh,Retained,Indian (uncapped),Batter,-,LSG
6,Matthew Breetzke,Retained,Overseas (capped),Batter,-,LSG
7,Nicholas Pooran,Retained,Overseas (capped),Wicketkeeper,-,LSG
8,Mitchell Marsh,Retained,Overseas (capped),Batter,-,LSG
9,Shahbaz Ahamad,Retained,Indian (uncapped),All-rounder,-,LSG
10,Arshin Kulkarni,Retained,Indian (uncapped),All-rounder,-,LSG
11,Mayank Yadav,Retained,Indian (capped),Bowler,-,LSG
12,Avesh Khan,Retained,Indian (capped),Bowler,-,LSG
13,Mohsin Khan,Retained,Indian (uncapped),Bowler,-,LSG
14,M. Siddharth,Retained,Indian (uncapped),Bowler,-,LSG
15,Digvesh Rathi,Retained,Indian (uncapped),Bowler,-,LSG
16,Prince Yadav,Retained,Indian (uncapped),Bowler,-,LSG
17,Akash Singh,Retained,Indian (uncapped),Bowler,-,LSG
18,Arjun Tendulkar,Trade,Indian (uncapped),Bowler,-,LSG
19,Mohammed Shami,Trade,Indian (capped),Bowler,-,LSG
20,Anrich Nortje,Auction,Overseas (capped),Bowler,2.00 crore,LSG
21,Wanindu Hasaranga,Auction,Overseas (capped),All-rounder,2.00 crore,LSG
22,Mukul Choudhary,Auction,Indian (uncapped),Wicketkeeper,2.60 crore,LSG
23,Naman Tiwari,Auction,Indian (uncapped),All-rounder,1.00 crore,LSG
24,Akshat Raghuwanshi,Auction,Indian (uncapped),Batter,2.20 crore,LSG
25,Josh Inglis,Auction,Overseas (capped),Batter,8.60 crore,LSG
1,Rohit Sharma,Retained,Indian (capped),Batter,-,MI
2,Surya Kumar Yadav,Retained,Indian (capped),Batter,-,MI
3,Robin Minz,Retained,Indian (uncapped),Wicketkeeper,-,MI
4,Ryan Rickelton,Retained,Overseas (capped),Wicketkeeper,-,MI
5,Tilak Varma,Retained,Indian (capped),Batter,-,MI
6,Hardik Pandya,Retained,Indian (capped),All-rounder,-,MI
7,Naman Dhir,Retained,Indian (uncapped),All-rounder,-,MI
8,Mitchell Santner,Retained,Overseas (capped),All-rounder,-,MI
9,Will Jacks,Retained,Overseas (capped),All-rounder,-,MI
10,Corbin Bosch,Retained,Overseas (capped),All-rounder,-,MI
11,Raj Bawa,Retained,Indian (uncapped),All-rounder,-,MI
12,Trent Boult,Retained,Overseas (capped),Bowler,-,MI
13,Jasprit Bumrah,Retained,Indian (capped),Bowler,-,MI
14,Deepak Chahar,Retained,Indian (capped),Bowler,-,MI
15,Ashwani Kumar,Retained,Indian (uncapped),Bowler,-,MI
16,Raghu Sharma,Retained,Indian (uncapped),Bowler,-,MI
17,Allah Ghazanfar,Retained,Overseas (capped),Bowler,-,MI
18,Mayank Markande,Trade,Indian (uncapped),Bowler,-,MI
19,Shardul Thakur,Trade,Indian (capped),All-rounder,-,MI
20,Sherfane Rutherford,Trade,Overseas (capped),Batter,-,MI
21,Quinton De Kock,Auction,Overseas (capped),Wicketkeeper,1.00 crore,MI
22,Atharva Ankolekar,Auction,Indian (uncapped),All-rounder,30 lakh,MI
23,Mohammad Izhar,Auction,Indian (uncapped),Bowler,30 lakh,MI
24,Danish Malewar,Auction,Indian (uncapped),Batter,30 lakh,MI
25,Mayank Rawat,Auction,Indian (uncapped),All-rounder,30 lakh,MI
1,KL Rahul,Retained,Indian (capped),Wicketkeeper,-,DC
2,Karun Nair,Retained,Indian (capped),Batter,-,DC
3,Abishek Porel,Retained,Indian (uncapped),Wicketkeeper,-,DC
4,Tristan Stubbs,Retained,Overseas (capped),Batter,-,DC
5,Axar Patel,Retained,Indian (capped),All-rounder,-,DC
6,Sameer Rizvi,Retained,Indian (uncapped),Batter,-,DC
7,Ashutosh Sharma,Retained,Indian (uncapped),Batter,-,DC
8,Vipraj Nigam,Retained,Indian (uncapped),All-rounder,-,DC
9,Ajay Mandal,Retained,Indian (uncapped),All-rounder,-,DC
10,Tripurana Vijay,Retained,Indian (uncapped),All-rounder,-,DC
11,Madhav Tiwari,Retained,Indian (uncapped),All-rounder,-,DC
12,Mitchell Starc,Retained,Overseas (capped),Bowler,-,DC
13,T. Natarajan,Retained,Indian (capped),Bowler,-,DC
14,Mukesh Kumar,Retained,Indian (capped),Bowler,-,DC
15,Dushmantha Chameera,Retained,Overseas (capped),Bowler,-,DC
16,Kuldeep Yadav,Retained,Indian (capped),Bowler,-,DC
17,Nitish Rana,Trade,Indian (capped),Batter,-,DC
18,Auqib Dar,Auction,Indian (uncapped),All-rounder,8.40 crore,DC
19,Ben Duckett,Auction,Overseas (capped),Wicketkeeper,2.00 crore,DC
20,David Miller,Auction,Overseas (capped),Batter,2.00 crore,DC
21,Pathum Nissanka,Auction,Overseas (capped),Batter,4.00 crore,DC
22,Lungi Ngidi,Auction,Overseas (capped),Bowler,2.00 crore,DC
23,Sahil Parakh,Auction,Indian (uncapped),Batter,30 lakh,DC
24,Prithvi Shaw,Auction,Indian (capped),Batter,75 lakh,DC
25,Kyle Jamieson,Auction,Overseas (capped),Bowler,2.00 crore,DC
1,Shubman Gill,Retained,Indian (capped),Batter,-,GT
2,Sai Sudharsan,Retained,Indian (capped),Batter,-,GT
3,Kumar Kushagra,Retained,Indian (uncapped),Wicketkeeper,-,GT
4,Anuj Rawat,Retained,Indian (uncapped),Wicketkeeper,-,GT
5,Jos Buttler,Retained,Overseas (capped),Wicketkeeper,-,GT
6,Nishant Sindhu,Retained,Indian (uncapped),All-rounder,-,GT
7,Glenn Phillips,Retained,Overseas (capped),All-rounder,-,GT
8,Washington Sundar,Retained,Indian (capped),All-rounder,-,GT
9,Arshad Khan,Retained,Indian (uncapped),Bowler,-,GT
10,Shahrukh Khan,Retained,Indian (uncapped),Batter,-,GT
11,Rahul Tewatia,Retained,Indian (uncapped),All-rounder,-,GT
12,Kagiso Rabada,Retained,Overseas (capped),Bowler,-,GT
13,Mohammed Siraj,Retained,Indian (capped),Bowler,-,GT
14,Prasidh Krishna,Retained,Indian (capped),Bowler,-,GT
15,Ishant Sharma,Retained,Indian (capped),Bowler,-,GT
16,Gurnoor Singh Brar,Retained,Indian (uncapped),Bowler,-,GT
17,Rashid Khan,Retained,Overseas (capped),Bowler,-,GT
18,Manav Suthar,Retained,Indian (uncapped),Bowler,-,GT
19,Sai Kishore,Retained,Indian (capped),Bowler,-,GT
20,Jayant Yadav,Retained,Indian (capped),Bowler,-,GT
21,Ashok Sharma,Auction,Indian (uncapped),Bowler,90 lakh,GT
22,Jason Holder,Auction,Overseas (capped),All-rounder,7.00 crore,GT
23,Tom Banton,Auction,Overseas (capped),Batter,2.00 crore,GT
24,Luke Wood,Auction,Overseas (capped),Bowler,75 lakh,GT
25,Prithviraj Yarra,Auction,Indian (uncapped),Bowler,30 lakh,GT
1,Ruturaj Gaikwad,Retained,Indian (capped),Batter,-,CSK
2,MS Dhoni,Retained,Indian (uncapped),Wicketkeeper,-,CSK
3,Dewald Brevis,Retained,Overseas (capped),Batter,-,CSK
4,Ayush Mhatre,Retained,Indian (uncapped),Batter,-,CSK
5,Urvil Patel,Retained,Indian (uncapped),Wicketkeeper,-,CSK
6,Anshul Kamboj,Retained,Indian (capped),All-rounder,-,CSK
7,Jamie Overton,Retained,Overseas (capped),Bowler,-,CSK
8,Ramakrishna Ghosh,Retained,Indian (uncapped),All-rounder,-,CSK
9,Shivam Dube,Retained,Indian (capped),All-rounder,-,CSK
10,Khaleel Ahmed,Retained,Indian (capped),Bowler,-,CSK
11,Noor Ahmad,Retained,Overseas (capped),Bowler,-,CSK
12,Mukesh Choudhary,Retained,Indian (uncapped),Bowler,-,CSK
13,Nathan Ellis,Retained,Overseas (capped),Bowler,-,CSK
14,Shreyas Gopal,Retained,Indian (uncapped),Bowler,-,CSK
15,Gurjapneet Singh,Retained,Indian (uncapped),Bowler,-,CSK
16,Sanju Samson,Trade,Indian (capped),Wicketkeeper,-,CSK
17,Akeal Hosein,Auction,Overseas (capped),Bowler,2.00 crore,CSK
18,Prashant Veer,Auction,Indian (uncapped),All-rounder,14.20 crore,CSK
19,Kartik Sharma,Auction,Indian (uncapped),Wicketkeeper,14.20 crore,CSK
20,Matthew Short,Auction,Overseas (capped),All-rounder,1.50 crore,CSK
21,Aman Khan,Auction,Indian (uncapped),All-rounder,40 lakh,CSK
22,Sarfaraz Khan,Auction,Indian (capped),Batter,75 lakh,CSK
23,Rahul Chahar,Auction,Indian (capped),Bowler,1.00 crore,CSK
24,Matt Henry,Auction,Overseas (capped),Bowler,2.00 crore,CSK
25,Zak Foulkes,Auction,Overseas (capped),All-rounder,75 lakh,CSK"""

squad = []
for line in csv_data.strip().split('\n'):
    if not line: continue
    parts = line.split(',')
    squad.append({
        "No": int(parts[0]),
        "Player": parts[1],
        "Acquisition": parts[2],
        "Type": parts[3],
        "Role": parts[4],
        "Price": parts[5],
        "Team": parts[6]
    })
    
output_file = os.path.join(os.path.dirname(__file__), "ipl_2026_master_squad.json")
with open(output_file, "w") as f:
    json.dump(squad, f, indent=4)

print(f"Data saved successfully to {output_file}")
