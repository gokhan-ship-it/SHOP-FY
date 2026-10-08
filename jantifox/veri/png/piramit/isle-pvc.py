"""Piramit Alfabe (PVC) görsellerini işler: arka plan + yumuşak gölge temizliği, iç boşluklar, kırpma, renk.

Adımlar:
1. rembg (isnet-general-use) ile kaba maske.
2. Gölge: fotoğraf zemini açık gri. Zemine benzeyen (doygunluğu düşük, zeminden biraz koyu ya da aynı
   parlaklıkta) ve dışarıdan (görsel kenarından) kesintisiz ulaşılabilen pikseller gölge/zemin sayılır ve silinir.
   Patch'in kendi rengi bu akışı durdurur. Beyaz patch'lerde (gövde rengi zemine benzediği için) bu adım
   yalnızca maskenin dış kenarındaki ince şeritte uygulanır.
3. İç boşluk: patch içinde kalan, zemine benzeyen kapalı bölgeler (A, B, D, O, P, Q, R) şeffaf yapılır.
4. Kırıntılar silinir, en dış kenardan kırpılır; renkler orijinalden.
5. Renk noktası için patch gövdesinin ortanca rengi (kenarlardan uzak, opak pikseller).

Kullanım: <venv>/bin/python -I isle-pvc.py <liste.json> <orijinal_klasoru> <cikti_klasoru>
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

GIRDI = 2048
CIKTI = 1000
ALFA_ESIK = 24


def zemine_benzer(rgb, zemin, alt=0.55, ust=1.06, doygunluk=22):
    L = rgb.mean(-1)
    Lz = float(np.mean(zemin))
    d = rgb.max(-1) - rgb.min(-1)
    return (d < doygunluk) & (L >= alt * Lz) & (L <= ust * Lz)


def isle(k, kaynak_klasor, cikti, oturum):
    im = Image.open(os.path.join(kaynak_klasor, k['dosya'])).convert('RGB')
    o = min(1.0, GIRDI / max(im.size))
    if o < 1:
        im = im.resize((round(im.width * o), round(im.height * o)), Image.LANCZOS)
    rgb = np.asarray(im).astype(int)
    H, W = rgb.shape[:2]
    kenar = np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3), rgb[:, :8].reshape(-1, 3), rgb[:, -8:].reshape(-1, 3)])
    zemin = np.median(kenar, 0)

    a = np.asarray(remove(im, session=oturum, post_process_mask=True))[..., 3].astype(np.uint8)
    maske = a > ALFA_ESIK
    # Ana parça
    et, n = ndimage.label(maske)
    if not n:
        return {'hata': 'maske boş'}
    alan = ndimage.sum(maske, et, range(1, n + 1))
    maske = et == (np.argmax(alan) + 1)

    benzer = zemine_benzer(rgb, zemin)
    # Gövde rengi zemine benziyor mu (beyaz patch)?
    govde = ndimage.binary_erosion(maske, iterations=25)
    beyaz = bool(benzer[govde].mean() > 0.5) if govde.any() else False

    # 2) Dış gölge: görsel kenarından zemine benzer piksellerle ulaşılabilen bölge
    if beyaz:
        # Yalnızca maskenin dış 6 px'lik şeridinde, belirgin şekilde koyu (gölge) pikseller
        serit = maske & ~ndimage.binary_erosion(maske, iterations=6)
        L = rgb.mean(-1)
        golge = serit & (L < float(np.mean(zemin)) - 6) & ((rgb.max(-1) - rgb.min(-1)) < 22)
        dis = golge
    else:
        et2, _ = ndimage.label(benzer)
        kenar_et = np.unique(np.concatenate([et2[0], et2[-1], et2[:, 0], et2[:, -1]]))
        dis = np.isin(et2, kenar_et[kenar_et > 0])
    silinen_golge = int((maske & dis).sum())
    maske = maske & ~dis

    # 3) İç boşluklar: maskenin içinde kalan, zemine benzer kapalı bölgeler
    ic_bosluk = 0
    if not beyaz:
        dolu = ndimage.binary_fill_holes(maske)
        aday = dolu & benzer & ~dis
        et3, n3 = ndimage.label(aday)
        if n3:
            alanlar = ndimage.sum(aday, et3, range(1, n3 + 1))
            buyuk = [i + 1 for i, s in enumerate(alanlar) if s >= 0.004 * dolu.sum()]
            bosluk = ndimage.binary_dilation(np.isin(et3, buyuk), iterations=1) & dolu
            ic_bosluk = int(bosluk.sum())
            maske = dolu & ~bosluk
        else:
            maske = dolu
    # Kırıntılar ve küçük delikler
    et4, n4 = ndimage.label(maske)
    if n4 > 1:
        alanlar = ndimage.sum(maske, et4, range(1, n4 + 1))
        maske = np.isin(et4, [i + 1 for i, s in enumerate(alanlar) if s >= 0.005 * alanlar.max()])
    delik = ndimage.binary_fill_holes(maske) & ~maske
    et5, n5 = ndimage.label(delik)
    if n5:
        alanlar = ndimage.sum(delik, et5, range(1, n5 + 1))
        maske |= np.isin(et5, [i + 1 for i, s in enumerate(alanlar) if s < 0.002 * maske.sum()])

    # Alfa: rembg'nin yumuşak kenarı, maske dışı sıfır
    alfa = np.where(maske, np.maximum(a, np.where(ndimage.binary_erosion(maske, iterations=2), 255, 0)), 0).astype(np.uint8)
    ys, xs = np.nonzero(alfa > ALFA_ESIK)
    x1, x2, y1, y2 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.dstack([np.asarray(im), alfa])
    kirp = Image.fromarray(rgba.astype(np.uint8), 'RGBA').crop((x1, y1, x2, y2))
    w, h = kirp.size
    s = min(1.0, CIKTI / max(w, h))
    if s < 1:
        kirp = kirp.resize((round(w * s), round(h * s)), Image.LANCZOS)
    yol = os.path.join(cikti, k['anahtar'] + '.png')
    kirp.save(yol, optimize=True)

    # 5) Renk: gövdenin ortanca rengi
    ic = ndimage.binary_erosion(maske, iterations=12)
    if ic.sum() < 200:
        ic = maske
    renk = np.median(rgb[ic], 0).astype(int)
    kenara_degiyor = x1 <= 2 or y1 <= 2 or x2 >= W - 2 or y2 >= H - 2
    return {
        'png': yol, 'oran': w / h, 'kirpik_px': [int(w), int(h)], 'beyaz_mod': beyaz,
        'silinen_golge_px': silinen_golge, 'ic_bosluk_px': ic_bosluk,
        'renk_hex': '#%02x%02x%02x' % tuple(renk), 'kenara_degiyor': bool(kenara_degiyor),
        'zemin': [int(x) for x in zemin],
    }


def main():
    liste = json.load(open(sys.argv[1]))
    kaynak, cikti = sys.argv[2], sys.argv[3]
    os.makedirs(cikti, exist_ok=True)
    oturum = new_session('isnet-general-use')
    sonuc = []
    for i, k in enumerate(liste, 1):
        r = isle(k, kaynak, cikti, oturum)
        sonuc.append(dict(k, sonuc=r))
        print(f"[{i}/{len(liste)}] {k['anahtar']} oran={r.get('oran', 0):.3f} gölge={r.get('silinen_golge_px')} boşluk={r.get('ic_bosluk_px')} renk={r.get('renk_hex')} beyaz={r.get('beyaz_mod')}", flush=True)
    json.dump(sonuc, open(os.path.join(cikti, 'sonuclar.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
