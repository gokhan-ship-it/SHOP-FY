"""Aksesuar görsellerinin arka planını temizler, köşedeki bilgi rozetlerini atar, en dış kenardan kırpar.

Kullanım: <venv>/bin/python -I isle-aksesuar.py <liste.json> <ham_klasoru> <cikti_klasoru>
Model: rembg + isnet-general-use (U2NET_HOME ortam değişkeni model klasörünü göstermeli).

- Ürün görselindeki "PATCH ALANI YOKTUR/VARDIR" ve "ARKASINDA CIRT ALANI VARDIR" rozetleri ürüne bağlı değildir;
  maskenin bağlı bileşenlerinden en büyüğü (ürün) ve ona yapışık/çok yakın parçalar (kanca, fermuar ipi) tutulur.
- Kırpılmış görsel en uzun kenarı 1000 px olacak şekilde şeffaf PNG olarak yazılır.
- Dış ölçü önerisi (dis_oneri): zarf ve kalem kutusunda ürün kutusu; yuvarlakta ince parçalar (kanca, ip)
  aşındırılıp gövde dairesi bulunur. Kesin değer alan çizicide kullanıcı tarafından ayarlanır.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

CIKTI_EN_FAZLA = 1000
ALFA_ESIK = 24


def temizle(yol, oturum):
    im = Image.open(yol).convert('RGBA')
    sonuc = remove(im, session=oturum, post_process_mask=True)
    a = np.asarray(sonuc)[..., 3]
    maske = a > 128
    etiket, n = ndimage.label(maske)
    if n == 0:
        raise ValueError('ürün bulunamadı')
    alanlar = ndimage.sum(maske, etiket, range(1, n + 1))
    ana = int(np.argmax(alanlar)) + 1
    # Ana gövdeye 1,5 % mesafeden yakın parçalar korunur (rozetler ürünün dışında, uzakta)
    yakin = ndimage.binary_dilation(etiket == ana, iterations=max(3, int(0.015 * max(im.size))))
    tut = np.zeros_like(maske)
    atilan = []
    for k in range(1, n + 1):
        parca = etiket == k
        if k == ana or (parca & yakin).any():
            tut |= parca
        elif alanlar[k - 1] > 0.002 * maske.size:
            ys, xs = np.nonzero(parca)
            atilan.append([int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())])
    # Tutulan bölgenin yumuşak kenarı için: tutulan bileşenleri biraz genişletip orijinal alfayla çarp
    tut_genis = ndimage.binary_dilation(tut, iterations=3)
    alfa = np.where(tut_genis, a, 0).astype(np.uint8)
    rgba = np.asarray(sonuc).copy()
    rgba[..., 3] = alfa
    ys, xs = np.nonzero(alfa > ALFA_ESIK)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    kirp = Image.fromarray(rgba[y0:y1, x0:x1])
    govde = tut[y0:y1, x0:x1]
    return kirp, govde, atilan


def dis_oneri(model, govde):
    H, W = govde.shape
    if model == 'yuvarlak':
        # İnce parçaları (kanca, fermuar ipi) aşındırarak at, kalan en büyük parçanın kutusu = gövde dairesi
        r = max(4, int(0.06 * max(W, H)))
        asin = ndimage.binary_opening(govde, structure=np.ones((3, 3)), iterations=r)
        etiket, n = ndimage.label(asin)
        if n:
            alanlar = ndimage.sum(asin, etiket, range(1, n + 1))
            ys, xs = np.nonzero(etiket == int(np.argmax(alanlar)) + 1)
            x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            d = (x1 - x0 + y1 - y0) / 2
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            return {'shape': 'circle', 'x': cx - d / 2, 'y': cy - d / 2, 'w': d, 'h': d}
    return {'shape': 'rect', 'x': 0, 'y': 0, 'w': W, 'h': H}


def main():
    liste_yolu, ham, cikti = sys.argv[1:4]
    os.makedirs(cikti, exist_ok=True)
    liste = json.load(open(liste_yolu, encoding='utf-8'))
    oturum = new_session('isnet-general-use')
    rapor = []
    for k in liste:
        kirp, govde, atilan = temizle(os.path.join(ham, k['gorsel']), oturum)
        olcek = min(1.0, CIKTI_EN_FAZLA / max(kirp.size))
        oneri = dis_oneri(k['model'], govde)
        if olcek < 1:
            kirp = kirp.resize((round(kirp.size[0] * olcek), round(kirp.size[1] * olcek)), Image.LANCZOS)
            oneri = {a: (v * olcek if isinstance(v, (int, float)) else v) for a, v in oneri.items()}
        ad = 'kisisel-aksesuar-' + k['anahtar'] + '.png'
        kirp.save(os.path.join(cikti, ad), optimize=True)
        oneri = {a: (round(v, 1) if isinstance(v, float) else v) for a, v in oneri.items()}
        rapor.append({**k, 'png': ad, 'en': kirp.size[0], 'boy': kirp.size[1], 'atilan_rozet': len(atilan), 'dis_oneri': oneri})
        print(ad, kirp.size, 'atılan parça:', len(atilan), oneri)
    json.dump(rapor, open(os.path.join(cikti, 'rapor.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
