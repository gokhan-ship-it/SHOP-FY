# JantiFox Club · Remotion çıktı raporu

Oluşturma: 2026-10-30 11:03 UTC · `npm run check` ile yeniden üretilir.

## Remotion Studio

Depo kökünden tek komut:

```bash
cd jfclub-remotion && npm install && npx remotion studio
```

Yeniden render: `npm run render` · Kontroller + bu rapor: `npm run check` · Önizleme: `out/onizleme.html`

## 1. Dosyalar

1 KB = 1000 bayt alındı (hedefler için katı yorum).

| Dosya | Boyut | Hedef | Kare | Codec / piksel | Renk etiketi | Ses izi | Faststart |
|---|---|---|---|---|---|---|---|
| `jfclub-1-bekleme.mp4` | 213.3 KB (213307 B) | ≤ 250 KB ✓ | 72 @ 30/1 | h264 High / yuv420p | bt709 / bt709 / bt709 (tv) | yok ✓ | evet ✓ (ftyp → moov → free → mdat) |
| `jfclub-2-acilis.mp4` | 367.7 KB (367704 B) | ≤ 400 KB ✓ | 60 @ 30/1 | h264 High / yuv420p | bt709 / bt709 / bt709 (tv) | yok ✓ | evet ✓ (ftyp → moov → free → mdat) |
| `jfclub-3-acik.mp4` | 255.2 KB (255197 B) | ≤ 300 KB ✓ | 90 @ 30/1 | h264 High / yuv420p | bt709 / bt709 / bt709 (tv) | yok ✓ | evet ✓ (ftyp → moov → free → mdat) |
| `jfclub-kapali.png` | 225.1 KB | – | 720 × 720 | PNG | – | – | – |
| `jfclub-acik.png` | 340.3 KB | – | 720 × 720 | PNG | – | – | – |

`jfclub-kapali.png` = Klip1 kare 0, `jfclub-acik.png` = Klip3 kare 0.

Çözülen kare sayıları: Klip1Bekleme 72/72 ✓ · Klip2Acilis 60/60 ✓ · Klip3Acik 90/90 ✓

## 2. Geçiş kontrolü

Kanal başına piksel farkı (0–255). **Kaynak** = Remotion'un kayıpsız PNG karesi. **MP4** = videodan BT.709 / sınırlı aralıkla (tarayıcının yaptığı gibi) çözülen kare.

| Geçiş | Kaynak (kayıpsız) | MP4 (çözülmüş) |
|---|---|---|
| Klip1 kare 71 → kare 0 (döngü) | maks 0 · ort 0.00 · >±2: %0.00 · PSNR ∞ dB | maks 26 · ort 0.00 · >±2: %0.03 · PSNR 66.44 dB |
| Klip1 kare 0 = Klip2 kare 0 | maks 0 · ort 0.00 · >±2: %0.00 · PSNR ∞ dB | maks 53 · ort 0.44 · >±2: %9.98 · PSNR 45.81 dB |
| Klip2 kare 59 = Klip3 kare 0 | maks 0 · ort 0.00 · >±2: %0.00 · PSNR ∞ dB | maks 51 · ort 0.58 · >±2: %13.47 · PSNR 45.05 dB |
| Klip3 kare 89 → kare 0 (döngü) | maks 75 · ort 0.28 · >±2: %3.98 · PSNR 40.25 dB | maks 71 · ort 0.65 · >±2: %11.95 · PSNR 39.85 dB |

- **Klip1 döngüsü (71 → 0):** kare 53–71 ve 0–33 aynı dinlenme pozu; kaynakta fark 0. MP4'teki fark (PSNR 66.44 dB) yalnızca kodlayıcının durağan karelerdeki ince düzeltmesidir.
- **Klip1 0 = Klip2 0** ve **Klip2 59 = Klip3 0:** kaynak kareler birebir aynı (fark 0 ve 0): üç klip aynı sahne bileşenini aynı durumla çiziyor; ışın açısı (44,25°), parlama (%75) ve tilki konumu dahil.
- MP4'te iki ayrı H.264 kodlaması karşılaştırıldığı için sıkıştırma gürültüsü kalır (PSNR 45.81 / 45.05 dB). Ölçek vermek için: aynı kareler kendi kayıpsız kaynaklarına göre 39.93 / 39.11 dB ve 38.06 / 38.33 dB (yuv420p renk alt örneklemesi + H.264). Yani geçişteki fark, her videonun kaynağa göre zaten taşıdığı farktan küçük; geçişte görünür atlama oluşmaz. MP4'te bit bit eşitlik için sabit QP (CRF değil) gerekirdi; BRIEF CRF istediği için CRF kullanıldı.
- **Klip3 döngüsü (89 → 0):** bu iki kare aynı olmamalı; ardışık iki kare gibi olmalı (ışınlar 0,75° döner, tilki salınımın dibindedir). Komşu 88 → 89 farkı: kaynak maks 75 · ort 0.33 · >±2: %4.86 · PSNR 39.97 dB; MP4 maks 62 · ort 0.44 · >±2: %7.38 · PSNR 41.12 dB. Kaynakta 89 → 0 farkı (ort 0.28) sıradan bir ardışık kare farkıyla (ort 0.33) aynı düzeyde, yani döngü noktasında hareket atlaması yok. MP4'te biraz daha yüksek çıkması, kare 0'ın anahtar kare (I) olarak ayrı kodlanmasından gelen sıkıştırma gürültüsüdür. Işınlar 90 karede 67,5° (= 3 × 22,5° periyot) döner, salınım (1 − cos) / 2 eğrisiyle kare 90'da başa döner.

## 3. Renk kontrolü (hedef #FBEAD6 = 251, 234, 214 · tolerans kanal başına ±2)

Her MP4'ten ortadaki kare çıkarıldı, dört köşe pikseli ölçüldü:

| MP4 | Kare | Sol üst | Sağ üst | Sol alt | Sağ alt | En büyük fark | Sonuç |
|---|---|---|---|---|---|---|---|
| `jfclub-1-bekleme.mp4` | 36 | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 1 | geçti ✓ |
| `jfclub-2-acilis.mp4` | 30 | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 1 | geçti ✓ |
| `jfclub-3-acik.mp4` | 45 | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 251, 234, 215 (Δ 0/0/+1) | 1 | geçti ✓ |

`jfclub-kapali.png` köşeleri: en büyük fark 0 ✓ · `jfclub-acik.png` köşeleri: en büyük fark 0 ✓

Ek: tüm karelerde dört köşe — Klip1Bekleme: en büyük fark 1 · Klip2Acilis: en büyük fark 234 (±2'yi aşan kareler 17–19: kapak sol üst köşeden kadraj dışına uçuyor) · Klip3Acik: en büyük fark 1

Düzeltme gerekmedi.

## 4. Kenar bandı (dış 24 px, tüm kareler, MP4)

Işın, parlama ve konfeti kenardan 32 px içeride tamamen söner.

| Klip | En büyük sapma | ±2'yi aşan kareler |
|---|---|---|
| Klip1Bekleme | 1 | yok |
| Klip2Acilis | 234 | 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 (kapak uçuşu) |
| Klip3Acik | 1 | yok |

## 5. Güvenli alan (40 px)

Kutu, kapak, fiyonk ve tilkinin kapladığı alan (tüm kareler, MP4):

| Klip | Kareler | x | y | Sonuç |
|---|---|---|---|---|
| Klip1Bekleme | 0–71 | 82–624 | 91–656 | 40–679 içinde ✓ |
| Klip2Acilis | 21–59 | 100–618 | 42–656 | 40–679 içinde ✓ |
| Klip3Acik | 0–89 | 136–574 | 49–656 | 40–679 içinde ✓ |

Klip2 kare 0–20: kapak BRIEF gereği sol üste uçup kadrajdan çıkar (kare 21'den itibaren kadrajda değildir, kare 30'da sahneden kaldırılır).

## 6. Uygulama notları

- Sahne, `referans/sahne-referans.html` ile aynı CSS 3D yapısında × 3 ölçekle kuruldu (rotateX(−21°) rotateY(−33°), perspektif 2280 px, ölçek 0,86). Kapalı kare `kare-kapali-720.png` ile satır satır karşılaştırıldı; kutu kenarları ±1 px içinde örtüşüyor.
- Logolar `logolar/` klasöründen dosya olarak kullanıldı (yeniden çizilmedi, ® işaretleri duruyor). Kurdele: kapak üstünde çapraz, kapağın dört yanında, gövdenin sağ, sol ve arka yüzünde; logolu ön yüzde gövdeye inmiyor.
- Işık ve gölge iyileştirmeleri: kapağın gövdeye düşen ince gölgesi (kapak kalkınca azalır), kapak kenarlarında hafif parlama, fiyonkta hacim ışığı ve kapağa düşen yumuşak gölge, tilkide köşeleri yuvarlak beyaz yama konturu, daha yumuşak zemin gölgesi ve parlama.
- Işın huzmeleri: 16 huzme, 22,5° periyot (taslaktaki 22° değil; 22° ile 360° tam bölünmüyor), 7° genişlik, kenarları yumuşatılmış. Dönüş açısı gradyanın kendisine veriliyor (her kare yeniden çizilir, döndürme bulanıklığı olmaz). İlk 90 px'te de sönüyor; merkez tilkinin arkasında kalıyor ama gözlük boşluklarından titreşim görünüyordu.
- Işın, parlama ve konfeti, kenardan 32 px içeride sıfıra inen yumuşak bir kenar maskesiyle söner. Parlama da maskeye dahil; üst kenarda zeminden açık bir şerit kalmaz.
- Klip2: kutu tabanından esner (zemine basar). Kapak soldurulmaz; kare 21'de kadrajdan tamamen çıkar ve kare 30'da sahneden kaldırılır. 3D gruplarına opacity/filter verilmedi.
- Klip2 tilki tepe noktası: BRIEF "≈ 21 px yukarı, %106" diyor; bu değerlerle tilkinin konturu 40 px güvenli kenara 1 px giriyordu. Tepe ≈ 19 px'e çekildi (ölçek %106 aynı kaldı).
- Tilkiye 0,05°'lik sabit, görünmeyen bir dönüş payı eklendi. Dönüş tam 0 olduğunda Chrome tilkiyi yeniden örneklemeden, daha keskin çiziyordu; bu yüzden Klip2 sonu ve Klip3 kare 0 ile Klip3'ün salınımlı kareleri arasında bir karelik keskinlik sıçraması oluşuyordu.
- Konfeti: 26 parça (daire, yıldız, kalp, ince dikdörtgen; 6 renk, açık renklerde ince kontur). Remotion `random()` sabit tohumlarla kullanıldı. Parçalar sürtünmeli balistik bir yay çizer, döner, kâğıt gibi takla atar; son parça kare 56'da söner.
- Render: ara kareler PNG (kayıpsız), x264 veryslow, CRF Klip1 13 · Klip2 16 · Klip3 16 (scripts/render.sh).
