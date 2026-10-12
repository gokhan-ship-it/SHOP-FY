"""Kişiselleştirilecek ürünlerin önizleme görselini hazırlar: indirir, arka planı temizler, kırpar, şeffaf PNG yazar.

Kullanım: <venv>/bin/python -I hazirla.py <urunler.json> <secim.json> <cikti_klasoru>
  urunler.json: mağazanın /products/<handle>.js çıktıları ({handle: ürün})
  secim.json:   [{handle, gorsel: görsel sırası, delik_temizle?: true, bosluk_doldur?: px}]
    delik_temizle: görselin üst kısmında (oran, ör. 0.2 = üst %20) ürünün içinde kalan, arka plan renginde
                   kapalı boşlukları (ör. sap halkasının içi) şeffaf yapar. Beyaz fermuar gibi parçalar alt kısımda kalır.
    bosluk_doldur: arka planla aynı renkteki desenin (ör. beyaz çizgiler) silindiği gövdeyi kapatıp doldurur
                   (px: kapatma çapı, desen aralığından büyük, askılar arası boşluktan küçük seçilir).
Model: rembg + isnet-general-use (U2NET_HOME model klasörünü göstermeli).
Çıktı: <handle>.png (en uzun kenar 1600 px) ve rapor.json (boyut, opak kutu, uyarılar).
Ürüne yapışık parçalar (askı, ip, kordon) korunur; ürünün dışındaki küçük parçalar atılır.
"""
import io, json, os, ssl, sys, urllib.request
import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

EN_FAZLA = 1600


def indir(url):
    url = ('https:' + url if url.startswith('//') else url)
    bag = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or None)
    r = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'image/jpeg,image/png'})
    return Image.open(io.BytesIO(urllib.request.urlopen(r, context=bag, timeout=120).read())).convert('RGBA')


def arka_plan_rengi(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    k = max(4, min(a.shape[:2]) // 50)
    koseler = np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3), a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)])
    return np.median(koseler, axis=0)


def temizle(im, oturum, s):
    sonuc = remove(im, session=oturum, post_process_mask=True)
    a = np.asarray(sonuc)[..., 3].copy()
    if s.get('bosluk_doldur'):
        r = int(s['bosluk_doldur'])
        yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
        kapat = ndimage.binary_closing(a > 128, structure=(xx * xx + yy * yy) <= r * r)
        dolu = ndimage.binary_fill_holes(kapat)
        a = np.where(dolu & (a <= 128), 255, a).astype(np.uint8)
    if s.get('delik_temizle'):
        rgb = np.asarray(im.convert('RGB')).astype(int)
        bg = arka_plan_rengi(im)
        benzer = (np.abs(rgb - bg).sum(axis=2) < 30) & (a > 0)
        benzer[int(a.shape[0] * float(s['delik_temizle'])):] = False
        etiket, n = ndimage.label(benzer)
        for k in range(1, n + 1):
            parca = etiket == k
            if parca.sum() > 0.0005 * a.size:
                a[ndimage.binary_dilation(parca, iterations=2)] = 0
    maske = a > 128
    etiket, n = ndimage.label(maske)
    if n == 0:
        raise ValueError('ürün bulunamadı')
    alanlar = ndimage.sum(maske, etiket, range(1, n + 1))
    ana = int(np.argmax(alanlar)) + 1
    yakin = ndimage.binary_dilation(etiket == ana, iterations=max(3, int(0.015 * max(im.size))))
    tut = np.zeros_like(maske)
    for k in range(1, n + 1):
        parca = etiket == k
        if k == ana or (parca & yakin).any():
            tut |= parca
    alfa = np.where(ndimage.binary_dilation(tut, iterations=3), a, 0).astype(np.uint8)
    rgba = np.asarray(sonuc).copy()
    rgba[..., :3] = np.asarray(im.convert('RGB'))
    rgba[..., 3] = alfa
    ys, xs = np.nonzero(alfa > 24)
    return Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]), float(tut.mean())


def main():
    urunler = json.load(open(sys.argv[1], encoding='utf-8'))
    secim = json.load(open(sys.argv[2], encoding='utf-8'))
    cikti = sys.argv[3]
    os.makedirs(cikti, exist_ok=True)
    oturum = new_session('isnet-general-use')
    rapor = []
    for s in secim:
        p = urunler[s['handle']]
        url = p['images'][s['gorsel']]
        im = indir(url)
        kirp, doluluk = temizle(im, oturum, s)
        kirp.thumbnail((EN_FAZLA, EN_FAZLA), Image.LANCZOS)
        yol = os.path.join(cikti, s['handle'] + '.png')
        kirp.save(yol, optimize=True)
        r = {'handle': s['handle'], 'urun_id': p['id'], 'baslik': p['title'], 'kaynak': url, 'kaynak_boyut': list(im.size),
             'png': os.path.basename(yol), 'png_boyut': list(kirp.size), 'urun_orani': round(doluluk, 3)}
        rapor.append(r)
        print(r['baslik'], r['png_boyut'])
    json.dump(rapor, open(os.path.join(cikti, 'rapor.json'), 'w'), ensure_ascii=False, indent=1)


main()
