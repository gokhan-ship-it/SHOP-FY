# JantiFox Kişiselleştirme Aracı: Faz 0 keşif raporu

Tarih: 2026-10-07. Bu fazda hiç kod yazılmadı. Mağazada yapılan tek değişiklik tema kopyasının oluşturulması.

## 1. Kurulum

| | |
|---|---|
| Mağaza | JantiFox (jantifox.com). Plan: Shopify (Plus değil). Para birimi TRY, saat dilimi +03 |
| Canlı tema | `JantiFox 2026 Back to School`, `gid://shopify/OnlineStoreTheme/205444088094` (MAIN). **Bu temaya dokunulmadı.** |
| Çalışma kopyası | `Kişiselleştirme DEV - 2026-10-07`, `gid://shopify/OnlineStoreTheme/206773780766` (UNPUBLISHED, işleme tamamlandı) |
| Önizleme | `https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766` |

**Shopify CLI hakkında.** Bu bulut ortamında Shopify CLI ve mağaza oturumu yok. Ayrıca `cdn.shopify.com` ağ politikası tarafından engelleniyor.

- Tema dosyalarına Admin API üzerinden erişiyorum: okuma için `theme.files`, yazma için `themeFilesUpsert`. Yazma yalnızca yayında olmayan temalara izinli.
- Yeni dosyaları bu depoda tutup kopya temaya bu yolla yükleyeceğim.
- `shopify theme dev` ile canlı önizleme yapılamıyor. Test, kopya temanın önizleme linkinde yapılacak.

**Depo hakkında.** Bu depoda başka bir mağazaya (`52ae29-e0`) ait `tt-*` dosyaları var. JantiFox teması bu depoda değil. Öneri: JantiFox işini `jantifox/` alt klasöründe, tema klasör yapısını aynen izleyerek tutmak. Klasörde yalnızca yeni ve değişen dosyalar olacak (bkz. Soru 7).

## 2. Ürün sayfası yapısı (kopya tema)

Tema Dawn türevi. `product-form` ve `cart-drawer` custom element'leri, `pubsub.js` ve Splide galerisi kullanıyor.

### Pilot ürünün şablonu

- Pilot ürün `templates/product.product-canta.json` şablonunu kullanıyor.
- `main-product` section'ındaki blok sırası: title → rating → **price** → variant_picker → siblings → quantity → **buy_buttons** → description → …
- **Kişiselleştir kartı, `price` ile `variant_picker` arasına yeni bir app benzeri blok olarak girer.** Bunun için `main-product` içine yeni bir `@app`/`custom_liquid` bloğu ya da yeni bir snippet render'ı eklenir. Şablon JSON'una tek blok eklenmesi yeterli olabilir: section `custom_liquid` bloğunu destekliyor (main-product.liquid:507).
- Galeri section içinde render ediliyor (`product-media-gallery`). Splide `fade` ana karusel ve thumbnail karuseli var. "Senin tasarımın" görseli ilk slayta overlay olarak bindirilecek. Galerinin kodu değiştirilmeyecek.
- `show_dynamic_checkout: true`, yani "Hemen satın al" butonu açık.
- Sticky sepet çubuğu (`product-add-to-cart-sticky.liquid`) açık. Kendi `<form>`'u var ve bu form **ana formla aynı id'yi** taşıyor.

### Sepete ekleme akışı

- `assets/product-form.js` FormData'yı `/cart/add` adresine gönderir, `cart-update` pubsub olayını yayınlar ve cart-drawer'ı section rendering ile yeniler.
- Temada aynı kalıpta iki özel override var (`main-product.liquid`):
  - `bag` etiketli ürünlerde hediye patch akışı (1182–1280. satırlar). Capture aşamasında `submit`'i yakalar, `/cart/add.js`'e JSON ile çok kalem gönderir, sonra `/cart`'a yönlendirir.
  - `patch-set` etiketli ürünlerde aynı yöntem (1074–1180. satırlar). `_set_name` ve `_set_handle` property'lerini ekler.
- **Pilot çantada bu iki etiket yok, yalnızca `patch-notice` var.** Bu override'lar devreye girmez. Bizim akışımız da aynı kanıtlanmış kalıbı kullanabilir.

### Sepet

- Sepet çekmecesi, sepet sayfası ve sepet bildirimi line item property'lerini gösteriyor. `_` ile başlayanları **zaten gizliyor**.
- Görünür property'ler: çekmecede yalnızca değer gösteriliyor, sepet sayfasında `ad: değer`.

### Mevcut patch kodu

- `patch-notice` etiketi bugün yalnızca açıklama altında "Değiştirilebilir patchler ayrı olarak satılmaktadır." notunu gösteriyor.
- `sections/patch-customizer.liquid` yalnızca `product-kiyafet` şablonunda çalışan, tek patch'lik basit bir önizleme. Sepete bir şey eklemiyor. Bizim işimizle çakışmıyor, onu da değiştirmeyeceğiz.

### Ölçüm

- Analitik bugün GTM (`GTM-THFJHXN6`) ve Clarity üzerinden çalışıyor.
- Temada `Shopify.analytics.publish` kullanımı yok.
- Bizim olayları `Shopify.analytics.publish('kisisellestirme_acildi', …)` ile yayınlayacağım. Meta'ya gitmeleri için Admin > Customer events'te bir custom pixel aboneliği gerekecek. Onu sen kuracaksın, kodunu ben hazırlarım.

## 3. Patch ürünleri

Tüm tekli patch'lerin fiyatı **330 TL**. Hepsi stok takipli (`inventoryPolicy: DENY`, stok bitince satılmaz). Brief'teki örnek tutar doğrulanıyor: 3.000 + 6 × 330 = **4.980 TL** (ELİF + 7 + Kalp).

### 3.1 Türkçe karakter durumu (kritik)

| Set | Varyant | Ç | Ğ | İ | Ö | Ş | Ü | Not |
|---|---|---|---|---|---|---|---|---|
| Cool Alfabe | 26 (A–Z) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Noktasız `I` var, `İ` yok |
| Piramit Alfabe | 39 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Noktasız `I` var (3 renk), `İ` yok |

Ayrıca iki alfabede de **Q, W, X var**. Türkçe isimlerde gerekmiyorlar ama satılıyorlar.

**Sonuç: Bugünkü stokla "ELİF" yazılamaz.** `toLocaleUpperCase('tr-TR')` doğru olarak "ELİF" üretir. "İ" varyantı olmadığı için isim stok kontrolünden geçemez. Faz 1 kabul kriterindeki örnek bu yüzden şu an uygulanamaz (bkz. Soru 1).

### 3.2 Piramit Alfabe'nin renk yapısı brief'ten farklı

Varyantlar "renk × harf" ızgarası değil. **Her harf yalnızca 1–3 sabit renkte var.** Örnekler:

- A: Mavi, Pembe, Turuncu
- B: yalnızca Antrasit
- C: yalnızca Beyaz
- G: yalnızca Sarı

Renkler: Mavi, Pembe, Turuncu, Antrasit, Beyaz, Yeşil, Turkuaz, Sarı, Haki, Kırmızı, Saks. Hiçbir renk alfabenin tamamını karşılamıyor. Bu yüzden "Piramit seçilince tek renk seç" akışı çalışmaz (bkz. Soru 2).

### 3.3 Rakamlar

- **Janti Rakam Patch**: 10 varyant (0–9), ölçü 6 × 7,5 cm, stoklar 123–282 arası.
- Rakamlar için tek set var. Cool veya Piramit rakamı yok.

### 3.4 İkonlar

Yaklaşık 50 aktif tekli ikon patch'i var. Kategoriler mevcut etiketlerden veriye dayalı olarak çıkarılabilir:

`janti hayvanlar`, `janti sporlar`, `janti kalpler`, `janti emojiler`, `janti mesajlar`, `janti oyuncular`

Not: Kalpler aynı zamanda `janti sporlar` etiketini de taşıyor. Bazı yeni ürünlerin hiç kategori etiketi yok (Musical Note, Retro Casette Player, Eggcellent vb.).

### 3.5 Mevcut ölçü verileri

- Ölçüler `custom.yukseklik`, `custom.genislik` ve `custom.cap` alanlarında, **serbest metin** olarak tutuluyor.
- Format tutarsız: "6cm", "7,5cm", "7.5cm", "6.5 cm", "6,5" (birimsiz).
- Harflerde yalnızca yükseklik var (6 cm). **Harf genişliği hiçbir yerde yok.**
- Kalplerde yalnızca genişlik var (5 cm).
- Ölçüler yaklaşık 3,5 ile 10 cm arasında değişiyor. Bu bilgi zaten "2–3 boy grubu" varsayımının ötesinde, ürün bazında ölçü tutmak gerekiyor.

### 3.6 Veri hataları (bilgi için, düzeltilmedi)

- "Piramit Alfabe – Mavi O" varyantının görseli `janti-rakam-patch-0.jpg`. "Janti Rakam – 0" varyantının görseli ise `piramit-alfabe-patch-o.jpg`. **Görseller ters bağlanmış.**
- Dışarıda bırakılacak ürünler:
  - `product_type: Patch` olup `patch` etiketi taşımayan HandMade ürünleri.
  - Draft durumdaki patch'ler: Taç, Tilki, Değişken Pullu Kalp, Yılbaşı Şapka.
- Admin'de 2 adet DRAFT "Kanvas Lacivert Tote Çanta" kopyası var (`-1`, `-kopya`). Bunlar `patch-set` etiketli. Pilot ürün `kanvas-lacivert-tote-canta`.

## 4. Pilot ürün: Kanvas Lacivert Tote Çanta

- Ürün: `gid://shopify/Product/10087205437726`, varyant `…/ProductVariant/51795696943390`.
- Fiyat 3.000 TL. Stok 75, takip açık.
- Ürün açıklamasında ölçüler zaten var:
  - **Gövde 40 × 39 cm.**
  - **Velcro daire çapı 25 cm.** Yer tutucular bu değerlerle başlatılabilir, son ölçümü yine sen onaylarsın.
- 2. galeri görseli `tote-canta-blue-01.jpg`, 1920 × 1920. CDN erişimim olmadığı için görseli inceleyemedim.

**Sığma ön hesabı.** Harf boyu 6 cm, harf genişliği varsayım olarak 5–6 cm:

- 25 cm dairenin merkezinden geçen 6 cm'lik bant içindeki en dar kiriş yaklaşık 24,3 cm.
- Tek satıra **en fazla 4 harf** sığar. "En fazla 5 harf" ancak harfler 4,8 cm'den darsa ya da iki satır kullanılırsa mümkün.
- İki satırda her satıra 3–4 harf sığar.

Harf genişliği ölçülmeden kesin sayı verilemez (bkz. Soru 3).

## 5. EasyBundle

- `eb-easy-bundle-builder` app embed'i **tüm sayfalarda açık**. Ayarları boş.
- EasyBundle'ın app bloğu (`mixAndMatchBundle`) yalnızca `templates/product.bundle.json` şablonunda var. Pilot çanta ve varsayılan ürün şablonu bunu kullanmıyor.
- Temada EasyBundle'a özgü sepet kodu bulunmadı: `fetch` yakalama, `_bundle` property'si, cart transform yok.
- "Patch Seti" ürünleri Shopify'ın yerel bundle'ı değil. `requiresComponents: false`, stok takibi kapalı. İçerikleri `custom.set_urunleri` alanında tutuluyor. Tema bunları kendi `patch-set` override'ı ile sepete ekliyor.
- **Risk:** App embed'in sayfada çalışma anında `/cart/add.js` isteklerini yakalayıp yakalamadığı tema kodundan görülemiyor. Faz 1'in ilk adımı olarak önizleme linkinde test edeceğim:
  - çok kalemli sepete ekleme,
  - property'lerin korunup korunmadığı,
  - bir "Patch Seti" ile aynı sepette çakışma olup olmadığı.

## 6. Metafield önerisi

Hepsi yeni namespace altında: **`kisisellestirme`**. Mevcut `custom.*` alanlarına dokunulmaz.

### Baz ürün (product)

| Key | Tip | İçerik |
|---|---|---|
| `kisisellestirme.harita` | `json` | §5.1'deki yapı. `image` URL'i yerine `image` alanını kaldırmayı öneriyorum. |
| `kisisellestirme.onizleme_gorseli` | `file_reference` (image) | Önizleme görseli. Dosya referansı olunca Liquid `image_url: width:` ile ekrana uygun boyutta yüklenir (§9 gereği). |
| `kisisellestirme.aktif` | `boolean` | `patch-notice` etiketine ek açma/kapama. Böylece pilot dışındaki etiketli ürünler haritası girilene kadar etkilenmez. |

Harita koordinatları yüzde olarak tutulur. `shape` değerleri `rect`, `circle` veya `ellipse` olur. `allowed_types` ve `forbidden` brief'teki gibidir.

### Patch ürünü (product ve variant)

| Seviye | Key | Tip |
|---|---|---|
| product | `kisisellestirme.tip` | `single_line_text_field`, seçenekler: `letter`, `number`, `icon` |
| product | `kisisellestirme.set` | `single_line_text_field`, seçenekler: `cool`, `piramit`, `rakam` |
| product | `kisisellestirme.genislik_cm`, `kisisellestirme.yukseklik_cm` | `number_decimal` |
| product | `kisisellestirme.sekil` | `rect` veya `circle`. Yuvarlak patch'lerde çakışma hesabı daire ile yapılır. |
| product | `kisisellestirme.kategori` | `single_line_text_field`, bkz. Soru 5 |
| product | `kisisellestirme.onizleme_png` | `file_reference`. Tek varyantlı ikonlar için şeffaf PNG. |
| **variant** | `kisisellestirme.onizleme_png` | `file_reference`. Harf ve rakamlarda her varyantın kendi PNG'si olur. |
| **variant** | `kisisellestirme.karakter` | Örnek: `A`, `İ`, `7`. Varyant başlığını ayrıştırmak yerine kullanılır. |
| variant | `kisisellestirme.renk` | Yalnızca Piramit için. Örnek: `Mavi`. |

### Katalog: tema hangi patch'leri listeleyecek?

Öneri: **bir metaobject** (`kisisellestirme_katalog`, tek kayıt). İçeriği:

- `harf_setleri`: `list.product_reference`
- `rakamlar`: `product_reference`
- `ikonlar`: `list.product_reference`
- `kategoriler`: sıralama ve görünen adlarıyla birlikte

Liquid bu listeyi sayfaya JSON olarak basar: varyant id, karakter, stok (`variant.inventory_quantity`), ölçü ve PNG URL'si. Ek istek ve backend gerekmez. Yeni ikon eklemek "metaobject'e ürün ekle + metafield doldur" işinden ibaret olur.

## 7. Teknik kararlar (öneri)

### Kütüphane

**Konva kullanmamayı öneriyorum.** Yerine DOM ve CSS ile, `position: absolute` görseller ve Pointer Events kullanan yaklaşık 15–20 KB'lık kendi kodumuzu yazarız. Gerekçeler:

- Konva yaklaşık 150 KB ekliyor.
- Daire ve elips içinde kalma, çakışma ve "en yakın geçerli konum" hesaplarını Konva'da da kendimiz yazmak zorundayız.
- Patch sayısı az (en fazla ~10).
- DOM görselleri `srcset` ile ekran boyutuna uygun yüklenir. Canvas belleği ise eski iPhone'larda Safari'yi çökertme riski taşır.
- "Senin tasarımın" görseli aynı DOM'un galerideki kopyası olur.

Kod tema `assets/` klasöründe tutulur. CDN bağımlılığı olmaz.

### "Hemen satın al" butonu

- Shopify'ın dinamik ödeme butonu yalnızca formdaki tek varyantı satın alır. Çok kalemli tasarımı taşıyamaz.
- **Kişiselleştirme modunda ana formda ve sticky çubukta gizlenecek.** Sticky çubuktaki buton da tasarımlı sepete ekleme yapacak.
- Böylece "kişiselleştirilmiş ürün asla düz satılmaz" kuralı korunur.

### Yedek plan

- Kart HTML'i `hidden` olarak gelir. JS ve veri başarıyla yüklenince görünür hale gelir.
- JS yüklenmezse sayfa bugünkü gibi düz ürünü satar.
- Ana form ve dinamik ödeme butonu yalnızca JS kişiselleştirme moduna geçince değiştirilir.

### Mevcut dosyalarda zorunlu değişiklik (tahmin)

- `templates/product.product-canta.json`: tek blok eklenecek.
- Belki `sections/main-product.liquid`: tek satırlık `render`. Ancak bu dosya tüm ürün şablonlarında ortak; tercih `custom_liquid` bloğu.
- Diğer her şey yeni dosya olacak:
  - `snippets/kisisel-*.liquid`
  - `assets/kisisel-editor.js` ve `assets/kisisel-editor.css`
  - sepet gruplaması için `snippets` içinde bir parça
  - sepet şablonlarında satır başına 1–2 satırlık `render`

## 8. Onayına sunulan Faz 1 planı

1. **Veri katmanı.** Metafield ve metaobject tanımlarını oluştur, pilot çanta ile alfabe, rakam ve 3–4 ikon için verileri gir. Ölçüler ve PNG'ler hazır olana kadar yer tutucu değerler ve mevcut JPG'ler kullanılır.
2. **EasyBundle ve çok kalemli `/cart/add.js` testi** (önizleme linkinde).
3. **Ürün sayfası kartı:** "Sadece çanta / Kişiselleştir", özet, toplam fiyat, buton metni, dinamik ödeme butonu ve sticky çubuk davranışı.
4. **Tam ekran editör:**
   - adım çizgisi ve sabit alt çubuk,
   - Yazı adımı: set kartları, tr-TR büyük harf, sığma ve öneriler, stok ve adet kontrolü, kapasite göstergesi,
   - Rakam, İkon ve Özet adımları,
   - sürükleme kuralları: daire alan, yasaklı bölge, çakışma, geri dönme.
5. **Sepete ekleme:**
   - tek istekte tüm kalemler,
   - `_tasarim_id` ve `_tasarim_konum` gizli property'leri,
   - baz ürün kaleminde `Tasarım: …` ve `İsim: …` görünür property'leri,
   - harf kalemlerinde isimdeki sıra (ör. `_sira: 1,3` ve görünür `Harf sırası`).
6. **Sepette gruplama** ve silme davranışı (Soru 6'daki karara göre).
7. **Ölçüm olayları.**
8. **Test:** iPhone Safari, Instagram uygulama içi tarayıcı ve test siparişi. Cihaz testlerini sen yapacaksın, ben önizleme linki ve kontrol listesi hazırlayacağım.

## 9. Kararını beklediğim sorular

1. **"İ" ve diğer Türkçe harfler stokta yok.** Hangisi?
   - (a) Bu harfler üretilene kadar yazılamasın, "Bu harf henüz yok" uyarısı çıksın.
   - (b) Müşteriye açıkça sorup "İ → I" gibi bir eşleme önerelim. Otomatik eşleme yapılmaz.
   - (c) Pilot testini İ içermeyen bir isimle yapalım (ör. "ELA", "ECE").
2. **Piramit renkleri.** Her harf yalnızca belirli renklerde var. Hangisi?
   - (a) Harf başına renk seçimi (her harfin altında mevcut renkler).
   - (b) "Karışık renk" otomatik seçim ve harfe dokununca renk değişimi.
   - (c) Piramit pilotta yer almasın, yalnızca Cool olsun.
3. **Ölçüler.**
   - Cool ve Piramit harflerinin genişliği?
   - İsim tek satır mı olmalı, yoksa iki satıra izin verilsin mi?
   - Brief'teki "en fazla 5 harf" örneği 25 cm dairede tek satırla zor görünüyor.
4. **Ölçü verisi.** Mevcut `custom.genislik/yukseklik/cap` metinlerinden yeni sayısal metafield'ları ben doldurayım mı? (~55 ürün, sonra sen kontrol edersin.)
5. **İkon kategorileri.** Mevcut `janti …` etiketleri yeterli mi, yoksa ayrı bir `kisisellestirme.kategori` alanı mı istersin? Kalpler hem "Kalpler" hem "Sporlar"da görünüyor.
6. **Sepette tasarım kalemi silinirse.** Önerim:
   - Baz ürün silinirse grubun tamamı silinsin, önce onay sorulsun.
   - Tek bir patch silinirse "Tasarımın değişecek" uyarısıyla silinsin ve özet güncellensin.
   - Çanta adedi değişirse patch adetleri de aynı oranda değişsin.
7. **Depo yerleşimi.** JantiFox dosyalarını bu depoda `jantifox/` alt klasöründe tutmam uygun mu? Ayrı bir depo da açılabilir.
8. **Metafield ve metaobject oluşturma.** Faz 1'in ilk adımında bu tanımları Admin API ile ben oluşturabilirim. Canlı mağazada görünür bir şey değiştirmez, ama mağaza verisine yazma olduğu için onayını istiyorum.
