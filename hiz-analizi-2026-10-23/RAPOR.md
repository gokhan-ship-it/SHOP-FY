# texttonext.com hız analizi (23.10.2026)

**Bu çalışmada hiçbir şey değiştirilmedi.**
- Hiçbir temaya dosya yüklenmedi (push yok), hiçbir tema yayına alınmadı (publish yok), dosya silinmedi.
- Shopify'daki görsellere ve ayarlara dokunulmadı. Mağazada yalnızca okuma sorguları çalıştı.
- `sayfa-gecis.js`, `gorsel-olcum.js` ve benzerleri **tema dosyası değil, ölçüm betiği**. Yalnızca siteyi bir ziyaretçi gibi açıp ölçüm alıyorlar; kopyaları `betikler/` klasöründe.
- Bu klasördeki commit yalnızca rapor, ölçüm verisi ve ölçüm betiklerini içeriyor; tema değişikliği yok.

## Test edilen sayfalar

Sayfalar sitemap.xml'de var ve 200 dönüyor. Seçim son 30 günün Shopify verisine göre yapıldı:
- Oturumların %96'sı telefondan: 44.018 oturumun 42.291'i mobil.
- Sosyal medyadan gelen oturumlar en çok bu sayfalara iniyor.

| Kısa ad | Adres | Neden seçildi (son 30 gün) |
|---|---|---|
| anasayfa | https://texttonext.com/ | En çok giriş: 27.153 oturum, 22.585'i sosyal medyadan |
| couple-landing | https://texttonext.com/pages/couple-daha-fazla-bilgi-al | Reklam açılış sayfası: 3.765 giriş, 3.294'ü sosyal |
| kunye | https://texttonext.com/products/zaman-kapsulu-kunye | Reklam açılış sayfası olan ürün: 2.311 giriş, 2.266'sı sosyal |
| astor-chloe-couple | https://texttonext.com/products/luna-aurora-couple-zaman-kapsulu-kopya | En çok satan: Astor + Chloe Couple, 37 adet |
| noir | https://texttonext.com/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya | 2. çok satan: Noir, 37 adet |
| kral-zincir | https://texttonext.com/products/zaman-kapsulu-bileklik-kral | Reklam açılış sayfası olan ürün: 1.221 giriş, 1.174'ü sosyal |
| couple-urunler | https://texttonext.com/collections/couple-urunler | En çok giriş alan koleksiyon: 1.373 giriş |

Canlı tema: **"Gumus stok notu - 2026-10-21" (ID 189316038976)**. Hem sayfa kaynağındaki `Shopify.theme` hem Admin API'deki `role: MAIN` bunu gösteriyor.

## 1. Özet

- **Masaüstü iyi, telefon zayıf.**
  - Masaüstünde Lighthouse puanı 86–92.
  - Telefonda puan 11–68. Ortanca LCP: ana sayfa 4,3 sn, ürün sayfaları 2,5–14,4 sn, Couple koleksiyonu 15,7 sn. TBT 1,3–1,5 sn.
- **En büyük 3 sorun:**
  1. **Sayfa geçiş perdesi telefonda içeriği saniyelerce saklıyor.** Temanın "sayfa geçişi" ayarı açık. Tam ekran siyah bir perde, sayfanın HTML'i ve betikleri bitene kadar (DOMContentLoaded) ekranı kaplıyor ve ardından 1 sn'lik solmayla kalkıyor. Yavaş telefon benzetiminde içerik 1,2–1,7 sn'de çiziliyor, perde ise sayfaya göre 4,4–15,1 sn'de kalkıyor (ortanca; reklam açılış sayfası couple-landing'de 15,1 sn).
  2. **Ana sayfanın en üstündeki tanıtım videosu telefonda 1080p (7,2 Mbps) dosyadan oynuyor.** Dosyanın tamamı 9,4 MB. Lighthouse'ta ilk açılışta 3,0–6,2 MB indi; bu, sayfanın toplam ağırlığının (7,9 MB) büyük kısmı.
  3. **Google etiketleri ve Meta pikseli telefonda ana iş parçacığını en çok meşgul eden kod.**
     - Google etiket betiği 3 ayrı kimlikle 5 kez iniyor: 831 KB.
     - Lighthouse'un uzun görev listesinde Google etiketi 0,9–1,0 sn, Meta pikseli 0,5–0,6 sn tutuyor. TBT'nin en büyük kalemleri bunlar.
- **Görseller ana sorun değil.**
  - Sayfalarda inen görsellerin tamamı Shopify CDN'den boyutlandırılmış olarak geliyor.
  - 7 MB'lık PNG orijaller bile telefona 88 KB WebP olarak iniyor.
  - Görsel tarafındaki gerçek sorunlar dar kapsamlı:
    - Couple koleksiyonunun en büyük görseli (LCP) geç yükleniyor (lazy).
    - Birkaç bölümde boyut bilgisi eksik.
    - Bazı "lifestyle" fotoğraflar CDN'den JPEG olarak 330–486 KB geliyor.

## 2. Bulgular (etkiye göre sıralı)

Kısaltmalar: **LCP** = sayfanın en büyük öğesinin çizildiği an; **TBT** = sayfanın dokunuşa cevap veremediği toplam süre; **CLS** = sayfa açılırken öğelerin kayma miktarı.

| # | Sorun | Kanıt | Etkisi | Çözüm önerisi | Zorluk | Risk |
|---|---|---|---|---|---|---|
| 1 | **Sayfa geçiş perdesi** telefonda ekranı DOMContentLoaded + 1 sn boyunca siyah tutuyor | `config/settings_data.json`: `"enable_page_transition": true` → `layout/theme.liquid:216-218` `loading-bar`'ı basıyor → `snippets/loading-bar.liquid:10-12` tam ekran sabit katman; `assets/theme.css:3123-3126` zemin = yazı rengi (#0A0A0A), z-index 50; `assets/theme.js:987-992` `page:loaded` olayını DOMContentLoaded'da atıyor, `assets/theme.js:1032-1040` perdeyi 1 sn'de soldurup gizliyor. **Ölçüm** (telefon 390 px, CPU 4×, 150 ms / 1,6 Mbit/s, 3 tur): aşağıdaki "Perde ölçümü" tablosu. Lighthouse'ta görsel ilerlemeyi gösteren Speed Index telefonda 5,3–9,5 sn (FCP 1,5–3,9 sn'ye karşı). | **Yüksek** | Tema düzenleyici → Tema ayarları → Animasyon bölümündeki sayfa geçişi kutusunu (`enable_page_transition`) kapatmak; kod değişikliği gerekmiyor. | Düşük | Sayfa açılışındaki siyah perde ve dönen simge kalkar. Aynı özniteliğe bir şey daha bağlı: masaüstünde slayt gösterisinde animasyon yenileme (`assets/theme.js:6928`). Ölçülen sayfalarda slayt gösterisi bölümü yok. |
| 2 | **Ana sayfa tanıtım videosu telefonda 1080p** | `sections/hero-video-kapsul.liquid:525-533` `video_tag` (otomatik oynatma, `image_size: '1600x'`). Sayfa kaynağında tek kaynak var: `…HD-1080p-7.2Mbps…mp4`, dosya 9.579 KB. Lighthouse telefon: "media" 2.994–6.155 KB (3 tur), toplam ağırlık 7,9 MB. LCP öğesi bu videonun kapak görseli (`div.hv-media > video`). | **Yüksek** | Telefon için hafif bir sürüm (ör. 720p, ~1–2 MB) yükleyip telefonda onu göstermek; ya da telefonda yalnızca kapak görseli + dokununca oynatma. Kapak görseli 1600 px yerine srcset ile. | Orta | Video kalitesi telefonda düşer; bölüm ayarı ve şablon değişikliği gerekir. |
| 3 | **Google etiketleri (3 kimlik, 5 indirme) ve Meta pikseli** ana iş parçacığını en çok tutan kod | Sayfadaki `webPixelsConfigList`: Google & YouTube uygulama pikseli `G-X7489V6WBM`, `GT-5R6BRQ42`, `GT-17694036362`; Meta pikseli `721212069523126`; TikTok `CK1N3F3C77U1EKKFO1U0`; TrueProfit. Lighthouse telefon: `googletagmanager.com/gtag/js` 5 istek, 831 KB; uzun görevler: gtag 909–983 ms (5 görev), Meta `fbevents.js` + `signals/config` 503–617 ms, Shopify piksel yöneticisi `wpm/…js` 253–295 ms. Kullanılmayan JS: gtag'de 447 KB. | **Yüksek** | Google & YouTube uygulamasında hangi etiketlerin gerçekten kullanıldığını kontrol edip fazlasını kaldırmak (3 kimlikten biri ikinci kez yükleniyor: `&cx=c` istekleri). | Düşük–Orta (uygulama ve Google hesabı ayarı) | Yanlış etiket kaldırılırsa reklam dönüşüm ölçümü bozulur; reklam hesabıyla birlikte karar verilmeli. |
| 4 | **Couple koleksiyonunda LCP görseli `loading="lazy"`** | `sections/tt-couple-kapsul.liquid:782` `image_tag: loading: 'lazy'`. Lighthouse telefon: LCP öğesi `div.tt-ck-kapsul > img` (aurora1.webp), "LCP kaynakları lazy olmamalı" kontrolü **başarısız**, kaynak yükleme gecikmesi 1.352 ms; LCP ortanca 15,7 sn (turlar 4,4 / 15,7 / 15,9 sn). Playwright: 2 kapsül görseli ilk ekranda ve lazy. | **Yüksek** (bu sayfa için) | İlk ekrandaki kapsül görsellerine `loading: 'eager'` ve ilkine `fetchpriority: 'high'`. | Düşük | Düşük; yalnızca bu bölümün ilk görselleri daha erken iner (5–8 KB). |
| 5 | **Ürün sayfalarında ara sıra büyük kayma (CLS 0,937)** | Lighthouse telefon, 3 turdan: kral-zincir 2'sinde, kunye ve noir 1'inde CLS 0,937; kayan öğe her seferinde `footer.footer-group` (906 px yüksek). Aynı turlarda ilk boyama da gecikti (gözlenen FCP 1,4–2,5 sn, diğer turlarda 0,5–0,7 sn). Kendi tarayıcı ölçümümde (9 açılış, 7 sn bekleme) ürün sayfalarında CLS 0,004–0,009; tekrar etmedi. | **Yüksek** (olduğunda) | Önce kök neden: ilk boyamada ürün içeriğinin neden boş kaldığını bir performans izi (trace) ile yakalamak. Düzeltme ondan sonra. | Bilinmiyor | — |
| 6 | **HTML çok büyük; CSS ve JS'in çoğu sayfanın içine gömülü** | Ham HTML: ana sayfa 415 KB, couple-landing 531 KB, ürünler 429–459 KB, couple-urunler 606 KB (sıkıştırılmış 76–107 KB). Gömülü CSS 83–200 KB, gömülü JS 82–156 KB. En büyükleri: `couple_bulusma` 23 KB CSS + 21 KB JS, `guclu_header` 21 KB CSS, `mozaik_kartlar` 16–17 KB CSS, `tt_baslik` 13–14 KB CSS (her sayfada). Lighthouse telefon "Style & Layout" 3,7–8,2 sn. | Orta | Bölüm CSS'lerini önbelleğe alınabilen `assets/*.css` dosyalarına taşımak; her sayfada tekrar eden bölümlerden (tt-baslik, tt-menu, footer) başlamak. | Yüksek (çok dosya) | Orta: stil sırası değişirse görünüm kayabilir; bölüm bölüm test gerekir. |
| 7 | **Sayfa hiç "durulmuyor": sürekli çalışan animasyon ve sayaçlar** | Lighthouse telefon: 21 turun 20'sinde iz 60 sn sınırına kadar sürdü (`observedTraceEnd` ≈ 60.000 ms; ağ ve işlemci hiç boşalmadı). Toplam işlemci süresi: `ttn-cark.js` 2,2–5,4 sn (betik 0,42–1,23 sn), couple-urunler'de `tt-ck-sahne.js` 8,9 sn. Kayma kayıtlarında couple-urunler'de `tt-ck-sayac-etiket` ve `tt-ck-delta` her ~4 sn'de bir yeniden diziliyor (46 sn'de 57 kayma kaydı). | Orta | Ekranda görünmeyen animasyonları ve sayaçları durdurmak (IntersectionObserver, sekme gizliyken `visibilitychange`). | Orta | Çark sayacı ve kapsül animasyonunun davranışı değişebilir; test gerekir. |
| 8 | **Shopify Inbox sohbeti ve "Shop ile giriş" betikleri** | Inbox app embed açık (`settings_data`: `apps/inbox/blocks/chat`, `disabled: false`): `chat.js` 22,8 KB + `agent-runtime` 41,8 KB + head'de 14,8 KB gömülü JSON. Shop girişi / Shop Pay: `shop.app`, `login_with_shop`, `arrive-server/pay` toplam 107 istek, 194 KB (ilk istek ~1,3 sn'de). | Orta | Sohbetin gerçekten kullanılıp kullanılmadığına bakmak; Shop ile giriş isteminin ayarını gözden geçirmek. | Düşük (ayar) | Sohbet ve hızlı giriş özelliği kaybolur. |
| 9 | **Bazı "lifestyle" ürün fotoğrafları CDN'den JPEG geliyor (WebP'ye dönmüyor)** | Aynı adres art arda 2 kez istendi, iki seferde de aynı sonuç geldi: `astor-chloe-05-lifestyle-2.jpg?width=1200` → `image/jpeg` 486 KB; `noir-05-lifestyle-2.jpg` 1200 → 339 KB JPEG; 800 px'te 127–177 KB JPEG. Aynı ürünün packshot'ı 1200 px'te 49 KB WebP. Orijinaller 1856×2304 JPEG, 568–1.133 KB. Telefonda galeride kaydırınca iniyor. | Orta | Bu dosyaları daha az "gren"li ya da WebP olarak yeniden dışa aktarıp yüklemek. | Düşük | Görsel kalitesi kontrol edilmeli. |
| 10 | **Video kapak görselleri sabit boyutlu ve srcset'siz; görünmeyen videoların kapakları da iniyor** | `sections/hero-video-kapsul.liquid:527` `image_size: '1600x'` (telefonda 380 px gösteriliyor); `sections/video-slider-kapsul.liquid:412-413` `image_size: '1200x'` (kapaklar 1080 px, 37–104 KB); `sections/mozaik-kartlar.liquid:670-671` `image_size: '900x'` (görünür boyutu 0 olan 3 video kapağı 45–176 KB). | Orta | Kapakları `image_url` + `widths`/`sizes` ile basmak; görünmeyen slaytlarda kapağı sonradan yüklemek. | Orta | Düşük. |
| 11 | **Couple sayfasında küçük fotoğraflar 600 px iniyor** | `sections/couple-bulusma.liquid:793-799` ve `846-852`: srcset'siz `<img src="… width: 600">`. Telefonda 108 px gösteriliyor (gereken 324 px): 8 görsel 527 KB (en büyüğü 6.jpg 135 KB JPEG). | Düşük–Orta | `image_tag` + `widths: '200,300,400,600'` + `sizes`. | Düşük | Düşük. |
| 12 | **Mozaik kartlarda `sizes` yok** | `sections/mozaik-kartlar.liquid:681-682` ve `709-710`: `widths: '300, 500, 700, 900'` var, `sizes` yok → tarayıcı tam genişlik varsayıyor. Telefonda 174 px yerine 900 px iniyor (gereken 522): `boyunda.png` 206 KB, 2 AI görseli 57–88 KB. | Düşük | Gerçek kart genişliğine uyan `sizes`. | Düşük | Düşük. |
| 13 | **Ürün galerisinde masaüstü `sizes` değeri gerçek genişlikten büyük** | `snippets/product-media-gallery.liquid:95` `… 75vw`; masaüstünde görseller 292 px gösteriliyor ama 1200 px iniyor (4,1 kat): noir 1.273 KB, kral-zincir 1.479 KB, astor-chloe 1.720 KB fazla indirme. Telefonda bu sorun yok (oran ≤ 1,14). | Düşük (trafiğin %4'ü masaüstü) | `sizes`'ı galeri düzenine göre düzeltmek. | Düşük | Düşük. |
| 14 | **Küçük boyut eksikleri** | `sections/tt-catal-karsilastirma.liquid:293,318` `width: 800`, `sizes` yok (telefonda 146 px'te 800 px, 43 KB); `sections/tt-secim-kartlari.liquid:1378-1382` masaüstünde 272 px'e 600 px (10 görsel, 666 KB; en büyükleri 76–91 KB JPEG). | Düşük | `sizes` eklemek. | Düşük | Düşük. |
| 15 | **Ana sayfada ilk ekrandaki 3 "Çok satanlar" görseli lazy** | `sections/tt-cok-satanlar.liquid:806-810` `loading: 'lazy'`; Playwright: 3 görsel ilk ekranda, 15–18 KB, 156 px. LCP öğesi değiller (LCP video kapağı). | Düşük | İlk 2–3 karta `eager`. | Düşük | Düşük. |
| 16 | **Kaldırılan uygulamalardan kalanlar** | GemPages: temada 168 dosya, 8,3 MB (`gp-*`, `page.gp-template-*`, `layout/theme.gempages.*`); yayındaki sayfaların hiçbiri kullanmıyor, ziyaretçiye inmiyor. `settings_data.json` içinde silinmiş GemPages embed kaydı → ana sayfada görünmeyen "Failed to render app block" yorumu. **TrueProfit hâlâ kurulu** (`appInstallations`) ve pikseli çalışıyor (`wpx.svc.trueprofit.io`). TinySEO bugün UTC ~10:40'taki sorguda hâlâ listedeydi, UTC ~12:10'daki sorguda yok; sayfalarda izi yok. Wheelio embed kayıtlı ama kapalı (yüklenmiyor). `snippets/tt-kupon-cubugu.liquid` çağrılmıyor (`layout/theme.liquid:356-364`). | Düşük | Taslak temada GemPages dosyalarını ve embed kaydını temizlemek; TrueProfit'i kaldırmaya karar verilirse uygulamadan. | Düşük | GemPages şablonlu 5 gizli sayfa bu dosyalara bağlı; silmeden önce o sayfalar için karar gerekir. |
| 17 | **Yapısal veri: Organization, WebSite ve BreadcrumbList yok** (hız değil, SEO) | Ürün sayfalarında Product/ProductGroup + FAQPage var (aşağıda). Ana sayfada JSON-LD yok; yalnızca header logosunda Organization mikroverisi (`snippets/header-logo.liquid:67,71`, sadece `url` ve `logo`). BreadcrumbList hiçbir sayfada yok. Couple koleksiyonunda CollectionPage de yok (şablonda `main-collection` kapalı). | Orta (SEO) | Organization + WebSite: `layout/theme.liquid` içinde, yalnızca ana sayfada basılan yeni bir snippet. BreadcrumbList: `sections/main-product.liquid:1109` yanına ve koleksiyon şablonlarındaki bölümlere. | Düşük | Düşük. |

### Perde ölçümü (bulgu 1)

Telefon 390×844, DPR 3, CPU 4× yavaş, ağ 150 ms gecikme ve 1,6 Mbit/s indirme. Her sayfa 3 kez açıldı. Değerler ms cinsinden; sayfa açılmaya başladığı andan sayılıyor.

| Sayfa | FCP | LCP | DOMContentLoaded | Perde solmaya başlıyor | Perde tamamen kalkıyor | load |
|---|---|---|---|---|---|---|
| anasayfa | 1.180 (1.124–1.440) | 1.240 (1.196–1.784) | 4.586 (3.747–6.809) | 4.314 (3.887–4.742) | **5.264** (4.854–5.675) | 16.837 (16.624–17.046) |
| couple-landing | 1.384 (1.380–1.452) | 1.452 (1.440–1.552) | 13.923 (13.696–13.927) | 14.269 (13.914–14.279) | **15.080** (14.820–15.137) | 20.745 (20.364–20.986) |
| kunye | 1.424 (1.392–1.436) | 1.544 (1.444–1.560) | 3.234 (3.012–3.401) | 3.428 (3.210–3.699) | **4.426** (4.105–4.636) | 13.240 (13.188–13.722) |
| astor-chloe-couple | 1.468 (1.372–1.604) | 1.572 (1.476–1.736) | 3.387 (3.264–3.551) | 3.579 (3.487–3.740) | **4.501** (4.325–4.662) | 18.158 (18.150–18.432) |
| noir | 1.452 (1.432–1.456) | 1.504 (1.452–1.592) | 3.409 (3.202–3.502) | 3.642 (3.376–3.787) | **4.490** (4.272–4.691) | 15.761 (10.177–15.883) |
| kral-zincir | 1.428 (1.412–1.480) | 1.484 (1.428–1.536) | 3.423 (3.347–3.599) | 3.645 (3.639–3.972) | **4.539** (4.514–5.186) | 15.495 (15.135–15.981) |
| couple-urunler | 1.708 (1.468–1.720) | 3.844 (3.696–4.120) | 4.516 (3.758–4.611) | 5.091 (4.193–5.338) | **5.832** (5.436–6.024) | 16.302 (16.000–16.349) |

Ortanca (en düşük–en yüksek). 21 açılışın hepsinde perde vardı.
- **Ne görülüyor:** Tarayıcı içeriği 1,1–1,7 sn'de çiziyor (FCP/LCP), ama ziyaretçi bu sürede siyah perdeyi ve dönen simgeyi görüyor. İçerik ancak perde kalkınca görünür hale geliyor:
  - ürün sayfalarında 4,4–4,5 sn,
  - ana sayfada 5,3 sn,
  - Couple koleksiyonunda 5,8 sn,
  - reklam açılış sayfası couple-landing'de 15,1 sn.
- **couple-landing'de neden bu kadar geç:** Bu sayfada DOMContentLoaded 13,9 sn'ye kadar geç kalıyor. Bu ölçümde DOMContentLoaded'ı neyin geciktirdiği ayrıca ölçülmedi. Bilinenler: sayfanın HTML'i 531 KB, içine gömülü 156 KB JS ve 200 KB CSS var.
- **Lighthouse ile ilişkisi:** Lighthouse'un LCP'si bu perdeyi hesaba katmıyor (perde düz renk katman). Görsel ilerlemeyi ölçen Speed Index ise telefonda 5,3–9,5 sn.

### Lighthouse ortanca değerleri (3 tur)

Lighthouse 13.5.0, yerel Chromium:
- **Telefon:** varsayılan ayar (412 px Moto G benzetimi, 4× CPU, benzetilmiş yavaş 4G).
- **Masaüstü:** `--preset=desktop`.
- Parantez içinde 3 turun en düşük ve en yüksek değeri var. Turlar arasında fark büyük; özellikle ürün sayfalarında bir tur "kötü" geliyor (bulgu 5).

Telefon:

| Sayfa | Puan | FCP | LCP | TBT | CLS | Speed Index | Ağırlık | İstek |
|---|---|---|---|---|---|---|---|---|
| anasayfa | 55 (46–63) | 1,5 sn | 4,3 sn (3,4–4,3) | 1.496 ms | 0,047 (0,001–0,047) | 5,5 sn | 7,9 MB | 477 |
| couple-landing | 49 (39–54) | 1,8 sn | 5,5 sn (4,5–10,7) | 1.344 ms | 0,049 (0,012–0,060) | 5,6 sn | 3,8 MB | 478 |
| kunye | 68 (13–70) | 1,7 sn | 2,5 sn (2,5–10,5) | 1.422 ms | 0,009 (0,005–0,940) | 5,3 sn | 3,0 MB | 503 |
| astor-chloe-couple | 50 (39–51) | 1,6 sn | 5,0 sn (4,7–10,1) | 1.342 ms | 0,001 (0,000–0,003) | 5,8 sn | 3,6 MB | 510 |
| noir | 52 (15–54) | 2,7 sn | 4,1 sn (4,0–10,1) | 1.479 ms | 0,003 (0,001–0,940) | 5,5 sn | 3,2 MB | 502 |
| kral-zincir | 11 (10–54) | 3,8 sn | 14,4 sn (4,1–15,5) | 1.494 ms | 0,937 (0,005–0,937) | 7,2 sn | 3,2 MB | 502 |
| couple-urunler | 29 (28–49) | 3,9 sn | 15,7 sn (4,4–15,9) | 1.459 ms | 0,131 (0,046–0,131) | 9,5 sn | 3,5 MB | 499 |

Masaüstü:

| Sayfa | Puan | FCP | LCP | TBT | CLS | Speed Index | Ağırlık | İstek |
|---|---|---|---|---|---|---|---|---|
| anasayfa | 92 (91–92) | 0,6 sn | 1,3 sn (1,1–1,5) | 92 ms | 0,037 | 1,9 sn | 6,1 MB | 478 |
| couple-landing | 91 (89–93) | 0,7 sn | 1,5 sn (1,3–1,5) | 98 ms | 0,037 | 1,9 sn | 3,8 MB | 484 |
| kunye | 91 (90–94) | 0,6 sn | 1,3 sn (1,1–1,3) | 95 ms | 0,000 | 2,2 sn | 3,1 MB | 502 |
| astor-chloe-couple | 88 (86–89) | 1,0 sn | 1,5 sn (1,5–1,7) | 107 ms | 0,000 | 2,2 sn | 4,2 MB | 506 |
| noir | 89 (89–90) | 0,7 sn | 1,3 sn (1,3–1,4) | 140 ms | 0,000 | 2,2 sn | 3,7 MB | 502 |
| kral-zincir | 88 (87–90) | 0,6 sn | 1,6 sn (1,3–1,6) | 104 ms | 0,001 | 2,2 sn | 3,9 MB | 497 |
| couple-urunler | 86 (84–89) | 0,9 sn | 1,3 sn (1,2–1,4) | 150 ms | 0,037 | 2,7 sn | 3,1 MB | 508 |

**LCP öğesi (telefon)**

| Sayfa | LCP öğesi | Lazy mi | fetchpriority | Ön yükleme | İnen boyut |
|---|---|---|---|---|---|
| anasayfa | Tanıtım videosunun kapağı (`div.hv-media > video`, kapak 1600 px JPEG) | Hayır | Yok ("fetchpriority=high uygulanmalı" kontrolü başarısız) | HTML'de bulunabiliyor | Kapak 18,9 KB; video 1080p |
| couple-landing | `div.gh-medya > picture > img` (ii2.jpg) | Hayır (eager) | high | HTML'de bulunabiliyor | 1200 px WebP, 27,9 KB |
| kunye | Galeri ilk görseli (Urun2altin-690994.png) | Hayır | high | HTML'de bulunabiliyor | 1000 px WebP, 19,5 KB |
| astor-chloe-couple | Galeri ilk görseli (astor-chloe-01-packshot.jpg) | Hayır | high | HTML'de bulunabiliyor | 1200 px WebP, 48,9 KB |
| noir | Galeri ilk görseli (noir-01-packshot.jpg) | Hayır | high | HTML'de bulunabiliyor | 1200 px WebP, 39,0 KB |
| kral-zincir | Galeri ilk görseli (kral-zincir-01-packshot.jpg) | Hayır | high | HTML'de bulunabiliyor | 1200 px WebP, 44,8 KB |
| couple-urunler | Kapsül görseli (aurora1.webp) | **Evet** | Yok | HTML'de bulunabiliyor | 320 px |

Ürün galerisinin ilk görseli doğru ayarlı: `snippets/product-media-gallery.liquid:176` `preload: true` gönderiyor, `snippets/media.liquid` bunu `loading="eager"` ve `fetchpriority="high"` yapıyor. Telefonda gereken 1.050 px'e karşı 1.200 px iniyor.

## 3. Görseller

### Sayfalarda inen görseller
Tam liste (her görsel için kaynak, biçim, inen ve gösterilen piksel, KB, lazy/eager, ilk ekranda mı, bölüm dosyası): `veri/sayfa-gorselleri.csv`.

Ölçüm Playwright ile yapıldı:
- Telefon 390×844 DPR 3, masaüstü 1440×900 DPR 1.
- Sayfa sonuna kadar kaydırıldı, böylece lazy görseller de indi.
- "Gereken piksel" = gösterilen CSS genişliği × DPR.

| Sayfa (telefon) | Görsel | Toplam | Biçim | 1,5 katından büyük inen |
|---|---|---|---|---|
| anasayfa | 37 | 981 KB | 32 WebP, 5 AVIF | 4 görsel, 394 KB (mozaik-kartlar, tt-catal-karsilastirma) |
| couple-landing | 49 | 1.872 KB | 39 WebP, 9 AVIF, 1 JPEG | 8 görsel, 527 KB (couple-bulusma) |
| kunye | 41 | 586 KB | 36 WebP, 5 AVIF | yok |
| astor-chloe-couple | 41 | 1.699 KB | 35 WebP, 5 AVIF, 1 JPEG | küçük resimler (62 px'e 400 px), 170 KB |
| noir | 40 | 1.365 KB | 34 WebP, 5 AVIF, 1 JPEG | küçük resimler, 122 KB |
| kral-zincir | 41 | 1.352 KB | 36 WebP, 5 AVIF | küçük resimler, 170 KB |
| couple-urunler | 96 | 3.355 KB | 88 WebP, 6 JPEG, 2 AVIF | yok |

**Kaynak türü:** Ölçülen 7 sayfadaki görsellerin tamamı Shopify CDN'den boyutlu (`image_url`, `width=`) ya da video kapağı (`preview_images`) olarak geliyor.
- Boyutsuz orijinal ya da tema `asset_url`'si ile gelen görsel yok.
- Harici olanlar yalnızca `shop.app` ve `googleadservices.com` takip pikselleri.

**CSS arka plan görseli:** Her görünümde (telefon, masaüstü) 2 tane, hepsi küçük.

**Ekranın üstünde lazy yüklenenler:**
- Ürün sayfalarında galerinin ikinci slaytı ve küçük resimler ilk ekranda lazy. Bunlar LCP öğesi değil, sorun değil.
- Gerçek sorun olan ikisi bulgu 4 (couple-urunler LCP) ve bulgu 15 (ana sayfa çok satanlar).

### srcset / sizes sistemini atlayanlar

Bu temada `snippets/responsive-image.liquid` ve `snippets/image-srcset.liquid` **yok**. Görseller Shopify'ın `image_tag` filtresiyle (widths/sizes) ya da bölümlerdeki elle yazılmış `<img>` ile basılıyor.

| Dosya:satır | Ne yapıyor | Ölçülen |
|---|---|---|
| `sections/couple-bulusma.liquid:793-799`, `846-852` | srcset yok, sabit 600 px | 108 px'te 600 px, 527 KB |
| `sections/couple-bulusma.liquid:747,757,811,863` | srcset yok, 60–120 px avatarlar | 2–4 KB, sorun değil |
| `sections/apple-slayt.liquid:391-408` | srcset yok, 900 / 1200 px | masaüstünde 380 px'te 1200 px (80 KB) |
| `sections/adim-yigin.liquid:637,649-650,664,689` | görseller ve video kapakları 1400 / 900 px, `sizes` yok | telefonda 342 px'te 1.200 px (gereken 1.026, sorun değil); masaüstünde 588 px'te 1.400 px, 66–125 KB |
| `sections/hero-video-kapsul.liquid:527` | video kapağı 1600 px | LCP öğesi; 18,9 KB |
| `sections/video-slider-kapsul.liquid:412-413` | video kapağı 1200x | 1080 px kapak, 37–104 KB |
| `sections/mozaik-kartlar.liquid:670-671` | video kapağı 900x | görünmeyen 3 kapak, 45–176 KB |
| `sections/mozaik-kartlar.liquid:681-682`, `709-710` | widths var, sizes yok | 174 px'te 900 px |
| `sections/tt-catal-karsilastirma.liquid:293,318` | width 800, sizes yok | 146 px'te 800 px |
| `sections/tt-baslik.liquid:544`, `sections/tt-menu.liquid` | logo `height: 120`, srcset yok | 4,9 KB, sorun değil |
| `snippets/product-media-gallery.liquid:95` | sizes masaüstünde 75vw | masaüstünde 292 px'te 1200 px |

### Shopify'daki görsellerin envanteri

Tam liste: `veri/gorsel-envanter.csv`. Ürün medyası ve Files'ın tamamı, Admin API ile çekildi: 84 ürün, 2.142 dosya.

- **Toplam:** 1.819 görsel, 1.530 MB. Bunların 616'sı ürünlerde kullanılıyor.
- **1 MB'tan büyük:** 428 görsel. Ürün görsellerinde 52.
- **2.500 px'ten geniş:** 136 görsel. Ürün görsellerinde 0.
- **PNG:** 744 görsel (bölme ölçütü aşağıda):
  - **Fotoğraf (saydamlık yok):** 304 dosya, 566 MB; 216'sı 1 MB'tan büyük; 30'u ürün görseli. Örnekler: AI (`hf_…`) görselleri 3–7 MB, `Baby_Tag*.png` 8–12 MB, `PAYLAS.png` 6,2 MB, `banner.png` 6,8 MB.
  - **Saydam arka planlı:** 160 dosya, 141 MB.
  - **Grafik / düz renk alanlı:** 280 dosya, 164 MB.
- **Bölme ölçütü:** Her PNG'nin 256 px'lik küçük kopyası indirildi. Saydam piksel oranı %1'in altında **ve** yan yana piksellerin aynı olma oranı 0,5'in altındaysa "fotoğraf" sayıldı. Ölçüt kaba: arka planı düz renk olan fotoğraflar "grafik" tarafına düşebilir. Değerler CSV'de (`png_komsu_esit`, `png_saydam_oran`).

### Envanter × ölçüm: büyük dosyalar sorun mu?

Ölçülen sayfalarda orijinali 1 MB'tan büyük **28 farklı görsel** var. Hepsi CDN'den küçültülerek iniyor; hiçbiri olduğu gibi inmiyor.

- **Sorun değil** (orijinal büyük ama CDN küçültüp veriyor):

  | Dosya | Orijinal | İnen |
  |---|---|---|
  | hf_20260805_172848….png | 7.105 KB | 88 KB WebP (900 px) |
  | hf_20260805_171225….png | 6.642 KB | 57 KB WebP |
  | yeni_site2.png | 2.229 KB | 9 KB |
  | 1F.jpg / 2F.jpg | 2.027 / 1.871 KB | 59 / 67 KB WebP |
  | CUZDAN1–3.png | 1,3–1,7 MB | 4–10 KB |

  Ürün packshot'ları 1200 px'te 39–49 KB WebP.
- **Küçültülüyor ama hâlâ ağır:**

  | Dosya | Orijinal | İnen | Bulgu |
  |---|---|---|---|
  | boyunda.png | 2.150 KB | 206 KB WebP (900 px) | 12 |
  | noir-05-lifestyle-2.jpg | 1.133 KB | 331–339 KB **JPEG** (1200 px) | 9 |
  | astor-chloe-05-lifestyle-2.jpg | 568 KB | 486 KB **JPEG** (1200 px) | 9 |
  | hf_20260622_161039….png | 1.059 KB | 125 KB WebP (1400 px) | 10 / 11 |

- **Sitedeki en büyük dosyalar ölçülen sayfalarda görünmüyor:** Baby_Tag 11,6 MB, fotograf_753.jpg 9,5 MB, gokhan_191.jpg 8,8 MB. Bunlar yalnızca depolama yükü; ziyaretçiye inmiyor.

### Videolar

| Sayfa | Bölüm | Dosya (tam boy) | Otomatik oynatma | preload | Kapak | Lighthouse'ta inen |
|---|---|---|---|---|---|---|
| anasayfa | hero_video_kapsul | HD-1080p 7,2 Mbps, 9.579 KB | Evet (sessiz, döngü) | metadata | 1600 px | 2.994–6.155 KB |
| anasayfa, couple-landing | video_slider_kapsul (4 video) | 1080p 3,3–4,8 Mbps, 2,0–2,9 MB | Hayır | metadata | 1080 px | 1–132 KB |
| couple-landing, astor-chloe-couple | mozaik_kartlar (3 video) | 1080p 7,2 Mbps, 26,4–29,2 MB | Hayır | metadata | 900 px | yalnızca üst veri |
| kunye, noir, kral-zincir | ugc_galeri_1 (4 video) | 1080p 2,5 Mbps, 6,5–17,5 MB | Hayır (adresler data özelliğinde, tıklayınca) | — | 400 px | 0 |

Videolar Shopify'ın `video_tag` filtresiyle basılıyor ve tek bir 1080p MP4 kaynağı veriyor; telefona daha düşük çözünürlük seçeneği sunulmuyor. Bu, yalnızca otomatik oynayan ana sayfa videosunda sorun yaratıyor (bulgu 2).

`loading="lazy"` özelliği `<video>` etiketinde tarayıcılar tarafından tanınmıyor (`video-slider-kapsul`). Zararı yok, ama işe de yaramıyor.

## 4. Görsel dışı konular

**`<head>`'de render'ı bloklayan dosyalar**
- Yalnızca `theme.css` (41,7 KB sıkıştırılmış / 289 KB ham) ve `custom-tt.css` (1,3 KB).
- Lighthouse ikisi için de 0 ms gecikme ölçtü (önceden yükleniyor: `stylesheet_tag: preload: true`, `layout/theme.liquid:43`).
- `apps.css` asenkron (`layout/theme.liquid:50`). Bütün tema JS'leri `defer` (`layout/theme.liquid:196-199`).
- Couple koleksiyonunda `ttn-cark.css` (2,4 KB) da bloklayan listesinde, 0 ms.
- Typekit ve `<head>`'e yazılmış GTM bu temada **yok**. Google etiketi uygulama pikselinden geliyor (bulgu 3).

**Sayfa geçişi:** Bulgu 1. Brifte geçen `show_page_transition` ayarının bu temadaki karşılığı `enable_page_transition`. Davranış briften farklı: perde window load'a ya da en fazla 2 sn'ye kadar değil, **DOMContentLoaded + 1 sn**'ye kadar kalıyor.

**Üçüncü taraf ve platform kodu (ana sayfa, telefon)**

| Kaynak | Ne | İstek / boyut | Ana iş parçacığı |
|---|---|---|---|
| Google (Google & YouTube uygulaması) | gtag.js, 3 kimlik | 5 istek, 831 KB | uzun görevler 909–983 ms |
| Meta (Facebook & Instagram uygulaması) | fbevents.js + signals/config | 2 istek, 277 KB | uzun görevler 503–617 ms |
| TikTok pikseli | analytics.tiktok.com | 2 istek, 47 KB | ölçülemedi (ayrı kalem çıkmadı) |
| TrueProfit pikseli | sandbox worker | ~1 KB | — |
| Shopify piksel yöneticisi | `cdn/wpm/…js` | 83 KB | uzun görevler 253–295 ms |
| Shopify Inbox (app embed) | chat.js + agent-runtime vb. | ~70 KB + 14,8 KB gömülü JSON | — |
| Shop ile giriş / Shop Pay | shop.app, login_with_shop, arrive-server | 107 istek, 194 KB | — |
| Shopify ödeme ön yüklemesi | `/checkouts/internal/preloads.js` → `checkout-web/assets` | 167 istek, 951 KB, öncelik VeryLow, sayfa yüklendikten sonra (2,28 sn'den 14,4 sn'ye) | — |

Wheelio app embed kayıtlı ama kapalı. ManyChat ve WhatsApp betiği yok; WhatsApp yalnızca bir link (`wa.me`).

**Tema JS/CSS dosyaları**

| Dosya | Ham | Sıkıştırılmış | Nerede yükleniyor |
|---|---|---|---|
| theme.js | 191 KB | 35,6 KB | Her sayfa |
| vendor.js | 88 KB | 26,7 KB | Her sayfa |
| theme.css | 289 KB | 41,7 KB | Her sayfa |
| apps.css | 55 KB | 6,5 KB | Her sayfa, asenkron |
| taksit-tablosu.js | 43 KB | 7,8 KB | Her sayfa (`snippets/tt-yapilandirma.liquid:228`); indirim katmanı bütün sayfalarda kullanılıyor |
| ttn-cark.js / ttn-cark.css | 26 / 12 KB | 4,5 / 2,4 KB | Her sayfa (`sections/ttn-cark-genel.liquid:57,97`); çark sayacı bütün sayfalarda sürüyor (`layout/theme.liquid:226-251`) |
| cart.js, search.js | — | 4,1 / 1,8 KB | Her sayfa (sepet çekmecesi ve arama header'da) |
| tt-nasil-calisir.js/.css | — | 2,7 / 2,5 KB | Yalnızca ana sayfa |
| tt-cs-carousel.js | — | 1,8 KB | Yalnızca ana sayfa |

Brifte geçen `kisisel-*.js` dosyaları bu temada yok. Her sayfada yüklenip hiç kullanılmayan bir tema dosyası bulmadım.

Lighthouse'un "kullanılmayan JS" listesinin başında tema dosyaları değil, gtag (5 dosyada toplam 447 KB) ve Meta (78 KB) var.

**Fontlar**
- Poppins, Shopify font CDN'inden yükleniyor; `font-display: swap` (`snippets/css-variables.liquid:15-27`).
- Gövde ve başlık fontu ön yükleniyor (`snippets/css-variables.liquid:246,251`).
- Sayfa başına 4–5 woff2 dosyası, 40–51 KB.
- Lighthouse font-display kontrolünde sorun yok.
- `sections/guclu-header.liquid:147-149` Google Fonts'tan Archivo yüklüyor, ama yalnızca `baslik_font == 'archivo'` olduğunda. Ölçülen sayfalarda ayar "tema", yani yüklenmiyor.

**Kaldırılan uygulamaların kalıntıları:** Bulgu 16. Tema dosyalarında TinySEO ve TrueProfit için snippet ya da betik etiketi yok. `wheelio` geçen yerler temanın kendi çark kodundaki çerez adları ve açıklamalar (`assets/ttn-cark.js`, `sections/ttn-spin-wheel.liquid`).

## 5. Yapısal veri (TinySEO kontrolü)

23.10.2026 10:59 UTC'de canlı sayfalardan okundu. Ayrıntı: `veri/yapisal-veri.json`.

| Sayfa | JSON-LD | Not |
|---|---|---|
| kunye, noir, kral-zincir | ProductGroup + FAQPage | name, brand "Text To Next", her varyantta image, price, priceCurrency TRY, availability InStock. Üst düzeyde image yok; varyantlarda var. sku boş. |
| astor-chloe-couple | Product + FAQPage | name, brand, image, price 2898.00 TRY, InStock |
| anasayfa | yok | Yalnızca header logosunda Organization mikroverisi (url + logo) |
| couple-urunler, couple-landing | yok | — |

- **Product şeması temanın kendi kodundan geliyor, TinySEO'dan değil.**
  - Kaynak `sections/main-product.liquid:1109-1110`: `{{ product | structured_data }}`, Shopify'ın yerleşik filtresi.
  - FAQPage `sections/faq.liquid:218`'den geliyor.
  - Kanıt: 17.10.2026'da TinySEO kuruluyken kaydedilmiş canlı sayfa kopyalarında da aynı iki blok var (ürün sayfası: 2 blok; ana sayfa ve diğer sayfalar: 0).
  - TinySEO'nun kaldırılması yapısal veride bir şey eksiltmedi.
- **Product şeması var, bu yüzden "yüksek öncelik" değil.**
- **Organization, WebSite ve BreadcrumbList yok,** TinySEO kuruluyken de yoktu. Bulgu 17'de hangi dosyaya ekleneceği yazılı. Düzeltme uygulanmadı.

## 6. "Sorun değil" listesi

- **Sunucu yanıtı hızlı:** ilk bayt 0,12–0,25 sn (curl); Lighthouse'ta belge yanıtı 40 ms.
- **Görsel teslimi:** Ölçülen sayfalarda bütün görseller CDN'den boyutlu ve çoğunlukla WebP/AVIF. Ham orijinal inen görsel yok. 1 MB'tan büyük orijinallerin hepsi küçültülerek iniyor.
- **Ürün sayfası LCP görseli:** eager + fetchpriority=high, HTML'de hemen bulunuyor, telefonda doğru boyutta (1.050 px gerekene 1.200 px), 39–49 KB WebP.
- **Ürün görselleri envanteri:** 616 ürün görselinin hiçbiri 2.500 px'ten geniş değil.
- **Render'ı bloklayan:** yalnızca 2 CSS, ölçülen gecikme 0 ms. Bütün tema JS'leri defer.
- **Fontlar:** swap, ön yükleme, toplam 40–51 KB.
- **Ana sayfa dışındaki videolar:** otomatik oynamıyor, `preload="metadata"`. 26–29 MB'lık dosyalar ancak oynatılınca iniyor.
- **CLS:** Ürün sayfaları dışında ortanca 0,05'in altında. Kendi ölçümümde 21 açılışın hepsinde 0,05'in altında.
- **GemPages:** Hiçbir sayfada GemPages isteği yok (kaldırma sonrası 62/62 kontrol).
- **Masaüstü:** bütün sayfalarda 86–92 puan.
- **Shopify ödeme ön yüklemesi** (951 KB, 167 istek): Sayfa yüklendikten sonra ve en düşük öncelikle iniyor, ilk görüntüyü geciktirmiyor. Shopify'ın kendi özelliği, temadan kapatılamıyor. Telefon verisi tüketiyor.

## 7. Ölçülemeyenler ve nedenleri

- **CrUX (gerçek kullanıcı) verisi:**
  - PageSpeed Insights API bugünkü kotayı doldurmuştu ("Queries per day" 429).
  - CrUX API anahtar istiyor (403).
  - BigQuery için bu ortamda proje yok.
  - Raporda bu yüzden saha verisi yok, yalnızca laboratuvar verisi var.
  - Shopify yönetimindeki "Web performansı" raporu gerçek kullanıcı ölçümü verir; bu bağlantıyla okunamıyor. Elle bakılması önerilir.
- **INP:** Gerçek dokunuş gerektiriyor. Laboratuvarda yerine TBT verildi.
- **Ürün sayfalarındaki CLS 0,937'nin kök nedeni:** Lighthouse turlarının bir kısmında oldu, kendi 9 açılışımda tekrar etmedi. Lighthouse JSON'u kayma için neden göstermiyor (bulgu 5).
- **Türkiye'den gerçek telefon süresi:** Ölçümler bulut makinesinden ve benzetimle yapıldı (Lighthouse benchmarkIndex 1.417–2.782). Ağ gecikmesi ve cihaz gücü gerçek ziyaretçiden farklı.
- **TikTok, TrueProfit ve Google etiketlerinin tek tek ana iş parçacığı maliyeti:** Sandbox iframe/worker içinde çalışanların bir kısmı Lighthouse'ta ayrı kalem olarak çıkmadı.
- **Perde ölçümünde ilk ölçüm hatası:** İlk turda zamanlayıcı kodu sayfa oluşmadan çalıştığı için perde zamanları kaydedilmedi; kayma ölçümü sağlam kaldı. Betik düzeltilip perde ölçümü ayrı turda yeniden alındı (yukarıdaki tablo).

## 8. Dosyalar

Bu klasör: `hiz-analizi-2026-10-23/`
- `RAPOR.md`: bu rapor.
- `veri/gorsel-envanter.csv`: Shopify ürün medyası ve Files envanteri, 2.142 satır. Sütunlar: tür, biçim, genişlik, yükseklik, KB, 1 MB üstü, 2.500 px üstü, PNG içeriği, hangi ürünlerde kullanıldığı.
- `veri/sayfa-gorselleri.csv`: 7 sayfada inen her görsel, telefon ve masaüstü, 749 satır.
- `veri/sayfa-gorselleri-ozet.json`: sayfa başına görsel toplamları, LCP adayları, video etiketleri.
- `veri/lighthouse-ozet.json`: 42 Lighthouse turunun ortancası ve ayrıntıları.
- `lighthouse/*.json.gz`: 42 Lighthouse JSON'u (7 sayfa × telefon/masaüstü × 3 tur). Lighthouse dosyaya varsayılan olarak sayfanın küçük ekran görüntülerini gömüyor; bunlar açılmadan dosyalardan çıkarıldı.
- `veri/kayma-olcumu.json`: 21 açılışın FCP, LCP ve kayma kayıtları.
- `veri/perde-olcumu.json`: 21 açılışın perde, DOMContentLoaded ve load zamanları.
- `veri/yapisal-veri.json`: JSON-LD kontrolü.
- `veri/png-siniflandirma.json`: 744 PNG için ölçüt değerleri.
- `veri/canli-tema-md5.json`: canlı temanın 701 dosyasının MD5'i, 23.10'da okundu.
- `betikler/`: ölçüm betikleri. **Tema dosyası değil.**
  - `lh-calistir.sh`, `lh-ozet.py`: Lighthouse.
  - `gorsel-olcum.js`, `gorsel-analiz.py`: görsel ölçümü.
  - `sayfa-gecis.js`: perde ve kayma ölçümü. Kayma turunda 7 sn, perde turunda 2 sn beklendi; dosyadaki son hali perde turu.
  - `png-siniflandir.py`: PNG sınıflandırması.

**İncelenen tema dosyaları:**
- Yerel kopya canlı temayla karşılaştırıldı: 701 dosyanın 614'ü MD5 olarak birebir aynı. Kalan 87 dosyanın 50'si bugün Admin API'den doğrudan okundu.
  - Bunlar JSON şablonlar ve `config/settings_data.json`. API bu dosyaları biçimlendirilmiş döndürdüğü için MD5'leri karşılaştırılamıyor, ama içerik canlıdan.
  - Kalan 37 dil dosyası okunmadı, hızla ilgisi yok.
  - Canlı temanın son değişikliği 2026-10-21T10:26:55Z, yani yerel kopyadan sonra değişmedi.
- Bakılan başlıca dosyalar:
  - `layout/theme.liquid`
  - `config/settings_data.json`
  - `snippets/`: `css-variables`, `loading-bar`, `media`, `product-media-gallery`, `product-card`, `product-thumbnail`, `header-logo`, `tt-yapilandirma`
  - `sections/`: `hero-video-kapsul`, `video-slider-kapsul`, `mozaik-kartlar`, `couple-bulusma`, `adim-yigin`, `apple-slayt`, `guclu-header`, `tt-couple-kapsul`, `tt-cok-satanlar`, `tt-catal-karsilastirma`, `tt-secim-kartlari`, `main-product`, `main-collection`, `faq`, `ttn-cark-genel`
  - `assets/`: `theme.js`, `theme.css`
  - `templates/`: `index.json`, `product.zaman-kapsulu.json`, `product.zaman-kapsulu-couple.json`, `page.couple-daha-fazla-bilgial.json`, `collection.couple-urunler.json`

**Brifteki "bilinenler"in kontrolü:**
- **"Canlı tema 207385788702":** Bu kimlik jantifox.com'un canlı teması. texttonext'te canlı tema 189316038976. Analiz kullanıcının onayıyla texttonext üzerinde yapıldı.
- **"responsive-image / image-srcset snippet'leri":** Bu temada yok (yukarıda).
- **"Typekit ve GTM `<head>`'de":** Yok. Google etiketi uygulama pikselinden geliyor.
- **"show_page_transition, en fazla 2 sn":** Karşılığı `enable_page_transition`. Açık; DOMContentLoaded + 1 sn sürüyor.
- **"TinySEO, GemPages, TrueProfit kaldırıldı ya da kaldırılıyor":**
  - TinySEO ve GemPages kaldırılmış.
  - **TrueProfit hâlâ kurulu**, pikseli çalışıyor.
  - GemPages'in dosyaları ve embed kaydı temada duruyor.
- **"Son görsellerin bir kısmı 2–2,6 MB PNG fotoğraf":** Doğru, hatta daha büyükleri var: 304 fotoğraf-PNG'nin 216'sı 1 MB'tan büyük, AI görselleri 3–7 MB. Ama ölçülen sayfalarda CDN bunları 3–206 KB'a küçültüyor.
