# Tekli ürün sayfası sağ sütun seçim katmanı — devir notu

Son güncelleme: 2026-09-05 (kart tasarım revizyonu, 2. tur)

## Nerede duruyor

| Dosya | Ne yapıyor |
|---|---|
| `snippets/tt-tekli-secim.liquid` | Bütün işaretleme + veri adası. Parametreler burada. |
| `assets/tt-tekli-secim.js` | Segment, kartlar, ikinci ürün grid'i, fiyat/taksit/sepet. |
| `assets/tt-tekli-secim.css` | `.tt-ts-*` görsel dili. Sabit renk yok, sayfadan miras alıyor. |

Bölüm dosyasına dokunulmuyor. Katman `main-product` bölümüne bir **Özel Liquid**
bloğu olarak giriyor (draft temada blok kimliği `liquid_7iEzqH`).

Çalışma teması: **Urun sagsutun - 2026-09-04** (`188045295936`, yayında değil).
Yayındaki tema `Catal renk ayarlari - 2026-09-04` (`188044443968`) — bu dosyaların
hiçbiri orada yok, dolayısıyla render çağrısı orada hata verir.

## Karo çerçeveleme ayarları

Katalogdaki ürün fotoğraflarının tamamı **3:4** (1500×2000) ve ürünün kare
içindeki yeri fotoğraftan fotoğrafa değişiyor. Bu boşluk fotoğrafın içine gömülü;
CSS onu silemez, yalnızca pencereyi oynatabilir. Üç kol var:

| Parametre | Anlamı | Varsayılan |
|---|---|---|
| `karo_kaydir` | Fotoğrafın hangi dikey bölgesi görünecek. 0 = orta, eksi = alt, artı = üst. | `-30` |
| `karo_zoom` | Ek yakınlaştırma. 1 = kutuyu dolduran hali; altına inmek etkisiz. | `0.99` |

`karo_oran` **kaldırıldı**: şerit kartlarının görsel yüksekliği artık sabit
(104×76), oran diye bir serbestlik kalmadı.

Varsayılanlar, mağaza sahibinin 2026-09-05'te gerçek katalogda gözle bulduğu
değerler. Şablondaki render satırında ayrıca veriliyor; buradakiler o satır
silinse de aynı çerçeveleme kalsın diye.

### Boş bant tuzağı — ÇÖZÜLDÜ

Kaydırma önceden `transform: translateY` ile yapılıyordu: **öğeyi** oynatıyor,
görseli değil. Öğe kutunun dışına taşınca karşı kenarda boş bant kalıyordu
(`kaydır -30`'da karonun %30'u boştu). Artık `object-position` kullanılıyor:
görsel kendi kutusunun içinde kayıyor, kutu her zaman dolu. Bant oluşması
yapısal olarak imkânsız, dolayısıyla aşağıdaki formül de artık geçerli değil —
tarihsel kayıt olarak duruyor.

<details><summary>Eski formül (transform dönemi)</summary>

Kaydırma görseli kutunun dışına taşırıyor; taşan tarafın karşısında **boş bant**
kalıyor. Kutu yüksekliği 1 kabul edilirse:

```
boş bant = max(0, 0.5 − (zoom/2 − |zoom × kaydır/100|))
```

Formül altı ölçümle doğrulandı (Playwright, 150px kutu; sapma <%0.5).
`zoom 0.99 / kaydır -30` karonun **%30'unu boş bırakıyor**. Bandı kapatmak için:

```
zoom ≥ 1 / (1 − 2 × |kaydır| / 100)
```

`kaydır -30` için bu `zoom ≥ 2.5` demek — kaydıracın üst sınırının üstünde ve o
zoom'da ürün paramparça kırpılır. Yani **büyük kaydırma tek başına çözüm değil**;
kutuyu basıklaştırmak (`karo_oran` büyütmek) gerekiyor.

</details>

Ölçülen, bant bırakmayan iyi kombinasyonlar (transform dönemi):

| oran / zoom / kaydır | Not |
|---|---|
| `1.14 / 1.25 / -10` | Hem bileklik hem kolye düzgün. Karolar daha kompakt. |
| `1.14 / 1.45 / -15` | Daha iri ürün, biraz daha agresif kırpma. |
| `1.00 / 1.30 / -11` | Kare karo isteniyorsa. |

## Açıklama blokları

Her iki kartın açıklama bloğu **sürekli açık**; seçime bağlı açılıp kapanan tek
şey ikinci ürün seçicisi (`.tt-ts-ikinci`, görünürlüğü kartın `aria-checked`
değerine bağlı CSS ile). Amaç iki modun tek bakışta karşılaştırılabilmesi.

Ortak yapı, iki kartta da birebir aynı ve testle doğrulanıyor:
0.5px ayırıcı (üstü/altı 14px) → adımlar (aralarında 14px) → her adımda 34px
yuvarlak çip (içinde 18px ikon) + 12px boşluk + 13px başlık / 12px açıklama,
satır yüksekliği 1.45. İkili sette ek olarak: blok başlığı, sonsuzluk kutusu
(8px köşe, 10px 12px iç boşluk, üstünde 14px), takvim notu.

Sonsuzluk kutusunun zemini `--tt-ts-kutu`: metin renginin %7'si sayfa zeminine
karıştırılıyor. Açık temada karttan bir tık koyu, koyu temada bir tık açık
çıkıyor — yön iki temada da kendiliğinden doğru. Sabit gri kullanılsaydı koyu
temada karttan koyu görünürdü.

## İkinci ürün seçici: yatay şerit

3 sütunlu grid kaldırıldı. Kartlar 104px sabit genişlikte, 8px aralıkla yan
yana, yatay kaydırmalı; görsel alanı 104×76. Şerit kartın sağ iç boşluğunun
dışına taşıyor, böylece sonraki karo kartın kenarından kırpılarak görünüyor.

**Peek neden tek başına yetmiyor:** 104px sabit kart genişliğiyle "sonraki
karo görünsün" saf aritmetiğe bırakılamıyor — 390px'te üç karo (328px) mevcut
genişliğe (327px) tam oturuyor ve sonraki karodan 1px kalıyor. Bu yüzden
kaydırılacak içerik varken şeridin sağ kenarı soluyor (`.tt-ts-serit--devam`,
sınıfı JS kaydırma durumuna göre ekliyor). İşaret her genişlikte aynı.

Sıralama satırı şeridin altında. Alt sayfa (bottom sheet) 3 sütunlu grid
olarak kalıyor.

## TUZAK: katman `.rte` içinde render ediliyor

Custom Liquid bloğunun çıktısı temanın `.rte` sarmalayıcısının içine düşüyor.
`theme.css` orada şunları tanımlıyor:

```css
.rte :is(ul, ol) { padding-inline-start: var(--sp-7) }   /* (0,1,1) */
.rte li          { margin-block-start: var(--sp-2) }
```

Özgüllükleri `.tt-ts-adimlar` gibi tek sınıflık (0,1,0) sıfırlamaları **yeniyor**.
Somut sonucu: adım ikonları seçim yuvarlağından ~33px sağa kayıyor ve adımlar
arasına fazladan boşluk giriyordu — "ikonlar hizasız" ve "çok boşluklu" şikâyetlerinin
ikisi de bu tek sebepten.

**Çözüm:** adım listesi `ul/li` değil, `role="list"` / `role="listitem"` taşıyan
`div`'lerle yazılıyor. Bu kuralların tutunacağı bir eleman kalmıyor. Bu bölüme
yeni bir liste eklerken aynı kurala uyun.

**Test bunu yakalayamıyordu**: fixture katmanı `.rte` olmadan render ediyordu.
Artık `sayfa.py` hem `.rte` sarmalayıcısını hem temanın gerçek kurallarını
içeriyor; `ul`'a dönülürse test kırmızıya döner.

## Adımlar: zaman çizelgesi çipleri

Adımları saran gri kutu **kaldırıldı**. Her ikon 34px'lik yuvarlak bir çipin
içinde (`.tt-ts-adim-cip`, zemin `--tt-ts-kutu`), çipler aralarındaki dikey
hairline ile birbirine bağlanıyor — adımlar tek tek değil, bir akış olarak
okunuyor. Çizgi `.tt-ts-adim + .tt-ts-adim .tt-ts-adim-cip::before` ile
çiziliyor; yüksekliği `--tt-ts-adim-ara` (14px), yani adımlar arası boşlukla
**aynı değişkenden** geliyor. Boşluk değiştirilirse çizgi kendiliğinden uyuyor;
iki ayrı sayı tutulsaydı ilk düzenlemede kopardı.

Çipin sol kenarı seçim yuvarlağıyla aynı hizada (ölçüldü: ikisi de 31px).
Bunun kaçınılmaz sonucu: adım **metni** artık kart başlığıyla hizalı değil
(77px'e karşı 61px), çünkü çip yuvarlaktan geniş. Referans tasarımda da böyle.

Sonsuzluk satırı **kendi yüzeyinde** (`--tt-ts-kutu`). Adımlar artık gri kutuda
olmadığı için "iki gri kutu yan yana gelirse sınır kaybolur" sorunu kalmadı.

## Tarayıcı sınırı: 0.5px ve 1.5px kenarlıklar

Chrome `border-width` değerini tam piksele yuvarlıyor: kaynakta `0.5px` de
`1.5px` de ekranda **1px** olarak çiziliyor. Bunun somut sonucu vardı —
"seçili karo 1.5px kenarlık" kuralı seçili karoyu seçili olmayandan
ayırmıyordu. Çözüm kartlarda kullanılan yöntem: kenarlık hairline kalıyor,
seçim `box-shadow: inset 0 0 0 1px` ile ekleniyor (görsel kalınlık 2px, ölçü
değişmediği için seçim değişince içerik oynamıyor).

Aynı sebeple `.tt-ts-ayrac` gibi **yükseklik** kullanan hairline'lar 0.5px
çiziliyor; sınır yalnızca kenarlıklarda.

## Karo tikinin rengi temaya bağlı DEĞİL

Seçim tiki ürün fotoğrafının üzerinde duruyor, temanın zemininin değil. Tema
token'ı kullanılınca koyu temada daire açık renge dönüp beyaz zeminli ürün
fotoğrafının içinde kayboluyordu. Koyu daire + beyaz tik her iki temada ve her
fotoğraf zemininde okunuyor.

## Üstü kapatan sabit öğeler

Aşağı ok butonu, çark widget'ı ve sohbet baloncuğu kart metninin üstüne
biniyordu. Üçü de tema dışından geliyor ve CSS seçicileri bilinmiyor; bu yüzden
seçici tahmin edilmiyor: `ortuKoru()` sayfadaki `position: fixed` öğeleri tarayıp
dikdörtgenlerini kartınkiyle kesiştiriyor, kesişenleri kartlar ekranda olduğu
sürece `.tt-ts-ortu-gizli` ile gizliyor, kart ekrandan çıkınca geri veriyor.
Dışarıda bırakılanlar: kendi katman, ayar paneli, temanın yapışkan çubuğu,
ekranın %60'ından yüksek veya %95'inden geniş örtüler.

Nokta örnekleme (elementsFromPoint) denendi ve bırakıldı: 60px aralıklarla örnek
alınca 44px'lik ok butonu iki örneğin arasına düşüp kaçabiliyordu.

## Yapışkan çubuk

Temanın `sticky_buy_button` bloğu kullanılıyor, bloğa dokunulmuyor. JS yalnızca
`#StickyPrice-*` içeriğini set toplamıyla güncelliyor ve çubuğun butonunu
`sepeteEkle`'ye bağlıyor (native gönderim set modunda tek ürün eklerdi).
Görünürlük gözlemi temanın native butonu yerine **bizim** butonumuz üzerinden
kuruluyor, çünkü native buton katman kurulunca gizleniyor.

## Ayar paneli

Önizleme adresine **`?ttayar=1`** eklenince sağ altta üç kaydıraçlı bir panel
açılıyor: kutu oranı, yakınlaştırma, dikey kaydırma. Canlı uyguluyor, boş bant
oluşursa yüzdesini uyarı olarak yazıyor ve yapıştırılacak render satırını
üretiyor. Adreste parametre yoksa panel **hiç oluşturulmuyor** — müşteri göremez.

## Tema editörü tuzağı

Editörde bir blok düzenlenince Shopify bölümü Section Rendering API ile
**sayfayı yenilemeden** yeniden çiziyor. Kurulum bu yüzden eleman başına
korumalı (`KOK.__ttTsKurulu`) ve `shopify:section:load` olayında yeniden
taranıyor. Sayfa çapında tek bir bayrak kullanılırsa yeni DOM kurulumsuz kalıyor:
kart tıklanmıyor, grid boş, native seçici gizlenmiyor.

## Dokunulmayanlar

- `assets/taksit-tablosu.js` **değiştirilmedi**. Taksit tutarı `[data-tt-tk-veri]`
  özniteliği güncellenerek yönlendiriliyor; o dosya değeri her çağrıda yeniden
  okuduğu için hem satır hem modal doğru tutarı gösteriyor. PayTR bağlantısı,
  açılma/kapanma yapısı ve kart programı listesi olduğu gibi duruyor.
- `sections/main-product.liquid` **değiştirilmedi** (6 şablon paylaşıyor).

## Açık kalanlar

- **Sticky bar senkronu**: `sticky_buy_button` bloğu seçilen toplamı ve buton
  metnini yansıtmıyor.
- **Sepete eklemenin gerçek testi**: çift ürünlü `/cart/add.js` eklemesi ve BXGY
  indiriminin sepette görünmesi canlı sepette denenmedi.
- **Ürün bazlı çerçeveleme**: şu an tek global ayar var. Bileklikler ile kolyeler
  farklı değer isterse ürün bazlı istisna eklenebilir; veri zaten hangi karonun
  hangi ürün olduğunu biliyor.
- Canlıya alma **onaylanmadı**. Yayındaki temaya bu bağlantı üzerinden yazılamıyor
  (Shopify MAIN temaya yazmayı ve tema yayınlamayı engelliyor).
