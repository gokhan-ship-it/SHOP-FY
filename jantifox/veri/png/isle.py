"""Patch görsellerinin arka planını temizler, patch sınırından kırpar ve ölçüleri hesaplar.

Kullanım: <venv>/bin/python -I isle.py <liste-yerel.json> <cikti_klasoru>
Model: rembg + isnet-general-use (U2NET_HOME ortam değişkeni model klasörünü göstermeli).

Ölçü kuralları:
- Harf ve rakam: yükseklik 6 cm sabit, genişlik = 6 × (kırpılmış en / boy).
- İkon: bilinen tek ölçü (ya da ikisi biliniyorsa büyük olanı) korunur, diğeri orandan hesaplanır.
  Daire patch'lerde çap, kırpılmış görselin uzun kenarına karşılık gelir.
"""
import json
import os
import sys
import time

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

GIRDI_EN_FAZLA = 2048   # modele verilen en uzun kenar
CIKTI_EN_FAZLA = 1000   # yüklenecek PNG'nin en uzun kenarı
ALFA_ESIK = 24          # sınır hesabında dikkate alınan en düşük opaklık


def yukle(yol):
    im = Image.open(yol)
    im.load()
    return im


def hazir_seffaf_mi(im):
    """Orijinal zaten şeffaf zeminliyse (ör. bazı PNG ikonlar) modeli atla."""
    if im.mode not in ('RGBA', 'LA', 'P'):
        return False
    a = np.asarray(im.convert('RGBA'))[..., 3]
    return (a < 10).mean() > 0.05


def isle(kayit, oturum, cikti):
    im = yukle(kayit['orijinal'])
    W0, H0 = im.size
    olcek = min(1.0, GIRDI_EN_FAZLA / max(W0, H0))
    kaynak = im.convert('RGBA')
    if olcek < 1:
        kaynak = kaynak.resize((round(W0 * olcek), round(H0 * olcek)), Image.LANCZOS)
    yontem = 'orijinal şeffaf'
    if hazir_seffaf_mi(im):
        sonuc = kaynak
    else:
        yontem = 'rembg/isnet'
        sonuc = remove(kaynak.convert('RGB'), session=oturum, post_process_mask=True)
    a = np.asarray(sonuc)[..., 3].astype(np.uint8)

    # Bağlı bileşenler: ana parçanın %0,5'inden küçük kırıntıları temizle
    maske = a > ALFA_ESIK
    etiket, n = ndimage.label(maske)
    bilesenler = []
    if n:
        alanlar = ndimage.sum(maske, etiket, range(1, n + 1))
        ana = alanlar.max()
        tut = [i + 1 for i, s in enumerate(alanlar) if s >= 0.005 * ana]
        bilesenler = sorted([int(s) for s in alanlar if s >= 0.005 * ana], reverse=True)
        temiz = np.isin(etiket, tut)
        a = np.where(temiz, a, 0).astype(np.uint8)
        maske = temiz
    ys, xs = np.nonzero(maske)
    if not len(xs):
        return {'hata': 'Patch bulunamadı (maske boş)'}
    x1, x2, y1, y2 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.asarray(sonuc).copy()
    rgba[..., 3] = a
    kirp = Image.fromarray(rgba).crop((x1, y1, x2, y2))
    w, h = kirp.size
    k = min(1.0, CIKTI_EN_FAZLA / max(w, h))
    if k < 1:
        kirp = kirp.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    dosya = os.path.join(cikti, kayit['anahtar'] + '.png')
    kirp.save(dosya, optimize=True)

    # Kalite ölçütleri
    Wk, Hk = sonuc.size
    kenar_payi = 3
    kenara_degiyor = x1 <= kenar_payi or y1 <= kenar_payi or x2 >= Wk - kenar_payi or y2 >= Hk - kenar_payi
    kutu = maske[y1:y2, x1:x2]
    doluluk = float(kutu.mean())
    gorunur = a[y1:y2, x1:x2]
    yari = float(((gorunur > ALFA_ESIK) & (gorunur < 230)).sum() / max(1, (gorunur > ALFA_ESIK).sum()))
    kutu_orani = (w * h) / (Wk * Hk)
    return {
        'png': dosya,
        'yontem': yontem,
        'oran': w / h,
        'kirpik_px': [int(w), int(h)],
        'cikti_px': list(kirp.size),
        'kenara_degiyor': bool(kenara_degiyor),
        'doluluk': round(doluluk, 3),
        'yari_seffaf': round(yari, 3),
        'kutu_orani': round(kutu_orani, 3),
        'bilesenler': bilesenler[:5],
    }


def olcu(kayit, s):
    oran = s['oran']
    b = kayit.get('bilinen') or {}
    if kayit['tur'] in ('harf', 'rakam'):
        boy = b.get('yukseklik', 6.0)
        return {'genislik': round(boy * oran, 2), 'yukseklik': round(boy, 2), 'dayanak': f'yükseklik {boy} cm'}
    g, y = b.get('genislik'), b.get('yukseklik')
    if kayit.get('sekil') == 'circle' and g:
        # Çap uzun kenara karşılık gelir
        if oran >= 1:
            return {'genislik': round(g, 2), 'yukseklik': round(g / oran, 2), 'dayanak': f'çap {g} cm (en)'}
        return {'genislik': round(g * oran, 2), 'yukseklik': round(g, 2), 'dayanak': f'çap {g} cm (boy)'}
    if g and y:
        if g >= y:
            return {'genislik': round(g, 2), 'yukseklik': round(g / oran, 2), 'dayanak': f'genişlik {g} cm', 'eski_diger': y}
        return {'genislik': round(y * oran, 2), 'yukseklik': round(y, 2), 'dayanak': f'yükseklik {y} cm', 'eski_diger': g}
    if g:
        return {'genislik': round(g, 2), 'yukseklik': round(g / oran, 2), 'dayanak': f'genişlik {g} cm'}
    if y:
        return {'genislik': round(y * oran, 2), 'yukseklik': round(y, 2), 'dayanak': f'yükseklik {y} cm'}
    return {'genislik': None, 'yukseklik': None, 'dayanak': 'ölçü yok'}


def isaretler(kayit, s, o):
    i = []
    if s.get('hata'):
        return [s['hata']]
    if s['kenara_degiyor']:
        i.append('Patch orijinal görselin kenarına değiyor (orijinalde kesik olabilir)')
    if s['kutu_orani'] > 0.97:
        i.append('Kırpma neredeyse tüm görsel: arka plan silinmemiş olabilir')
    if s['doluluk'] < 0.35:
        i.append(f"Kutunun yalnızca %{round(s['doluluk'] * 100)}'i dolu: eksik kesim ya da ince/dağınık şekil")
    if len(s['bilesenler']) > 1 and s['bilesenler'][1] > 0.02 * s['bilesenler'][0]:
        i.append(f"{len(s['bilesenler'])} ayrı parça var: arka plan kalıntısı ya da kopuk kesim olabilir")
    if s['yari_seffaf'] > 0.12:
        i.append(f"Kenarların %{round(s['yari_seffaf'] * 100)}'i yarı saydam: bulanık kenar")
    if kayit.get('sekil') == 'circle' and abs(s['oran'] - 1) > 0.06:
        i.append(f"Daire patch ama en/boy oranı {s['oran']:.2f}: eksik ya da fazla kesim")
    if o.get('eski_diger'):
        yeni = o['yukseklik'] if o['dayanak'].startswith('genişlik') else o['genislik']
        fark = abs(yeni - o['eski_diger']) / o['eski_diger']
        if fark > 0.15:
            i.append(f"Hesaplanan ölçü eski kayıttan %{round(fark * 100)} farklı (eski {o['eski_diger']} cm, yeni {yeni} cm)")
    if o['genislik'] is None:
        i.append('Hiç ölçü yok: ölçüyü senin girmen gerekiyor')
    return i


def main():
    liste = json.load(open(sys.argv[1]))
    cikti = sys.argv[2]
    os.makedirs(cikti, exist_ok=True)
    oturum = new_session('isnet-general-use')
    sonuclar = []
    t0 = time.time()
    for n, k in enumerate(liste, 1):
        s = isle(k, oturum, cikti)
        o = olcu(k, s) if not s.get('hata') else {'genislik': None, 'yukseklik': None, 'dayanak': '-'}
        r = dict(k, sonuc=s, olcu=o, isaretler=isaretler(k, s, o))
        sonuclar.append(r)
        print(f"[{n}/{len(liste)}] {k['anahtar']} {s.get('yontem', '')} oran={s.get('oran', 0):.3f} işaret={len(r['isaretler'])} ({time.time() - t0:.0f}s)", flush=True)
    json.dump(sonuclar, open(os.path.join(cikti, 'sonuclar.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
