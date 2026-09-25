# Sepette "-0,00 TL" indirim rozeti

## Belirti

Couple setini sepete ekleyip çarkın kodunu da uygulayınca sepet çekmecesinde
şöyle görünüyordu:

```
Infinity Glow   2.299,00 → 1.149,50    [İkinci Üründe %50 İndirim] [-1.149,50 TL]
Aurora          2.699,00               [İkinci Üründe %50 İndirim] [-0,00 TL]   ← bu
```

İkinci satırdaki kırmızı rozet sıfır tutarlı bir indirim vaadi gibi okunuyordu.

## Sebep

"İkinci Üründe %50 İndirim" bir **BXGY** (1 al, 1'ini yarım fiyata al). Shopify
indirimi ucuz satıra yazıyor ama **alınan** satıra da bir tahsis bırakıyor —
tutarı `0`. Tema sepeti, satırın tahsislerini süzmeden hepsini basıyor:

`sections/cart-drawer.liquid:247-256` ve `sections/main-cart.liquid:209-218`

```liquid
{%- for discount_allocation in item.line_level_discount_allocations -%}
  <li class="discounts__discount ...">
    <span class="badge badge--highlight ...">{{ discount_allocation.discount_application.title }}</span>
    <span class="badge badge--onsale ...">-{{ discount_allocation.amount | money }}</span>
  </li>
{%- endfor -%}
```

**Rakamlar doğruydu.** Ara toplam da doğruydu (4.998,00 − 1.149,50 − 500,00 =
3.348,50 TL, yapışkan çubuğun söylediğiyle birebir aynı). Sorun yalnızca boş
rozetti.

## Çözüm ve neden orada

Düzeltme `assets/custom-tt.js` dosyasının **sonundaki ikinci IIFE'de**:
tutarı sıfır olan `.discounts__discount` satırı DOM'dan kaldırılıyor, satır
gidince boş kalan `ul.discounts` de kaldırılıyor.

Doğru yer aslında yukarıdaki iki Liquid dosyası — tek satırlık bir koşul
yeterdi. Orada yapılmadı çünkü:

- İkisi de **tema satıcısının** dosyası (61 KB ve 63 KB). Impact her
  güncellendiğinde üzerine yazılır, düzeltme her seferinde elle yeniden
  uygulanmak zorunda kalırdı.
- `custom-tt.js` bizim dosyamız, `layout/theme.liquid:67`'den **her sayfada**
  yükleniyor. Tek yerden hem çekmeceyi hem `/cart` sayfasını kapsıyor.

**Ödünü:** `/cart` sayfasında rozet çok kısa bir an görünüp kaybedebilir
(script `defer`). Çekmecede o bile yok — çekmece açılana kadar `hidden`.

## Dikkat edilenler

- **Para birimine bağlı değil.** Sıfır kontrolü yalnızca rakamlara bakıyor:
  `-0,00 TL` → `000` → sıfır; `-1.149,50 TL` → `114950` → değil. Mağaza para
  birimini ya da ayıraçlarını değiştirse de çalışır.
- **Aynı satırda birden çok tahsis** varsa yalnızca sıfır olan kalkar.
- **Tanımadığı biçime dokunmaz.** Tutar rozeti (`.badge--onsale`) yoksa satır
  olduğu gibi kalır.
- **Sonsuz döngü yok.** Kendi silmelerimiz gözlemciyi bir kez daha tetikler,
  ikinci geçiş bir şey bulamayıp durur; test bunu ölçüyor.
- **Rakamlara dokunmuyor.** Fiyatlar, ara toplam ve ödeme sayfası aynı.

## Test

`scratchpad/sepet/` — temanın markup'ını birebir kullanan fikstür
(aynı sınıflar) + `test.mjs`, **18 kontrol**:

1. Sıfır satır kalkıyor, gerçek indirim duruyor, boş kalan liste de kalkıyor
2. Fiyatlar aynen duruyor
3. Sepet yeniden basılınca (Section Rendering API taklidi) yine süzülüyor
4. Durulmuş sayfada yeni mutasyon yok (döngü yok)
5. ABD para biçiminde de çalışıyor
6. Tutar rozeti olmayan satır silinmiyor

Eski sürüm bu kontrollerin 7'sinde düşüyor.
