# Tekli ürün sayfası sağ sütun seçim katmanı — devir notu

Son güncelleme: 2026-09-05

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
| `karo_oran` | Kutunun en/boy oranı. 0.8 = 4:5 (uzun), 1 = kare, 1.14 = 8:7 (basık). | `0.8` |
| `karo_zoom` | Yakınlaştırma. 1 = kırpma yok. | `0.99` |
| `karo_kaydir` | Dikey kaydırma yüzdesi. Eksi = fotoğrafın altını göster. | `-30` |

Varsayılanlar, mağaza sahibinin 2026-09-05'te gerçek katalogda gözle bulduğu
değerler. Şablondaki render satırında ayrıca veriliyor; buradakiler o satır
silinse de aynı çerçeveleme kalsın diye.

### Boş bant tuzağı

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

Ölçülen, bant bırakmayan iyi kombinasyonlar:

| oran / zoom / kaydır | Not |
|---|---|
| `1.14 / 1.25 / -10` | Hem bileklik hem kolye düzgün. Karolar daha kompakt. |
| `1.14 / 1.45 / -15` | Daha iri ürün, biraz daha agresif kırpma. |
| `1.00 / 1.30 / -11` | Kare karo isteniyorsa. |

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
