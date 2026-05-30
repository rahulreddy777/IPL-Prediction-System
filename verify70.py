import re

path = r'frontend/src/pages/Predictions2026.jsx'
with open(path,'r',encoding='utf-8') as f:
    content = f.read()

checks = [
    ('ALL_70 array', 'const ALL_70 = ['),
    ('setPredictions(ALL_70)', 'setPredictions(ALL_70)'),
    ('Match 70', 'match:70'),
    ('Match 1 completed', 'RCB won by 6 wickets'),
    ('New Chandigarh', 'New Chandigarh'),
    ('Raipur', 'Raipur'),
    ('Dharamshala', 'Dharamshala'),
    ('ALL 70 label', 'ALL 70 MATCHES'),
]

print(f'File size: {len(content)} bytes')
for name, marker in checks:
    found = marker in content
    print(f'  {"OK" if found else "MISS"}: {name}')

matches = re.findall(r'match:(\d+),', content)
match_nums = sorted(set(int(x) for x in matches))
print(f'Match entries: {len(match_nums)} found ({match_nums[0]}-{match_nums[-1]})')

# Check for unclosed brackets
opens = content.count('{') - content.count('}')
print(f'Brace balance: {opens} (0 = balanced)')
