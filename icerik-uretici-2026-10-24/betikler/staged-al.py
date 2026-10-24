# Kullanim: staged-al.py <isaret> <cikti.json>  -- oturum kaydindan son stagedUploadsCreate sonucunu cikarir
import json,sys
p='/root/.claude/projects/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d.jsonl'
isaret,cikti=sys.argv[1],sys.argv[2]
son=None
for line in open(p,encoding='utf-8'):
    if isaret not in line: continue
    o=json.loads(line)
    def walk(x):
        if isinstance(x,dict):
            for v in x.values(): yield from walk(v)
        elif isinstance(x,list):
            for v in x: yield from walk(v)
        elif isinstance(x,str): yield x
    for s in walk(o):
        k=s.find('{"data":{"stagedUploadsCreate"')
        if k>=0 and isaret in s:
            try: son=json.JSONDecoder().raw_decode(s[k:])[0]
            except ValueError: pass
t=son['data']['stagedUploadsCreate']['stagedTargets']
json.dump(t,open(cikti,'w'),indent=1)
print(len(t))
