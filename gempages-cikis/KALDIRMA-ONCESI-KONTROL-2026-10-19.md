# GemPages kaldırma öncesi son kontrol ve taslak temalar (19.10.2026)

Bu turda mağazada ve temalarda **hiçbir şey değiştirilmedi.** Yapılanlar:
- Admin API okuma sorguları
- Mağaza ziyaretçisi gibi tarayıcı ve curl testleri (önizleme çerezi yok)
- Analitik sorguları

Yayındaki tema: "Duzeltme - masaustu galeri - 2026-10-19" (189247717696).

## Özet

- **Hüküm: KALDIRILAMAZ.**
- **Dün taşınan 7 sayfa bugün yeniden GemPages şablonuna dönmüş.**
  - Dün 20:05'te (18.10) kendi şablonlarımıza alınmışlardı.
  - Bugün 11:18:11–11:18:22 UTC'de hepsi tekrar `page.gp-template-*` oldu. Bu, galeri düzeltmesi temasının yayına alındığı dakika (tema 11:18:09).
  - Hemen önce, 11:17:36–11:18:08 arasında, GemPages kendi dosyalarını yeni yayındaki temaya yazmış:
    - `gp-global-section-*` (3 dosya)
    - `collection.gp-template-bk-default` ve `product.gp-template-bk-default`
  - Olay kaydında sayfa değişikliği görünmüyor. Ama zamanlama, GemPages'in tema yayına alınınca sayfalarını yeniden kendi şablonlarına bağladığını gösteriyor. **GemPages kurulu kaldıkça her tema yayına alınışında bu tekrar eder.**
- **Sonuç:** Basılı QR adresleri şu an yine eski GemPages kılavuzunu açıyor. Bu kılavuz masaüstünde boş görünüyor (0 karakter); telefonda yalnızca 130 karakter var.
- Bizim şablonlarımız yayındaki temada ve Prizma kopyasında hâlâ duruyor ve çalışıyor. Şablon önizlemesiyle doğrulandı: GemPages izi yok, hata yok, içerik tam. Eksik olan yalnızca sayfaların şablon eki.

## 1a. Taşınan sayfalar (yayında, bugünkü durum)

**Kılavuz adresleri ve yönlendirmeler:** QR adreslerinin hiçbiri yönlendirilmiyor; doğrudan 200 dönüyor.
- `http://` ve `www.` ile girilen adresler tek bir 301 ile `https://texttonext.com/...` adresine gidiyor; son kod 200.
- `?_ab=0&key=…` ve `?key=…` parametreleri sayfayı değiştirmiyor.

**Yayındaki sayfalar ve şablonları:**

| Adres | Şu anki şablon | GemPages izi | Kod | Sorun |
|---|---|---|---|---|
| `/pages/kullanim-kilavuzu?_ab=0&key=1767609525998` | page.gp-template-600755391629886309 | VAR (5 gp bölümü, GemPages JS ve fontları) | 200 | Eski kılavuz. Masaüstünde 0 karakter, telefonda 130. Alt kılavuz linkleri `?_ab=0&key=…` ile GemPages sayfalarına gidiyor. |
| `/pages/kullanim-kilavuzu?key=1767609525998` | aynı | VAR | 200 | aynı |
| `/pages/kullanim-kilavuzu` | aynı | VAR | 200 | aynı |
| `/pages/bireysel-hediye-kullanim-kilavuzu` | page.gp-template-600758654311858837 | VAR | 200 | Masaüstünde boş. Telefonda 3 videonun 3'ü oynuyor. |
| `/pages/couple-hediye-kullanim-kilavuzu` | page.gp-template-600760696552030795 | VAR | 200 | Masaüstünde boş. Telefonda 1/1 video. |
| `/pages/iletisim` | page.iletisim | yok | 200 | Sorun yok. Yeni iletişim sayfası (362 karakter). |
| `/pages/iletisimsayfasi` | page.gp-template-556461893263295681 | VAR (gp-form, gp-button JS) | 200 | Eski GemPages iletişim formu; yeni sayfaya gitmiyor. |
| `/pages/sozlesmeler` | page.gp-template-606324753770218070 | VAR | 200 | Eski GemPages sayfası (93 karakter). |
| `/pages/couplekapsuldahafazlabilgial` | page.gp-template-601917426203886298 | VAR | 200 | GemPages |
| `/pages/hediyekapsuldahafazlabilgial` | page.gp-template-601918380005393114 | VAR | 200 | GemPages |
| `/pages/couplezamankapsulleri` | page.gp-template-593136672170836500 | VAR (10 gp bölümü) | 200 | Hiç taşınmadı (aşağıda). |
| `/pages/landing-page-dec-12-23-44-18` ("Ana Sayfa") | page.gp-template-544431830779036655 | VAR | 200 | GemPages, 90 günde 7 oturum |
| `/pages/text-to-next-pro-1` | page.gp-template-553922254656766857 | VAR | 200 | GemPages, 11 oturum |
| `/pages/landing-page-apr-7-16-02-03` | page.gp-template-561200095932974170 | VAR | 200 | GemPages, 10 oturum |
| 6 yasal sayfa, `sozlesmeler-ve-politikalar`, `siparis-ve-iade`, `hesap-silme-talebi`, `contact` | page.yasal / sozlesmeler / siparis-ve-iade / hesap-silme-talebi / contact | yok | 200 | Sorun yok; metinler tam. |
| Anlatım sayfaları (`couple-`, `hediye-`, `event-daha-fazla-bilgi-al`), `boyutlar`, `bundles`, `collection-bundle`, `hediye-zaman-kapsulu-urunleri-gor` | kendi şablonları | yok | 200 | Sorun yok |

**Taşınan şablonların doğrulaması:** Sayfalara atanmadan, yalnızca test için şablon önizlemesiyle açıldı; yayında, telefon ve masaüstünde.

| Sayfa | Şablon | İçerik | Video | Linkler |
|---|---|---|---|---|
| kullanim-kilavuzu | kilavuz | 338 karakter | – | Alt kılavuz linkleri temiz (`/pages/bireysel-…`, `/pages/couple-…`). "Çip nasıl okutulur?" kartının videosu 206 dönüyor. |
| bireysel kılavuz | kilavuz-bireysel | 311 karakter | 3/3 | – |
| couple kılavuz | kilavuz-couple | 182 karakter | 1/1 | – |
| iletisimsayfasi | iletisim | 362 karakter | – | – |
| sozlesmeler | sozlesmeler-liste | 499 karakter | – | 4 belge linki |
| couplekapsul… | couple-daha-fazla-bilgial | tam | 7/7 | – |
| hediyekapsul… | hediye-daha-fazla-bilgial | tam | 10/11 | – |

Bu şablonların hiçbirinde GemPages isteği ya da konsol hatası yok. Kılavuz videoları Shopify'ın video CDN'inde.

**Konsol:** Taranan 35 adresin hiçbirinde JS hatası yok. Yalnızca `shop.app` 403 gürültüsü çıkıyor; bu GemPages'le ilgili değil.

### /pages/couplezamankapsulleri
- **Ne gösteriyor:** GemPages ile yapılmış "Nova + Chloe Couple Zaman Kapsülü" satış sayfası.
  - İçindeki ürünler: Nova + Chloe ve Noir + Chloe Charm (ikisi de aktif).
  - Bir de silinmiş bir ürün (`astor-chloe-…-kopya`) var.
  - Sayfadaki `/a/bundles/couple-ürün-oluştur-fguz` linki bugün de 404.
- **Trafik (90 gün):** 2.660 oturum; giriş sayfaları arasında 2. sırada. Kaynaklar:
  - Instagram: 1.883
  - Facebook: 421
  - Doğrudan: 351
  - Haftalık en yüksek: 855 (14 Eylül haftası). Geçen hafta 126, bu hafta 14 oturum aldı.
  - Büyük olasılıkla reklam, bio ya da hikâye linki.
- **Bu adrese link veren yerler:**
  - Menülerde, sayfa gövdelerinde, ürün ve koleksiyon açıklamalarında, politikalarda ve temanın GemPages dışı dosyalarında yok.
  - Yalnızca GemPages bölümlerinin içinde var.
  - Trafik site dışından geliyor.
- **Öneri:** Reklam ve bio linklerini `/pages/couple-daha-fazla-bilgi-al` adresine çevirin; o adres 90 günde 5.959 oturumla en çok giriş alan sayfa. Ardından sayfaya `couple-daha-fazla-bilgial` şablonu atanmalı.
  - Bu yolla adres ve reklam parametreleri çalışmaya devam eder; silme yok, geri alınabilir.
  - 301 ancak sayfa gizlenirse ya da silinirse çalışır (Shopify, var olan bir sayfanın adresini yönlendirmez). Bu yüzden ikinci seçenek.

## 1b. GemPages bağımlılık listesi

- **GemPages şablonu kullanan sayfalar:**
  - 11 yayındaki sayfa (tabloda VAR yazanlar).
  - 2 gizli sayfa:
    - `ana-sayfa`
    - `event-zaman-kapsulu`: şablonu hiçbir temada yok.
  - Sayfa gövdelerinin hepsi boş (0 karakter): içerik sayfada değil, tema dosyalarında.
- **Ürün ve koleksiyon:**
  - GemPages şablonlu aktif ürün ve koleksiyon yok.
  - Taslak ürün `couple-urun-olustur`, temada olmayan `gp-template-588582642866193347` şablonunu istiyor ve bugün de `product.json`'a düşüyor; etkisi yok.
- **Tema dosyaları:**
  - Yayındaki temada, Prizma kopyasında ve Concept tabanlı 12 taslakta GemPages'e ait yaklaşık 162 dosya var (11 sayfada kullanılanlar dahil). Dağılımı:
    - 132 section
    - 11 snippet
    - 14 template
    - 4 layout
    - 1 css
  - `index`, `collection` ve `product` için `gem-*` / `gp-template-bk-default` şablonları hiçbir kayda atanmamış.
  - `gp-global-section` dosyalarını hiçbir şablon kullanmıyor.
  - `layout/theme.gempages.*` kullanılmıyor.
- **App embed:**
  - "GemPages `embed-gp-script-head`" yayındaki temada ve Prizma'da **AÇIK**.
  - Her sayfada (ana sayfa dahil) GemPages uzantı betiği ve `files.gempages.net` fontları yükleniyor.
  - Engelleme benzetiminde temanın kendi sayfalarında görünür değişiklik yok.
- **Linkler ve görseller:**
  - Menülerde, sayfa gövdelerinde, 84 ürün ve 17 koleksiyon açıklamasında ve politikalarda GemPages sayfasına ya da GemPages CDN'ine giden link ya da görsel **yok**.
  - Temada iki zararsız eşleşme var:
    - Footer'da `/pages/kullanim-kilavuzu` linki (sayfa duruyor).
    - Başlıktaki `/pages/iletisimsayfasi` → `/pages/iletisim` çevirisi.
  - Yönlendirmeler:
    - `/pages/contact-page-mar-5-21-32-02` → `/pages/iletisimsayfasi` (sorunsuz)
    - `/pages/landing-page-feb-16-11-03-09` → `/pages/text-to-next-pro-1` (hedef GemPages)
- **Medya nerede:**
  - GemPages görselleri mağazanın Shopify Files alanında (`cdn.shopify.com/.../files/gempages_*`); kalır.
  - Videolar Shopify video CDN'inde; kalır.
  - GemPages'e bağlı olanlar:
    - Çalışma betikleri (`assets.gemcommerce.com`)
    - Fontlar (`files.gempages.net`)
    - Uygulama eklentisi (`cdn.shopify.com/extensions/…`)

### GemPages şu an kaldırılırsa ne bozulur
- **Bozulmayanlar:** Temanın kendi sayfaları; ana sayfa, koleksiyonlar, ürünler, sepet, yasal sayfalar, /pages/iletisim ve anlatım sayfaları. Benzetimde bu sayfalarda metin, görsel ya da video kaybı ölçülmedi.
- **Bozulanlar:** GemPages şablonuna bağlı 11 yayındaki sayfa. İçerikleri GemPages'in tema dosyalarında, sayfa gövdeleri boş. 404 veren adres olmaz (sayfalar duruyor), ama içerik bozulur:
  - Basılı QR'ların gittiği kılavuz ve iki alt kılavuz
  - Eski iletişim sayfası
  - Sözleşmeler sayfası
  - Reklam trafiği alan Couple satış sayfası
- **Tema dosyaları kalırsa:** GemPages betikleri ve fontları kalkınca videolar ve geç yüklenen görseller gelmez. Benzetimde:
  - couplezamankapsulleri: 11 videonun 9'u yüklenmedi.
  - Bireysel kılavuz: 3 videonun 3'ü yüklenmedi.
  - landing-page-apr-7: 157 görselin 143'ü yüklenmedi.
- **Uygulama tema dosyalarını da silerse:** Bu sayfalar varsayılan `page.json` şablonuna düşer. Gövdeleri boş olduğu için kendi içerikleri tamamen kaybolur.
- **Kalıcı medya:** Görseller ve videolar Shopify'da olduğu için medya kaybı yok; kaybolan GemPages fontları ve betikleri.

### Hüküm: KALDIRILAMAZ — önce şunlar yapılmalı (sıralı)
1. Yayına alınacak temayı yayına alın (Prizma; bölüm 2). GemPages kuruluyken her yayına almada sayfaları kendi şablonuna geri bağlıyor, bu yüzden önce bu adım.
2. Hemen ardından 7 sayfanın şablon ekini yeniden ayarlayın:

   | Sayfa | Şablon eki |
   |---|---|
   | kullanim-kilavuzu | kilavuz |
   | bireysel-hediye-kullanim-kilavuzu | kilavuz-bireysel |
   | couple-hediye-kullanim-kilavuzu | kilavuz-couple |
   | iletisimsayfasi | iletisim |
   | sozlesmeler | sozlesmeler-liste |
   | couplekapsuldahafazlabilgial | couple-daha-fazla-bilgial |
   | hediyekapsuldahafazlabilgial | hediye-daha-fazla-bilgial |

3. couplezamankapsulleri: önce reklam ve bio linklerini çevirin, sonra şablonu `couple-daha-fazla-bilgial` yapın (yukarıdaki öneri).
4. Üç eski landing sayfası: gizleyip 301 ile `/` adresine yönlendirmeyi öneriyorum.
   - Sayfalar: "Ana Sayfa" dec-12, apr-7 ve text-to-next-pro-1.
   - Trafikleri 90 günde 7–11 oturum.
   - text-to-next-pro-1 için karar "Text To Next PRO" projesine bağlı.
5. Kontrol: Temiz oturumda telefon ve masaüstünde açılmalı:
   - 3 QR adresi
   - 2 alt kılavuz
   - iletisimsayfasi
   - sozlesmeler
   - couplezamankapsulleri

   Hepsinde kaynakta gp- izi kalmamalı.
6. Tema düzenleyicide GemPages app embed'ini kapatın, 1 gün izleyin, sonra uygulamayı kaldırın. Bu süre içinde başka bir temayı yayına almayın.
7. Kaldırdıktan sonra 5. adımı tekrarlayın ve şablon eklerinin geri dönmediğini doğrulayın. GemPages'in 162 tema dosyası sonra ayrı bir temizlik işiyle silinebilir.

## 2. Taslak temalar

Yayındaki temanın kendi dosya sayısı 699.

| Tema | ID | Rol | Son güncelleme (UTC) | Dosya | Yayından farkı |
|---|---|---|---|---|---|
| Duzeltme - masaustu galeri - 2026-10-19 | 189247717696 | MAIN | 10-19 11:18 | 699 | – |
| Prizma - 2026-10-19 | 189250076992 | taslak | 10-19 14:04 | 700 | Yalnızca Prizma işi: 9 değişen + 1 yeni dosya (tt-cark-rozet). Yayında olup Prizma'da olmayan dosya yok. |
| Tasarim dili - 2026-10-16 | 189140861248 | taslak | 10-19 11:17 | 699 | Yayının gerisinde: galeri düzeltmesi (`tt-urun-dil`) yok, GemPages'in 3 dosyasının eski sürümü var. Kendine özgü iş yok. |
| Calisma kopyasi - 2026-10-15 | 189124936000 | taslak | 10-15 17:33 | 674 | Eski çalışma kopyası. 118 dosya yayındaki sürümden geride; 3 test şablonu (`product.ttwpm1-3`) bilerek silinmişti. |
| Redesign - 2026-10 | 189109076288 | taslak | 10-14 23:56 | 670 | Tasarım dili denemesi (`tt-tasarim-dili.liquid`); sonra Tasarim dili temasında yeniden yapıldı. |
| Text To Next PRO - Çalışma | 188945072448 | taslak | 10-09 12:27 | 679 | Ayrı proje: PRO landing (`pro-*`, 11 dosya); yayında yok, tamamlanmamış. |
| Calisma taslagi - 2026-10-05 | 188825207104 | taslak | 10-18 20:03 | 669 | 18.10'a kadar yayındaki tema. 15.10'dan sonra dosya değişikliği yok; 18.10 tarihi rol değişikliğinden. |
| Urun sagsutun - 2026-09-04 | 188045295936 | taslak | 10-14 19:41 | 671 | Eylül–Ekim başı çalışmaları (çark, seçim kartları), sonradan geliştirilmiş hâlleri yayında. |
| Catal renk ayarlari / Catal karsilastirma | 188044443968 / 188025372992 | taslak | 10-04 / 09-22 | 630 | Eylül denemeleri (`tt-catal-karsilastirma`). |
| Duzeltme 4 / 6 / 7 | 187519172928 / 187538866496 / 187540275520 | taslak | 09-22 | 623–628 | Ağustos kupon şeridi ve buton denemeleri. |
| Concept temasının kopyası | 184430297408 | taslak | 04-01 | 348 | Mart'taki Concept tabanı. |
| Dawn, Prestige ×2, SparkLayer Dawn | – | taslak | 2024–2026 | 178–308 | Başka tema tabanları; ilgisiz. |

**Dünkü işler yayında mı?**
- Evet. GemPages taşıma şablonları, kılavuz, iletişim, footer, sepet ve yasal işlerin hepsi yayındaki temada:
  - Tasarim dili + galeri düzeltmesi, bugün yayına alınan kopya.
  - Prizma'da da birebir var.
- İki eksik var:
  1. **Sayfa şablon ekleri.** Bu tema dosyası değil, mağaza verisi; GemPages geri çevirdi (bölüm 1).
  2. **Kılavuzdaki geçici önizleme ayarının temizliği hiçbir temada yok.**
     - Repo commit `6da03b5`: `sections/tt-kilavuz.liquid` ve `templates/page.kilavuz.json`.
     - Dün yayındaki temaya yazma kapalı olduğu için yüklenemedi.
     - Yayında ve Prizma'da geçici betik ve `onizleme_view` ayarı duruyor. Betik yalnızca adres `?view=kilavuz` içerdiğinde linklere `?view` ekliyor; şablon eki ayarlanınca ziyaretçi etkilenmiyor. Yine de temizlenmeli.
- **Prizma'nın tabanı:** Yayındaki tema 11:18:09'dan beri değişmedi (MD5 listesi aynı); Prizma 12:20'de onun kopyası olarak alındı. Kopyadan sonra yayına giren değişiklik yok; Prizma yayına alınınca hiçbir şey kaybolmaz.

**Birleştirme planı (uygulanmadı, onayınızı bekliyor):**
1. Prizma'ya 2 dosya: `sections/tt-kilavuz.liquid` ve `templates/page.kilavuz.json`, repo `6da03b5` sürümü. Çakışma yok; Prizma'daki sürümler yayındakiyle aynı.
2. Prizma'yı yayına alın.
3. Bölüm 1'deki 2–7. adımlar: şablon ekleri, couplezamankapsulleri, eski landing sayfaları, GemPages'in kapatılması.
4. Kontroller:
   - Kılavuz QR adresleri (3) ve iki alt kılavuz
   - /pages/iletisim ve /pages/iletisimsayfasi
   - Hamburger menü ve linkleri
   - Çark rozeti ve yapışkan çubuk (çark aktif / süre doldu)
   - Prizma kartları: çok satanlar, Erkek, Couple setler
   - Sepet
   - Couple %50 indirim
   - Varyant değişiminde fiyat (Lumin)
   - Konsol hataları
   - Yayın temasının MD5 listesi

**Yayına alınacak tek tema: "Prizma - 2026-10-19" (189250076992).** Öncesinde 1. adımdaki kılavuz temizliği eklenmeli; yayın sonrasında sayfa şablon ekleri yeniden ayarlanmalı.

## Yayındaki temanın MD5 doğrulaması
- Başlangıç: 699 dosya, updatedAt 2026-10-19T11:18:09Z. Önceki dört kayıtla bayt bayt aynı.
- Bitiş: 699 dosya, rol MAIN, updatedAt 2026-10-19T11:18:09Z.
- Fark yok: eklenen ya da silinen dosya yok; md5, boyut ve updatedAt değişmemiş.
- İki JSON'un md5'i aynı: `edb7f357db7b7c4ec2e5fbef2e4ae2e7`.
