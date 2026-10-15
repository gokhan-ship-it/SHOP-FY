# Tasarım dili – 2026-10-16 · Rapor

**Tema:** "Tasarim dili - 2026-10-16" (ID 189140861248), yayında değil. Kaynak: "Calisma kopyasi - 2026-10-15" kopyası.
Calisma kopyasi dahil hiçbir başka temaya dokunulmadı; hiçbir tema yayına alınmadı. Metin değiştirilmedi (otomatik metin karşılaştırması: 75 dosyada görünür metin farkı 0).

## Önizleme bağlantıları
- Ana sayfa: https://texttonext.com/?preview_theme_id=189140861248
- Kadın: https://texttonext.com/collections/zaman-kapsulu-kolyeler?preview_theme_id=189140861248
- Erkek: https://texttonext.com/collections/zaman-kapsulu-bileklik?preview_theme_id=189140861248
- Couple ürünler: https://texttonext.com/collections/couple-urunler?preview_theme_id=189140861248
- Ürün (Auron): https://texttonext.com/products/auron-zaman-kapsulu-bileklik?preview_theme_id=189140861248
- Single anlatım: https://texttonext.com/pages/hediye-daha-fazla-bilgi-al?preview_theme_id=189140861248
- Couple anlatım: https://texttonext.com/pages/couple-daha-fazla-bilgi-al?preview_theme_id=189140861248

## Klasörler
- `1-telefon-once-sonra/`: 19 sayfa (bolumler.md listesi; 07 celik-kolyeler 404 + 07b şablon görünümü), solda Calisma kopyasi, sağda Tasarim dili.
- `2-masaustu-once-sonra/`: ana sayfa, Erkek koleksiyonu, Auron ürün, Single anlatım, Couple anlatım.
- `3-acilir-pencereler-sonra/`: 23 pencere (çark, sepet boş/dolu, taksit tel/masaüstü, Boyutlar, cihaz uyumluluğu, mobil menü ×2, arama, avantaj ×4, UGC video, Nasıl çalışır kartı/penceresi, yüzen düğme, varyant seçici, mozaik yorum, çerez). Couple demo (dongu-seridi) önceki gibi kapalı olduğu için açılamadı.
- `4-asama1-telefon/`: 1. aşama sonrası (yalnız tema ayarları + font) telefon görüntüleri.

## 1. aşama – tema ayarları
settings_data.json'da istenen 19 renk + `type_header_font = poppins_n7`, `type_body_font = poppins_n4` uygulandı (buton/menü/ürün adı "body" kaldı). Ek olarak:
- `color_shadow` #A8E8E2 (nane) → #0A0A0A (kart gölgesi %10 opaklıkla; listede yoktu ama paletin dışındaydı).
- css-variables: Poppins 600 font_face eklendi (buton ağırlığı 600 için), `--font-button-weight: 600`, `--rounded-button: 999px`.
- Durum renkleri (error/info/success, checkout_error) değişmedi.

## 2. aşama – değişen dosyalar (75)
- `assets/custom-tt.css`
- `assets/theme.css`
- `assets/tt-nasil-calisir.css`
- `assets/tt-secim-kartlari.css`
- `assets/tt-uk-kart.css`
- `assets/ttn-cark.css`
- `assets/ttn-cark.js`
- `blocks/ai_gen_block_066567d.liquid`
- `blocks/ai_gen_block_241956a.liquid`
- `blocks/ai_gen_block_2ca4111.liquid`
- `blocks/ai_gen_block_33582c8.liquid`
- `blocks/ai_gen_block_8237de9.liquid`
- `blocks/ai_gen_block_86e922a.liquid`
- `blocks/ai_gen_block_9d9a4ce.liquid`
- `blocks/ai_gen_block_b099ce2.liquid`
- `blocks/ai_gen_block_ba31aeb.liquid`
- `blocks/ai_gen_block_c4e4fad.liquid`
- `blocks/ai_gen_block_d0a0e86.liquid`
- `blocks/ai_gen_block_fcecf20.liquid`
- `config/settings_data.json`
- `sections/accordion-cards.liquid`
- `sections/adim-yigin.liquid`
- `sections/apple-local-nav.liquid`
- `sections/apple-slayt.liquid`
- `sections/avantaj-kartlari.liquid`
- `sections/couple-bulusma.liquid`
- `sections/device-compat-bar.liquid`
- `sections/feature-highlights.liquid`
- `sections/footer-group.json`
- `sections/guclu-header.liquid`
- `sections/header-group.json`
- `sections/hediye-omru.liquid`
- `sections/help-drawer.liquid`
- `sections/hero-video-kapsul.liquid`
- `sections/mozaik-kartlar.liquid`
- `sections/newsletter.liquid`
- `sections/overlay-group.json`
- `sections/sayfa-zemini.liquid`
- `sections/taksit-tablosu.liquid`
- `sections/tt-anasayfa-cubuk.json`
- `sections/tt-baslik.liquid`
- `sections/tt-catal-karsilastirma.liquid`
- `sections/tt-cok-satanlar.liquid`
- `sections/tt-couple-kapsul.liquid`
- `sections/tt-nasil-calisir-grup.json`
- `sections/tt-nasil-calisir.liquid`
- `sections/tt-secim-kartlari.liquid`
- `sections/tt-urun-cubuk.json`
- `sections/tt-veri.liquid`
- `sections/ttn-cark-genel.liquid`
- `sections/ttn-cark.json`
- `sections/ugc-video-gallery.liquid`
- `sections/urun-alt-cta.liquid`
- `sections/video-slider-kapsul.liquid`
- `snippets/css-variables.liquid`
- `snippets/icon-guarantee.liquid`
- `snippets/tt-akis-seridi-klasik.liquid`
- `snippets/tt-aln-mavi.liquid`
- `snippets/tt-couple-akis.liquid`
- `snippets/tt-couple-banka.liquid`
- `snippets/tt-couple.liquid`
- `snippets/tt-tekli.liquid`
- `snippets/tt-urun-hap.liquid`
- `snippets/tt-yapilandirma.liquid`
- `snippets/ttn-cark-svg.liquid`
- `templates/collection.celik-kolyeler.json`
- `templates/collection.couple-urunler.json`
- `templates/collection.zaman-kapsulu-bileklik.json`
- `templates/collection.zaman-kapsulu-kolyeler.json`
- `templates/index.json`
- `templates/page.couple-daha-fazla-bilgial.json`
- `templates/page.event-daha-fazla-bilgial.json`
- `templates/page.hediye-daha-fazla-bilgial.json`
- `templates/product.couple.json`
- `templates/product.zaman-kapsulu.json`

Bölüm/blok renk ayarları: 17 şablon/grup JSON'unda 1.348 ayar değeri değiştirildi (tam liste `ayar-yamalari/*.tsv`: dosya, bölüm, yol, eski, yeni).
Kendi bölümlerdeki Inter / -apple-system / SF Pro / system-ui / Archivo tanımları tema font değişkenlerine bağlandı; başlık harf aralığı kurala göre (≥28px −1px, 20–27px −0.8px, 16–19px −0.3px).

Özel kurallar uygulandı: tt-baslik (#0A0A0A %80 + blur, beyaz ikon, "Ürünü Öğren" beyaz), Nasıl çalışır yüzen düğme (ink + 2px lime çerçeve; ikon dairesi beyaz – ekranda neon sayısını düşürmek için), çark kartı ve çark penceresi, seçim kartları, çok satanlar, çatal karşılaştırma, hediye ömrü, avantaj kartları, couple-bulusma, guclu-header, adım rozetleri, tt-veri, karşılaştırma blokları, mozaik, bülten, ürün sayfası, sepet/arama, pencereler.
Nasıl çalışır kartı ve penceresi (tt-sc-nk-*) ve GemPages dosyalarına dokunulmadı.

### Bilerek bırakılan durum renkleri
- `#B42318` – seçim kartları sepet çubuğu uyarı/hata metni (tt-secim-kartlari, `--tt-sc-uyari`).
- `#E11D48` / `#FFF1F2` – ürün sayfası geri sayım (kampanya durumu; yalnız geri sayım tanımlı üründe görünür).
- theme.css `--color-red-200/300` – tükenmiş varyant (stok durumu).
- `color_error_*`, `color_info_*`, `color_success_*`, `checkout_error_color` – form/durum renkleri.
- Yalnız tema düzenleyicisinde görünen uyarı kutusu (tt-cok-satanlar, `#C2410C` grubu) – müşteriye çıkmaz.

## Yeni renk envanteri (Tasarim dili, 19 sayfa telefon, çizilmiş renkler)
Önce: 145 farklı renk, 121'i palet dışı → Sonra: 48 renk, 12'si palet dışı (aşağıda açıklamalı). Palet renklerinin saydam türevleri palete sayıldı.

| Renk | Token | Adet | Kullanım | Başlıca yer |
|---|---|---|---|---|
| `#0A0A0A` | ink | 2769 | metin 1045, svg-cizgi 976, svg-dolgu 272, zemin 440, kenar 36 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×1092; main-product (main-product) ×266; tt-cok-satanlar (tt_cok_satanlar_1) ×207 |
| `#FFFFFF` | white | 2046 | zemin 863, metin 612, svg-cizgi 393, svg-dolgu 168, kenar 10 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×563; hero-video-kapsul (hero_video_kapsul_6G97xA) ×140; product-recommendations (product-recommendations |
| `#5C5C57` | muted | 490 | metin 447, svg-cizgi 27, zemin 12, kenar 4 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×187; accordion-cards (product-accordion) ×117; hediye-omru (hediye_omru_4cjEHU) ×48 |
| `#D2D2CD` | line | 467 | kenar 152, zemin 315 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×327; tt-cok-satanlar (tt_cok_satanlar_1) ×66; hediye-omru (hediye_omru_4cjEHU) ×16 |
| `#F4F4F4` | surface | 241 | zemin 227, svg-dolgu 14 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×142; hediye-omru (hediye_omru_4cjEHU) ×20; tt-cok-satanlar (tt_cok_satanlar_1) ×19 |
| `#141414` | dark-raised | 134 | svg-dolgu 14, zemin 120 | _blocks (blocks_BHFjY3) ×20; newsletter (newsletter_P9N9HX) ×19; tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×16 |
| `#000000` | black | 130 | zemin 74, svg-dolgu 55, metin 1 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×30; newsletter (newsletter_P9N9HX) ×19; adim-yigin (adim_yigin_1) ×10 |
| `#262624` | line-dark | 121 | kenar 115, zemin 6 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×25; avantaj-kartlari (avantaj_kartlari_1) ×16; tt-baslik (tt_baslik_DEtq8H) ×12 |
| `#A3A39E` | muted-dark | 120 | metin 115, kenar 4, zemin 1 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×35; avantaj-kartlari (avantaj_kartlari_1) ×16; hero-video-kapsul (hero_video_kapsul_6G97xA) ×11 |
| `#FFFFFF (85%)` | white | 120 | zemin 120 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×120 |
| `#D6FF00` | lime | 104 | svg-dolgu 34, zemin 35, kenar 14, metin 21 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×82; tt-cok-satanlar (tt_cok_satanlar_1) ×13; tt-nasil-calisir (tt_nasil_calisir) ×7 |
| `#0A0A0A (60%)` | ink | 71 | metin 71 | product-recommendations (product-recommendations) ×36; main-search (main) ×24; main-cart (main) ×6 |
| `#8A8A85` | muted-strong | 59 | svg-dolgu 28, metin 28, zemin 3 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×30; tt-couple-kapsul (tt_couple_kapsul) ×7; hero-video-kapsul (hero_video_kapsul_6G97xA) ×5 |
| `#0A0A0A (10%)` | ink | 39 | kenar 39 | main-product (main-product) ×36; main-cart (main) ×3 |
| `#FFFFFF (70%)` | white | 30 | zemin 30 | main-product (main-product) ×30 |
| `#FFFFFF (10%)` | white | 29 | kenar 29 | _blocks (blocks_HATjRq) ×10; _blocks (blocks_BHFjY3) ×10; faq (faq) ×9 |
| `#F2F2EF` | **palet dışı** | 21 | metin 21 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×21 |
| `#0A0A0A (11%)` | ink | 21 | svg-cizgi 14, zemin 7 | header (header) ×21 |
| `#0A0A0A (2%)` | ink | 16 | zemin 16 | main-product (main-product) ×9; main-cart (main) ×6; main-search (main) ×1 |
| `#0A0A0A (80%)` | ink | 13 | zemin 13 | tt-baslik (tt_baslik_DEtq8H) ×3; tt-baslik (tt_baslik_urun) ×3; tt-baslik (tt_baslik_bilek) ×2 |
| `#161616` | **palet dışı** | 12 | svg-cizgi 12 | tt-couple-kapsul (tt_couple_kapsul) ×12 |
| `#000000 (45%)` | black | 12 | svg-dolgu 12 | ugc-video-gallery (ugc_galeri_1) ×12 |
| `#BDBDB8` | **palet dışı** | 6 | metin 6 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×6 |
| `#F4F4F4 (98%)` | surface | 6 | zemin 6 | couple-bulusma (couple_bulusma_Kp2Nq7) ×6 |
| `#FFFFFF (82%)` | white | 6 | zemin 6 | couple-bulusma (couple_bulusma_Kp2Nq7) ×6 |
| `#FFFFFF (94%)` | white | 4 | zemin 4 | tt-couple-kapsul (tt_couple_kapsul) ×4 |
| `#FFFFFF (90%)` | white | 4 | kenar 4 | tt-couple-kapsul (tt_couple_kapsul) ×4 |
| `#2E2E2C` | **palet dışı** | 3 | svg-cizgi 3 | tt-secim-kartlari (tt_secim_kartlari_MqYNcr) ×3 |
| `#FFFFFF (16%)` | white | 3 | zemin 3 | ugc-video-gallery (ugc_galeri_1) ×3 |
| `#FFFFFF (4%)` | white | 3 | zemin 3 | faq (faq) ×3 |
| `#FFFFFF (60%)` | white | 3 | metin 3 | faq (faq) ×3 |
| `#FFFFFF (28%)` | white | 3 | zemin 3 | apple-slayt (apple_slayt_couple) ×3 |
| `#242424` | **palet dışı** | 3 | metin 3 | gp-section-556461993255503041 (gp_section_556461993255503041) ×3 |
| `#7D7D7D` | **palet dışı** | 3 | kenar 3 | gp-section-556461993255503041 (gp_section_556461993255503041) ×3 |
| `#F3F3F3` | **palet dışı** | 2 | zemin 2 | tt-couple-kapsul (tt_couple_kapsul) ×2 |
| `#000000 (26%)` | black | 2 | zemin 2 | main-product (main-product) ×2 |
| `#FFFFFF (72%)` | white | 2 | zemin 2 | guclu-header (guclu_header_1) ×1; guclu-header (guclu_header_couple) ×1 |
| `#1C1C1C` | **palet dışı** | 2 | metin 2 | gp-section-556461993255503041 (gp_section_556461993255503041) ×2 |
| `#0A0A0A (6%)` | ink | 2 | kenar 1, zemin 1 | main-cart (main) ×2 |
| `#000000 (9%)` | black | 1 | kenar 1 | main-product (main-product) ×1 |
| `#000000 (12%)` | black | 1 | zemin 1 | main-product (main-product) ×1 |
| `#0A0A0A (100%)` | ink | 1 | zemin 1 | main-product (main-product) ×1 |
| `#FFFFFF (95%)` | white | 1 | zemin 1 | _blocks (blocks_t8HTHJ) ×1 |
| `#000000 (8%)` | black | 1 | kenar 1 | _blocks (blocks_t8HTHJ) ×1 |
| `#F7F7F7` | **palet dışı** | 1 | zemin 1 | gp-section-556461993255503041 (gp_section_556461993255503041) ×1 |
| `#121212` | **palet dışı** | 1 | metin 1 | gp-section-556461993255503041 (gp_section_556461993255503041) ×1 |
| `#575757` | **palet dışı** | 1 | metin 1 | gp-section-556461993255503041 (gp_section_556461993255503041) ×1 |
| `#D6FF02` | **palet dışı** | 1 | zemin 1 | gp-section-556461993255503041 (gp_section_556461993255503041) ×1 |

### Palet dışı kalanların nedeni
| Renk | Yer | Neden |
|---|---|---|
| #F2F2EF, #BDBDB8, #2E2E2C | tt-secim-kartlari → Nasıl çalışır kartı (tt-sc-nk-*) | "Nasıl çalışır kartına dokunma" kuralı |
| #161616, #F3F3F3 | tt-couple-kapsul (Couple ürünler sayfası) | Animasyon ara karesi (#0A0A0A↔#262624 ve #F4F4F4↔beyaz geçişi); kaynakta yok, canlı ölçümde tekrar edilemedi |
| #242424, #1C1C1C, #121212, #575757, #7D7D7D, #F7F7F7, #D6FF02 | İletişim sayfası (GemPages gp-section-556461993255503041) | GemPages – yalnız raporlanır |

## İletişim sayfası (GemPages) renkleri – değiştirilmedi
Metin #242424, #1C1C1C, #121212, #575757; kenar #7D7D7D; zemin #F7F7F7; vurgu zemin #D6FF02 (paletteki #D6FF00'a çok yakın). Tema fontu Poppins olduğu için bu sayfa da Poppins'i kendi tanımıyla kullanıyor.

## Kontrast
Otomatik denetim (17 sayfa, telefon; metin rengi + gerçek zemin, opaklık dahil; GemPages hariç):
- **Lime yazı açık zeminde: 0.**
- Düzeltilen: ürün sayfası akış şeridindeki pasif adım yazıları (0.4 opaklık → 2.7:1) → yazı opaklığı 0.6 (≈4.7:1).
- Kalan "başarısız" ölçümlerin tamamı animasyon ara karesi ya da ölçüm hatası, durağan halde geçiyor:
  - hediye-omru "Kaydır" ipucu: #5C5C57, durağanda 6.2:1; yanıp sönme animasyonu sırasında düşüyor.
  - hero şeridi "Çiçek solar", couple akış durum satırları: kayan/geçişli metinlerin ara kareleri.
  - Adım rozetleri, guclu-header/adim-yigin/apple-slayt vurgu satırları, mozaik foto kart yazıları: zemin degrade/fotoğraf olduğu için betik zemini yanlış okuyor; görselde ink-on-lime / beyaz-on-foto / #8A8A85 büyük başlık, geçiyor.

## Fonksiyon testleri (telefon, Tasarim dili önizlemesi, sipariş yok)
- Kart/Couple testi: **37 OK / 0 HATA** – Couple seti 2 ürün + "İkinci Üründe %50 İndirim" uygulandı (Astor 1.149,50 TL; toplam 3.548,50 TL, indirim 1.149,50 TL).
- Nasıl çalışır + Single/Couple geçişi testi: **41 OK / 0 HATA** (kart, pencere, Kadın/Erkek filtreleri, Couple modu ve Single'a dönüş, 360px, masaüstü).
- Çark: kart açılıyor, çark penceresi çiziliyor (Çevir'e basılmadı, kupon üretilmedi).
- Sepet çekmecesi: boş ve dolu açılıyor, ürün ekleyince kendiliğinden açılıyor.
- Taksit modalı: telefon ve masaüstünde açılıyor.

## LCP / CLS (telefon, 4× CPU, hızlı 4G, 5 ölçüm medyanı)
| Sayfa | Önce (Calisma kopyasi) | Sonra (Tasarim dili) |
|---|---|---|
| Ana sayfa | LCP 1368 ms · CLS 0.0032 | LCP 1440 ms · CLS 0.0034 |
| Erkek koleksiyonu | LCP 1596 ms · CLS 0.0473 | LCP 1296 ms · CLS 0.0473 |
LCP öğesi iki temada da hero videosu; farklar ölçüm gürültüsü aralığında. Poppins 4 ağırlık (400/500/600/700) yükleniyor, yeni font dosyası/Google Fonts yok (Shopify font kütüphanesi).

## Canlı tema MD5
"Calisma taslagi - 2026-10-05" (MAIN): 669 dosya, başlangıç listesiyle **birebir aynı** (değişen 0, yeni 0).

## Poppins'e geçişte taşma/satır kayması (boyut küçültülmedi)
- Single anlatım: "Single Zaman Kapsülü" başlığı 1 satırdan 2 satıra indi.
- Couple anlatım: "Sadece buluştuğunuzda açılır." satırı ekran kenarına çok yakın (guclu-header tek satır, kendini sığdırıyor).
- Mozaik yorum kartları: uzun yorum metni 1–3 satır uzadı.
- Ürün sayfası: "Kolay İade & Değişim İade Koşulları" 2 satıra indi; avantaj kartı açıklamaları 1 satır uzadı.
- Seçim kartları: "Kendi setini oluşturmak ister misin?" dar ekranda 2 satır olabilir; "İkincisi yarı fiyatına" rozeti dar.
- hediye-omru eksen etiketleri "1. Gün / 6. Ay" birbirine yakın.
Hiçbirinde içerik kesilmiyor veya taşıp kaybolmuyor.

## Notlar / karar verilen yorumlar
- Çark penceresindeki tam genişlik "Çarkı çevir" düğmesi koyu kartta beyaz + ink (büyük neon düğme yasağı); lime yalnız küçük "Çevir", dilimler ve ibrede.
- Çok satanlar: yalnız "2'li set" rozeti lime; Kadın/Erkek/Couple rozetleri ink + beyaz. Seçim kartlarında lime yalnız "İkincisi yarı fiyatına" ve "%50".
- Ürün sayfası sabit alt çubuğundaki CTA açık zeminde olduğu için ink (beyaz olsa görünmezdi).
- Adet seçicinin "seçili" durumu yok; malzeme seçicide seçili olana ink kenar uygulandı.
- apple-local-nav tüm şablonlarda kapalı (aktif: false); renkleri yine de güncellendi.
- Garanti ikonlarındaki %10 gri dolgu kaldırıldı (tek renk çizgi ikon).
- Mobil menü yalnız renk + font (yapı değişikliği ayrı iş).
