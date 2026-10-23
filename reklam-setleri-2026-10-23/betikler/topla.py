# Kullanim: python3 -I topla.py <cikis.json> <arac_sonucu1> <arac_sonucu2> ...  (alias 'canli' sayfalari birlestirir)
import json,sys
t=[]
for p in sys.argv[2:]:
    d=json.load(open(p))['data']; f=d['canli']['files']; t+=f['nodes']; son=f['pageInfo']
assert not son['hasNextPage'], son
json.dump(t,open(sys.argv[1],'w'),indent=1,ensure_ascii=False)
print(len(t),'dosya; en yeni updatedAt', max(x['updatedAt'] for x in t))
