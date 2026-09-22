# Single / Couple Seçim Kartları + Couple Set Oluşturucu

Koleksiyon sayfası bölümü. Önek `.tt-sc-*`. Taslak tema
**`188045295936` — "Urun sagsutun - 2026-09-04"**. Canlı temaya
(`188044443968`) dokunulmadı.

## Dosyalar

| Dosya | Boyut | md5 |
|---|---|---|
| `sections/tt-secim-kartlari.liquid` | 30.141 | `c1b346f457c39f96b1b98e3a5d8fd369` |
| `snippets/tt-sc-karo.liquid` | 3.048 | `bd3847fce53aec482150767b64a9246a` |
| `snippets/tt-sc-ikon.liquid` | 3.432 | `f8cb0504ac5d8f34e997b5e649bb5171` |
| `assets/tt-secim-kartlari.css` | 23.940 | `36fd0eb2ca57b77d7c77a51a5d3aa853` |
| `assets/tt-secim-kartlari.js` | 26.722 | `9548bb50a648440e88b781bb105ce5aa` |

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

## Kart düzeni (satır sırası)

Karttaki beş satır, yukarıdan aşağıya. Sıra aynı zamanda ekran
okuyucunun okuduğu sıra: başlık → açılma şekli → ürün sayısı → kim
yükler. Rozet DOM'da **en sonda** duruyor ki adın başına girmesin;
konumu CSS ile veriliyor.

| # | Öğe | Tipografi | Not |
|---|---|---|---|
| 1 | `.tt-sc-ad` — "Single" / "Couple" | 20px / 500 / 1.2 | `padding-right: 22px`, radyonun altına girmiyor |
| 2 | `.tt-sc-acilma` — açılma şekli | 14px / 500 / 1.3 | ikon 16px `flex: none`, başlıktan 6px aşağıda, rengi `inherit` — gri **değil** |
| 3 | `.tt-sc-ayrac` | 1px çizgi | `margin: 11px 0 9px` |
| 4 | `.tt-sc-satir` — ürün sayısı | 12px, gri | halka görseliyle |
| 5 | `.tt-sc-satir--kutu` — kim yükler | 13px / 500 / 1.25 | aşağıdaki bölüm |

Açılma şekli eskiden kartın en üstünde, başlığın **üstünde** küçük gri
bir üst yazıydı (`.tt-sc-ustyazi`). Kaldırıldı: alıcı önce neyi aldığını
(Single/Couple) okusun, açılma şekli onun niteliği olarak hemen altında
gelsin diye. Ayar id'leri (`single_ust`, `couple_ust`) korundu — tema
düzenleyicideki mevcut metinler kaybolmasın diye; yalnızca etiketleri
"Açılma şekli metni" oldu.

Radyo düğmesi `top: 26px`: 22px üst dolgu + başlığın 24px satır
kutusunun yarısı − dairenin yarısı (8px). Başlığın ilk satırıyla
ortalanıyor, başlık iki satıra kırılsa da yerinde kalıyor.

Rozet ("İkincisi yarı fiyatına") karta ortalı:
`left: 50%; transform: translateX(-50%)`, `max-width: calc(100% - 16px)`,
`white-space: nowrap`. Kartın kendi `transform`'u yok ve seçim yalnızca
`background` + `box-shadow` değiştiriyor, o yüzden çakışma yok. 11px
yazıyla rozet 360px'te bile karta sığıyor — küçültmeye gerek kalmadı.

İkonlar `snippets/tt-sc-ikon.liquid` içinde dört tane: `takvim` ve
`kilit-acik` (açılma şekli), `kisi` ve `kisiler` (yükleme kutusu).
Hepsi `stroke="currentColor"`, `aria-hidden="true"`.

## Yükleme kutusu (kartın son satırı)

`.tt-sc-satir--kutu`. "Sadece sen yüklersin" / "İkiniz de yüklersiniz",
Single ile Couple arasındaki farkın ta kendisi olduğu için kendi zemini
ve rengi olan vurgulu bir kutuda. Üstündeki "1 ürün / 2 ürün" satırı
12px ve gri kaldı.

| | Beyaz kart | Seçili koyu kart |
|---|---|---|
| Kutu zemini | `#eef6f1` | `#1f2c26` |
| Yazı ve ikon | `#30614b` | `#8fcbb0` |
| Ölçülen kontrast | **6,5:1** | **7,8:1** |

Ölçüler: 7px dikey / 9px yatay dolgu, 10px köşe, ikon 16px (`flex: none`),
ikon–metin arası 6px, metin 13px / 500 / 1.25, üst satırla arası 8px.

Kutu **kendi grid satırını dolduruyor**: subgrid'de grid öğesinin
varsayılan hizalaması `stretch`, yani metinlerden biri iki satıra
kırılırsa satır büyüyor ve diğer karttaki kutu da onunla aynı boya
uzuyor — ek kural gerekmiyor, sadece `height`/`align-self` ile
bozmamak gerekiyor. Subgrid'siz tarayıcıda `min-height: 47px`
(7+7 dolgu + 2 × 16.25 satır).

Renkler bölüm ayarı **değil**, CSS'te sabit — yeni ayar istenmedi.
Geçiş süresi eklenmedi: bölümde zaten hiçbir yerde `transition` yok,
kart seçilince bütün renkler anında değişiyor; kutu da onlarla birlikte.

## Setini oluştur kutusu

Yukarıdan aşağıya: kural bandı → başlık + sayaç → ilerleme çubuğu →
iki slot. Kutunun kendi iç boşluğu yok (`padding: 0` + `overflow:
hidden`), boşluklar bölümlerde: koyu bandın kutunun kenarına kadar
uzaması ve köşeleri takip etmesi için.

**Kural bandı.** "Couple set için sepete 2 ürün eklenir" bilgisi
eskiden kutunun en altında küçük gri bir nottu — yani en önemli kural
en silik yerdeydi. Artık en üstte, koyu zeminde iki satır: 14px/500
beyaz ana satır ve 12px `#a3a6ad` alt satır, solda 18px `#8fcbb0`
bilgi ikonu (`flex: none`, `aria-hidden`). Eski alt not kaldırıldı.

**İlerleme çubuğu.** İki eşit parça, 4px yükseklik, 4px ara, tam
yuvarlak. Boş `#e5e8ec`, dolu `#30614b`, geçiş 160ms;
`prefers-reduced-motion` altında geçiş yok. Dekoratif ve
`aria-hidden`: aynı bilgi sayaçta var ve sayaç `aria-live="polite"`.
Sayaç 0 ve 1 üründe "[n]/2 seçildi", 2 üründe "Set hazır".

**Slotlar.** min-height 62px, 12px köşe, 11/10 dolgu, aralarında 8px.
Üst satır 13px/500 + 15px ikon (boşken artı, doluyken tik — **ikisi de
basılıyor, seçimi CSS yapıyor**, JS ikon üretmiyor). Uzun ürün adı tek
satırda üç noktayla kısalıyor, slot bozulmuyor.

| | 1. slot | 2. slot |
|---|---|---|
| Boş kenar | kesikli `#c9ced5` | kesikli `#599176` |
| Boş zemin | beyaz | `#f0f7f3` |
| Dolu kenar | düz `#15171c` | düz `#30614b` |
| Boş alt yazı | "Tam fiyat" `#6b6f78` | "Sepette %50 indirimli" `#30614b`/500 |
| Dolu alt yazı | Kadın/Erkek + varyant | "Sepette yarı fiyatına" |

2. slot boşken de vurgulu: müşteriyi doldurmaya çağıran şey indirimin
kendisi. "%50" rozeti slotun sağ üstünde (`top: -9px; right: 8px`),
iki durumda da görünür. Kutunun `overflow: hidden`'ı rozeti kesmiyor:
rozet slotun içinde ve slotun üstünde ilerleme çubuğundan gelen 12px
boşluk var.

**1.5px kenar tuzağı — yine.** Chrome `border-width`'i tam piksele
yuvarlıyor. Dolu slotta kenarlık düz olduğu için `inset box-shadow`
ile gerçekten 1.5px çizdirildi (kenarlık `transparent` ama yerinde
duruyor, yani yerleşim iki durumda da aynı); **boş slotun kesikli
kenarı gölgeyle yapılamadığı için orada Chrome'un 1px'i kalıyor.**

**Slot sırası = fiyat sırası, ama `set` dizisi seçim sırasında.**
Diziye, ekleme mantığına, üçüncü seçimde en eskinin düşmesine, sepete
giden kalemlere ve tutar hesabına dokunulmadı. Yalnızca **slotlara
yazarken** pahalı olan 1. slota, ucuz olan 2. slota alınıyor: 2. slot
"sepette yarı fiyatına" diyor ve Shopify BXGY'de indirimi ucuz olana
uyguluyor. Bu dosyadaki tutar önizlemesi de zaten `max + min/2` ile
aynı varsayımı kullanıyordu; yeni bir fiyat mantığı eklenmedi. Hangi
slotun dizide hangi öğeyi gösterdiği `data-sc-kaynak`'ta duruyor ve
boşaltma dizin yerine onu okuyor.

**Emekliye ayrılan ayarlar:** `slot1_alt`, `slot2_alt`,
`set_aciklama`. Yerlerine yeni id'ler geldi (`slot1_alt_bos`,
`slot2_alt_bos`, `slot2_alt_dolu`, `set_bant_ust`, `set_bant_alt`,
`set_hazir`, `slot2_rozet`) — eskilerinin şablonda kayıtlı değerleri
("Seç", "Yarı fiyatına") yeni varsayılanları ezeceği için id'ler
yeniden kullanılmadı.

Ölçülen kontrastlar, hepsi AA: `#a3a6ad`/`#15171c` **7,4:1**,
beyaz/`#15171c` **17,9:1**, `#8fcbb0`/`#15171c` **9,7:1**,
`#30614b`/`#f0f7f3` **6,6:1**, beyaz/`#30614b` **7,2:1**,
`#6b6f78`/beyaz **5,0:1**. Hiçbir tonu ayarlamak gerekmedi.

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

- `test5.mjs` — 141 test: kutunun ölçüleri, renkleri, iki karttaki
  hizası ve eşit yüksekliği (360/390/430px), ikonun ilk satırla hizası,
  metin iki satıra kırıldığında diğer kutunun da uzaması, üst satırın
  değişmediği.

- `test6.mjs` — 267 test: başlığın ölçüleri ve radyoyla hizası, metnin
  daire ile çakışmaması (`document.createRange()` ile gerçek metin
  kutusu), açılma satırının tipografisi/rengi/ikon hizası/kırılması,
  ayracın kenar boşlukları ve iki durumdaki rengi, alttaki iki satırın
  değişmediği, beş satırın iki kartta da aynı hizada olduğu, kartların
  ve kutuların eşit yüksekliği, rozetin ortalanması ve karta sığması,
  yatay taşma yok — 360/390/430px'te.

- `test7.mjs` — 478 test: kural bandının ölçüleri/renkleri/ikon
  hizası/taşmaması, ilerleme çubuğunun parçaları ve doluluğu,
  slotların boş ve dolu halleri (kenar, zemin, metin, ikon geçişi),
  %50 rozetinin konumu ve kesilmediği, üç sayaç durumu, uzun ürün
  adının üç noktayla kısalması, **gösterim sırasının ters seçimde de
  pahalıyı 1. slota koyması**, dolu slota basınca doğru ürünün
  çıkması, eşit fiyatta seçim sırasının korunması, sepete giden
  isteğin değişmediği — 360/390/430px'te.

**1109/1109 geçiyor.** Ölçülen kontrastların tamamı AA (en düşüğü 5.0:1).
