"""Lighthouse JSON'larini ozetler. Her sayfa+mod icin 3 turun medyani (metrik bazinda),
ayrinti icin performans puani medyan olan tur kullanilir.
Kullanim: python3 lh-ozet.py <lighthouse_klasoru> <cikis.json>"""
import json, sys, glob, os, statistics, re
from collections import defaultdict

src, out = sys.argv[1], sys.argv[2]
gruplar = defaultdict(list)
for f in sorted(glob.glob(os.path.join(src, '*.json'))):
    m = re.match(r'(.+)-(mobil|masaustu)-(\d)\.json$', os.path.basename(f))
    if not m: continue
    d = json.load(open(f))
    if d.get('runtimeError'): print('runtimeError', f, d['runtimeError']); continue
    gruplar[(m.group(1), m.group(2))].append((int(m.group(3)), f, d))

MET = {'fcp': 'first-contentful-paint', 'lcp': 'largest-contentful-paint', 'tbt': 'total-blocking-time',
       'cls': 'cumulative-layout-shift', 'si': 'speed-index', 'tti': 'interactive', 'bayt': 'total-byte-weight'}

def det(a, k):
    return (a.get(k) or {}).get('details') or {}

def ozet_tur(d):
    a = d['audits']
    r = {k: a[v].get('numericValue') for k, v in MET.items()}
    r['puan'] = d['categories']['performance']['score']
    r['istek'] = len(det(a, 'network-requests').get('items', []))
    return r

sonuc = {}
for (ad, mod), turlar in sorted(gruplar.items()):
    ozetler = [ozet_tur(d) for _, _, d in turlar]
    med = {k: statistics.median([o[k] for o in ozetler if o[k] is not None]) for k in ozetler[0]}
    # ayrinti turu: puani medyana en yakin
    turlar_s = sorted(zip(ozetler, turlar), key=lambda x: x[0]['puan'])
    o_sec, (tno, fyol, d) = turlar_s[len(turlar_s) // 2]
    a = d['audits']
    lcpb = det(a, 'lcp-breakdown-insight').get('items', [])
    lcp_parca = {}; lcp_el = None
    for it in lcpb:
        if it.get('type') == 'table':
            for x in it['items']: lcp_parca[x['subpart']] = round(x['duration'])
        if it.get('type') == 'node': lcp_el = {k: it.get(k) for k in ('selector', 'snippet', 'boundingRect')}
    lcpd = {}
    for it in det(a, 'lcp-discovery-insight').get('items', []):
        if it.get('type') == 'checklist': lcpd = {k: v['value'] for k, v in it['items'].items()}
    kaynak = {x['resourceType']: {'adet': x['requestCount'], 'kb': round(x['transferSize'] / 1024)} for x in det(a, 'resource-summary').get('items', [])}
    rb = [{'url': x['url'].split('?')[0], 'kb': round((x.get('totalBytes') or 0) / 1024, 1), 'ms': round(x.get('wastedMs') or 0)} for x in det(a, 'render-blocking-insight').get('items', [])]
    ucuncu = [{'ad': x.get('entity'), 'kb': round((x.get('transferSize') or 0) / 1024), 'ana_is_ms': round(x.get('mainThreadTime') or 0)} for x in det(a, 'third-parties-insight').get('items', [])]
    boot = [{'url': x['url'].split('?')[0], 'toplam_ms': round(x['total']), 'betik_ms': round(x.get('scripting', 0)), 'ayristirma_ms': round(x.get('scriptParseCompile', 0))} for x in det(a, 'bootup-time').get('items', [])[:15]]
    ana = {x['groupLabel']: round(x['duration']) for x in det(a, 'mainthread-work-breakdown').get('items', [])}
    gorsel = [{'url': x['url'], 'kb': round(x['totalBytes'] / 1024), 'kazanc_kb': round(x['wastedBytes'] / 1024),
               'sebep': [s.get('reason') for s in (x.get('subItems') or {}).get('items', [])],
               'secici': (x.get('node') or {}).get('selector')} for x in det(a, 'image-delivery-insight').get('items', [])]
    kjs = [{'url': x['url'].split('?')[0], 'kb': round(x['totalBytes'] / 1024), 'kullanilmayan_kb': round(x['wastedBytes'] / 1024)} for x in det(a, 'unused-javascript').get('items', [])[:12]]
    font = [{'url': x.get('url'), 'ms': round(x.get('wastedMs') or 0)} for x in det(a, 'font-display-insight').get('items', [])]
    istekler = det(a, 'network-requests').get('items', [])
    img_ist = sorted([{'url': x['url'], 'kb': round(x.get('transferSize', 0) / 1024), 'tur': x.get('resourceType'), 'mime': x.get('mimeType'), 'oncelik': x.get('priority'), 'bas_ms': round(x.get('networkRequestTime') or 0), 'bit_ms': round(x.get('networkEndTime') or 0)}
                      for x in istekler if x.get('resourceType') in ('Image', 'Media')], key=lambda y: -y['kb'])
    uzun = [{'url': (x.get('url') or '').split('?')[0], 'ms': round(x['duration']), 'bas': round(x['startTime'])} for x in det(a, 'long-tasks').get('items', [])[:10]]
    sonuc[f'{ad}|{mod}'] = {
        'turlar': ozetler, 'medyan': med, 'ayrinti_turu': tno, 'ayrinti_dosya': os.path.basename(fyol),
        'lcp_oge': lcp_el, 'lcp_parcalari_ms': lcp_parca, 'lcp_kesif': lcpd, 'kaynak_ozet': kaynak, 'render_bloklayan': rb,
        'ucuncu_taraf': ucuncu, 'betik_suresi': boot, 'ana_is_dagilimi_ms': ana, 'gorsel_teslim': gorsel,
        'kullanilmayan_js': kjs, 'font_display': font, 'gorsel_video_istekleri': img_ist[:40], 'uzun_gorevler': uzun,
        'benchmarkIndex': d['environment'].get('benchmarkIndex'), 'lh_surum': d.get('lighthouseVersion'),
        'kesinti': d['configSettings'].get('throttling'), 'yontem': d['configSettings'].get('throttlingMethod'),
    }
json.dump(sonuc, open(out, 'w'), ensure_ascii=False, indent=1)
for k, v in sonuc.items():
    m = v['medyan']
    print(f"{k:32s} puan {m['puan']:.2f} FCP {m['fcp']/1000:.1f}s LCP {m['lcp']/1000:.1f}s TBT {m['tbt']:.0f}ms CLS {m['cls']:.3f} SI {m['si']/1000:.1f}s bayt {m['bayt']/1024:.0f}KB istek {m['istek']:.0f}")
