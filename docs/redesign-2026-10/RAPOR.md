# Text To Next — Yeni tasarım dili: uygulama raporu

**Tema:** yalnızca "Redesign - 2026-10" (ID 189109076288, UNPUBLISHED)
**Önizleme:** https://texttonext.com/?preview_theme_id=189109076288
**Repo dalı:** `claude/new-session-uhmgke` (gokhan-ship-it/SHOP-FY)

Canlı temaya ("Calisma taslagi - 2026-10-05", ID 188825207104) hiçbir dosya yüklenmedi. Hiçbir tema yayına alınmadı. Canlı `layout/theme.liquid` hâlâ 2026-10-05 tarihli haliyle duruyor (MD5 55364c36…). Tüm yüklemeler Admin API `themeFilesUpsert` ile ve yalnızca 189109076288'e yapıldı. Her yüklemeden sonra temadaki `checksumMd5` değeri repodaki dosyayla karşılaştırıldı.

**Geri alma:** `layout/theme.liquid` içindeki tek satırı (`{%- render 'tt-tasarim-dili' -%}`, `</head>`'den hemen önce) silmek tüm CSS katmanını kaldırır. Adım 6'daki metin değişiklikleri ayrıdır. Bu katmanla geri alınmaz. Eski metinlerin tamamı aşağıdaki listede ve repoda `Adim 6a` commit'inde duruyor.

---

## 1. Adımlar ve commit'ler

| Adım | Commit | Ne yapıldı | Temaya yüklenen (MD5 doğrulandı) |
|---|---|---|---|
| 0 | `928402f` | Repodaki `layout/theme.liquid` kopya temadaki haliyle eşitlendi (repo eskiydi; temaya bir şey yüklenmedi) | — |
| 1 | `3140a4d` | `--ttd-*` token'ları, `snippets/tt-tasarim-dili.liquid` ve theme.liquid'e tek satırlık çağrı | theme.liquid `80d5227a`, snippet |
| 2 | `533c009` | Tipografi: tek aile Inter, yalnızca 400/500, akışkan ölçek, büyük harf yok | snippet |
| 3 | `dfab41a` | Renk: Apple mavisi kalktı, Leica kırmızısı yalnızca yıldızlar ve koyu bölümdeki ana butonlarda, çark siyah-beyaz | snippet |
| 4 | `62dea62` | Butonlar ve çipler: 13 farklı stil ana/ikincil olmak üzere ikiye indi, `--tt-btn-*` eşitlendi | snippet |
| 5 | `1d803a0` | Kartlar, rozetler, köşeler, bölüm ritmi 96/160, mobil kenar 16 | snippet |
| 6a | `d3ed513` | Değişiklik öncesi referans: kopya temadaki 15 JSON dosyası olduğu gibi repoya alındı (temaya yükleme yok) | — |
| 6 | `5596c39` | Metin düzeltmeleri: 13 dosyada 120 metin değeri | 13 JSON dosyası |
| 8 | `695df33` | Görsel testten çıkan düzeltmeler: hero vurgu rengi, taksit linki dolgusu, Quickview ikon butonları | snippet |
| 8 | `cf2b1b6` | Kontrast: guclu-header üst etiketi 3.62:1 → 5.33:1 | snippet |
| 8 | `00a23a0` | "Nasıl çalışır?" paneli: renkler doğrudan öğelere yazıldı (Adım 3'teki değişken bloğu etkisizdi) | snippet `d746c091` (son hali) |

Adım 7 uygulanmadı. Öneriler 5. bölümde, onayını bekliyor.

## 2. Değişen dosyalar (kopya temada)

| Dosya | Değişiklik |
|---|---|
| `layout/theme.liquid` | Yalnızca 1 satır eklendi: `{%- render 'tt-tasarim-dili' -%}` (tüm stil dosyalarından ve `js-variables`'tan sonra, `</head>`'den hemen önce) |
| `snippets/tt-tasarim-dili.liquid` | YENİ. Tüm CSS katmanı (`<style id="tt-tasarim-dili">`, yaklaşık 51 KB). İçinde Liquid etiketi yok |
| `templates/index.json` | 7 metin |
| `templates/page.couple-daha-fazla-bilgial.json` | 30 metin |
| `templates/page.hediye-daha-fazla-bilgial.json` | 22 metin |
| `templates/page.event-daha-fazla-bilgial.json` | 6 metin |
| `templates/product.zaman-kapsulu.json` | 12 metin (Lumin bu şablonu kullanıyor) |
| `templates/product.couple.json`, `product.zaman-kapsulu-couple.json` | 11'er metin |
| `templates/product.json` | 3 metin |
| `templates/collection.zaman-kapsulu-kolyeler.json`, `collection.celik-kolyeler.json` | 5'er metin |
| `templates/collection.zaman-kapsulu-bileklik.json` | 4 metin |
| `templates/collection.couple-urunler.json` | 3 metin |
| `sections/tt-nasil-calisir-grup.json` | 1 metin |

Hiçbir `.js`, section `.liquid` dosyası veya asset değişmedi. Hiçbir class, id veya `data-` özniteliği değişmedi.

JSON dosyalarında yalnızca string ayar değerleri değişti. Değişiklik ham metin üzerinde yerinde yapıldı, dolayısıyla Shopify'ın sakladığı biçim de korundu: sıkıştırılmış/girintili yapı, `\/` kaçışları, anahtar sırası. Her dosya için eski ve yeni JSON ayrıştırılıp karşılaştırıldı. Anahtar kümesi birebir aynı, değişen yollar yalnızca listedeki metinler. Kapalı (`disabled`) section'lara ve `name`/`type` alanlarına dokunulmadı.

## 3. Kural denetimi

**Yasak özellikler.** Derleme betiği (`derle.py`) her derlemede katmanı tarar. `transition`, `transform`, `animation`, `opacity`, `position`, `top/left/right/bottom`, `inset`, `display`, `visibility`, `z-index` veya `overflow` içeren bir kural varsa derlemeyi durdurur. Son katmanda bunların hiçbiri yok. Aynı şey tarayıcıda da ölçüldü (8.3): 7 sayfa × 2 cihazda tüm öğelerin transition/animation/position/display/visibility/z-index/overflow hesaplanmış değerleri katmanlı ve katmansız durumda aynı DOM üzerinde karşılaştırıldı ve **0 fark** çıktı.

**Özgüllük.** Kurallar `html:not(#ttd):not(#ttd-2) body` önekiyle yazıldı. Bu önek iki ID ağırlığı verir ve `#shopify-section-…` ile yazılmış tek ID'li section kurallarını `!important` olmadan geçer. `#ttd` diye bir öğe yok; önek sayfadaki hiçbir id'ye bağlı değil.

**`!important` kullanılan yerler (9 bildirim, 3 kural).** Üçünde de renk section ayarından satır içi `style=""` ile geliyor. Satır içi stil hiçbir özgüllükle ezilemiyor.

| Satır (snippet) | Seçici | Bildirimler | Neden |
|---|---|---|---|
| 503–504 | `.ay-kart` (adim-yigin) | `background`, `--ay-panel` | Kart zemini `style=""` ile geliyor |
| 507 | `.ay-kmetin` (adim-yigin) | `color` | Metin rengi `style=""` ile geliyor |
| 620 | `.ak-ikon` (avantaj-kartlari) | `color` | İkon rengi `style=""` ile geliyor |
| 828–832 | `.ttn-cark` | `--ttn-kart-zemin`, `--ttn-vurgu`, `--ttn-koyu`, `--ttn-alt-yazi`, `--ttn-halka` | Çarkın nane renkleri `style=""` değişkenleriyle geliyor |

"Nasıl çalışır?" panelinde de aynı durum vardı (17 değişken satır içinde). Orada `!important` yerine renkleri doğrudan öğelere yazdım, böylece sayı artmadı.

**Korunanlar** (renk kurallarının hiçbiri bu seçicilere uygulanmıyor):
- Gradient yazılar: `.gh-vurgu`, `.ay-vurgu`, `.as-bas-vurgu`, `.cb-bas-vurgu`, `.cb-ipucu` ve adım rozetleri `.ay-no`. Ölçüm (8.4): sayfalardaki 14 `background-clip:text` öğesinin (couple 5, hediye 2; mobil ve masaüstü) gradient'leri katmanlı ve katmansız birebir aynı.
- İndirim yeşili `#1A7F37 / #EDF7F0`: `tt_serit_*`, `tt-fb-serit`, `tt-kol-serit`, kart "yeni" etiketi, taksit modalı rozeti.
- Mozaik ve apple-slayt görsel karartma gradient'leri.
- `ui-monospace`: couple-bulusma ve taksit-tablosu.

## 4. Bilinçli kararlar ve spesifikasyondan sapmalar

1. **Başlık barı "Satın Al" (`.tth-cta`) 40px.** Bar 52/56px yüksekliğinde, 48px'lik buton sığmıyor. Renk, köşe ve yazı sisteme uygun.
2. **Küçük ikincil butonlar 36px.** `.tt-fb-link` ("Taksit tablosu", spesifikasyonda izin verilmişti) ve aynı mantıkla cihaz uyumluluğu butonu (`dcb-btn`).
3. **"Hızlı Bakış" (`.quick-view__button`) ve ürün kartı ikon butonları.** Görselin üstünde durdukları için beyaz zemin korundu. Sabit genişlikli ikon butonları (`aria-controls="Quickview-…"`) ortak buton ölçüsünden çıkarıldı; aksi halde 24px yatay dolgu ikonu 0px'e sıkıştırıyordu (görsel testte bulundu).
4. **`.gh-cam` ("Ürünü Öğren").** Cam/blur zemini (`rgba(255,255,255,.72)`) korundu. Kenarlık ve yazı mürekkep, ölçü 48px / 999px.
5. **Koleksiyon hero'su vurgu kelimesi.** "sadece" ve ticker'daki "Kapsül kalır" ilk uygulamada beyaza dönmüş, vurgu tamamen kaybolmuştu. Bunları hediye yeşili ailesindeki orijinal `#9FD4BD` ile bıraktım. Kırmızı burada kullanılamaz, mürekkep de koyu zeminde görünmez. İstersen `--ttd-koyu-metin` yapılabilir; o zaman vurgu kalmaz.
6. **"Nasıl çalışır?" karşılaştırma katmanındaki "Alışverişe devam et".** Apple mavisi bu butonda `var(--tt-catal-cta, #0071e3)` yedek değerinden geliyordu. Koyu katmanda ikincil stile aldım, çünkü bölümün ana butonu Couple CTA'sı ve koyu bölümde tek kırmızı kuralı var.
7. **Hediye ömrü.** "Bitti" durumundaki satır `--ttd-soluk`. Çarkta kazanan dilim `--ttd-soluk`, dilimler sırayla mürekkep ve beyaz.
8. **apple-slayt.** Bölüm koyu kaldı (ilk denemede açığa dönmüştü, `zemin.js` ile yakalandı).
9. **guclu-header başlığı.** Mobilde `nowrap` + `min(33px, 6vw)` kullanıyordu. 34px'lik yeni ölçekte taşmasın diye satır kırmaya (`text-wrap: balance`) izin verildi.
10. **Ürün kartı üst etiketi (`.tt-cs-ust`).** 13px'te kesiliyordu, satır kaydırmaya izin verildi.
11. **Bölüm ritmi.** 96/160px boşluk nedeniyle sayfalar uzadı. Masaüstünde birkaç section 900px'i aştı. Ekran görüntülerine etkisi 8.1'de anlatılıyor.
12. **Metinlerde dokunulmayanlar.** Ürün ve marka adları (Couple Zaman Kapsülü, Zaman Kapsülünü…, Lumin, Aurora vb.), gh-etiket ürün adları ve "Ayşe & Mert" olduğu gibi kaldı. "imkansız-dı" (event hero) yazımı bilinçli olabileceği için yalnızca sondaki nokta kaldırıldı.

## 5. Adım 7: yapısal öneriler (UYGULANMADI, onayını bekliyor)

### 7.1 Ana sayfada üst üste iki `tt_baslik`
**Durum.** `tt-anasayfa-cubuk` grubundaki `tt_baslik_anasayfa` ve `index.json` içindeki `tt_baslik_UCkzwT` ikisi de `position: fixed; top: 0` ile render ediliyor. Görünen ve tıklanan, şablondaki ikincisi. Alttakinin hamburger düğmesine hiçbir zaman tıklanamıyor: masaüstünde üstteki barın `<i>` öğesi onu tamamen örtüyor (canlı temada da aynı). Test sırasında Playwright bu yüzden hata verdi. Kullanıcı için menü çalışıyor, çünkü üstteki barın hamburgeri açıyor.
**Öneri.** `index.json` içindeki `tt_baslik_UCkzwT` section'ına `"disabled": true` ekle. Ana sayfa grubu kalır; ürün ve koleksiyon da aynı grup mantığını kullanıyor.
**Etki.** Yalnızca ana sayfa, tek JSON satırı. Önce iki barın ayarlarını karşılaştırırım (menü bağlantıları, CTA metni). Farklıysa kalan bara taşırım ve bunu ayrıca bildiririm.

### 7.2 Event, Hediye Ürünleri Gör ve Sepet'te `tt_baslik`
**Durum.** Bu üç sayfada Concept'in beyaz `header` section'ı ve `menu-drawer` görünüyor. Diğer sayfalarda koyu `tt_baslik` ve tam ekran siyah menü var.
**Öneri.** `page.event-daha-fazla-bilgial.json`, `page.hediye-urunleri-gor.json` ve `cart.json` şablonlarına mevcut `tt-baslik` section'ını ekle; ayarları koleksiyon sayfasındaki `tt_baslik_DEtq8H`'den kopyalanır. Concept header'ı diğer sayfalarda nasıl gizleniyorsa (`tt-baslik.liquid` kendi CSS'iyle) burada da aynı mekanizmayla gizlenir. Yeni kod yazılmaz.
**Etki.** 3 şablona birer section eklenir ve section sırası değişir. Sepet sayfasında Concept header'ın sepet sayacı yerine `tth-sepet` kullanılır; ikisi aynı `CartDrawer`'ı açıyor. Test: menü, arama, sepet ikonu, sticky davranış.

### 7.3 Footer
**Durum.** `footer-group.json` içinde `footer` ve `footer-copyright` kapalı, `footer` section'ında hiç blok yok. Her sayfada son section bülten.
**Öneri.**
- `footer` section'ını aç ve iki link listesi bloğu ekle.
- "Kapsüller" bloğu için mağazada uygun bir menü yok. Ana Menü'de Couple, Kadın, Erkek, Etkinlik ve ayrıca İletişim var. Yeni bir **"Kapsüller" menüsü oluşturmak gerekiyor** (Couple → /collections/couple-urunler, Kadın → /collections/zaman-kapsulu-kolyeler, Erkek → /collections/zaman-kapsulu-bileklik, Etkinlik → /pages/event-daha-fazla-bilgi-al). Bu, mağazanın Navigasyon verisinde bir değişiklik; ayrıca onayını isterim.
- "Destek" için de yeni bir menü gerekiyor (Kullanım kılavuzu, Kargo, İade koşulları, İletişim). Mevcut "Footer menu"de Mesafeli Satış Sözleşmesi, İade Koşulları, İletişim ve Gizlilik Sözleşmesi var. Kullanım kılavuzu ve Kargo sayfalarının adreslerini senden almam gerekiyor. Mevcut footer menüsü olduğu gibi kalabilir.
- `footer-copyright` açılır, metin "© 2026 Text To Next".
- Görünüm `tt-tasarim-dili` katmanından gelir: zemin `--ttd-koyu`, başlık `--ttd-koyu-metin`, linkler `--ttd-koyu-soluk`.

**Gözlem.** Ana Menü'deki "İletişim" `/pages/iletisimsayfasi` adresine, Footer menu'deki "İletişim" `/pages/iletisim` adresine gidiyor. İkisinden biri muhtemelen eski.
**Etki.** Tüm sayfalarda bültenin altına koyu footer eklenir. Mağaza menülerine 2 yeni menü eklenir.

### 7.4 guclu-header: "Ürünü Öğren" ile puan satırının çakışması
**Ölçüm.** couple ve hediye sayfalarında `.gh-cam` ile `.gh-puan` kutuları 0–600px kaydırma arasında ölçüldü.

| | Katmansız (mevcut) | Katmanlı (yeni) |
|---|---|---|
| Masaüstü 1440 | ~250px kaydırmada çakışıyor | ~300px'te çakışıyor (hero uzadığı için kaydı) |
| Mobil 390 | çakışma yok | çakışma yok |

**Neden.** Kaydırma efekti `.gh-cam`'i `transform` ile hareket ettiriyor. Puan satırı ise normal akışta kalıyor. Kural 3 gereği CSS katmanında `transform` ve `position`'a dokunamadığım için bunu yalnızca stil katmanıyla güvenli biçimde çözemem.
**Öneri (iki seçenek).**
- (a) **Önerdiğim:** guclu-header JS'indeki kaydırma eşiğine puan satırının alt kenarını hesaba katan küçük bir düzeltme. Bu bir JS değişikliği, kural 1'in dışında.
- (b) Masaüstünde `.gh-puan` ile `.gh-cam` arasına `margin-top` ile yeterli boşluk. Yalnızca CSS, ama hero'yu yaklaşık 56px uzatır.

Hangisini istersen onu uygularım.

## 6. Metin değişiklikleri (Adım 6): 120 değer, 13 dosya

Not: aynı section birden fazla şablonda bulunduğu için (ör. `avantaj_kartlari_1`, `hediye_omru_4cjEHU`, `urun_alt_cta`) aynı metin birden fazla dosyada değişti. Hepsi tek tek listelendi.

| Sayfa | Dosya | Section | Ayar | Eski → Yeni |
|---|---|---|---|---|
| Tüm sayfalar ("Nasıl çalışır?" paneli) | `sections/tt-nasil-calisir-grup.json` | `tt_nc_fark` | `settings/heading` | Bir fikir iki farklı deneyim. → **Bir fikir, iki farklı deneyim** |
| Koleksiyon: çelik kolyeler | `templates/collection.celik-kolyeler.json` | `hero_video_kapsul_6G97xA` | `settings/log_line` | &lt;p&gt;Çoğu hediye zamanla değerini kaybeder.&lt;br/&gt;Kapsü ise zamanla daha anlamlı hale gelir.&lt;/p&gt; → **&lt;p&gt;Çoğu hediye zamanla değerini kaybeder.&lt;br/&gt;Kapsül ise zamanla daha anlamlı hale gelir.&lt;/p&gt;** |
| Koleksiyon: çelik kolyeler | `templates/collection.celik-kolyeler.json` | `tt_secim_kartlari_MqYNcr` | `settings/baslik` | Zaman Kapsülünü Seç → **Zaman Kapsülünü seç** |
| Koleksiyon: çelik kolyeler | `templates/collection.celik-kolyeler.json` | `tt_secim_kartlari_MqYNcr` | `settings/setler_baslik` | Kampanyalı Couple Setler → **Kampanyalı Couple setler** |
| Koleksiyon: çelik kolyeler | `templates/collection.celik-kolyeler.json` | `tt_secim_kartlari_MqYNcr` | `settings/ust_yazi` | Unutulmaz Bir Hediye Hazırla → **Unutulmaz bir hediye hazırla** |
| Koleksiyon: çelik kolyeler | `templates/collection.celik-kolyeler.json` | `urun_alt_cta` | `settings/etiket` | ZAMAN KAPSÜLÜ → **Zaman Kapsülü** |
| Koleksiyon: couple ürünler | `templates/collection.couple-urunler.json` | `tt_secim_kartlari_MqYNcr` | `settings/baslik` | Zaman Kapsülünü Seç → **Zaman Kapsülünü seç** |
| Koleksiyon: couple ürünler | `templates/collection.couple-urunler.json` | `tt_secim_kartlari_MqYNcr` | `settings/setler_baslik` | Kampanyalı Couple Setler → **Kampanyalı Couple setler** |
| Koleksiyon: couple ürünler | `templates/collection.couple-urunler.json` | `tt_secim_kartlari_MqYNcr` | `settings/ust_yazi` | Unutulmaz Bir Hediye Hazırla → **Unutulmaz bir hediye hazırla** |
| Koleksiyon: bileklik | `templates/collection.zaman-kapsulu-bileklik.json` | `hero_video_kapsul_6G97xA` | `settings/log_line` | &lt;p&gt;Çoğu hediye zamanla değerini kaybeder.&lt;br/&gt;Kapsü ise zamanla daha anlamlı hale gelir.&lt;/p&gt; → **&lt;p&gt;Çoğu hediye zamanla değerini kaybeder.&lt;br/&gt;Kapsül ise zamanla daha anlamlı hale gelir.&lt;/p&gt;** |
| Koleksiyon: bileklik | `templates/collection.zaman-kapsulu-bileklik.json` | `tt_secim_kartlari_MqYNcr` | `settings/baslik` | Zaman Kapsülünü Seç → **Zaman Kapsülünü seç** |
| Koleksiyon: bileklik | `templates/collection.zaman-kapsulu-bileklik.json` | `tt_secim_kartlari_MqYNcr` | `settings/setler_baslik` | Kampanyalı Couple Setler → **Kampanyalı Couple setler** |
| Koleksiyon: bileklik | `templates/collection.zaman-kapsulu-bileklik.json` | `tt_secim_kartlari_MqYNcr` | `settings/ust_yazi` | Unutulmaz Bir Hediye Hazırla → **Unutulmaz bir hediye hazırla** |
| Koleksiyon: kolyeler | `templates/collection.zaman-kapsulu-kolyeler.json` | `hero_video_kapsul_6G97xA` | `settings/log_line` | &lt;p&gt;Çoğu hediye zamanla değerini kaybeder.&lt;br/&gt;Kapsü ise zamanla daha anlamlı hale gelir.&lt;/p&gt; → **&lt;p&gt;Çoğu hediye zamanla değerini kaybeder.&lt;br/&gt;Kapsül ise zamanla daha anlamlı hale gelir.&lt;/p&gt;** |
| Koleksiyon: kolyeler | `templates/collection.zaman-kapsulu-kolyeler.json` | `tt_secim_kartlari_MqYNcr` | `settings/baslik` | Zaman Kapsülünü Seç → **Zaman Kapsülünü seç** |
| Koleksiyon: kolyeler | `templates/collection.zaman-kapsulu-kolyeler.json` | `tt_secim_kartlari_MqYNcr` | `settings/setler_baslik` | Kampanyalı Couple Setler → **Kampanyalı Couple setler** |
| Koleksiyon: kolyeler | `templates/collection.zaman-kapsulu-kolyeler.json` | `tt_secim_kartlari_MqYNcr` | `settings/ust_yazi` | Unutulmaz Bir Hediye Hazırla → **Unutulmaz bir hediye hazırla** |
| Koleksiyon: kolyeler | `templates/collection.zaman-kapsulu-kolyeler.json` | `urun_alt_cta` | `settings/etiket` | ZAMAN KAPSÜLÜ → **Zaman Kapsülü** |
| Ana sayfa | `templates/index.json` | `hediye_omru_4cjEHU` | `settings/baslik` | Hediyeler biter. Kapsül, birikir. → **Hediyeler biter, kapsül birikir** |
| Ana sayfa | `templates/index.json` | `hero_video_kapsul_ALtinB` | `settings/baslik` | İstediğin her şeyi, geleceğe taşı. → **İstediğin her şeyi, geleceğe taşı** |
| Ana sayfa | `templates/index.json` | `mozaik_kartlar_WJaRVA` | `settings/cta_yazi` | HEMEN İNCELE → **Hemen incele** |
| Ana sayfa | `templates/index.json` | `tt_catal_karsilastirma_DR3MX8` | `settings/heading` | Bir fikir iki farklı deneyim. → **Bir fikir, iki farklı deneyim** |
| Ana sayfa | `templates/index.json` | `tt_cok_satanlar_1` | `settings/ust_couple` | COUPLE ZAMAN KAPSÜLÜ → **Couple Zaman Kapsülü** |
| Ana sayfa | `templates/index.json` | `tt_cok_satanlar_1` | `settings/ust_tekli` | SINGLE ZAMAN KAPSÜLÜ → **Single Zaman Kapsülü** |
| Ana sayfa | `templates/index.json` | `video_slider_kapsul_P4MECP` | `blocks/slayt_WcYjkR/settings/baslik` | Sadece ikiniz görebilirsiniz. → **Sadece ikiniz görebilirsiniz** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `adim_yigin_couple` | `blocks/adim_1/settings/baslik` | Telefonuna dokundur, kapsüle bağlan. → **Telefonuna dokundur, kapsüle bağlan** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `adim_yigin_couple` | `blocks/adim_2/settings/baslik` | Buluşana kadar biriktirin. → **Buluşana kadar biriktirin** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `adim_yigin_couple` | `blocks/adim_3/settings/baslik` | Her bildirimde heyecan daha da büyür. → **Her bildirimde heyecan daha da büyür** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `adim_yigin_couple` | `blocks/adim_4/settings/baslik` | Buluştuğunuz an açılır. → **Buluştuğunuz an açılır** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `adim_yigin_couple` | `settings/vurgu_metni` | Dört Adımda Öğrenin. → **Dört adımda öğrenin** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `apple_slayt_couple` | `blocks/kart_1/settings/baslik` | Bir gelecek inşa edin. → **Bir gelecek inşa edin** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `apple_slayt_couple` | `blocks/kart_2/settings/baslik` | En değerli ürününüzü birlikte oluşturun. → **En değerli ürününüzü birlikte oluşturun** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `apple_slayt_couple` | `blocks/kart_3/settings/baslik` | Çıkartılmaz, unutulmaz. → **Çıkartılmaz, unutulmaz** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `apple_slayt_couple` | `blocks/kart_4/settings/baslik` | Çok kişisel. Çok kalıcı. → **Çok kişisel, çok kalıcı** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `apple_slayt_couple` | `blocks/kart_5/settings/baslik` | Her bildirim yeni heyecan. → **Her bildirim yeni heyecan** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `apple_slayt_couple` | `settings/baslik` | İlişkinin en güzel alışkanlığı. → **İlişkinin en güzel alışkanlığı** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `avantaj_kartlari_couple` | `blocks/kart_destek/settings/baslik` | Her zaman yanınızdayız. → **Her zaman yanınızdayız** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `avantaj_kartlari_couple` | `blocks/kart_kargo/settings/baslik` | 2.499₺ üzeri ücretsiz kargo. → **2.499₺ üzeri ücretsiz kargo** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `avantaj_kartlari_couple` | `blocks/kart_kilavuz/settings/baslik` | Kullanım kılavuzu. → **Kullanım kılavuzu** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `avantaj_kartlari_couple` | `blocks/kart_odeme/settings/baslik` | Ödeme kolaylıkları. → **Ödeme kolaylıkları** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `avantaj_kartlari_couple` | `settings/baslik` | Her adımı kolaylaştırdık. → **Her adımı kolaylaştırdık** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `blocks_HATjRq` | `blocks/ai_gen_block_8237de9_MjAnkx/settings/title` | Biz de seçerken zorlanıyoruz. → **Biz de seçerken zorlanıyoruz** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `couple_bulusma_Kp2Nq7` | `settings/baslik` | Her buluşmanızda büyür. → **Her buluşmanızda büyür** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `couple_bulusma_Kp2Nq7` | `settings/baslik_vurgu` | 5 saniyede deneyimle. → **5 saniyede deneyimle** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `guclu_header_couple` | `settings/baslik` | İkiniz de yükleyin. → **İkiniz de yükleyin** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `guclu_header_couple` | `settings/vurgu_metni` | Sadece buluştuğunuzda açılır. → **Sadece buluştuğunuzda açılır** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `hediye_omru_couple` | `settings/baslik` | Hediyeler biter, kapsül birikir. → **Hediyeler biter, kapsül birikir** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `mozaik_kartlar_couple` | `settings/cta_yazi` | HEMEN İNCELE → **Hemen incele** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `tt_veri_HFXQUn` | `blocks/veri_9w8MhD/settings/etiket` | 1. GÜN → **1. gün** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `tt_veri_HFXQUn` | `blocks/veri_CeGTpk/settings/etiket` | İLK 1 YIL → **İlk 1 yıl** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `tt_veri_HFXQUn` | `blocks/veri_DMcJjM/settings/etiket` | 3+ YIL → **3+ yıl** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `tt_veri_HFXQUn` | `blocks/veri_NKwFPi/settings/etiket` | İLK 6 AY → **İlk 6 ay** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `tt_veri_HFXQUn` | `settings/baslik` | Çünkü ilk gün bitmiyor. → **Çünkü ilk gün bitmiyor** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `video_slider_kapsul_couple` | `blocks/slayt_WcYjkR/settings/baslik` | Sadece ikiniz görebilirsiniz. → **Sadece ikiniz görebilirsiniz** |
| Couple | `templates/page.couple-daha-fazla-bilgial.json` | `video_slider_kapsul_couple` | `settings/baslik` | İncelikle tasarlandı. → **İncelikle tasarlandı** |
| Event | `templates/page.event-daha-fazla-bilgial.json` | `blocks_BHFjY3` | `blocks/ai_gen_block_33582c8_BaDJkB/settings/heading` | Nasıl Çalışır? → **Nasıl çalışır?** |
| Event | `templates/page.event-daha-fazla-bilgial.json` | `blocks_Rr9e8X` | `blocks/ai_gen_block_d0a0e86_D486G3/settings/heading` | Binlerce fotoğrafı teker teker seçip sahiplerine ulaştırmak imkansız-dı. → **Binlerce fotoğrafı teker teker seçip sahiplerine ulaştırmak imkansız-dı** |
| Event | `templates/page.event-daha-fazla-bilgial.json` | `blocks_t8HTHJ` | `blocks/ai_gen_block_2ca4111_Y7yMMP/settings/step_1_title` | Fotoğrafçınızın çektiği her kare, sahibini bulur. → **Fotoğrafçınızın çektiği her kare, sahibini bulur** |
| Event | `templates/page.event-daha-fazla-bilgial.json` | `blocks_t8HTHJ` | `blocks/ai_gen_block_2ca4111_Y7yMMP/settings/step_2_title` | Davetliler çektiklerini yüklesin. → **Davetliler çektiklerini yüklesin** |
| Event | `templates/page.event-daha-fazla-bilgial.json` | `blocks_t8HTHJ` | `blocks/ai_gen_block_2ca4111_Y7yMMP/settings/step_3_title` | O an veya daha sonra. → **O an veya daha sonra** |
| Event | `templates/page.event-daha-fazla-bilgial.json` | `blocks_t8HTHJ` | `blocks/ai_gen_block_2ca4111_Y7yMMP/settings/step_4_title` | Fiziksel kapsül, düğünle sınırlı kalmaz. → **Fiziksel kapsül, düğünle sınırlı kalmaz** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `adim_yigin_1` | `blocks/adim_1/settings/baslik` | Telefonuna Dokundur, Kapsüle Bağlan. → **Telefonuna dokundur, kapsüle bağlan** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `adim_yigin_1` | `blocks/adim_2/settings/baslik` | Anılarını Yükle. → **Anılarını yükle** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `adim_yigin_1` | `blocks/adim_3/settings/baslik` | Açılacağı Zamanı Belirle. → **Açılacağı zamanı belirle** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `adim_yigin_1` | `blocks/adim_4/settings/baslik` | Belirlediğin Anda Açılsın. → **Belirlediğin anda açılsın** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `adim_yigin_1` | `settings/vurgu_metni` | Dört Adımda Öğrenin. → **Dört adımda öğrenin** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `avantaj_kartlari_1` | `blocks/kart_destek/settings/baslik` | Her zaman yanınızdayız. → **Her zaman yanınızdayız** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `avantaj_kartlari_1` | `blocks/kart_kargo/settings/baslik` | 2.499₺ üzeri ücretsiz kargo. → **2.499₺ üzeri ücretsiz kargo** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `avantaj_kartlari_1` | `blocks/kart_kilavuz/settings/baslik` | Kullanım kılavuzu. → **Kullanım kılavuzu** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `avantaj_kartlari_1` | `blocks/kart_odeme/settings/baslik` | Ödeme kolaylıkları. → **Ödeme kolaylıkları** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `avantaj_kartlari_1` | `settings/baslik` | Her Adımı Kolaylaştırdık. → **Her adımı kolaylaştırdık** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `blocks_wKUYJT` | `blocks/ai_gen_block_8237de9_4JTHXp/settings/title` | Biz de Seçerken Zorlanıyoruz. → **Biz de seçerken zorlanıyoruz** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `guclu_header_1` | `settings/baslik` | Yükle, Kilitle ve Hediye Et. → **Yükle, kilitle ve hediye et** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `guclu_header_1` | `settings/vurgu_metni` | Açılacağı Günü Sen Belirle. → **Açılacağı günü sen belirle** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `hediye_omru_1` | `settings/baslik` | Hediyeler Biter, Kapsül Birikir. → **Hediyeler biter, kapsül birikir** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `mozaik_kartlar_1` | `settings/cta_yazi` | HEMEN İNCELE → **Hemen incele** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `tt_veri_iq8pPd` | `blocks/veri_8MbTTb/settings/etiket` | İLK 1 YIL → **İlk 1 yıl** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `tt_veri_iq8pPd` | `blocks/veri_A9QB7r/settings/etiket` | İLK 3 YIL → **İlk 3 yıl** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `tt_veri_iq8pPd` | `blocks/veri_fCemXG/settings/etiket` | 1. GÜN → **1. gün** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `tt_veri_iq8pPd` | `blocks/veri_xc84AV/settings/etiket` | İLK 6 AY → **İlk 6 ay** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `tt_veri_iq8pPd` | `settings/baslik` | Çünkü ilk gün bitmiyor. → **Çünkü ilk gün bitmiyor** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `video_slider_kapsul_1` | `blocks/slayt_WcYjkR/settings/baslik` | Sadece ikiniz görebilirsiniz. → **Sadece ikiniz görebilirsiniz** |
| Hediye | `templates/page.hediye-daha-fazla-bilgial.json` | `video_slider_kapsul_1` | `settings/baslik` | İncelikle Tasarlandı. → **İncelikle tasarlandı** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `avantaj_kartlari_1` | `blocks/kart_destek/settings/baslik` | Her zaman yanınızdayız. → **Her zaman yanınızdayız** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `avantaj_kartlari_1` | `blocks/kart_kargo/settings/baslik` | 2.499₺ üzeri ücretsiz kargo. → **2.499₺ üzeri ücretsiz kargo** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `avantaj_kartlari_1` | `blocks/kart_kilavuz/settings/baslik` | Kullanım kılavuzu. → **Kullanım kılavuzu** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `avantaj_kartlari_1` | `blocks/kart_odeme/settings/baslik` | Ödeme kolaylıkları. → **Ödeme kolaylıkları** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `avantaj_kartlari_1` | `settings/baslik` | Her Adımı Kolaylaştırdık. → **Her adımı kolaylaştırdık** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `faq` | `settings/heading` | Sıkça Sorulan Sorular → **Sıkça sorulan sorular** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `hediye_omru_4cjEHU` | `settings/baslik` | Hediyeler biter. Kapsül, birikir. → **Hediyeler biter, kapsül birikir** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `material-features` | `blocks/feature-2/settings/title` | Suya ve Tere Dayanıklı Çipler → **Suya ve tere dayanıklı çipler** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `material-features` | `blocks/feature-3/settings/title` | Hassas Ciltlere Uygun → **Hassas ciltlere uygun** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `material-features` | `settings/heading` | Uzun yıllar &lt;strong&gt;sizinle kalması için tasarlandı&lt;/strong&gt;. → **Uzun yıllar &lt;strong&gt;sizinle kalması için tasarlandı&lt;/strong&gt;** |
| Ürün (couple şablonu) | `templates/product.couple.json` | `urun_alt_cta` | `settings/etiket` | ZAMAN KAPSÜLÜ → **Zaman Kapsülü** |
| Ürün (varsayılan şablon) | `templates/product.json` | `faq` | `settings/heading` | Sıkça Sorulan Sorular → **Sıkça sorulan sorular** |
| Ürün (varsayılan şablon) | `templates/product.json` | `how_it_works_timeline_HbEggP` | `settings/heading` | Nasıl Çalışır? → **Nasıl çalışır?** |
| Ürün (varsayılan şablon) | `templates/product.json` | `urun_alt_cta` | `settings/etiket` | ZAMAN KAPSÜLÜ → **Zaman Kapsülü** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `avantaj_kartlari_1` | `blocks/kart_destek/settings/baslik` | Her zaman yanınızdayız. → **Her zaman yanınızdayız** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `avantaj_kartlari_1` | `blocks/kart_kargo/settings/baslik` | 2.499₺ üzeri ücretsiz kargo. → **2.499₺ üzeri ücretsiz kargo** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `avantaj_kartlari_1` | `blocks/kart_kilavuz/settings/baslik` | Kullanım kılavuzu. → **Kullanım kılavuzu** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `avantaj_kartlari_1` | `blocks/kart_odeme/settings/baslik` | Ödeme kolaylıkları. → **Ödeme kolaylıkları** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `avantaj_kartlari_1` | `settings/baslik` | Her Adımı Kolaylaştırdık. → **Her adımı kolaylaştırdık** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `faq` | `settings/heading` | Sıkça Sorulan Sorular → **Sıkça sorulan sorular** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `hediye_omru_4cjEHU` | `settings/baslik` | Hediyeler biter. Kapsül, birikir. → **Hediyeler biter, kapsül birikir** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `material-features` | `blocks/feature-2/settings/title` | Suya ve Tere Dayanıklı Çipler → **Suya ve tere dayanıklı çipler** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `material-features` | `blocks/feature-3/settings/title` | Hassas Ciltlere Uygun → **Hassas ciltlere uygun** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `material-features` | `settings/heading` | Uzun yıllar &lt;strong&gt;sizinle kalması için tasarlandı&lt;/strong&gt;. → **Uzun yıllar &lt;strong&gt;sizinle kalması için tasarlandı&lt;/strong&gt;** |
| Ürün (zaman-kapsulu-couple şablonu) | `templates/product.zaman-kapsulu-couple.json` | `urun_alt_cta` | `settings/etiket` | ZAMAN KAPSÜLÜ → **Zaman Kapsülü** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `avantaj_kartlari_1` | `blocks/kart_destek/settings/baslik` | Her zaman yanınızdayız. → **Her zaman yanınızdayız** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `avantaj_kartlari_1` | `blocks/kart_kargo/settings/baslik` | 2.499₺ üzeri ücretsiz kargo. → **2.499₺ üzeri ücretsiz kargo** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `avantaj_kartlari_1` | `blocks/kart_kilavuz/settings/baslik` | Kullanım kılavuzu. → **Kullanım kılavuzu** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `avantaj_kartlari_1` | `blocks/kart_odeme/settings/baslik` | Ödeme kolaylıkları. → **Ödeme kolaylıkları** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `avantaj_kartlari_1` | `settings/baslik` | Her Adımı Kolaylaştırdık. → **Her adımı kolaylaştırdık** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `faq` | `settings/heading` | Sıkça Sorulan Sorular → **Sıkça sorulan sorular** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `hediye_omru_4cjEHU` | `settings/baslik` | Hediyeler biter. Kapsül, birikir. → **Hediyeler biter, kapsül birikir** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `material-features` | `blocks/feature-2/settings/title` | Suya ve Tere Dayanıklı Çipler → **Suya ve tere dayanıklı çipler** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `material-features` | `blocks/feature-3/settings/title` | Hassas Ciltlere Uygun → **Hassas ciltlere uygun** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `material-features` | `settings/heading` | Uzun yıllar &lt;strong&gt;sizinle kalması için tasarlandı&lt;/strong&gt;. → **Uzun yıllar &lt;strong&gt;sizinle kalması için tasarlandı&lt;/strong&gt;** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `ugc_galeri_1` | `settings/heading` | Ürünle İlgili Videolar. → **Ürünle ilgili videolar** |
| Ürün (zaman-kapsulu şablonu) | `templates/product.zaman-kapsulu.json` | `urun_alt_cta` | `settings/etiket` | ZAMAN KAPSÜLÜ → **Zaman Kapsülü** |

## 7. Testler (Adım 8)

### 8.1 Ekran görüntüleri: `once-sonra.zip`
- Kaynak betik ve sayfalar "önce" çekimiyle aynı (`cek.js`): mobil 390×844 (2x), masaüstü 1440×900. Sayfalar: ana sayfa, couple, hediye, hediye ürünleri gör, event, ürün (Lumin), koleksiyon (kolyeler), sepet çekmecesi açık, hamburger menü açık, taksit modalı açık.
- `önce/` 152 dosya, `sonra/` 155 dosya. **152 adın hepsi iki klasörde de birebir var.** Fazladan 3 dosya var (`masaustu_event_05_…-d`, `mobil_couple_03_adim-yigin-d`, `mobil_hediye_03_adim-yigin-d`): bu bölümler uzadığı için ekran ekran çekimde 4. parça oluştu.
- Bölüm boşlukları (96/160) nedeniyle 30 section ekran yüksekliğini aştı. Önce çekiminde bunlar tek görüntüydü. Karşılaştırma aynı adla yapılabilsin diye:
  - 24 normal section, `TEK` seçeneğiyle tek parça (tam section) çekildi.
  - 6 video-slider (yapışkan/sticky) bölümünde tam çekim yanlış görüntü verdiği için ekran parçaları alt alta birleştirildi; parçalar arasında gri çizgi var. Ham parçalar `sonra/parcalar/` içinde.
- `ek/yan-yana/`: sayfa sayfa önce (sol) ve sonra (sağ) karşılaştırma sayfaları. `ek/nasil-calisir-*`: "Nasıl çalışır?" düğmesi, paneli ve karşılaştırma katmanı (bunlar section çekimlerinde gizli).

### 8.2 Etkileşim testi
Gerçek Playwright tıklamasıyla yapıldı. Bir öğeyi başka bir katman örtüyorsa test HATA verir. Her öğe masaüstü ve mobilde ayrı ayrı denendi.
- **95 öğe × 2 cihaz:** 162 OK, 0 HATA, 24 "yok", 4 bilgi.
- "Yok": tema o öğeyi o ekran boyutunda göstermiyor (örneğin mobilde apple-slayt okları yok, nokta var; tek ürün olduğu için featured collection okları `hidden`). Not sütununda nedeni yazıyor.
- **Ödeme geçişi:** checkout sayfası açıldı (`/checkouts/cn/…`). **Sipariş oluşturulmadı.** Sipariş için gerçek ödeme gerekir ve mağazada gerçek bir sipariş açılırdı. Alanlar doldurulmadı.
- **Bülten formu:** alan yazılabiliyor, geçersiz adres reddediliyor. Mağazada gerçek abone kaydı oluşmasın diye gönderim yapılmadı.
- **Sepet:** test oturumlarında ürün sepete eklendi. Bunlar tarayıcı oturumuna ait sepetler; mağaza verisi değişmedi.

| Sayfa | Öğe | Beklenen | Masaüstü 1440 | Mobil 390 | Not |
|---|---|---|---|---|---|
| Ana sayfa | tt-cs çip (2.) | çip seçili olur | ✅ OK | ✅ OK |  |
| Ana sayfa | tt-cs sonraki ok | raf kayar | ✅ OK | ✅ OK |  |
| Ana sayfa | tt-cs önceki ok | raf geri kayar | ✅ OK | ✅ OK |  |
| Ana sayfa | çark "Çevir" (küçük buton) | çark açılır / döner | ✅ OK | ✅ OK |  |
| Ana sayfa | çark "Çevir" (tam buton) | çark döner | ✅ OK | ✅ OK |  |
| Ana sayfa | çark sonucu | indirim kodu gösterilir | ✅ OK | ✅ OK | kod: K7QX4M9TR |
| Ana sayfa | çark kodu sepete | kod oturuma/sepete yazılır | ✅ OK | ✅ OK | sepet kodları: K7QX4M9TR, çerez: false |
| Ana sayfa | hediye ömrü kaydırıcı | değer ve metin değişir | ✅ OK | ✅ OK | 4 → 32; 32. Ay; 5 → 33; 33. Ay |
| Ana sayfa | video slider 3. nokta | 3. slayt etkin | — yok | ✅ OK | masaüstünde nokta yok, kart listesi var |
| Ana sayfa | video slider 2. kart | 2. kart etkin | ✅ OK | ✅ OK |  |
| Ana sayfa | video oynat/durdur | oynatma durumu değişir | ✅ OK | ✅ OK | DDOD → DDDD; DODD → DDDD |
| Ana sayfa | mozaik yorum "devamı" | yorum açılır | ✅ OK | ✅ OK |  |
| Ana sayfa | mozaik CTA | yönlendirme / açılır menü | ✅ OK | ✅ OK |  |
| Ana sayfa | tt-catal butonu (Couple) | couple sayfasına gider | ✅ OK | ✅ OK | /pages/couple-daha-fazla-bilgi-al |
| Ana sayfa | "Nasıl çalışır?" yüzen buton | panel açılır | ✅ OK | ✅ OK |  |
| Ana sayfa | "Nasıl çalışır?" karşılaştırma kartı | karşılaştırma açılır | ✅ OK | ✅ OK |  |
| Ana sayfa | karşılaştırma kapat | karşılaştırma kapanır | ✅ OK | ✅ OK |  |
| Ana sayfa | hamburger menü (üstteki) | menü açılır | ✅ OK | ✅ OK |  |
| Ana sayfa | bülten e-posta alanı | odaklanır, yazılır, geçersiz adres reddedilir | ✅ OK | ✅ OK | gönderim bilinçli olarak yapılmadı |
| Ana sayfa | JS hataları (pageerror) | yok | ℹ️ bilgi | ℹ️ bilgi | Cannot read properties of null (reading 'open') |
| Couple | guclu-header "Ürünü Öğren" (gh-cam) | panel / kaydırma | ✅ OK | ✅ OK |  |
| Couple | adım yığını (kaydırma) | kaydırınca adım değişir | ✅ OK | ✅ OK | Adım 1 → Adım 4; Adım 1,Adım 2 → Adım 4 |
| Couple | guclu-header ana buton | ürüne gider | ✅ OK | ✅ OK | /collections/couple-urunler |
| Couple | video slider 3. nokta | 3. slayt etkin | — yok | ✅ OK | masaüstünde nokta yok, kart listesi var |
| Couple | video slider 2. kart | 2. kart etkin | ✅ OK | ✅ OK |  |
| Couple | video oynat/durdur | oynatma durumu değişir | ✅ OK | — yok | DODD → DDDD; mobilde buton yok (dokunarak kontrol) |
| Couple | hediye ömrü kaydırıcı | değer ve metin değişir | ✅ OK | ✅ OK | 3 → 32; 32. Ay; 0 → 33; 33. Ay |
| Couple | apple-slayt sonraki | aktif nokta ilerler | ✅ OK | — yok | mobilde ok yok, noktalar var |
| Couple | apple-slayt önceki | aktif nokta geri gelir | ✅ OK | — yok | mobilde ok yok, noktalar var |
| Couple | apple-slayt 4. nokta | 4. kart etkin | — yok | ✅ OK | masaüstünde 2 nokta (sayfa başına 3 kart) |
| Couple | mozaik video oynat | video oynar / büyür | ✅ OK | ✅ OK |  |
| Couple | karşılaştırma tetik butonu | seçenekler açılır | ✅ OK | ✅ OK |  |
| Couple | avantaj kartı detay (+) | detay penceresi açılır | ✅ OK | ✅ OK |  |
| Couple | avantaj detay kapat | pencere kapanır | ✅ OK | ✅ OK |  |
| Couple | avantaj sonraki ok | şerit kayar | — yok | — yok | tüm kartlar sığıyor, oklar gizli |
| Couple | JS hataları (pageerror) | yok | ✅ OK | ✅ OK |  |
| Hediye | guclu-header "Ürünü Öğren" (gh-cam) | panel / kaydırma | ✅ OK | ✅ OK |  |
| Hediye | guclu-header tetik butonu | seçenekler açılır | ✅ OK | ✅ OK |  |
| Hediye | adım yığını (kaydırma) | kaydırınca adım değişir | ✅ OK | ✅ OK | Adım 1 → Adım 3,Adım 4; Adım 1,Adım 2 → Adım 3,Adım 4 |
| Hediye | video slider 3. nokta | 3. slayt etkin | — yok | ✅ OK | masaüstünde nokta yok, kart listesi var; tek başına 4/4 tekrar OK (ilk denemede otomatik geçiş zamanlaması) |
| Hediye | video slider 2. kart | 2. kart etkin | ✅ OK | ✅ OK |  |
| Hediye | video oynat/durdur | oynatma durumu değişir | ✅ OK | — yok | DDOD → DDDD; mobilde buton yok (dokunarak kontrol) |
| Hediye | hediye ömrü kaydırıcı | değer ve metin değişir | ✅ OK | ✅ OK | 5 → 32; 32. Ay; 0 → 33; 33. Ay |
| Hediye | mozaik yorum "devamı" | yorum açılır | ✅ OK | ✅ OK |  |
| Hediye | mozaik CTA tetik | seçenekler açılır | ✅ OK | ✅ OK |  |
| Hediye | karşılaştırma tetik butonu | seçenekler açılır | ✅ OK | ✅ OK |  |
| Hediye | avantaj kartı detay (+) | detay penceresi açılır | ✅ OK | ✅ OK |  |
| Hediye | avantaj detay kapat | pencere kapanır | ✅ OK | ✅ OK |  |
| Hediye | avantaj sonraki ok | şerit kayar | — yok | — yok | tüm kartlar sığıyor, oklar gizli |
| Hediye | JS hataları (pageerror) | yok | ✅ OK | ✅ OK |  |
| Hediye ürünleri | kategori kartı | koleksiyona gider | ✅ OK | ✅ OK | /collections/zaman-kapsulu-kolyeler |
| Hediye ürünleri | JS hataları (pageerror) | yok | ✅ OK | ✅ OK |  |
| Event | nasıl çalışır "Next card" | kart ilerler | — yok | ✅ OK | masaüstünde tüm kartlar görünür |
| Event | featured collection sonraki | ürün rafı kayar | — yok | — yok | tek ürün var: tema okları hidden ile gizliyor (katmansız da aynı); tek ürün: oklar gizli |
| Event | featured collection "Hızlı Bakış" | hızlı bakış açılır | ✅ OK | — yok | mobilde hızlı bakış yok, "+" butonu var |
| Event | ttn-hiw adım 3 noktası | 3. adım etkin | ✅ OK | ✅ OK | class=ttn-hiw-dot-ate9hslvznulrestzmaigenblock33582c8badjkb; class=ttn-hiw-dot-ate9hslvznulrestzmaigenblock33582c8badjkb active |
| Event | karşılaştırma tetik butonu | seçenekler açılır | ✅ OK | ✅ OK |  |
| Event | JS hataları (pageerror) | yok | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | galeri sonraki | görsel ilerler | — yok | — yok | galeri küçük resimlerle çalışıyor |
| Ürün (Lumin) | galeri küçük resim 3 | görsel değişir | — yok | ✅ OK | masaüstünde galeri dikey liste |
| Ürün (Lumin) | malzeme seçimi (2. seçenek) | seçenek işaretlenir, varyant/URL değişir | ✅ OK | ✅ OK | 925 Ayar Gümüş; url değişti: true |
| Ürün (Lumin) | adet + | adet 2 olur | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | adet − | adet 1 olur | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | taksit tablosu linki | taksit penceresi açılır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | PayTR taksit tablosu | tablo yüklenir | ✅ OK | ✅ OK | Taksit seçenekleri Ürün fiyatı 2.699,00 TL ✕ Tek çekim Vade farkı yok 2.699,00 TL Toplam 2 |
| Ürün (Lumin) | taksit penceresi kapat | pencere kapanır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | beden/ölçü popup | popup açılır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | cihaz uyumluluğu butonu | popup açılır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | cihaz uyumluluğu kapat | popup kapanır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | ürün akordeonu | bölüm açılır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | UGC video büyüt | video modalı açılır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | UGC video kapat | modal kapanır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | hediye ömrü kaydırıcı | değer ve metin değişir | ✅ OK | ✅ OK | 5 → 32; 32. Ay; 5 → 33; 33. Ay |
| Ürün (Lumin) | avantaj kartı detay (+) | detay penceresi açılır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | avantaj detay kapat | pencere kapanır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | avantaj sonraki ok | şerit kayar | — yok | — yok | tüm kartlar sığıyor, oklar gizli |
| Ürün (Lumin) | SSS | cevap açılır | ✅ OK | ✅ OK |  |
| Ürün (Lumin) | "Sepete ekle" | sepet çekmecesi açılır, ürün eklenir | ✅ OK | ✅ OK | sepette 1 ürün, çekmece açık: true |
| Ürün (Lumin) | çekmecede adet + | adet artar | ✅ OK | — yok | mobilde çekmecede +/− yok, yalnızca adet alanı |
| Ürün (Lumin) | ödeme geçişi | checkout sayfası açılır (alan doldurulmaz) | ✅ OK | ✅ OK | /checkouts/cn/hWNHyeCg98969NVAy20Grrt4/t; /checkouts/cn/hWNHyeBSpjvLRjB8yMxguCSA/t |
| Ürün (Lumin) | JS hataları (pageerror) | yok | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | tt-sc çip (2.) | çip seçili olur | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | tt-sc çip (1.) | çip seçili olur | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | seçim kartı "Couple" | kart seçilir | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | setler sonraki ok | set rafı kayar | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | set slotu | set seçimi / ürün listesi açılır | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | seçim kartı "Single" | kart seçilir | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | çark "Çevir" (küçük buton) | çark açılır / döner | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | çark "Çevir" (tam buton) | çark döner | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | çark sonucu | indirim kodu gösterilir | ✅ OK | ✅ OK | kod: K7QX4M9TR |
| Koleksiyon (kolyeler) | çark kodu sepete | kod oturuma/sepete yazılır | ✅ OK | ✅ OK | sepet kodları: K7QX4M9TR, çerez: false |
| Koleksiyon (kolyeler) | ürün kartı "+" (sepete ekle) | varyant seçimi / sepete ekleme | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | varyant paneli kapat | panel kapanır | ✅ OK | ✅ OK |  |
| Koleksiyon (kolyeler) | alt bar butonu | sepete / ilerleme | — yok | — yok | set tamamlanınca görünür |
| Koleksiyon (kolyeler) | JS hataları (pageerror) | yok | ℹ️ bilgi | ℹ️ bilgi | Cannot read properties of null (reading 'open') |

Elle doğrulanan üç satır:
- **Mobil hediye "video slider 3. nokta":** toplu koşuda bir kez HATA verdi (otomatik slayt geçişi tıklamayla çakıştı). Tek başına katmanlı 2/2 ve katmansız 2/2 OK.
- **Masaüstü event "featured collection sonraki":** tek ürün olduğu için ok `hidden`. Playwright'ın görünürlük filtresi zaman aşımına düştü; katmansız da aynı.
- **Mobil ürün "çekmecede adet +":** mobilde sepet çekmecesinde +/− yok, yalnızca adet alanı var.

### 8.3 Animasyonlar
- **Hesaplanmış değer karşılaştırması:** 7 sayfa × 2 cihazda, aynı DOM üzerinde katman açık ve kapalı ölçüldü. Tüm öğelerde `transition-*`, `animation-*`, `position`, `display`, `visibility`, `z-index` ve `overflow` için **0 fark**. (`top/left/…` ve `transform-origin` piksele çözülmüş değerler olduğu için boyutla değişir; karşılaştırmaya alınmadı. Katmanda bu özellikler hiç yok.)
- **Çalışırken gözlenenler:**
  - guclu-header kaydırma efekti çalışıyor ("Ürünü Öğren" tıklaması kaydırma ve DOM tepkisi veriyor; 7.4'teki ölçüm de efektin çalıştığını gösteriyor).
  - Slider'lar (tt-cs, apple-slayt, video-slider, avantaj) geçiş yapıyor.
  - Adım yığını kaydırınca Adım 1→2→3→4 ilerliyor.
  - Sepet çekmecesi, taksit modalı, "Nasıl çalışır?" paneli ve karşılaştırma katmanı açılıp kapanıyor.
  - Çark dönüp kod veriyor.
  - Hediye ömrü kaydırıcısı ilerliyor.

### 8.4 Gradient başlıklar
- 14 `background-clip:text` öğesi (couple: guclu-header vurgusu, adım yığını vurgusu ve adım rozetleri, apple-slayt vurgusu, couple-bulusma vurgusu; hediye: guclu-header ve adım yığını, mobil ve masaüstü) katmanlı ve katmansız durumda `background-image` ve `-webkit-text-fill-color` değerleriyle birebir aynı.
- Görsel olarak da kontrol edildi (`ek/yan-yana/*_couple_*`, `*_hediye_*`): kırmızı ve yeşil gradient'ler ve "Adım N" rozetleri yerinde.

### 8.5 Kontrast (4.5:1, büyük metinde 3:1)
- Tüm görünür metin öğeleri, arkasındaki gerçek zemin rengiyle ölçüldü (yarı saydam katmanlar karıştırılarak).
- Eşiğin altında kalan öğe sayısı: **katmansız 57 → katmanlı 6.**
- Kalan 6 öğenin tamamı fotoğraf veya video üstündeki beyaz metin. Ölçüm aracı `<img>`/`<video>` arkasını göremediği için bunları beyaz zemin üstünde sanıyor; gözle bakınca okunaklılar:
  - Hediye Ürünleri Gör'deki "Kadın" / "Erkek" kategori kartı başlıkları (×2 cihaz)
  - Hediye mozaik kartındaki "Ayşe & Mert / 3. yıl dönümü" video etiketi (mobil)
- Bu çalışmada düzeltilen gerçek kontrast sorunu: guclu-header üst etiketi ("Couple/Single Zaman Kapsülü") `#86868B` / beyaz **3.62:1** → `--ttd-soluk` **5.33:1**.
- Koyu zemindeki ikincil metin `--ttd-koyu-soluk #A8A8A8`: `#111111` üstünde 7.94:1, `#1E1E1E` kart üstünde 7.01:1. Açık zeminde `--ttd-soluk #6B6B6B`: beyazda 5.33:1, `#F2F2F2` üstünde 4.76:1.

## 8. Bulduğum sorunlar

| # | Sorun | Kaynak | Durum |
|---|---|---|---|
| 1 | Koleksiyon hero'sunda vurgu kelimesi beyaza dönmüştü | Bu çalışma (Adım 3) | Düzeltildi (`695df33`) |
| 2 | Mobil ürün sayfasında "Ayda … × 3 taksit" satırında "taksit" alt satıra kayıyordu | Bu çalışma (Adım 4, link dolgusu) | Düzeltildi (`695df33`) |
| 3 | Event ürün kartında "hızlı ekle" ikonu görünmüyordu (0px'e sıkışmıştı) | Bu çalışma (Adım 4) | Düzeltildi (`695df33`). Tüm sayfalarda sıkışan ikon taraması yapıldı, başka yok |
| 4 | "Nasıl çalışır?" panelinde nane rengi ve karşılaştırmada Apple mavisi buton kalmıştı | Bu çalışma (Adım 3'teki değişkenler satır içi stille eziliyordu) | Düzeltildi (`00a23a0`) |
| 5 | guclu-header üst etiketi kontrastı 3.62:1 | Mevcut | Düzeltildi (`cf2b1b6`) |
| 6 | Çark kodu sepete uygulanınca JS hatası: `Cannot read properties of null (reading 'open')`, `cart.js` → `DrawerElement.onCartRefresh` | **Mevcut** (katmansız da aynı) | Kod sepete yazılıyor, işlev bozulmuyor. JS'e dokunmadım. Sepet çekmecesi DOM'da yokken `open` okunuyor; ayrıca düzeltilebilir |
| 7 | Ana sayfada iki `tt_baslik` üst üste, alttakine tıklanamıyor | Mevcut | Adım 7.1, onay bekliyor |
| 8 | Masaüstünde "Ürünü Öğren" ile puan satırı çakışması | Mevcut | Adım 7.4, onay bekliyor |
| 9 | "İletişim" menülerde iki farklı adrese gidiyor (`/pages/iletisimsayfasi`, `/pages/iletisim`) | Mevcut (mağaza navigasyonu) | Bilgi |
| 10 | `.gh-cam` ve koleksiyondaki "+ Sete ekle" butonunda içerik kutudan 1–14px taşıyor | Mevcut (katmansız da var; animasyonlu metin) | Bilgi, görünürde sorun yok |
| 11 | Koleksiyon ürün kartlarında (`tt-uk`) görsel alanı beyaz, kart zemini yumuşak gri: ürün fotoğraflarının kendi zemini beyaz olduğu için kartta iki ton görünüyor | Tasarım kararı sonucu (Adım 5: beyaz zemin üstünde kart `--ttd-yumusak`) | Görsel karar; istersen kart zeminini bu raflarda beyaz yapabilirim |

## 9. Test araçları
Betikler `scratchpad/test/` ve `scratchpad/tasarim/` altında:
- `etkilesim.js`: tıklama testi
- `denetim8.js`: animasyon, gradient ve kontrast
- `sikisma.js`: sıkışan ikon ve taşan metin taraması
- `cek.js`: ekran görüntüleri
- `derle.py`: katman derleyici ve yasak özellik denetimi
- `metin_duzelt.py`: JSON metin düzeltici ve yapı doğrulayıcı

Hepsi yalnızca `preview_theme_id=189109076288` ile çalışıyor; tema id'si her sayfada kontrol ediliyor.

**Önizleme:** https://texttonext.com/?preview_theme_id=189109076288. Yayına alma kararı sende.
