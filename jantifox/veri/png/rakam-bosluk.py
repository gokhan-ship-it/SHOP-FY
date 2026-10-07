"""Rakam PNG'lerinde (0, 4, 6, 9) iç boşluklara kalan beyaz arka planı şeffaf yapar.

Yöntem: PNG içinde patch rengine göre çok açık ve doygunluğu düşük (beyaz/gri) pikselleri bulur;
bunlardan görselin kenarına değmeyen, yeterince büyük bağlı bölgeleri (iç boşluk) şeffaf yapar.
Kenarı yumuşatmak için bölge 1 piksel genişletilir.
Kullanım: python3 -I rakam-bosluk.py <girdi.png> <cikti.png>
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

im = Image.open(sys.argv[1]).convert('RGBA')
a = np.asarray(im).astype(np.float32)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
mx = np.maximum(np.maximum(r, g), b)
mn = np.minimum(np.minimum(r, g), b)
parlak = mx > 215
doygunluk_dusuk = (mx - mn) < 28
beyaz = parlak & doygunluk_dusuk & (al > 0)
etiket, n = ndimage.label(beyaz)
H, W = beyaz.shape
toplam = (al > 0).sum()
acilacak = np.zeros_like(beyaz)
for i in range(1, n + 1):
    bolge = etiket == i
    alan = bolge.sum()
    ys, xs = np.nonzero(bolge)
    kenarda = ys.min() == 0 or xs.min() == 0 or ys.max() == H - 1 or xs.max() == W - 1
    if not kenarda and alan > 0.004 * toplam:
        acilacak |= bolge
acilacak = ndimage.binary_dilation(acilacak, iterations=1) & (al > 0)
cikti = np.asarray(im).copy()
cikti[..., 3] = np.where(acilacak, 0, cikti[..., 3])
Image.fromarray(cikti).save(sys.argv[2], optimize=True)
print(sys.argv[1].rsplit('/', 1)[-1], 'açılan oran:', round(acilacak.sum() / toplam, 3))
