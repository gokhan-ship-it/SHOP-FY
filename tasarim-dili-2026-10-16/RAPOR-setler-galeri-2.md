# Couple setlerin galerileri – 2. paket (6 set)

Tarih: 16.10.2026. Bu işte yalnızca ürün medyası değişti, değişiklik canlı sitede.

**Dokunulmayanlar:**
- Ürün adları, fiyatlar, varyantlar ve açıklamalar.
- Hiçbir temaya dosya yazılmadı ve hiçbir tema yayına alınmadı.
- "Vantablack + Vera" ve "Vantablack + Taşlı Kilit" setleri.

## Özet

- **6 set, 59 yeni görsel**, manifest sırasıyla; hepsi READY. Alt metinler manifest'in `alt_metin` sütunundan.
- **Dosya adları:** Hepsi zip'teki adla aynen kaydedildi; çakışma olmadığı için hiçbirine `_uuid` eklenmedi.
- **Yükleme sırası:**
  1. Görseller önce ürüne bağlanmadan yüklendi ve 59'unun da READY olduğu doğrulandı.
  2. Ürünlere bağlandı.
  3. Sıraya dizildi; sıra ve READY yeniden kontrol edildi.
  4. Ancak bundan sonra 23 eski görsel **yalnızca üründen ayrıldı**. Silinmedi; dosyalar Shopify Dosyalar'da duruyor.
- Galeriler hiçbir an boş kalmadı.
- Hiçbir görsel varyanta bağlı değil; 6 üründe de varyant–medya bağı yok.
- **Tema:** İlk paketteki kart filtresi işi zaten tamamdı. "Tasarim dili - 2026-10-16" hâlâ UNPUBLISHED ve o işin 9 dosyasının MD5'i temada aynı. Bu yüzden tema tarafında hiçbir şey yapılmadı.
- **Testler** (Tasarim dili önizlemesi, telefon 390×844): 28/30 OK. 2 "HATA" bir kod hatası değil; iki Kral seti Kampanyalı Couple Setler koleksiyonunda değil (aşağıda).

## Paketle ilgili notlar

- **README.md yok:** Zip'te README.md bulunmadı; içinde yalnızca `manifest.csv` ve 6 klasör var. İş bu yüzden manifest'e ve mesajındaki kurallara göre yapıldı.
- **urun_id yok:** Manifest'te `urun_id` sütunu da yok; sütunlar `urun, sira, dosya, alt_metin`. Ürünler mağazadaki **tam ürün adıyla** eşleştirildi. 6 ad da mağazada tek bir ürüne birebir denk geliyor:

| Manifest adı | Ürün ID | Handle |
|---|---|---|
| Luna + Aurora Couple Zaman Kapsülü | 9976621793600 | zaman-kapsulu-kolye-classic-white-925-ayar-gumus-couple-kopya |
| Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 | 9976685953344 | vantablack-tasli-kilit-couple-zaman-kapsulu-kisi-2639-kopya |
| Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 | 9976695882048 | kral-classic-ocean-blue-couple-zaman-kapsulu-kisi-2399-kopya |
| Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 | 9976703680832 | kral-infinity-charm-couple-zaman-kapsulu-kisi-2519-kopya |
| Lumin + Charm Couple Zaman Kapsülü | 10173333668160 | lumin-charm |
| White + Luna Couple Zaman Kapsülü | 15422634656064 | white-luna-couple-zaman-kapsulu |

- **Handle'lar ad ile uyuşmuyor:** Birçok set kopyalanarak açıldığı için handle eski adı taşıyor (ör. Kral + Ocean Blue'nun handle'ı "vantablack-tasli-kilit-…"). Eşleştirme handle'a değil ada göre yapıldı; handle'lara dokunulmadı.
- **Luna + Infinity Charm'da tek lifestyle var:** Pakette `05-lifestyle-2` görseli yok; 8 görsel geldi ve manifest de 8 satır. Bu yüzden kartında packshot ve lifestyle-1, yani 2 kare görünüyor.

## Yedek

`yedek_setler_2.csv` (zip içinde) dosyasında 6 ürün, 23 satır var. Sütunlar:

- ürün
- sıra
- medya ID
- dosya adı
- alt metin
- varyant bağı
- URL

23 URL'nin hepsi HTTP 200 döndü.

## Son durum (Shopify'dan okundu, hepsi READY)

### Luna + Aurora Couple Zaman Kapsülü (9976621793600)

| Sıra | Medya ID | Dosya adı | Alt metin | Durum |
|---|---|---|---|---|
| 1 | 46305801011520 | `luna-aurora-01-packshot.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – ürün fotoğrafı | READY |
| 2 | 46305801044288 | `luna-aurora-02-couple-dort-adim.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – Couple 4 adımda nasıl çalışır | READY |
| 3 | 46305801077056 | `luna-aurora-03-lifestyle-1.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – model üzerinde 1 | READY |
| 4 | 46305801109824 | `luna-aurora-04-sette-neler-var.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – sette neler var | READY |
| 5 | 46305801142592 | `luna-aurora-05-lifestyle-2.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – model üzerinde 2 | READY |
| 6 | 46305801175360 | `luna-aurora-06-couple-uygulama.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – Couple uygulama ekranları | READY |
| 7 | 46305801208128 | `luna-aurora-07-garanti.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – süresiz çip garantisi | READY |
| 8 | 46305801240896 | `luna-aurora-08-hediyeler-biter.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – hediye ömrü karşılaştırması | READY |
| 9 | 46305801273664 | `luna-aurora-09-kutu-teslimat.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – kutu ve teslimat | READY |
| 10 | 46305801306432 | `luna-aurora-10-lifestyle-3.jpg` | Luna + Aurora Couple Zaman Kapsülü – Couple set – model üzerinde 3 | READY |

**Ayrılan eski medya:** 41721385484608 (`aurora1_73b0a457-5632-496a-8526-0e0d19dd012a.jpg`)

### Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 (9976685953344)

| Sıra | Medya ID | Dosya adı | Alt metin | Durum |
|---|---|---|---|---|
| 1 | 46305801339200 | `kral-ocean-blue-01-packshot.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – ürün fotoğrafı | READY |
| 2 | 46305801371968 | `kral-ocean-blue-02-couple-dort-adim.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – Couple 4 adımda nasıl çalışır | READY |
| 3 | 46305801404736 | `kral-ocean-blue-03-lifestyle-1.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – model üzerinde 1 | READY |
| 4 | 46305801437504 | `kral-ocean-blue-04-sette-neler-var.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – sette neler var | READY |
| 5 | 46305801470272 | `kral-ocean-blue-05-lifestyle-2.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – model üzerinde 2 | READY |
| 6 | 46305801503040 | `kral-ocean-blue-06-couple-uygulama.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – Couple uygulama ekranları | READY |
| 7 | 46305801535808 | `kral-ocean-blue-07-garanti.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – süresiz çip garantisi | READY |
| 8 | 46305801568576 | `kral-ocean-blue-08-hediyeler-biter.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – hediye ömrü karşılaştırması | READY |
| 9 | 46305801601344 | `kral-ocean-blue-09-kutu-teslimat.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – kutu ve teslimat | READY |
| 10 | 46305801634112 | `kral-ocean-blue-10-lifestyle-3.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – model üzerinde 3 | READY |
| 11 | 46305804779840 | `kral-ocean-blue-11-lifestyle-4.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – model üzerinde 4 | READY |
| 12 | 46305804812608 | `kral-ocean-blue-12-lifestyle-5.jpg` | Kral + Classic Ocean Blue Couple Zaman Kapsülü Kişi/2399 – Couple set – model üzerinde 5 | READY |

**Ayrılan eski medya:** 42821133041984 (`hf_20260206_163638_ef2a4d15-1081-410b-aa5b-1692142fcb2e.jpg`)

### Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 (9976695882048)

| Sıra | Medya ID | Dosya adı | Alt metin | Durum |
|---|---|---|---|---|
| 1 | 46305804845376 | `kral-infinity-glow-01-packshot.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – ürün fotoğrafı | READY |
| 2 | 46305804878144 | `kral-infinity-glow-02-couple-dort-adim.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – Couple 4 adımda nasıl çalışır | READY |
| 3 | 46305804910912 | `kral-infinity-glow-03-lifestyle-1.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – model üzerinde 1 | READY |
| 4 | 46305804943680 | `kral-infinity-glow-04-sette-neler-var.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – sette neler var | READY |
| 5 | 46305804976448 | `kral-infinity-glow-05-lifestyle-2.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – model üzerinde 2 | READY |
| 6 | 46305805009216 | `kral-infinity-glow-06-couple-uygulama.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – Couple uygulama ekranları | READY |
| 7 | 46305805041984 | `kral-infinity-glow-07-garanti.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – süresiz çip garantisi | READY |
| 8 | 46305805074752 | `kral-infinity-glow-08-hediyeler-biter.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – hediye ömrü karşılaştırması | READY |
| 9 | 46305805107520 | `kral-infinity-glow-09-kutu-teslimat.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – kutu ve teslimat | READY |
| 10 | 46305805140288 | `kral-infinity-glow-10-lifestyle-3.jpg` | Kral + Infinity Charm Couple Zaman Kapsülü Kişi/2519 – Couple set – model üzerinde 3 | READY |

**Ayrılan eski medya:** 42821101322560 (`hf_20260206_162408_83f9dcfc-78f0-4682-9f50-62f1f75d99a8.png`), 42669291045184 (`KRAL1_69a2378a-e5ab-4455-a51c-1a6b423b612c.jpg`), 42669291077952 (`KRAL2_c6c38178-72fe-46b6-b94e-b6fa008a715a.jpg`), 42669291438400 (`fulltasli3_05390ba5-0a6b-4be0-b305-56e1543def48.jpg`), 42669291405632 (`fulltasli2_5e08d70f-89c9-44a0-aeb1-d20c48c8b55c.jpg`), 42669291372864 (`fulltasli_d61c7c2f-22be-41ac-bdcb-f351b783df29.jpg`)

### Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 (9976703680832)

| Sıra | Medya ID | Dosya adı | Alt metin | Durum |
|---|---|---|---|---|
| 1 | 46305805173056 | `luna-infinity-glow-01-packshot.jpg` | Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 – Couple set – ürün fotoğrafı | READY |
| 2 | 46305805205824 | `luna-infinity-glow-02-couple-dort-adim.jpg` | Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 – Couple set – Couple 4 adımda nasıl çalışır | READY |
| 3 | 46305805238592 | `luna-infinity-glow-03-lifestyle-1.jpg` | Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 – Couple set – model üzerinde 1 | READY |
| 4 | 46305805271360 | `luna-infinity-glow-04-sette-neler-var.jpg` | Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 – Couple set – sette neler var | READY |
| 5 | 46305805304128 | `luna-infinity-glow-06-couple-uygulama.jpg` | Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 – Couple set – Couple uygulama ekranları | READY |
| 6 | 46305805336896 | `luna-infinity-glow-07-garanti.jpg` | Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 – Couple set – süresiz çip garantisi | READY |
| 7 | 46305805369664 | `luna-infinity-glow-08-hediyeler-biter.jpg` | Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 – Couple set – hediye ömrü karşılaştırması | READY |
| 8 | 46305805402432 | `luna-infinity-glow-09-kutu-teslimat.jpg` | Luna + Infinity Charm Couple Zaman Kapsülü Kişi/2279 – Couple set – kutu ve teslimat | READY |

**Ayrılan eski medya:** 41721575866688 (`aurora1_7.jpg`), 42669288718656 (`Luna3.jpg`), 42669288784192 (`luna.jpg`), 42669288751424 (`luna2.jpg`), 42669290094912 (`fulltasli2.jpg`), 42669290127680 (`fulltasli3.jpg`), 42669290586432 (`fulltasli.jpg`)

### Lumin + Charm Couple Zaman Kapsülü (10173333668160)

| Sıra | Medya ID | Dosya adı | Alt metin | Durum |
|---|---|---|---|---|
| 1 | 46305807630656 | `lumin-eight-stars-01-packshot.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – ürün fotoğrafı | READY |
| 2 | 46305807663424 | `lumin-eight-stars-02-couple-dort-adim.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – Couple 4 adımda nasıl çalışır | READY |
| 3 | 46305807696192 | `lumin-eight-stars-03-lifestyle-1.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – model üzerinde 1 | READY |
| 4 | 46305807728960 | `lumin-eight-stars-04-sette-neler-var.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – sette neler var | READY |
| 5 | 46305807761728 | `lumin-eight-stars-05-lifestyle-2.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – model üzerinde 2 | READY |
| 6 | 46305807794496 | `lumin-eight-stars-06-couple-uygulama.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – Couple uygulama ekranları | READY |
| 7 | 46305807827264 | `lumin-eight-stars-07-garanti.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – süresiz çip garantisi | READY |
| 8 | 46305807860032 | `lumin-eight-stars-08-hediyeler-biter.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – hediye ömrü karşılaştırması | READY |
| 9 | 46305807892800 | `lumin-eight-stars-09-kutu-teslimat.jpg` | Lumin + Charm Couple Zaman Kapsülü – Couple set – kutu ve teslimat | READY |

**Ayrılan eski medya:** 43783906263360 (`hf_20260703_073436_23867af4-3782-4e28-8907-fdcec1aa3623.png`), 42669294453056 (`charm4.jpg`)

### White + Luna Couple Zaman Kapsülü (15422634656064)

| Sıra | Medya ID | Dosya adı | Alt metin | Durum |
|---|---|---|---|---|
| 1 | 46305807925568 | `white-luna-01-packshot.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – ürün fotoğrafı | READY |
| 2 | 46305807958336 | `white-luna-02-couple-dort-adim.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – Couple 4 adımda nasıl çalışır | READY |
| 3 | 46305807991104 | `white-luna-03-lifestyle-1.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – model üzerinde 1 | READY |
| 4 | 46305808023872 | `white-luna-04-sette-neler-var.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – sette neler var | READY |
| 5 | 46305808056640 | `white-luna-05-lifestyle-2.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – model üzerinde 2 | READY |
| 6 | 46305808089408 | `white-luna-06-couple-uygulama.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – Couple uygulama ekranları | READY |
| 7 | 46305808122176 | `white-luna-07-garanti.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – süresiz çip garantisi | READY |
| 8 | 46305808154944 | `white-luna-08-hediyeler-biter.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – hediye ömrü karşılaştırması | READY |
| 9 | 46305808187712 | `white-luna-09-kutu-teslimat.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – kutu ve teslimat | READY |
| 10 | 46305808220480 | `white-luna-10-lifestyle-3.jpg` | White + Luna Couple Zaman Kapsülü – Couple set – model üzerinde 3 | READY |

**Ayrılan eski medya:** 40983493771584 (`gumusbeyaz1.jpg`), 42307955163456 (`Photoroom_20251222_213110.png`), 43841981907264 (`nasil_calisir33.jpg`), 40983493738816 (`gumusbeyaz2.jpg`), 42669311230272 (`Luna3_2edc9c39-301f-4880-a166-5fbd4bf252b0.jpg`), 42669311164736 (`luna_f9f56774-7220-4189-b499-81f299685109.jpg`)

Ayrılan 23 dosyanın hepsi Dosyalar'da duruyor (ör. 41721385484608, 42821133041984, 43841981907264, 42669294453056 hâlâ READY).

Bazı eski görseller başka ürünlerde de kullanılıyor; örneğin `nasil_calisir33.jpg` ve `aurora1_*`. Bunlar yalnızca bu 6 setten ayrıldı; diğer ürünlerdeki bağları değişmedi.

## Sıkıştırma (400 KB üstü, benzerlik ≥ %98,5, adlar aynı)

59 dosyanın 22'si sıkıştırıldı. En küçük kalite, benzerlik %98,5'in üstünde kalacak şekilde seçildi.

| Dosya | Önce → Sonra | Kalite | Benzerlik |
|---|---|---|---|
| */06-couple-uygulama (6 set) | 548 → 384 KB | q84 | %99,75 |
| */09-kutu-teslimat (6 set) | 516 → 390 KB | q87 | %99,81 |
| luna-aurora / luna-infinity-glow 03-lifestyle-1, white-luna 05-lifestyle-2 | 562 → 390 KB | q60 | %98,97 |
| white-luna-03-lifestyle-1 | 490 → 399 KB | q67 | %99,28 |
| white-luna-10-lifestyle-3 | 802 → 566 KB | q62 | %98,50 |
| kral-ocean-blue / kral-infinity-glow 03-lifestyle-1 | 786 → 614 KB | q68 | %98,52 |
| kral-ocean-blue-12-lifestyle-5, kral-infinity-glow-10-lifestyle-3 | 752 → 578 KB | q67 | %98,53 |
| kral-ocean-blue-05-lifestyle-2 | 402 → 396 KB | q79 | %99,85 |

**İstisna:** 5 lifestyle görseli %98,5 sınırında 400 KB altına inmiyor: White + Luna L3, iki Kral setinin L1'i, Ocean Blue L5 ve Infinity L3. İlk paketteki gibi o sınırdaki en küçük hali kullanıldı (566–614 KB).

## Önizleme kontrolleri (Tasarim dili, telefon 390×844)

### Kampanyalı Couple Setler şeridi

Erkek koleksiyonu, Couple modu. Koleksiyon sayfalarındaki "Kampanyalı Couple Setler" başlıklı şerit, koleksiyonun ilk 6 setini gösteriyor (`setler_adet` = 6).

| Set | Şeritte | Kart görselleri (kaydırma sırası) |
|---|---|---|
| Luna + Aurora | var | packshot → lifestyle-1 → lifestyle-2 ✔ |
| Luna + Infinity Charm | var | packshot → lifestyle-1 ✔ (pakette lifestyle-2 yok) |
| Lumin + Charm | var | packshot → lifestyle-1 → lifestyle-2 ✔ |
| White + Luna | **yok** | Koleksiyonun 7. ürünü; şerit 6 set gösteriyor |
| Kral + Ocean Blue | **yok** | Kampanyalı Couple Setler koleksiyonunda değil |
| Kral + Infinity Charm | **yok** | Kampanyalı Couple Setler koleksiyonunda değil |

Hiçbir set kartında bilgi karesi (Couple 4 adım, sette neler var, garanti, uygulama, hediye ömrü, kutu) görünmüyor.

### Kampanyalı Couple Setler koleksiyon sayfası

`/collections/kampanyali-couple-setler`; varsayılan koleksiyon şablonu kullanılıyor ve kartta tek görsel var.

- Luna + Aurora, Luna + Infinity Charm, Lumin + Charm ve White + Luna kartlarının görseli yeni set packshot'ı ✔
- Koleksiyonda 7 ürün var. Kral + Ocean Blue ve Kral + Infinity Charm bu koleksiyonda değil; ikisi yalnızca "Couple Collection"da (testte orada da kartları bulunamadı).

### Ana sayfa "En çok tercih edilenler" (Çok satanlar), Couple çipi

Luna + Aurora, Lumin + Charm ve White + Luna kartlarının görseli yeni set packshot'ı ✔. Bu bölümün kartı tasarım gereği tek görsel; kaydırma yok.

Diğer 3 set bu bölümde yok; bölümün blok listesinde değiller. Bölümde şu 6 Couple kartı var:
- Astor + Chloe
- Noir + Chloe
- Luna + Aurora
- Nova + Chloe
- Lumin + Charm
- White + Luna

### Ürün sayfaları

6 setin galerisi de beklenen sırada ve beklenen sayıda: 10, 12, 10, 8, 9 ve 10 görsel ✔. 6 sayfanın hiçbirinde Liquid hatası yok.

### Senin kararın

İki Kral setinin kartlarını Kampanyalı Couple Setler'de ya da ana sayfada görmek istiyorsan iki yol var:
- Bu setler koleksiyona eklenebilir.
- Şeridin `setler_adet` ayarı 6'dan yükseltilebilir; bu, White + Luna için de gerekli.

Bunların hiçbirini yapmadım; ikisi de koleksiyon ya da tema ayarı değişikliği.

## Ekran görüntüleri (zip: `ekran/`)

- `01-kampanyali-couple-setler-serit.png`: Erkek koleksiyonu, Couple modu, şerit.
- `kart-01..03-set-*.png`: Şeritteki Luna + Aurora, Luna + Infinity Charm ve Lumin + Charm kartlarının kaydırma kareleri, yan yana.
- `02..04-kampanyali-couple-setler-koleksiyon-*.png`: Koleksiyon sayfası.
- `05-ana-sayfa-cok-satanlar-couple.png` ve `06..08-cok-satanlar-*.png`: Ana sayfa bölümü ve set kartları.
- `09..14-urun-*.png`: 6 set ürün sayfasının üst kısmı.
- `galeri-*.png`: 6 setin galerisi sırayla; her görselin medya ID'si ve durumu ile.
- Kart kırpımlarında sayfanın sabit yüzen düğmeleri yalnızca çekim anında gizlendi.

## Önizleme linkleri

- Erkek koleksiyonu (Couple moduna geçince şerit görünür): https://texttonext.com/collections/zaman-kapsulu-bileklik?preview_theme_id=189140861248
- Kampanyalı Couple Setler koleksiyonu: https://texttonext.com/collections/kampanyali-couple-setler?preview_theme_id=189140861248
- Ana sayfa: https://texttonext.com/?preview_theme_id=189140861248
- Ürün sayfaları: `https://texttonext.com/products/<handle>?preview_theme_id=189140861248` (handle'lar yukarıdaki eşleşme tablosunda)
