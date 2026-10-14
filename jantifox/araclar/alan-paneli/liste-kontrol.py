"""Kategori sayfası aday listesi (shop.metafields.kisisellestirme.acik_urunler) ile ürünlerin kişiselleştirme durumunu
karşılaştırır. Kategori kartları ürünleri yalnızca bu listeden alır; liste eksikse açık ürün kategoride görünmez.

Kullanım (jantifox/ klasöründen):
    python3 -I araclar/alan-paneli/liste-kontrol.py magaza-durum.json

magaza-durum.json, liste-sorgu.graphql sorgusunun sonucundan üretilir:
    {"acik_urunler": [gid, ...],
     "urunler": [{"id": gid, "handle": ..., "baslik": ..., "durum": "ACTIVE", "etiketler": [...],
                  "aktif": "true" | "false" | null, "harita_var": true | false}, ...]}

Kartın koşuluyla aynı: patch-notice etiketi + aktif = true + harita. Fark varsa listeler, çıkış kodu 1.

İsteğe bağlı "Kendin Tasarla" koleksiyonu denetimi (ana sayfadaki "Tüm kişiselleştirilebilir ürünler →" butonunun
sayfası): girdide "kendin_tasarla" (koleksiyondaki ürün gid'leri) ve "katalog_patchler" (katalogdaki harf / rakam /
ikon ürünleri ve hazır setler: [{"id", "baslik", "durum", "etiketler"}]) varsa, kişiselleştirmesi açık her ürünün ve
satıştaki her katalog patch'inin koleksiyonda olduğu denetlenir; eksikler grubuyla birlikte yazılır (koleksiyon elle
sıralı: çantalar, kıyafetler, şapkalar, kalem kutuları, patch setleri, tek patch'ler).
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
    sonuc = 0
    if eksik or fazla:
        yeni = [g for g in liste if g not in fazla] + eksik
        print('Önerilen yeni liste (%d ürün):' % len(yeni))
        print(json.dumps(yeni))
        sonuc = 1
    else:
        print('Liste güncel.')
    if koleksiyon_denetle(d, urunler, acik_mi) != 0:
        sonuc = 1
    return sonuc


def grup(u, patch=False):
    etiket = [t.lower() for t in (u.get('etiketler') or [])]
    if patch:
        return 'patch seti' if 'patch-set' in etiket else 'tek patch'
    if 'kıyafet' in etiket:
        return 'kıyafet'
    if 'şapka' in etiket or 'hat' in etiket:
        return 'şapka'
    if 'kalem' in (u.get('handle') or '') or 'kalem' in (u.get('baslik') or '').lower():
        return 'kalem kutusu'
    return 'çanta'


def koleksiyon_denetle(d, urunler, acik_mi):
    if 'kendin_tasarla' not in d:
        print('Not: "kendin_tasarla" verilmedi; Kendin Tasarla koleksiyonu denetlenmedi.')
        return 0
    kol = set(d.get('kendin_tasarla') or [])
    patchler = [p for p in d.get('katalog_patchler') or [] if p.get('durum', 'ACTIVE') == 'ACTIVE']
    eksik = [(u, grup(u)) for g, u in urunler.items() if acik_mi(u) and g not in kol]
    eksik += [(p, grup(p, True)) for p in patchler if p['id'] not in kol]
    print('Kendin Tasarla koleksiyonu: %d ürün; açık ürün %d, katalog patch %d' % (
        len(kol), sum(1 for u in urunler.values() if acik_mi(u)), len(patchler)))
    for u, gr in eksik:
        print('  KOLEKSİYONDA YOK: %s → "%s" grubuna ekle' % (u.get('baslik') or u.get('handle') or u['id'], gr))
    if eksik:
        print('Eklemek için: collectionAddProductsV2 (kendin-tasarla), sonra koleksiyonda grubunun sonuna taşı '
              '(Shopify Admin > Koleksiyonlar > Kendin Tasarla, ya da collectionReorderProducts).')
        return 1
    print('Kendin Tasarla koleksiyonu güncel.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
