# Kullanim: python3 -I oturumdan.py <oturum.jsonl> <baslangic_iso> <cikis.json>
# Oturum kaydindaki 'canli' tema dosya listesi sonuclarini (baslangic zamanindan sonrakiler) birlestirir.
import json, sys
yol, bas, cikis = sys.argv[1:4]
dosyalar = {}
for satir in open(yol, encoding='utf-8'):
    try: k = json.loads(satir)
    except Exception: continue
    if k.get('timestamp', '') < bas: continue
    icerik = (k.get('message') or {}).get('content')
    if not isinstance(icerik, list): continue
    for p in icerik:
        if not isinstance(p, dict) or p.get('type') != 'tool_result': continue
        c = p.get('content')
        metinler = [c] if isinstance(c, str) else [x.get('text', '') for x in (c or []) if isinstance(x, dict)]
        for m in metinler:
            if '"canli":{"role":"MAIN"' not in m: continue
            try: d = json.loads(m)
            except Exception: continue
            for n in d['data']['canli']['files']['nodes']: dosyalar[n['filename']] = n
t = sorted(dosyalar.values(), key=lambda x: x['filename'])
json.dump(t, open(cikis, 'w'), indent=1, ensure_ascii=False)
print(len(t), 'dosya; en yeni updatedAt', max(x['updatedAt'] for x in t))
