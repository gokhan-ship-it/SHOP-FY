# Piramit Alfabe: varyant adı ile görseldeki renk uyuşmazlıkları

Renk kodları onaylı görsellerden ölçüldü (`plan.json`, `renk_hex`). Editördeki renk noktaları bu ölçülen rengi gösterir. Sepet, tasarım özeti ve sipariş varyant adını kullanır. **Hiçbir varyant adı değiştirilmedi.**

## Açık uyuşmazlık

| Harf | Varyant adı | Görseldeki renk | Not |
|---|---|---|---|
| O | Mavi | ~~Gri-mavi #5F7286~~ → Mavi #80C1E9 | **2026-11-16 çözüldü.** Editör görseli yanlışlıkla Janti Rakam 0 varyantında duran koyu gri O fotoğrafından üretilmişti. Mağazadaki varyant fotoğrafı (açık mavi O) doğru; editör görseli, kontur, genişlik (4,32 cm) ve renk ona göre güncellendi |

## Aynı ad altında iki farklı ton

| Varyant adı | Ton 1 | Ton 2 |
|---|---|---|
| Mavi | **Buz mavisi** (soluk): A #ABCDD1, N #AAD1D4, Q #B5DBDF, Y #AED5D8 | **Gök mavisi**: D #7BC4F0, H #73C1F1, S #7AC5F2 |
| Yeşil | **Petrol / koyu camgöbeği**: E #268180, I #288484 | **Çimen yeşili**: V #628A4E (Haki L #64894D ile aynı renk) |
| Pembe | **Mercan / somon pembe**: A #FD5F76, I #FC6878, Y #F9587D | **Fuşya**: L #FD5E98, V #FF62A6 |

## Adı renge tam oturmayan

| Varyant adı | Harfler | Görseldeki renk |
|---|---|---|
| Turkuaz | E #8EDDC1, P #90DEC3 | Mint yeşili (turkuazdan çok açık yeşile yakın) |
| Haki | L #64894D | Çimen yeşili (Yeşil V ile aynı) |

## Uyumlu olanlar

Antrasit (B, F, P, T, W, Z: koyu gri-mavi), Beyaz (C, K), Kırmızı (M, R, U), Saks (M, R), Sarı (G, J, X), Turuncu (A, E, I, N).

## Pratik etkisi

- Aynı isimde iki "Mavi" harf yan yana gelirse (örn. Mavi A + Mavi D) müşteri editörde iki farklı mavi görür; sepette ikisi de "Mavi" yazar.
- Editör yan yana harfleri **gerçek renge** göre ayırır (2026-10-08): Yeşil V ile Haki L, Mavi O ile Antrasit yan yana konmaz (iki harf de tek renkliyse kaçınılamaz, örn. BOB). Buna karşılık buz mavisi A ile gök mavisi D yan yana gelebilir; sepette ikisi de "Mavi" yazar.
