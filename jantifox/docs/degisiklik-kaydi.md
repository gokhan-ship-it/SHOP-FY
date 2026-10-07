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
