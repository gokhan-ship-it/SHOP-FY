# Çark hatırlatması (26.10.2026)

## Özet

- **Temalar:**
  - Yayındaki tema: "Prizma kampanya - 2026-10-25".
  - Yayında olmayan kopyalarda bekleyen iş yoktu. "Icerik uretici - 2026-10-24" de dahil; içindeki iş zaten yayındaki temada.
  - Bu yüzden, istediğiniz gibi yayındaki temanın kopyası alındı: **"Cark hatirlatma - 2026-10-26"**. Bütün iş bu kopyada.
- **Hiçbir tema yayına alınmadı.** Yayındaki tema değişmedi; MD5 kontrolü aşağıda.
- **Dokunulmayanlar:**
  - çarkın indirim tutarı
  - indirim kodu mantığı (onayınızla yapılan tek düzeltme dışında; en altta)
  - Meta, Google ve TikTok pikselleri
  - çerez izni
- Sizin düzeltmeleriniz uygulandı:
  1. Çubukta ve sepet kutusunda tutar yok.
  2. Çubuk, çark bölümü çevrilmeden geçilince çıkıyor.
  3. Süresi dolmuş kişi sepette hatırlatmayı görüyor.
- Onayınızla iki ek iş daha yapıldı (en altta):
  - ürün sayfalarına çark eklendi,
  - süresi dolan kodun sepetten kalkmaması düzeltildi.

## 1. Teşhis

| Soru | Bulgu |
|---|---|
| Çark ne? | Temaya gömülü çark (ttn-cark). Uygulama değil. Çerez adları eski Wheelio'dan kalma (wlo-codebar-…). |
| Ne zaman açılıyor? | Kendiliğinden hiç açılmıyor: ne yüklenince, ne 6 saniye sonra, ne kaydırınca. Sayfanın içinde küçük bir kart olarak duruyor; kişi dokununca büyüyor. Reklam linkindeki `?cark=1` yalnızca karta kaydırıyor. |
| Hangi sayfalarda? | **Ana sayfa:** "En çok tercih edilenler" bölümünde; telefonda ilk ekranda görünüyor.<br>**Kadın ve Erkek sayfaları:** Single/Couple kartlarının altında. Telefonda ilk ekranın altında kalıyor (390'da yarısı, 360'ta tamamı). Masaüstünde ana sayfada ve koleksiyonda da ilk ekranın altında.<br>**Ürün sayfalarında hiç yok.** |
| Nasıl kapanıyor? | Yalnızca "İstemiyorum ×" ile. Esc ya da boşluğa dokunmak kapatmıyor. Kapatınca küçük kart olarak kalıyor ve kendiliğinden bir daha açılmıyor; kişi isterse tekrar dokunup açabiliyor. |
| Nerede tutuluyor? | **Tarayıcı kaydı `ttnCark`:** "red" (çevirmeden kapattı) ya da "kazandi" (çevirdi).<br>**Kazanınca ayrıca:** wlo-codebar-code / counter / time çerezleri ve `ttKod`.<br>**Süre (30 dk) dolunca:** kayıt siliniyor; kişi çarkı yeniden çevirebiliyor. |
| "Çevir" ilk ekranda mı, bir şey üstüne biniyor mu? | Kart açıldığında "Çarkı çevir" düğmesi 390, 360 ve 1440'ta ilk ekranda; üstünde başka hiçbir şey yok. Çerez bandı yok. WhatsApp ve "Nasıl çalışır?" ekranın altında; açık çarkla çakışmıyor. |
| Yanlışlıkla kapanıyor mu? | Hayır. Fark etmeden kapatmaya yol açan bir sorun bulunmadı. |

**Asıl sorun görünürlük:** Ürün sayfasına (çoğu reklam buraya gelir) inen kişi çarkı hiç görmüyordu. Koleksiyonda ise çark ilk ekranın altında kalıyor. Onayınızla ürün sayfalarına çark eklendi (en altta).

## 2. Çarkın üç durumu (tek yerden okunuyor)

| Durum | Ne demek | Nereden anlaşılıyor |
|---|---|---|
| a | Çarkı ne çevirdi ne de çevirmeden geçti (ya da kuponun süresi doldu) | çarkın kaydı yok |
| b | Çarkı gördü, çevirmedi | "İstemiyorum" dedi (`ttnCark` = red) **ya da** çark bölümünü çevirmeden aşağı geçti |
| c | Çevirdi, kupon süresi sürüyor | `ttnCark` = kazandi ve 30 dakika dolmadı |

- Tek yeni kayıt `ttnCarkGecildi`: çarkı çevirmeden geçen kişiyi işaretliyor. Çark çevrilince siliniyor.
- Süre dolunca çarkın kendi kuralıyla durum "a"ya dönüyor; sepet kutusu yine çıkıyor.

## 3. Header altı hatırlatma çubuğu

- **Metin:** "İndirimini almayı unuttun.", sağında neon "Çevir" ve gri X. Tutar yazmıyor.
  - Metin 360 genişlikte bile tek satıra sığıyor. Sığmazsa "İndirimini unuttun." olarak kısalıyor.
- **Ne zaman çıkıyor:** Kişi çark bölümünü çevirmeden aşağı geçer geçmez header'ın altına yapışıyor. Çark ekranda dururken çıkmıyor; "İstemiyorum"a basınca da hemen değil, bölüm geçilince çıkıyor.
  - Ürün sayfası gibi çarksız sayfalarda: daha önce çevirmeden geçmiş kişi aşağı kaydırınca çıkıyor.
  - Bir kez çıkınca ana sayfa, koleksiyon ve ürün sayfalarında açılışta hazır geliyor.
- **"Çevir":** çark sayfanın üstünde bir pencerede açılıyor. Çevrilince çubuk kalkıyor; alttaki "500 TL indirim aktif" sayacı ve indirimli fiyatlar geliyor.
- **X:** o oturumda bir daha çıkmıyor. Sepet kutusu yine çalışıyor.
- **Yerleşim:**
  - Sayfanın üstüne 52 px boşluk ekleniyor, içerik örtülmüyor.
  - Hamburger menü açılınca çubuk menünün altında kalıyor.
  - Couple "Sepete ekle (…)" çubuğu, sayaç, "Nasıl çalışır?" ve WhatsApp ile çakışma yok; üç boyutta ölçüldü.

## 4. Sepette hatırlatma

- Sepet çekmecesinde ve /cart sayfasında, listenin en üstünde siyah kutu çıkıyor:
  - başlık: "İndirimin / seni bekliyor."
  - alt metin: "Çarkı çevir, indirim sepetine hemen uygulansın."
  - neon "Çarkı çevir" düğmesi
- Ne zaman çıkıyor: durum a ya da b'de ve sepette ürün varken. Boş sepette çıkmıyor.
- **"Çarkı çevir":**
  - Çark sepetin üstünde açılıyor. Çevrilince kod kendiliğinden uygulanıyor.
  - Sayfa yenilenmeden toplam ve "-500 TL" satırı güncelleniyor, kutu kalkıyor.
  - Çekmece açık kalıyor. Esc ile çark kapanınca da çekmece açık kalıyor.
- **"Ödemeye geç" hiç engellenmiyor;** test edildi.
- **Süresi dolmuş kişi** (örneğin iki gün sonra doğrudan sepete gelen) kutuyu görüyor:
  - eski indirim sepetten kalkıyor ve sepet ekranı sayfa yenilenmeden tazeleniyor,
  - süre sayfa açıkken dolarsa da aynısı oluyor,
  - kişi çarkı yeniden çevirince indirim tekrar uygulanıyor.

## 5. Ölçüm

Gönderilen olaylar:
- `cark_gosterildi`, `cark_kapatildi_cevirmeden`, `cark_cevrildi`
- `cark_hatirlatma_cubugu_gosterildi`, `cark_hatirlatma_cubugu_tiklandi`, `cark_hatirlatma_cubugu_kapatildi`
- `cark_sepet_hatirlatma_gosterildi`, `cark_sepet_hatirlatma_tiklandi`

Her olayda şu bilgiler var:
- `kaynak_sayfa`: ana_sayfa, koleksiyon, urun ya da sepet
- `yer`: kart, pencere, sepet_cekmecesi ya da sepet_sayfasi
- çubukta `tetik`: kart_gecildi, kaydirma ya da sayfa

Olaylar Shopify Customer Events'e (`Shopify.analytics.publish`) ve Google'a (`gtag`) gidiyor. Meta'ya gitmiyor. Mevcut piksel kodlarına dokunulmadı.

**Nereden izlenir:**
- **Google Analytics 4 (G-X7489V6WBM):**
  - Raporlar > Gerçek zamanlı: olaylar birkaç saniye içinde görünür.
  - Etkileşim > Etkinlikler: ertesi günden itibaren görünür.
  - `kaynak_sayfa`'ya göre ayırmak için: Yönetici > Özel tanımlar > "kaynak_sayfa" adında etkinlik kapsamlı özel boyut ekleyin.
- **Shopify Admin > Ayarlar > Müşteri etkinlikleri:**
  - Bu olaylar mağazanın piksellerine ulaşıyor, ancak Shopify kendi raporlarında göstermiyor.
  - Shopify içinde saymak için orada bu olayları dinleyen bir "özel piksel" eklenmesi gerekir. Takip kodlarına dokunmama kuralı yüzünden eklemedim; isterseniz ekleyebilirim.

## Değişen dosyalar (yalnızca kopya temada)

| Dosya | Ne |
|---|---|
| `snippets/tt-cark-durum.liquid` (yeni) | Üç durumun tek okunduğu yer + çubuk ve kutu stilleri |
| `snippets/tt-cark-hatir.liquid` (yeni) | Header altı çubuk + her sayfada açılabilen çark penceresi (sitedeki çark kartının aynısı) |
| `snippets/tt-cark-sepet.liquid` (yeni) | Sepetteki siyah kutu |
| `assets/tt-cark-hatir.js` (yeni) | Davranış ve ölçüm |
| `layout/theme.liquid` | 2 satır: durum ve çubuk eklendi |
| `sections/cart-drawer.liquid`, `sections/main-cart.liquid` | 1'er satır: sepet kutusu listenin üstüne eklendi |
| `assets/ttn-cark.js` (onayla) | Çarkın kod kaldırma kısmında tek düzeltme: süresi dolan kodu artık gerçekten sepetten kaldırıyor. İndirim tutarı ve kod mantığının geri kalanı aynı. |

- Ürün sayfası çarkı da `snippets/tt-cark-hatir.liquid` içinde.
- Ürün şablonlarına (`templates/product.zaman-kapsulu*.json`) dokunulmadı. İkisi de Shopify'ın şablon başına 25 bölüm sınırında; yeni bölüm kabul etmiyor. Bu yüzden kart koddan ekleniyor ve sayfa açılırken ürün bölümünün hemen altına yerleşiyor.
- Bunu anlamak için kopya temada iki deneme yükleme yaptım: biri reddedildi, sonra zararsız bir sıra değişikliği yükleyip hemen geri aldım. Şablonun MD5'i başlangıçtaki haliyle aynı.

## Önizleme ve kendi testiniz

Linkler:
- Ana sayfa: https://texttonext.com/?preview_theme_id=189466968384
- Erkek sayfası: https://texttonext.com/collections/zaman-kapsulu-bileklik?preview_theme_id=189466968384
- Ürün sayfası: https://texttonext.com/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik?preview_theme_id=189466968384
- Ürün sayfası (couple): https://texttonext.com/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple?preview_theme_id=189466968384
- Sepet: https://texttonext.com/cart?preview_theme_id=189466968384
- Canlı siteye dönmek için: https://texttonext.com/?preview_theme_id=

Her senaryoya yeni bir **gizli sekmede** ana sayfa linkiyle başlayın:
1. **Çarka hiç dokunmadan sepete gidin:** Ürün ekleyin. Sepette "İndirimin seni bekliyor" kutusu çıkar. "Çarkı çevir"e basıp çevirin: toplam 500 TL düşer.
2. **Çarkı çevirmeden geçin:** Çarka dokunmadan, ya da "İstemiyorum" deyip, aşağı kaydırın. Çark bölümü geçilince üstte "İndirimini almayı unuttun." çubuğu çıkar. "Çevir"e basıp çevirin: çubuk kalkar, sayaç ve indirimli fiyatlar gelir.
3. **Önce çarkı çevirin:** Ne çubuk ne sepet kutusu çıkar.

## Otomatik kontrol sonuçları (390, 360, 1440; temiz tarayıcı)

| Kontrol | Sonuç |
|---|---|
| 1. senaryo, çekmece ve /cart | Kutu çıkıyor; çevirince 1.999 → 1.499 TL, "K7QX4M9TR -500" satırı geliyor, sayfa yenilenmiyor, çekmece açık kalıyor |
| 2. senaryo | Çark ekrandayken çubuk yok; çark header'ın altına geçtiği adımda çıkıyor. Çevirince çubuk kalkıyor, sayaç ve indirimli fiyat geliyor |
| X ile kapatma | Oturumda bir daha çıkmıyor; sepet kutusu yine çıkıyor |
| 3. senaryo | Ana sayfa, koleksiyon, ürün, çekmece ve /cart'ta hiçbir şey çıkmıyor |
| Couple, iki ürün | "İkinci Üründe %50 İndirim" (−999,50) + çark (−500) birlikte: 4.698 → 3.198,50 TL |
| Boş sepet / "Ödemeye geç" | Kutu yok / gönderim engellenmiyor |
| Ürün sayfası (tekli + couple) | Çark ürün bölümünün hemen altında: telefonda y≈1430, masaüstünde uzun galerinin altında. Çevirmeden geçince çubuk çıkıyor. Çevirince sayaç ve indirimli fiyat geliyor. Reklam linki (`?cark=1`) çarka kaydırıyor. |
| Süresi dolmuş kupon | /cart ve çekmecede kod sepetten kalkıyor (1.499 → 1.999 TL), "-500" satırı gidiyor, kutu çıkıyor. Sayfa açıkken dolunca da aynısı; sayfa yenilenmiyor. |
| Konsol | Yeni hata yok |

Aynı gezinmede canlı ve kopya temada aynı iki hata görüldü; ikisi de shop.app kaynaklı, bizim kodumuzla ilgisi yok. Bir de şu var: çark çevrilince temanın sepet kodunda "reading 'open'" hatası çıkıyor. Bu **canlı sitede de aynen var** (çarkın kendi sinyalinden). Zararsız, çünkü sepet zaten güncelleniyor. Bizim yeni kodumuz bu hatayı üretmiyor.

## Yayındaki tema değişmedi (MD5)

- Başta (09:1x) ve sonda (11:37, onaylı işlerden sonra) alınan listelerdeki 708 dosyanın hepsinin MD5'i ve son değişiklik zamanı aynı.
- Sondaki listede 2 dosya fazla görünüyor (gift-wrapping-list…). Sabahki liste sayfalara bölünürken bu ikisi atlanmıştı. İkisinin de son değişikliği 25.10 10:23; bugün dokunulmadı.
- Temanın kendi son değişiklik zamanı hâlâ 25.10 12:45.

## Onayınızla yapılanlar

1. **Ürün sayfasına çark.**
   - Tekli ve couple ürün sayfalarında ürün bölümünün hemen altında; telefonda "Sepete ekle" ve güven maddelerinin altında.
   - Ana sayfadaki çarkla aynı görünüm ve metin, aynı çark mantığı.
   - Kişi çevirmeden geçince üstteki çubuk ürün sayfasında da çıkıyor.
   - Başka sayfalar değişmedi; koleksiyondaki çarkın yeri aynı.
2. **Süresi dolan kodun sepetten kaldırılması.**
   - Çarkın kodu, Shopify'ın sepet verisinde artık olmayan bir alanı okuyordu; düzeltildi.
   - Artık 30 dakika dolunca kod sepetten gerçekten kalkıyor ve sepette "Çarkı çevir" kutusu çıkıyor.
   - Çark yeniden çevrilince indirim tekrar geliyor.
   - Bilgi için: İndirim kodunun Shopify'da bitiş tarihi yok (müşteri başına bir kez). Biri kodu bilip elle girerse süre sınırı yine uygulanmaz; bu, kodun Shopify'daki ayarıyla ilgili, temayla değil.
