"""Alan paneli için veri dosyası (veri.js) ve gösterim görsellerini (gorseller/*.webp) üretir.

Kullanım (jantifox/ klasöründen):
    python3 -I araclar/alan-paneli/panel-verisi.py veri/urunler araclar/alan-paneli

Girdiler (veri/urunler altında):
    plan.json      gruplar, ürünler, durum, seçilen PNG, ölçüler (1. aşama, hazirla.py sonrası elle tamamlanır)
    on-dolgu.json  isteğe bağlı: ürün başına önceden çizilmiş şekiller (px) ve ölçek çizgisi
    mevcut.json    isteğe bağlı: mağazada haritası / görseli zaten olan ürünler
    png/           hazirla.py'nin ürettiği şeffaf PNG'ler (mağazaya yüklenecek olanlar)

Çıktılar:
    veri.js        window.PANEL_VERI = {...}
    gorseller/     panelde gösterilen WebP kopyaları (PNG ile aynı piksel boyutunda; koordinatlar PNG'ye göre)
                   ve sihirli değnek için aynı görselin data: adresli betik kopyası (<handle>.js)
"""
import base64
import json
import os
import sys

from PIL import Image

CANTA_GRUPLARI = ('Tote', 'Spor', 'Sırt')  # aksesuar takılabilen gruplar (ad içinde geçen)
COKLU_ALAN = ('Sırt',)  # iki alan (üst panel, alt cep) çizilen gruplar


def webp_yaz(kaynak, hedef):
    img = Image.open(kaynak).convert('RGBA')
    if not os.path.exists(hedef) or os.path.getmtime(hedef) < os.path.getmtime(kaynak):
        img.save(hedef, 'WEBP', quality=82, method=6)
    # Sihirli değnek görselin piksellerini okur. Dosyadan (file://) açılan sayfada tarayıcı <img> piksellerini okutmaz;
    # aynı görsel bir betik dosyasında data: adresi olarak da verilir (yalnızca değnek kullanılınca yüklenir).
    betik = os.path.splitext(hedef)[0] + '.js'
    if not os.path.exists(betik) or os.path.getmtime(betik) < os.path.getmtime(hedef):
        ad = os.path.splitext(os.path.basename(hedef))[0]
        with open(hedef, 'rb') as f:
            veri = base64.b64encode(f.read()).decode('ascii')
        with open(betik, 'w', encoding='ascii') as f:
            f.write('(window.PANEL_PIKSEL = window.PANEL_PIKSEL || {})[%s] = "data:image/webp;base64,%s";\n' % (json.dumps(ad), veri))
    return img.size


def haritadan_sekiller(h, en, boy):
    """Mağazadaki harita (%) → panel şekilleri (px). Aksesuar dış ölçüsü (dis) alınmaz."""
    px = lambda v, t: round(float(v) / 100 * t, 2)
    sekiller = []
    for i, z in enumerate(h.get('zones') or []):
        s = {'tur': 'alan', 'ad': z.get('ad') or z.get('id') or 'Alan', 'shape': z.get('shape', 'rect'),
             'x': px(z['x'], en), 'y': px(z['y'], boy), 'w': px(z['w'], en), 'h': px(z['h'], boy),
             'tipler': z.get('allowed_types') or ['letter', 'number', 'icon']}
        if z.get('shape') == 'poly':
            kaynak = (z.get('duzen') or {}).get('noktalar') or z.get('points') or []
            s['noktalar'] = [[px(q[0], en), px(q[1], boy)] for q in kaynak]
            s['yumusat'] = (z.get('duzen') or {}).get('yumusat', 0) if z.get('duzen') else 0
        cm = z.get('cap_cm') or z.get('genislik_cm')
        if cm:
            s['olcuCm'] = cm
            s['olcuYon'] = 'genislik'
        if z.get('kose_cm'):
            s['koseCm'] = z['kose_cm']
        sekiller.append(s)
    for z in h.get('forbidden') or []:
        y = {'tur': 'yasak', 'ad': z.get('ad') or 'Bölge', 'shape': z.get('shape', 'rect'),
             'x': px(z['x'], en), 'y': px(z['y'], boy), 'w': px(z['w'], en), 'h': px(z['h'], boy)}
        if z.get('shape') == 'poly':
            kaynak = (z.get('duzen') or {}).get('noktalar') or z.get('points') or []
            y['noktalar'] = [[px(q[0], en), px(q[1], boy)] for q in kaynak]
            y['yumusat'] = (z.get('duzen') or {}).get('yumusat', 0) if z.get('duzen') else 0
        sekiller.append(y)
    return sekiller


def main(veri_kok, cikti_kok):
    plan = json.load(open(os.path.join(veri_kok, 'plan.json'), encoding='utf-8'))
    yol = lambda ad: os.path.join(veri_kok, ad)
    on_dolgu = json.load(open(yol('on-dolgu.json'), encoding='utf-8')) if os.path.exists(yol('on-dolgu.json')) else {}
    mevcut = json.load(open(yol('mevcut.json'), encoding='utf-8')) if os.path.exists(yol('mevcut.json')) else {}
    gorsel_kok = os.path.join(cikti_kok, 'gorseller')
    os.makedirs(gorsel_kok, exist_ok=True)
    jantifox_kok = os.path.abspath(os.path.join(cikti_kok, '..', '..'))

    gruplar, urunler = [], []
    for gi, g in enumerate(plan['gruplar']):
        canta = any(k in g['ad'] for k in CANTA_GRUPLARI)
        coklu = any(k in g['ad'] for k in COKLU_ALAN)
        # tek_patch: tek patch'lik grup (ör. mini çanta); set ve aksesuar kapalı, harf sığma denetimi yok
        tek = bool(g.get('tek_patch'))
        gruplar.append({'ad': g['ad'], 'velcro': g.get('velcro'), 'urun_olcu': g.get('urun_olcu'),
                        'not': g.get('not', ''), 'cokluAlan': coklu, 'tekPatch': tek})
        for u in g['urunler']:
            h = u['handle']
            m = mevcut.get(h)
            od = on_dolgu.get(h, {})
            kayit = {
                'handle': h, 'urunId': u['urun_id'], 'baslik': u['baslik'], 'grup': gi,
                'not': u.get('not', ''), 'png': None, 'gorsel': None, 'mevcut': None,
                'sekiller': od.get('sekiller', []), 'cizgi': od.get('cizgi'), 'onDolguKaynak': od.get('kaynak', ''),
                'ayar': {'metinSiniri': None, 'kapali': False,
                         'izinler': {'harf': True, 'rakam': True, 'ikon': True, 'set': not tek, 'aksesuar': canta and not tek}},
            }
            durum = {'cizilecek': 'cizilecek', 'hazir': 'hazir', 'kopyalanabilir': 'hazir',
                     'patch_alani_yok': 'atlandi'}.get(u['durum'], 'cizilecek')
            kaynak_png = None
            if u.get('png'):
                kaynak_png = os.path.join(veri_kok, 'png', u['png'])
            if m:
                kaynak_png = os.path.join(veri_kok, m['gorsel_yerel'])
                kayit['mevcut'] = {'onizleme_gorseli': m.get('onizleme_gorseli'), 'harita': m.get('harita'),
                                   'not': m.get('not', '')}
                if m.get('metin_karakter_siniri'):
                    kayit['ayar']['metinSiniri'] = m['metin_karakter_siniri']
            if kaynak_png and os.path.exists(kaynak_png):
                hedef = os.path.join(gorsel_kok, h + '.webp')
                en, boy = webp_yaz(kaynak_png, hedef)
                kayit['png'] = {'dosya': os.path.relpath(os.path.abspath(kaynak_png), jantifox_kok), 'en': en, 'boy': boy}
                kayit['gorsel'] = 'gorseller/' + h + '.webp'
                if m and m.get('harita') and not kayit['sekiller']:
                    hg = m['harita'].get('gorsel') or {}
                    if (hg.get('en'), hg.get('boy')) != (en, boy):
                        print('UYARI: %s haritası %sx%s görsel için, yerel görsel %sx%s' % (h, hg.get('en'), hg.get('boy'), en, boy))
                    kayit['sekiller'] = haritadan_sekiller(m['harita'], en, boy)
            elif durum != 'atlandi':
                durum = 'gorsel_yok'
            if durum == 'atlandi':
                kayit['ayar']['kapali'] = True
            kayit['durum'] = durum
            urunler.append(kayit)

    veri = {'surum': 1, 'tarih': plan.get('tarih'), 'gruplar': gruplar, 'urunler': urunler}
    with open(os.path.join(cikti_kok, 'veri.js'), 'w', encoding='utf-8') as f:
        f.write('/* panel-verisi.py ile üretildi; elle düzenleme. */\nwindow.PANEL_VERI = ')
        json.dump(veri, f, ensure_ascii=False, indent=1)
        f.write(';\n')
    say = {}
    for u in urunler:
        say[u['durum']] = say.get(u['durum'], 0) + 1
    print('%d grup, %d ürün: %s' % (len(gruplar), len(urunler), say))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
