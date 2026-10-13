"""Kişiselleştirme görsellerinin iPhone için PNG kaynaklı kopyasını hazırlar.

Neden: Shopify CDN saydam WebP kaynakları iPhone Safari'ye her durumda büyük PNG olarak gönderiyor (300 px harf patch'i
~315 KB, ürün önizlemesi 1–3 MB); saydam PNG kaynaklar ise iPhone dahil herkese küçük WebP / AVIF gidiyor (~5–20 KB).
Görsel aynıdır: piksel kaybı yok (WebP'nin çözülmüş pikselleri PNG'ye yazılır), yalnızca uzun kenar sınırlanır.

Kullanım (jantifox/ klasöründen):
    python3 -I araclar/png-kopya/png-kopya.py <görsel.webp|png> [...] --cikti <klasör> [--en-uzun 600]

--en-uzun: uzun kenar sınırı (px). Patch'ler editörde en fazla 300 px istenir → 600 (2 kat). Ürün önizlemesi ve
           aksesuar görselinde boyut haritayla aynı kalmalı: sınır verilmez (0).
Çıktı: <klasör>/<ad>.png ve ekrana her dosya için "giriş → çıkış en×boy KB".
"""
import os
import sys


def main(argv):
    if not argv or argv[0].startswith('-'):
        sys.exit(__doc__)
    from PIL import Image
    girisler, cikti, en_uzun = [], None, 0
    i = 0
    while i < len(argv):
        if argv[i] == '--cikti':
            cikti = argv[i + 1]
            i += 2
        elif argv[i] == '--en-uzun':
            en_uzun = int(argv[i + 1])
            i += 2
        else:
            girisler.append(argv[i])
            i += 1
    if not cikti:
        sys.exit('--cikti gerekli')
    os.makedirs(cikti, exist_ok=True)
    for g in girisler:
        im = Image.open(g)
        im.load()
        im = im.convert('RGBA')
        if en_uzun and max(im.size) > en_uzun:
            k = en_uzun / max(im.size)
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        ad = os.path.splitext(os.path.basename(g))[0] + '.png'
        yol = os.path.join(cikti, ad)
        im.save(yol, 'PNG', optimize=True)
        print('%s → %s %d×%d %d KB' % (os.path.basename(g), yol, im.width, im.height, os.path.getsize(yol) // 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
