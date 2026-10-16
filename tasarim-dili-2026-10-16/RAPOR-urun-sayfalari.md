# Ürün sayfaları: Couple UGC videoları ve marka dili

Tema: **Tasarim dili - 2026-10-16** (189140861248).
- İşe başlamadan önce temaları listeledim; bu tema **UNPUBLISHED** idi. Yayındaki tema "Calisma taslagi - 2026-10-05" (MAIN).
- Hiçbir tema yayına alınmadı. Başka temaya dokunulmadı.
- Ürün adlarına, ürün medyasına ve metafield'lara dokunulmadı.
- Yayındaki temanın MD5 listesi işe başlamadan önce ve iş bitince alındı: **669 dosyanın 669'u aynı**.

Not: Verdiğiniz örnek adres (`…/products/chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-kopya`) mağazada **Santorin** adlı ürüne ait. İkizi "Santorin Couple". Testlere hem bunu hem de Chloe'yi (`vera-…-gold-kopya`) ekledim.

---

## (A) Couple UGC videoları

### 1. İnceleme

**Videolar nereden geliyor?**
`ugc-video-gallery` bölümünün **kendi bloklarından** geliyor. Her blokta video dosyası, kapak görseli ve kısa yazı var.
- Ürün metafield'ı, metaobject veya uygulama kullanılmıyor.
- Ürünlerde video türünde bir metafield yok.
- Bu yüzden "ikiz ürünün metafield'ından okunsun" maddesi uygulanamadı; gerek de kalmadı.

**Hangi şablonda/sayfada hangi videolar var?** Sıra soldan sağa.

Tabloda videolar kısaltmayla yazıldı:
- **Couple seti:** ① `068ce7c9…mp4` / kapak `Ikili1920-1_209f…webp` · ② `öyküdik44 (1).mp4` / `couplecss_oyk.jpg` · ③ `7320ea4b…mp4` / `Ikili1920-2_5d0a…webp` · ④ `Beyza Kararasul Uzun.mp4` / `ikincikiz.jpg`
- **Single seti:** ① `Zaman Kapsülü Charmlar ile…🖤.mp4` / `Ikili1920_314a…jpg` · ② `Her zamankinden farklı bir hediye💫.mp4` / `Ikili1920-1_a268…jpg` · ③ `Çipler su geçiriyor mu…🖤.mp4` / `testedelim.jpg` · ④ `En çok merak ettiğiniz soruları cevapladık! 👀.mp4` / `Ikili1920-2_ad93…jpg`

| Şablon / sayfa | Bölüm (kimlik) | Durum | Başlık | Videolar |
|---|---|---|---|---|
| `product.zaman-kapsulu.json` (normal ürün; Rose Pink dahil bütün kolye/bileklikler) | ugc-video-gallery (`ugc_galeri_1`) | açık | Ürünle İlgili Videolar. | **Single seti** |
| `product.couple.json` (Couple görünümü) — **önce** | ugc-video-gallery (`ugc_galeri_1`) | açık | Ürünle İlgili Videolar. | **Single seti** (normal şablondan kopya; sorun buydu) |
| `product.zaman-kapsulu-couple.json` (Couple ikiz ürünler) | ugc-video-gallery (`ugc_galeri_1`) | **kapalı** | Ürünle İlgili Videolar. | **Single seti** (aynı 4 video) |
| `page.couple-daha-fazla-bilgial.json` (Couple anlatım sayfası) | ugc-video-gallery (`ugc_galeri_couple`) | kapalı | Ürünle ilgili videolar. | **Couple seti** |
| aynı sayfa | ss-video-socials (`ss_video_socials_yGDnpD`) | kapalı | Kullananların gözünden Couple Zaman Kapsülü | Couple seti (yazı: "Couple Zaman Kapsülü") |
| aynı sayfa | mozaik-kartlar (`mozaik_kartlar_couple`) | açık | — | Couple setinden 4 video, yorum kartlarının arasında |
| `collection.couple-urunler.json` | ss-video-socials (`ss_video_socials_k9WhMa`) | kapalı | Onların Gözünden Couple Zaman Kapsülü | Couple seti |
| `collection.couple-guncel.json` (eski Couple koleksiyon sayfası) | ss-video-socials (`ss_video_socials_k9WhMa`) | açık | Onların Gözünden Couple Zaman Kapsülü | Couple seti |
| `index.json` | ss-video-socials (`ss_video_socials_tAMMJQ`) | kapalı | Ürünle ilgili videolar | Couple seti |
| `product.json` (varsayılan; **Santorin Couple** ikizi bunu kullanıyor) | ugc-video-gallery (`custom-ugc-gallery`) | açık | Müşterilerimizden Gerçek Anlar | 068ce7c9 / 7320ea4b / Beyza + 3 boş blok |

**Önemli tespit: ikiz ürün şablonunda Couple'a özel video yok.**
- `product.zaman-kapsulu-couple.json` içindeki UGC bölümü kapalı ve normal şablonla aynı 4 Single videoyu içeriyor.
- Talimattaki "ikiz şablonla birebir aynı yap" kuralını harfiyen uygulasaydım Couple görünümünde yine Single videolar kalırdı.
- Couple'a özel set, eski Couple sayfalarının hepsinde tutarlı biçimde aynı 4 video ve kapak olarak duruyor. Bu yerler:
  - Couple anlatım sayfası (`ugc_galeri_couple`, aynı bölüm türü)
  - couple-urunler, couple-guncel ve anasayfa
  - mozaik
- Bu yüzden Couple görünümüne bu seti koydum.

### 2. Uygulama

- **Değişen yer:** `product.couple.json` → `ugc_galeri_1` bölümünün 4 bloğunda yalnızca `video` ve `poster` alanları. Couple seti, aynı sırayla ve aynı kapaklarla kondu.
- **Değişmeyen:**
  - Başlık ("Ürünle İlgili Videolar.") ve diğer bölüm ayarları. İkiz şablondakiyle aynı; tasarım ayarları zaten aynı.
  - Bölüm sayısı 25; yeni bölüm eklenmedi.
  - Normal şablondaki (Single) UGC bölümü **aynen** kaldı.
- **İkizin adı ve handle'ı:**
  - Sayfanın görünen metninde 0 kez geçiyor.
  - HTML'de yalnızca Shopify'ın Web Pixels veri bloğunda 2 kez var (`"title":"Auron Couple"` vb.). Bu, daha önce kabul ettiğiniz veri. ÖNCE (Calisma kopyası) ve SONRA'da aynı yerde, aynı sayıda; yeni bir yerde görünmüyor.
  - Piksel/analitik isteklerinin (sayfa başına 66–69 istek) hiçbirinde ikiz adı veya handle'ı geçmiyor.

### 3. İkiz şablonu ile Couple görünümü arasındaki diğer farklar

Bunları değiştirmedim; kararı size bıraktım.

| Bölüm | Fark |
|---|---|
| SSS kartları (accordion-cards), özellik listesi (feature-highlights), mozaik yorumları, SSS (faq), avantaj kartları, hediye ömrü, alt CTA | **İçerik birebir aynı.** Fark yalnızca renk ayarlarındaydı; ikiz şablon hiç dönüştürülmemişti, bu işte marka diline çevrildi. |
| UGC | İkizde kapalı, Couple görünümünde açık. |
| `video_slider_kapsul_P4MECP` | Yalnızca ikizde var; kapalı. |
| `17820468921c079b12` (_blocks) | Yalnızca Couple görünümünde (ve normal şablonda) var. |

Couple görünümü ile normal şablon arasındaki içerik farkları:
- mozaik bölümü yalnızca Couple görünümünde var;
- alt CTA bağlantısı Couple anlatım sayfasına gidiyor;
- üst gezinmede (`apple_local_nav`) bir ayar (`orta_dugme`) farklı.

### 4. Kontrol (telefon 390×844)

| Ürün | Couple görünümü UGC (kapaklar) | Normal görünüm UGC | Oynatma | İkiz adı/handle yeni yerde mi? |
|---|---|---|---|---|
| Santorin (verdiğiniz adres) | Couple seti ✔ | Single seti ✔ | ✔ | Hayır |
| Auron | Couple seti ✔ | Single seti ✔ | ✔ | Hayır |
| Noir | Couple seti ✔ | Single seti ✔ | ✔ | Hayır |
| Rose Pink | Couple seti ✔ | Single seti ✔ | ✔ | Hayır |
| Chloe | Couple seti ✔ | Single seti ✔ | ✔ | Hayır |

**Oynatma testi:**
- 8 videonun hepsi HTTP 200, `video/mp4`, H.264 606×1080 dönüyor ve `ffmpeg` ile sorunsuz çözülüyor.
- Testteki Chromium sürümünde H.264 desteği yok, bu yüzden sayfa içinde oynatmayı şöyle kanıtladım: aynı videonun ilk saniyelerini WebM'e çevirip istek yönlendirmesiyle verdim.
- Oynatıcı açıldı ve video oynadı (`paused:false`, 3. saniye), Couple ve normal görünümde.
- Görüntüler: `5-ugc-videolar/*-oynuyor.jpg`. Diğer `*-oynatici.jpg` görüntülerinde video siyah görünüyor; sebebi aynı codec eksikliği.

---

## (B) Ürün sayfaları marka dilinde

**Kontrol edilen şablonlar:**
- `product.zaman-kapsulu.json` (normal; **Rose Pink de bunu kullanıyor**, kolyeler için ayrı şablon yok)
- `product.couple.json`
- `product.zaman-kapsulu-couple.json`
- ikizin üst çubuğu `sections/tt-couple-urun.json`

**Önceki durum:** Normal ve Couple şablonları önceki işte büyük ölçüde dönüştürülmüştü. **İkiz şablonu ve üst çubuğu hiç dönüştürülmemişti**: mavi buton, mavi link, yeşil/mor/turuncu ikonlar, #171717, #F7F7F8, #4B4B4B gibi renkler vardı.

**Yöntem:**
- İkiz şablondaki 121 renk ayarı Couple görünümündeki dönüştürülmüş değerlere eşitlendi. İçerik zaten aynıydı.
- Bölüme özgü kalan farklar, yalnızca ürün sayfalarında yüklenen yeni `snippets/tt-urun-dil.liquid` katmanıyla kapatıldı.
- Ölçü, yerleşim, metin ve JS davranışı değişmedi.

| # | Bölüm | Durum / yapılan |
|---|---|---|
| 01 | tt-baslik | Normal/Couple zaten doğruydu. **İkizde mavi buton (#0071E3) ve mavi çizgiler vardı** → ürün çubuğuyla aynı yapıldı: #0A0A0A %80 zemin, beyaz buton + ink yazı, lime rozet. |
| 02 | main-product — galeri | Görsel zemini #FFFFFF.<br>Küçük görseller: seçili olan 2px #0A0A0A çerçeve, diğerleri çerçevesiz.<br>Noktalar: aktif #0A0A0A, pasif #D2D2CD.<br>"Büyüt" düğmesi: %70 saydam beyaz idi → tam beyaz + ink ikon + #D2D2CD kenar. |
| 02 | — puan satırı | Yıldızlar ve "4.9 / 100.000+ Kullanıcı" #0A0A0A (zaten doğruydu). |
| 02 | — ad, fiyat | Ad Poppins 700, harf aralığı −0.72 → **−0.8px**.<br>Fiyat 400 → **600** #0A0A0A.<br>Eski fiyat üstü çizili #5C5C57. İndirim rozeti lime + ink. |
| 02 | — Boyutlar / Taksit tablosu | İkincil buton (beyaz, ink, 1px #D2D2CD, tam yuvarlak); zaten doğruydu.<br>"Ayda … × 3 taksit" satırının tamamı #5C5C57. |
| 02 | — adım şeridi | **Tekli:** pasif adım yazıları ink'in %40–72 saydamlığıyla soluklaşıyordu → tam opak #5C5C57; aktif adım #0A0A0A. Çizgi ve pasif noktalar #D2D2CD, geçilen/aktif noktalar #0A0A0A.<br>**Couple ("Yükleyin → Buluşun → Açılsın"):** çizgi, pasif nokta ve kenar #D2D2CD.<br>Animasyon aynı. |
| 02 | — malzeme seçici | Seçili hap 1.5px #0A0A0A halka + ink yazı; seçili olmayan 1px #D2D2CD.<br>Tükenen varyant #8A8A85, üstü çizili; kırmızı çapraz çizgi kaldırıldı. |
| 02 | — adet | Kenar %10 ink idi → 1px #D2D2CD; ikonlar #0A0A0A. |
| 02 | — Sepete ekle, yapışkan çubuk | Birincil buton (#0A0A0A, beyaz, tam yuvarlak, 600); zaten doğruydu. |
| 02 | — güven kutusu | Zemin %2 ink idi → **#F4F4F4**. İkon/metin #0A0A0A, link altı çizili ink. |
| 03 | device-compat-bar | Zemin #FFFFFF, iOS/Android #0A0A0A. "Cihaz uyumluluğu" düğmesi beyaz idi → **#F4F4F4** zemin + ink, tam yuvarlak. İkizde gri/#171717 idi, düzeltildi. |
| 04 | feature-highlights | Zemin #F4F4F4. Madde başlıkları 700 → **600** #0A0A0A; açıklamalar #5C5C57; ikonlar ink.<br>Başlık iki satırlı kurala çevrildi: tamamı 700, vurgulu kısım ("sizinle kalması için tasarlandı") gri. Ayrıntı için Notlar 1. |
| 05 | accordion-cards | Zemin #F4F4F4, kartlar #FFFFFF, sorular #0A0A0A, cevaplar #5C5C57, +/− ink. İkizde #4B4B4B ve #F7F7F8 vardı; ikisi de kalmadı. |
| 06 | ugc-video-gallery | Zemin #000000, başlık beyaz 700, kartlar #141414.<br>Köşe 14 → **12px**.<br>Oynat düğmesi: yarı saydam siyah daire + beyaz üçgen idi → **beyaz daire + ink üçgen**.<br>Oynatıcının kapat düğmesi: 32px yarı saydam siyah idi → 44×44 beyaz + ink.<br>(A)'daki video değişikliği tasarıma dokunmadı. |
| 07 | hediye-omru | Site genelindeki gibi (#F4F4F4, çubuklar #0A0A0A, mavi yok). |
| 08 | mozaik-kartlar | Anlatım sayfasıyla aynı ayarlar. İkizde mor seçim kartları, #1D9BF0 mavi tik ve kırmızı CTA vardı; bunlar düzeltildi. Ek bir düzeltme yapıldı, ayrıntısı Notlar 2'de. |
| 09 | avantaj-kartlari | Zemin #000000, kartlar #141414, kenar #262624, ikonlar beyaz, "+" beyaz + ink. İkizde #1D1D1F kart ve yeşil/sarı/mor/turuncu ikonlar vardı. |
| 10 | urun-alt-cta | Zemin #F4F4F4, etiket #5C5C57, başlık ink, açıklama #5C5C57. "Ürünü öğren" #0A0A0A + ok. İkizde mavi (#0071E3) idi. |
| 11 | faq | Zemin #FFFFFF, kart #0A0A0A, başlık beyaz 700, "Destek" altı çizili beyaz, sorular beyaz, +/− beyaz.<br>Ayraçlar beyaz %10 idi → **#262624**. Açılan cevaplar beyaz idi → **#A3A39E**.<br>İkizde #171717 kart vardı. |
| 12 | product-recommendations | Kart görsel zemini #FFFFFF.<br>Oran kare idi → **4:5**.<br>Üzerine gelince gösterilen **ikinci görsel kapatıldı**; ikinci görsel "4 adımda nasıl çalışır" bilgi karesiydi. Artık kartta yalnızca ürün fotoğrafı görünüyor.<br>Etiket #5C5C57 büyük harf, ad/fiyat ink, sepet düğmesi ink + beyaz, "Hızlı Bakış" ikincil (kenar #D2D2CD). |
| 13 | newsletter | Site genelindeki gibi. |

### Açılır pencereler

Ölçüm telefonda ve 1440 masaüstünde yapıldı; görüntüler `4-pencereler-sonra/`.

| Pencere | Başlık | Kapat düğmesi | Palet dışı renk |
|---|---|---|---|
| Taksit | #0A0A0A Poppins 700 | 30×30 gri yazı → **44×44**, ink | yok |
| Boyutlar | #0A0A0A 700 (normal ağırlık değil) | 30×30 → **44×44**, #F4F4F4 + ink | yok |
| Cihaz uyumluluğu | #0A0A0A 700 | 30×30 → **44×44** | yok |
| Görsel büyütme | — | 48×48 (masaüstünde 62×62); %60 saydam idi → beyaz | yok |
| Avantaj kartı pencereleri | beyaz 700 (koyu pencere) | 36×36 → **44×44** | yok |
| UGC video oynatıcı | — | **44×44** beyaz + ink | yok |
| Hızlı Bakış | 500 → **700** ink | 48×48 | yeşil "Stokta var" uyarısı (#F7FEE7 / #4D7C0F) → #F4F4F4 + ink |
| Varyant seçici | Ürünlerin tek varyantı var; bu sayfalarda açılan varyant penceresi yok. Malzeme hapları yukarıda. | | |

### Renkler, degrade, kontrast

Ölçülen sayfalar (Tasarım dili, SONRA):
- Auron normal
- Auron Couple görünümü
- Rose Pink
- Auron Couple ikiz
- Santorin Couple görünümü

Hepsinde görünen bütün renkler:
- **Palet:** #0A0A0A, #FFFFFF, #000000, #F4F4F4, #141414, #5C5C57, #8A8A85, #A3A39E, #D2D2CD, #262624, #D6FF00. Bunların saydam türevleri de var: ink %2/%10/%60/%70/%80, beyaz %10/%60/%70, siyah %45.
- **Palet dışı:**
  - Normal, ikiz ve Rose Pink'te 0.
  - Couple görünümünde yalnızca 1 öğede #0B0B0B ölçüldü. Bu, Couple adım şeridinin nokta animasyonunun ara karesi (ink'e geçiş sırasında); sabit bir renk değil, sayfa yeniden ölçülünce yok.
  - Görsel/video içleri hariç.
- **Degrade metin yok.** Sayfadaki `linear-gradient`'ler tek renkli link alt çizgileri (ink/beyaz) ve mozaik videolarının alt karartması.
- **Kontrast:** Beş sayfanın tamamında 4.5:1 altında (24px ve üstünde 3:1 altında) metin **0**. Açık zeminde lime yazı yok.

### İşlev testi (telefon, SONRA; sipariş oluşturulmadı)

| Adım | Sonuç |
|---|---|
| Malzeme seçimi | ✔ |
| Adet + / − | ✔ (2 → 1) |
| Galeri kaydırma (3. görsel) | ✔ |
| Görsel büyütme aç/kapat | ✔ |
| Taksit, Boyutlar, Cihaz uyumluluğu aç/kapat | ✔ ✔ ✔ |
| SSS akordeonu, SSS kartları | ✔ |
| Sepete ekle | ✔ Auron 2.399,00 TL |
| Yapışkan çubuk görünüyor + sepete ekle | ✔ 2. Auron eklendi, "İkinci Üründe %50 İndirim": 4.798,00 → 3.598,50 TL |
| Öneri kartından sepete ekle | ✔ Santorin eklendi, indirim uygulandı |
| Couple görünümü: 2 ürün | ✔ "İkinci Üründe %50 İndirim": 4.798,00 → 3.598,50 TL |
| UGC video oynatma | ✔ (A bölümü) |

### Mobil hız: Auron

Ölçüm koşulları: 390×844, 4× CPU yavaşlatma, hızlı 4G, 5 ölçümün medyanı.
- ÖNCE = "Calisma kopyasi - 2026-10-15" temasındaki aynı sayfa.
- SONRA = Tasarim dili.

| Sayfa | LCP önce | LCP sonra | CLS önce | CLS sonra |
|---|---|---|---|---|
| Auron (normal) | 1376 ms | 1272 ms | 0.0031 | 0.0029 |
| Auron (Couple görünümü) | 1220 ms | 1304 ms | 0.0031 | 0.0029 |

- LCP öğesi iki temada da aynı (packshot).
- Aradaki farklar ölçümden ölçüme oynamanın içinde. Couple ÖNCE değerlerinden biri 2.860 ms çıktı.

---

## Değişen dosyalar (yalnızca Tasarim dili teması)

Her dosyayı yükledikten sonra temadaki MD5'i yeniden okudum; hepsi eşleşiyor.

| Dosya | Ne değişti | MD5 |
|---|---|---|
| templates/product.couple.json | (A) UGC videoları ve kapakları; cihaz düğmesi zemini; videosuz mozaik kartı zemini | 974f1957c7cbf286a880a0a06ae4d8a3 |
| templates/product.zaman-kapsulu-couple.json | 121 renk ayarı Couple görünümüyle eşitlendi; cihaz düğmesi; mozaik zemini | 53677aca1363952a1f10276ef5bb59c0 |
| templates/product.zaman-kapsulu.json | Cihaz uyumluluğu düğmesi zemini #F4F4F4 | c3247bf086e53b48dbe2f7e1b4957a2b |
| sections/tt-couple-urun.json | İkiz sayfasının üst çubuğu (mavi buton ve mavi çizgiler) | 0e232aee4b4163e8a34f02665454ff21 |
| sections/ugc-video-gallery.liquid | Kart köşesi 12px, oynat düğmesi beyaz + ink, kapat 44×44 | 5125b8411ceb61caf175f93c956c93f2 |
| sections/product-recommendations.liquid | Öneri kartı 4:5, ikinci görsel kapalı | 30277adf0ac59b5d81001f133ec99fe3 |
| sections/tt-menu.liquid | Menü kilit ikonunda tek palet dışı halka #3A3A38 → #262624 | 693e75c2849a9e33ba1825ff2eea151c |
| snippets/tt-urun-dil.liquid (**yeni**) | Ürün sayfası marka dili katmanı (yalnızca ürün sayfalarında yüklenir) | afc0f38b5c755f5cd96151fb5207f200 |
| layout/theme.liquid | Ürün sayfası kapısına `{% render 'tt-urun-dil' %}` satırı | 9f0cea967eaacebc613f334ac30a298b |

## Önizleme bağlantıları

- Auron (normal): https://texttonext.com/products/auron-zaman-kapsulu-bileklik?preview_theme_id=189140861248
- Auron (Couple görünümü): https://texttonext.com/products/auron-zaman-kapsulu-bileklik?mod=couple&view=couple&preview_theme_id=189140861248
- Verdiğiniz adres (Santorin, Couple): https://texttonext.com/collections/zaman-kapsulu-kolyeler/products/chloe-zaman-kapsulu-bileklik-316l-paslanmaz-celik-gold-kopya?mod=couple&view=couple&preview_theme_id=189140861248
- Rose Pink: https://texttonext.com/products/klasik-zaman-kapsulu-kolye-pembe?preview_theme_id=189140861248
- Couple ikiz ürün sayfası: https://texttonext.com/products/auron-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple?preview_theme_id=189140861248

## Notlar ve karar bekleyenler

1. **feature-highlights başlığı:** Telefonda başlık 22px. #8A8A85 bu boyutta #F4F4F4 üzerinde 3.2:1 kalıyor; sizin kuralınızda 24px altı metin için 4.5:1 gerekiyor.
   - Bu yüzden vurgulu kısım telefonda **#5C5C57**.
   - 768px ve üstünde başlık 28px olduğu için orada **#8A8A85**.
   - İsterseniz telefonda da #8A8A85 yaparım; o zaman bu başlık kontrast kuralını geçmez.
2. **Mozaik'te videosuz kart:** Couple mozaiğinde "Ayşe & Mert / 3. yıl dönümü" kartının videosu yok.
   - Beyaz yazı açık gri yer tutucu üzerinde 1.1:1 kalıyordu.
   - Ürün şablonlarında yer tutucu zeminini #141414 yaptım. Bu zemin yalnızca videosu olmayan kartta görünür.
   - **Couple anlatım sayfasında aynı kart aynı sorunla duruyor.** Kapsam dışı olduğu için dokunmadım; isterseniz aynı tek ayarı orada da değiştiririm.
3. **Santorin Couple ikizi `product.json` (varsayılan şablon) kullanıyor.** Bu şablon listenizde yoktu ve dönüştürülmedi; diğer ikizler `product.zaman-kapsulu-couple` kullanıyor. Kendi sayfasında (gizli ürün) eski renkler duruyor. Ziyaretçi Santorin Couple'ı tekli ürünün Couple görünümünden görüyor; o sayfa dönüştürüldü.
4. **Hızlı Bakış'taki "Pairs well with" başlığı** temanın İngilizce varsayılan metni. Metinlere dokunmadığım için öyle kaldı.
