# Hız Paketi 1: değişiklik kaydı (dosya:satır)

Tema: **Hiz paketi 1 - 2026-10-23** (ID 189388095808, yayında değil). Satır numaraları kopya temadaki yeni dosyaya göre. "Önce" = canlı temadaki aynı dosya ("Gumus stok notu - 2026-10-21", 189316038976).

Bu dosyaların hiçbirinde takip kodu (fbq, gtag, ttq, dataLayer, Shopify.analytics, analytics.publish) geçen bir satır değişmedi.

## Ayar

| Dosya:satır | Değişiklik |
|---|---|
| `config/settings_data.json:98` | `enable_page_transition`: `true` → `false` (yalnızca `current`; hazır ayar setlerine dokunulmadı). Yan etki: Shopify kaydederken kaldırılmış iki uygulamanın (GemPages, Wheelio) boşta kalan app embed kayıtlarını dosyadan attı. Inbox sohbet kaydı aynen duruyor. |

## Yeni dosyalar

| Dosya | Ne yapıyor |
|---|---|
| `snippets/tt-video-surumleri.liquid` (1–64) | Videonun Shopify kodundan telefon ve masaüstü adresini bulur, `data-tt-mobil` / `data-tt-masaustu` olarak basar. 15 video eşlemesi var. |
| `snippets/tt-yapisal-veri.liquid` (1–126) | Ana sayfada Organization + WebSite (SearchAction); ürün ve koleksiyon sayfalarında BreadcrumbList. |

## Değişen dosyalar

| Dosya:satır | Değişiklik |
|---|---|
| `layout/theme.liquid:210-212` | `</head>`'den hemen önce `tt-yapisal-veri` çağrısı (yeni satır; mevcut satıra dokunulmadı). |
| `sections/hero-video-kapsul.liquid:525-548` | `video_tag` yerine: kapak görseli `<img>` (eager, fetchpriority high, widths + sizes) + `preload="none"` ve kaynaksız `<video>` (autoplay/loop/muted/playsinline ayarlardan aynen). |
| `sections/hero-video-kapsul.liquid:741-788` | Yeni betik: video kaynağı `load` + tarayıcı boşta kalınca atanır; telefona hafif sürüm, masaüstüne 3 Mbps; Save-Data veya 2g/3g'de video hiç inmez. |
| `sections/video-slider-kapsul.liquid:11-27` | Kapak görseli için gerçek genişlikten `sizes` hesabı. |
| `sections/video-slider-kapsul.liquid:132-137` | CSS: video kapak görselinin üstünde (absolute). |
| `sections/video-slider-kapsul.liquid:433-448` | `video_tag` yerine: lazy kapak `<img>` (widths + sizes) + `preload="none"` kaynaksız `<video>`. |
| `sections/video-slider-kapsul.liquid:537-553` | `telefon()`, `kaynakAta()`, `kaynakli()` yardımcıları. |
| `sections/video-slider-kapsul.liquid:575-576, 594, 618, 667-668, 801` | Kaynak yalnızca o slayt oynatılacağı an atanır (telefona hafif sürüm, masaüstüne bugünkü dosya); kaynaksız videoya `pause()`/`currentTime` yapılmaz. Otomatik oynatma eskisi gibi: bölüm ekrana girince aktif slayt kendiliğinden oynar (`vsWantPlay` satırı canlıdakiyle aynı). |
| `sections/video-slider-kapsul.liquid:821-829` | Betik DOMContentLoaded'ı beklemeden kurulur (bölüm HTML'i hazır; iki kez kurulmaya karşı korumalı). |
| `sections/mozaik-kartlar.liquid:113-118` | CSS: video kapak görselinin üstünde. |
| `sections/mozaik-kartlar.liquid:605-615` | Kart genişliğinden `sizes` hesabı (kolon, kenar, aralık, ölçek ayarlarından). |
| `sections/mozaik-kartlar.liquid:685-699` | `video_tag` yerine: lazy kapak `<img>` (widths + sizes) + `preload="none"` kaynaksız `<video>`. |
| `sections/mozaik-kartlar.liquid:704, 732` | Görsel kartlara `sizes`. |
| `sections/mozaik-kartlar.liquid:903-906, 915-918, 921` | Oynat'a dokununca kaynak atanır (telefona hafif sürüm); kaynaksız videolara `pause()` yapılmaz. |
| `sections/mozaik-kartlar.liquid:1065, 1082` | Kaynaksız videoya `pause()` yapılmaz. |
| `sections/mozaik-kartlar.liquid:1091-1099` | Betik DOMContentLoaded'ı beklemeden kurulur. |
| `sections/ugc-video-gallery.liquid:451-455` | Düğmeye telefon adresi (`data-video-src-mobil`). |
| `sections/ugc-video-gallery.liquid:493` | Pencere videosuna `preload="none"`. |
| `sections/ugc-video-gallery.liquid:643-646` | Telefonda telefon adresi açılır, masaüstünde bugünkü dosya. |
| `snippets/tt-couple.liquid:1159-1167` | Couple sayfalarındaki video ışık kutusu kartın videosunu klonluyor; klona da telefon/masaüstü kaynağı atanır (yoksa yeni düzende video oynamazdı). |
| `snippets/tt-tekli-gorunum.liquid:301-309` | Aynı düzeltme, tekli ürün sayfalarındaki ışık kutusu için. |
| `sections/tt-couple-kapsul.liquid:782-793` | İki kapsül görseli eager, ilki fetchpriority high; widths + sizes. |
| `sections/tt-cok-satanlar.liquid:806-813` | İlk 3 kart eager, kalanlar lazy. |
| `sections/couple-bulusma.liquid:786-796` | Fotoğraf duvarı karelerinin `sizes` hesabı. |
| `sections/couple-bulusma.liquid:804-809, 855` | İki sabit 600 px `<img>` → `image_tag` + widths + sizes. |
| `sections/tt-catal-karsilastirma.liquid:293-297, 322` | İki kart görseline widths + sizes. |
| `sections/tt-secim-kartlari.liquid:1395-1396, 1400` | Sonradan açılan şerit karelerine ilk kareyle aynı `sizes`. |
| `snippets/product-media-gallery.liquid:95-112, 127` | Masaüstü `sizes` ölçülen galeri genişliğine göre ('scroll' düzeni); telefon ve tablet değeri aynen; ilk görselin eager + fetchpriority'si aynen. |
