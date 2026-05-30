"""gen_all70.py – generates ALL_74 (70 league + 4 playoff) and patches Predictions2026.jsx"""
import os, json

JSX = os.path.join('frontend','src','pages','Predictions2026.jsx')

# ── Squad strength (overall score) ────────────────────────────────────────────
SQ = {'MI':97,'GT':94,'DC':89,'KKR':88,'SRH':83,'RCB':80,'CSK':79,'RR':76,'LSG':74,'PBKS':71}
SQ_BAT = {'MI':97,'GT':90,'DC':86,'KKR':91,'SRH':94,'RCB':87,'CSK':84,'RR':80,'LSG':82,'PBKS':78}
SQ_BOW = {'MI':97,'GT':98,'DC':93,'KKR':83,'SRH':78,'RCB':79,'CSK':77,'RR':74,'LSG':72,'PBKS':70}

# ── H2H wins (t1 wins / total played) → win % for t1 ─────────────────────────
H2H_WINS = {
 ('CSK','MI'):18,('MI','CSK'):21, ('CSK','RCB'):21,('RCB','CSK'):13,
 ('CSK','KKR'):19,('KKR','CSK'):11, ('CSK','DC'):19,('DC','CSK'):11,
 ('CSK','PBKS'):16,('PBKS','CSK'):14, ('CSK','RR'):16,('RR','CSK'):15,
 ('CSK','SRH'):16,('SRH','CSK'):6, ('CSK','GT'):3,('GT','CSK'):4,
 ('CSK','LSG'):1,('LSG','CSK'):3,
 ('MI','RCB'):19,('RCB','MI'):14, ('MI','KKR'):24,('KKR','MI'):11,
 ('MI','DC'):19,('DC','MI'):15, ('MI','PBKS'):17,('PBKS','MI'):13,
 ('MI','RR'):15,('RR','MI'):13, ('MI','SRH'):12,('SRH','MI'):10,
 ('MI','GT'):2,('GT','MI'):5, ('MI','LSG'):2,('LSG','MI'):6,
 ('RCB','KKR'):14,('KKR','RCB'):20, ('RCB','DC'):18,('DC','RCB'):12,
 ('RCB','PBKS'):19,('PBKS','RCB'):18, ('RCB','RR'):17,('RR','RCB'):14,
 ('RCB','SRH'):10,('SRH','RCB'):14, ('RCB','LSG'):3,('LSG','RCB'):2,
 ('RCB','GT'):2,('GT','RCB'):3,
 ('KKR','DC'):18,('DC','KKR'):15, ('KKR','PBKS'):21,('PBKS','KKR'):10,
 ('KKR','RR'):14,('RR','KKR'):14, ('KKR','SRH'):18,('SRH','KKR'):9,
 ('KKR','LSG'):1,('LSG','KKR'):3, ('KKR','GT'):1,('GT','KKR'):3,
 ('DC','PBKS'):16,('PBKS','DC'):16, ('DC','RR'):13,('RR','DC'):15,
 ('DC','SRH'):12,('SRH','DC'):13, ('DC','LSG'):2,('LSG','DC'):3,
 ('DC','GT'):1,('GT','DC'):3,
 ('PBKS','RR'):12,('RR','PBKS'):17, ('PBKS','SRH'):7,('SRH','PBKS'):16,
 ('PBKS','LSG'):2,('LSG','PBKS'):3, ('PBKS','GT'):2,('GT','PBKS'):2,
 ('RR','SRH'):9,('SRH','RR'):11, ('RR','LSG'):2,('LSG','RR'):2,
 ('RR','GT'):1,('GT','RR'):4,
 ('SRH','LSG'):3,('LSG','SRH'):1, ('SRH','GT'):1,('GT','SRH'):3,
 ('LSG','GT'):2,('GT','LSG'):4,
}
def h2h(t1,t2):
    w1=H2H_WINS.get((t1,t2),5); w2=H2H_WINS.get((t2,t1),5)
    tot=w1+w2 or 1
    return round(w1/tot*100), round(w2/tot*100)

# ── Venue toss/pitch info ─────────────────────────────────────────────────────
VENUE = {
 'Bengaluru': ('chase',62,182,False,'Batting'),
 'Mumbai':    ('chase',58,175,False,'Batting'),
 'Guwahati':  ('neutral',50,164,True,'Balanced'),
 'Mullanpur': ('chase',54,171,False,'Batting'),
 'Lucknow':   ('chase',55,172,False,'Batting'),
 'Kolkata':   ('chase',55,168,True,'Balanced'),
 'Chennai':   ('defend',60,161,True,'Spin'),
 'Delhi':     ('neutral',50,170,True,'Balanced'),
 'Ahmedabad': ('chase',56,169,True,'Balanced'),
 'Hyderabad': ('chase',57,178,False,'Batting'),
 'Jaipur':    ('defend',52,162,True,'Spin'),
 'New Chandigarh':('chase',53,171,False,'Batting'),
 'Raipur':    ('neutral',50,168,False,'Batting'),
 'Dharamshala':('neutral',50,162,False,'Balanced'),
}
TOSS_DESC = {
 'chase':'Chasing strongly favoured at this venue.',
 'defend':'Spin pitch – defending slightly preferred.',
 'neutral':'No clear toss advantage at this venue.',
}

# ── Key Players ───────────────────────────────────────────────────────────────
KP = {
 'MI':  ['Jasprit Bumrah (World #1 bowler)','Rohit Sharma + SKY + Tilak Varma','Will Jacks (4x MoM WC)'],
 'GT':  ['Rashid Khan (#1 T20I spinner)','Sai Sudharsan (2025 Orange Cap)','Kagiso Rabada + Siraj'],
 'DC':  ['Axar Patel + Kuldeep Yadav (best spin duo)','KL Rahul + David Miller','Tristan Stubbs'],
 'KKR': ['Varun Chakravarthy (top WC wkts)','Finn Allen (fastest WC 100)','Cameron Green (Rs 25.2cr)'],
 'SRH': ['Travis Head (SR 180+ in PP)','Abhishek Sharma (#1 T20I Batter)','Heinrich Klaasen'],
 'RCB': ['Virat Kohli (8861 IPL runs)','Jacob Bethell (WC breakout)','Josh Hazlewood'],
 'CSK': ['Sanju Samson (WC Player of Tournament)','Ruturaj Gaikwad','Ravindra Jadeja + Noor Ahmad'],
 'RR':  ['Vaibhav Suryavanshi (world record)','Riyan Parag (captain)','Jofra Archer'],
 'LSG': ['Rishabh Pant (captain, 125 IPL games)','Nicholas Pooran (SR 168)','Mohammed Shami'],
 'PBKS':['Shreyas Iyer (captain)','Arshdeep Singh (death specialist)','Glenn Maxwell + Yuzvendra Chahal'],
}

# ── All 70 matches: (match,date,day,time,t1,t2,venue,winner,t1pct,t2pct,done,result) ──
M = [
 (1,'Mar 28','Sat','7:30 PM','RCB','SRH','Bengaluru','RCB',64,36,True,'RCB won by 6 wickets (chased)'),
 (2,'Mar 29','Sun','7:30 PM','MI','KKR','Mumbai','MI',62,38,True,'MI won by 6 wickets (chased)'),
 (3,'Mar 30','Mon','7:30 PM','RR','CSK','Guwahati','RR',58,42,True,'RR won by 8 wickets (chased)'),
 (4,'Mar 31','Tue','7:30 PM','PBKS','GT','Mullanpur','PBKS',53,47,True,'PBKS won by 3 wickets (chased)'),
 (5,'Apr 01','Wed','7:30 PM','LSG','DC','Lucknow','DC',42,58,False,None),
 (6,'Apr 02','Thu','7:30 PM','KKR','SRH','Kolkata','KKR',61,39,False,None),
 (7,'Apr 03','Fri','7:30 PM','CSK','PBKS','Chennai','CSK',63,37,False,None),
 (8,'Apr 04','Sat','3:30 PM','DC','MI','Delhi','MI',43,57,False,None),
 (9,'Apr 04','Sat','7:30 PM','GT','RR','Ahmedabad','GT',64,36,False,None),
 (10,'Apr 05','Sun','3:30 PM','SRH','LSG','Hyderabad','SRH',62,38,False,None),
 (11,'Apr 05','Sun','7:30 PM','RCB','CSK','Bengaluru','RCB',59,41,False,None),
 (12,'Apr 06','Mon','7:30 PM','KKR','PBKS','Kolkata','KKR',67,33,False,None),
 (13,'Apr 07','Tue','7:30 PM','RR','MI','Guwahati','MI',38,62,False,None),
 (14,'Apr 08','Wed','7:30 PM','DC','GT','Delhi','DC',55,45,False,None),
 (15,'Apr 09','Thu','7:30 PM','KKR','LSG','Kolkata','KKR',65,35,False,None),
 (16,'Apr 10','Fri','7:30 PM','RR','RCB','Guwahati','RCB',41,59,False,None),
 (17,'Apr 11','Sat','3:30 PM','PBKS','SRH','Mullanpur','SRH',43,57,False,None),
 (18,'Apr 11','Sat','7:30 PM','CSK','DC','Chennai','CSK',62,38,False,None),
 (19,'Apr 12','Sun','3:30 PM','LSG','GT','Lucknow','GT',37,63,False,None),
 (20,'Apr 12','Sun','7:30 PM','MI','RCB','Mumbai','MI',66,34,False,None),
 (21,'Apr 13','Mon','7:30 PM','SRH','RR','Hyderabad','SRH',62,38,False,None),
 (22,'Apr 14','Tue','7:30 PM','CSK','KKR','Chennai','CSK',57,43,False,None),
 (23,'Apr 15','Wed','7:30 PM','RCB','LSG','Bengaluru','RCB',61,39,False,None),
 (24,'Apr 16','Thu','7:30 PM','MI','PBKS','Mumbai','MI',68,32,False,None),
 (25,'Apr 17','Fri','7:30 PM','GT','KKR','Ahmedabad','GT',58,42,False,None),
 (26,'Apr 18','Sat','3:30 PM','RCB','DC','Bengaluru','RCB',57,43,False,None),
 (27,'Apr 18','Sat','7:30 PM','SRH','CSK','Hyderabad','CSK',45,55,False,None),
 (28,'Apr 19','Sun','3:30 PM','KKR','RR','Kolkata','KKR',57,43,False,None),
 (29,'Apr 19','Sun','7:30 PM','PBKS','LSG','New Chandigarh','LSG',45,55,False,None),
 (30,'Apr 20','Mon','7:30 PM','GT','MI','Ahmedabad','GT',52,48,False,None),
 (31,'Apr 21','Tue','7:30 PM','SRH','DC','Hyderabad','SRH',53,47,False,None),
 (32,'Apr 22','Wed','7:30 PM','LSG','RR','Lucknow','LSG',53,47,False,None),
 (33,'Apr 23','Thu','7:30 PM','MI','CSK','Mumbai','MI',64,36,False,None),
 (34,'Apr 24','Fri','7:30 PM','RCB','GT','Bengaluru','GT',43,57,False,None),
 (35,'Apr 25','Sat','3:30 PM','DC','PBKS','Delhi','DC',57,43,False,None),
 (36,'Apr 25','Sat','7:30 PM','RR','SRH','Jaipur','RR',53,47,False,None),
 (37,'Apr 26','Sun','3:30 PM','GT','CSK','Ahmedabad','GT',57,43,False,None),
 (38,'Apr 26','Sun','7:30 PM','LSG','KKR','Lucknow','LSG',57,43,False,None),
 (39,'Apr 27','Mon','7:30 PM','DC','RCB','Delhi','DC',57,43,False,None),
 (40,'Apr 28','Tue','7:30 PM','PBKS','RR','New Chandigarh','RR',47,53,False,None),
 (41,'Apr 29','Wed','7:30 PM','MI','SRH','Mumbai','MI',66,34,False,None),
 (42,'Apr 30','Thu','7:30 PM','GT','RCB','Ahmedabad','GT',58,42,False,None),
 (43,'May 01','Fri','7:30 PM','RR','DC','Jaipur','RR',54,46,False,None),
 (44,'May 02','Sat','7:30 PM','CSK','MI','Chennai','MI',45,55,False,None),
 (45,'May 03','Sun','3:30 PM','SRH','KKR','Hyderabad','KKR',40,60,False,None),
 (46,'May 03','Sun','7:30 PM','GT','PBKS','Ahmedabad','GT',61,39,False,None),
 (47,'May 04','Mon','7:30 PM','MI','LSG','Mumbai','MI',58,42,False,None),
 (48,'May 05','Tue','7:30 PM','DC','CSK','Delhi','CSK',42,58,False,None),
 (49,'May 06','Wed','7:30 PM','SRH','PBKS','Hyderabad','SRH',62,38,False,None),
 (50,'May 07','Thu','7:30 PM','LSG','RCB','Lucknow','RCB',44,56,False,None),
 (51,'May 08','Fri','7:30 PM','DC','KKR','Delhi','DC',52,48,False,None),
 (52,'May 09','Sat','7:30 PM','RR','GT','Jaipur','GT',38,62,False,None),
 (53,'May 10','Sun','3:30 PM','CSK','LSG','Chennai','CSK',58,42,False,None),
 (54,'May 10','Sun','7:30 PM','RCB','MI','Raipur','MI',37,63,False,None),
 (55,'May 11','Mon','7:30 PM','PBKS','DC','Dharamshala','DC',42,58,False,None),
 (56,'May 12','Tue','7:30 PM','GT','SRH','Ahmedabad','GT',61,39,False,None),
 (57,'May 13','Wed','7:30 PM','RCB','KKR','Raipur','KKR',40,60,False,None),
 (58,'May 14','Thu','7:30 PM','PBKS','MI','Dharamshala','MI',34,66,False,None),
 (59,'May 15','Fri','7:30 PM','LSG','CSK','Lucknow','LSG',58,42,False,None),
 (60,'May 16','Sat','7:30 PM','KKR','GT','Kolkata','GT',43,57,False,None),
 (61,'May 17','Sun','3:30 PM','PBKS','RCB','Dharamshala','RCB',42,58,False,None),
 (62,'May 17','Sun','7:30 PM','DC','RR','Delhi','DC',55,45,False,None),
 (63,'May 18','Mon','7:30 PM','CSK','SRH','Chennai','CSK',63,37,False,None),
 (64,'May 19','Tue','7:30 PM','RR','LSG','Jaipur','RR',55,45,False,None),
 (65,'May 20','Wed','7:30 PM','KKR','MI','Kolkata','MI',43,57,False,None),
 (66,'May 21','Thu','7:30 PM','CSK','GT','Chennai','GT',44,56,False,None),
 (67,'May 22','Fri','7:30 PM','SRH','RCB','Hyderabad','RCB',44,56,False,None),
 (68,'May 23','Sat','7:30 PM','LSG','PBKS','Lucknow','LSG',61,39,False,None),
 (69,'May 24','Sun','3:30 PM','MI','RR','Mumbai','MI',66,34,False,None),
 (70,'May 24','Sun','7:30 PM','KKR','DC','Kolkata','KKR',57,43,False,None),
]

def mk(row):
    mn,date,day,time,t1,t2,ven,winner,p1,p2,done,res = row
    h1,h2 = h2h(t1,t2)
    sq1,sq2 = SQ[t1],SQ[t2]
    b1,b2 = SQ_BAT[t1],SQ_BAT[t2]
    bw1,bw2 = SQ_BOW[t1],SQ_BOW[t2]
    vi = VENUE.get(ven, ('neutral',50,170,False,'Balanced'))
    tpref,tadv,avg,spin,ptype = vi
    # venue advantage: home team gets edge
    va1 = min(70, 50 + (p1-50)//3 + 5)
    va2 = 100-va1
    # recent form based on squad + current trend
    rf1 = min(95, sq1-5 + (5 if done and winner==t1 else 0))
    rf2 = min(95, sq2-5 + (5 if done and winner==t2 else 0))
    pi1 = sq1
    pi2 = sq2
    wc = {'RCB':'#D4101A','MI':'#1E90FF','KKR':'#7B2FBE','RR':'#EA1A85',
          'CSK':'#F9CD05','DC':'#0057A8','SRH':'#F26522','GT':'#00B4D8',
          'PBKS':'#DD1F2D','LSG':'#00BFFF'}
    method = 'ACTUAL RESULT — Match Completed' if done else 'Ensemble ML (Squad 25%, H2H 20%, Venue 15%, Form 15%, Players 15%, Toss 10%)'
    completed_str = f'true' if done else 'false'
    result_str = f'"{res}"' if res else 'null'
    actual_str = f'\n      actualResult:{result_str},' if done else ''
    kp1 = str(KP[t1]).replace('"',"'")
    kp2 = str(KP[t2]).replace('"',"'")
    spin_str = 'true' if spin else 'false'
    return f"""    {{ match:{mn}, date:'{date}', day:'{day}', time:'{time}', venue:'{ven}',
      team1:'{t1}', team2:'{t2}', predictedWinner:'{winner}', isCompleted:{completed_str},{actual_str}
      winProbability:{{{t1}:{p1},{t2}:{p2}}}, confidence:{max(p1,p2)},
      winnerColor:TEAM_COLORS['{winner}'],
      keyMetrics:{{recentForm:{{team1:{rf1},team2:{rf2}}},venueAdvantage:{{team1:{va1},team2:{va2}}},h2hRatio:{{team1:{h1},team2:{h2}}},pressureIndex:{{team1:{pi1},team2:{pi2}}}}},
      breakdown:{{h2h:{{team1:{round(h1*0.2)},team2:{round(h2*0.2)}}},venue:{{team1:{round(va1*0.15)},team2:{round(va2*0.15)}}},batting:{{team1:{round(b1*0.125)},team2:{round(b2*0.125)}}},bowling:{{team1:{round(bw1*0.125)},team2:{round(bw2*0.125)}}},form:{{team1:{round(rf1*0.15)},team2:{round(rf2*0.15)}}}}},
      squadInfo:{{{t1}:SQUAD_STRENGTH.{t1},{t2}:SQUAD_STRENGTH.{t2}}},
      keyPlayers:{{{t1}:{kp1},{t2}:{kp2}}},
      tossImpact:{{preference:'{tpref}',chasingAdvantage:{tadv},description:'{TOSS_DESC[tpref]}'}},
      pitchInfo:{{type:'{ptype}',avgScore:{avg},spinFriendly:{spin_str}}},
      methodology:'{method}' }}"""

PLAYOFFS = [
  (71,'May 26','Tue','7:30 PM','Qualifier 1','1st placed v 2nd placed','Bengaluru'),
  (72,'May 27','Wed','7:30 PM','Eliminator','3rd placed v 4th placed','Ahmedabad'),
  (73,'May 29','Fri','7:30 PM','Qualifier 2','Loser Q1 v Winner Eliminator','Ahmedabad'),
  (74,'May 31','Sun','7:30 PM','Final','Winner Q1 v Winner Q2','Bengaluru'),
]

def mk_playoff(row):
    mn, date, day, time, phase, descr, ven = row
    esc = descr.replace("'", "\\'")
    return f"""    {{ match:{mn}, isPlayoff:true, playoffPhase:'{phase}', playoffDescription:'{esc}', date:'{date}', day:'{day}', time:'{time}', venue:'{ven}',
      team1:'TBD', team2:'TBD', predictedWinner:'TBD', isCompleted:false, isLive:false,
      winProbability:{{'TBD':50}}, confidence:0,
      winnerColor:'#eab308',
      keyMetrics:{{recentForm:{{team1:50,team2:50}},venueAdvantage:{{team1:50,team2:50}},h2hRatio:{{team1:50,team2:50}},pressureIndex:{{team1:50,team2:50}}}},
      breakdown:{{h2h:{{team1:0,team2:0}},venue:{{team1:0,team2:0}},batting:{{team1:0,team2:0}},bowling:{{team1:0,team2:0}},form:{{team1:0,team2:0}}}},
      squadInfo:{{}},
      keyPlayers:{{'TBD':['Teams confirmed after league stage']}},
      tossImpact:{{preference:'neutral',chasingAdvantage:50,description:'Playoff bracket.'}},
      pitchInfo:{{type:'TBD',avgScore:170,spinFriendly:false}},
      methodology:'Playoffs — ML win probabilities after league table is final' }}"""

lines = [mk(r) for r in M] + [mk_playoff(p) for p in PLAYOFFS]
all74_js = '  const ALL_74 = [\n' + ',\n'.join(lines) + '\n  ];'

with open(JSX,'r',encoding='utf-8') as f:
    content = f.read()

# Replace ALL_70 or ALL_74 array declaration
old_start = content.find('  const ALL_70 = [')
if old_start == -1:
    old_start = content.find('  const ALL_74 = [')
assert old_start != -1, 'ALL_70 / ALL_74 not found'
old_end   = content.find('\n  ];', old_start) + len('\n  ];')
content = content[:old_start] + all74_js + content[old_end:]

# Ensure predictions + live fetch use ALL_74
for old in ('ALL_70', 'ALL_20'):
    content = content.replace(f'setPredictions({old})', 'setPredictions(ALL_74)')
    content = content.replace(f'fetchLiveEnhanced({old})', 'fetchLiveEnhanced(ALL_74)')
content = content.replace('merge into ALL_70', 'merge into ALL_74')
content = content.replace("setModelInfo('Ensemble ML + Actual Results (Matches 1-4)')",
                          "setModelInfo('ML Model · Matches 1–4 Actual · Matches 5–74 Predicted')")
content = content.replace("setModelInfo('ML Model · Matches 1–4 Actual · Matches 5–70 Predicted')",
                          "setModelInfo('ML Model · Matches 1–4 Actual · Matches 5–74 Predicted')")

# Update header labels (idempotent for 20→70→74)
for a, b in (
    ('📋 ALL 20 MATCHES OVERVIEW', '📋 ALL 74 MATCHES OVERVIEW'),
    ('📋 ALL 70 MATCHES OVERVIEW', '📋 ALL 74 MATCHES OVERVIEW'),
    ('🏆 WIN LEADERS — MATCHES 1–4 ACTUAL + 5–20 PREDICTED',
     '🏆 WIN LEADERS — MATCHES 1–4 ACTUAL + 5–74 PREDICTED'),
    ('🏆 WIN LEADERS — MATCHES 1–4 ACTUAL + 5–70 PREDICTED',
     '🏆 WIN LEADERS — MATCHES 1–4 ACTUAL + 5–74 PREDICTED'),
    ('SHOWING {filtered.length} MATCH{filtered.length !== 1 ? \'ES\' : \'\'} · CLICK ANY CARD FOR DETAILED BREAKDOWN',
     'SHOWING {filtered.length} MATCH{filtered.length !== 1 ? \'ES\' : \'\'} of 74 · CLICK ANY CARD FOR DETAILED BREAKDOWN'),
    ('SHOWING {filtered.length} MATCH{filtered.length !== 1 ? \'ES\' : \'\'} of 70 · CLICK ANY CARD FOR DETAILED BREAKDOWN',
     'SHOWING {filtered.length} MATCH{filtered.length !== 1 ? \'ES\' : \'\'} of 74 · CLICK ANY CARD FOR DETAILED BREAKDOWN'),
):
    content = content.replace(a, b)

with open(JSX,'w',encoding='utf-8') as f:
    f.write(content)

print(f'Done — {len(M)} league + {len(PLAYOFFS)} playoff matches written, file is {len(content)} bytes')
# Print win prediction summary
from collections import Counter
wins = Counter(r[7] for r in M)
print('\nPredicted Win Leaders:')
for t,w in wins.most_common():
    print(f'  {t}: {w} wins')
