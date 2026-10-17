# Kullanım kılavuzu sayfası: döküm ve yedek

Tarih: 17 Ekim 2026. Bu dosya yalnızca kayıttır. Mağazada ve temalarda hiçbir şey değiştirilmedi.

Kaynak: yayındaki site, temiz tarayıcı oturumu (önizleme çerezi yok). Her istek `server-timing` başlığında yayındaki temayı (188825207104) döndürdü. Taslak temanın görüntüsü ayrıca alındı ve aşağıda öyle işaretlendi.

Yedek klasörü: `gempages-cikis/kullanim-kilavuzu/`. Dosyaların MD5 değerleri `MD5SUMS.txt` içinde.

---

## 1. Adresler

Basılı kılavuzlardaki QR kodların gittiği ana sayfa ile o sayfanın açtığı iki alt sayfa aşağıda. Üçünün de handle'ı ve adresi korunacak.

| Sayfa | Tam adres | Sayfa ID | Başlık | Yayında | Şablon (template suffix) |
|---|---|---|---|---|---|
| Ana kılavuz (QR) | `https://texttonext.com/pages/kullanim-kilavuzu` | 159765332288 | Kullanım Kılavuzu | evet | `gp-template-600755391629886309` |
| Bireysel alt sayfa | `https://texttonext.com/pages/bireysel-hediye-kullanim-kilavuzu` | 159765496128 | Bireysel Hediye Kullanım Kılavuzu | evet | `gp-template-600758654311858837` |
| Couple alt sayfa | `https://texttonext.com/pages/couple-hediye-kullanim-kilavuzu` | 159765528896 | Couple Hediye Kullanım Kılavuzu | evet | `gp-template-600760696552030795` |

Sayfa gövdeleri (body) boş. Bütün içerik GemPages şablonundan geliyor. Şablon dosyaları ve bölüm dosyaları yayındaki temada ve taslak temada bire bir aynı (MD5 eşit).

Ana kılavuz adresine farklı yazımlarla ulaşma testi:

| Denenen adres | Sonuç |
|---|---|
| `https://texttonext.com/pages/kullanim-kilavuzu` | 200, sayfa açılıyor (tema 188825207104) |
| `https://www.texttonext.com/pages/kullanim-kilavuzu` | 301 → `https://texttonext.com/pages/kullanim-kilavuzu` |
| `http://texttonext.com/pages/kullanim-kilavuzu` | 301 → `https://texttonext.com/pages/kullanim-kilavuzu` |
| `https://52ae29-e0.myshopify.com/pages/kullanim-kilavuzu` | 301 → `https://texttonext.com/pages/kullanim-kilavuzu` |
| `https://shop.texttonext.com/pages/kullanim-kilavuzu` | **Açılmıyor.** HTTPS'te sertifika hatası, HTTP'de 409 Conflict. Alan adı Shopify'a yönleniyor ama bu mağazaya bağlı değil. |

> **Karar noktası:** Basılı QR kodun içinde tam olarak hangi adresin yazdığını bilmiyorum. Bir kılavuzdaki QR'ı telefonla okutup çıkan adresi bana yazarsanız raporu kesinleştiririm. Adres `shop.texttonext.com` ile başlıyorsa bugün de çalışmıyor demektir. `www` veya `http` ile başlıyorsa yönlendirme ile doğru sayfaya ulaşıyor.

Bu sayfaya giden linkler:
- **Ana kılavuz:** Sitede, menülerde ve iki temada hiçbir link yok. Tek giriş yolu QR kod veya site dışı link.
- **Bireysel ve Couple alt sayfaları:** Yalnızca ana kılavuzdaki kartlardan link alıyor:
  - `sections/gp-section-600757128960934764.liquid:49` (bireysel)
  - `sections/gp-section-600757261668713324.liquid:35` (couple)
  - Linklerde `?_ab=0&key=…` eki var. Talimatınıza göre bu ekler taşıma sırasında kendiliğinden kalkacak.
- Bu üç adres için tanımlı bir yönlendirme (redirect) yok.

---

## 2. Önemli bulgu: sayfa masaüstünde ve tablette boş

Üç kılavuz sayfası da **yalnızca telefon genişliğinde (767 px ve altı)** içerik gösteriyor. Masaüstünde ve tablette (768 px ve üstü) sayfa boş. Yalnızca site başlığı ve alttaki e-bülten bandı görünüyor.

- Hem Chromium'da hem WebKit'te ölçtüm. 1440 px genişlikte GemPages bölümlerinin hepsinin yüksekliği 0 çıktı.
- **Neden:** GemPages satırlarında görünürlük `--d:none; --d-tablet:none; --d-mobile:grid` olarak ayarlı. Yani sayfa yalnızca telefon için tasarlanmış.
- Masaüstü görsel alanlarına GemPages'in demo yer tutucusu kalmış: `https://cdn.shopify.com/s/files/1/2005/9307/files/image_demo.jpg`. Bu dosya başka bir mağazaya (GemPages demo) ait.
- **Sonuç:** QR'ı telefonla okutan kişi içeriği görüyor. Linki bilgisayarda veya tablette açan kişi boş sayfa görüyor. Taşımada içerik her ekran boyutunda görünecek şekilde kurulmalı.

Ekran görüntüleri: `kullanim-kilavuzu/ekran/*-YAYIN-masaustu-etiketli.png` (boş) ve `*-YAYIN-telefon-etiketli.png` (dolu).

### 2.1 GemPages kaldırılırsa bu sayfa telefonda da bozulur (benzetim)

Sayfadaki resimler ve videolar asıl adreslerini doğrudan taşımıyor:
- Kart resimleri `data-srcSet` içinde duruyor. Görünen `srcset` ise boş bir SVG yer tutucu.
- Videolar yalnızca `data-src` taşıyor.

Asıl adresleri GemPages'in JavaScript'i yerleştiriyor. Bu dosya GemPages uygulama uzantısından geliyor (`cdn.shopify.com/extensions/…/gempages-cro-172/…`).

Benzetimi şöyle yaptım: tarayıcıda yalnızca GemPages'in dosyalarını engelleyip sayfayı telefonda açtım. Sitede hiçbir şey değişmedi.
- **Ana kılavuz:** Yalnızca "Kullanım Kılavuzu" başlığı kalıyor. Altındaki 3 satır metin ve 3 kartın hepsi boş.
- **Bireysel kılavuz:** 3 videonun 3'ü de oynatılamıyor (`src` yok).

Ekran görüntüsü: `son-rapor-ekran/gempages-yok-benzetim/kullanim-kilavuzu-GEMPAGES-YOK-telefon-etiketli.png`.

Bu benzetim yalnızca GemPages dosyalarının yüklenmemesini gösteriyor. Uygulamayı gerçekten kaldırmak daha fazla şeyi de bozabilir. **Sonuç:** Kılavuz sayfaları GemPages kaldırılmadan **önce** tema şablonuna taşınmalı.

---

## 3. Bölüm bölüm yapı

Metinler render edilmiş sayfadan ve şablon ayarlarından birebir alındı. `**…**` kalın (strong) yazılan kısmı gösterir.

Ölçüler telefon görünümünden (iPhone 13, 390 px):
- Başlık rengi: `rgb(24,27,30)`.
- Gövde rengi: `rgb(77,77,77)`.
- Kırmızı uyarı kutusu: `rgb(211,32,23)`, köşe yarıçapı 16 px.

Sayfa başlığı (title) "… – Text To Next" biçiminde. Meta açıklama yok. Sayfalarda `#çapa` linki yok.

Elemanların `id` değerleri GemPages'in otomatik ürettiği kimlikler:
- Ana kılavuz: `gKg5af2W3N`, `gLtzjLOf8g`, `gdH6b9P9So`, `gVX8RzVDxN`, `gUvl8mxCKO`, `gbLrUGKRKA`, `g4MVLUluky`.
- Videolar: `gp-video-gPYO23BgnX`, `gp-video-gRmbnSuk7p`, `gp-video-gtd262yYsN`.

Bu kimliklere giden hiçbir link bulunamadı. Taşımadan sonra bu kimlikler kalkacak. Bir QR kodun sonunda böyle bir `#…` eki olsa bile sayfa yine açılır, yalnızca en üstten başlar.

### 3.1 `/pages/kullanim-kilavuzu` (QR'ın açtığı sayfa)

Şablon: `templates/page.gp-template-600755391629886309.json`. 5 bölüm var, sıralı:

| # | Bölüm dosyası | İçerik |
|---|---|---|
| 1 | `gp-section-600755391765414757` | **Başlık (h2):** "**Kullanım Kılavuzu**". Şablon ayarında başında `&nbsp;` var ve punto 30 px. Font Poppins, ortalı. |
| 2 | `gp-section-600757602615296869` | **Metin (p):** "Ürününüz için hazırlanan kullanım videosunu izleyin."<br>**Metin (p):** "Müşteri destek merkezi Hafta içi 10:00-18:00"<br>**Metin (p):** "**0216 606 14 15**". Bu numara düz metin, `tel:` linki değil.<br>Font SF-Pro-Text-Medium, 14 px, ortalı. |
| 3 | `gp-section-600757128960934764` | **Görsel kart (link):** `https://texttonext.com/pages/bireysel-hediye-kullanim-kilavuzu?_ab=0&key=1767610417973`, aynı sekmede açılıyor.<br>Görsel: `https://cdn.shopify.com/s/files/1/0864/8953/0688/files/Card_2.png?v=1767608510`. Alt metni boş.<br>Görselin içindeki yazı (ekrandan okundu): "1 Ürün gerekir / **Bireysel Hediye Kullanım Kılavuzu** / Kullanım kılavuzu için **tıklayın.**" |
| 4 | `gp-section-600757261668713324` | **Görsel kart (link):** `https://texttonext.com/pages/couple-hediye-kullanim-kilavuzu?_ab=0&key=1767611056807`, aynı sekmede açılıyor.<br>Görsel: `https://cdn.shopify.com/s/files/1/0864/8953/0688/files/Card_3_b0960bb6-64ca-425a-aecc-08b919fd6e62.png?v=1767608510`. Alt metni boş.<br>Görselin içindeki yazı: "2 Ürün gerekir / **Couple Kullanım Kılavuzu** / Kullanım kılavuzu için **tıklayın.**" |
| 5 | `gp-section-600757189828674197` | **Görsel kart (link):** doğrudan video dosyasına gidiyor: `https://cdn.shopify.com/videos/c/o/v/cd901f3791fa491faa999071da859809.mp4`, aynı sekmede.<br>Görsel: `https://cdn.shopify.com/s/files/1/0864/8953/0688/files/Card_4.png?v=1767608511`. Alt metni boş.<br>Görselin içindeki yazı: "**Çip nasıl okutulur?** / Kullanım kılavuzu için **tıklayın.**" |

Not: Kartlardaki yazılar resmin içine gömülü. Ekran okuyucu bu yazıları okuyamıyor ve arama motorları da göremiyor. Taşımada bu yazıların HTML metin olarak yazılmasını öneriyorum (bkz. bölüm 6).

### 3.2 `/pages/bireysel-hediye-kullanim-kilavuzu`

Şablon: `templates/page.gp-template-600758654311858837.json`. 8 bölüm var:

| # | Bölüm dosyası | İçerik |
|---|---|---|
| 1 | `gp-section-600758654530224789` | **Başlık (h2):** "**Bireysel Hediye Kullanım Kılavuzu**" (Poppins, ortalı) |
| 2 | `gp-section-600759285906932373` | **Metin (p):** "Kurulumu eksiksiz tamamlamak için bütün videoları baştan sona kadar izleyin." (SF-Pro-Text-Medium, 14 px) |
| 3 | `gp-section-600758959288091500` | **Başlık (h2):** "**1-Satın alan kişinin yapması gerekenler**" |
| 4 | `gp-section-600758864295494293` | **Video:** `https://cdn.shopify.com/videos/c/o/v/401e3fcbb44e46dca459138dc42d9b63.mp4`. Kontroller açık, satır içi oynatma (playsinline) açık, ön yükleme (preload) none, kapak görseli (poster) yok. |
| 5 | `gp-section-600759123402818197` | **Başlık (h2):** "**2-Hediye edilen kişinin yapması gerekenler**" |
| 6 | `gp-section-600759170278359916` | **Kırmızı uyarı kutusu (h2):** "**Önemli Bilgilendirme**" ve alt satırda "Hediye ettiğiniz kişi kapsülün süresi dolmadan **Alıcı Hesabı oluşturmalıdır**."<br>**Video:** `https://cdn.shopify.com/videos/c/o/v/4794196263954e63bb1590c84f8fa50b.mp4`. Ayarları 4. bölümdeki video ile aynı. |
| 7 | `gp-section-600759736912052885` | **Başlık (h2):** "**3-Çip Nasıl Okutulur**". Bu başlık diğerlerinden farklı stillenmiş: Inter 16 px, sola yaslı. |
| 8 | `gp-section-600759782864847717` | **Video:** `https://cdn.shopify.com/videos/c/o/v/cd901f3791fa491faa999071da859809.mp4`. Ana kılavuzdaki "Çip nasıl okutulur?" kartının açtığı videonun aynısı. |

### 3.3 `/pages/couple-hediye-kullanim-kilavuzu`

Şablon: `templates/page.gp-template-600760696552030795.json`. 4 bölüm var:

| # | Bölüm dosyası | İçerik |
|---|---|---|
| 1 | `gp-section-600760696602362443` | **Başlık (h2):** "**Couple Kullanım Kılavuzu**" |
| 2 | `gp-section-600760696602690123` | **Metin (p):** "Kurulumu eksiksiz tamamlamak için videoyu "<br>**Metin (p):** "baştan sona kadar izleyin." |
| 3 | `gp-section-600760696602493515` | **Kırmızı uyarı kutusu (h2):** "**Önemli Bilgilendirme**" ve alt satırda "Kurulum aşamasında iki ürünün de aynı telefondan kurulması gerekir." |
| 4 | `gp-section-600762761659548517` | **Video:** `https://cdn.shopify.com/videos/c/o/v/0701d72e7b724cd89f0dd5e3e6132b9f.mp4`. Kontroller açık, playsinline, preload none, poster yok. |

### 3.4 Şablon ayarlarındaki ham metinler (birebir)

GemPages metinleri şablon JSON'unda HTML olarak saklıyor. Taşımada bu metinler aynen kullanılacak.

```
kullanim-kilavuzu
  ggiToJyyUO-_text : <span style="font-size:30px;"><strong>&nbsp;Kullanım Kılavuzu</strong></span>
  gg9njRALG1w_text : <p>Ürününüz için hazırlanan kullanım videosunu izleyin.</p>
  ggEUniJnnDU_text : <p>Müşteri destek merkezi Hafta içi 10:00-18:00</p><p><strong>0216 606 14 15</strong></p>

bireysel-hediye-kullanim-kilavuzu
  ggiToJyyUO-_text : <span style="font-size:30px;"><strong>Bireysel Hediye Kullanım Kılavuzu</strong></span>
  ggpdUjqaU26_text : <p><span style="font-size:14px;">Kurulumu eksiksiz tamamlamak için bütün videoları baştan sona kadar izleyin.</span></p>
  gguKlzmZtZE_text : <span style="font-size:16px;"><strong>1-Satın alan kişinin yapması gerekenler</strong></span>
  ggCbIFhzs31_text : <span style="font-size:16px;"><strong>2-Hediye edilen kişinin yapması gerekenler</strong></span>
  ggQZU3JeWHP_text : <span style="font-size:16px;"><strong>Önemli Bilgilendirme</strong></span><br><span style="font-size:16px;">Hediye ettiğiniz kişi kapsülün süresi dolmadan<strong> Alıcı Hesabı oluşturmalıdır</strong>.</span>
  ggt8WhU_ER0_text : <span style="font-size:16px;"><strong>3-Çip Nasıl Okutulur</strong></span>

couple-hediye-kullanim-kilavuzu
  ggiToJyyUO-_text : <span style="font-size:30px;"><strong>Couple Kullanım Kılavuzu</strong></span>
  gg_YzBiB1i2_text : <p>Kurulumu eksiksiz tamamlamak için videoyu&nbsp;</p><p>baştan sona kadar izleyin.</p>
  gguKlzmZtZE_text : <span style="font-size:16px;"><strong>Önemli Bilgilendirme</strong></span><br><span style="font-size:16px;">Kurulum aşamasında iki ürünün de aynı telefondan kurulması gerekir.</span>
```

Kart görsellerinin şablon ayarları:
- Masaüstü kaynağı (`…_srcSet_desktop_src`): üç kartta da GemPages demo görseli `image_demo.jpg`.
- Telefon kaynağı (`…_srcSet_mobile_src`): `Card_2.png`, `Card_3_b0960bb6-….png` ve `Card_4.png`.

---

## 4. Medya listesi (CDN)

Bütün görsel ve videolar Shopify'da duruyor ve hepsi bugün 200 veya 206 cevabı veriyor. **GemPages kaldırılınca bunların hiçbiri bozulmaz.**

| Tür | Tam URL | Barındırma | Boyut | Kullanıldığı yer |
|---|---|---|---|---|
| görsel | `https://cdn.shopify.com/s/files/1/0864/8953/0688/files/Card_2.png?v=1767608510` | Shopify Files (bu mağaza) | 28.023 B | ana kılavuz, kart 1 |
| görsel | `https://cdn.shopify.com/s/files/1/0864/8953/0688/files/Card_3_b0960bb6-64ca-425a-aecc-08b919fd6e62.png?v=1767608510` | Shopify Files | 28.106 B | ana kılavuz, kart 2 |
| görsel | `https://cdn.shopify.com/s/files/1/0864/8953/0688/files/Card_4.png?v=1767608511` | Shopify Files | 23.554 B | ana kılavuz, kart 3 |
| video | `https://cdn.shopify.com/videos/c/o/v/cd901f3791fa491faa999071da859809.mp4` | Shopify video | 28.318.442 B | ana kılavuz kart 3 linki; bireysel bölüm 8 |
| video | `https://cdn.shopify.com/videos/c/o/v/401e3fcbb44e46dca459138dc42d9b63.mp4` | Shopify video | 9.439.087 B | bireysel bölüm 4 |
| video | `https://cdn.shopify.com/videos/c/o/v/4794196263954e63bb1590c84f8fa50b.mp4` | Shopify video | 14.405.703 B | bireysel bölüm 6 |
| video | `https://cdn.shopify.com/videos/c/o/v/0701d72e7b724cd89f0dd5e3e6132b9f.mp4` | Shopify video | 32.541.777 B | couple bölüm 4 |
| yer tutucu | `https://cdn.shopify.com/s/files/1/2005/9307/files/image_demo.jpg` | başka mağaza (GemPages demo) | – | Kartların masaüstü kaynağı ve ham HTML'deki `src`. Taşımada tamamen kalkar. |

Fontlar, telefonda gerçekten indirilenler:

| Font | Kaynak | GemPages kaldırılınca |
|---|---|---|
| SF-Pro-Text-Medium (gövde metinleri) | `https://files.gempages.net/544367705843565551-1f4ed64b-c4e8-4db0-b486-19ba2c473221.otf?v=1734790475782` | **ÖLÜR.** Ayrıca SF Pro, Apple lisanslı bir font. |
| Poppins (başlıklar) | `fonts.gstatic.com` (Google Fonts), GemPages tarafından yükleniyor | Dosya ölmez ama GemPages kalkınca yükleyen kalmaz. |

GemPages sayfaya 80'e yakın `@font-face` tanımı daha ekliyor (Prompt, Milliard, ClashDisplay vb.). Bu sayfalarda bunların hiçbiri indirilmiyor.

---

## 5. Yedekler (`gempages-cikis/kullanim-kilavuzu/`)

| Klasör | İçerik |
|---|---|
| `html-sunucu/` | Sunucunun gönderdiği ham HTML, 3 sayfa. Yayındaki tema 188825207104. |
| `html-render/` | JavaScript çalıştıktan sonraki tam DOM, 3 sayfa × masaüstü/telefon. Her dosyanın ilk satırında tarih ve tema yazılı. |
| `tema-kaynak/` | Şablon JSON'u ve bütün `gp-section-*.liquid` dosyaları, sayfa başına ayrı (toplam 20 dosya). Yayındaki temadan alındı. Taslak temadaki dosyalar ile MD5'leri eşit. |
| `ekran/` | Etiketli ekran görüntüleri (aşağıda). `goruntuler.json` her görüntünün teması, zamanı ve önizleme çubuğu durumu. |
| `MD5SUMS.txt` | Bütün dosyaların MD5 değeri. |

Ekran görüntüleri: önizleme çubuğu gizlenmedi. Her görüntünün üstünde tema etiketi var.

| Dosya | Cihaz | Görünen tema | Önizleme çubuğu |
|---|---|---|---|
| `kullanim-kilavuzu-YAYIN-masaustu-etiketli.png` | masaüstü 1440 | Calisma taslagi - 2026-10-05 (188825207104, yayında) | yok (yayındaki tema) |
| `kullanim-kilavuzu-YAYIN-telefon-etiketli.png` | iPhone 13 | Calisma taslagi - 2026-10-05 (188825207104, yayında) | yok |
| `bireysel-hediye-kullanim-kilavuzu-YAYIN-masaustu-etiketli.png` | masaüstü | Calisma taslagi (188825207104) | yok |
| `bireysel-hediye-kullanim-kilavuzu-YAYIN-telefon-etiketli.png` | iPhone 13 | Calisma taslagi (188825207104) | yok |
| `couple-hediye-kullanim-kilavuzu-YAYIN-masaustu-etiketli.png` | masaüstü | Calisma taslagi (188825207104) | yok |
| `couple-hediye-kullanim-kilavuzu-YAYIN-telefon-etiketli.png` | iPhone 13 | Calisma taslagi (188825207104) | yok |
| `kullanim-kilavuzu-TASLAK-masaustu-etiketli.png` | masaüstü | **Tasarim dili - 2026-10-16 (189140861248, taslak)** | **var** |
| `kullanim-kilavuzu-TASLAK-telefon-etiketli.png` | iPhone 13 | **Tasarim dili - 2026-10-16 (189140861248, taslak)** | **var** |

Taslak temada da kılavuz içeriği yayındakiyle aynı görünüyor, çünkü şablon aynı. İki fark var:
- Altta yeni "Yasal" footer sütunu çıkıyor.
- Üstteki başlık, header birleştirmesi yapılmadığı için hâlâ temanın eski beyaz header'ı.

---

## 6. Taşıma önerisi (uygulanmadı, onay bekliyor)

Taşıma yöntemi şu: sayfalar silinmeyecek, handle ve adres değişmeyecek. Her sayfa için çalışma temasına ("Tasarim dili - 2026-10-16") temanın kendi şablonu eklenecek. Onayınızdan sonra yalnızca sayfanın **template suffix** alanı GemPages şablonundan yeni şablona çevrilecek.

| Sayfa | Yeni şablon (öneri) | İçerik bileşenleri |
|---|---|---|
| kullanim-kilavuzu | `templates/page.kilavuz.json` | başlık, 3 satır metin (telefon `tel:+902166061415` linki olarak), 3 kart |
| bireysel-hediye-kullanim-kilavuzu | `templates/page.kilavuz-bireysel.json` | başlık, açıklama, 3 adım başlığı, kırmızı uyarı kutusu, 3 video |
| couple-hediye-kullanim-kilavuzu | `templates/page.kilavuz-couple.json` | başlık, açıklama, kırmızı uyarı kutusu, 1 video |

Bu üç şablon tek bir yeni tema bölümünü (örneğin `sections/tt-kilavuz.liquid`) kullanır. Bölüm şu blokları içerir: başlık, metin, kart-link, video, uyarı kutusu. İçerik şablon JSON'unda durur. Kurulumda şunlar yapılır:
- İçerik **her ekran boyutunda** görünür. Bu, bugünkü masaüstü ve tablet boşluğunu da giderir.
- Kartlar resim yerine **HTML metin ve ikon** olarak yapılır. Yazılar birebir korunur. İsterseniz mevcut kart görselleri alt metinle aynen kalabilir.
- Videolar Shopify'daki aynı mp4 adresleriyle `<video controls playsinline preload="metadata">` olarak gömülür. Kapak görseli eklenmesini öneririm.
- "Çip nasıl okutulur?" kartı bugün doğrudan mp4 dosyasını açıyor. Aynı davranış korunabilir ya da video bir pencerede açılabilir. Karar sizin.
- Fontlar temanın fontlarına (taslak temadaki tasarım dili) bağlanır. SF Pro ve Poppins taşınmaz.
- Alt sayfalara giden linkler `?_ab=…` eki olmadan yazılır: `/pages/bireysel-hediye-kullanim-kilavuzu` ve `/pages/couple-hediye-kullanim-kilavuzu`.

Taşıma sırasında kararınızı bekleyen konular:
- **Çalışma saati:** Bu sayfada "Hafta içi 10:00-18:00" yazıyor. `/pages/iletisim` sayfasında 09:30–18:00 yazıyor. Hangisi doğru?
- **Masaüstü görünüm:** Masaüstünde de telefondaki gibi dar bir sütun mu olsun (öneri: en fazla 560 px, ortalı), yoksa geniş bir düzen mi?
- **Kart görselleri:** Mevcut kart görselleri mi kalsın, HTML kartlar mı yapılsın?
