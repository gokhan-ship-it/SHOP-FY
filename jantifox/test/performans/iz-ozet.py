"""Chromium izi (trace) özeti: ana iş parçacığında olay türü başına toplam süre ve 50 ms'den uzun görevlerin içeriği.
Kullanım: python3 -I test/performans/iz-ozet.py iz.json"""
import json, sys, collections

d = json.load(open(sys.argv[1]))
olaylar = d['traceEvents'] if isinstance(d, dict) else d
# Ana iş parçacığı: CrRendererMain
ana = {(e['pid'], e['tid']) for e in olaylar if e.get('name') == 'thread_name' and e.get('args', {}).get('name') == 'CrRendererMain'}
toplam = collections.Counter()
gorevler = []
for e in olaylar:
    if (e.get('pid'), e.get('tid')) not in ana or e.get('ph') != 'X':
        continue
    dur = e.get('dur', 0) / 1000
    if e['name'] == 'RunTask' and dur >= 50:
        gorevler.append((e['ts'], dur))
    toplam[e['name']] += dur
print('Ana iş parçacığı, olay türü başına (ms):')
for ad, ms in toplam.most_common(18):
    print('  %-34s %7.0f' % (ad, ms))
print('50 ms üstü görevler: %d' % len(gorevler))
for ts, dur in sorted(gorevler, key=lambda x: -x[1])[:8]:
    ic = collections.Counter()
    for e in olaylar:
        if (e.get('pid'), e.get('tid')) in ana and e.get('ph') == 'X' and e['name'] != 'RunTask' and ts <= e['ts'] <= ts + dur * 1000:
            ic[e['name'] + ('' if e['name'] not in ('FunctionCall', 'EvaluateScript', 'TimerFire', 'EventDispatch') else ' ' + str((e.get('args', {}).get('data') or {}).get('url', '') or (e.get('args', {}).get('data') or {}).get('type', '')).split('/')[-1].split('?')[0])] += e.get('dur', 0) / 1000
    print('  %.0f ms: %s' % (dur, ', '.join('%s %.0f' % (k, v) for k, v in ic.most_common(5))))
