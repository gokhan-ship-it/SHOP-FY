import json,sys
d=json.load(open(sys.argv[1]))
for v in d:
    if v['cihaz']!='telefon' and len(sys.argv)<3: continue
    print('=====',v['ad'],v['cihaz'],v.get('tema'))
    print('  palet disi:',{k:(x['n'],x['ornek'][:2]) for k,x in v['disi'].items()})
    print('  neon:',len(v['neon']),v['neon'][:4],'| acik zeminde neon yazi:',v['neonAcikYazi'][:3])
    print('  font:',v['fontAile'],'| dosyalar:',[f.split('/')[-1][:40] for f in v['fontDosyalari']])
    print('  basliklar:',[(b['metin'][:25],b['boyut'],b['agirlik'],b['harf']) for b in v['basliklar']][:6])
    print('  butonlar:',[(b['metin'],b['boyut'],b['zemin'],b['yazi'],b['kenar'],'pill' if b['pill'] else 'KOSELI') for b in v['butonlar']][:6])
    print('  kucuk hedef:',[(b['metin'],b['boyut']) for b in v['kucukHedef']][:8])
    print('  linkler (mavi/altcizgi):',[(l['metin'][:20],l['renk'],l['alti'],'MAVI' if l['mavi'] else '') for l in v['linkler']][:8])
    print('  ikonlar:',[(i['boyut'],i['renkler'],'DOLGU' if i['dolgu'] else '') for i in v['ikonlar']][:6])
    print('  koseler:',v['koseler'],'| golgeler:',v['golgeler'][:3])
    print('  kontrast:',[(k['metin'][:25],k['renk'],k['zemin'],k['oran']) for k in v['kontrast']][:5])
