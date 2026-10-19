# Trafik düşüşü teşhisi (19.10.2026)

Saatler Türkiye saatidir (mağaza ve Meta hesabı Europe/Istanbul). Bu turda hiçbir değişiklik yapılmadı: tema, sayfa, yönlendirme, uygulama ve ayar aynı.

## Sonuç

**Sayım sorunu değil, gerçek ve kısa süreli bir trafik düşüşü. GemPages'le ilgili değil.**

- **Düşüş anı:** 19:00–20:00. Sosyal oturum 59'dan 32'ye indi.
- **Üç sayaç aynı saatte düştü:**
  - Shopify oturumları
  - Sitedeki Meta pikselinin PageView sayısı: 208 → 97
  - Meta'nın kendi reklam tıklaması: 65 → 23
- **Reklam tıklaması siteden bağımsız.** Meta bu tıklamayı ziyaretçi siteye gelmeden önce sayar. Gösterim ve harcama ise normal kaldı (4.500 → 4.296 gösterim, 343 → 347 TL). Yani reklamı tıklayan kişi azaldı. Tıklama oranı %1,44'ten %0,54'e indi; geçen hafta aynı saatte %0,74–0,92 arasındaydı.
- **18:00 saati olağandışı yüksekti** (%1,44). 18:00–20:00'nin iki saatlik ortalaması %1,0, yani normal.
- **20:00'den sonra toparlanma var.** 20:48 itibarıyla sosyal oturum 40. Bu, saatte yaklaşık 50 hız demek; geçen pazartesi aynı saatte 46'ydı.
- **GemPages bağlantısı yok:**
  - GemPages Admin API'de hâlâ kurulu (`gempages-cro`).
  - Yayındaki tema 18:02'den (app embed kapatma) beri hiç değişmedi.
  - App embed 18:02'de kapandığında kırılma olmadı. 18:00–19:00 saati günün en çok reklam tıklaması (65) ve açılış sayfası görüntülemesi (56) alan saati.
- **Site normal çalışıyor:**
  - 26 adreste "Liquid error" yok.
  - Telefon ve masaüstünde, izinli ve izinsiz 24 açılışın hepsinde Shopify page_viewed, Meta PageView, GA page_view ve TikTok Pageview gidiyor.
- **Grafik daha dik görünüyor, sebebi benim testlerim.** Shopify grafiğindeki düşüş, 16:00–19:00 arasındaki test ziyaretlerim yüzünden olduğundan sert görünüyor. Testlerim o saatlere yaklaşık 100 "doğrudan" oturum ekledi (tabloda `*`).

## Zaman çizelgesi
| Saat | Olay | Kaynak |
|---|---|---|
| 17:56 | Prizma yayına alındı; GemPages Prizma'ya 6 dosya yazdı | Aşama 2 raporu |
| 17:59–18:00 | 8 sayfanın şablon eki değişti, 2 landing gizlendi + 301 | `pages.updatedAt` 14:59:51Z / 15:00:16Z |
| 18:02 | GemPages app embed kapatıldı (elle) | tema `updatedAt` 2026-10-19T15:02:38Z |
| ~18:40 | Sosyal oturum dakikada 1–3'ten 0–1'e indi | ShopifyQL dakika serisi |
| 19:00–20:00 | En düşük saat | aşağıdaki tablo |
| 20:00– | Toparlanma | aşağıdaki tablo |
| 20:48 | GemPages hâlâ kurulu; tema hâlâ 18:02 hali | `appInstallations`, `themes(roles: MAIN)` |

## Saatlik tablo (18:02 öncesi 24 saat ve sonrası)
- **Oturum, sepet ve sipariş:** Shopify verisi.
- **Meta tık / LPV:** reklam hesabındaki tıklama ve açılış sayfası görüntüleme.
- **Piksel PV:** Meta pikseline sitenin gönderdiği PageView olayları. 20:00 satırı henüz yok.
- **`*` işareti:** benim test ziyaretlerimle şişmiş saatler. Normalde doğrudan oturum saatte 9–20; fazlası benim. Piksel PV'nin 16:00–18:00 değerleri de test sayfa görüntülemelerini içeriyor.

| Saat | Oturum | Sosyal | Doğrudan | Sepete ekleyen | Sipariş | Meta tık | Meta LPV | Piksel PV |
|---|---|---|---|---|---|---|---|---|
| 18.10 18:00 | 20 | 12 | 7 | 2 | 0 | 48 | 12 | 54 |
| 18.10 19:00 | 42 | 30 | 11 | 4 | 2 | 46 | 20 | 129 |
| 18.10 20:00 | 87 | 71 | 12 | 3 | 3 | 67 | 62 | 255 |
| 18.10 21:00 | 121 | 85 | 29 | 7 | 3 | 82 | 57 | 256 |
| 18.10 22:00 | 137 | 112 | 14 | 9 | 0 | 94 | 82 | 341 |
| 18.10 23:00 | 147 | 98 | 46 | 6 | 2 | 85 | 68 | 308 |
| 19.10 00:00 | 95 | 74 | 15 | 1 | 0 | 69 | 62 | 126 |
| 19.10 01:00 | 51 | 42 | 7 | 1 | 0 | 37 | 30 | 85 |
| 19.10 02:00 | 40 | 29 | 9 | 0 | 0 | 25 | 23 | 55 |
| 19.10 03:00 | 21 | 17 | 2 | 2 | 1 | 14 | 9 | 45 |
| 19.10 04:00 | 8 | 5 | 3 | 0 | 0 | 8 | 9 | 13 |
| 19.10 05:00 | 9 | 6 | 3 | 1 | 0 | 7 | 4 | 12 |
| 19.10 06:00 | 17 | 15 | 2 | 1 | 1 | 9 | 5 | 94 |
| 19.10 07:00 | 21 | 18 | 3 | 0 | 0 | 19 | 18 | 31 |
| 19.10 08:00 | 20 | 14 | 6 | 1 | 0 | 18 | 13 | 45 |
| 19.10 09:00 | 33 | 25 | 7 | 0 | 1 | 27 | 15 | 45 |
| 19.10 10:00 | 51 | 34 | 11 | 1 | 0 | 29 | 22 | 105 |
| 19.10 11:00 | 53 | 34 | 15 | 1 | 1 | 29 | 21 | 117 |
| 19.10 12:00 | 64 | 41 | 16 | 4 | 0 | 40 | 35 | 142 |
| 19.10 13:00 | 73 | 49 | 19 | 3 | 1 | 48 | 33 | 177 |
| 19.10 14:00 | 86 | 61 | 20 | 1 | 1 | 46 | 38 | 154 |
| 19.10 15:00 | 62 | 48 | 9 | 3 | 0 | 43 | 37 | 131 |
| 19.10 16:00 | 134 * | 57 | 70 * | 0 | 0 | 48 | 42 | 187 |
| 19.10 17:00 | 91 * | 47 | 40 * | 5 | 1 | 42 | 33 | 219 |
| **19.10 18:00** | 100 * | 59 | 36 * | 3 | 0 | 65 | 56 | 208 |
| **19.10 19:00** | **44** | **32** | 11 | 2 | 0 | **23** | **9** | **97** |
| 19.10 20:00 (20:48'e kadar) | 56 | 40 | 15 | 0 | 0 | 18 | 6 | – |

**Notlar:**
- Sipariş sayıları saatte 0–3 arasında gidip geliyor; bu kadar küçük sayılarla saatlik bir kırılım anlam taşımıyor.
- Meta LPV son iki saatte tıklamanın gerisinde (9/23, 6/18). Meta bu metriği geç işliyor; daha önceki saatlerde oran %80'in üstünde.

### Aynı saat, önceki iş günleri (19:00–20:00)

| | 12.10 Pzt | 13.10 | 14.10 | 15.10 | 16.10 | **19.10 Pzt** |
|---|---|---|---|---|---|---|
| Shopify sosyal oturum | 47 | 67 | 66 | 62 | 41 | **32** |
| Meta tık | 45 | 63 | 46 | 50 | 37 | **23** |
| Meta tıklama oranı | %0,90 | %0,77 | %0,74 | %0,92 | %0,76 | **%0,54** |
| Piksel PageView | 211 | 181 | 157 | 199 | 152 | **97** |

**Karşılaştırma: gerçek bir sayım sorunu nasıl görünür.** 17.10 18:00 ile 18.10 19:00 arasında Meta tıkları normal seyrindeydi. Ama Shopify sosyal oturum saatte 1–30'a, Meta LPV 3–20'ye düşmüştü: ziyaretçi geliyor, sayılmıyordu. Bugünkü tabloda ise tıklamanın kendisi düşüyor.

### 19:00 düşüşünün kırılımı (18:00 → 19:00 → 20:00)
- **Cihaz ve kaynak:**
  - Instagram mobil 49 → 31 → 31
  - Facebook mobil 10 → 1 → 2
  - Masaüstü sosyal 0 (zaten yoktu)
- **Giriş sayfası (sosyal):**
  - `/` 46 → 21 → 20
  - `/products/zaman-kapsulu-bileklik-kral` 6 → 0 → 0
  - `/pages/couple-daha-fazla-bilgi-al` 6 → 7 → 3
  - `/pages/couplezamankapsulleri` saatte 0–1 (önceden de böyleydi)
- **Meta kampanyaları (18:00 → 19:00):** düşüş tek kampanyada değil, hepsinde aynı saatte. Gösterimler aynı kaldı.
  - Couple: 31 → 12 tık
  - Kadın: 13 → 4
  - Trafik-LPV: 10 → 1
  - Remarketing-Çark: 3 → 2
- **Meta hesap geçmişi:** 18.10'dan bu yana kayıt yok (bütçe, durum ve hedefleme değişmemiş).

## GemPages kaldırılınca ne değişti
- **Uygulama:** `appInstallations` (20:48) GemPages Builder'ı hâlâ listeliyor. Kaldırma olayı mağazada görünmüyor.
- **Yayındaki temada son 24 saatte değişenler:** Sabahki yayın teması (Düzeltme - masaüstü galeri) ile şimdiki Prizma karşılaştırıldı:
  - 15 dosyanın içeriği farklı, 1 dosya yeni (`snippets/tt-cark-rozet.liquid`), silinen dosya yok.
  - Değişen dosyalar:
    - Prizma işleri: `taksit-tablosu.js`, `tt-fiyat-kod`, `tt-secim-kartlari` (css, js, liquid), `tt-cok-satanlar`, `tt-kart-taksit`, `tt-yapilandirma`, `index.json`
    - Kılavuz: `tt-kilavuz`, `page.kilavuz.json`
    - GemPages'in yazdığı 3 dosya: 2 `gp-global-section`, `index.gp-template-bk-default`
    - `settings_data.json`
  - 18:02'den sonra **hiçbir dosya değişmedi** (aşağıda MD5).
- **Kalan GemPages referansları (GemPages'in kendi dosyaları dışında):**
  - `layout/theme.liquid:288`: yalnızca yorum
  - `snippets/tt-couple.liquid:64` ve `:66`: yorum (`gp-global.css` adı geçiyor)
  - `sections/tt-kilavuz.liquid:4` ve `:8`: yorum
  - `sections/tt-belge-listesi.liquid:4`: yorum
  - `config/settings_data.json`: GemPages app embed bloğu, `"disabled": true`
  - Hiçbir layout, snippet veya bölümde `render`/`include`/`section 'gp-…'` ya da GemPages CDN adresi yok. `theme.liquid` GemPages'e hiç bağlı değil.
- **GemPages'in kendi dosyaları (162):** 132 `sections/gp-*`, 14 `templates/*.gp-template-*`, 11 `snippets/gp-*`, 4 layout (`theme.gempages.*`, `theme.gem-layout-none`) ve `assets/gp-global.css`. Yalnızca GemPages şablonundaki içerik bunları kullanıyor.
- **Hâlâ GemPages şablonunda olan içerik:**
  - `text-to-next-pro-1` (yayında): 200 dönüyor, Liquid hatası yok, sayfada 5.634 GemPages izi var. App embed kapalı olduğu için videoları yüklenmiyor (Aşama 2'de görüldü). `/pages/landing-page-feb-16-11-03-09` yönlendirmesi bu sayfaya gidiyor.
  - Gizli sayfalar: `ana-sayfa`, `event-zaman-kapsulu`, `landing-page-dec-12-23-44-18` (301 → `/`), `landing-page-apr-7-16-02-03` (301 → `/`)
  - Taslak ürün: `couple-urun-olustur`
- **"Liquid error / Could not find asset" taraması:** 26 adres, telefon, hepsi 200 ve hiçbirinde hata yok:
  - ana sayfa
  - Erkek ve Kadın koleksiyonları (Single ve `?mod=couple`), couple-urunler
  - Prizma, Prizma + Chloe, Auron, Kral, Bileklik, Taşlı Kilit
  - couplezamankapsulleri (düz ve `utm`/`fbclid` ile), couple-daha-fazla-bilgi-al, iki "daha fazla bilgi" sayfası
  - kılavuz ve iki alt kılavuz, QR adresi
  - iletisim, iletisimsayfasi, sozlesmeler, sepet, text-to-next-pro-1

## Sayaç ve pikseller
- **`{{ content_for_header }}`:** Yayındaki 6 layout'un hepsinde bir kez, `<head>` içinde ve koşulsuz:
  - `theme.liquid:162`
  - `password.liquid:48`
  - `theme.gem-layout-none.liquid:127`
  - `theme.gempages.blank/header/footer.liquid:52`

  Layout MD5'leri yayındakiyle aynı.
- **Tarayıcı testi** (Türkiye bölgesi taklidi; iPhone 390 ve masaüstü 1440; "seçim yok" ve "kabul"; 6 sayfa; 24 açılış; betik `betikler/izleme.js`). Sayfalar:
  - `/`
  - Erkek koleksiyonu
  - Prizma
  - `/pages/couplezamankapsulleri`
  - `/pages/couple-daha-fazla-bilgi-al`
  - QR adresi `?_ab=0&key=1767609525998`

  | İstek | Sonuç (24/24) |
  |---|---|
  | Sayfa | 200, ilk ziyarette yönlendirme yok |
  | Shopify `/.well-known/shopify/monorail/unstable/produce_batch` (`page_viewed`, `storefront_customer_tracking`) | 0,3–3,8 sn'de gidiyor, HTTP 200 |
  | Web Pixels (`/web-pixels@…/web-pixel-…`) | yükleniyor, 200 |
  | Meta `facebook.com/tr` `ev=PageView` | 0,7–5,9 sn'de gidiyor, 200 |
  | GA `analytics.google.com/g/collect` `en=page_view` | gidiyor, 204 (23/24; bir açılışta ölçüm penceresine düşmedi) |
  | TikTok `analytics.tiktok.com/api/v2/shopify_pixel` (`Pageview`, `LandingPageView`) | gidiyor |
  | GemPages isteği | 0 |

  - **ERR_ABORTED kayıtları:** Playwright bazı istekleri "ERR_ABORTED" diye listeliyor. Tek sayfada ayrıntılı ağ kaydına bakıldı (`betikler/tek-sayfa.js`). Bu istekler (keepalive/beacon) önce HTTP 200/204 yanıtı alıyor, sonra tarayıcı bağlantıyı kapatıyor. Veri sunucuya ulaşıyor.
  - **Konsol:** Her sayfada tek hata var: Shop Pay'in kendi ölçümü (`shopify_pay_page_load`, "Failed to fetch"). Mağaza sayaçlarıyla ilgisi yok. Ayrıca masaüstünde bir kez "Refused to frame shop.app" uyarısı çıktı (Shop girişi, CSP). Erken yüklemede başka betiği bozan hata yok. GemPages betiği zaten yüklenmiyor.
  - **Test oturumları sayıldı:** 20:00 saatinde doğrudan oturum 20:37'de 6'ydı. 6 test tarayıcısı açıldıktan sonra 15'e çıktı. Sayım çalışıyor.
- **Çerez/izin:**
  - `consentPolicy(countryCode: TR)`: `consentRequired: false`. Türkiye'de izin gerekmiyor ve bant çıkmıyor.
  - Bant ayarını okuma izni yok (`read_privacy_settings` kapsamı yok). Bu yüzden ayarın bugün değişip değişmediği API'den görülemedi.
  - Yine de etkisi testte görülüyor: TR ziyaretçisinde bütün pikseller izin beklemeden gidiyor.
- **Yönlendirmeler:**
  - Son 7 günün en çok giriş alan 10 sayfası 200 dönüyor ve ilk ziyarette yönlendirme yok: `/`, couple-daha-fazla-bilgi-al, Kral, Erkek, couple-urunler, Kadın, kılavuz, Bileklik, Taşlı Kilit, couplezamankapsulleri.
  - Aynı tarayıcıdaki ikinci sayfada Shopify'ın Shop tanıma yönlendirmesi (`302 → shop.app/accounts/sur → 200 ?_su_rec=`) bir kez görülüyor. Bu bir platform davranışı; 17.10 testlerinde de vardı ve giriş oturumunu etkilemiyor.

## Düzeltme
Müşterinin gördüğü bir kırılma ya da sayaç hatası bulunmadı. Bu yüzden tema kopyası oluşturulmadı ve değişiklik önerilmiyor.

- Düşüş reklam tarafında, tıklama oranında. Ads Manager'da 19.10 19:00–21:00 için reklam bazında gösterim ve tıklama oranına bakmak, hangi reklamın tıklama almadığını gösterir. Bu tur Meta tarafında hiçbir şey değiştirilmedi.
- Bekleyen tek GemPages işi: `text-to-next-pro-1`. Önerim (Aşama 2'deki gibi) gizleyip `/` adresine 301 vermek. Onayınız olmadan yapılmadı.

## Yayındaki temanın MD5 doğrulaması
- **Başlangıç kaydı** (`canli-prizma-asama2.json`, 18:02 hali):
  - Prizma - 2026-10-19 (189250076992), MAIN
  - 700 dosya, updatedAt 2026-10-19T15:02:38Z
- **Teşhis sonundaki kayıt** (20:41, 14 sayfa, hasNextPage=false):
  - 700 dosya, updatedAt aynı
  - Silinen 0, eklenen 0, içeriği değişen 0
- Teşhis boyunca yayındaki tema değişmedi.

## Kanıt dosyaları
- `gempages-cikis/betikler/izleme.js`: piksel ve sayaç testi
- `gempages-cikis/betikler/tarama.js`: Liquid hata ve yönlendirme taraması
- `gempages-cikis/betikler/tek-sayfa.js`: tek sayfada ayrıntılı ağ kaydı
- `gempages-cikis/betikler/izleme-ozet.json`: 24 açılışın özeti
- `gempages-cikis/betikler/tarama-ozet.json`: 26 adresin durum kodu, zincir ve Liquid hata sonucu (Shop tanıma belirteçleri çıkarıldı)
