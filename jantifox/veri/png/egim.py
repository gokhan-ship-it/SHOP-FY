"""Eğik çekilmiş patch görsellerini bulur ve düzler.

Yöntem: şeffaf olmayan alanın (opaklık > 24) en küçük dönük sınırlayıcı kutusu (OpenCV minAreaRect).
Görsel, kutunun kenarlarını yatay/dikey yapacak en küçük açıyla (±45° içinde) döndürülür;
böylece patch fotoğraftaki duruşuna en yakın dik konuma gelir. Döndürme ön-çarpımlı alfa ile yapılır
(şeffaf piksellerin rengi kenara sızmaz), ardından en dış kenardan yeniden kırpılır, uzun kenar 800 px.

Kullanım:
  python3 -I egim.py analiz <cikti.json>                 # tüm ikonları ölçer, hiçbir şey yazmaz
  python3 -I egim.py duzle <cikti_klasoru> <anahtar>...  # seçilenleri düzleyip WebP yazar
Kaynak görseller: KAYNAK ortam değişkeni (işlenmiş PNG klasörü) ve photoroom-ekler.json'daki Photoroom dosyaları.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

BURA = os.path.dirname(os.path.abspath(__file__))
ALFA_ESIK = 24
UZUN_KENAR = 800


def kaynak_yolu(anahtar):
    ekler = json.load(open(os.path.join(BURA, 'photoroom-ekler.json')))
    if anahtar in ekler:
        return os.path.join(os.environ['EKLER'], ekler[anahtar]['kaynak'].split(': ')[1].rstrip(')'))
    return os.path.join(os.environ['KAYNAK'], anahtar + '.png')


def olc(rgba):
    """Eksene hizalı oran, dönük kutu (uzun, kısa), düzleme açısı ve alan kazancı."""
    m = (rgba[..., 3] > ALFA_ESIK).astype(np.uint8)
    ys, xs = np.nonzero(m)
    aa_w, aa_h = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    noktalar = np.column_stack([xs, ys]).astype(np.float32)
    hull = cv2.convexHull(noktalar)
    (cx, cy), (w, h), aci = cv2.minAreaRect(hull)
    # Kutunun bir kenarının yataya göre açısı; ±45° içine indir (en küçük döndürme)
    d = ((aci + 45) % 90) - 45
    return {
        'aa_oran': aa_w / aa_h,
        'kutu_uzun': max(w, h), 'kutu_kisa': min(w, h),
        'duzleme_acisi': round(float(d), 2),
        'alan_kazanci': round(1 - (w * h) / (aa_w * aa_h), 3),
    }


def dondur(rgba, aci):
    """Ön-çarpımlı alfa ile döndürür (pozitif açı saat yönünün tersine), sonra kırpar."""
    im = Image.fromarray(rgba, 'RGBA').convert('RGBa')
    im = im.rotate(aci, resample=Image.BICUBIC, expand=True).convert('RGBA')
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > ALFA_ESIK)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def analiz(cikti):
    plan = json.load(open(os.path.join(BURA, 'plan.json')))
    kaynak = {x['id']: x for x in json.load(open(os.path.join(BURA, '..', 'olcu-kaynak.json')))}
    sonuc = []
    for p in plan:
        if p['tur'] != 'ikon':
            continue
        k = p['anahtar']
        rgba = np.asarray(Image.open(kaynak_yolu(k)).convert('RGBA'))
        o = olc(rgba)
        ks = kaynak.get(p['urun'], {})
        sonuc.append(dict(o, anahtar=k, ad=p['ad'], site={a: ks.get(a) for a in ('g', 'y', 'c') if ks.get(a)}))
    json.dump(sonuc, open(cikti, 'w'), ensure_ascii=False, indent=1)


def duzle(klasor, anahtarlar):
    os.makedirs(klasor, exist_ok=True)
    sonuc = {}
    for k in anahtarlar:
        rgba = np.asarray(Image.open(kaynak_yolu(k)).convert('RGBA'))
        o = olc(rgba)
        # OpenCV görüntü koordinatında (y aşağı) açı saat yönünde; PIL rotate saat yönünün tersine döndürür
        im = dondur(rgba, o['duzleme_acisi'])
        w, h = im.size
        oran = w / h
        k2 = UZUN_KENAR / max(w, h)
        im.resize((round(w * k2), round(h * k2)), Image.LANCZOS).save(
            os.path.join(klasor, k + '.webp'), 'WEBP', quality=92, method=6, exact=True)
        sonuc[k] = dict(o, oran_once=round(o['aa_oran'], 4), oran=round(oran, 4), kirpik_px=[w, h])
    print(json.dumps(sonuc, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    if sys.argv[1] == 'analiz':
        analiz(sys.argv[2])
    else:
        duzle(sys.argv[2], sys.argv[3:])
