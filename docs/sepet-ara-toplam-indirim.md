# Sepet ara toplamında indirim öncesi tutar

## İstenen

Müşteri ürün sayfasında indirimli fiyatı görüyor, sepette ise yalnızca son
tutarı görüyordu. Kazandığı indirimin sepette de okunması istendi: üstü çizili
eski tutar + yeni tutar.

## Neden satırda değil, ara toplamda

Çark kuponu `K7QX4M9TR` bir **sipariş indirimi** (Admin API'den doğrulandı:
`combinesWith.orderDiscounts: false`, `productDiscounts: true`,
`appliesOnEachItem: false`). Shopify sipariş indirimini **satırlara
dağıtmıyor**; sepetin tamamından düşüyor. Sonuçları:

- `item.final_price` hiç değişmiyor.
- Bu yüzden temanın satırda hazır duran üstü çizili kodu hiç çalışmıyor
  (`sections/cart-drawer.liquid:209` ve `sections/main-cart.liquid` içindeki
  `item.original_price != item.final_price` koşulu).
- Shopify'ın kendi belgesi de bunu söylüyor: sepetin tamamına uygulanan
  indirim **ara toplam ile toplam arasında** gösterilir.
  (<https://shopify.dev/docs/storefronts/themes/pricing-payments/discounts>)

Satıra `-500` yazmak **tek üründe** tutardı ama **iki üründe tutmazdı**:
500 TL bir kez düşüyor, satır başına değil.

```
Astor  2.299 + White 3.399 = 5.698 − 500 = 5.198   ← ödeme ekranı
satır başına −500 yazsaydık: 1.799 + 2.899 = 4.698 ← 500 TL yanlış
```

Sepet, ödeme ekranından önceki son ekran; oradaki uyuşmazlık en pahalıya
patlayanı. Bu yüzden satıra dokunulmadı.

## Çözüm

`assets/tt-sepet-toplam.js` — `.totals__subtotal-value` (hem çekmece hem
`/cart` sayfası, tek kanca) içine üstü çizili tutarı ekliyor.

**Rakam üretilmiyor.** İki tutar da `/cart.js`'ten olduğu gibi alınıyor:

| Alan | Nerede görünüyor |
|---|---|
| `original_total_price` | üstü çizili (indirim öncesi) |
| `total_price` | temanın zaten bastığı tutar |

Toplama, çıkarma, oranlama yok. Otomatik indirimleri (İkinci Üründe %50) de
kapsıyor, çünkü ikisi de sepetin tamamına ait rakamlar.

### İki güvenlik kilidi

1. **Çizmeden önce doğrulama.** Temanın ekrana yazdığı metin ile
   `/cart.js`'ten gelen `total_price`'ın biçimlisi karşılaştırılıyor. Birebir
   tutmuyorsa (veri bayatlamış demektir) hiçbir şey çizilmiyor. Yani ekranda
   görünen üstü çizili tutar, ancak yanındaki tutarın doğruluğu kanıtlandığında
   çıkıyor.
2. **Para biçimi tahmin edilmiyor.** `layout/theme.liquid` Shopify'ın kendi
   çıktısını örnek olarak veriyor (`window.ttParaOrnek`); JS örneği çözüyor,
   sonra çözdüğü kuralı örneğin kendisine geri uygulayıp aynı diziyi üretip
   üretmediğine bakıyor. Üretmiyorsa blok hiçbir şey yapmıyor. Mağazanın para
   birimi değişirse örnek de kendiliğinden değişir.

### Neden tema Liquid'inde değil

Doğru yer `cart-drawer.liquid` ve `main-cart.liquid`'di, ama ikisi de tema
satıcısının dosyası (61 ve 63 KB) ve tema her güncellendiğinde üzerine
yazılıyor. `-0,00 TL` rozetinde olduğu gibi, düzeltme bizim dosyamızda duruyor.

Ödünü: `/cart` sayfasında üstü çizili tutar çok kısa bir an geç gelebilir
(script `defer`). Çekmecede o bile yok, çünkü çekmece açılana kadar zaten
gizli.

## Testler

`scratchpad/sepet/test-aratoplam.mjs` — 13 blok, 19 kontrol. Gerçek
`fetch('/cart.js')` yolu test edilsin diye küçük bir HTTP sunucusu kuruyor.

Kapsanan durumlar: kupon varken çizim; indirim yokken çizmeme; iki ekran
birden; **veri ile ekran uyuşmazsa çizmeme**; bölüm yeniden basılınca
güncelleme; kod kaldırılınca çizginin de kalkması; sonsuz döngü ve istek
yağmuru olmaması; virgül ondalıklı / kuruşsuz / boşluk ayraçlı para
biçimleri; örnek çözülemezse sessiz kalma; `-0,00 TL` bloğunun bozulmaması.

Eski derleme bu takımın **11 kontrolünde kalıyor** (geçtiği 7'si zaten
"hiçbir şey çizilmemeli" diyen olumsuz kontroller) — yani testler gerçekten
yeni davranışı ölçüyor.

## Satır satır üstü çizili fiyat isteniyorsa

Tek dürüst yolu indirimi mağazada **ürün indirimine** çevirmek. O zaman
Shopify 500 TL'yi satırlara kendisi dağıtır, `final_price` gerçekten düşer ve
temanın hazır kodu kendiliğinden çalışır — tema tarafında değişiklik gerekmez.

**Önce sınanması gereken risk:** "İkinci Üründe %50" de bir ürün indirimi
(BXGY) ve bugün `combinesWith.orderDiscounts: true` ile bizimkiyle üst üste
biniyor. Tür değişince bu birleşme bozulabilir; müşteri iki indirimden birini
kaybedebilir. Canlı koda dokunmadan önce test kodla ödeme ekranında
doğrulanmalı.
