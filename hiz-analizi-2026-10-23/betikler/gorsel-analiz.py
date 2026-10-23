"""gorsel-olcum.js ciktisini isler: sayfada inen her gorsel icin tablo (CSV) ve ozet (JSON).
Kullanim: python3 gorsel-analiz.py <gorsel_klasoru> <tema_klasoru> <envanter.csv> <cikis_klasoru>"""
import json, sys, os, glob, re, csv
from urllib.parse import urlparse, parse_qs

gdir, tdir, envf, out = sys.argv[1:5]
os.makedirs(out, exist_ok=True)

# bolum anahtari -> bolum turu (sablon ve bolum grubu JSON'larindan)
tur = {}
for f in glob.glob(os.path.join(tdir, 'templates', '*.json')) + glob.glob(os.path.join(tdir, 'sections', '*.json')):
    s = re.sub(r'^/\*.*?\*/', '', open(f, encoding='utf-8').read(), flags=re.S)
    try: d = json.loads(s)
    except Exception: continue
    for k, v in (d.get('sections') or {}).items():
        if isinstance(v, dict) and v.get('type'): tur.setdefault(k, v['type'])

def bolum_dosya(bolum):
    if not bolum: return ''
    anahtar = re.sub(r'^(template|sections)--\d+__', '', bolum)
    t = tur.get(anahtar, anahtar)
    p = os.path.join('sections', t + '.liquid')
    return p if os.path.exists(os.path.join(tdir, p)) else t

# envanter: dosya adi -> satir
env = {}
for r in csv.DictReader(open(envf)):
    if r['dosya_adi']: env.setdefault(r['dosya_adi'].lower(), r)

def ad(url):
    p = urlparse(url if url.startswith('http') else 'https:' + url).path
    return p.rsplit('/', 1)[-1]

def kaynak_turu(url):
    u = url if url.startswith('http') else 'https:' + url
    p = urlparse(u); q = parse_qs(p.query)
    if 'texttonext.com' not in p.netloc and 'cdn.shopify.com' not in p.netloc: return 'harici:' + p.netloc
    if '/cdn/shop/t/' in p.path: return 'tema-asset (asset_url)'
    if '/preview_images/' in p.path: return 'video-kapak (Shopify)'
    if '/cdn/shop/files/' in p.path or '/cdn/shop/products/' in p.path:
        if 'width' in q or 'height' in q or re.search(r'_\d+x\d*\.', p.path) or re.search(r'_x\d+\.', p.path): return 'CDN image_url (boyutlu)'
        return 'CDN files (boyutsuz, orijinal)'
    return 'diger'

satirlar = []; ozet = {}
for f in sorted(glob.glob(os.path.join(gdir, '*.json'))):
    d = json.load(open(f)); dpr = d['dpr']; vw = d['viewport']['width']; vh = d['viewport']['height']
    ist = {}
    for x in d['istekler']:
        if x.get('url'): ist.setdefault(x['url'], x)
    ilk = {i['i']: i for i in d['ilk']['imgs']}
    toplam_img_kb = 0
    for x in d['istekler']:
        if x.get('tur') == 'image' and x.get('govde'): toplam_img_kb += x['govde'] / 1024
    gorulen = set()
    for im in d['son']['imgs']:
        src = im.get('currentSrc') or ''
        if not src or src.startswith('data:'): continue
        r = ist.get(src) or ist.get(src.replace('http:', 'https:'))
        kb = round((r.get('govde') or 0) / 1024, 1) if r else None
        bicim = (r.get('ctype') or '').replace('image/', '') if r else ''
        ilk_kayit = ilk.get(im['i'], {})
        # srcset (w tanimli) gorsellerde naturalWidth yogunluga gore duzeltilmis deger verir (sizes'a esit);
        # indirilen gercek piksel genisligi URL'deki width= ya da _NNNx ekinden okunur.
        mw = re.search(r'[?&]width=(\d+)', src) or re.search(r'_(\d+)x\d*\.', src)
        ind_px = int(mw.group(1)) if mw else im['naturalWidth']
        gerek = round(im['w'] * dpr) if im['w'] else 0
        oran = round(ind_px / gerek, 2) if gerek and ind_px else None
        e = env.get(ad(src).lower())
        satirlar.append({
            'sayfa': d['ad'], 'mod': d['mod'], 'bolum': re.sub(r'^(template|sections)--\d+__', '', im['bolum'] or ''), 'dosya': bolum_dosya(im['bolum']),
            'url': src.split('?')[0], 'tam_url': src, 'kaynak': kaynak_turu(src), 'bicim': bicim, 'kb': kb,
            'indirilen_px': ind_px, 'gosterilen_css_px': im['w'], 'gereken_px': gerek, 'fazlalik_orani': oran,
            'loading': im['loading'], 'fetchpriority': im['fetchpriority'], 'sizes': im['sizes'], 'srcset': 'var' if im['srcset'] else 'yok',
            'ilk_ekran': bool(ilk_kayit.get('ilkEkran')), 'gorunur': im['gorunur'],
            'orijinal_kb': e['kb'] if e else '', 'orijinal_px': e['genislik'] if e else '', 'orijinal_bicim': e['mime'] if e else '',
        })
        gorulen.add(src)
    for a in d['son']['arka']:
        for u in re.findall(r'url\("?([^")]+)"?\)', a['bg']):
            if u.startswith('data:'): continue
            r = ist.get(u) or ist.get('https:' + u if u.startswith('//') else u)
            satirlar.append({'sayfa': d['ad'], 'mod': d['mod'], 'bolum': re.sub(r'^(template|sections)--\d+__', '', a['bolum'] or ''), 'dosya': bolum_dosya(a['bolum']),
                             'url': u.split('?')[0], 'tam_url': u, 'kaynak': 'CSS arka plan / ' + kaynak_turu(u), 'bicim': (r or {}).get('ctype', ''), 'kb': round(((r or {}).get('govde') or 0) / 1024, 1),
                             'indirilen_px': '', 'gosterilen_css_px': a['w'], 'gereken_px': round(a['w'] * dpr), 'fazlalik_orani': '', 'loading': 'css', 'fetchpriority': '', 'sizes': '', 'srcset': '',
                             'ilk_ekran': a['ilkEkran'], 'gorunur': True, 'orijinal_kb': '', 'orijinal_px': '', 'orijinal_bicim': ''})
    # img etiketi olmayan gorsel istekleri (video kapaklari, JS ile yuklenenler)
    for x in d['istekler']:
        if x.get('tur') == 'image' and x['url'] not in gorulen and x.get('govde'):
            satirlar.append({'sayfa': d['ad'], 'mod': d['mod'], 'bolum': '(img etiketi yok)', 'dosya': '', 'url': x['url'].split('?')[0], 'tam_url': x['url'], 'kaynak': kaynak_turu(x['url']),
                             'bicim': (x.get('ctype') or '').replace('image/', ''), 'kb': round(x['govde'] / 1024, 1), 'indirilen_px': '', 'gosterilen_css_px': '', 'gereken_px': '', 'fazlalik_orani': '',
                             'loading': '', 'fetchpriority': '', 'sizes': '', 'srcset': '', 'ilk_ekran': '', 'gorunur': '', 'orijinal_kb': '', 'orijinal_px': '', 'orijinal_bicim': ''})
    medya = [{'url': x['url'].split('?')[0][-90:], 'kb': round((x.get('govde') or 0) / 1024), 'durum': x.get('durum'), 'crange': x.get('crange')} for x in d['istekler'] if x.get('tur') == 'media']
    ozet[f"{d['ad']}|{d['mod']}"] = {
        'img_istek': sum(1 for x in d['istekler'] if x.get('tur') == 'image'), 'img_kb': round(toplam_img_kb),
        'medya_kb': round(sum((x.get('govde') or 0) for x in d['istekler'] if x.get('tur') == 'media') / 1024), 'medya': medya,
        'lcp_adaylari': d['ilk']['lcp'][-3:], 'video': d['son']['videolar'], 'sayfa_yuksekligi': d['son']['scrollH'],
    }
alan = list(satirlar[0].keys())
with open(os.path.join(out, 'sayfa-gorselleri.csv'), 'w', newline='') as fo:
    w = csv.DictWriter(fo, fieldnames=alan); w.writeheader(); w.writerows(satirlar)
json.dump(ozet, open(os.path.join(out, 'sayfa-gorselleri-ozet.json'), 'w'), ensure_ascii=False, indent=1)
print('satir', len(satirlar))
