"""Kullanıcı kararlarına göre yükleme planını ve son ölçüleri üretir.

Kurallar (2026-10-07 kullanıcı kararları):
- Harf ve rakam: yükseklik 6 cm, genişlik = 6 × (PNG en / boy).
- İkon: görselin en-boy oranı doğru kabul edilir. Kayıttaki en büyük ölçü patch'in uzun kenarıdır,
  kısa kenar orandan hesaplanır. Daire kaydı yalnızca PNG gerçekten yuvarlaksa (oran 1 ± 0,06) korunur;
  Tenis, Jimnastik ve Adventurer için daire kaydı dikkate alınmaz.
- Kalpler: yükseklik orandan hesaplanır (kullanıcı onayladı), Beyaz Kalp'in PNG'si yüklenmese de ölçüsü yazılır.
- Yüklenmeyecekler: A, D, H, L (Photoroom bekleniyor), 0/4/6/9 (yeniden işlendi, onay bekliyor),
  Futbol Topu, Basketbol Topu, Beyaz Kalp, GOAT (karar bekleniyor).

Kullanım: python3 -I plan.py <sonuclar.json> <cikti plan.json>
"""
import json
import sys

BEKLEYEN = {
    'harf-A': 'Photoroom bekleniyor', 'harf-D': 'Photoroom bekleniyor',
    'harf-H': 'Photoroom bekleniyor', 'harf-L': 'Photoroom bekleniyor',
    'rakam-0': 'İç boşluk yeniden işlendi, onay bekliyor', 'rakam-4': 'İç boşluk yeniden işlendi, onay bekliyor',
    'rakam-6': 'İç boşluk yeniden işlendi, onay bekliyor', 'rakam-9': 'İç boşluk yeniden işlendi, onay bekliyor',
    'ikon-9722984202526': 'Karar bekleniyor (Futbol Topu)', 'ikon-9722984300830': 'Karar bekleniyor (Basketbol Topu)',
    'ikon-9722984628510': 'Karar bekleniyor (Beyaz Kalp)', 'ikon-9722984726814': 'Karar bekleniyor (GOAT)',
}
DAIRE_YOK_SAY = {'ikon-9722984366366', 'ikon-9722984431902', 'ikon-15870556733726'}  # Tenis, Jimnastik, Adventurer
KALPLER = {'ikon-9722984497438', 'ikon-9722984562974', 'ikon-9722984595742', 'ikon-9722984628510', 'ikon-9722984694046'}


def yuvarla(x):
    return round(x, 2)


def main():
    sonuclar = json.load(open(sys.argv[1]))
    plan = []
    for r in sonuclar:
        s = r['sonuc']
        oran = s['oran']
        b = r.get('bilinen') or {}
        k = r['anahtar']
        if r['tur'] in ('harf', 'rakam'):
            g, y = yuvarla(6 * oran), 6.0
            hesap = f'yükseklik 6 cm; genişlik = 6 × oran {oran:.3f} = {g} cm'
            sekil = None
        else:
            uzun = max(b.values())
            if oran >= 1:
                g, y = yuvarla(uzun), yuvarla(uzun / oran)
                hesap = f'kayıttaki en büyük ölçü {uzun:g} cm = uzun kenar (en); boy = {uzun:g} / oran {oran:.3f} = {y} cm'
            else:
                g, y = yuvarla(uzun * oran), yuvarla(uzun)
                hesap = f'kayıttaki en büyük ölçü {uzun:g} cm = uzun kenar (boy); en = {uzun:g} × oran {oran:.3f} = {g} cm'
            yuvarlak = r.get('sekil') == 'circle' and abs(oran - 1) <= 0.06 and k not in DAIRE_YOK_SAY
            sekil = 'circle' if yuvarlak else 'rect'
            if r.get('sekil') == 'circle' and not yuvarlak:
                hesap += '; daire kaydı yok sayıldı (PNG yuvarlak değil)'
        yukle = k not in BEKLEYEN
        olcu_yaz = yukle or k in KALPLER
        plan.append({
            'anahtar': k, 'tur': r['tur'], 'ad': r['ad'], 'urun': r['urun'], 'varyant': r['varyant'],
            'png': s['png'], 'yukle': yukle, 'olcu_yaz': olcu_yaz, 'bekleme_nedeni': BEKLEYEN.get(k),
            'genislik_cm': g, 'yukseklik_cm': y, 'sekil': sekil, 'hesap': hesap,
            'eski': b, 'eski_sekil': r.get('sekil'),
        })
    json.dump(plan, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
    print('yüklenecek PNG:', sum(p['yukle'] for p in plan), '· ölçüsü yazılacak:', sum(p['olcu_yaz'] for p in plan),
          '· bekleyen:', sum(not p['yukle'] for p in plan))


if __name__ == '__main__':
    main()
