# Kullanim: python3 -I ozet.py <hiz2_klasoru> <cikis.json>
# Lighthouse (lh-once, lh-sonra), gorunur-*.json ve lhv-* sonuclarindan medyan tablolar uretir.
import glob, json, os, statistics, sys

kok = sys.argv[1]
SAYFALAR = ['anasayfa', 'couple-landing', 'kunye', 'astor-chloe-couple', 'noir', 'kral-zincir', 'couple-urunler']


def med(x):
    x = [v for v in x if v is not None]
    return round(statistics.median(x), 3) if x else None


def lh_tur(p):
    d = json.load(open(p))
    a = d['audits']
    it = a['network-requests']['details']['items']
    video = sum(i.get('resourceSize', 0) for i in it if '.mp4' in i['url'])
    takip = [i['url'] for i in it if any(k in i['url'] for k in ('facebook.com/tr', 'connect.facebook.net', 'googletagmanager', 'google-analytics', 'googleadservices', 'doubleclick', 'analytics.tiktok', 'trueprofit')) and i.get('statusCode', 0) not in (0, -1)]
    return {
        'puan': round((d['categories']['performance']['score'] or 0) * 100),
        'lcp_sn': round(a['largest-contentful-paint']['numericValue'] / 1000, 2),
        'si_sn': round(a['speed-index']['numericValue'] / 1000, 2),
        'tbt_ms': round(a['total-blocking-time']['numericValue']),
        'cls': round(a['cumulative-layout-shift']['numericValue'], 3),
        'toplam_kb': round(a['total-byte-weight']['numericValue'] / 1024),
        'video_mb': round(video / 1048576, 2),
        'gecen_takip': len(takip),
    }


sonuc = {'lighthouse': {}, 'gorunur': {}, 'lh_video': {}}
for et in ('once', 'sonra'):
    sonuc['lighthouse'][et] = {}
    for s in SAYFALAR:
        turlar = [lh_tur(p) for p in sorted(glob.glob(os.path.join(kok, 'lh-%s/%s-mobil-*.json' % (et, s))))]
        if not turlar:
            continue
        sonuc['lighthouse'][et][s] = {k: med([t[k] for t in turlar]) for k in turlar[0]}
        sonuc['lighthouse'][et][s]['tur'] = len(turlar)
        sonuc['lighthouse'][et][s]['cls_en_yuksek'] = max(t['cls'] for t in turlar)
    g = os.path.join(kok, 'gorunur-%s.json' % et)
    if os.path.exists(g):
        d = json.load(open(g))
        sonuc['gorunur'][et] = {}
        for s in SAYFALAR:
            r = [x for x in d if x['ad'] == s]
            if not r:
                continue
            sonuc['gorunur'][et][s] = {
                'gorunur_an_ms': med([x.get('gorunur_an') for x in r]),
                'fcp_ms': med([x.get('fcp') for x in r]),
                'lcp_ms': med([x.get('lcp') for x in r]),
                'dcl_ms': med([x.get('dcl') for x in r]),
                'load_ms': med([x.get('load') for x in r]),
                'cls': med([x.get('cls') for x in r]),
                'perde': any(x.get('perde_var') for x in r),
                'video_mb': med([x.get('videoMB') for x in r]),
                'gecen_takip': sum(len(x.get('gecenTakip', [])) for x in r),
                'engellenen': med([sum(x.get('engellenen', {}).values()) for x in r]),
                'tur': len(r),
            }
    sonuc['lh_video'][et] = {}
    for s in SAYFALAR:
        p = os.path.join(kok, 'lhv-%s/%s.json' % (et, s))
        if not os.path.exists(p):
            continue
        d = json.load(open(p))
        it = d['audits']['network-requests']['details']['items']
        v = [i for i in it if '.mp4' in i['url']]
        sonuc['lh_video'][et][s] = {
            'video_mb': round(sum(i.get('resourceSize', 0) for i in v) / 1048576, 2),
            'istekler': [(i['url'].split('?')[0].split('/')[-1][:60], round(i.get('resourceSize', 0) / 1024)) for i in v],
        }
json.dump(sonuc, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)

# Ekrana kisa tablolar
L = sonuc['lighthouse']
print('LIGHTHOUSE (medyan, telefon): sayfa | puan | LCP | SI | TBT | CLS | toplam KB | video MB')
for s in SAYFALAR:
    o, n = L.get('once', {}).get(s), L.get('sonra', {}).get(s)
    if o and n:
        print(s, '|', o['puan'], '->', n['puan'], '|', o['lcp_sn'], '->', n['lcp_sn'], '|', o['si_sn'], '->', n['si_sn'], '|', o['tbt_ms'], '->', n['tbt_ms'], '|', o['cls'], '->', n['cls'], '|', o['toplam_kb'], '->', n['toplam_kb'], '|', o['video_mb'], '->', n['video_mb'])
G = sonuc['gorunur']
print('GORUNUR AN (medyan, ms): sayfa | gorunur | DCL | load | CLS | video MB')
for s in SAYFALAR:
    o, n = G.get('once', {}).get(s), G.get('sonra', {}).get(s)
    if o and n:
        print(s, '|', o['gorunur_an_ms'], '->', n['gorunur_an_ms'], '|', o['dcl_ms'], '->', n['dcl_ms'], '|', o['load_ms'], '->', n['load_ms'], '|', o['cls'], '->', n['cls'], '|', o['video_mb'], '->', n['video_mb'], '| perde', o['perde'], '->', n['perde'])
V = sonuc['lh_video']
print('LH VARSAYILAN + DURULANA KADAR, ILK ACILIS VIDEO MB: sayfa | canli | kopya')
for s in SAYFALAR:
    o, n = V.get('once', {}).get(s), V.get('sonra', {}).get(s)
    if o or n:
        print(s, '|', o and o['video_mb'], '|', n and n['video_mb'], '|', n and n['istekler'])
