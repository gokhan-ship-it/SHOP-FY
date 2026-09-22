# Single / Couple Seçim Kartları + Couple Set Oluşturucu

Koleksiyon sayfası bölümü. Önek `.tt-sc-*`. Taslak tema
**`188045295936` — "Urun sagsutun - 2026-09-04"**. Canlı temaya
(`188044443968`) dokunulmadı.

## Dosyalar

| Dosya | Boyut | md5 |
|---|---|---|
| `sections/tt-secim-kartlari.liquid` | 23.284 | `7a5e9498bc13950d13def17752fb950e` |
| `snippets/tt-sc-karo.liquid` | 3.048 | `bd3847fce53aec482150767b64a9246a` |
| `snippets/tt-sc-ikon.liquid` | 1.198 | `c4042fada7124171db3bd369c318cc92` |
| `assets/tt-secim-kartlari.css` | 16.681 | `7a5a148fe01918aacb2933e6e5c8a14e` |
| `assets/tt-secim-kartlari.js` | 22.439 | `e8d444c19d737d7ec727c09625fa29e3` |

Hiçbir paylaşılan dosyaya dokunulmadı: `sections/main-collection.liquid`,
`snippets/product-card.liquid`, `assets/theme.js`, `assets/cart.js`
olduğu gibi duruyor.

## Kurulum (tema düzenleyici)

1. İlgili koleksiyon sayfasını aç
   (`/collections/zaman-kapsulu-kolyeler` ve `.../zaman-kapsulu-bileklik`).
2. **Bölüm ekle → Single / Couple Seçimi**. Yukarı, `main-collection`'ın
   üstüne taşı.
3. **`main-collection` bölümünü kapat.** Yeni bölüm kendi ürün ızgarasını
   çiziyor; ikisi açık kalırsa sayfada iki ürün listesi olur.
4. Kolyeler sayfasında **eski `Deneyim Seçimi` bölümünü kapat** — yerini
   bu alıyor.

Şablonlar otomatik üretilen JSON olduğu için elle yazılmadı; eş zamanlı
düzenleyici değişikliklerinin üzerine yazma riski var.

## Keşif bulguları (kodun dayandığı gerçekler)

- **İndirim:** `İkinci Üründe %50 İndirim`, Shopify **otomatik BXGY**
  (1 al / 1'ini %50 indirimli al), ACTIVE, 2026-07-03'ten beri. Kapsamı
  8 koleksiyon, ikisi de bu sayfaların koleksiyonu. Uygulama yok, tema
  kodu yok — **sepet seviyesinde kendiliğinden işliyor.** Bu bölüm
  yalnızca iki uygun ürünü sepete koyuyor.
- **Line item property:** Ürün sayfasındaki couple akışı
  (`assets/tt-tekli-secim.js:847`) sepete düz bir `items` dizisi
  gönderiyor, **hiç property taşımıyor**. Bu bölüm de aynısını yapıyor.
  Sete ortak bir anahtar (`_tt_couple_set`) istenirse **iki yere birden**
  eklenmeli, yoksa iki akış sipariş tarafında farklılaşır.
- **Sepet çekmecesi:** `assets/cart.js` içindeki `<cart-drawer>`
  `document`'ta `cart:refresh` dinliyor; `detail.open === true` ise
  içeriği tazeleyip açıyor. Kullanılan tek satır:
  `document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { open: true } }))`.
  Çekmece yoksa `/cart`'a düşülüyor.
- **Cinsiyet:** Katalogda cinsiyet metafield'i yok, etiketler tutarsız,
  `productType` boş, `vendor` ürün tipi. Tek güvenilir sinyal koleksiyon
  üyeliği. `Klasik Zaman Kapsülü` iki koleksiyonda birden.
- **Varyantlar:** 29 benzersiz üründen 9'unda birden fazla varyant var,
  fiyat farkı 1.100 TL'ye kadar çıkıyor (Aurora 2.699 / 3.799). Bu yüzden
  "Sete ekle" çok varyantlı üründe önce varyant seçici açıyor.
- **Karttaki sepet butonu:** `product-card.liquid` yalnızca
  `product.variants.size == 1` iken `<product-form>` basıyor; çok
  varyantlıda buton sepete eklemiyor, quick-view açıyor.

## Kurulum sırasında dikkat

- **Filtre ve `single_kaynak`.** Varsayılan `kendi` (sayfanın kendi
  koleksiyonu). Tek cinsiyetli bir koleksiyon sayfasında filtrelenecek
  bir cinsiyet farkı olmadığı için çip satırı Single modunda otomatik
  gizleniyor (boş sonuç ekranı çıkmasın diye). Filtrenin Single modunda
  da çalışması isteniyorsa ayarı **"Kadın + Erkek koleksiyonları"**
  yapmak yeterli — o zaman gruplar ve başlıklar iki modda da çıkıyor.
- **Tutar bir önizleme.** Pahalı ürün tam, ucuz ürün yarım. Shopify de
  BXGY'de indirimi ucuz olana uyguluyor, yani beklenen sonuç aynı; ama
  gerçek tutarı sepet hesaplıyor. `tutar_goster` kapatılırsa yerine
  yalnızca "İkincisi yarı fiyatına" yazıyor. **Gerçek sepetle bir kez
  karşılaştırılmalı.**

## Ölçüm

`layout/theme.liquid` içinde Meta Pixel yok; her şey `content_for_header`
üzerinden (Shopify Web Pixels / Müşteri etkinlikleri). Pixel
yapılandırması API'den okunamadı (`read_pixels` izni yok).

Bölüm iki olay yayınlıyor:

```js
Shopify.analytics.publish('tt_mod_secim', { mod: 'single' | 'couple' })
Shopify.analytics.publish('tt_couple_set_sepete_ekle', { urunler, varyantlar })
```

Custom pixel tarafında `analytics.subscribe('tt_mod_secim', ...)` ile
yakalanır. (DOM olayları custom pixel'e ulaşmaz — sandbox iframe.)
Yedek olarak `window.dataLayer`'a da yazılıyor.

`/cart/add.js` çağrısı Shopify'ın standart `product_added_to_cart`
olayını tetikler; **2 kalemlik `items` dizisinde kaç kez tetiklendiği
pixel debugger'da doğrulanmalı** — varsayılmadı.

## Öğrenilen üç tuzak

1. **Seçici çakışması.** `[data-sc-kime]` hem filtre çiplerinde hem 29
   ürün karosunda vardı; `querySelectorAll` 32 öğe döndürüyordu. Çipler
   `data-sc-cip`'e ayrıldı. Aynı hata kök öğe ile kartlar arasında da
   vardı (`data-sc-mod`) — kök artık `data-sc-aktif-mod` taşıyor.
2. **Chrome `border-width`'i tam piksele yuvarlıyor.** `1.5px` ekranda
   1px çıkıyordu. Kart kenarlığı `inset box-shadow`'a çevrildi:
   yuvarlanmıyor ve düzeni hiç etkilemediği için seçim değişince kartlar
   yerinden oynamıyor.
3. **İki koleksiyonda birden olan ürün.** `Klasik Zaman Kapsülü` tek
   başına karşı cinsiyetin çipini ayakta tutuyor, müşteriye 1 ürünlük
   sahte bir "Erkek" sekmesi gösteriyordu. Cinsiyet ayrımı artık yalnızca
   kaynak iki koleksiyonu kapsadığında anlamlı sayılıyor.

## Test

`scratchpad/sc/` altında Playwright düzeneği; gerçek katalog verisiyle
(17 kadın + 13 erkek ürün, gerçek varyant ve fiyatlar).

- `test.mjs` — 86 test: subgrid hizası (360/390/430px, uzun metinli
  varyantla), rozetin başlığa binmemesi, yatay taşma, seçim durumu
  renkleri, halka ölçüleri, filtre sayaçları, grup başlıkları,
  `single_kaynak` iki değeri, erkek koleksiyon sayfası.
- `test2.mjs` — 73 test: set kurma/çıkarma, üçüncü seçimde en eskinin
  çıkması, varyant seçici, eksik seçim uyarısı, tek istekte iki kalem,
  aynı varyantın `quantity: 2` olarak birleşmesi, sepet hatası,
  `cart:refresh` + `detail.open`, çekmece yoksa `/cart` yedeği, para
  biçiminin mağazadan öğrenilmesi (TR ve ABD biçimi), klavye, `?mod=`.

**159/159 geçiyor.** Ölçülen kontrastların tamamı AA (en düşüğü 5.0:1).
