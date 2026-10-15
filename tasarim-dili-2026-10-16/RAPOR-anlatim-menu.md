# Anlatım sayfaları + yeni hamburger menü · Rapor

**Tema:** "Tasarim dili - 2026-10-16" (ID 189140861248) — başlangıçta ve bitişte **UNPUBLISHED** olduğu doğrulandı.
Başka hiçbir temaya dokunulmadı, hiçbir tema yayına alınmadı. Metin değiştirilmedi.

## Önizleme bağlantıları
- Single anlatım: https://texttonext.com/pages/hediye-daha-fazla-bilgi-al?preview_theme_id=189140861248
- Couple anlatım: https://texttonext.com/pages/couple-daha-fazla-bilgi-al?preview_theme_id=189140861248
- Menü (herhangi bir sayfada hamburger): https://texttonext.com/collections/zaman-kapsulu-bileklik?preview_theme_id=189140861248 · sepet sayfası (temanın başlığı): https://texttonext.com/cart?preview_theme_id=189140861248

## Değişen dosyalar (10)
| Dosya | Ne değişti |
|---|---|
| sections/tt-menu.liquid | **YENİ.** Hamburger menü bölümü (yapı, stil, davranış, editör ayarları) |
| sections/tt-menu-grup.json | **YENİ.** Bölüm grubu; varsayılan değerler (linkler, metinler, logo) |
| layout/theme.liquid | Body sonuna `{% sections 'tt-menu-grup' %}` eklendi (başka değişiklik yok) |
| sections/guclu-header.liquid | Vurgu satırındaki background-clip degradesi yeni "Vurgu satırında degrade kullan" ayarına bağlandı (varsayılan kapalı → düz renk) |
| sections/apple-slayt.liquid | Aynı şekilde "Başlık vurgusunda degrade kullan" ayarı (varsayılan kapalı) |
| sections/couple-bulusma.liquid | `--cb-degrade` kaldırıldı: ipucu yazısı düz renk, düğme düz ink, buluşma halkası ve açılma parlaması küçük lime (düz) |
| sections/hediye-omru.liquid | "Kaydır" ipucunun yanıp sönmesi en sönük anda %85 (4.5:1 kontrast) |
| snippets/tt-couple.liquid | Couple sayfasına özel: slayt üst etiketi #8A8A85, pasif nokta #262624 (yarı saydam beyaz yerine) |
| templates/page.hediye-daha-fazla-bilgial.json | Bu sayfanın bölüm ayarları (aşağıda) |
| templates/page.couple-daha-fazla-bilgial.json | Bu sayfanın bölüm ayarları (aşağıda) |

guclu-header, apple-slayt ve couple-bulusma yalnızca bu iki sayfada kullanılıyor; hediye-omru'nun ana sayfa / ürün sayfası örnekleri yalnızca "Kaydır" yanıp sönmesinden etkilendi (daha okunur).

## (A) Anlatım sayfaları — bölüm bölüm
Her bölümün BU sayfadaki ayarları tek tek okundu ve render edilmiş hali (hesaplanan renkler) ölçüldü.

**İki satırlı başlıklar:** degradeler tamamen kaldırıldı — background-clip:text artık hiçbir öğede yok (ölçüm: 0). İkinci kısımlar düz #8A8A85, ilk kısımlar açık zeminde #0A0A0A, koyu zeminde #FFFFFF:
"Açılacağı Günü Sen Belirle.", "Sadece buluştuğunuzda açılır.", "Dört Adımda Öğrenin." (iki sayfa), "5 saniyede deneyimle.", "en güzel alışkanlığı".

| Sayfa / bölüm | Yapılan |
|---|---|
| Single 01 guclu-header | Etiket #5C5C57, H1 #0A0A0A, vurgu #8A8A85 (degrade ayarı kapalı), alt metin/fiyat #5C5C57, yıldız #0A0A0A, Satın Al birincil. **Ürünü Öğren**: zemin %72 saydam beyazdı → tam beyaz, #0A0A0A yazı, 1px #D2D2CD; nabız halkası ink'ten #D2D2CD'ye |
| Single 02 adim-yigin | #000000 zemin; vurgu degradesi ve rozet degradesi kapatıldı (ayar); rozetler düz #D6FF00 + #0A0A0A, tam yuvarlak; başlık kalınlığı ayarı 700; başlıklar #FFFFFF, açıklamalar #A3A39E |
| Single 03 video-slider | Zemin #000000, kart #141414, başlık #FFFFFF, açıklama #A3A39E; pasif nokta #5C5C57 → **#262624**, aktif #FFFFFF; oynat/durdur beyaz + ink |
| Single 04 hediye-omru | #F4F4F4, satırlar beyaz, çubuklar #0A0A0A, boş #D2D2CD, "Kilitlendi" ve kapsül çubuğu #0A0A0A, top #0A0A0A |
| Single 05 mozaik | H2 #0A0A0A, alt #5C5C57, yorum kartı #F4F4F4, yorum/isim/tik #0A0A0A, HEMEN İNCELE birincil, görsel karartması korundu |
| Single 06 tt-veri | #000000; "Neden unutulmuyor?" ve "1. GÜN…" #8A8A85; H2 ve yüzdeler #FFFFFF; açıklamalar #A3A39E; ayraçlar #262624 |
| Single 07 karşılaştırma (blocks_wKUYJT) | #F4F4F4; etiket #5C5C57; H2 #0A0A0A; kutular beyaz + #D2D2CD; **Hediye/Couple beyaz-çizgili → birincil (ink + beyaz)**, üzerine gelince #262624 (degradeli hover kapatıldı) |
| Single 08 avantaj | #000000, kart #141414, kenar #262624, ikon beyaz, "+" beyaz + ink; açılan pencereler aynı dilde |
| Single 09 tt-baslik | Satın Al beyaz + ink, tam yuvarlak; düğme üzerindeki ışık şeridi kapatıldı (beyaz düğmede görünmüyordu, degrade) |
| Couple 01 guclu-header | Single ile aynı |
| Couple 02 adim-yigin | Single ile aynı |
| Couple 03 couple-bulusma | #F4F4F4; vurgu #8A8A85; bildirim kartı ve kilitli kutular beyaz + #D2D2CD; kilit ikonları #0A0A0A; ray #D2D2CD, top #0A0A0A; ipucu yazısı degrade → düz; açılma anı: 2px lime halka + kısa lime parlama (küçük, ink ile); düğme düz ink |
| Couple 04 video-slider | Single ile aynı |
| Couple 05 hediye-omru | Degrade çubuk kapatıldı (ayar), kırmızı yok; "Kilitlendi" #0A0A0A (Single ile aynı) |
| Couple 06 apple-slayt | #000000, etiket **#8A8A85**, H2 #FFFFFF + vurgu #8A8A85, alt #A3A39E, kartlar #141414, kart yazıları #FFFFFF/#A3A39E, pasif nokta **#262624** (yarı saydam beyaz yerine), aktif #FFFFFF; ayarlar da bu değerlere eşitlendi |
| Couple 07 mozaik / 08 tt-veri / 10 avantaj / 11 tt-baslik | Single ile aynı |
| Couple 09 karşılaştırma (blocks_HATjRq) | #000000, etiket #8A8A85, H2 #FFFFFF, alt #A3A39E, kutular #141414 + #262624, metin #FFFFFF; Hediye/Couple beyaz + ink |
| newsletter (iki sayfa) | Site geneliyle aynı (#000000, input #141414, beyaz gönder düğmesi) |

**Degrade kontrolü (öğeler + ::before/::after):** iki sayfada kalan degradeler yalnızca görsel üstü siyah karartmalar (mozaik kart scrim, slayt perdesi). Bir istisna bilgi olarak: Couple buluşma demosunda kilitli kutu ızgarasının altındaki şeffaf→#F4F4F4 solma (renkli değil, zemine erime) korundu.
**Renkler (iki sayfa, telefon, çizilen her şey):** 17 renk — tamamı paletten (saydam türevleri dahil). Palet dışı tek değer #3A3A38: menüdeki Single simgesinin dış halkası (verdiğiniz SVG birebir kullanıldı).

## (B) Hamburger menü
**İnceleme:** Eski menü iki ayrı bileşendi:
1. TT Başlık bölümünün kendi çekmecesi (sections/tt-baslik.liquid) — ana sayfa (tt-anasayfa-cubuk grubu), koleksiyonlar ve anlatım sayfaları (şablon içinde), ürün sayfaları (tt-urun-cubuk / tt-couple-urun grupları). İçerik Shopify Navigation'dan: **main-menu** (Couple, Kadın, Erkek, Etkinlik, İletişim).
2. Temanın kendi MenuDrawer'ı (sections/header.liquid → snippets/header-drawer.liquid) — sepet, arama, 404, iletişim sayfaları; o da main-menu + "Giriş yapmak" + sosyal ikonlar.

**Yeni yapı:** tek bileşen `sections/tt-menu.liquid`, her sayfada (layout'ta bölüm grubu). İki hamburger de (TT Başlık ve temanın başlığı) bunu açar; eski çekmecelerin dosyalarına dokunulmadı, sadece açılmıyorlar. İçerik **tema ayarlarından** (Tema düzenleyici → "Hamburger Menü" grubu → TT Menü): satır metinleri/linkleri/rozetleri, kart başlık/açıklama/linkleri, alt linkler, destek satırı ve telefon, logo. Rozet boşsa görünmez. **main-menu silinmedi, değiştirilmedi** (artık menüde kullanılmıyor; tema başlığının masaüstü gezinmesi hâlâ ondan besleniyor).

Uygulanan ölçüler: üst çubuk 60px #0A0A0A + 1px #262624; X 44×44 dokunma alanı, 18px 2px yuvarlak uç, açılırken hamburger çizgileri aynı yerde X'e dönüyor; logo ortada (mevcut beyaz logo) ana sayfaya; arama/sepet 44×44, 20px, 1.8px çizgi; sepet rozeti 16×16, #D6FF00 + #0A0A0A 10px 700, boşken gizli. İçerik #000000, 24px kenar; ÜRÜNLER / NASIL ÇALIŞIR? etiketleri 11.5px 600 1.4px #8A8A85; satırlar 64px, 28px 700 -0.8px, ok 10×16 #5C5C57 (bulunulan sayfada #FFFFFF + aria-current); Couple rozeti; iki kart (#141414, 1px #262624, 18px köşe, verilen simgeler, çapraz ok); dipte Etkinlik / İletişim (48px, 17px 500), çizgi, destek satırı ve tel:+902166061415. Masaüstü: soldan 420px panel + rgba(0,0,0,.5) karartma.

### Menü testleri (telefon 390 + 360 + masaüstü) — 31/31
- aria-controls/aria-expanded, açılınca odak menüde (X), Tab menü içinde dönüyor (12 öğe), Esc ve X ile kapanıyor, kapanınca odak hamburgere dönüyor
- Açıkken sayfa kilitli (overflow hidden, scrollY değişmiyor); 360×560'ta içerik kendi içinde kayıyor, üst çubuk sabit
- Açılış 220ms; prefers-reduced-motion'da 0
- Arama ve sepet ikonları menüyü kapatıp temanın çekmecelerini açıyor
- Rozet: boşken gizli → ürün ekleyince anında 1 → 2 ürünle 2 (cart.js ile aynı) → çıkarınca güncelleniyor → boşalınca gizli
- 7 link doğru sayfaya gidiyor; logo "/" ; telefon tel: linki; Erkek sayfasında "Erkek" aria-current
- Masaüstü: 420px tam yükseklik panel, karartmaya tıklayınca kapanıyor
- clipPath kimliği benzersiz; JS hatası yok
(Uzun test turunda 360×560 kaydırma ölçümü bir kez açılış animasyonu bitmeden alındı; aynı adımlarla ayrı çalıştırmada geçti — `5-islev-testleri/menu-360x560-kaydirilmis.jpg`.)

**Bilinen farklar / notlar**
- Sepet, arama, 404 ve iletişim sayfalarında eski tema çekmecesindeki **"Giriş yapmak" ve sosyal ikonlar** yeni menüde yok (tarifte yer almadığı için eklenmedi). İstenirse alt kısma eklenebilir.
- Masaüstünde temanın kendi başlığını kullanan sayfalarda (sepet vb.) hamburger yok (masaüstü gezinme var) — eskisi de öyleydi.
- TT Başlık sayfalarında üst çubuk 52px, menü çubuğu 60px; X, hamburgerle aynı yatay konumda, 4px aşağıda açılıyor.

## İşlev testleri — anlatım sayfaları (telefon)
Aynı test ÖNCE (Calisma kopyasi) ve SONRA (Tasarim dili) çalıştırıldı; sonuçlar birebir aynı (davranış değişmedi):
- Couple buluşma demosu: kaydırınca açılıyor ("Buluştunuz · 12. Buluşmanız", kareler açılıyor) ✔
- apple-slayt noktayla 3. karta gidiyor ✔ · video kaydırıcı noktaları ✔ · video oynat/durdur düğmesi videoyu başlatıp durduruyor ✔
- Avantaj kartı pencereleri açılıp kapanıyor ✔ · yorum kartları açılıp kapanıyor (ilk kart açık başlıyor) ✔
- Satın Al: Single'da Kadın/Erkek seçeneğine bölünüyor, Couple'da /collections/couple-urunler ✔ · Ürünü Öğren aşağı kaydırıyor ✔
- Karşılaştırma "Hediye" → Kadın / Erkek seçeneği ✔
- Akordeon: bu iki sayfada akordeon bölümü yok (0) · JS hatası yok

## Kontrast
Tüm metinler (iki sayfa + açık menü) ölçüldü:
- Açık zeminde #D6FF00 yazı: **0**
- Menü: başarısız **0**
- Sayfalar: düzeltilen "Kaydır" ipucu (yanıp sönerken %30'a iniyordu → en az %85, ≥4.5:1). Kalan tek ölçüm "Ayşe & Mert / 3. yıl dönümü": video kartının üstündeki beyaz yazı (betik zemini #F4F4F4 sanıyor; gerçekte video + karartma) — yanlış alarm.

## Diğer sayfalar
Bu işte değişen ve başka sayfalara dokunan dosyalar yalnızca yeni menü, layout ve hediye-omru'nun ipucu animasyonu. Ana sayfa, Auron ürün sayfası ve Etkinlik sayfası önceki teslimle yan yana: `6-diger-sayfalar-kontrol/` (fark yok; yalnızca hareketli öğelerin anlık kareleri).

## Yayındaki tema MD5
"Calisma taslagi - 2026-10-05" (MAIN): başlangıçta 669 dosya alındı, bitişte 669 dosya **birebir aynı** (değişen 0, yeni 0).

## Klasörler
1. `1-anlatim-sayfalari-telefon-once-sonra/` — iki sayfa, 390×844 tam sayfa, önce | sonra
2. `2-anlatim-bolumleri-sonra-telefon/` — her bölümün sonra hali (22)
3. `3-anlatim-masaustu-sonra/` — iki sayfa 1440
4. `4-menu-once-sonra/` — ana sayfa, Erkek, Auron, Couple anlatım, sepet sayfası; 390×844, 360×740, 1440; sepet boş ve 2 ürünlü (rozet)
5. `5-islev-testleri/` — buluşma demosu önce/sonra, slayt, avantaj penceresi, yorum, karşılaştırma, menü kaydırma
6. `6-diger-sayfalar-kontrol/`
Test çıktıları: `menu-test-sonuc.json`, `sayfa-test-once.json`, `sayfa-test-sonra.json`
