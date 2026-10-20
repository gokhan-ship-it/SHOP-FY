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

## Durum (2026-10-20 akşam)
Adım 1–4 tamam (ayrıntı: `docs/degisiklik-kaydi.md`, 2026-10-20 satırları):
- Kopya tema **"Kişiselleştirme DEV - mini çanta" (207301280030)**, 5 dosya commit 7588b7c ile yüklendi, MD5 doğrulandı.
  Canlı tema 207025864990'a dokunulmadı (updatedAt 2026-10-14T10:15:59Z).
- Mağaza: 6 PNG (MediaImage 72897702035742 … 72897702199582), `onizleme_gorseli`, `harita`, `aktif = true`;
  `acik_urunler` 23 → 29. Liste güncel; liste-kontrol yalnızca "Kendin Tasarla"da yok uyarısı veriyor (adım 6).
- Önizleme kontrolü `test/tarayici/canli-mini-canta.mjs <tema id>` ile geçti; canlıda bu ürünlerde kart yok.

## Kalan adımlar
5. Kullanıcı önizleme linkinde telefonda dener:
   `https://jantifox.com/products/cok-amacli-mini-canta-kirmizi-beyaz-zikzak?preview_theme_id=207301280030`
   **Yayından hemen önce** canlı temanın `updatedAt` değeri 2026-10-14T10:15:59Z mi diye bakılır; değiştiyse
   (Admin'den yapılan bir düzenleme) kopya yayınlanınca o düzenleme kaybolur, önce kopyaya taşınır.
   Yayını kullanıcı Admin'den yapar (API tema yayınlamayı engelliyor).
6. **Yayından sonra:** 6 ürün "Kendin Tasarla" koleksiyonunun çanta grubuna (`collectionAddProductsV2` +
   `collectionReorderProducts`); bu adım canlıda hemen görünür, yayından önce yapılmaz. Sonra liste-kontrol çıkış 0.
   Yayından önce geri dönmek gerekirse: 6 üründe `aktif = false` yeterli (kopya tema kartı kapatır, canlıda zaten yok).

## Açık konular
- 4, 5, 6 numaralı görsellerde Velcro dairesi çantaya göre büyük çizilmiş (ön yüz daireden 19,1 / 16,5 / 14,7 cm,
  gerçekte ~24 cm). Kullanıcı "şimdilik böyle" dedi; yeni görsel gelirse yalnızca PNG ve harita değişir.
- Panel tişört / sweatshirt / şapka / kalem kutusunda Aksesuar'ı kapalı yazıyor ama editör `harita.izinler`'i
  okumuyor (Aksesuar adımı görünüyor). Kullanıcıya soruldu, bu işte dokunulmadı.
