# GemPages'ten çıkış ve taslak temayı yayına alma: kontrol, envanter, yedek ve plan

Tarih: 17 Ekim 2026.

Bu aşamada mağazada ve temalarda **hiçbir şey değiştirilmedi.** Hiçbir şey silinmedi, yayından kaldırılmadı ya da yayına alınmadı. Yapılan işler şunlar:
- Okuma ve kontrol.
- Yedek dosyalarının repoya alınması.
- Tarayıcıda ekran görüntüsü ve benzetim.

Rapor bitince temaların son güncelleme zamanını Shopify'dan yeniden sorguladım:
- Yayındaki tema: 2026-10-14 19:41 UTC.
- Taslak tema: 2026-10-17 09:30 UTC. Bu, bu aşamadan önceki yasal çalışmanın son yüklemesi.

Bu aşamada iki temaya da yazılmadı. Taslak ve yayındaki temanın şablon MD5'leri de teşhisteki kayıtla aynı.

Temalar:
- **Çalışma teması:** "Tasarim dili - 2026-10-16" (189140861248, yayında değil). Kısaca TASLAK.
- **Yayındaki tema:** "Calisma taslagi - 2026-10-05" (188825207104). Kısaca YAYIN. Dokunulmadı.

Ekran görüntülerinde önizleme çubuğu gizlenmedi. Her görüntünün üstünde hangi temanın göründüğünü yazan bir şerit var:
- Yeşil şerit: yayındaki tema.
- Sarı şerit: taslak tema.

Her görüntünün teması, sunucunun döndürdüğü tema numarası ve önizleme çubuğu durumu aynı klasördeki `goruntuler.json` dosyasında.

İlgili dosyalar:

| Dosya | İçerik |
|---|---|
| `gempages-cikis/SON-RAPOR.md` | bu rapor |
| `gempages-cikis/TEMA-TESHIS.md` | önceki teşhis (eski tema açılıyor sorunu) |
| `gempages-cikis/MEDYA-LISTESI.md` | GemPages sayfalarının bütün medyası, sayfa sayfa |
| `gempages-cikis/KULLANIM-KILAVUZU.md` + `kullanim-kilavuzu/` | kılavuz sayfasının dökümü ve tam yedeği |
| `gempages-cikis/sozlesmeler/` | `/pages/sozlesmeler` yedeği ve iki PDF'in kopyası |
| `gempages-cikis/html/` | 11 yayındaki GemPages sayfasının sunucu HTML'i |
| `gempages-cikis/son-rapor-ekran/` | bu rapordaki etiketli ekran görüntüleri |
| `gempages-cikis/betikler/` | ölçümde kullanılan betikler (tekrar çalıştırılabilir) |
| `yasal/yedek-2026-10-17/` | eski politika ve sayfa metinleri. **Delil, silinmeyecek.** |

---

## Kısa özet

1. **Yayındaki sitede yasal metinlerin hiçbiri görünmüyor.**
   - 7 yasal sayfa ve "Sözleşmeler ve Politikalar" merkez sayfası, yayındaki temada video ve ürün şeridi gösteriyor; metin yok.
   - Bunun nedeni şu: yeni `yasal` ve `sozlesmeler` şablonları yalnızca taslak temada var. Yayındaki temanın varsayılan sayfa şablonunda metin bölümü de kapalı.
   - Taslak tema yayına alınınca bu kendiliğinden düzelir. Bu, yayına almak için en güçlü gerekçe.
2. **4 Shopify politikası hâlâ eski metinde** (2024-03-19, yedekle birebir aynı).
   - Merkez sayfanın İade sekmesindeki eski metin buradan geliyor.
   - Yetkim olmadığı için politikaları sizin elle güncellemeniz gerekiyor.
3. **Taslak tema, yayındaki temanın bütün dosyalarını içeriyor.** Yayına alınınca hiçbir sayfa, ürün ya da koleksiyon şablonu kırılmıyor.
   - Uygulama eklentileri iki temada aynı.
   - Takip kodları (Meta, Google, TikTok, TrueProfit) temadan bağımsız ve iki temada aynı çalışıyor.
4. **GemPages kaldırılırsa 11 yayındaki GemPages sayfasının hepsi bozulur.** Kılavuz sayfası bunlardan biri.
   - Resimler ve videolar GemPages'in JavaScript'iyle yükleniyor.
   - Benzetimde kılavuz sayfasında yalnızca başlık kaldı.
   - Medyanın kendisi (görsel, video, PDF) zaten Shopify'da. Ölecek olan GemPages fontları ve bazı demo dosyaları. **Shopify Files'a taşınması gereken marka görseli yok.**
5. **Kullanım kılavuzu (QR'ın gittiği sayfa) masaüstünde ve tablette bugün de boş.** İçerik yalnızca telefonda görünüyor.
6. **Canlıda GemPages'in demo içeriği var:**
   - "Daha fazla bilgi al" sayfalarında stok fotoğraflı, "Doğrulanmış Profil" yazan 3 müşteri kartı.
   - Bir etkinlik sayfasında kırık video kutusu.

---

## 1. Yasal doğrulama

### 1.1 Mağaza içerikleri

| İçerik | Durum (bugün) |
|---|---|
| Politika: Hizmet şartları (`terms-of-service`) | **ESKİ.** Son güncelleme 2024-03-19, `yasal/yedek-2026-10-17/terms_of_service.html` ile birebir aynı. |
| Politika: Para iade (`refund-policy`) | **ESKİ.** 2024-03-19, yedekle aynı. Metin "İnternet mağazamızdan almış olduğunuz ürünlerde…" diye başlıyor. |
| Politika: Kargo (`shipping-policy`) | **ESKİ.** 2024-03-19, yedekle aynı. İçinde eski Mesafeli Satış Sözleşmesi var. |
| Politika: Gizlilik (`privacy-policy`) | **ESKİ.** 2024-03-19, yedekle aynı. |
| Sayfa `on-bilgilendirme-formu` | YENİ metin (BELGE 1 ile birebir) |
| Sayfa `cerez-politikasi` | YENİ metin (BELGE 6 ile birebir) |
| Sayfa `uygulama-kullanim-kosullari` | YENİ metin (BELGE 7 ile birebir) |
| Sayfalar `mesafeli-satis-sozlesmesi`, `gizlilik-sozlesmesi`, `i̇ade-kosullari` | YENİ metin (BELGE 2, 5, 3) |

Politikalar, API yetkisi (`write_legal_policies`) olmadığı için güncellenemedi. Elle güncelleme adımları `yasal/RAPOR-yasal-metinler.md` bölüm 1 ve 8'de.

### 1.2 Merkez sayfanın İade sekmesinde eski metin

- **Neden:** Merkez sayfanın İade sekmesi (`sections/legal-hub.liquid`, yalnızca taslakta var) metni `shop.refund_policy.body` alanından, yani Shopify'ın "Para iade politikası"ndan okuyor. O politika hâlâ eski olduğu için sekme eski metni gösteriyor. Bu, önbellekle ya da temayla ilgili bir sorun değil.
- **Çözüm:** "Para iade politikası" yeni metinle elle güncellenince sekme iki temada da kendiliğinden düzelir. İsterseniz sekme politikadan değil `i̇ade-kosullari` sayfasından okuyacak şekilde de değiştirilebilir (karar noktası K17).
- **Temiz oturum ekran görüntüleri** (`son-rapor-ekran/yasal/`):
  - `merkez-iade-taslak-telefon-etiketli.png` ve `merkez-iade-taslak-masaustu-etiketli.png`: **taslak tema, önizleme çubuğu görünüyor**. İade sekmesi eski metni gösteriyor.
  - `merkez-iade-canli-telefon-etiketli.png`: **yayındaki tema**. Merkez sayfada sekme hiç yok; video ve ürün şeridi var (bkz. 1.3).
  - `refund-policy-canli-telefon-etiketli.png`: **yayındaki tema**. `/policies/refund-policy` eski metni gösteriyor.
  - `iade-karsilastirma.png`: üçü yan yana.

### 1.3 Yayındaki sitede yasal sayfalar boş görünüyor (yeni bulgu)

Temiz oturumda sayfa içeriğinin metnini ölçtüm (`betikler/` altındaki `metin.js` ile aynı yöntem):

| Sayfa | YAYIN (188825207104) | TASLAK (189140861248, önizleme) |
|---|---|---|
| `/pages/mesafeli-satis-sozlesmesi` | metin yok, video + ürün şeridi | 6.463 karakter, metin görünüyor |
| `/pages/on-bilgilendirme-formu` | metin yok | 3.191 karakter |
| `/pages/i̇ade-kosullari` | metin yok | 2.652 karakter |
| `/pages/gizlilik-sozlesmesi` | metin yok | 6.841 karakter |
| `/pages/cerez-politikasi` | metin yok | 1.224 karakter |
| `/pages/uygulama-kullanim-kosullari` | metin yok | 4.705 karakter |
| `/pages/sozlesmeler-ve-politikalar` | metin yok | sekmeli merkez sayfa |

- **Neden:** Bu sayfaların şablonu `page.yasal` / `page.sozlesmeler`. Bu şablonlar yalnızca taslak temada var. Yayındaki tema bu yüzden `page.json` şablonuna düşüyor ve orada metin bölümü (`main-page`) kapalı.
- Bu durum eski metinler için de böyleydi (yasal raporda not edildi).
- Taslak tema yayına alınınca düzelir. Yayındaki temaya dokunmamız yasak olduğu için o zamana kadar bir ara çözüm yok.

### 1.4 Yedekler repoda

`yasal/yedek-2026-10-17/` (commit `f275697`). `BENIOKU.md` dosyasında "BU KLASÖR SİLİNMEYECEK" yazıyor. İçinde şunlar var:
- 6 politikanın eski HTML'i ve tam JSON dökümü.
- Eski 4 yasal sayfanın tam dökümü (`eski-yasal-sayfalar.json`).
- `MD5SUMS.txt`.

Bugün mağazadaki 4 politika bu yedeklerle birebir aynı. Yani yedek, değişmemiş hâlin tam kopyası.

---

## 2. Header birleştirme planı (yalnızca plan)

**Hedef:** Taslak temada her sayfada siyah `tt-baslik` olsun; eski beyaz header hiçbir yerde görünmesin.

**Bugünkü durum (taslak tema):**
- `tt-baslik` yalnızca şu yerlerde var:
  - Ana sayfa: `layout/theme.liquid:264-266` → `sections/tt-anasayfa-cubuk.json`.
  - Ürün sayfaları: `theme.liquid:283-287` → `tt-urun-cubuk.json` ve `tt-couple-urun.json`.
  - Şablonun içine gömülü olanlar: `collection.celik-kolyeler`, `collection.couple-urunler`, `collection.zaman-kapsulu-bileklik`, `collection.zaman-kapsulu-kolyeler`, `page.couple-daha-fazla-bilgial`, `page.hediye-daha-fazla-bilgial`, `index.gp-template-bk-default`.
- Geri kalan her sayfada temanın beyaz header'ı görünüyor:
  - Merkez sayfa, yasal sayfalar ve politikalar.
  - İletişim, sepet, arama, 404, blog, hesap sayfaları.
  - Varsayılan koleksiyon ve ürün şablonları.
  - Bütün GemPages sayfaları.
- Beyaz header şuradan geliyor: `theme.liquid:214` → `sections/header-group.json` → `header` bölümü.
- Hamburger menü (`tt-menu-grup`, `theme.liquid:360`) zaten her sayfada tek kopya, ona dokunulmayacak.

**Yöntem (en az değişiklikle, geri alınması kolay):**

| # | Dosya | Değişiklik |
|---|---|---|
| 1 | `sections/tt-baslik-genel.json` (yeni) | Tek bir `tt-baslik` içeren yeni bölüm grubu. Ayarlar ürün sayfasındaki çubuktan kopyalanır: logo, menü, ara, sepet, `header_gizle: true`, `header_secici: [id$='__header']`. Düğme metni ve linki karar noktası K13. |
| 2 | `layout/theme.liquid` (283-287 arası) | Mevcut `if/elsif` zincirine bir `else` eklenir: `{% sections 'tt-baslik-genel' %}`. Böylece ana sayfa ve ürün sayfaları kendi çubuklarını kullanmaya devam eder. |
| 3 | `layout/theme.liquid` (aynı yer) | Çift başlık olmaması için şablonun içinde zaten `tt-baslik` olan 7 şablonda yeni grup çizilmez. Liquid'de bir son ek listesiyle kontrol edilir: `template.suffix` değeri `celik-kolyeler`, `couple-urunler`, `zaman-kapsulu-bileklik`, `zaman-kapsulu-kolyeler`, `couple-daha-fazla-bilgial`, `hediye-daha-fazla-bilgial` olanlar. Ayrıca bir CSS güvencesi eklenir: sayfada birden fazla `.tt-baslik` varsa yalnızca ilki görünür. |
| 4 | `sections/header-group.json` | **Değişmez.** Beyaz header kodda kalır, `tt-baslik`'in `header_secici` ayarı onu CSS ile gizler. Geri almak için 2. adımdaki satırı silmek yeter. |

**Kapsanacak sayfalar** (hepsi `layout/theme.liquid` kullanıyor, bu yüzden tek değişiklik hepsine uyar):
- Merkez sayfa, 7 yasal sayfa ve `/policies/*`.
- `/pages/iletisim`, `/pages/iletisimsayfasi` ve `contact`.
- `/cart`, `/search`, `/404`, blog ve makaleler, `/collections` listesi.
- Varsayılan `collection.json` ve `product.json`.
- 13 GemPages sayfası.

Kapsam dışı kalanlar: ödeme sayfası (Shopify'ın kendi sayfası), şifre sayfası ve hediye kartı (ayrı layout dosyaları kullanıyorlar).

**Test:** Her sayfa türü için telefon ve masaüstünde, önizleme çubuğu görünür ve tema etiketli ekran görüntüsü alınacak. Kontrol edilecekler:
- Tek başlık var mı?
- Gövdenin üst boşluğu (`bar_yuk_m/d`) GemPages'in tam genişlik bölümleriyle çakışıyor mu?
- Ara ve sepet ikonları temanın çekmecelerini açıyor mu?

---

## 3. İletişim: `https://shop.texttonext.com/#` linki (değiştirilmedi)

**Linkin bulunduğu yerler:**
- **`/pages/iletisim` sayfasının gövdesi** (sayfa ID 134497337664). Link "Caddebostan Mah., Ogün Sok., No: 1/14, Kadıköy, İstanbul." adresini sarıyor. Aynı sayfada bilgi@texttonext.com ve "Hafta İçi: 09:30 - 18:00" yazıyor.
- **`/pages/iletisimsayfasi`** (GemPages). Şablon ayarı `ggxoXXaXEre_text` (`templates/page.gp-template-556461893263295681.json:35`, iki temada da var). Bölüm dosyası: `sections/gp-section-556461993255503041.liquid:664`. Burada saat "Hafta içi her gün 10:00-18:00".

**Yeni bulgular:**
- **`shop.texttonext.com` hiç çalışmıyor.** Alan adı Shopify'a yönleniyor ama mağazaya bağlı değil: HTTPS'te sertifika hatası, HTTP'de 409 Conflict. Yani link bugün de kırık.
- **`/pages/iletisim` gövdesi iki temada da görünmüyor.** Sayfa varsayılan şablonu kullanıyor ve orada metin bölümü kapalı. Footer'daki "İletişim" linki bu sayfaya gidiyor ve ziyaretçi adres yerine video ile ürün şeridi görüyor. Ana menüdeki "İletişim" ise `/pages/iletisimsayfasi` sayfasına gidiyor; orası görünüyor.

**Öneri:**
- Link Google Haritalar'a gitsin ve **doğru adresi** göstersin:
  `https://www.google.com/maps/search/?api=1&query=<adres>`
- Yasal metinlerdeki resmi adres: "Göztepe Mah. Tepegöz Sk. Ikar İş Merkezi No:1 İç Kapı No:8 Kadıköy/İstanbul".
- Hangi adresin gösterileceği, e-posta (bilgi@ mi info@ mi) ve çalışma saati (09:30 mu 10:00 mu) karar noktası K5.
- `/pages/iletisim` için iki seçenek:
  - (a) Temanın iletişim şablonu bağlansın (`page.contact`). Sayfanın şablonu değişir ama adresi aynı kalır.
  - (b) Footer'daki "İletişim" linki `/pages/iletisimsayfasi` sayfasına çevrilsin.

  Karar noktası K7.

---

## 4. GemPages envanteri

Teşhiste toplanan bilgiler (`TEMA-TESHIS.md`) burada yeniden kullanıldı. Bugün iki temanın şablon listeleri ve MD5'leri yeniden sorgulandı; teşhisteki kayıtla aynı çıktı.

### 4.1 Sayfalar

"Tema" sütunundaki "iki temada, aynı" ifadesinin anlamı: şablon ve bölüm dosyaları yayındaki ve taslak temada MD5 olarak eşit. Taslak tema yayına alınınca bu sayfalar bugünkü gibi görünmeye devam eder.

| URL | Başlık | Yayında | Tema (şablon) | Medya nerede | GemPages kaldırılınca bozulur mu |
|---|---|---|---|---|---|
| `/pages/landing-page-dec-12-23-44-18` | Ana Sayfa | evet | iki temada, aynı (`gp-template-544431830779036655`) | 43 görsel Shopify Files, 2 video Shopify. Fontlar GemPages (SF Pro). Uploadcare görseli gizli yardımcı. | **Evet.** Görseller JS ile yükleniyor (36 `data-srcSet`), fontlar ölür. |
| `/pages/ana-sayfa` | Ana Sayfa | **hayır** | aynı şablon (544431830779036655) | (aynı) | yayında değil |
| `/pages/text-to-next-pro-1` | Landing Page - Feb 16, 11:03:09 | evet | iki temada, aynı (553922254656766857) | 6 görsel Files, 5 video Shopify. 1 başka mağaza görseli (**kırık video kutusu, masaüstünde görünüyor**). Fontlar GemPages (MorebiRounded, Poppins 700). | **Evet** |
| `/pages/iletisimsayfasi` | Contact Page - Mar 5, 21:32:02 | evet | iki temada, aynı (556461893263295681) | 5 görsel Files. Google Fonts. | **Evet** (düzen ve 6 görsel JS ile). Ana menü buraya gidiyor. |
| `/pages/event-zaman-kapsulu` | Event Zaman Kapsülü | **hayır** | **şablon iki temada da yok** (562089975860954304) | – | bugün de şablonsuz |
| `/pages/landing-page-apr-7-16-02-03` | Landing Page - Apr 7, 16:02:03 | evet | iki temada, aynı (561200095932974170) | 147 görsel Files, 1 video. 7 demo mağaza dosyası (3 küçük ikon görünüyor). Uploadcare gizli. Fontlar GemPages. | **Evet** |
| `/pages/couplezamankapsulleri` | Couple Landing Page | evet | iki temada, aynı (593136672170836500) | 44 görsel Files, 11 video Shopify. Uploadcare gizli yardımcı. Fontlar GemPages. | **Evet.** Benzetimde 23 videodan 21'i, 126 görselden 122'si boş kaldı. |
| `/pages/kullanim-kilavuzu` | Kullanım Kılavuzu | evet | iki temada, aynı (600755391629886309) | 3 kart görseli Files, 1 video Shopify | **Evet.** Benzetimde yalnızca başlık kaldı. **QR adresi.** |
| `/pages/bireysel-hediye-kullanim-kilavuzu` | Bireysel Hediye Kullanım Kılavuzu | evet | iki temada, aynı (600758654311858837) | 3 video Shopify | **Evet.** 3 videonun 3'ü de kaynaksız kaldı. |
| `/pages/couple-hediye-kullanim-kilavuzu` | Couple Hediye Kullanım Kılavuzu | evet | iki temada, aynı (600760696552030795) | 1 video Shopify | **Evet** (aynı yapı) |
| `/pages/couplekapsuldahafazlabilgial` | Landing COUPLE Kapsül Daha Fazla Bilgi Al V2 | evet | iki temada, aynı (601917426203886298) | 35 görsel Files, 6 video. 15 demo mağaza dosyası (**3 stok avatar ve 3 ikon görünüyor**). | **Evet** (96 `data-srcSet`) |
| `/pages/hediyekapsuldahafazlabilgial` | Landing Bireysel Kapsül Daha Fazla Bilgi Al | evet | iki temada, aynı (601918380005393114) | 33 görsel Files, 8 video. Demo dosyalar aynı. | **Evet** (100 `data-srcSet`) |
| `/pages/sozlesmeler` | Landing Page - Feb 12, 23:15:13 | evet | iki temada, aynı (606324753770218070) | 2 PDF Shopify Files. Poppins 300/700 GemPages. | **Kısmen.** Düzen ve font bozulur, PDF linkleri çalışır. |

Notlar:
- **Benzetimin yöntemi:** Tarayıcıda yalnızca GemPages dosyaları engellendi: uygulama uzantısı `cdn.shopify.com/extensions/…/gempages-cro-172/…`, `assets.gemcommerce.com` ve `files.gempages.net`. Ekran görüntüleri `son-rapor-ekran/gempages-yok-benzetim/` klasöründe; şeritte "GEMPAGES ENGELLI (benzetim)" yazıyor.
- Uygulamayı gerçekten kaldırmak, uygulamanın tema eklentisini de kaldırır. Benzetim bunun **en hafif** hâlini gösteriyor.
- Bütün yayındaki GemPages sayfaları temanın kendi `layout/theme.liquid` dosyasını kullanıyor. GemPages layout dosyaları (`theme.gempages.*`) kullanılmıyor.

### 4.2 Ürün, koleksiyon, ana sayfa ve blog şablonları

- **Atanmış ama dosyası olmayan:** Aktif ürün `couple-urun-olustur` ("COUPLE ÜRÜN OLUSTUR") `gp-template-588582642866193347` şablonunu istiyor. Bu şablon **iki temada da yok**, ürün `product.json`'a düşüyor. Karar noktası K10.
- **Temada duran ama hiçbir kayda atanmamış GemPages şablonları** (iki temada da var, aynı):
  - `collection.gem-1786579373-template`, `collection.gem-backup-default`, `collection.gp-template-bk-default`
  - `index.gem-1786579368-template`, `index.gem-backup-default`, `index.gp-template-bk-default`
  - `product.gem-1786579371-template`, `product.gem-backup-default`, `product.gp-template-bk-default`
- **Bilgi:** Yayındaki `index.json` dosyası `index.gp-template-bk-default` ile, yayındaki `product.json` dosyası da `product.gp-template-bk-default` ile birebir aynı (MD5 eşit). GemPages'in aldığı yedek bunlar. İçlerinde GemPages bölümü yok.
- Blog: tek blog `news`, makale yok, GemPages yok.

### 4.3 Temadaki GemPages dosyaları (iki temada da aynı, 168 dosya)

| Tür | Adet |
|---|---|
| `sections/gp-section-*` | 113 |
| `sections/gp-global-section-*` | 18 (hiçbir şablon kullanmıyor) |
| `snippets/gp-section-*-N` | 10 |
| `snippets/gp-head.liquid`, `sections/gp-variant-selected.liquid`, `assets/gp-global.css` | 3 |
| `layout/theme.gempages.blank/header/footer.liquid`, `layout/theme.gem-layout-none.liquid` | 4 (kullanılmıyor) |
| `templates/*gp-template*` ve `*gem-*` | 20 |

- `layout/theme.liquid` içinde GemPages'e ait hiçbir satır yok (iki temada da).
- **Uygulama eklentileri** (iki temanın `settings_data.json` dosyasında aynı):
  - GemPages `embed-gp-script-head`: **açık**.
  - Shopify Inbox sohbet: açık.
  - Wheelio: kapalı.
- GemPages'in genel font tanımı (app embed) taslak temada **Poppins 500 ve 700** dosyalarını `files.gempages.net` sunucusundan yüklüyor. Taslak temanın kendi Poppins ağırlıkları 400, 600, 700 ve 400 italik. GemPages kalkınca 500 ağırlığı tarayıcı tarafından taklit edilir. Taslak temaya Poppins 500 eklenmesini öneriyorum (kontrol listesi madde 8).

### 4.4 Yönlendirmeler

| Kaynak | Hedef |
|---|---|
| `/pages/landing-page-feb-16-11-03-09` | `/pages/text-to-next-pro-1` |
| `/pages/contact-page-mar-5-21-32-02` | `/pages/iletisimsayfasi` |
| `/pages/i%cc%87letisim` | `/pages/iletisim` |

Kılavuz sayfalarına ve `/pages/sozlesmeler` sayfasına giden yönlendirme yok. Bu sayfalardan başka yere giden yönlendirme de yok.

### 4.5 Sitede ve menülerde bu sayfalara giden linkler

Tam liste Ek A'da (dosya:satır). Özet:
- **`_ab` ekli 5 link adresi:**
  - `couplekapsuldahafazlabilgial?_ab=0&key=1768300603877`
  - `couplezamankapsulleri?_ab=0&key=1763216087047`
  - `bireysel-hediye-kullanim-kilavuzu?_ab=0&key=1767610417973`
  - `couple-hediye-kullanim-kilavuzu?_ab=0&key=1767611056807`
  - `iletisimsayfasi` (tam adresle)

  Hepsi GemPages bölümlerinin içinde. Talimatınıza göre taşıma sırasında kendiliğinden kalkacaklar.
- **Menüler:**
  - `main-menu` içindeki "İletişim" → `/pages/iletisimsayfasi`.
  - `footer` → `/pages/iletisim`, `/pages/mesafeli-satis-sozlesmesi`, `/pages/gizlilik-sozlesmesi`.
  - `footer-yasal` → merkez sayfa.
- **Taslak temanın hamburger menüsü:** `sections/tt-menu-grup.json:43` ve `sections/tt-menu.liquid:32,593` → `/pages/iletisimsayfasi`.
- `/pages/kullanim-kilavuzu` ve `/pages/sozlesmeler` sayfalarına sitede hiçbir link yok. Bu sayfalara yalnızca QR, mobil uygulama ya da dış linklerle ulaşılıyor.

---

## 5. Medya ve Shopify Files listesi

Ayrıntılı liste `MEDYA-LISTESI.md` içinde. Her sayfa, her dosya, tam URL ve barındırma bilgisi orada.

Bugünkü ek kontrol: GemPages kalınca ölecek ya da riskli görünen 30 kalemin her birinin ekranda **görünür olup olmadığına** baktım ve dosyaları indirip açtım.

| Kalem | Ne olduğu | Ekranda görünüyor mu | Öneri |
|---|---|---|---|
| Uploadcare `46d5a88e…`, `ee6d5074…` | GemPages demo stok fotoğrafları (sırt çantası, çantalar) | **Hayır.** `gp-invisible` sınıflı tembel yükleme yardımcısı. | **Taşınmaz.** Taşımada kendiliğinden kalkar. |
| `1/2005/9307/files/image_demo.jpg` | GemPages demo (çanta fotoğrafı) | Hayır. Masaüstü yer tutucusu ve ham HTML'deki `src`. | Taşınmaz |
| `1/2005/9307/files/background_settings.jpg` | GemPages demo (çöl) | Hayır (gizli) | Taşınmaz |
| `1/2005/9307/…f132cfa5….png`, `…0f3f1b4e….png`, `…c9f13168….png` | Stok kişi fotoğrafları | **EVET.** "Daha fazla bilgi al" sayfalarında, isimli ve "Doğrulanmış Profil" yazan 3 yorum kartında (`son-rapor-ekran/demo-icerik/`). | **Taşınmaz.** Bölümün kendisi karar noktası K3. |
| `1/2005/9307/…eadfcdf8….svg`, `…59903377….svg`, `…dc703bc9….svg` | 24 px ikonlar: kişi, yıldız, onay | **Evet** (3 sayfada) | İsterseniz Shopify Files'a yüklenir, ya da temanın kendi ikonları kullanılır |
| `1/0703/5214/2562/…3d3a4631….jpg` | Kırık video yer tutucusu | **Evet.** `text-to-next-pro-1` masaüstünde 569×569 gri kutu. | Taşınmaz. Yerine gerçek video ya da hiçbir şey konur (K4). |
| `files.gempages.net` fontları: SF-Pro-Display/Text (8 ağırlık), MorebiRounded 500, Poppins 300/500/700 | GemPages hesabındaki font dosyaları | Evet (metinler bu fontlarla çiziliyor) | **Taşınmaz.** SF Pro, Apple lisanslı ve web'de gömülemez. Temanın fontları (Poppins ve Inter) kullanılır (K2). |

**Shopify Files'a taşınması zorunlu olan: yok.** Sayfalardaki bütün marka görselleri, videolar ve PDF'ler bugün zaten bu mağazanın Shopify Files ve video deposunda.

İsteğe bağlı taşınabilecekler:
- Yukarıdaki 3 SVG ikon (kişi, yıldız, onay; 24 px), tasarımda kalacaklarsa:
  - `https://cdn.shopify.com/s/files/1/2005/9307/files/gempages_432750572815254551-eadfcdf8-0c28-40e6-9c37-440b21e86fba.svg`
  - `https://cdn.shopify.com/s/files/1/2005/9307/files/gempages_432750572815254551-59903377-dce6-4988-a84e-9c2dfb018dfa.svg`
  - `https://cdn.shopify.com/s/files/1/2005/9307/files/gempages_432750572815254551-dc703bc9-72bb-4f85-bc9c-54999f655dc8.svg`

### Taşıma yöntemi (her GemPages sayfası için aynı)

1. **Taslak temada** sayfaya özel yeni bir şablon hazırlanır (`templates/page.<ad>.json`). İçerik temanın kendi bölümleriyle kurulur. Metinler birebir kopyalanır. Medya için mevcut Shopify Files ve video adresleri kullanılır. Linkler `?_ab=…` eki olmadan yazılır.
2. **Önizleme sayfaya dokunmadan yapılır:** `…/pages/<handle>?view=<ad>&preview_theme_id=189140861248`. Bu, alternatif şablonu sayfanın şablonunu değiştirmeden çizer. Ekran görüntüleri önizleme çubuğu görünür ve tema etiketli alınır.
3. Onayınızdan sonra **yalnızca sayfanın template suffix alanı** yeni şablona çevrilir. Handle, URL, başlık ve yönlendirmeler değişmez.
4. **Zamanlama önemli:** Yeni şablon yalnızca taslak temada olduğu sürece, sayfanın şablonunu taslak tema yayına alınmadan **önce** değiştirmek o sayfayı yayındaki sitede boşaltır. Yasal sayfalarda bugün yaşanan sorun tam olarak bu. Bu yüzden suffix değişiklikleri taslak tema yayına alındıktan **sonra**, sayfa sayfa yapılır.
   - Yayına aldıktan sonra GemPages şablonları yeni yayındaki temada da durduğu için, değişiklik yapılana kadar sayfalar eskisi gibi çalışır. Kesinti olmaz.
   - Geri almak gerekirse suffix eski GemPages şablonuna döndürülür.
5. **Önerilen sıra:**
   1. `kullanim-kilavuzu` ve iki alt sayfası (QR).
   2. `iletisimsayfasi` (ana menü).
   3. `couplezamankapsulleri`.
   4. `couplekapsuldahafazlabilgial` ve `hediyekapsuldahafazlabilgial`. Temada bunların yerine geçebilecek hazır şablonlar zaten var: `page.couple-daha-fazla-bilgial` ve `page.hediye-daha-fazla-bilgial`. Aynı şablonu kullanmak bir seçenek, karar noktası K18.
   5. `landing-page-dec-12-23-44-18`, `landing-page-apr-7-16-02-03`, `text-to-next-pro-1`, `sozlesmeler`.
6. Bütün sayfalar taşınıp doğrulandıktan sonra GemPages'i siz kaldırırsınız. Kaldırdıktan sonra bütün sayfalar yeniden kontrol edilir. Temada kalan `gp-*` dosyalarının temizliği ayrıca onaya sunulur.

---

## 6. Kullanım kılavuzu

Ayrıntı ve tam yedek `KULLANIM-KILAVUZU.md` ve `kullanim-kilavuzu/` içinde. Özet:

**Adresler ve yapı:**
- QR'ın gittiği adres `https://texttonext.com/pages/kullanim-kilavuzu` (sayfa ID 159765332288).
- `www`, `http` ve `myshopify` yazımları 301 ile bu adrese gidiyor. `shop.texttonext.com` yazımı **açılmıyor**.
- İki alt sayfa var: `bireysel-hediye-kullanim-kilavuzu` ve `couple-hediye-kullanim-kilavuzu`.
- Ana sayfada 5 bölüm var: başlık, 3 satır metin, 3 resimli kart. Bireysel sayfada 8 bölüm ve 3 video, couple sayfasında 4 bölüm ve 1 video var.
- Kart yazıları resmin içine gömülü. Metinler birebir dosyada.

**Medya:**
- 3 kart görseli ve 4 video, hepsi Shopify'da ve sağlam.

**Bulgular:**
- **Masaüstünde ve tablette sayfa bugün de boş.** GemPages satırları 767 px üstünde gizli.
- **GemPages kalkınca telefonda da bozuluyor** (benzetim).

**Yedekler:**
- Sunucu HTML'i.
- Render edilmiş DOM, masaüstü ve telefon.
- Şablon ve 17 bölüm dosyası.
- Etiketli ekran görüntüleri: 6 yayın, 2 taslak (önizleme çubuğu görünür).
- `MD5SUMS.txt`.

---

## 7. `/pages/sozlesmeler`

| | |
|---|---|
| Adres | `https://texttonext.com/pages/sozlesmeler` (yayında, başlık "Landing Page - Feb 12, 23:15:13") |
| Şablon | GemPages `gp-template-606324753770218070`, iki temada aynı |
| İçerik | "Sözleşmeler" / "İlgili sözleşmeye tıklayarak ulaşabilirsiniz." ve iki düğme |
| PDF 1 | "KVKK ve Açık Rıza" → `https://cdn.shopify.com/s/files/1/0864/8953/0688/files/kvkk_acik_riza.pdf?v=1770927592`. **Shopify Files** (bu mağaza), 702.111 B, 7 sayfa, Word 2016'da 14.04.2023'te oluşturulmuş. |
| PDF 2 | "Üyelik Sözleşmesi" → `https://cdn.shopify.com/s/files/1/0864/8953/0688/files/uyelik_sozlesmesi.pdf?v=1770927723`. **Shopify Files**, 583.352 B, 5 sayfa, 14.04.2023. |
| Linkler | Temalarda, menülerde ve sayfalarda bu adrese **hiç link yok**. PDF adresleri yalnızca bu sayfanın kendi GemPages bölümünde geçiyor (`sections/gp-section-606324820946191108.liquid`, 13 temanın hepsinde). Büyük olasılıkla mobil uygulama ya da eski e-postalar bu adrese gidiyor. |
| Yedek | `sozlesmeler/pdf/` (iki PDF ve sunucu başlıkları), `sozlesmeler-sunucu.html`, `ekran/` (yayın masaüstü ve telefon, taslak telefon) |

**Dikkat:** PDF'ler yeni yasal metinlerle çelişiyor.
- Unvan "Text to Next **Teknoloji Anonim Şirketi**". Yeni metinlerdeki unvan "Text To Next Mücevherat Sanayi ve Ticaret Ltd. Şti.".
- Üyelik sözleşmesi ürünü "üzerinde **karekod (QR)** bulunan fiziki ürün" olarak tanımlıyor. Yeni metinler NFC çipten söz ediyor.

**Öneri** (adres aynı kalır, sayfa silinmez, yönlendirme eklenmez):
- **A (önerilen):** Sayfanın şablonu, temada yeni bir `page.sozlesmeler-liste.json` şablonuna çevrilir. Bu sayfa merkez sayfaya ve 8 yasal metne link veren sade bir liste olur.
  - Alta isterseniz "Önceki sürümler (14.04.2023, arşiv)" başlığıyla iki PDF eklenebilir. Yanlarında yürürlükte olmadıkları açıkça yazar.
  - Sayfa başlığı "Sözleşmeler" yapılır. Başlık değişikliği adresi değiştirmez.
- **B:** Sayfa doğrudan merkez sayfanın şablonunu (`sozlesmeler`) kullanır. Bu durumda aynı içerik iki adreste olur. Basit ama kopya içerik oluşur.
- PDF'ler Shopify Files'ta kalır, silinmez.
- Bir yönlendirme (redirect) koymak için sayfanın silinmesi ya da gizlenmesi gerekirdi. Kurala aykırı olduğu için önerilmiyor.
- Mobil uygulamanın bu adresi kullanıp kullanmadığı karar noktası K8.

---

## 8. Yayına alma kontrolü

### 8.1 Şablonlar

Bütün kayıtların template suffix değerleri taslak temadaki dosyalarla tek tek karşılaştırıldı: 33 sayfa, 81 ürün, 17 koleksiyon.

- **Yayındaki temada olup taslakta olmayan şablon: yok.** Taslak tema 685 dosya, yayın 669 dosya. Yayındaki her dosya taslakta da var.
- **Yayına alınınca kırılacak kayıt: yok.**
- **Yayına alınınca düzelecek kayıtlar:** 7 yasal sayfa ve merkez sayfa (`yasal` / `sozlesmeler` şablonları yalnızca taslakta var).
- **İki temada da şablonu olmayanlar** (bugün de varsayılan şablona düşüyor, yayına alma bunu değiştirmez):

| Tür | Handle | Durum | İstenen şablon | Not |
|---|---|---|---|---|
| sayfa | `hesap-silme-talebi` | **yayında** | `hesap-silme-talebi` | Gövde boş, iki temada da **boş görünüyor**. Uygulama mağazaları hesap silme sayfası istiyor olabilir (K11). |
| sayfa | `rewards-program-page` | **yayında** | `rise-full-page-template` | Rise uygulamasının şablonu yok, boş görünüyor (K12) |
| sayfa | `ar` | yayında değil | `ecom-ar` | – |
| sayfa | `event-zaman-kapsulu` | yayında değil | `gp-template-562089975860954304` | – |
| sayfa | `couple-zaman-kapsulu-yeni` | yayında değil | `page` | – |
| ürün | `couple-urun-olustur` | **AKTİF** | `gp-template-588582642866193347` | `product.json`'a düşüyor (K10) |
| koleksiyon | `klasik-zaman-kapsulu` | – | `klasik-zaman-kapsulu` | `collection.json`'a düşüyor |
| koleksiyon | `event-zaman-kapsulu` | – | `event-kapsul-koleksiyonu` | `collection.json`'a düşüyor |
| koleksiyon | `zaman-tuneli-fotograflar` | – | `zaman-tuneli` | `collection.json`'a düşüyor |

- **Varsayılan sayfa şablonunu kullanan ve gövdesi görünmeyen sayfalar** (`page.json`'da metin bölümü iki temada da kapalı): `iletisim` (footer linki!), `boyutlar`, `bundles` ve `collection-bundle`.
- **Yalnızca taslakta olan geçici dosyalar:** `templates/product.ttwpm1/2/3.liquid`. İçlerinde "Gecici test sablonu (2026-10-15)… silinebilir" notu var. Hiçbir ürüne atanmamışlar. Silinmeleri onaya bağlı (K16).

### 8.2 Uygulamalar, betikler ve ayarlar (YAYIN ile TASLAK karşılaştırması)

Temiz oturumda 6 sayfa (ana sayfa, tekli ürün, couple ürün, couple koleksiyonu, sepet, kılavuz) iki temada da açıldı ve bütün ağ istekleri karşılaştırıldı (`betikler/betik-karsilastirma.json`):

| Bileşen | YAYIN | TASLAK |
|---|---|---|
| Meta Pixel (`connect.facebook.net`, `fbq`) | var | var |
| Google Analytics, Google Ads, GTM (`gtag`, `googletagmanager`, `doubleclick`) | var | var |
| TikTok Pixel (`analytics.tiktok.com`) | var | var |
| TrueProfit (`wpx.svc.trueprofit.io`) | var | var |
| PayTR | var | var |
| Shopify Inbox sohbet | var | var |
| Wheelio (çark uygulaması) | kapalı | kapalı |
| GemPages uygulama eklentisi | açık | açık |
| Ürün sayfası uygulama blokları (`content-2`, `content-4`) | var | var |
| ManyChat, çeviri uygulaması, Judge.me ve benzeri yorum uygulamaları, Klaviyo | **yok** | **yok** |

- **Yayında olup taslakta olmayan betik, uygulama ya da ayar: yok.**
- Takip kodlarının hepsi Shopify'ın "Müşteri etkinlikleri" ve uygulama pikselleri üzerinden geliyor. `theme.liquid` dosyasında iki temada da takip kodu yok. Yani tema değişince takip kodları değişmez.
- Taslağın fazlası yalnızca kendi `tt-*` dosyaları ve önizleme çubuğunun betikleri.

### 8.3 Sıralı kontrol listesi

**A. Yayına almadan önce**

| # | İş | Kim | Not |
|---|---|---|---|
| 1 | 4 politikayı yeni metinle güncellemek | **siz, elle** | `yasal/RAPOR-yasal-metinler.md` bölüm 1. Merkez sayfanın İade sekmesi buna bağlı. |
| 2 | Ödeme sayfasındaki ücretsiz kargo kuralını 2.499 TL'den 2.000 TL'ye çekmek | siz, elle | Yasal rapor bölüm 5. Yapılmazsa site "ücretsiz" der, ödeme sayfası 99 TL alır. |
| 3 | Çerez bandı (Shopify) ve temanın kendi bandının kapatılması | siz ve ben | Yasal rapor 8.3 |
| 4 | Sipariş onay e-postasına yasal linkler | siz, elle | Yasal rapor 8.4 |
| 5 | Ürün sayfasındaki 9 çelişen ifadenin düzeltilmesi | ben, taslak temada | Yasal rapor bölüm 6, onay bekliyor |
| 6 | "Daha fazla bilgi al" tanıtım şablonlarındaki 2.499 → 2.000 | ben, taslak temada | Onay bekliyor |
| 7 | Header birleştirme (bölüm 2) | ben, taslak temada | Onay bekliyor |
| 8 | Poppins 500 ağırlığının taslak temaya eklenmesi | ben, taslak temada | GemPages kalkınca 500 ağırlığı kaybolmasın diye |
| 9 | `/pages/iletisim` görünürlüğü (K7) ve iletişim linki (K5, K6) | ben, onayla | |
| 10 | Kılavuz için yeni tema şablonlarının hazırlanması ve `?view=` ile önizlenmesi | ben, taslak temada | Suffix değişikliği yayından **sonra** |
| 11 | İsteğe bağlı: öteki GemPages sayfaları için şablonların hazırlanması | ben, taslak temada | Yayın öncesi ya da sonrası olabilir |
| 12 | Son tur ekran görüntüleri: her sayfa türü, telefon ve masaüstü, önizleme çubuğu görünür | ben | |

**B. Yayına alma**

| # | İş | Kim |
|---|---|---|
| 13 | Online Mağaza → Temalar → "Tasarim dili - 2026-10-16" → **Yayınla** | **siz** |
| 14 | Eski yayındaki tema ("Calisma taslagi - 2026-10-05") **silinmeyecek**. Geri dönüş için yedek olarak kalır. | – |

**C. Yayından hemen sonra (aynı gün)**

| # | Kontrol |
|---|---|
| 15 | Temiz tarayıcıda (önizleme çerezi olmadan) şu sayfalar telefon ve masaüstünde açılır: ana sayfa, tekli ürün, couple ürün, koleksiyonlar, sepet, arama, 404, merkez sayfa ve 7 yasal sayfa (metin görünüyor mu?), `/policies/*`, iletişim sayfaları, kılavuz ve 2 alt sayfası (telefonda), bütün GemPages sayfaları. |
| 16 | Deneme siparişi: sepet → ödeme. Kargo bedeli 2.000 TL eşiğinde doğru mu? Ödeme sayfasının alt linkleri doğru metni açıyor mu? |
| 17 | Meta Events Manager, GA4 gerçek zamanlı ve TikTok Events'te olaylar geliyor mu? Çerez bandı reddedilince olaylar duruyor mu? |
| 18 | Shopify Inbox sohbeti açılıyor mu? |

**D. Yayından sonra (sayfa sayfa)**

| # | İş |
|---|---|
| 19 | Kılavuz ve 2 alt sayfasının suffix'i yeni şablona çevrilir (onayla). Hemen ardından telefon ve masaüstü kontrolü yapılır ve QR kod telefonla okutulur. |
| 20 | Öteki GemPages sayfaları aynı yöntemle, bölüm 5'teki sırayla taşınır. |
| 21 | `/pages/sozlesmeler` için seçenek A ya da B (K8). |
| 22 | Bütün sayfalar doğrulandıktan sonra **GemPages'i siz kaldırırsınız**. Ardından bütün sayfalar yeniden kontrol edilir. Temadaki `gp-*` dosyalarının temizliği ayrıca onaya sunulur. |

---

## 9. Karar noktaları

| # | Konu | Seçenekler veya soru |
|---|---|---|
| K1 | Basılı QR'daki tam adres | Bir kılavuzdaki QR'ı okutup adresi bana yazar mısınız? `shop.texttonext.com` ile başlıyorsa bugün de çalışmıyor. |
| K2 | Fontlar | SF Pro ve MorebiRounded yerine temanın fontları (Poppins başlık, Inter ya da Poppins gövde) kullanılsın mı? SF Pro web'de lisanssız kullanılamaz. |
| K3 | "Buraya sahte kullanıcı yorumları yazabilirdik…" bölümü | Stok fotoğraflı, isimli ve "Doğrulanmış Profil" yazan 3 kart var. Esprili bir başlığı olsa da kartlar gerçek yorum gibi görünüyor. Taşımada bölümü almamayı öneriyorum. |
| K4 | `text-to-next-pro-1` sayfasındaki kırık video kutusu | Gerçek bir videoyla mı değiştirilsin, yoksa kaldırılsın mı? |
| K5 | Gösterilecek adres, e-posta ve saat | Caddebostan mı Göztepe mi? bilgi@ mi info@ mi? 09:30 mu 10:00 mu? |
| K6 | `shop.texttonext.com/#` linki | Google Haritalar linki mi olsun, yoksa link kaldırılsın mı? |
| K7 | `/pages/iletisim` boş görünüyor | (a) temanın iletişim şablonu bağlansın, (b) footer linki `iletisimsayfasi` sayfasına çevrilsin |
| K8 | `/pages/sozlesmeler` | Seçenek A (liste + arşiv PDF) mi, B mi? PDF'ler arşivde kalsın mı? Mobil uygulama bu adresi kullanıyor mu? |
| K9 | Yayında olmayan GemPages sayfaları (`ana-sayfa`, `event-zaman-kapsulu`) | Taşınsın mı, olduğu gibi kalsın mı? Silinmeyecekler. |
| K10 | Aktif ürün `couple-urun-olustur` | Şablonu yok. Bir ürün şablonu mu bağlansın, yoksa ürün taslağa mı alınsın? |
| K11 | `hesap-silme-talebi` (yayında, boş) | İçerik ya da form eklensin mi? Uygulama mağazalarında bu adres verilmiş olabilir. |
| K12 | `rewards-program-page` (Rise, boş) | Uygulama kullanılmıyorsa sayfa taslağa mı alınsın? |
| K13 | Genel sayfalarda başlık çubuğunun "Satın Al" düğmesi | Nereye gitsin (ör. `/collections/all` ya da Couple sayfası)? Yoksa gizlensin mi? |
| K14 | Kılavuzun masaüstü düzeni | Telefondaki gibi dar bir sütun (önerim) mu, geniş bir düzen mi? |
| K15 | Eski temalar (16 adet) | Yayına aldıktan sonra bir süre dokunulmasın (önerim). Silme ayrıca konuşulur. |
| K16 | `product.ttwpm1/2/3` geçici test şablonları | Silinsin mi? |
| K17 | Merkez sayfanın İade sekmesi | Politikadan mı okusun (bugünkü), `i̇ade-kosullari` sayfasından mı? |
| K18 | `couplekapsuldahafazlabilgial` ve `hediyekapsuldahafazlabilgial` | Temadaki hazır `page.couple-daha-fazla-bilgial` / `page.hediye-daha-fazla-bilgial` şablonları mı kullanılsın, yoksa birebir yeni şablon mu yapılsın? |

---

## Ek A: GemPages sayfalarına giden linkler (dosya:satır)

Kaynak: iki temanın bütün dosyaları, menüler ve yönlendirmeler (teşhiste toplandı). "yayın" yayındaki temayı, "taslak" çalışma temasını gösteriyor.

| Hedef sayfa | Nerede | Dosya / kayıt : satırlar | Link biçimi |
|---|---|---|---|
| couplekapsuldahafazlabilgial | yayın | `sections/gp-global-section-624389509747835422.liquid`:121,154 | `https://texttonext.com/pages/couplekapsuldahafazlabilgial?_ab=0&key=1768300603877` |
| couplekapsuldahafazlabilgial | taslak | `sections/gp-global-section-624389509747835422.liquid`:121,154 | `https://texttonext.com/pages/couplekapsuldahafazlabilgial?_ab=0&key=1768300603877` |
| couplezamankapsulleri | yayın | `sections/gp-global-section-624389509747835422.liquid`:193,226,290,323,362,395,433,466 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | yayın | `sections/gp-section-601917427344736986.liquid`:419,455,506,574,606,642 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | yayın | `sections/gp-section-601917427345588954.liquid`:963,999 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | yayın | `sections/gp-section-601917427345720026.liquid`:389,425 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | yayın | `sections/gp-section-601918380492063450.liquid`:561,597 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | yayın | `sections/gp-section-601918380492391130.liquid`:469,505,556,624,656,692 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | yayın | `sections/gp-section-601918380492522202.liquid`:963,999 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | yayın | `sections/gp-section-601924819017008079.liquid`:950,986 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | yayın | `sections/gp-section-601924925954982618.liquid`:950,986 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-global-section-624389509747835422.liquid`:193,226,290,323,362,395,433,466 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-section-601917427344736986.liquid`:419,455,506,574,606,642 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-section-601917427345588954.liquid`:963,999 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-section-601917427345720026.liquid`:389,425 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-section-601918380492063450.liquid`:561,597 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-section-601918380492391130.liquid`:469,505,556,624,656,692 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-section-601918380492522202.liquid`:963,999 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-section-601924819017008079.liquid`:950,986 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| couplezamankapsulleri | taslak | `sections/gp-section-601924925954982618.liquid`:950,986 | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` |
| iletisimsayfasi | yayın | `sections/gp-section-556458005730690241.liquid`:70,106,139,175 | `https://texttonext.com/pages/iletisimsayfasi` |
| iletisimsayfasi | taslak | `sections/gp-section-556458005730690241.liquid`:70,106,139,175 | `https://texttonext.com/pages/iletisimsayfasi` |
| iletisimsayfasi | taslak | `sections/tt-menu-grup.json`:43 | `/pages/iletisimsayfasi` |
| iletisimsayfasi | taslak | `sections/tt-menu.liquid`:32,593 | `/pages/iletisimsayfasi` |
| iletisimsayfasi | menü | `main-menu` | `/pages/iletisimsayfasi` |
| iletisimsayfasi | yönlendirme | `/pages/contact-page-mar-5-21-32-02` | `/pages/iletisimsayfasi` |
| bireysel-hediye-kullanim-kilavuzu | yayın | `sections/gp-section-600757128960934764.liquid`:49 | `https://texttonext.com/pages/bireysel-hediye-kullanim-kilavuzu?_ab=0&key=1767610417973` |
| bireysel-hediye-kullanim-kilavuzu | taslak | `sections/gp-section-600757128960934764.liquid`:49 | `https://texttonext.com/pages/bireysel-hediye-kullanim-kilavuzu?_ab=0&key=1767610417973` |
| couple-hediye-kullanim-kilavuzu | yayın | `sections/gp-section-600757261668713324.liquid`:35 | `https://texttonext.com/pages/couple-hediye-kullanim-kilavuzu?_ab=0&key=1767611056807` |
| couple-hediye-kullanim-kilavuzu | taslak | `sections/gp-section-600757261668713324.liquid`:35 | `https://texttonext.com/pages/couple-hediye-kullanim-kilavuzu?_ab=0&key=1767611056807` |
| text-to-next-pro-1 | yönlendirme | `/pages/landing-page-feb-16-11-03-09` | `/pages/text-to-next-pro-1` |
