"""Patch ve aksesuar PNG/WebP görsellerinden dış çizgi (çokgen) çıkarır.

Kullanım: python3 -I kontur-cikar.py <veri.json> <önbellek klasörü> <çıktı.json>
veri.json: kopya temanın sayfasındaki KisiselVeri JSON'u (kisisel-veri.liquid çıktısı).

Her görsel için:
- alfa > 127 olan pikseller opak sayılır, küçük delikler kapatılır;
- dış çizgi bulunur; dışbükeyliği (alan / dışbükey zarf alanı) >= 0,93 ise dışbükey zarf,
  değilse (L, J gibi içbükey şekiller) gerçek çizgi kullanılır;
- nokta sayısı 32'yi geçmeyecek şekilde sadeleştirilir;
- noktalar görselin tamamına göre 0..1 aralığında kaydedilir (aksesuarlarda dış ölçü kutusuna göre).
Çıktı: [{sahip, tur, ad, url, kontur: {v, o, d, p}, denetim: {...}, sorunlar: [...]}]
"""
import json, os, sys, hashlib, ssl, urllib.request
import numpy as np, cv2
from PIL import Image

ESIK_ALFA = 127
DISBUKEY_ESIK = 0.93
EN_FAZLA_NOKTA = 32


def indir(url, klasor):
    if url.startswith('//'):
        url = 'https:' + url
    url = url.split('&width=')[0] + '&width=600'
    yol = os.path.join(klasor, hashlib.md5(url.encode()).hexdigest() + '.img')
    if not os.path.exists(yol):
        bag = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or None)
        istek = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'image/png,image/*'})
        with urllib.request.urlopen(istek, context=bag, timeout=60) as y:
            open(yol, 'wb').write(y.read())
    return yol


def alan(p):
    p = np.asarray(p, dtype=float)
    return 0.5 * abs(np.dot(p[:, 0], np.roll(p[:, 1], 1)) - np.dot(p[:, 1], np.roll(p[:, 0], 1)))


def zarf_sadelestir(z, n):
    # Dışbükey zarftan, en az alan kaybettiren köşeyi silerek n noktaya indir
    z = [tuple(map(float, k)) for k in z]
    while len(z) > n:
        en_iyi, kayip = 0, float('inf')
        for i in range(len(z)):
            a, b, c = z[i - 1], z[i], z[(i + 1) % len(z)]
            k = abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
            if k < kayip:
                en_iyi, kayip = i, k
        z.pop(en_iyi)
    return z


def cizgi_sadelestir(c, n, cap):
    eps = 0.002 * cap
    while True:
        s = cv2.approxPolyDP(c, eps, True)
        if len(s) <= n:
            return [tuple(map(float, k[0])) for k in s]
        eps *= 1.25


def kesisiyor_mu(p):
    def kes(a, b, c, d):
        def y(p1, p2, p3):
            return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0])
        return y(a, b, c) * y(a, b, d) < 0 and y(c, d, a) * y(c, d, b) < 0
    n = len(p)
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if kes(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n]):
                return True
    return False


def isle(yol, kutu=None):
    im = Image.open(yol)
    im.load()
    rgba = np.array(im.convert('RGBA'))
    H, W = rgba.shape[:2]
    sorunlar = []
    if im.mode not in ('RGBA', 'LA', 'PA') and 'transparency' not in im.info:
        sorunlar.append('şeffaflık yok')
    a = rgba[:, :, 3]
    ox, oy, ow, oh = 0, 0, W, H
    if kutu:  # aksesuar: dış ölçü kutusu (görselin yüzdesi) dışındaki pikseller yok sayılır
        ox, oy = int(round(kutu['x'] / 100 * W)), int(round(kutu['y'] / 100 * H))
        ow, oh = int(round(kutu['w'] / 100 * W)), int(round(kutu['h'] / 100 * H))
        a = a[oy:oy + oh, ox:ox + ow]
    maske = (a > ESIK_ALFA).astype(np.uint8)
    cekirdek = max(3, int(min(maske.shape) * 0.01) | 1)
    maske = cv2.morphologyEx(maske, cv2.MORPH_CLOSE, np.ones((cekirdek, cekirdek), np.uint8))
    cizgiler, _ = cv2.findContours(maske, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cizgiler:
        return None, ['opak alan yok'], {}
    toplam = sum(cv2.contourArea(c) for c in cizgiler)
    buyukler = [c for c in cizgiler if cv2.contourArea(c) > 0.02 * toplam]
    ana = max(buyukler, key=cv2.contourArea)
    hepsi = np.vstack(buyukler)
    zarf = cv2.convexHull(hepsi)
    zarf_alan = cv2.contourArea(zarf)
    dolu = sum(cv2.contourArea(c) for c in buyukler) / zarf_alan if zarf_alan else 0
    oh_, ow_ = maske.shape
    cap = float(np.hypot(ow_, oh_))
    if len(buyukler) > 1:
        sorunlar.append('%d ayrı parça (dışbükey zarf kullanıldı)' % len(buyukler))
    if dolu >= DISBUKEY_ESIK or len(buyukler) > 1:
        p = zarf_sadelestir([k[0] for k in zarf], EN_FAZLA_NOKTA)
        disbukey = True
        hata = 1 - alan(p) / zarf_alan
    else:
        p = cizgi_sadelestir(ana, EN_FAZLA_NOKTA, cap)
        disbukey = False
        hata = abs(1 - alan(p) / cv2.contourArea(ana))
        if kesisiyor_mu(p):
            sorunlar.append('sadeleştirilmiş çizgi kendini kesiyor')
    x, y, w, h = cv2.boundingRect(hepsi)
    denetim = {
        'gorsel': [W, H], 'opak_kutu': [round(x / ow_, 3), round(y / oh_, 3), round(w / ow_, 3), round(h / oh_, 3)],
        'doluluk': round(dolu, 3), 'nokta': len(p), 'sadelestirme_kaybi': round(hata, 4),
        'kutu_orani': round(cv2.contourArea(ana) / (ow_ * oh_), 3)
    }
    if hata > 0.03:
        sorunlar.append('sadeleştirme kaybı %%%.1f' % (hata * 100))
    if w < 0.9 * ow_ and h < 0.9 * oh_:
        sorunlar.append('görselde boş kenar var (opak kutu %.0f%% × %.0f%%)' % (w / ow_ * 100, h / oh_ * 100))
    nokta = [[round(k[0] / ow_, 3), round(k[1] / oh_, 3)] for k in p]
    return {'v': 1, 'o': round(ow_ / oh_, 4), 'd': 1 if disbukey else 0, 'p': nokta}, sorunlar, denetim


def main():
    veri = json.load(open(sys.argv[1]))
    klasor = sys.argv[2]
    os.makedirs(klasor, exist_ok=True)
    isler = []
    for grup in ('setler', 'rakamlar'):
        for s in veri[grup]:
            for v in s['varyantlar']:
                if v.get('png') and v.get('gorsel'):
                    isler.append(('gid://shopify/ProductVariant/%s' % v['id'], 'varyant', s['baslik'] + ' / ' + v['baslik'], v['gorsel'], None, (v.get('png_en'), v.get('png_boy'))))
    for p in veri['ikonlar']:
        if p.get('png') and p.get('gorsel'):
            isler.append(('gid://shopify/Product/%s' % p['id'], 'ikon', p['baslik'], p['gorsel'], None, (p.get('png_en') or p.get('en'), p.get('png_boy') or p.get('boy'))))
        for v in p['varyantlar']:
            if v.get('png') and v.get('gorsel'):
                isler.append(('gid://shopify/ProductVariant/%s' % v['id'], 'ikon-varyant', p['baslik'] + ' / ' + v['baslik'], v['gorsel'], None, (v.get('png_en'), v.get('png_boy'))))
    for a in veri['aksesuarlar']:
        d = a['harita']['dis']
        isler.append(('gid://shopify/Product/%s' % a['id'], 'aksesuar', a['baslik'], a['gorsel']['buyuk'], d, (d.get('en_cm'), d.get('boy_cm'))))
    sonuc = []
    for sahip, tur, ad, url, kutu, olcu in isler:
        try:
            kontur, sorunlar, denetim = isle(indir(url, klasor), kutu)
        except Exception as e:  # indirme / çözme hatası
            kontur, sorunlar, denetim = None, ['hata: %s' % e], {}
        en, boy = olcu
        if kontur and en and boy and abs(kontur['o'] / (float(en) / float(boy)) - 1) > 0.03:
            sorunlar.append('görsel oranı %.3f, ölçü oranı %.3f' % (kontur['o'], float(en) / float(boy)))
        sonuc.append({'sahip': sahip, 'tur': tur, 'ad': ad, 'url': url, 'olcu': olcu, 'kontur': kontur, 'denetim': denetim, 'sorunlar': sorunlar})
        print(('!! ' if sorunlar else '   ') + ad, denetim.get('nokta'), 'dışbükey' if kontur and kontur['d'] else 'içbükey', '; '.join(sorunlar))
    json.dump(sonuc, open(sys.argv[3], 'w'), ensure_ascii=False, indent=1)


main()
