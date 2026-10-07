"""Editör PNG'sindeki siyah cırt daireyi bulur ve kisisellestirme.harita JSON'unu üretir.

Kullanım: python3 -I daire-bul.py onizleme.png [--cap 25]

Yöntem: opak ve çok koyu pikselleri (siyah cırt) maskeler, en büyük bağlı bölgeyi alır,
alanından ve sınır kutusundan çapı/merkezi hesaplar. Lacivert kumaş daha açık olduğu için ayrışır.
Sonuçta yuvarlaklık oranı da yazılır; 0.95'in altındaysa sonucu gözle kontrol et.
"""
import json
import sys

import numpy as np
from PIL import Image


def bul(yol, esik=None):
    img = Image.open(yol).convert('RGBA')
    a = np.asarray(img).astype(np.float32)
    W, H = img.size
    parlaklik = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    opak = a[..., 3] > 200
    if esik is None:
        # Opak piksellerin en koyu %20'sinin üst sınırı ile 45 arasından küçük olanı
        esik = min(45.0, float(np.percentile(parlaklik[opak], 20)) + 5)
    maske = opak & (parlaklik < esik)

    # Bağlı bölgeler (4-komşuluk), en büyüğünü seç
    from collections import deque
    etiket = np.zeros(maske.shape, dtype=np.int32)
    en_buyuk, en_buyuk_id, sayac = 0, 0, 0
    ys, xs = np.nonzero(maske)
    for y0, x0 in zip(ys, xs):
        if etiket[y0, x0]:
            continue
        sayac += 1
        q = deque([(y0, x0)])
        etiket[y0, x0] = sayac
        n = 0
        while q:
            y, x = q.popleft()
            n += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and maske[yy, xx] and not etiket[yy, xx]:
                    etiket[yy, xx] = sayac
                    q.append((yy, xx))
        if n > en_buyuk:
            en_buyuk, en_buyuk_id = n, sayac
    by, bx = np.nonzero(etiket == en_buyuk_id)
    x1, x2, y1, y2 = bx.min(), bx.max() + 1, by.min(), by.max() + 1
    cap_kutu = ((x2 - x1) + (y2 - y1)) / 2
    cap_alan = 2 * np.sqrt(en_buyuk / np.pi)
    yuvarlaklik = cap_alan / cap_kutu
    cx, cy = bx.mean(), by.mean()
    return W, H, cx, cy, cap_kutu, yuvarlaklik, esik


def main():
    yol = sys.argv[1]
    cap_cm = float(sys.argv[sys.argv.index('--cap') + 1]) if '--cap' in sys.argv else 25.0
    W, H, cx, cy, cap, yuvarlaklik, esik = bul(yol)
    r = cap / 2
    harita = {
        'surum': 2,
        'kalibre': True,
        'gorsel': {'en': W, 'boy': H},
        'zones': [{
            'id': 'on-daire', 'ad': 'Ön cırt daire', 'shape': 'circle',
            'x': round((cx - r) / W * 100, 3), 'y': round((cy - r) / H * 100, 3),
            'w': round(cap / W * 100, 3), 'h': round(cap / H * 100, 3),
            'cap_cm': cap_cm, 'allowed_types': ['letter', 'number', 'icon'],
        }],
        'forbidden': [],
    }
    print(f'görsel {W}x{H}, merkez ({cx:.1f}, {cy:.1f}) px, çap {cap:.1f} px, yuvarlaklık {yuvarlaklik:.3f}, eşik {esik:.0f}', file=sys.stderr)
    print(json.dumps(harita, ensure_ascii=False))


if __name__ == '__main__':
    main()
