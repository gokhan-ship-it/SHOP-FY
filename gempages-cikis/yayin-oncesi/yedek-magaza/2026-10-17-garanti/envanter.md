# Garanti / "Ömür Boyu" ifade envanteri — 2026-10-17

Kaynak: Shopify Admin GraphQL, salt okunur. Mağaza: Text To Next (52ae29-e0.myshopify.com). Yedekler: `urunler.json`, `koleksiyonlar.json`, `sayfalar.json`; birebir ham yanıtlar `ham/`.

**Sayımlar:** ürün 81 (ACTIVE 65, DRAFT 9, ARCHIVED 1, UNLISTED 6); koleksiyon 17; sayfa 34 (28 yayında); medya 614.

**Desen eşleşmeleri:** süresiz: 17, ömür boyu: 30, garanti: 42. "ömürboyu", "lifetime", "sınırsız garanti": 0 eşleşme. HTML attribute içinde eşleşme: 0. `&nbsp;` hiçbir üründe yok.

Normalizasyon: Turkce: replace('İ','i').replace('I','ı').lower(); ayrica duz .lower() (I->i) ile ikinci gecis; &nbsp;/U+00A0 -> bosluk; HTML etiketleri soyulmus metinde arama (blok etiketleri satir sonu, inline etiketler bos), eslesme ham HTML ofsetine geri eslenir. raw_span = ham HTML'de eslesmenin ilk-son karakteri arasi (aradaki etiketler dahil).

Tablolarda `raw_span` = eşleşen ifadenin ham hali; `ham satır` = eşleşmeyi içeren satırın ham HTML'i (önceki ve sonraki blok/`<br>` etiketi arasında, etiketler hariç; sınır etiketleri ayrıca verildi). `\n` gerçek satır sonudur.


## ömür boyu

| raw_span | tür / alan | adet | ham satır (önceki → sonraki sınır) | nesneler |
|---|---|---|---|---|
| `Ömür boyu garantilidir` | product / descriptionHtml | 10 | `<span role="text"><strong>316L Çelik:</strong> <strong>Kararmaz</strong> ve <strong>paslanmaz</strong>. <strong>Ömür boyu garantilidir.</strong></span>`<br>önce: `<p>` / sonra: `</p>` | diamond-vantablack-zaman-kapsulu-erkek-kolye (ACTIVE), full-tasli-kapsul-zaman-kapsulu-kolye (ACTIVE), lumin-zaman-kapsulu-kolye (ACTIVE), zaman-kapsulu-charm-beyaz (ACTIVE), zaman-kapsulu-charm-eight-stars-white-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-charm-infinity-glow-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-full-tasli-white (ACTIVE), zaman-kapsulu-kolye-aurora-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-kolye-lumin-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-kolye-vantablack-925-ayar-gumus-couple (ACTIVE) |
| `Ömür Boyu Garantili` | product / descriptionHtml | 17 | `<span role="text"><strong>Ömür Boyu Garantili: </strong>316L çelik <strong>kararmaz</strong> ve <strong>paslanmaz</strong>.`<br>önce: `<p>` / sonra: `<br>` | astor-zaman-kapsulu-bileklik-kopya (ACTIVE), auron-zaman-kapsulu-bileklik (ACTIVE), auron-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-couple (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-couple-1 (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-kopya (ACTIVE), luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya (ACTIVE), noir-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), nora-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), nova-zaman-kapsulu-bileklik-couple-316l-paslanmaz-celik (ACTIVE), nova-zaman-kapsulu-bileklik316l-paslanmaz-celik (ACTIVE), santorin-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya (ACTIVE), vera-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-kopya (ACTIVE), zaman-kapsulu-bileklik-kopya (ACTIVE) |
| `Ömür Boyu Garantili` | product / descriptionHtml | 2 | `Ömür Boyu Garantili: 316L çelik kararmaz ve paslanmaz.`<br>önce: `<br>` / sonra: `<br>` | santorin-couple (ACTIVE), santorin-gold-couple (ACTIVE) |
| `Ömür Boyu Garantili` | collection / title | 1 | `Ömür Boyu Garantili Çelik Zaman Kapsülleri` | omur-boyu-garantili-celik-zaman-kapsulleri (-) |

## lifetime

Eşleşme yok.


## sınırsız garanti

Eşleşme yok.


## süresiz

| raw_span | tür / alan | adet | ham satır (önceki → sonraki sınır) | nesneler |
|---|---|---|---|---|
| `süresiz görüntüleyebilirsiniz` | product / seo.description | 13 | cümle: `Tarih geldiğinde sen ve hediye ettiğin kişi içerikleri süresiz görüntüleyebilirsiniz.` | kral-classic-ocean-blue-couple-zaman-kapsulu-kisi-2399-kopya (ACTIVE), kral-infinity-charm-couple-zaman-kapsulu-kisi-2519-kopya (ACTIVE), lumin-charm (ACTIVE), luna-aurora-couple-zaman-kapsulu-kopya (ACTIVE), luna-infinity-charm-couple-zaman-kapsulu-kisi-2279-kopya (ACTIVE), nora-vera-couple-zaman-kapsulu-kisi-1759-kopya (ACTIVE), nora-vera-couple-zaman-kapsulu-kopya (ACTIVE), rose-pink-nova-couple-zaman-kapsulu (DRAFT), vantablack-tasli-kilit-couple-zaman-kapsulu-kisi-2639-kopya (ACTIVE), vantablack-vera-couple-zaman-kapsulu-kisi-2199-kopya (ACTIVE), zaman-kapsul-kolye (ACTIVE), zaman-kapsulu-kolye-classic-white-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-kolye-classic-white-925-ayar-gumus-couple-kopya (ACTIVE) |
| `süresiz çip` | product / media.alt | 1 | `Rose Pink + Nova Couple Zaman Kapsülü – Couple set – süresiz çip garantisi` | rose-pink-nova-couple-zaman-kapsulu (DRAFT) |
| `süresiz garanti` | page / body | 1 | `8.2. Ürün içindeki çip için süresiz garanti verilir; çipin çalışmaması halinde Satıcı çipi ücretsiz değiştirir.`<br>önce: `<p>` / sonra: `</p>` | mesafeli-satis-sozlesmesi (published) |
| `süresiz garanti` | page / body | 1 | `Üretim hatası olan ürünlerde, kapsül oluşturulmuş olsa bile, teslimden itibaren 2 yıl boyunca yasal hakların geçerlidir: ücretsiz onarım, değişim, bedel indirimi veya iade isteyebilirsin. Çip için süresiz garanti veriyoruz; çip çalışmazsa ücretsiz değiştiriyoruz.`<br>önce: `<p>` / sonra: `</p>` | i̇ade-kosullari (published) |
| `süresiz garanti` | page / body | 1 | `Text To Next, hizmetin sürekli ve güvenli çalışması için makul özeni gösterir. Planlı bakım, internet altyapısı sorunları ve mücbir sebepler nedeniyle geçici kesintiler yaşanabilir. Çip arızaları süresiz garanti kapsamında ücretsiz giderilir.`<br>önce: `<p>` / sonra: `</p>` | uygulama-kullanim-kosullari (published) |

## garanti

| raw_span | tür / alan | adet | ham satır (önceki → sonraki sınır) | nesneler |
|---|---|---|---|---|
| `garantilidir` <br>_(parçası: ömür boyu: Ömür boyu garantilidir)_ | product / descriptionHtml | 10 | `<span role="text"><strong>316L Çelik:</strong> <strong>Kararmaz</strong> ve <strong>paslanmaz</strong>. <strong>Ömür boyu garantilidir.</strong></span>`<br>önce: `<p>` / sonra: `</p>` | diamond-vantablack-zaman-kapsulu-erkek-kolye (ACTIVE), full-tasli-kapsul-zaman-kapsulu-kolye (ACTIVE), lumin-zaman-kapsulu-kolye (ACTIVE), zaman-kapsulu-charm-beyaz (ACTIVE), zaman-kapsulu-charm-eight-stars-white-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-charm-infinity-glow-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-full-tasli-white (ACTIVE), zaman-kapsulu-kolye-aurora-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-kolye-lumin-925-ayar-gumus-couple (ACTIVE), zaman-kapsulu-kolye-vantablack-925-ayar-gumus-couple (ACTIVE) |
| `Garantili` <br>_(parçası: ömür boyu: Ömür Boyu Garantili)_ | product / descriptionHtml | 17 | `<span role="text"><strong>Ömür Boyu Garantili: </strong>316L çelik <strong>kararmaz</strong> ve <strong>paslanmaz</strong>.`<br>önce: `<p>` / sonra: `<br>` | astor-zaman-kapsulu-bileklik-kopya (ACTIVE), auron-zaman-kapsulu-bileklik (ACTIVE), auron-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-couple (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-couple-1 (ACTIVE), chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-kopya (ACTIVE), luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya (ACTIVE), noir-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), nora-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple (ACTIVE), nova-zaman-kapsulu-bileklik-couple-316l-paslanmaz-celik (ACTIVE), nova-zaman-kapsulu-bileklik316l-paslanmaz-celik (ACTIVE), santorin-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya (ACTIVE), vera-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-kopya (ACTIVE), zaman-kapsulu-bileklik-kopya (ACTIVE) |
| `Garantili` <br>_(parçası: ömür boyu: Ömür Boyu Garantili)_ | product / descriptionHtml | 2 | `Ömür Boyu Garantili: 316L çelik kararmaz ve paslanmaz.`<br>önce: `<br>` / sonra: `<br>` | santorin-couple (ACTIVE), santorin-gold-couple (ACTIVE) |
| `Garantili` <br>_(parçası: ömür boyu: Ömür Boyu Garantili)_ | collection / title | 1 | `Ömür Boyu Garantili Çelik Zaman Kapsülleri` | omur-boyu-garantili-celik-zaman-kapsulleri (-) |
| `garantili` | product / descriptionHtml | 5 | `✔ Kararmaya karşı garantili`<br>önce: `<div>` / sonra: `</div>` | luna-aurora-couple-zaman-kapsulu-kopya (ACTIVE), luna-infinity-charm-couple-zaman-kapsulu-kisi-2279-kopya (ACTIVE), nora-vera-couple-zaman-kapsulu-kopya (ACTIVE), rose-pink-nova-couple-zaman-kapsulu (DRAFT), white-luna-couple-zaman-kapsulu (ACTIVE) |
| `garantisi` | product / media.alt | 1 | `Rose Pink + Nova Couple Zaman Kapsülü – Couple set – süresiz çip garantisi` | rose-pink-nova-couple-zaman-kapsulu (DRAFT) |
| `Garanti` | page / body | 1 | `<strong>Madde 8 – Ayıplı Ürün ve Garanti</strong>`<br>önce: `<p>` / sonra: `</p>` | mesafeli-satis-sozlesmesi (published) |
| `garanti` <br>_(parçası: süresiz: süresiz garanti)_ | page / body | 1 | `8.2. Ürün içindeki çip için süresiz garanti verilir; çipin çalışmaması halinde Satıcı çipi ücretsiz değiştirir.`<br>önce: `<p>` / sonra: `</p>` | mesafeli-satis-sozlesmesi (published) |
| `garanti` | page / body | 1 | `8.4. Kopma, kırılma, yamulma, ezilme, çizilme ve benzeri kullanıcı kaynaklı hasarlar garanti kapsamı dışındadır. Üretim hatasından kaynaklanan durumlarda Alıcının 8.1'deki yasal hakları saklıdır.`<br>önce: `<p>` / sonra: `</p>` | mesafeli-satis-sozlesmesi (published) |
| `garanti` <br>_(parçası: süresiz: süresiz garanti)_ | page / body | 1 | `Üretim hatası olan ürünlerde, kapsül oluşturulmuş olsa bile, teslimden itibaren 2 yıl boyunca yasal hakların geçerlidir: ücretsiz onarım, değişim, bedel indirimi veya iade isteyebilirsin. Çip için süresiz garanti veriyoruz; çip çalışmazsa ücretsiz değiştiriyoruz.`<br>önce: `<p>` / sonra: `</p>` | i̇ade-kosullari (published) |
| `garanti` | page / body | 1 | `Gümüş ürünlerde ve gümüş charm/uç parçalarında zamanla oluşan kararma metalin doğal özelliğidir, kusur sayılmaz. Kopma, kırılma, yamulma, ezilme ve çizilme gibi kullanım kaynaklı hasarlar garanti kapsamı dışındadır.`<br>önce: `<p>` / sonra: `</p>` | i̇ade-kosullari (published) |
| `garanti` <br>_(parçası: süresiz: süresiz garanti)_ | page / body | 1 | `Text To Next, hizmetin sürekli ve güvenli çalışması için makul özeni gösterir. Planlı bakım, internet altyapısı sorunları ve mücbir sebepler nedeniyle geçici kesintiler yaşanabilir. Çip arızaları süresiz garanti kapsamında ücretsiz giderilir.`<br>önce: `<p>` / sonra: `</p>` | uygulama-kullanim-kosullari (published) |

## "garanti" içeren tüm cümleler (etiketsiz)

| adet | tür / alan | cümle |
|---|---|---|
| 10 | product / descriptionHtml | Ömür boyu garantilidir. |
| 19 | product / descriptionHtml | Ömür Boyu Garantili: 316L çelik kararmaz ve paslanmaz. |
| 5 | product / descriptionHtml | ✔ Kararmaya karşı garantili |
| 1 | product / media.alt | Rose Pink + Nova Couple Zaman Kapsülü – Couple set – süresiz çip garantisi |
| 1 | collection / title | Ömür Boyu Garantili Çelik Zaman Kapsülleri |
| 1 | page / body | Madde 8 – Ayıplı Ürün ve Garanti |
| 1 | page / body | 8.2. Ürün içindeki çip için süresiz garanti verilir; çipin çalışmaması halinde Satıcı çipi ücretsiz değiştirir. |
| 1 | page / body | 8.4. Kopma, kırılma, yamulma, ezilme, çizilme ve benzeri kullanıcı kaynaklı hasarlar garanti kapsamı dışındadır. |
| 1 | page / body | Çip için süresiz garanti veriyoruz; çip çalışmazsa ücretsiz değiştiriyoruz. |
| 1 | page / body | Kopma, kırılma, yamulma, ezilme ve çizilme gibi kullanım kaynaklı hasarlar garanti kapsamı dışındadır. |
| 1 | page / body | Çip arızaları süresiz garanti kapsamında ücretsiz giderilir. |

## Ek notlar

- collection `omur-boyu-garantili-celik-zaman-kapsulleri` **handle** içinde ASCII `omur-boyu` ([fold] omur boyu). Handle değişirse URL değişir; yönlendirme gerekir.
- collection `omur-boyu-garantili-celik-zaman-kapsulleri` **handle** içinde ASCII `garanti` ([fold] garanti). Handle değişirse URL değişir; yönlendirme gerekir.
- Her nesnenin tam kaydı (id, handle, status, field, raw_span, raw_context ≈120 karakter, sentence, raw_offset) `envanter.json` → `hits` içinde.
