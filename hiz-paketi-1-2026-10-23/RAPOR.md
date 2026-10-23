# Hız Paketi 1: Rapor (23 Ekim 2026)

**Kısa özet**
- Telefonda içeriğin ekranda göründüğü an 7 sayfanın hepsinde yaklaşık **6–7 sn'den 2 sn'ye** indi.
- Ana sayfanın ilk açılışta indirdiği video **10 MB'tan 1 MB'a** düştü; diğer 6 sayfada ilk açılışta video inmiyor.
- Lighthouse telefon puanı 7 sayfanın 6'sında yükseldi (66–76'dan 73–86'ya); Noir'da değişmedi.

**Durum**
- Bütün değişiklikler yalnızca kopya temada: **"Hiz paketi 1 - 2026-10-23"** (ID 189388095808). Bu tema yayında değil.
- Canlı temaya ("Gumus stok notu - 2026-10-21", 189316038976) dokunulmadı; hiçbir tema yayına alınmadı. Yayına alma senin onayınla olacak.
- Reklam ve takip tarafına dokunulmadı: Meta, Google, TikTok, TrueProfit, GTM, Customer events, çerez onayı ve Markets. Takip kodu geçen hiçbir satır değişmedi.

Ayrıntılı dosya:satır listesi: `DEGISIKLIKLER.md`. Ölçüm dosyaları: `veri/`. Betikler: `betikler/`.

---

## 1. Önizleme linkleri

| Sayfa | Önizleme |
|---|---|
| Ana sayfa | https://texttonext.com/?preview_theme_id=189388095808 |
| Couple landing | https://texttonext.com/pages/couple-daha-fazla-bilgi-al?preview_theme_id=189388095808 |
| Künye | https://texttonext.com/products/zaman-kapsulu-kunye?preview_theme_id=189388095808 |
| Astor + Chloe Couple | https://texttonext.com/products/luna-aurora-couple-zaman-kapsulu-kopya?preview_theme_id=189388095808 |
| Noir | https://texttonext.com/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya?preview_theme_id=189388095808 |
| Kral Zincir | https://texttonext.com/products/zaman-kapsulu-bileklik-kral?preview_theme_id=189388095808 |
| Couple ürünler | https://texttonext.com/collections/couple-urunler?preview_theme_id=189388095808 |
| Ek: Hediye landing (mozaik videoları) | https://texttonext.com/pages/hediye-daha-fazla-bilgi-al?preview_theme_id=189388095808 |
| Ek: UGC video galerisi | https://texttonext.com/products/zaman-kapsul-kolye?preview_theme_id=189388095808 |

## 2. Hero videosu: yeni dosyalar

Hepsi Shopify Files'a **yeni dosya** olarak yüklendi; mevcut dosyalara dokunulmadı. Her dosyanın CDN'den bayt bayt aynı geldiği kontrol edildi.

| Sürüm | Doğrudan link | Boyut | Çözünürlük | Bit hızı | Nerede |
|---|---|---|---|---|---|
| **Hafif** | https://texttonext.com/cdn/shop/videos/c/o/v/a95d7952437d458cba4a5ea3386b4f1c.mp4 | 1,02 MB | 1706×720 | 0,75 Mbps | Kopyada telefonda bu oynuyor |
| Dengeli | https://texttonext.com/cdn/shop/videos/c/o/v/6bcb5f778963443689c1a34ce5b91739.mp4 | 1,79 MB | 1706×720 | 1,32 Mbps | Karşılaştırma için; kullanılmıyor |
| Masaüstü | https://texttonext.com/cdn/shop/videos/c/o/v/f47b893d13bb40bdaa1c9b3535dcb7da.mp4 | 4,05 MB | 2560×1080 | 2,99 Mbps | Kopyada masaüstünde bu oynuyor |

Dosyaların ortak özellikleri:
- H.264, ses izi yok, "faststart" (oynatma dosyanın başından hemen başlayabiliyor).
- Orijinalin 325 karesinin tamamı korundu (10,83 sn), yani döngü aynı yerden dönüyor.
- Hafif yerine dengeli istenirse tek satırlık değişiklik yeterli.

Shopify'ın hero için hazır sürümleri:

| Sürüm | Boyut | Not |
|---|---|---|
| 1080p | 9,81 MB | Bugün telefona da bu iniyor |
| 720p | 6,08 MB | |
| 480p | 2,13 MB | |

## 3. Gözle kontrol edilecekler

Önce telefonda, sonra bilgisayarda bak:

1. **Bütün sayfalar:** sayfa açılınca içerik doğrudan görünüyor mu? Eskiden çıkan beyaz yükleme perdesi ve dönen simge artık yok.
2. **Ana sayfa hero:** önce kapak resmi, bir iki saniye içinde video başlıyor mu?
   - Hafif sürümün görüntü kalitesi yeterli mi? Gerekirse dengeli sürümle karşılaştır (bölüm 2'deki linkler).
   - Video 10,8 sn'de başa dönerken sıçrama var mı?
3. **Ana sayfa "İncelikle tasarlandı" slider:**
   - Bölüme kaydırınca aktif video eskisi gibi kendiliğinden oynuyor mu?
   - Başka bir karta dokununca o kartın videosu başlıyor mu?
   - Sağ alttaki düğme durdurup başlatıyor mu?
   - Masaüstünde kartlar eskisi gibi kendiliğinden geçiyor mu?
4. **Couple landing ve Hediye landing:** mozaik video kartlarında kapak resmi görünüyor mu? Oynat'a basınca video tam ekran pencerede sesli açılıyor mu, kapat düğmesi çalışıyor mu?
5. **Astor + Chloe ürün sayfası:** mozaik videoları kartın içinde sesli oynuyor mu?
6. **Zaman kapsülü kolye ürün sayfası:** UGC videolarına basınca pencere açılıp video oynuyor mu?
7. **Görseller net mi, bulanık mı?**
   - Couple ürünler sayfasının üstündeki iki kapsül görseli (hemen görünmeli)
   - Ana sayfa çok satanlar
   - Couple landing fotoğraf duvarı
   - Çatal karşılaştırma ve seçim kartları
   - Masaüstünde ürün galerisi, özellikle geniş ekranda
8. **iPhone Safari ve Instagram içi tarayıcı:** hero videosu kendiliğinden oynuyor mu? Bu ortamda test edemedim (bölüm 8).
9. **Telefonda "Düşük Veri Modu" açıkken:** hero'da yalnızca kapak resmi kalmalı, video inmemeli. Android'de geçerli; iPhone Safari bu bilgiyi siteye vermiyor.

## 4. Önce / sonra

**Ölçüm koşulları**
- Hepsi telefon ölçümü, bu tur içinde alındı.
- Tarayıcı: Google Chrome 156; H.264 videoyu oynatabilen gerçek Chrome (neden önemli olduğu bölüm 9'da).
- Takip istekleri engellendi: Meta, Google, TikTok, TrueProfit ve Shopify web pixel. Doğrulaması bölüm 7'de.
- "Önce" = canlı tema, "sonra" = kopya tema. Hangi ölçümün hangi sürümle alındığı bölüm 11'de.

### 4a. Lighthouse (3 tur, medyan)

| Sayfa | Puan | LCP | Speed Index | TBT | CLS | Toplam yük | İlk açılış video |
|---|---|---|---|---|---|---|---|
| Ana sayfa | 66 → **73** | 4,5 → 4,4 sn | 6,0 → **4,3** sn | 372 → **159** ms | 0,050 → 0,047 | 12,3 → **3,6 MB** | 10,0 → **0,97 MB** |
| Couple landing | 67 → **86** | 5,5 → **2,9** sn | 4,9 → 3,9 sn | 223 → 178 ms | 0,063 → 0,060 | 3,5 → 2,6 MB | 0 → 0 |
| Künye | 69 → 76 | 3,8 → 3,4 sn | 5,5 → 4,7 sn | 381 → 304 ms | 0,010 → 0,007 * | 2,4 → 2,4 MB | 0 → 0 |
| Astor + Chloe Couple | 67 → 73 | 4,6 → **3,1** sn | 5,7 → 4,6 sn | 348 → 530 ms ** | 0,005 → 0,000 | 3,1 → 2,8 MB | 0,92 → **0** |
| Noir | 76 → 76 | 3,8 → 3,9 sn | 5,2 → 5,0 sn | 227 → 296 ms ** | 0,005 → 0,003 | 2,6 → 2,7 MB | 0 → 0 |
| Kral Zincir | 71 → **83** | 3,8 → 3,0 sn | 5,6 → 4,5 sn | 345 → 232 ms | 0,008 → 0,004 | 2,7 → 2,8 MB | 0 → 0 |
| Couple ürünler | 72 → **80** | 4,2 → **2,8** sn | 6,3 → 5,0 sn | 283 → 398 ms ** | 0,049 → 0,049 | 2,8 → 2,6 MB | 0 → 0 |

\* **CLS 0,937 kopyada da görüldü.** Künyenin 3 kopya turundan birinde CLS 0,94 çıktı. Kayan öğe eski raporda olduğu gibi footer (906 px). Sayfa geçiş perdesi kapalıyken de olduğu için sebep perde değil. Bu turda canlının 21 turunda görülmedi. Kök nedeni ayrı bir iş (bölüm 8).

\*\* **TBT bu üç sayfada arttı**, ama turlar arası fark çok büyük:

| Sayfa | Canlı turları | Kopya turları |
|---|---|---|
| Astor | 133–352 ms | 348–565 ms |
| Noir | 164–233 ms | 245–384 ms |
| Couple ürünler | 176–316 ms | 250–402 ms |

Nedenini bu ölçümle ayıramadım (bölüm 8).

### 4b. İçeriğin ekranda gerçekten göründüğü an (asıl başarı ölçütü)

**Ölçüm kurulumu**
- 390×844 telefon ekranı, 1,6 Mbit/sn bağlantı, 150 ms gecikme, 4 kat yavaş işlemci; 3 tur, medyan.
- "Görünme anı" iki zamanın büyüğü: büyük içeriğin boyandığı an ile perdenin tamamen kalktığı an.

| Sayfa | Görünme anı | DOMContentLoaded | Load |
|---|---|---|---|
| Ana sayfa | 7,0 → **1,9** sn | 5,9 → 4,7 sn | 7,9 → 4,9 sn |
| Couple landing | 6,8 → **1,9** sn | 5,7 → 4,4 sn | 9,3 → 5,2 sn |
| Künye | 5,8 → **2,0** sn | 4,8 → 4,6 sn | 5,4 → 5,1 sn |
| Astor + Chloe Couple | 6,7 → **1,9** sn | 5,6 → 4,8 sn | 6,6 → 5,5 sn |
| Noir | 6,0 → **2,4** sn | 5,0 → 5,2 sn | 5,6 → 5,8 sn |
| Kral Zincir | 6,2 → **2,1** sn | 5,1 → 5,1 sn | 5,6 → 5,6 sn |
| Couple ürünler | 6,0 → **2,2** sn | 4,9 → 5,0 sn | 7,1 → 7,1 sn |

Canlıda içerik hazır olsa bile, perde DCL'den yaklaşık 1,1 sn sonra kalkana kadar görünmüyordu. Kopyada perde yok; içerik ilk boyamada görünüyor.

### 4c. İlk açılışta inen video (Lighthouse varsayılan telefon ayarı, sayfa durulana kadar beklendi)

| Sayfa | Canlı | Kopya |
|---|---|---|
| Ana sayfa | 10,08 MB (hero 1080p 9,58 MB + slider dosyalarının başları) | **0,97 MB** (yalnızca hafif hero) |
| Astor + Chloe Couple | 2,57 MB (3 mozaik videosunun başları) | **0 MB** |
| Couple landing, Künye, Noir, Kral Zincir, Couple ürünler | 0 MB | 0 MB |

Hedef tuttu: ana sayfada yalnızca hafif hero sürümü, diğer sayfalarda dokunmadan 0 MB video.

### 4d. Slider senaryosu: açılışta ve slider'a kaydırınca

Telefon, takip engelli, her adımda sayfa durulana kadar beklendi.

| Sayfa | Açılışta (canlı → kopya) | Slider'a kaydırınca toplam (canlı → kopya) |
|---|---|---|
| Ana sayfa | 9,36 → **0,97 MB** | 12,84 → **2,10 MB** |
| Couple landing | 0 → 0 MB | 3,88 → **1,13 MB** |

Kopyada slider'a gelince yalnızca aktif slaytın telefon sürümü iniyor (1,13 MB) ve kendiliğinden oynuyor. Diğer slaytlar ancak sıraları gelince ya da karta dokununca iniyor.

### 4e. Video boyutları

"Eski" sütunu, video oynayınca telefonun bugün indirdiği dosya: Shopify'ın 1080p sürümü.

| Video | Bölüm | Eski | Yeni (telefon) | Çözünürlük | Bit hızı | Ses |
|---|---|---|---|---|---|---|
| Hero (final.mp4) | hero | 9,81 MB | **1,02 MB** | 1706×720 | 0,75 Mbps | yok |
| Su geçirmez zoom | slider | 3,04 MB | **1,19 MB** | 720×720 | 1,88 Mbps | var* |
| Lumin2 | slider | 2,13 MB | **0,29 MB** | 720×720 | 0,46 Mbps | var* |
| Altın-beyaz | slider | 2,22 MB | **0,56 MB** | 720×720 | 0,89 Mbps | var* |
| Vanta | slider | 3,07 MB | **0,45 MB** | 720×720 | 0,72 Mbps | var* |
| hf-080657 (ürün şablonu slider'ı) | slider | 4,50 MB | **0,40 MB** | 720×1290 | 0,64 Mbps | yok |
| hf-081641 (ürün şablonu slider'ı) | slider | 4,41 MB | **0,76 MB** | 720×1290 | 1,20 Mbps | yok |
| öyküdik44 | mozaik | 29,74 MB | **7,37 MB** | 720×1280 | 1,84 Mbps | var |
| Beyza Kararasul Uzun | mozaik | 30,66 MB | **8,34 MB** | 720×1280 | 2,06 Mbps | var |
| 068ce7c9 | mozaik | 27,64 MB | **4,27 MB** | 720×1280 | 1,17 Mbps | var |
| 7320ea4b | mozaik | 24,56 MB | **3,83 MB** | 720×1280 | 1,16 Mbps | var |
| Çipler su geçiriyor mu | UGC | 18,36 MB | **7,13 MB** ** | 720×1280 | 1,03 Mbps | var |
| En çok merak ettikleriniz | UGC | 13,86 MB | **3,74 MB** ** | 720×1280 | 0,72 Mbps | var |
| Zaman Kapsülü Charmlar | UGC | 8,11 MB | **3,10 MB** ** | 720×1280 | 1,01 Mbps | var |
| Her zamankinden farklı | UGC | 6,77 MB | **2,63 MB** ** | 720×1280 | 1,02 Mbps | var |

\* Slider videolarının aslında neredeyse sessiz bir ses izi var; "ses varsa koru" kuralı gereği korundu. Slider zaten sessiz oynuyor.

\*\* UGC videolarının asılları zaten 720×1280, ~1 Mbps ve "faststart". Aynı dosyayı tekrar yüklemek yerine telefonda Shopify'daki **mevcut orijinal** kullanılıyor; dosyaya dokunulmadı. Bugün telefona bunların 1080p'ye büyütülmüş, daha büyük sürümü gidiyor.

Bütün videoların kaynağı tema bölüm ayarları (Files). Ürün medyasından ya da metafield'dan gelen video yok; onlara dokunulmadı.

Slider ve mozaik telefon dosyalarının doğrudan linkleri `https://texttonext.com/cdn/shop/videos/c/o/v/<kod>.mp4` biçiminde. Kodlar şunlar (tam liste `veri/eslesme.json`):

| Video | Kod |
|---|---|
| Su geçirmez zoom | cf1fb3137a55469bb0d183e5d97d5d47 |
| Lumin2 | d5d4ca3f68c240308187a6edb6b13f4d |
| Altın-beyaz | fb50fc056d0b48ca8faf4e188e5b395e |
| Vanta | 0bfd167d886f428192cddf23567dc3b1 |
| hf-080657 | af887255f99d408cb7bfe680ce25f85c |
| hf-081641 | 1528b01b01c24fa58093db385637a2c4 |
| öyküdik44 | f28f0167711c454099500bb1c7b028ae |
| Beyza | 02cbf522117c4436871af2c64a9c65af |
| 068ce7c9 | db9d7a2a572c48cdaf3eed5a04de2421 |
| 7320ea4b | 07dc476104ad4145b0e1cac510a2d539 |

### 4f. İşlev testleri (kopya, Chrome)

**Telefonda hiçbir senaryoda 1080p ya da masaüstü dosyası inmedi** (ağ kaydıyla doğrulandı).

- **Telefon hero:** yalnızca hafif sürüm iniyor ve oynuyor.
- **Masaüstü hero:** 3 Mbps sürüm iniyor ve oynuyor.
- **Save-Data ve 3G:** hero videosu hiç inmiyor, kapak kalıyor.
- **Slider:** bölüm 4d'deki gibi çalışıyor.
- **Mozaik:** 3 sayfada (couple landing, hediye landing, Astor + Chloe) telefon ve masaüstünde 18 denemenin 18'i oynadı. Telefonda telefon sürümü, masaüstünde bugünkü 1080p geldi.
- **UGC:** dokununca telefonda orijinal 720p dosya açılıyor.

## 5. Değişen dosyalar

Satır numaraları `DEGISIKLIKLER.md` dosyasında.

**Ayar ve yeni dosyalar**
- `config/settings_data.json`: sayfa geçiş perdesi kapatıldı. Yan etki: Shopify kaydederken kaldırılmış iki uygulamanın (GemPages, Wheelio) boşta kalan kayıtlarını dosyadan attı.
- `layout/theme.liquid`: `</head>`'den hemen önce yapısal veri çağrısı eklendi; başka satıra dokunulmadı.
- `snippets/tt-yapisal-veri.liquid` (yeni):
  - Ana sayfada Organization ve WebSite (site içi arama).
  - Ürün ve koleksiyon sayfalarında BreadcrumbList.
- `snippets/tt-video-surumleri.liquid` (yeni): her video için telefon ve masaüstü dosyasını seçer.

**Video bölümleri**
- `sections/hero-video-kapsul.liquid`: önce kapak resmi (hızlı, öncelikli), video sayfa yüklendikten sonra iniyor; telefonda hafif sürüm; Save-Data veya 3G'de video yok.
- `sections/video-slider-kapsul.liquid`:
  - Açılışta yalnızca kapak resimleri iniyor.
  - Video ancak oynatılacağı an iniyor; otomatik oynatma eskisi gibi.
  - Betik, sayfanın tamamını beklemeden kuruluyor.
- `sections/mozaik-kartlar.liquid`:
  - Videolar dokunana kadar inmiyor.
  - Kart görsellerine doğru boyut bilgisi eklendi.
  - Betik erken kuruluyor.
- `sections/ugc-video-gallery.liquid`: telefonda 720p orijinal açılıyor.
- `snippets/tt-couple.liquid`, `snippets/tt-tekli-gorunum.liquid`: tam ekran video penceresi yeni video düzenine uyarlandı. Yapılmasaydı mozaik videoları oynamazdı.

**Görsel bölümleri**
- `sections/tt-couple-kapsul.liquid`: iki kapsül görseli hemen yükleniyor; ilki öncelikli.
- `sections/tt-cok-satanlar.liquid`: ilk 3 kart hemen yükleniyor, kalanlar ekrana yaklaşınca.
- `sections/couple-bulusma.liquid`: fotoğraf duvarı ekrana uygun boyutta indiriliyor.
- `sections/tt-catal-karsilastirma.liquid`, `sections/tt-secim-kartlari.liquid`: görseller ekrana uygun boyutta indiriliyor.
- `snippets/product-media-gallery.liquid`: masaüstü galeri görselleri gerçek genişliğe uygun boyutta (yalnızca "scroll" düzeni). Telefon ve tablet değeri aynı; ilk görselin önceliği aynı.

## 6. Couple landing: DOMContentLoaded neden geç, ne yapıldı

**Ölçüm** (Chrome, bölüm 4b'deki telefon koşulları, canlı tema)

| Adım | Zaman |
|---|---|
| Sayfa HTML'i ayrıştırıldı | 2,76 sn |
| DOMContentLoaded | 5,86 sn |
| İçerik ilk boyandı (FCP) | 2,1 sn |

Aradaki 3 saniyede tarayıcı `defer` betiklerin inmesini bekliyor:
- `theme.js` (190 KB) 5,47 sn'de, `vendor.js` (87 KB) 4,93 sn'de iniyor.
- DCL'den önce 51 betik iniyor (~1,1 MB). Çoğu Shopify'ın kendi betikleri: sohbet, hesap, shop-js, perf-kit, analitik.
- Aynı anda sayfanın çok altındaki **7 video kapağı (~560 KB)** hemen indirilip bağlantıyı paylaşıyordu. Tarayıcı `<video poster>` kapağını görünür olsun olmasın hemen indiriyor.
- Sayfa içi JS 55 blok (182 KB); DCL'den önce ana iş parçacığında 0,64 sn uzun görev var. Belirleyici olan bu değil.

**JS'e bağlı öğeler o arada çalışıyor mu?** Hayır.
- Slider, mozaik oynat düğmeleri ve slider kartları DCL olayını bekleyerek kuruluyordu.
- İçerik 2,1 sn'de görünür olduğu hâlde bunlar 5,9 sn'ye kadar dokunmaya tepki vermiyordu.
- Couple landing'de sepete ekle yok; CTA'lar düz link ve JS olmadan çalışıyor.

**Eski 13,9 sn ölçümü:** H.264 oynatamayan Chromium ile alınmıştı. O tarayıcıda 7 videonun her biri ~1 MB'a kadar indirilip bağlantıyı tıkıyordu. Gerçek Chrome bu videoları geciktirerek yüklüyor, ama iPhone Safari geciktirmiyor.

**Yapılanlar** (düşük riskli):
- Video kapakları ekrana yaklaşınca inen, ekran boyutuna uygun görsellere çevrildi.
- Videolar `preload="none"` oldu; Safari'de de ilk açılışta inmiyorlar.
- Slider ve mozaik betikleri DCL'yi beklemeden kuruluyor. Betik bölümün hemen ardından çalıştığı için bölüm hazır; ayrıca iki kez kurulmaya karşı korumalı.

**Sonuç** (aynı koşullar, kopya):

| Ölçüt | Canlı | Kopya |
|---|---|---|
| DCL'den önce inen görsel | 771 KB | 208 KB |
| `theme.js` iniş bitişi | 5,47 sn | 3,94 sn |
| DCL | 5,86 sn | 4,23 sn |
| Slider ve mozaik kuruluşu | DCL'den sonra | 2,6 sn |
| İçerik görünme anı | 6,8 sn | 1,9 sn |

**Yapılmayanlar:**
- `theme.js` ve `vendor.js`'i küçültmek ya da bölmek büyük ve riskli bir iş; yapılmadı.
- Shopify'ın kendi platform ve analitik betiklerine dokunulmadı (bölüm 7).

## 7. Takip kodlarına dokunmamak için bilerek yapılmayanlar

- **Shopify'ın analitik ve olay betikleri:** couple landing'de DCL'den önce iniyor ve DCL'yi geciktirenlerin arasındalar. Ertelenmedi, kaldırılmadı, taşınmadı:
  - `trekkie`
  - web pixel yöneticisi `/cdn/wpm/`
  - `monorail` gönderimleri
  - `shop_events_listener`
- **Shopify platform betikleri:** sohbet, hesap, shop-js, perf-kit. Aynı şekilde dokunulmadı.
- **`layout/theme.liquid`'deki takip satırları** (`content_for_header` dahil) aynen duruyor. Yeni satır `</head>`'den hemen önce eklendi.
- **Sayfa geçiş perdesi kapatılınca** `page:loaded` olayına bağlı her şey tarandı:
  - Bu olaya bağlı takip kodu yok.
  - Olay perde kapalıyken de DOMContentLoaded'da tetikleniyor (theme.js); ona bağlı özellikler çalışmaya devam ediyor.
- **Hiç incelenmedi ve önerilmedi:** Meta pikseli, Google etiketleri, TikTok pikseli, TrueProfit, Google & YouTube ile Facebook & Instagram uygulamaları, Customer events, GTM, çerez onayı, Markets.

**Takip engeli ölçümde de doğrulandı** (Chrome ağ kayıtları):
- Meta, Google, TikTok ve TrueProfit alan adlarına 42 Lighthouse turunun hiçbirinde istek gitmedi; web pixel yöneticisi engelli olduğu için bu pikseller hiç başlamıyor.
- Shopify `monorail` gönderimlerinin her turda 25–27'si engellendi.
- Lighthouse'ta her turda Shopify sohbet bileşeninden 2 küçük `monorail-edge` gönderimi (~0,3 KB) engelden kaçtı. Bu önce ve sonra ölçümlerinde aynı.
- Görünme anı ölçümünde (42 açılış) engelden geçen takip isteği 0; her açılışta 18–19 istek engellendi.
- Sonuç: ölçümler takip kodlarının yükünü içermiyor. Gerçek ziyaretçide süreler biraz daha uzun olabilir, ama önce/sonra karşılaştırması aynı koşulda yapıldı.

## 8. Yapılamayanlar ve nedenleri

- **iPhone Safari ve Instagram içi tarayıcıda otomatik oynatma:** bu ortamda iPhone/WebKit yok, test edilemedi.
  - iPhone'un istediği koşullar sağlandı: sessiz, `playsinline`, `autoplay`; kaynak sayfa yüklendikten sonra atanıyor.
  - Android Chrome yerine Chrome 156'nın telefon taklidiyle test edildi.
  - Lütfen kontrol listesinin 8. maddesine bak.
- **PageSpeed Insights ile aynı ortamda ölçüm:** PSI'ın günlük kotası doluydu. Yerel Lighthouse 13.5 + Chrome 156 kullanıldı. Bu ortamın ağı PSI'dan yavaş; canlıda yarıda kesilen video istekleri burada daha az bayt gösteriyor (ana sayfa: bizde 10 MB, PSI'da 20 MB).
- **Save-Data ve 3G testi:** gerçek yavaş bağlantıyla değil, tarayıcının bağlantı bilgisini taklit ederek yapıldı. iPhone Safari bu bilgiyi vermediği için orada bu koruma çalışmaz; video yine iner (hafif sürüm).
- **CLS 0,937'nin kök nedeni:** kopyada da görüldü. Perde değil, footer'ın ilk boyamada yukarıda görünüp sonra aşağı itilmesi. Kök nedeni bulmak ayrı bir iz kaydı (trace) çalışması gerektiriyor; bu pakette yapılmadı.
- **TBT artışı (Astor, Noir, Couple ürünler):** turlar arası dalgalanma büyük olduğu için nedenini ayıramadım.
  - Olası açıklama: içerik artık betikler çalışmadan önce görünüyor. Böylece aynı iş ölçülen pencereye düşüyor. Bu bir tahmin, doğrulanmadı.
  - Aynı sayfalarda LCP ve görünme anı belirgin şekilde iyileşti.
- **theme.js ve vendor.js'i küçültme/bölme:** büyük ve riskli bir iş, yapılmadı.
- **Tablet (768–1023 px) galeri boyutu:** talimat yalnızca masaüstü dediği için dokunulmadı. Bu aralıkta 546 px'lik görsele 704 px hedefleniyor.
- **Couple landing'deki 4 KB'lık bir profil görseli:** ekran dışında olduğu hâlde hemen yükleniyor; etkisi önemsiz olduğu için dokunulmadı.
- **Google Zengin Sonuçlar Testi:** önizleme linkini test edemiyor. Yapısal veri bu sayfalarda kontrol edildi: geçerli JSON, zorunlu alanlar tam, Product/ProductGroup/FAQPage kopyalanmadı. Yayından sonra Google testiyle bir kez bakılmalı.

## 9. Ek bulgu: PageSpeed'deki 20 MB video yükü

**Neden** (Chrome ile kanıtlandı, `veri/video-deneyleri/`)

1. **Hero (9.581 KiB):** `autoplay` ve `preload="metadata"` ile 1080p dosya (7,2 Mbps) sayfa açılır açılmaz tamamen iniyor. Yerel Lighthouse'ta da birebir aynı: 9.580 KB.
2. **Aktif slider slaytı (~3 MB):**
   - Bölüm ekrana girince slider JS'i aktif slaytta `play()` çağırıyor (`IntersectionObserver` → `basla()` → `bastanOynat()`). Dosya tamamen iniyor.
   - JS'in `load()` çağrısı yok. Kurulumda tüm slaytlara yalnızca `pause()` ve `currentTime = 0` uyguluyor.
   - `preload` değeri sonradan değişmiyor; her yerde `metadata`.
3. **Diğer üç slider videosu (2–3 MB'lık dosyalar):**
   - `preload="metadata"` olsa bile Chrome her biri için dosyanın tamamını isteyen (`Range: bytes=0-`) bir istek açıyor. Başlık bilgisi gelince isteği kesiyor.
   - Bu ortamda kesilmeden önce 110–1.100 KB geldi.
   - PSI'ın çok hızlı ağında 2–3 MB'lık dosya kesilmeden önce büyük ihtimalle tamamen iniyor; PSI listesindeki boyutlar da dosyaların tam boyutuna denk.
   - Bu son adım çıkarım; PSI'ın kendisiyle tekrar ölçemedim.
4. **Lighthouse'un uzun beklemesi neden değil:**
   - İstekler sayfa yüklenirken (0,9–1,8 sn) açılıyor.
   - Tam sayfa ekran görüntüsü kapalıyken de açılıyorlar: video yükü görüntü açıkken 11,8 MB, kapalıyken 10,2 MB.

**Önceki ölçüm neden kaçırdı**
1. Kullandığım Chromium **H.264 videoyu çözemiyordu.** Videolar ilk ~1 MB'ta hata verip duruyordu; gerçek Chrome ise oynatıp indirmeye devam ediyor.
   - Aynı canlı sayfa, kaydırmadan: Chromium 6,1 MB, Chrome 9,4 MB.
   - Kaydırınca Chrome'da 12,7 MB.
2. Bu ortamın ağ geçidi, yarıda kesilen medya isteklerinde "aktarılan bayt"ı ~1 KB gösteriyordu. Raporda o değeri yazmıştım ("1–132 KB indi"); gerçekte her istekte 0,1–1 MB veri gelmişti.
3. İlk ölçümde sayfa kaydırılmadığı için slider'ın otomatik oynatması hiç tetiklenmedi.

Bu turda bütün ölçümler H.264 destekleyen Google Chrome 156 ile yeniden alındı. Medya için "aktarılan" değil, tarayıcıya gelen gerçek gövde baytı sayıldı.

**Düzeltme (kopya)**
- Slider, mozaik ve UGC videoları açılışta hiç inmiyor; yalnızca kapak resimleri iniyor.
- Slider'da aktif slayt, bölüm ekrana girince eskisi gibi kendiliğinden oynuyor (telefonda hafif sürüm). Diğerleri ancak oynatılacakları an iniyor.
- Hero telefonda hafif sürümle, sayfa yüklendikten sonra iniyor.
- Sonuç: bölüm 4c ve 4d.

**Canlıdaki mozaik oynat düğmesi: hata yok.** Önceki mesajımdaki "canlıda oynamıyor" ifadesi yanlıştı.
- H.264 destekli Chrome ile 3 sayfada, telefon ve masaüstünde 18 denemenin 18'i oynadı (`veri/islev-testleri/mozaik-canli.json`).
- O sonuç test yönteminden çıkmıştı: bu çok sütunlu yerleşimde otomatik kaydırma düğmeyi ekrana getirmiyor, tıklama boşluğa düşüyordu.
- Müşteri tarafında bir sorun yok.

## 10. Yayın öncesi kontrol

**Yayına almadan hemen önce** şu adımlar tekrarlanmalı (bugün yapıldı, sonuçlar aşağıda):

1. **Canlı temanın son değişiklik zamanı:** bugün 21.10.2026 10:26 UTC. Kopya oluşturulduktan (23.10.2026 12:31 UTC) sonra canlıda değişen dosya yok.
2. **İki temanın bütün dosyalarının sağlama toplamı karşılaştırması:**
   - Bugün: canlı 701, kopya 703 dosya.
   - Fark tam olarak bu paketin 14 değişen dosyası ve 2 yeni dosyası. Birleştirilecek başka dosya yok (`veri/tema-karsilastirma/`).
   - Yayından önce canlıda yeni değişen dosya çıkarsa, o dosya bu 16 dosyadan biriyse elle birleştirilmeli.
3. **"Gümüş stok notu" çalışması:** canlı temanın kendisi. Kopya ondan alındığı için stok notu dosyaları kopyada aynen var; değişen bir şey yok.
4. **`config/settings_data.json` içerik karşılaştırması** (MD5 ile doğrulanmış tam içerik): canlıyla yalnızca 3 fark var, başka fark yok (`veri/tema-karsilastirma/settings-data-farki.txt`):
   - `enable_page_transition`: `true` → `false`
   - Wheelio kaydı yok (uygulama kaldırılmış; kayıt canlıda da "devre dışı")
   - GemPages kaydı yok (uygulama kaldırılmış; canlıdaki kayıt boşta, bir şey yüklemiyor)
5. **Diğer kopya temalar:**
   - "Prizma - 2026-10-19" kopyasında `config/settings_data.json` ve `layout/theme.liquid` canlıdan farklı; ikisi de bu pakette değişti. Prizma'daki `theme.liquid` canlıdan eski bir sürüm (stok notu öncesi). O tema ileride yayına alınacaksa bu iki dosya birleştirilmeli.
   - Daha eski kopyalar (10–19 Ekim) bu paketin değiştirdiği dosyaların eski sürümlerini taşıyor. Onlardan biri yayına alınırsa bu paketin değişiklikleri kaybolur.

## 11. Hangi ölçüm hangi tema sürümüyle alındı

| Ölçüm | Tema ve sürüm | Zaman (UTC, 23.10) |
|---|---|---|
| Lighthouse "önce", 21 tur | Canlı, 21.10 10:26 sürümü (değişmedi) | 13:30–14:15. İlk 10 tur yarıda kesilen zincirden, kalan 11 tur sonradan; hepsi aynı sürüm. |
| Lighthouse "sonra", 21 tur | Kopya, slider düzeltmesi sonrası son sürüm (slider dosyası 13:41) | 14:16–14:37 |
| Görünme anı: önce / sonra | Canlı / kopya son sürüm | 14:38–14:46 |
| İlk açılış video MB (4c): önce / sonra | Canlı / kopya son sürüm | 14:46–15:07 |
| Slider senaryosu (4d): önce / sonra | Canlı / kopya son sürüm | 15:07–15:10 |
| Couple landing DCL çözümlemesi | Canlı 13:21; kopya son sürüm 15:10 | |
| PSI 20 MB nedeni deneyleri | Canlı | 13:10–13:20 |
| Mozaik testleri | Canlı ve kopya son sürüm (mozaik dosyası slider düzeltmesinden önce son hâlini almıştı) | 13:55–14:02 |
| İşlev testleri (hero, slider, UGC, Save-Data/3G) | Kopya son sürüm | 14:04 |

- Kopyanın "sonra" ölçümlerinin hepsi aynı son sürümle alındı. Daha önceki sürümle alınmış tamamlanmış bir Chrome "sonra" ölçümü yoktu.
- Chromium ile alınan ilk ölçümler (H.264 yok) tablolarda kullanılmadı. Yalnızca bölüm 9'daki "neden kaçırdı" açıklamasında kanıt olarak geçiyor.
