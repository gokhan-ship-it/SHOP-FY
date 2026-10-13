"""Kategori sayfası aday listesi (shop.metafields.kisisellestirme.acik_urunler) ile ürünlerin kişiselleştirme durumunu
karşılaştırır. Kategori kartları ürünleri yalnızca bu listeden alır; liste eksikse açık ürün kategoride görünmez.

Kullanım (jantifox/ klasöründen):
    python3 -I araclar/alan-paneli/liste-kontrol.py magaza-durum.json

magaza-durum.json, liste-sorgu.graphql sorgusunun sonucundan üretilir:
    {"acik_urunler": [gid, ...],
     "urunler": [{"id": gid, "handle": ..., "baslik": ..., "durum": "ACTIVE", "etiketler": [...],
                  "aktif": "true" | "false" | null, "harita_var": true | false}, ...]}

Kartın koşuluyla aynı: patch-notice etiketi + aktif = true + harita. Fark varsa listeler, çıkış kodu 1.
Hiçbir şey yazmaz.
"""
import json
import sys


def acik_mi(u):
    return 'patch-notice' in (u.get('etiketler') or []) and str(u.get('aktif')).lower() == 'true' and bool(u.get('harita_var'))


def main(argv):
    if not argv:
        sys.exit(__doc__)
    d = json.load(open(argv[0], encoding='utf-8'))
    liste = list(d.get('acik_urunler') or [])
    urunler = {u['id']: u for u in d.get('urunler') or []}
    ad = lambda g: (urunler.get(g) or {}).get('baslik') or (urunler.get(g) or {}).get('handle') or g
    eksik = [g for g, u in urunler.items() if acik_mi(u) and g not in liste]
    fazla = [g for g in liste if g not in urunler or not acik_mi(urunler[g])]
    yarim = [g for g, u in urunler.items() if str(u.get('aktif')).lower() == 'true' and not acik_mi(u)]
    print('Kişiselleştirmesi açık ürün: %d, listede: %d' % (sum(1 for u in urunler.values() if acik_mi(u)), len(liste)))
    for g in eksik:
        print('  EKSİK (açık ama listede yok, kategoride görünmez): %s' % ad(g))
    for g in fazla:
        u = urunler.get(g)
        neden = 'ürün bulunamadı' if not u else ('aktif değil' if str(u.get('aktif')).lower() != 'true' else 'harita ya da etiket yok')
        print('  FAZLA (listede ama kapalı; kart koşulu zaten eler): %s (%s)' % (ad(g), neden))
    for g in yarim:
        print('  UYARI: aktif = true ama kart koşulu sağlanmıyor (patch-notice etiketi ya da harita yok): %s' % ad(g))
    if eksik or fazla:
        yeni = [g for g in liste if g not in fazla] + eksik
        print('Önerilen yeni liste (%d ürün):' % len(yeni))
        print(json.dumps(yeni))
        return 1
    print('Liste güncel.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
