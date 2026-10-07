# Mağaza değişiklik kaydı (Kişiselleştirme projesi)

Bu proje kapsamında mağazada yapılan her yazma işlemi burada listelenir. Mevcut ürün verisi (`custom.*` vb.) değiştirilmez; yalnızca `kisisellestirme` namespace'i ve çalışma kopyası tema kullanılır.

| Tarih | İşlem | Hedef | Ayrıntı |
|---|---|---|---|
| 2026-10-07 | `themeDuplicate` | Canlı tema 205444088094 → yeni tema `gid://shopify/OnlineStoreTheme/206773780766` | "Kişiselleştirme DEV - 2026-10-07", UNPUBLISHED |
| 2026-10-07 | `metafieldDefinitionCreate` ×12 | Ürün ve varyant metafield tanımları | Aşağıdaki tablo |
| 2026-10-07 | `metaobjectDefinitionCreate` | `kisisellestirme_katalog` | `gid://shopify/MetaobjectDefinition/46976860446`; alanlar: baslik, harf_setleri, rakamlar, ikonlar, kategoriler, ayarlar |
| 2026-10-07 | `metafieldsSet` ×225 | 60 patch ürünü: `kisisellestirme.tip/set/genislik_cm/yukseklik_cm/sekil` | Kaynak ve sonuç: `veri/olcu-kaynak.json`, `veri/olcu-metafields.json`, `veri/olcu-kontrol-listesi.md` |
| 2026-10-07 | `metafieldsSet` ×36 | Cool Alfabe (26) ve Janti Rakam (10) varyantları: `kisisellestirme.karakter` | `veri/varyant-karakter.json` |
| 2026-10-07 | `metafieldsSet` ×3 | Kanvas Lacivert Tote Çanta: `kisisellestirme.aktif=true`, `onizleme_gorseli=MediaImage/54903737811230` (galerinin 2. görseli), `harita` | Harita **kalibre edilmedi** (`"kalibre": false`); daire konumu yer tutucu |
| 2026-10-07 | `metaobjectCreate` | `kisisellestirme_katalog` / handle `ana` | `gid://shopify/Metaobject/306704613662`; içerik `veri/katalog-ana.json` |
| 2026-10-07 | `themeFilesUpsert` (yalnızca kopya tema 206773780766) | Yeni: `assets/kisisel-editor.js`, `assets/kisisel-editor.css`, `assets/kisisel-sepet.js`, `snippets/kisisel-kart.liquid`, `snippets/kisisel-veri.liquid`, `snippets/kisisel-veri-patch.liquid`, `snippets/kisisel-sepet.liquid` | İçerik bu depodaki `jantifox/` dosyalarıyla aynı (MD5 doğrulandı) |
| 2026-10-07 | `themeFilesUpsert` (yalnızca kopya tema) | Değişen: `templates/product.product-canta.json` (+1 custom_liquid blok), `layout/theme.liquid` (+1 satır render) | Orijinaller baseline commit'inde (76131ef) |
| 2026-10-07 | `metafieldsSet` | Kanvas Lacivert Tote Çanta: `kisisellestirme.harita` (sürüm 2) | `cap_cm: 25` (ölçek dairenin gerçek çapından) ve `gorsel: 1920x1920` eklendi; `kalibre: false`. Yeni PNG yüklenince `veri/daire-bul.py` ile yeniden üretilecek |
| 2026-10-07 | `themeFilesUpsert` (yalnızca kopya tema) | `assets/kisisel-editor.js`, `assets/kisisel-editor.css`, `snippets/kisisel-veri.liquid` | Yakın görünüm, harfleri ayır, Türkçe fiyat biçimi |
| 2026-10-07 | (kullanıcı, Admin) | Kanvas Lacivert Tote: `kisisellestirme.onizleme_gorseli` → yeni PNG (MediaImage/72562227314974, 1920×1920) | Kullanıcı yükledi |
| 2026-10-07 | (kullanıcı, Admin) | Kanvas Lacivert Tote: `kisisellestirme.harita` | `araclar/alan-cizici.html` ile çizildi: daire, çap 25 cm, `kalibre: true`. Kenar sapması en fazla ~5 px (~1,5 mm) |
| 2026-10-07 | `themeFilesUpsert` (yalnızca kopya tema) | `assets/kisisel-editor.js` | Hata düzeltmesi: ana "Sepete ekle" butonu kişiselleştirme modunda düz çantayı ekliyordu (`form.id` tuzağı); çekmece `is-empty` düzeltmesi |
| 2026-10-07 | `metafieldDefinitionCreate` ×5 | Product: `png_genislik_cm`, `png_yukseklik_cm`, `png_sekil`; Variant: `png_genislik_cm`, `png_yukseklik_cm` | Yeni alanlar; mevcut `genislik_cm/yukseklik_cm/sekil` değiştirilmedi |
| 2026-10-07 | `fileCreate` ×76 | Dosyalar bölümüne 76 şeffaf WebP (`kisisel-<anahtar>.webp`, 800 px) | Kaynak: commit a2ea42c, `veri/png/yukle/`. Ürün/varyant medyasına **bağlanmadı**. Kimlikler: `veri/png/dosya-idleri.json` ve aşağıdaki tablo |
| 2026-10-07 | `metafieldsSet` ×279 | 28 harf/rakam varyantı: `onizleme_png`, `png_genislik_cm`, `png_yukseklik_cm`; 49 ikon ürünü: aynıları + `png_sekil` (Beyaz Kalp yalnızca ölçü ve şekil) | Ölçü hesapları aşağıdaki "Patch PNG ölçüleri" tablosunda. Ürün/varyant görsellerine ve eski ölçü alanlarına dokunulmadı |
| 2026-10-07 | `themeFilesUpsert` (yalnızca kopya tema) | `assets/kisisel-editor.js`, `assets/kisisel-editor.css`, `snippets/kisisel-kart.liquid`, `snippets/kisisel-veri-patch.liquid` | Commit 9e70630, MD5 doğrulandı. PNG ölçü ve şekli (`png_*`) öncelikli, "İndirimler sepette uygulanır" notu |

## Metafield tanımları

Hepsi `kisisellestirme` namespace'inde, Storefront erişimi `PUBLIC_READ`.

| Sahip | Key | Tip | Doğrulama | Definition ID |
|---|---|---|---|---|
| Product | `harita` | json | | 1543637369118 |
| Product | `onizleme_gorseli` | file_reference | Image | 1543637401886 |
| Product | `aktif` | boolean | | 1543637434654 |
| Product | `tip` | single_line_text_field | letter, number, icon | 1543637467422 |
| Product | `set` | single_line_text_field | cool, piramit, rakam | 1543637500190 |
| Product | `genislik_cm` | number_decimal | | 1543637532958 |
| Product | `yukseklik_cm` | number_decimal | | 1543637565726 |
| Product | `sekil` | single_line_text_field | rect, circle | 1543637598494 |
| Product | `onizleme_png` | file_reference | Image | 1543637631262 |
| Variant | `karakter` | single_line_text_field | | 1543637664030 |
| Variant | `renk` | single_line_text_field | | 1543637696798 |
| Variant | `onizleme_png` | file_reference | Image | 1543637729566 |
| Product | `png_genislik_cm` | number_decimal | | 1543708672286 |
| Product | `png_yukseklik_cm` | number_decimal | | 1543708705054 |
| Product | `png_sekil` | single_line_text_field | | 1543708737822 |
| Variant | `png_genislik_cm` | number_decimal | | 1543708770590 |
| Variant | `png_yukseklik_cm` | number_decimal | | 1543708803358 |

## Patch PNG ölçüleri (2026-10-07)

Kurallar (kullanıcı kararı): harf ve rakamda yükseklik 6 cm, genişlik = 6 × PNG oranı. İkonlarda görselin en-boy oranı doğru kabul edilir; kayıttaki en büyük ölçü uzun kenardır, kısa kenar orandan hesaplanır. Daire şekli yalnızca PNG gerçekten yuvarlaksa (oran 1 ± 0,06) korunur; Tenis, Jimnastik ve Adventurer'da daire kaydı yok sayıldı. Kalplerin hesaplanan yüksekliği (~4,35 cm) kullanıcı onaylı.

| Patch | Sahip | Dosya | En × boy (cm) | Şekil | Hesap | Eski kayıt |
|---|---|---|---|---|---|---|
| Cool Alfabe B | Variant/49646792900894 | MediaImage/72562795774238 | 4,47 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.744 = 4.47 cm | boy 6 |
| Cool Alfabe C | Variant/49646792933662 | MediaImage/72562795807006 | 4,37 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.729 = 4.37 cm | boy 6 |
| Cool Alfabe E | Variant/49646792999198 | MediaImage/72562795839774 | 4,78 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.796 = 4.78 cm | boy 6 |
| Cool Alfabe F | Variant/49646793031966 | MediaImage/72562795872542 | 4,46 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.743 = 4.46 cm | boy 6 |
| Cool Alfabe G | Variant/49646793064734 | MediaImage/72562795905310 | 4,57 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.762 = 4.57 cm | boy 6 |
| Cool Alfabe I | Variant/49646793130270 | MediaImage/72562795938078 | 2,59 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.431 = 2.59 cm | boy 6 |
| Cool Alfabe J | Variant/49646793163038 | MediaImage/72562795970846 | 4,25 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.708 = 4.25 cm | boy 6 |
| Cool Alfabe K | Variant/49646793195806 | MediaImage/72562796003614 | 4,84 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.807 = 4.84 cm | boy 6 |
| Cool Alfabe M | Variant/49646793261342 | MediaImage/72562796036382 | 6,26 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 1.044 = 6.26 cm | boy 6 |
| Cool Alfabe N | Variant/49646793294110 | MediaImage/72562796069150 | 5,15 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.859 = 5.15 cm | boy 6 |
| Cool Alfabe O | Variant/49646793326878 | MediaImage/72562796101918 | 4,44 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.740 = 4.44 cm | boy 6 |
| Cool Alfabe P | Variant/49646793359646 | MediaImage/72562796134686 | 4,53 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.755 = 4.53 cm | boy 6 |
| Cool Alfabe Q | Variant/49646793392414 | MediaImage/72562796167454 | 4,55 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.758 = 4.55 cm | boy 6 |
| Cool Alfabe R | Variant/49646793425182 | MediaImage/72562796200222 | 4,74 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.790 = 4.74 cm | boy 6 |
| Cool Alfabe S | Variant/49646793457950 | MediaImage/72562796232990 | 3,95 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.659 = 3.95 cm | boy 6 |
| Cool Alfabe T | Variant/49646793490718 | MediaImage/72562796265758 | 4,95 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.825 = 4.95 cm | boy 6 |
| Cool Alfabe U | Variant/49646793523486 | MediaImage/72562796298526 | 5,05 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.842 = 5.05 cm | boy 6 |
| Cool Alfabe V | Variant/49646793556254 | MediaImage/72562796331294 | 4,72 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.787 = 4.72 cm | boy 6 |
| Cool Alfabe W | Variant/49646793589022 | MediaImage/72562796364062 | 7,45 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 1.241 = 7.45 cm | boy 6 |
| Cool Alfabe X | Variant/49646793621790 | MediaImage/72562796396830 | 4,53 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.755 = 4.53 cm | boy 6 |
| Cool Alfabe Y | Variant/49646793654558 | MediaImage/72562796429598 | 4,71 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.785 = 4.71 cm | boy 6 |
| Cool Alfabe Z | Variant/49646793687326 | MediaImage/72562796462366 | 4,48 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.747 = 4.48 cm | boy 6 |
| Janti Rakam 1 | Variant/49646797455646 | MediaImage/72562796495134 | 4,12 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.687 = 4.12 cm | boy 6 |
| Janti Rakam 2 | Variant/49646797488414 | MediaImage/72562796527902 | 5,21 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.868 = 5.21 cm | boy 6 |
| Janti Rakam 3 | Variant/49646797521182 | MediaImage/72562796560670 | 4,84 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.806 = 4.84 cm | boy 6 |
| Janti Rakam 5 | Variant/49646797586718 | MediaImage/72562796593438 | 4,9 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.816 = 4.9 cm | boy 6 |
| Janti Rakam 7 | Variant/49646797652254 | MediaImage/72562796626206 | 4,37 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.728 = 4.37 cm | boy 6 |
| Janti Rakam 8 | Variant/49646797685022 | MediaImage/72562796658974 | 4,9 × 6 | — | yükseklik 6 cm; genişlik = 6 × oran 0.817 = 4.9 cm | boy 6 |
| Futbol Sahası Patch | Product/9722984169758 | MediaImage/72562796691742 | 7,5 × 5,99 | rect | kayıttaki en büyük ölçü 7.5 cm = uzun kenar (en); boy = 7.5 / oran 1.252 = 5.99 cm | en 7,5, boy 6 (rect) |
| Basketbol Potası Patch | Product/9722984235294 | MediaImage/72562796724510 | 6 × 5,95 | circle | kayıttaki en büyük ölçü 6 cm = uzun kenar (en); boy = 6 / oran 1.008 = 5.95 cm | en 6, boy 6 (circle) |
| Voleybol Patch: Dream Big Play Hard | Product/9722984333598 | MediaImage/72562796757278 | 5,85 × 6 | circle | kayıttaki en büyük ölçü 6 cm = uzun kenar (boy); en = 6 × oran 0.975 = 5.85 cm | en 6, boy 6 (circle) |
| Tenis Patch | Product/9722984366366 | MediaImage/72562796790046 | 7 × 6,57 | rect | kayıttaki en büyük ölçü 7 cm = uzun kenar (en); boy = 7 / oran 1.065 = 6.57 cm; daire kaydı yok sayıldı (PNG yuvarlak değil) | en 7, boy 7 (circle) |
| Jimnastik Patch | Product/9722984431902 | MediaImage/72562796822814 | 7,03 × 8 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (boy); en = 8 × oran 0.879 = 7.03 cm; daire kaydı yok sayıldı (PNG yuvarlak değil) | en 8, boy 8 (circle) |
| I love swimming Patch | Product/9722984464670 | MediaImage/72562796855582 | 8,5 × 5,23 | rect | kayıttaki en büyük ölçü 8.5 cm = uzun kenar (en); boy = 8.5 / oran 1.626 = 5.23 cm | en 8,5, boy 5 (rect) |
| Sarı Kalp Patch | Product/9722984497438 | MediaImage/72562796888350 | 5 × 4,37 | rect | kayıttaki en büyük ölçü 5 cm = uzun kenar (en); boy = 5 / oran 1.144 = 4.37 cm | en 5 |
| Kırmızı Kalp Patch | Product/9722984562974 | MediaImage/72562796921118 | 5 × 4,36 | rect | kayıttaki en büyük ölçü 5 cm = uzun kenar (en); boy = 5 / oran 1.147 = 4.36 cm | en 5 |
| Lacivert Kalp Patch | Product/9722984595742 | MediaImage/72562796953886 | 5 × 4,34 | rect | kayıttaki en büyük ölçü 5 cm = uzun kenar (en); boy = 5 / oran 1.151 = 4.34 cm | en 5 |
| Beyaz Kalp Patch | Product/9722984628510 | — | 5 × 4,35 | rect | kayıttaki en büyük ölçü 5 cm = uzun kenar (en); boy = 5 / oran 1.149 = 4.35 cm | en 5 |
| Siyah Kalp Patch | Product/9722984694046 | MediaImage/72562796986654 | 5 × 4,35 | rect | kayıttaki en büyük ölçü 5 cm = uzun kenar (en); boy = 5 / oran 1.149 = 4.35 cm | en 5 |
| Oyun Sembolleri Patch | Product/9722984825118 | MediaImage/72562799411486 | 8 × 2,35 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 3.400 = 2.35 cm | en 8, boy 3,5 (rect) |
| Game Over / "Try Again" Patch | Product/9722984857886 | MediaImage/72562799444254 | 8 × 4,89 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.637 = 4.89 cm | en 8, boy 5 (rect) |
| Sevimli Köpek Patch | Product/9722984956190 | MediaImage/72562799477022 | 8 × 7,45 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.074 = 7.45 cm | en 7,5, boy 8 (rect) |
| Havalı Kedi Patch | Product/9722984988958 | MediaImage/72562799509790 | 7,3 × 7,5 | rect | kayıttaki en büyük ölçü 7.5 cm = uzun kenar (boy); en = 7.5 × oran 0.974 = 7.3 cm | en 7,5, boy 7,5 (rect) |
| Dog Person Patch | Product/9722985021726 | MediaImage/72562799542558 | 8 × 3,84 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 2.083 = 3.84 cm | en 8, boy 4 (rect) |
| Be Awesome Patch | Product/9722985087262 | MediaImage/72562799575326 | 7 × 6,96 | rect | kayıttaki en büyük ölçü 7 cm = uzun kenar (en); boy = 7 / oran 1.006 = 6.96 cm | en 7, boy 7 (rect) |
| Pullu Gülen Yüz Patch | Product/9722985120030 | MediaImage/72562799608094 | 6,5 × 6,45 | circle | kayıttaki en büyük ölçü 6.5 cm = uzun kenar (en); boy = 6.5 / oran 1.008 = 6.45 cm | en 6,5, boy 6,5 (circle) |
| Boncuklu Gülen Yüz Patch | Product/9722985152798 | MediaImage/72562799640862 | 6,42 × 6,5 | circle | kayıttaki en büyük ölçü 6.5 cm = uzun kenar (boy); en = 6.5 × oran 0.987 = 6.42 cm | en 6,5, boy 6,5 (circle) |
| Cool Patch | Product/9722985218334 | MediaImage/72562799673630 | 8 × 2,87 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 2.785 = 2.87 cm | en 8, boy 4 (rect) |
| Whatever Patch | Product/9722985251102 | MediaImage/72562799706398 | 8 × 4,73 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.692 = 4.73 cm | en 8, boy 5 (rect) |
| SIGMA Patch | Product/9722985316638 | MediaImage/72562799739166 | 8 × 5,07 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.577 = 5.07 cm | en 8, boy 5 (rect) |
| GIRLGANG Patch | Product/9722985349406 | MediaImage/72562799771934 | 8 × 5,33 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.501 = 5.33 cm | en 8, boy 5 (rect) |
| Leopar Gülen Yüz Patch | Product/9731553394974 | MediaImage/72562799804702 | 6,44 × 6,5 | circle | kayıttaki en büyük ölçü 6.5 cm = uzun kenar (boy); en = 6.5 × oran 0.990 = 6.44 cm | en 6,5, boy 6,5 (circle) |
| Kapibara | Product/9802933371166 | MediaImage/72562799837470 | 5,99 × 7,5 | rect | kayıttaki en büyük ölçü 7.5 cm = uzun kenar (boy); en = 7.5 × oran 0.798 = 5.99 cm | en 7,5 |
| Yıldız Patch | Product/9811337380126 | MediaImage/72562799870238 | 5,75 × 6 | circle | kayıttaki en büyük ölçü 6 cm = uzun kenar (boy); en = 6 × oran 0.958 = 5.75 cm | en 6, boy 6 (circle) |
| Dinozor Dino | Product/9941454684446 | MediaImage/72562799903006 | 6,35 × 9 | rect | kayıttaki en büyük ölçü 9 cm = uzun kenar (boy); en = 9 × oran 0.706 = 6.35 cm | en 6, boy 9 (rect) |
| Uzay Gemisi | Product/9941459304734 | MediaImage/72562799935774 | 7,82 × 10 | rect | kayıttaki en büyük ölçü 10 cm = uzun kenar (boy); en = 10 × oran 0.782 = 7.82 cm | en 7,5, boy 10 (rect) |
| Meteor | Product/9941460255006 | MediaImage/72562799968542 | 7,5 × 8,5 | rect | kayıttaki en büyük ölçü 8.5 cm = uzun kenar (boy); en = 8.5 × oran 0.883 = 7.5 cm | en 8,5 |
| Cool Flower | Product/9941463171358 | MediaImage/72562800001310 | 7 × 6,94 | rect | kayıttaki en büyük ölçü 7 cm = uzun kenar (en); boy = 7 / oran 1.009 = 6.94 cm | en 7, boy 7 (rect) |
| Kaykay | Product/9941464416542 | MediaImage/72562800034078 | 9 × 3,38 | rect | kayıttaki en büyük ölçü 9 cm = uzun kenar (en); boy = 9 / oran 2.665 = 3.38 cm | en 9, boy 3,5 (rect) |
| Octopus | Product/10094211989790 | MediaImage/72562800066846 | 8 × 7,8 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.026 = 7.8 cm | en 8, boy 7 (rect) |
| Aksolotl | Product/10094213628190 | MediaImage/72562800099614 | 8 × 5,97 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.340 = 5.97 cm | en 5, boy 8 (rect) |
| Kurbağa | Product/10125934657822 | MediaImage/72562800132382 | 8,5 × 6,87 | rect | kayıttaki en büyük ölçü 8.5 cm = uzun kenar (en); boy = 8.5 / oran 1.237 = 6.87 cm | en 8,5, boy 7 (rect) |
| Donut Planet | Product/15870357405982 | MediaImage/72562800165150 | 8,5 × 5,91 | rect | kayıttaki en büyük ölçü 8.5 cm = uzun kenar (en); boy = 8.5 / oran 1.439 = 5.91 cm | en 8,5, boy 4,5 (rect) |
| Doing My Best | Product/15870367236382 | MediaImage/72562800197918 | 8,5 × 7,41 | rect | kayıttaki en büyük ölçü 8.5 cm = uzun kenar (en); boy = 8.5 / oran 1.147 = 7.41 cm | en 8,5, boy 8,5 (rect) |
| Good Luck | Product/15870380048670 | MediaImage/72562800230686 | 7,22 × 8 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (boy); en = 8 × oran 0.903 = 7.22 cm | en 5, boy 8 (rect) |
| Volleyball Love | Product/15870392205598 | MediaImage/72562800263454 | 5,65 × 6 | circle | kayıttaki en büyük ölçü 6 cm = uzun kenar (boy); en = 6 × oran 0.942 = 5.65 cm | en 6, boy 6 (circle) |
| Musical Note | Product/15870428905758 | MediaImage/72562800296222 | 5,04 × 6 | rect | kayıttaki en büyük ölçü 6 cm = uzun kenar (boy); en = 6 × oran 0.841 = 5.04 cm | en 6, boy 5 (rect) |
| Retro Casette Player | Product/15870463574302 | MediaImage/72562800328990 | 8 × 7,45 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.074 = 7.45 cm | en 8, boy 5 (rect) |
| Manifest It:Pink | Product/15870465638686 | MediaImage/72562800361758 | 7,5 × 6,63 | rect | kayıttaki en büyük ölçü 7.5 cm = uzun kenar (en); boy = 7.5 / oran 1.131 = 6.63 cm | en 7,5, boy 7,5 (rect) |
| Eggcellent | Product/15870514397470 | MediaImage/72562800394526 | 7,5 × 6,33 | rect | kayıttaki en büyük ölçü 7.5 cm = uzun kenar (en); boy = 7.5 / oran 1.185 = 6.33 cm | en 7, boy 7,5 (rect) |
| Always Curious | Product/15870516068638 | MediaImage/72562800427294 | 8 × 5,85 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (en); boy = 8 / oran 1.367 = 5.85 cm | en 8, boy 6 (rect) |
| Too Cool for School | Product/15870517149982 | MediaImage/72562800460062 | 5,47 × 8 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (boy); en = 8 × oran 0.684 = 5.47 cm | en 8, boy 6 (rect) |
| Drama and Theatre | Product/15870519181598 | MediaImage/72562800492830 | 5,75 × 6 | circle | kayıttaki en büyük ölçü 6 cm = uzun kenar (boy); en = 6 × oran 0.959 = 5.75 cm | en 6, boy 6 (circle) |
| Roller Skate | Product/15870520164638 | MediaImage/72562800525598 | 7,72 × 8 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (boy); en = 8 × oran 0.965 = 7.72 cm | en 8, boy 6 (rect) |
| School Rocks | Product/15870555848990 | MediaImage/72562800558366 | 7,41 × 8 | rect | kayıttaki en büyük ölçü 8 cm = uzun kenar (boy); en = 8 × oran 0.927 = 7.41 cm | en 8, boy 6 (rect) |
| Adventurer | Product/15870556733726 | MediaImage/72562800591134 | 5,05 × 6 | rect | kayıttaki en büyük ölçü 6 cm = uzun kenar (boy); en = 6 × oran 0.841 = 5.05 cm; daire kaydı yok sayıldı (PNG yuvarlak değil) | en 6, boy 6 (circle) |
| Keep Swimming | Product/15870557847838 | MediaImage/72562800623902 | 5,94 × 6 | circle | kayıttaki en büyük ölçü 6 cm = uzun kenar (boy); en = 6 × oran 0.990 = 5.94 cm | en 6, boy 6 (circle) |

Bekleyenler (yüklenmedi, eski görselle kalıyor):

- Cool Alfabe A: Photoroom bekleniyor
- Cool Alfabe D: Photoroom bekleniyor
- Cool Alfabe H: Photoroom bekleniyor
- Cool Alfabe L: Photoroom bekleniyor
- Janti Rakam 0: İç boşluk yeniden işlendi, onay bekliyor
- Janti Rakam 4: İç boşluk yeniden işlendi, onay bekliyor
- Janti Rakam 6: İç boşluk yeniden işlendi, onay bekliyor
- Janti Rakam 9: İç boşluk yeniden işlendi, onay bekliyor
- Futbol Topu Patch: Karar bekleniyor (Futbol Topu)
- Basketbol Topu Patch: Karar bekleniyor (Basketbol Topu)
- Beyaz Kalp Patch: Karar bekleniyor (Beyaz Kalp) (ölçüsü yazıldı)
- GOAT Patch: Karar bekleniyor (GOAT)
