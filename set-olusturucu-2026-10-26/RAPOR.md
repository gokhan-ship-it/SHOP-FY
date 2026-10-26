# Kendi setini oluştur: kutulara basınca ürün seçimine kayma (26.10.2026)

## Sorun
Kadın, Erkek ve Couple Ürünler sayfalarında Couple modunda "1. ürün" ve
"2. ürün %50" kutularına basan müşteri hiçbir şey görmüyordu. Kutular boşken
basınca bir şey yapmıyordu. Ürün seçilecek liste ise kutuların altında, ekranın
dışında kalıyordu.

## Ne değişti
Bu iş, çark hatırlatmasıyla aynı kopya temada yapıldı: "Cark hatirlatma - 2026-10-26"
(189466968384). Yayındaki temaya dokunulmadı, hiçbir tema yayına alınmadı.

| Dosya | Canlı MD5 | Kopya MD5 |
|---|---|---|
| assets/tt-secim-kartlari.js | fea3459e5f79337d1166491516a3b063 | 3f720dbf0b39f3682190586c7fb74802 |
| assets/tt-secim-kartlari.css | fde60b7b60806897e6af488f9a078259 | 70dfd715a2e3004194fb04f59c204454 |

- **Boş kutuya basınca** sayfa, ürün listesinin başına (filtre satırı) yumuşakça
  kayıyor. Liste, üstteki menünün ve varsa çark çubuğunun hemen altında duruyor.
  İlk sıradaki ürünler tamamen görünüyor.
- Kayma bitince ürünlerdeki **"+" düğmeleri iki kez hafifçe büyüyüp parlıyor**,
  böylece müşteri nereye basacağını görüyor.
- **Dolu kutuya basmak** eskisi gibi o ürünü setten çıkarıyor ve sayfayı kaydırmıyor.
- Telefonunda "hareketi azalt" ayarı açık olanlar için kayma anında oluyor ve
  parlama gösterilmiyor.
- **Ölçüm:** her kaymada `tt_couple_slot_kaydir` olayı gönderiliyor. `slot`
  değeri `0` (1. ürün) ya da `1` (2. ürün) oluyor. Olay, dosyadaki öbür set
  olaylarıyla aynı yoldan gidiyor: dataLayer ve Shopify müşteri olayları.
  GA4'te görmek için GTM'de bir etiket gerekiyor; bu iş kapsamında etiket eklenmedi.

## Test linkleri (kopya tema)
Sayfayı açınca Couple moduna geçin, "Kendi setini oluştur" bölümündeki kutulara basın.
- Kadın: https://texttonext.com/collections/zaman-kapsulu-kolyeler?preview_theme_id=189466968384
- Erkek: https://texttonext.com/collections/zaman-kapsulu-bileklik?preview_theme_id=189466968384
- Couple Ürünler: https://texttonext.com/collections/couple-urunler?preview_theme_id=189466968384
- Önizlemeden çıkmak için: https://texttonext.com/?preview_theme_id=

## Otomatik kontrol sonuçları
Betik: `betikler/slot-test.js`. Sonuçlar: `veri/slot.json`. Telefon 390 ve 360 px,
masaüstü 1440 px genişlikte, üç sayfanın hepsinde denendi.

| Genişlik | Kayma sonrası liste başı | Üstteki sabit alanın altı | İlk ürün satırı | "+" parlayan |
|---|---|---|---|---|
| 390 | 116 px | 104 px | 196–489 px (ekran 844) | Kadın 23, Erkek 12, Couple 23 |
| 360 | 116 px | 104 px | 196–471 px (ekran 740) | Kadın 23, Erkek 12, Couple 23 |
| 1440 | 120 px | 108 px | 224–635 px (ekran 900) | Kadın 23, Erkek 12, Couple 23 |

- Çark çubuğu açıkken de liste aynı yerde duruyor; çubuğun altında kalmıyor.
- "Hareketi azalt" açıkken kayma aynı yere varıyor, parlama yok.
- Dolu kutu ürünü çıkarıyor, sayfa yerinde kalıyor.
- Ölçüm olayı her iki kutu için de gönderildi.
- Konsol: yeni hata yok. Testte görülen "Failed to fetch" satırları, testin reklam
  ölçüm isteklerini bilerek engellemesinden geliyor. Aynı sayfa engelsiz
  açıldığında hem canlıda hem kopyada bu hata 0 çıkıyor
  (`betikler/hata-kaynak.js`, `veri/hata-kaynak.json`).

## Yayındaki tema
- Yayındaki temanın 710 dosyası, iş başındaki (11:37) listeyle karşılaştırıldı.
  Sonuç: fark 0. Temanın son güncellenme zamanı hâlâ 25.10 12:45
  (`veri/canli-md5-son.json`).
- Çarka, indirim tutarlarına, indirim kodu mantığına ve reklam takip kodlarına
  dokunulmadı.

## Açık konu: bölüm aşağıda kalıyor
Ölçüm `veri/konum.json` dosyasında. 390 px telefonda Couple modunda hazır setler
(12 adet) 947. pikselde başlıyor ve 482 px yer kaplıyor. "Kendi setini oluştur"
başlığı 1449. pikselde, ilk ürün ise 1789. pikselde. Ekran yüksekliği 844 px
olduğundan bölüm sayfanın yaklaşık 1,7 ekran altında kalıyor. Bu iş kapsamında
bu konuda değişiklik yapılmadı.
