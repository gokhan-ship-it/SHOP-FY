"""Patch ölçülerini 2026-10-07 tarihli ikinci kural setine göre hesaplar.

Esas kaynak sitedeki ölçülerdir (custom.genislik / custom.yukseklik / custom.cap, ham metin).
Görsel oranı yalnızca eksik ölçüyü tamamlamak ve yönü belirlemek için kullanılır.

1. İkon, iki ölçü varsa (çap = iki kenar eşit): ikisi de olduğu gibi kullanılır. Büyük değer görselin
   uzun kenarına, küçük değer kısa kenarına yazılır (yönü ters kayıtlı olanlar böylece düzelir).
2. İkon, tek ölçü varsa: o ölçü kendi kenarında kullanılır, diğer kenar görsel oranından hesaplanır.
3. Setler: Cool Alfabe yüksekliği 6 cm, Janti Rakam yüksekliği 7,5 cm (sitedeki 6 × 7,5 cm'in uzun
   kenarı; rakam görsellerinin hepsi dikey). Genişlik her karakterin kendi görsel oranından.
4. Birimsiz değerler ("6,5", "3,5") cm kabul edilir.
5. Şekil PNG'den: daire kaydı yalnızca görsel gerçekten yuvarlaksa (oran 1 ± 0,06) korunur;
   Tenis, Jimnastik ve Adventurer'da daire kaydı yok sayılır, sitedeki ölçü yine kullanılır.

Kullanım: python3 -I olcu-v2.py   (veri/png klasöründen; olcu-v2.json ve olcu-v2-tablo.md üretir)
"""
import json
import os
import re

BURA = os.path.dirname(os.path.abspath(__file__))
SET_YUKSEKLIK = {'harf': 6.0, 'rakam': 7.5}
DAIRE_YOK_SAY = {'ikon-9722984366366', 'ikon-9722984431902', 'ikon-15870556733726'}  # Tenis, Jimnastik, Adventurer


def oku(ad):
    return json.load(open(os.path.join(BURA, ad)))


def sayi(metin):
    if not metin:
        return None
    m = re.search(r'\d+(?:[.,]\d+)?', metin)
    return float(m.group(0).replace(',', '.')) if m else None


def yuvarla(x):
    return round(x, 2)


def cm(x):
    return f'{x:g}'.replace('.', ',')


def hesapla(tur, oran, kaynak, anahtar):
    """(genişlik, yükseklik, şekil, hesap metni) döndürür."""
    if tur in SET_YUKSEKLIK:
        y = SET_YUKSEKLIK[tur]
        g = yuvarla(y * oran)
        return g, y, None, f'set yüksekliği {cm(y)} cm; genişlik = {cm(y)} × oran {oran:.3f} = {cm(g)} cm'
    g0, y0, c0 = sayi(kaynak.get('g')), sayi(kaynak.get('y')), sayi(kaynak.get('c'))
    if c0:
        g0 = y0 = c0
    yuvarlak = abs(oran - 1) <= 0.06
    if c0:
        sekil = 'circle' if yuvarlak and anahtar not in DAIRE_YOK_SAY else 'rect'
    else:
        sekil = 'rect'
    if g0 and y0:
        buyuk, kucuk = max(g0, y0), min(g0, y0)
        g, y = (buyuk, kucuk) if oran >= 1 else (kucuk, buyuk)
        if c0:
            hesap = f'sitede çap {cm(c0)} cm; iki kenar {cm(c0)} cm'
        else:
            hesap = f'sitede {cm(g0)} × {cm(y0)} cm; görsel {"yatay" if oran >= 1 else "dikey"} (oran {oran:.3f}) → en {cm(g)}, boy {cm(y)}'
            if (g, y) != (g0, y0):
                hesap += ' (yön düzeltildi)'
        if c0 and sekil == 'rect':
            hesap += f"; şekil PNG'den: yuvarlak değil (oran {oran:.3f}), dikdörtgen"
        return yuvarla(g), yuvarla(y), sekil, hesap
    if g0:
        y = yuvarla(g0 / oran)
        return g0, y, sekil, f'sitede yalnızca genişlik {cm(g0)} cm; boy = {cm(g0)} / oran {oran:.3f} = {cm(y)} cm'
    if y0:
        g = yuvarla(y0 * oran)
        return g, y0, sekil, f'sitede yalnızca yükseklik {cm(y0)} cm; en = {cm(y0)} × oran {oran:.3f} = {cm(g)} cm'
    raise ValueError('ölçü yok: ' + anahtar)


def main():
    plan = oku('plan.json')
    adhl = oku('photoroom-sonuc.json')
    ekler = oku('photoroom-ekler.json')
    kaynak = {x['id']: x for x in json.load(open(os.path.join(BURA, '..', 'olcu-kaynak.json')))}
    satirlar = []
    for p in plan:
        k = p['anahtar']
        # Mağazadaki (ya da yüklenecek) görselin oranı ve şu an yazılı/önerilen ölçü
        if k in adhl:
            oran, durum = adhl[k]['oran'], 'yüklü (Photoroom)'
            onceki = (adhl[k]['genislik_cm'], adhl[k]['yukseklik_cm'], None)
        elif k in ekler:
            oran, durum = ekler[k]['oran'], 'yeni (Photoroom, yüklenecek)'
            onceki = (ekler[k]['genislik_cm'], ekler[k]['yukseklik_cm'], ekler[k]['sekil'])
            if k == 'ikon-9722984628510':
                durum = 'yeni (Photoroom, yüklenecek); ölçüsü yazılı'
        elif p['yukle']:
            oran, durum = p['oran'], 'yüklü'
            onceki = (p['genislik_cm'], p['yukseklik_cm'], p['sekil'])
        else:
            continue
        g, y, sekil, hesap = hesapla(p['tur'], oran, kaynak.get(p['urun'], {}), k)
        site_oran = None
        ks = kaynak.get(p['urun'], {})
        if p['tur'] == 'ikon' and sayi(ks.get('g')) and sayi(ks.get('y')) and not ks.get('c'):
            site_oran = g / y
        fark = abs(site_oran - oran) / oran if site_oran else 0
        # Editör görseli kutuya oranını bozmadan sığdırır (object-fit: contain); görünen boyut
        cw, ch = (g, g / oran) if oran > g / y else (y * oran, y)
        satirlar.append({
            'anahtar': k, 'tur': p['tur'], 'ad': p['ad'], 'urun': p['urun'], 'varyant': p['varyant'],
            'durum': durum, 'oran': round(oran, 4), 'site': {kk: ks.get(kk) for kk in ('g', 'y', 'c') if ks.get(kk)} if p['tur'] == 'ikon' else None,
            'onceki': {'genislik_cm': onceki[0], 'yukseklik_cm': onceki[1], 'sekil': onceki[2]},
            'genislik_cm': g, 'yukseklik_cm': y, 'sekil': sekil, 'hesap': hesap,
            'degisti': (round(onceki[0], 2), round(onceki[1], 2), onceki[2]) != (g, y, sekil),
            'oran_farki': round(fark, 3), 'gorunen': [yuvarla(cw), yuvarla(ch)],
        })
    json.dump(satirlar, open(os.path.join(BURA, 'olcu-v2.json'), 'w'), ensure_ascii=False, indent=1)
    t = ['🔶 değişen · ⚠️ sitedeki oran görselden %15+ farklı: görsel kutuya sığdırılır, "Not" sütununda görünen boyut', '',
         '| | Patch | Sitede | Önceki (en × boy) | Yeni (en × boy) | Şekil | Hesap | Not |', '|---|---|---|---|---|---|---|---|']
    for s in satirlar:
        o = s['onceki']
        site = ' · '.join(f'{ {"g": "en", "y": "boy", "c": "çap"}[a]} {b}' for a, b in (s['site'] or {}).items()) or ('6 cm (set)' if s['tur'] == 'harf' else '6 × 7,5 cm (set)')
        isaret = '🔶' if s['degisti'] else ''
        if s['oran_farki'] > 0.15:
            isaret += ' ⚠️'
        sek_o = o['sekil'] or '—'
        sek = s['sekil'] or '—'
        t.append(f"| {isaret} | {s['ad']} | {site} | {cm(o['genislik_cm'])} × {cm(o['yukseklik_cm'])} {'' if sek_o == sek else '(' + sek_o + ')'} | **{cm(s['genislik_cm'])} × {cm(s['yukseklik_cm'])}** | {sek} | {s['hesap']} | {('görünen ' + cm(s['gorunen'][0]) + ' × ' + cm(s['gorunen'][1]) + ' cm') if s['oran_farki'] > 0.15 else ''} |")
    open(os.path.join(BURA, 'olcu-v2-tablo.md'), 'w').write('\n'.join(t) + '\n')
    print('satır', len(satirlar), '· değişen', sum(s['degisti'] for s in satirlar),
          '· oran farkı %15+', sum(s['oran_farki'] > 0.15 for s in satirlar))


if __name__ == '__main__':
    main()
