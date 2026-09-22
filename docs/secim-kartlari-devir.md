# Single / Couple Seçim Kartları + Couple Set Oluşturucu

Koleksiyon sayfası bölümü. Önek `.tt-sc-*`. Taslak tema
**`188045295936` — "Urun sagsutun - 2026-09-04"**. Canlı temaya
(`188044443968`) dokunulmadı.

## Dosyalar

| Dosya | Boyut | md5 |
|---|---|---|
| `sections/tt-secim-kartlari.liquid` | 25.699 | `7e13025e54fdfbe7e767fac78adc5f9c` |
| `snippets/tt-sc-karo.liquid` | 3.048 | `bd3847fce53aec482150767b64a9246a` |
| `snippets/tt-sc-ikon.liquid` | 1.198 | `c4042fada7124171db3bd369c318cc92` |
| `assets/tt-secim-kartlari.css` | 17.270 | `a38efbdee85a3eafe3414febe8edf114` |
| `assets/tt-secim-kartlari.js` | 25.044 | `5abc96fb74a389ecc5e75e94fac91563` |

Hiçbir paylaşılan dosyaya dokunulmadı: `sections/main-collection.liquid`,
`snippets/product-card.liquid`, `assets/theme.js`, `assets/cart.js`
olduğu gibi duruyor.

## Kurulum (tema düzenleyici)

1. İlgili koleksiyon sayfasını aç
   (`/collections/zaman-kapsulu-kolyeler` ve `.../zaman-kapsulu-bileklik`).
2. **Bölüm ekle → Single / Couple Seçimi**. Yukarı, `main-collection`'ın
   üstüne taşı.
3. **`main-collection` (Ürün ızgarası) AÇIK KALSIN, elle kapatma.**
   Bölüm gerektiğinde onu kendisi gizliyor; iki listenin üst üste
   binmesi mümkün değil.
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

## Izgara kimin: Kadın/Erkek filtresi belirledi

Filtrenin **iki modda da** çalışması isteniyor. Temanın ızgarası
(`main-collection`) yalnızca sayfanın **kendi** koleksiyonunu basıyor —
kadın sayfasında erkek ürünü gösteremez. O ızgarayla Kadın/Erkek
filtresi Single modunda kaçınılmaz olarak boş kalırdı. Bu yüzden liste
iki modda da bu bölümün; temanın ızgarası gizleniyor.

Ürün kartları temanın kendi `product-card` snippet'iyle basıldığı için
kartların görünümü değişmiyor; değişen yalnızca ızgara kapsayıcısı ve
listenin hangi koleksiyonlardan geldiği.

**Bunun bedeli:** `main-collection`'ın kendi filtreleri, sıralaması ve
sayfalaması bu iki sayfada devre dışı kalıyor. Koleksiyonlar 17 ve 13
ürün olduğu için sayfalamaya gerek yok; sıralama/filtre gerekiyorsa
ayar `tema` yapılabilir.

**Tek ayar var:** *Single modunda ürün ızgarası*

| Değer | Sonuç |
|---|---|
| **Bu bölümün ızgarası** (varsayılan) | İki koleksiyon birden, Kadın/Erkek filtresi Single'da da çalışır |
| Temanın kendi ızgarası | Sayfanın kendi filtreleri/sıralaması korunur, Kadın/Erkek çipleri Single'da gizlenir |

Bir ara ikinci bir ayar daha vardı (*Single modunda listelenen ürünler*).
İkisinin de adı "Single modunda" diye başlıyordu ve kurulumda yanlış
olan çevrildi. Üstelik "bölümün ızgarası + yalnızca sayfanın
koleksiyonu" kombinasyonu anlamsızdı: tek koleksiyonu filtresiz
listelemeyi temanın ızgarası zaten daha iyi yapıyor. Ayar kaldırıldı.

Temanın ızgarasını **her zaman bu bölüm yönetiyor** (seçici ayarı:
`#shopify-section-main-collection`). Kapatmayı kullanıcıya bırakmak,
ilk kurulumda `main-collection` açık unutulduğu için sayfada iki ürün
listesi bırakmıştı.

## Kurulum sırasında dikkat

- **Single modunda karşı cinsiyet de listeleniyor.** Kadın koleksiyon
  sayfasında Single modunda erkek ürünleri de görünüyor ("Tümü"
  seçiliyken grup başlıklarıyla ayrılmış olarak). Filtrenin Single
  modunda çalışmasının koşulu bu. İstenmezse ayar *Temanın kendi
  ızgarası* yapılır.
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

## Öğrenilen beş tuzak

0. **`hidden` niteliği tek başına yetmiyor.** Tarayıcının
   `[hidden] { display: none }` kuralı, öğeye açıkça bir `display`
   verildiğinde eziliyor. `.tt-sc-cipler`'de `display: flex` vardı ama
   `[hidden]` kuralı yoktu: çip satırı gizlenmesi gereken yerde ekranda
   kaldı, içindeki Kadın/Erkek çipleri (onların kuralı vardı) gizlenip
   geriye tek başına "Tümü" kaldı. Testler `.hidden` ÖZELLİĞİNİ
   okuduğu için bunu göremedi; `test4.mjs` artık **hesaplanmış
   display**'i ölçüyor.
1. **`concat` sessizce boş döndü.** İlk sürümde
   `kadin_kol.products | concat: tekil_kol.products` vardı ve vitrinde
   kadın grubu **hiç basılmadı**: Single modunda görünen tek ürün, erkek
   döngüsünden gelen ve iki koleksiyonda birden olan *Klasik Zaman
   Kapsülü* idi (belirti tam olarak "1 ürün"). `concat` bir dizi
   bekliyor; `collection.products` dizi değil. Birleştirme tamamen
   kaldırıldı: her kaynak kendi döngüsünde basılıyor, tekilleştirme
   ortak bir dizeyle yapılıyor.
2. **Seçici çakışması.** `[data-sc-kime]` hem filtre çiplerinde hem 29
   ürün karosunda vardı; `querySelectorAll` 32 öğe döndürüyordu. Çipler
   `data-sc-cip`'e ayrıldı. Aynı hata kök öğe ile kartlar arasında da
   vardı (`data-sc-mod`) — kök artık `data-sc-aktif-mod` taşıyor.
3. **Chrome `border-width`'i tam piksele yuvarlıyor.** `1.5px` ekranda
   1px çıkıyordu. Kart kenarlığı `inset box-shadow`'a çevrildi:
   yuvarlanmıyor ve düzeni hiç etkilemediği için seçim değişince kartlar
   yerinden oynamıyor.
4. **İki koleksiyonda birden olan ürün.** `Klasik Zaman Kapsülü` tek
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
- `test3.mjs` — 40 test: varsayılan ayarda Single modunda çiplerin
  çalışması (29 / 17 / 13 ürün, grup başlıkları, set kutusunun Single'da
  çıkmaması), Single modunda temanın ızgarasına devir,
  Couple modunda geri alma, `kendi` ayarında temaya dokunulmaması,
  `concat` hatasının geri gelmediği (Single'da 17 ürün, 1 değil),
  `?mod=couple` ile açılış, temanın ızgarası sayfada yokken çökmeme.
- `test2.mjs` — 73 test: set kurma/çıkarma, üçüncü seçimde en eskinin
  çıkması, varyant seçici, eksik seçim uyarısı, tek istekte iki kalem,
  aynı varyantın `quantity: 2` olarak birleşmesi, sepet hatası,
  `cart:refresh` + `detail.open`, çekmece yoksa `/cart` yedeği, para
  biçiminin mağazadan öğrenilmesi (TR ve ABD biçimi), klavye, `?mod=`.

- `test4.mjs` — 24 test: JS'in `hidden` yazdığı **her** öğe için
  hesaplanmış `display` ölçümü (nitelik yazılıyor mu değil, gerçekten
  kayboluyor mu).

**223/223 geçiyor.** Ölçülen kontrastların tamamı AA (en düşüğü 5.0:1).
