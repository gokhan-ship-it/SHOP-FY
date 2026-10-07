"""Arka planı zaten temizlenmiş (ör. Photoroom) PNG'leri yükleme biçimine getirir.

Arka plan temizleme uygulanmaz. Yalnızca:
- ana parçanın %0,5'inden küçük kırıntılar silinir (isle.py ile aynı kural),
- patch'in en dış kenarından kırpılır (opaklık > 24),
- en uzun kenar 800 px olacak şekilde ölçeklenir (yukle/ klasöründeki diğer görsellerle aynı),
- WebP (kalite 92, alfa kayıpsız) olarak kaydedilir.
İsteğe bağlı (anahtarın sonuna "+beyaz" eklenirse): patch'in dış kenarına yapışmış beyaz
arka plan kalıntıları (dış zemine 12 px içindeki beyaz/gri öbekler ve onlara bitişik açık gri pikseller) şeffaf yapılır.
Ölçü: yükseklik 6 cm, genişlik = 6 × (kırpılmış en / boy).

Kullanım: python3 -I hazir-png.py <cikti_klasoru> <anahtar>[+beyaz]=<png> [...]
Çıktı: her anahtar için <cikti>/<anahtar>.webp ve ekrana JSON (oran, ölçü, piksel).
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ALFA_ESIK = 24
UZUN_KENAR = 800


def beyaz_kenar_temizle(rgba):
    a = rgba[..., 3]
    rgb = rgba[..., :3].astype(int)
    gri = (rgb.max(-1) - rgb.min(-1)) < 40
    beyaz = (a > ALFA_ESIK) & (rgb.min(-1) > 140) & gri
    zemin = ndimage.binary_dilation(a <= ALFA_ESIK, iterations=12)
    kalinti = beyaz & zemin
    # Öbeği, ona bitişik açık renkli (gri tonlu) piksellere doğru büyüt; koyu nakış ipliğinde durur
    acik = (a > 0) & (rgb.min(-1) > 90) & gri
    for _ in range(12):
        kalinti = ndimage.binary_dilation(kalinti) & (acik | kalinti)
    kalinti = ndimage.binary_dilation(kalinti) & (a > 0)
    rgba[..., 3] = np.where(kalinti, 0, a)
    return int(kalinti.sum())


def hazirla(yol, cikti, beyaz=False):
    im = Image.open(yol).convert('RGBA')
    rgba = np.asarray(im).copy()
    temizlenen = beyaz_kenar_temizle(rgba) if beyaz else 0
    a = rgba[..., 3]
    maske = a > ALFA_ESIK
    etiket, n = ndimage.label(maske)
    if not n:
        raise ValueError('boş görsel: ' + yol)
    alanlar = ndimage.sum(maske, etiket, range(1, n + 1))
    tut = [i + 1 for i, s in enumerate(alanlar) if s >= 0.005 * alanlar.max()]
    temiz = np.isin(etiket, tut)
    rgba[..., 3] = np.where(temiz, a, 0)
    ys, xs = np.nonzero(temiz)
    kutu = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    kirp = Image.fromarray(rgba).crop(kutu)
    w, h = kirp.size
    k = UZUN_KENAR / max(w, h)
    kirp = kirp.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    kirp.save(cikti, 'WEBP', quality=92, method=6, exact=True)
    oran = w / h
    return {
        'kaynak_px': list(im.size), 'kirpik_px': [int(w), int(h)], 'cikti_px': list(kirp.size),
        'silinen_kirinti': int(n - len(tut)), 'beyaz_kalinti_px': temizlenen, 'oran': round(oran, 4),
        'genislik_cm': round(6 * oran, 2), 'yukseklik_cm': 6.0,
        'hesap': f'yükseklik 6 cm; genişlik = 6 × oran {oran:.3f} = {round(6 * oran, 2)} cm',
    }


def main():
    klasor = sys.argv[1]
    os.makedirs(klasor, exist_ok=True)
    sonuc = {}
    for arg in sys.argv[2:]:
        anahtar, yol = arg.split('=', 1)
        beyaz = anahtar.endswith('+beyaz')
        anahtar = anahtar.removesuffix('+beyaz')
        sonuc[anahtar] = hazirla(yol, os.path.join(klasor, anahtar + '.webp'), beyaz)
    print(json.dumps(sonuc, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
