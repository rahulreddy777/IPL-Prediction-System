"""Quick verification script – run with the venv python."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from predict_all_20 import predict_all_20

preds = predict_all_20()
for p in preds:
    sq  = p["squadInfo"]
    t1, t2 = p["team1"], p["team2"]
    toss_pref = p["tossImpact"]["preference"]
    pitch_type = p["pitchInfo"]["type"]
    sq1_overall = sq[t1]["overall"]
    sq2_overall = sq[t2]["overall"]
    print(
        f"M{p['match']:>2}: {t1} vs {t2} @ {p['venue']:<12} "
        f"=> {p['predictedWinner']:<4} ({p['confidence']:.1f}%) "
        f"| Toss:{toss_pref:<7} Pitch:{pitch_type:<8} "
        f"| Squad {t1}:{sq1_overall} vs {t2}:{sq2_overall}"
    )

p0 = preds[0]
print()
print("=== New output fields present in every prediction ===")
for k in ["tossImpact", "pitchInfo", "squadInfo", "keyMetrics", "keyPlayers"]:
    print(f"  {k}: {k in p0}")
print(f"\nTotal matches: {len(preds)}")
print("DC key players (sample):", p0["keyPlayers"].get("DC", ["(DC not in match 1)"])[0])
# show DC squad overall
for p in preds:
    if p["team1"] == "DC" or p["team2"] == "DC":
        sq = p["squadInfo"]
        dc = sq.get("DC", {})
        print(f"\nDC squads – overall:{dc.get('overall')} batting:{dc.get('batting')} bowling:{dc.get('bowling')} allRound:{dc.get('allRound')}")
        print("DC depth:", dc.get("depth"))
        break

print("\nSQUAD_DISPLAY rankings by overall:")
from predict_all_20 import SQUAD_DISPLAY
for team, info in sorted(SQUAD_DISPLAY.items(), key=lambda x: -x[1]["overall"]):
    print(f"  {team:<4}: {info['overall']:>3} | bat:{info['batting']} bowl:{info['bowling']} ar:{info['allRound']}")
