# Çok Amaçlı Mini Çanta — kalan adımlar (2026-10-20)

Kullanıcı onayı alındı (plan ve "4–6 numaralı görseller şimdilik böyle"). Depo tarafı bitti; mağaza ve tema adımları
Shopify bağlantısı gelince yapılacak. Kurallar: canlı temaya dokunma, ekran görüntüsü alma, her yazmayı
`docs/degisiklik-kaydi.md`'ye işle; mağaza verisinde bir şeyi bozma riski varsa önce sor.

## Depoda hazır olanlar
- Görseller: `veri/urunler/png/<handle>.png` (6 ürün, commit 1f67e29), Velcro dairesi `veri/urunler/on-dolgu.json`.
- Haritalar: `veri/urunler/alan-paneli-20261020-mini-canta.json` (dogrula.py: 6 ürün, hata yok). Her haritada
  `tek_patch: true`, `izinler: {set: false, aksesuar: false}`, tek alan "Velcro" (daire, `cap_cm: 5`).
- Tema dosyaları (commit 4bd53c1, testler 7588b7c): `assets/kisisel-editor.js`, `snippets/kisisel-acik-mi.liquid` (yeni),
  `snippets/kisisel-kart.liquid`, `snippets/kisisel-koleksiyon.liquid`, `sections/kisisel-cok-satanlar.liquid`.

| Ürün | id | handle |
|---|---|---|
| Kırmızı Beyaz Zikzak | 10088650473758 | cok-amacli-mini-canta-kirmizi-beyaz-zikzak |
| Kırmızı Puantiyeli | 10088652046622 | cok-amacli-mini-canta-kirmizi-puantiyeli-1 |
| Mavi Beyaz Çizgili | 10088650047774 | cok-amacli-mini-canta-kirmizi-puantiyeli |
| Pembe Kırmızı Puantiyeli | 15779978314014 | cok-amacli-mini-canta-kucuk-puantiyeli |
| Yeşil Pembe Çizgili | 15779978510622 | cok-amacli-mini-canta-yesil-pembe-cizgili |
| Sarı Çizgili | 15779978608926 | cok-amacli-mini-canta-sari-cizgili |

## Sıradaki adımlar
1. **Kopya tema:** canlı tema (MAIN, şu an "Kişiselleştirme DEV - hız", 207025864990) `themeDuplicate` ile
   "Kişiselleştirme DEV - mini çanta" adıyla kopyalanır. Önce kopyadaki bu 5 dosyanın (yeni snippet hariç) depodaki
   bir önceki halle (commit 1f67e29) aynı olduğu doğrulanır; sonra `themeFilesUpsert` (kaynak: commit'e sabit ham
   GitHub adresi) yalnızca kopyaya, `checksumMd5` ile doğrulanır.
2. **Mağaza, okuma:** 6 ürünün `kisisellestirme` alanları (onizleme_gorseli, onizleme_gorseli_png, harita, aktif,
   metin_karakter_siniri), etiketleri ve `shop.metafields.kisisellestirme.acik_urunler`. Dolu alan varsa yazmadan
   önce kullanıcıya gösterilir. `dogrula.py ... --magaza --liste` yeniden çalıştırılır.
3. **Mağaza, yazma** (canlıda görünmez: canlı tema kartı patch-notice etiketi olmadan açmaz):
   - 6 PNG `fileCreate` (ham GitHub adresi, commit 1f67e29) → MediaImage → `kisisellestirme.onizleme_gorseli`.
     PNG kaynak olduğu için `onizleme_gorseli_png` gerekmez. Ürün medyasına eklenmez, ürün görsellerine dokunulmaz.
   - `metafieldsSet`: `harita`, `aktif = true`; `acik_urunler`'e 6 ürün eklenir. Etiket eklenmez.
   - Sonra liste-sorgu.graphql + liste-kontrol.py (çıkış 0 beklenir; mini çantalar "Kendin Tasarla"da yok uyarısı
     koleksiyon adımına kadar normal).
4. **Önizleme kontrolü** (kopya tema, `preview_theme_id`): 6 ürün sayfasında kart açılıyor mu; editörde yazı / ikon
   yer değiştirme, en büyük ikon, sepete ekleme. Canlı temada bu ürünlerde kart çıkmadığı da doğrulanır.
5. Kullanıcıya önizleme linki ve telefonda denenecekler. Yayından hemen önce canlı temada değişiklik kontrolü.
6. **Yayından sonra:** 6 ürün "Kendin Tasarla" koleksiyonunun çanta grubuna (`collectionAddProductsV2` +
   `collectionReorderProducts`); bu adım canlıda hemen görünür, yayından önce yapılmaz.

## Açık konular
- 4, 5, 6 numaralı görsellerde Velcro dairesi çantaya göre büyük çizilmiş (ön yüz daireden 19,1 / 16,5 / 14,7 cm,
  gerçekte ~24 cm). Kullanıcı "şimdilik böyle" dedi; yeni görsel gelirse yalnızca PNG ve harita değişir.
- Panel tişört / sweatshirt / şapka / kalem kutusunda Aksesuar'ı kapalı yazıyor ama editör `harita.izinler`'i
  okumuyor (Aksesuar adımı görünüyor). Kullanıcıya soruldu, bu işte dokunulmadı.
