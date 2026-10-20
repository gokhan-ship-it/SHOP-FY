"""Alan panelinin dışa aktardığı JSON'u mağazaya yazmadan önce denetler ve yazma planı çıkarır.

Kullanım (jantifox/ klasöründen):
    python3 -I araclar/alan-paneli/dogrula.py <alan-paneli-....json> [--magaza magaza.json] [--liste liste.json] [--plan yazma-plani.json]

--magaza: ürünlerin mağazadaki kisisellestirme alanları, {handle: {anahtar: değer}} (yazmadan hemen önce okunur).
          Verilirse mevcut değerlerle çakışmalar listelenir; mevcut bir değerin üzerine yazmak ayrıca onay ister.
--liste:  mağazanın kategori aday listesi ve ürünlerin "aktif" durumu, liste-kontrol.py'nin girdisiyle aynı biçim
          ({"acik_urunler": [gid, ...], "urunler": [{"id": gid, "handle": ..., "aktif": ..., ...}]}).
          Verilirse planda shop.metafields.kisisellestirme.acik_urunler'in yeni değeri de çıkar (açılan ürün eklenir,
          kapatılan çıkarılır). Verilmezse plan "liste adımı eksik" diye işaretlenir; mağazaya yazmadan önce --liste ile
          yeniden çalıştırılmalı (kategori sayfaları ürünleri bu listeden okur).
--plan:   yazma planının kaydedileceği dosya (varsayılan: dışa aktarılan dosyanın yanında, -plan.json).

Hiçbir şey yazmaz. Hata varsa çıkış kodu 1.
"""
import json
import math
import os
import sys

KOK = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))  # jantifox/
TIPLER = {'letter', 'number', 'icon'}
SEKILLER = {'circle', 'ellipse', 'rect', 'poly'}
HARF = (5.5, 6.0)  # örnek harf patch'i (cm)
TOL = 0.05  # % cinsinden sınır toleransı


def gruplar():
    plan = json.load(open(os.path.join(KOK, 'veri', 'urunler', 'plan.json'), encoding='utf-8'))
    urun = {}
    for g in plan['gruplar']:
        for u in g['urunler']:
            urun[u['handle']] = (u, g)
    return urun


def png_boyut(yol):
    from PIL import Image
    with Image.open(yol) as im:
        return im.size


def sekil_sorunlari(z, ad):
    s = []
    if z.get('shape') not in SEKILLER:
        s.append('%s: şekil tanınmıyor (%r)' % (ad, z.get('shape')))
    try:
        x, y, w, h = (float(z[k]) for k in ('x', 'y', 'w', 'h'))
    except (KeyError, TypeError, ValueError):
        return s + ['%s: x / y / w / h eksik ya da sayı değil' % ad]
    if w <= 0 or h <= 0:
        s.append('%s: boyut sıfır' % ad)
    if x < -TOL or y < -TOL or x + w > 100 + TOL or y + h > 100 + TOL:
        s.append('%s: görselin dışına taşıyor (x %.2f–%.2f, y %.2f–%.2f %%)' % (ad, x, x + w, y, y + h))
    if z.get('shape') == 'poly':
        p = z.get('points')
        try:
            p = [(float(q[0]), float(q[1])) for q in p]
        except (TypeError, ValueError, IndexError):
            return s + ['%s: çokgen noktaları okunamadı' % ad]
        if len(p) < 3:
            return s + ['%s: çokgende en az 3 nokta olmalı' % ad]
        xs, ys = [q[0] for q in p], [q[1] for q in p]
        if min(xs) < -TOL or min(ys) < -TOL or max(xs) > 100 + TOL or max(ys) > 100 + TOL:
            s.append('%s: çokgen noktaları görselin dışında' % ad)
        if abs(min(xs) - x) > 0.1 or abs(min(ys) - y) > 0.1 or abs(max(xs) - (x + w)) > 0.1 or abs(max(ys) - (y + h)) > 0.1:
            s.append('%s: x / y / w / h çokgenin kutusuyla uyuşmuyor' % ad)
        if kendini_keser(p):
            s.append('%s: çokgenin kenarları birbirini kesiyor' % ad)
    return s


def _vek(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _kesisir(a, b, c, d):
    d1, d2, d3, d4 = _vek(c, d, a), _vek(c, d, b), _vek(a, b, c), _vek(a, b, d)
    return ((d1 > 0 > d2) or (d1 < 0 < d2)) and ((d3 > 0 > d4) or (d3 < 0 < d4))


def kendini_keser(p):
    n = len(p)
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if _kesisir(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n]):
                return True
    return False


def _icinde(x, y, p):
    ic = False
    j = len(p) - 1
    for i in range(len(p)):
        if (p[i][1] > y) != (p[j][1] > y) and x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]:
            ic = not ic
        j = i
    return ic


def cokgen_dikdortgen_sigar(p, w, h):
    """w × h dikdörtgen çokgenin (cm) içinde bir yere sığıyor mu: köşeler içeride, kenar kesmiyor, köşe içine girmiyor."""
    xs, ys = [q[0] for q in p], [q[1] for q in p]
    adim = max(0.25, min(w, h) / 4)
    y = min(ys)
    while y + h <= max(ys) + 1e-9:
        x = min(xs)
        while x + w <= max(xs) + 1e-9:
            r = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
            if all(_icinde(q[0], q[1], p) for q in r) and not any(
                    x < a[0] < x + w and y < a[1] < y + h for a in p) and not any(
                    _kesisir(p[k], p[(k + 1) % len(p)], r[m], r[(m + 1) % 4]) for k in range(len(p)) for m in range(4)):
                return True
            x += adim
        y += adim
    return False


def harf_sigar(z, en_cm, boy_cm, en=None, boy=None, px_cm=None):
    lw, lh = HARF
    if z['shape'] == 'poly':
        p = [(q[0] / 100 * en / px_cm, q[1] / 100 * boy / px_cm) for q in z['points']]
        return cokgen_dikdortgen_sigar(p, lw, lh)
    if z['shape'] == 'rect':
        return en_cm >= lw and boy_cm >= lh
    a, b = en_cm / 2, boy_cm / 2
    return (lw / 2) ** 2 / a ** 2 + (lh / 2) ** 2 / b ** 2 <= 1


def ayni_geometri(a, b):
    """İki haritanın alanları ve yasaklı bölgeleri aynı mı (tip / dis gibi ek alanlar hariç)."""
    def ozet(h):
        z = [(q.get('shape'), round(q['x'], 1), round(q['y'], 1), round(q['w'], 1), round(q['h'], 1),
              q.get('cap_cm') or q.get('genislik_cm'), q.get('kose_cm'), tuple(sorted(q.get('allowed_types') or [])),
              tuple(tuple(round(v, 1) for v in n) for n in q.get('points') or []))
             for q in h.get('zones') or []]
        f = [(q.get('shape'), round(q['x'], 1), round(q['y'], 1), round(q['w'], 1), round(q['h'], 1),
              tuple(tuple(round(v, 1) for v in n) for n in q.get('points') or [])) for q in h.get('forbidden') or []]
        return z, sorted(f)
    return ozet(a) == ozet(b)


def denetle(u, bilinen, magaza):
    h = u['handle']
    hatalar, uyarilar, catisma = [], [], []
    if h not in bilinen:
        return ['Ürün plan.json içinde yok'], [], [], None
    plan_u, g = bilinen[h]
    if u.get('urun_id') != plan_u['urun_id']:
        hatalar.append('Ürün kimliği plan.json ile uyuşmuyor (%s / %s)' % (u.get('urun_id'), plan_u['urun_id']))
    mevcut = (magaza or {}).get(h, {})
    alanlar = []

    if plan_u.get('durum') == 'patch_alani_yok' and u.get('durum') != 'atlandi':
        hatalar.append('Bu üründe patch alanı yok (plan.json: patch_alani_yok); panelde "Atlandı" olmalı')
        return hatalar, uyarilar, catisma, None

    if u.get('durum') == 'atlandi':
        alanlar.append(('aktif', 'boolean', 'false'))
        if mevcut.get('aktif') not in (None, 'false', False):
            catisma.append('aktif şu an %r, false yazılacak' % mevcut.get('aktif'))
        return hatalar, uyarilar, catisma, {'png': None, 'alanlar': alanlar}

    hr = u.get('harita') or {}
    png = u.get('png') or {}
    gorsel = hr.get('gorsel') or {}
    en, boy = gorsel.get('en'), gorsel.get('boy')
    if not en or not boy:
        hatalar.append('Haritada görsel boyutu yok')
        return hatalar, uyarilar, catisma, None
    yol = os.path.join(KOK, png.get('dosya') or '')
    if not png.get('dosya') or not os.path.exists(yol):
        hatalar.append('Görsel dosyası bulunamadı: %s' % png.get('dosya'))
    else:
        gercek = png_boyut(yol)
        if tuple(gercek) != (en, boy):
            hatalar.append('Görsel %d×%d, harita %d×%d için çizilmiş' % (gercek[0], gercek[1], en, boy))

    zones = hr.get('zones') or []
    if not zones:
        hatalar.append('Takılabilir alan yok')
    for i, z in enumerate(zones):
        ad = 'Alan "%s"' % z.get('ad', i + 1)
        hatalar += sekil_sorunlari(z, ad)
        t = set(z.get('allowed_types') or [])
        if not t <= TIPLER:
            hatalar.append('%s: bilinmeyen tip %s' % (ad, sorted(t - TIPLER)))
        iz = u.get('izinler') or {}
        if not t and (iz.get('harf') or iz.get('rakam') or iz.get('ikon')):
            hatalar.append('%s: patch tipi seçilmemiş' % ad)
    for i, z in enumerate(hr.get('forbidden') or []):
        hatalar += sekil_sorunlari(z, 'Yasaklı "%s"' % z.get('ad', i + 1))

    # Ölçek: editör ilk alanın cap_cm / genislik_cm değerini okur
    px_cm = None
    if zones and not hatalar:
        z0 = zones[0]
        cm = z0.get('cap_cm') if z0['shape'] == 'circle' else z0.get('genislik_cm')
        if not cm or cm <= 0:
            hatalar.append('İlk alanda ölçü yok (%s)' % ('cap_cm' if z0['shape'] == 'circle' else 'genislik_cm'))
        else:
            px = min(z0['w'] / 100 * en, z0['h'] / 100 * boy) if z0['shape'] == 'circle' else z0['w'] / 100 * en
            px_cm = px / cm
            ol = u.get('olcek') or {}
            if ol.get('px_cm') and abs(ol['px_cm'] - px_cm) / px_cm > 0.01:
                hatalar.append('Ölçek tutarsız: panel %.3f px/cm, harita %.3f px/cm' % (ol['px_cm'], px_cm))
            en_cm = en / px_cm
            uo = g.get('urun_olcu') or {}
            boyutlar = [uo[k] for k in ('en_cm', 'boy_cm', 'derinlik_cm') if uo.get(k)]
            if boyutlar:
                # Açılı çekimde görünen genişlik derinliğe yaklaşabilir: alt sınır en küçük boyuttan
                if not (min(boyutlar) * 0.8 <= en_cm <= max(boyutlar) * 2.5):
                    hatalar.append('Ölçek şüpheli: görsel %.1f cm, ürün %s cm' % (en_cm, ' × '.join(str(b) for b in boyutlar)))
            else:
                # Ürün ölçüsü yoksa genel aralık: çanta / kıyafet görseli 25–130 cm; şapka önden 15–30 cm (panelle aynı)
                alt, ust = (15, 30) if 'Şapka' in (g.get('ad') or '') else (25, 130)
                if not (alt <= en_cm <= ust):
                    hatalar.append('Ölçek şüpheli: görsel %.1f cm genişliğe denk geliyor (beklenen %d–%d cm)' % (en_cm, alt, ust))
            v = g.get('velcro') or {}
            if v.get('cap_cm') and z0['shape'] == 'circle' and abs(cm - v['cap_cm']) / v['cap_cm'] > 0.1:
                uyarilar.append('Çap %.1f cm, sitede %s cm' % (cm, v['cap_cm']))
            # Tek patch'lik üründe (harita.tek_patch) boyut denetimi yok: her patch Velcro'nun ortasına takılır
            for z in ([] if hr.get('tek_patch') else zones):
                zw, zh = z['w'] / 100 * en / px_cm, z['h'] / 100 * boy / px_cm
                if not harf_sigar(z, zw, zh, en, boy, px_cm):
                    hatalar.append('Alan "%s" (%.1f × %.1f cm) %s × %s cm harfi almıyor' % (z.get('ad'), zw, zh, HARF[0], HARF[1]))
    if g.get('tek_patch') and not hr.get('tek_patch'):
        hatalar.append('Grup tek patch\'lik (plan.json tek_patch) ama haritada tek_patch yok')
    if hr.get('tek_patch'):
        hiz = hr.get('izinler') or {}
        if hiz.get('set') or hiz.get('aksesuar'):
            hatalar.append('Tek patch\'lik haritada set ya da aksesuar izni açık')
    if hr.get('olcu_tahmini') or (u.get('olcek') or {}).get('tahmini'):
        uyarilar.append('Ölçü tahmini (çanta genişliğinden); gerçek Velcro ölçüsü gelince güncellenmeli')
    for x in u.get('uyarilar') or []:
        if x not in uyarilar and not x.startswith('Ölçü tahmini'):
            uyarilar.append(x)
    ms = u.get('metin_karakter_siniri')
    if ms is not None and (not isinstance(ms, int) or ms <= 0):
        hatalar.append('Metin karakter sınırı geçersiz: %r' % ms)
    iz = u.get('izinler') or {}
    if not any(iz.values()):
        hatalar.append('Hiçbir patch tipine izin verilmemiş')

    # Yazma planı
    png_yukle = None
    if u.get('mevcut_onizleme_gorseli'):
        if mevcut.get('onizleme_gorseli') and mevcut['onizleme_gorseli'] != u['mevcut_onizleme_gorseli']:
            catisma.append('onizleme_gorseli mağazada değişmiş')
    else:
        png_yukle = png.get('dosya')
        if mevcut.get('onizleme_gorseli'):
            catisma.append('onizleme_gorseli zaten dolu (%s); yeni görsel yazılırsa değişir' % mevcut['onizleme_gorseli'])
    eski = mevcut.get('harita')
    if isinstance(eski, str):
        try:
            eski = json.loads(eski)
        except ValueError:
            eski = None
    if eski and ayni_geometri(eski, hr):
        uyarilar.append('Mağazadaki harita aynı geometride; harita yazılmayacak')
    else:
        if eski:
            catisma.append('harita zaten dolu ve farklı; üzerine yazılacak')
        alanlar.append(('harita', 'json', json.dumps(hr, ensure_ascii=False, separators=(',', ':'))))
    if ms:
        if mevcut.get('metin_karakter_siniri') not in (None, str(ms), ms):
            catisma.append('metin_karakter_siniri %s → %s' % (mevcut['metin_karakter_siniri'], ms))
        if str(mevcut.get('metin_karakter_siniri')) != str(ms):
            alanlar.append(('metin_karakter_siniri', 'number_integer', str(ms)))
    if str(mevcut.get('aktif')).lower() != 'true':
        alanlar.append(('aktif', 'boolean', 'true'))
    return hatalar, uyarilar, catisma, {'png': png_yukle, 'alanlar': alanlar}


def liste_guncelle(liste, plan):
    """Kategori aday listesinin (acik_urunler) yazmadan sonraki hali. Ürünün son aktif değeri: planda yazılıyorsa o,
    yoksa mağazadaki. Listede olup artık aktif olmayan çıkar, aktif olup listede olmayan eklenir (sıra korunur)."""
    if liste is None:
        return None
    onceki = list(liste.get('acik_urunler') or [])
    aktif = {x['id']: str(x.get('aktif')).lower() == 'true' for x in liste.get('urunler') or []}
    for p in plan:
        for m in p['metafields']:
            if m['key'] == 'aktif':
                aktif[p['owner']] = m['value'] == 'true'
    yeni = [g for g in onceki if aktif.get(g, True)]
    for g, a in aktif.items():
        if a and g not in yeni:
            yeni.append(g)
    return {'onceki': onceki, 'yeni': yeni, 'eklenen': [g for g in yeni if g not in onceki],
            'cikan': [g for g in onceki if g not in yeni],
            'metafield': {'namespace': 'kisisellestirme', 'key': 'acik_urunler', 'type': 'list.product_reference',
                          'value': json.dumps(yeni)}}


def main(argv):
    if not argv or argv[0].startswith('-'):
        sys.exit(__doc__)
    giris = argv[0]
    magaza, liste, plan_yolu = None, None, os.path.splitext(giris)[0] + '-plan.json'
    i = 1
    while i < len(argv):
        if argv[i] == '--magaza':
            magaza = json.load(open(argv[i + 1], encoding='utf-8'))
            i += 2
        elif argv[i] == '--liste':
            liste = json.load(open(argv[i + 1], encoding='utf-8'))
            i += 2
        elif argv[i] == '--plan':
            plan_yolu = argv[i + 1]
            i += 2
        else:
            sys.exit('Bilinmeyen seçenek: ' + argv[i])
    veri = json.load(open(giris, encoding='utf-8'))
    if veri.get('tur') != 'jantifox-alan-paneli':
        sys.exit('Bu dosya alan panelinin dışa aktarımı değil.')
    bilinen = gruplar()
    toplam_hata, plan, gorulen = 0, [], set()
    for u in veri.get('urunler') or []:
        h = u.get('handle')
        if h in gorulen:
            print('✗ %s: iki kez var' % h)
            toplam_hata += 1
            continue
        gorulen.add(h)
        hatalar, uyarilar, catisma, yazma = denetle(u, bilinen, magaza)
        isaret = '✗' if hatalar else ('!' if uyarilar or catisma else '✓')
        print('%s %s (%s, %s)' % (isaret, u.get('baslik', h), u.get('grup'), u.get('durum')))
        for x in hatalar:
            print('    HATA: ' + x)
        for x in catisma:
            print('    ÇAKIŞMA: ' + x)
        for x in uyarilar:
            print('    uyarı: ' + x)
        toplam_hata += len(hatalar)
        if not hatalar and yazma:
            plan.append({'handle': h, 'urun_id': u['urun_id'], 'owner': 'gid://shopify/Product/%s' % u['urun_id'],
                         'yuklenecek_png': yazma['png'], 'catismalar': catisma,
                         'metafields': [{'namespace': 'kisisellestirme', 'key': k, 'type': t, 'value': v} for k, t, v in yazma['alanlar']]})
    eksik = [h for h in bilinen if h not in gorulen]
    print()
    print('Ürün: %d (dosyada), %d plan.json\'da olup dosyada olmayan (çizilecek ya da görsel yok)' % (len(gorulen), len(eksik)))
    print('Yazılacak: %d ürün, %d alan, %d yeni görsel; çakışma: %d ürün' % (
        len(plan), sum(len(p['metafields']) for p in plan), sum(1 for p in plan if p['yuklenecek_png']),
        sum(1 for p in plan if p['catismalar'])))
    if magaza is None:
        print('Not: --magaza verilmedi; mağazadaki mevcut değerlerle karşılaştırma yapılmadı.')
    if toplam_hata:
        print('%d hata var; yazma planı çıkarılmadı.' % toplam_hata)
        return 1
    liste_plani = liste_guncelle(liste, plan)
    if liste_plani is None:
        print('LİSTE ADIMI EKSİK: --liste verilmedi. Yazmadan önce --liste ile yeniden çalıştır; kategori sayfası aday listesi '
              '(acik_urunler) güncellenmezse açılan ürünler kategori sayfalarında kişiselleştirilebilir görünmez.')
    else:
        print('acik_urunler: %d → %d ürün (eklenecek %d, çıkarılacak %d)' % (
            len(liste_plani['onceki']), len(liste_plani['yeni']), len(liste_plani['eklenen']), len(liste_plani['cikan'])))
        if liste_plani['eklenen']:
            print('KOLEKSİYON: açılan %d ürün "Kendin Tasarla" koleksiyonuna (kendin-tasarla) da eklenmeli ve kendi grubuna '
                  '(çanta, kıyafet, şapka, kalem kutusu) sıralanmalı; yazdıktan sonra liste-kontrol.py ile denetle.' % len(liste_plani['eklenen']))
    json.dump({'kaynak': os.path.basename(giris), 'urunler': plan, 'acik_urunler': liste_plani}, open(plan_yolu, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('Yazma planı: ' + plan_yolu)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
