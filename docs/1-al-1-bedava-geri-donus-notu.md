# "1 Al 1 Bedava"ya dönmek istersek

2026-09-23'te "1 Al 1 Bedava" kampanyası için bir uygulama yazıldı, sonra
karar değişti ve **hiç commit edilmeden** geri alındı. Mevcut kod
`26cc162` (mevcut "İkinci Üründe %50 İndirim" kurgusu) ile birebir aynı.
Bu not, aynı işi yeniden yapmak gerekirse nereye ne gireceğini
hatırlatmak için duruyor — kod parçası değil, yol haritası.

## Önce mağaza tarafı (tema değil)

Kampanyayı **tema uygulamıyor**, Shopify'daki otomatik indirim uyguluyor.
Tema yalnızca hangi ürünün bedava *görüneceğini* söylüyor. O yüzden sıra
şu: önce indirim kurulur, sonra tema anahtarı açılır.

Yeni otomatik BXGY indirimi:

| Alan | Değer |
|---|---|
| Tür | Otomatik → "X al, Y kazan" |
| Müşteri alır | 1 adet |
| Müşteri kazanır | 1 adet, etkisi **%100 ücretsiz** |
| Sipariş başına kullanım limiti | **YOK** (4 üründe 2'si bedava olsun diye) |
| Bitiş tarihi | yok |
| Kapsam | aşağıya bakın |

Eski `İkinci Üründe %50 İndirim` aynı anda **duraklatılmalı**; ikisi
birden açık kalırsa hangisinin uygulandığı öngörülemez.

### Kapsamda dikkat edilecek tek şey

Kampanya yalnızca **316L çelik** varyantlarda geçerli olacaksa, indirim
**koleksiyona göre kurulamaz**: Shopify koleksiyon kapsamını ÜRÜN
düzeyinde uygular, yani aynı ürünün 925 ayar gümüş varyantına da indirim
düşer ve ekranla sepet çelişir. Gümüş varyantı da olan beş ürün var:
Aurora, Lumin, Vantablack, Infinity Glow, Eight Stars White.

Çözüm: indirimi **varyant bazında** kurmak (BXGY varyant hedeflemeyi
destekliyor), koleksiyonu yalnızca temanın okuduğu liste olarak
kullanmak. `1-al-1-bedava-celik` koleksiyonu mağazada duruyor
(2026-09-23 itibarıyla 10 tekli çelik ürün: Astor, Auron, Chloe,
Chloe Gold, Luna, Noir, Nora, Nova, Santorin, Santorin Gold).

## Sonra tema tarafı

Dört dosya değişiyor. Hiçbiri tasarımı bozmuyor; hepsi mevcut yapının
üstüne bayrak ekliyor.

### `sections/tt-secim-kartlari.liquid`
- Kampanya koleksiyonunun ürün id'lerini `kadin_ids` / `erkek_ids` ile
  aynı yöntemle bir dizeye topla (`kamp_ids`), her karoya `kamp: '1'|'0'`
  geçir.
- Köke üç nitelik: `data-sc-kampanya-aktif`, `data-sc-celik`,
  `data-sc-gumus`.
- Set kutusuna iki yeni öğe: slotların altında bir not, altında
  `[data-sc-kamp-uyari]` (kampanya dışı seçim uyarısı, başlangıçta
  `hidden`).
- Yeni ayarlar (hepsi yeni id, mevcutlara dokunma):
  `kampanya_aktif` (checkbox, **varsayılan false**), `kampanya_koleksiyon`
  (collection) + `kampanya_handle` (text yedeği — collection tipi ayarda
  varsayılan değer tanımlanamıyor), `celik_anahtar` ("316L"),
  `gumus_anahtar` ("925"), `kampanya_etiket`, `kampanya_disi_not`,
  `kampanya_disi_uyari`, `slot_not`, `slot2_alt_kapsam_disi`,
  `cubuk_etiket_ikinci`, `cubuk_bedava_tutar`.
- Metin değişenler **id'leri aynı kalarak** varsayılanları güncellenir:
  `couple_rozet`, `slot2_rozet`, `slot2_alt_bos`, `slot2_alt_dolu`,
  `cubuk_etiket_indirim`, `durum_0`, `varsayilan_mod`.
  **Uyarı:** bunların çoğu koleksiyon şablonunun JSON'una kayıtlı; schema
  varsayılanını değiştirmek ekranda bir şey değiştirmez, değerleri tema
  editöründen (ya da `templates/collection.*.json` içinden) güncellemek
  gerekir.

### `snippets/tt-sc-karo.liquid`
- `data-sc-kamp="{{ kamp }}"` niteliği.
- Varyant JSON'una `"celik"` alanı: varyant adı çelik anahtar kelimesiyle
  **başlıyorsa** true (`v.title | slice: 0, celik_anahtar.size`).
  Katalogda iki yazım var, ikisi de aynı önekle başlıyor:
  "316L Cerrahi Çelik" ve "316L Çelik".

### `assets/tt-secim-kartlari.js`
- `KAMPANYA_AKTIF`, `GUMUS` kökten okunur.
- `karoKampanyali(karo)` + `ogeUygun(e)` (koleksiyon VE çelik VE anahtar
  açık) + `setUygun()` (iki ürün de uygun mu).
- `setEkle` seçilen öğeye `kampanya` ve `celik` bayraklarını yazar —
  bayraklar **seçim anında** donar, çünkü aynı ürünün çelik ve gümüş
  varyantı farklı sonuç verir.
- `cubukCiz(n, sira, uygun)`: uygun çiftte toplam = pahalı olanın fiyatı,
  bedava satır `₺0` + üstü çizili liste fiyatı, tasarruf = ucuz olanın
  TAM fiyatı. Uygun değilse iki satır da tam fiyat, toplam ikisinin
  toplamı, hediye etiketi ve tasarruf rozeti yok.
- Varyant seçicide satır başına yeşil "1 al 1 bedava" etiketi / gri
  "Kampanyaya dahil değil" notu.
- Aynı üründen iki adet: `setEkle`'deki "zaten seçiliyse çıkar" koşulu
  `idx >= 0 && set.length >= 2` olur; sette yer varken ikinci adet
  eklenir, sepete tek satır `quantity: 2` gider.

### `assets/tt-secim-kartlari.css`
- `[data-sc-kamp-disi]` ile 2. slotun yeşil görünümünü nötrleştirme.
- `.tt-sc-slot-not`, `.tt-sc-kamp-uyari` (amber bilgi kutusu,
  `#7a4e00` / `#fff8e6` = 6.8:1).
- Çubuk butonu varsayılan **koyu**, `.tt-sc-cubuk[data-sc-kampanya]`
  altında yeşil.
- Varyant seçicide `.tt-sc-varyant-sag` sütunu + etiket/not stilleri.

## Anahtar kapalıyken ne görünmeli

Kampanya anahtarı kapalıyken bölüm **sade bir iki ürün seçicisine**
dönmeli: hediye etiketi, tasarruf rozeti ve **toplam tutar çıkmamalı**.
Sebep önemli — kapalıyken yürürlükte başka bir indirim olabilir (nitekim
%50 kampanyası hâlâ açıktı) ve tam fiyat toplamı yazmak ekranla sepeti
ayırırdı.

## Test tarafı

`scratchpad/sc/` düzeneğinde şunlar gerekiyordu: `fikstur.py` içine
kampanya koleksiyonu kümesi + `celik` bayrağı + `kampanya_aktif`
parametresi, kampanya kapalı ve "koleksiyon bugünkü hâliyle" için iki ek
fikstür, ve kampanyaya özel bir test paketi (uygun çift, kapsam dışı
çift, aynı üründen iki adet, varyant seçici etiketleri, anahtar kapalı
hâli, 360/390/430px). Mevcut paketlerden 2, 6, 7, 9 ve 10 numaralı
dosyalarda %50'ye bağlı iddialar güncellenmişti.

## Ölçülmüş gerçekler (geri dönülürse yeniden ölçmeye gerek yok)

- Shopify BXGY indirimi her zaman **en ucuz** uygun kaleme uygular.
  10 gerçek iki kalemli siparişte 10/10 doğrulandı.
- Mevcut %50 indirimi **iki normal (tekli) listelemede de çalışıyor**;
  "... Couple" listelemesi şart değil. Sipariş #13566, #13562 ve #13557
  bunun kanıtı: iki normal ürün, ucuz olanına %50 inmiş.
- Wheelio çarkından gelen ₺500'lük kod sipariş düzeyinde iniyor:
  kalemlerin indirimli birim fiyatını değiştirmiyor, yalnızca ara toplamı
  düşürüyor.
