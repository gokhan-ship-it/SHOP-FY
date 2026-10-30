# Sweatshirt Kombini — plan ve mağaza verisi onay listesi (2026-10-30)

İlk açılan kopya (`207697543454`) yalnızca ölçüm düzeltmesini taşıyor ve adı **Kişiselleştirme DEV - Meta ölçüm** oldu
(kullanıcı kararı, 30 Ekim). Kullanıcı onu yayınlayınca canlının yeni kopyası **Kişiselleştirme DEV - Sweatshirt kombini**
adıyla açılacak; kombin tema işi ve aşağıdaki mağaza verisi o kopya açıldıktan sonra yazılacak.

**Kararlar (30 Ekim):** 1–4. maddeler onaylı. Vitrin ürünü Online Mağaza'da yayında, hiçbir yerden bağlantısız, stok 0.
Test indiriminde tercih edilen koşul tutar (Kombin Koşulu'ndan en az 3.500 TL); adet (en az 3) ve 3.400 TL koşulları da
denenecek, üçünün sonucu yan yana raporlanacak. Editörün AddToCart'ı tasarım başına tek olay, tam tutar, yalnızca
tarayıcıdan kalacak. GTM'deki G-QN43QTEZW5 etiketine dokunulmayacak (kullanıcı halledecek).

## Mevcut ürünler (okundu, değiştirilmedi)

| Ürün | Ürün kimliği | Varyantlar (stok) |
|---|---|---|
| Bej Sweatshirt | 9723692548382 | 6-7, 8-9, 10-11 (300'er) |
| Mavi Sweatshirt | 9726702223646 | 6-7, 8-9, 10-11 (130'ar) |
| Yeşil Sweatshirt | 9726704156958 | 6-7, 8-9, 10-11 (130'ar) |
| İndigo Sweatshirt | 9870146830622 | 3-5 (150) |
| Pembe Sweatshirt | 9870236451102 | 3-5 (149) |
| Bej Tshirt | 9686009119006 | 6-7, 8-9, 10-11 (290'ar) |
| Sarı Tshirt | 9726700192030 | 6-7, 8-9, 10-11 (110'ar) |
| Mavi Tshirt | 9726700880158 | 6-7 (98), 8-9 (100), 10-11 (100) |
| Pudra Pembe Tshirt | 10085931221278 | 4-5 (25), 6-7 (40), 8-9 (45), 10-11 (7) |

Hepsinde kişiselleştirme zaten açık (tek "Ön alan", 22 cm daire). Sweatshirt 2.500 TL, tişört 2.000 TL. Hepsi Online
Mağaza, POS, Facebook ve Google kanallarında yayında.

İndirimler (okundu): 2'li / 3'lü / 4'lü patch indirimi (otomatik, ürün indirimi, 100 / 300 / 500 TL, 57 ürünlük liste;
54'ü 500 TL, Değişken Pullu Kalp, Tilki, Yılbaşı Şapka 330 TL), Ekstra %10 (otomatik, sipariş, 5.000 TL üstü),
FIRSTORDER (kod, sipariş, %10), DEARMOMS (kod, **ürün** indirimi, %10, Tüm Ürünler), Çanta Alana 1 Patch Hediye
(otomatik, X al Y kazan).

## Mağaza verisi onay listesi

Her madde onay gelmeden yazılmaz. 1–4 test içindir, canlıdaki müşteriyi etkilemez. 5 yayın günü ayrıca onaylanır.

1. **Vitrin ürünü oluştur:** "Sweatshirt Kombini · 2 Patch + Hediye Tişört".
   - Fiyat 3.400 TL, karşılaştırma fiyatı 5.400 TL.
   - Stok takibi açık, stok 0, stokta yokken satış kapalı. Shopify bu ürünü sepete almaz, ürün tek başına satın alınamaz.
   - Şablon `product.kombin-vitrin`: bu şablon yalnızca kopya temada olacak. Sayfa, satın alma düğmesi yerine editörü kombin modunda açar.
   - Yalnızca Online Mağaza'da yayında; Facebook, Google ve POS kanallarında yayınlanmaz.
   - `seo.hidden = 1`: site araması ve site haritasında görünmez.
   - Etiketler: `kombin-vitrin` ve `feed-haric`.
   - Hiçbir koleksiyona eklenmez.
   - Görsel: Bej Sweatshirt'ün ana görselinin kopyası. Yeni bir medya olarak eklenir, mevcut ürün görsellerine dokunulmaz.
2. **"Hediye Tişört" koleksiyonu:** elle, 4 tişört. Online Mağaza'da yayınlanmaz, sitede görünmez.
3. **"Kombin Koşulu" koleksiyonu:** elle; 5 sweatshirt ve 500 TL'lik 54 tekli patch (patch indirimi listesindeki ürünler). Yayınlanmaz. İndirimin "müşteri alır" koşulu bu koleksiyona bağlanır.
4. **Test indirimi:** yalnızca kodla çalışan X al Y kazan indirimi. Kodu yalnızca sen ve testler bilir; canlıda kod girilmedikçe kimseyi etkilemez.
   - Koşul: "Kombin Koşulu" koleksiyonundan.
   - Hediye: "Hediye Tişört" koleksiyonundan 1 adet, %100 indirim.
   - Birleşme: patch (ürün) indirimleriyle evet, sipariş indirimleriyle hayır, kargo indirimleriyle evet.
   - Önce adet koşuluyla (en az 3) kurulur ve sepetler denenir. Sonra aynı kodda tutar koşuluna (3.400 ve 3.500 TL) geçilip aynı sepetler tekrar denenir.
   - 3 gün sonra kendiliğinden biter.
   - Kopya temanın ayarına bu kod yazılır; editörün fiyat hesabı kodu kullanır ve önizlemede 3.400 TL görünür.
5. **Yayın günü (ayrı onay):** seçilen koşulla otomatik X al Y kazan indirimi oluşturulur, test kodu silinir, temanın test kodu ayarı boşaltılır.

## Yöntemler

- **Canlıda görünmemesi, önizlemede test.**
  - Ürün yayında olacak, ama canlı temada hiçbir yerden bağlantı verilmez: koleksiyonda, aramada, site haritasında ve reklam kanallarında yok.
  - Ana sayfa bölümü ve Kendin Tasarla'daki ilk kart yalnızca kopya temada çizilir; bu yüzden `preview_theme_id` ile test edilebilir.
  - Canlıda yalnızca adresi bilen kişi ürün sayfasını "Tükendi" olarak görür.
  - Bu da olmamalıysa ürün taslak bırakılabilir. Bu durumda önizlemede kombin modu bir sweatshirt sayfasından (`?kombin=1`) açılır ve vitrin sayfası yayın gününe kadar test edilemez.
- **keyifbebesi XML feed (extensionsell).** Bu uygulamanın ayarına erişimim yok. Yapman gerekenler:
  1. Shopify Admin → Uygulamalar → extensionsell (XML feed) uygulamasını aç.
  2. keyifbebesi feed'inin ürün filtresini aç (ürün hariç tutma / koşullar).
  3. Etiketi `feed-haric` olan ürünleri hariç tut. Uygulama etiket desteklemiyorsa ürün türü "Kampanya" ya da ürünün kendisini seç.
  4. Feed'i yeniden oluştur.
  5. XML'de "kombini" kelimesini ara; ürün çıkmamalı.

  Uygulama yalnızca koleksiyonla çalışıyorsa vitrin ürünü zaten hiçbir koleksiyonda olmadığı için listeye girmez.
- **Test, gerçek sepetlerle ve ödeme sayfasında yapılır** (sipariş verilmez). Denenecek sepetler:
  - (a) tek kombin: 1 sweatshirt + 2 patch + tişört = 3.400 TL
  - (b) 3 patch'li kombin: 3.700 TL
  - (c) aynı sepette iki kombin
  - (d) kombin varken FIRSTORDER kodu
  - Ek denemeler: DEARMOMS, yalnız sweatshirt + tişört, sweatshirt + 1 patch + tişört, 3 patch + tişört (sweatshirt yok), 2 sweatshirt + tişört.

  Otomatik indirimle kod birlikte girilince Shopify en iyi fiyatı seçebilir. Bu nedenle (d) yayın günü otomatik indirimle bir kez daha denenir.
- **DEARMOMS.** Ürün indirimi türünde ve ürün indirimleriyle birleşmeye açık. Kombin de ürün indirimleriyle birleşmek zorunda (patch indirimi için), bu yüzden DEARMOMS büyük ihtimalle kombinle birleşir. Testte doğrulanacak. Engellemenin tek yolu DEARMOMS'un kendi birleşme ayarını kapatmak; bu, kodun patch indirimleriyle birleşmesini de kapatır.

## Açık kalan durumlar (Shopify'ın X al Y kazan indirimi "1 sweatshirt + 2 patch" koşulunu birebir kuramaz)

- Adet koşulu (en az 3): sweatshirtsiz 3 patch + tişört, 2 sweatshirt + 1 patch + tişört ya da 3 sweatshirt + tişört de hediye kazanır. Her 3 üründe bir tişört verilir: 1 sweatshirt + 5 patch + 2 tişört alan 2 tişörtü hediye alır.
- Tutar koşulu: 2 sweatshirt + tişört (5.000 TL) ya da 7 patch + tişört (3.500 TL) de kazanır. Eşik patch indirimi düşülmeden mi sonra mı hesaplanıyor, testte görülecek (3.400 / 3.500).
- Tişörtü normal yoldan ekleyen müşteri de koşul sağlanırsa tişörtü 0 TL alır; gizli koleksiyon bunu engellemez.
- Temadaki sepet grubu kombin bozulunca uyarır ama Shopify'ın indirimini bilmez. Birebir kural için özel indirim uygulaması (Shopify Functions) gerekir.

## İndirim denemeleri (30 Ekim, Storefront API geçici sepetleri, sipariş yok)

S = sweatshirt 2.500 TL, P = 500 TL'lik tekli patch, T = tişört 2.000 TL. Tutarlar TL, sepetin indirimli toplamı.
"kod ✗" = Shopify kodu sepete almadı (uygulanmadı). Hedef: (a) 3.400, (b) 3.700, (c) 6.500.

| Sepet | Kodsuz | tutar ≥3.500 `KMB3500` | tutar ≥3.400 `KMB3400` | adet ≥3 `KMBADET3` | 1 sweatshirt `KMBSWEAT1` |
|---|---|---|---|---|---|
| (a) S+2P+T | 4.860 | 3.500 (T 0, 2'li indirim düşer) | 3.500 | 3.500 | **3.400** |
| (b) S+3P+T | 5.130 | 5.130 (kod ✗) | 5.130 (kod ✗) | 5.130 (kod ✗) | **3.700** |
| (c) 2S+4P+2T | 9.450 | 9.450 (kod ✗) | 9.450 (kod ✗) | 9.450 (kod ✗) | **6.500** |
| S+4P+T | 5.400 | kod ✗ | kod ✗ | kod ✗ | 4.000 |
| S+2P+2T | 6.660 | 5.500 (1 tişört bedava) | 5.500 | 5.500 | 5.400 |
| S+T | 4.500 | kod ✗ | kod ✗ | kod ✗ | 2.500 (sızıntı) |
| S+1P+T | 4.500 | kod ✗ | kod ✗ | kod ✗ | 3.000 (sızıntı) |
| 2S+T | 6.300 | 5.000 (sızıntı) | 5.000 (sızıntı) | kod ✗ | 5.000 |
| 3P+T | 3.200 | kod ✗ | kod ✗ | kod ✗ | kod ✗ |
| 7P+T | 4.500 | kod ✗ | kod ✗ | kod ✗ | kod ✗ |

FIRSTORDER ve DEARMOMS her kodla birlikte "uygulanmadı" (kombin fiyatı korunur).

Neden: Shopify'ın X al Y kazan indirimi "müşteri alır" satırlarına da (0 TL) pay yazıyor; o satır başka bir ürün indirimi
alamıyor (satır başına bir ürün indirimi). Koşul patch'leri kapsadıkça (tutar / adet) patch indirimi ya düşüyor ya da
Shopify patch indirimini tutup kodu reddediyor. `KMBSWEAT1`'de alıcı satırı yalnızca sweatshirt; patch'ler 2'li / 3'lü /
4'lü indirimi alabiliyor, hedef fiyatlar tutuyor.

**Tema ayarındaki test kodu bu yüzden `KMBSWEAT1-9TQ4M`** (Tema ayarları → Sweatshirt kombini → Sepete yazılacak indirim
kodu; değiştirilebilir). Bedeli: sweatshirt + tişört alan, patch'siz ya da tek patch'li sepet de tişörtü 0 TL alır
(yukarıdaki sızıntı satırları). Tema sepette kombin bozulunca uyarır ve tişörtü çıkarmayı önerir, ama sepete normal yoldan
sweatshirt ve tişört ekleyen müşteriyi engelleyemez. "1 sweatshirt + 2 patch" kuralını Shopify'da birebir kurmanın yolu
özel indirim uygulaması (Shopify Functions); yayın günü kararı.

## Tema (30 Ekim, yalnızca kombin kopyası 207699345694)

- Ayarlar: Tema ayarları → **Sweatshirt kombini** (açık/kapalı, başlangıç / bitiş, İndigo ve Pembe dahil, test kodu,
  ürün listeleri, 3.400 / 5.400, fiyata dahil patch, ana sayfa kutusunun metinleri ve görseli).
- Ana sayfa kutusu Çok satanlar bölümünün en üstünde çizilir: ana sayfa şablonu Shopify'ın 25 bölüm sınırında, ayrı bölüm
  eklenemiyor. Çok satanlar bölüm ayarı "Üstte Sweatshirt kombini kutusu" ile kapatılabilir.
- Vitrin sayfası `product.kombin-vitrin`: satın alma düğmesi yok, kombin kartı editörü kombin modunda açar.
- Kendin Tasarla: ilk sayfanın ilk kartı vitrin (temanın kartı, "Tişört hediye" etiketi, ince çerçeve).
- Editör kombin modu: Sweatshirt adımı (renk + yaş), sayaç, 2 patch kapısı, 3. patch'ten fark, renk değişiminde patch'ler
  yerinde, yalnızca tekli patch, patch indirimi kutlamaları kapalı, Özet'te zorunlu hediye tişört, sepete tek istek
  (`_kombin`), test kodunun sepete yazılması (sepetteki kodlar korunur), kombin başına tek AddToCart (değer = ödenen,
  tişört 0 TL).
- Sepet: kombin grubu (tişört son satır, rozet "Sweatshirt kombini"), adetler kilitli; patch silinince kombin bozulacaksa
  tişört de çıkar (onayla); bozuk kombinde uyarı ve "Tişörtü çıkar".
- Sepetteki kombin düzenlenmez (renk, tişört ve indirim birlikte değişiyor): kart "Sepetten sil" ve yeniden tasarla der.
