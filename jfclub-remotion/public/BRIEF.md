# JantiFox Club · Remotion brief

Sitedeki "JantiFox Club" pop-up'ının kutu alanı için 3 kısa video ve 2 görsel üretilecek.
Tasarım onaylandı: `referans/` klasöründeki görünüm birebir korunacak.
**Videolarda hiç yazı yok.** Başlıklar, e-posta kutusu, %15, kod ve butonlar sitede gerçek yazı olarak duracak.

---

## 1. Üretilecek dosyalar

| Dosya | İçerik | Süre | Kare (30 fps) |
|---|---|---|---|
| `jfclub-1-bekleme.mp4` | Kapalı kutu; ara ara zıplayıp sallanır. **Döngü.** | 2,4 sn | 72 |
| `jfclub-2-acilis.mp4` | Kapak uçar, kutudan tilki çıkar, ışık ve konfeti | 2,0 sn | 60 |
| `jfclub-3-acik.mp4` | Açık kutu; tilki hafifçe salınır, ışık huzmeleri döner. **Döngü.** | 3,0 sn | 90 |
| `jfclub-kapali.png` | Klip 1'in ilk karesi | – | – |
| `jfclub-acik.png` | Klip 3'ün ilk karesi | – | – |

---

## 2. Teknik ölçüler

- **Boyut:** 720 × 720 px, kare, 30 fps.
- **Arka plan:** düz `#FBEAD6` (pop-up kartının rengi). Gradyan, doku, vinyet yok.
- **Güvenli kenar:** her kenarda 40 px. Kutu, kapak, fiyonk ve tilki bu alana girmez. Işık huzmeleri ve konfeti kenara yaklaşırken tamamen sönmeli (sitede kenarlar yumuşak bir maskeyle zemine karışacak).
- **Video formatı:** MP4, H.264, `yuv420p`, ses izi yok, `--color-space=bt709`, faststart.
- **Boyut hedefi:** Klip 1 ≤ 250 KB, Klip 2 ≤ 400 KB, Klip 3 ≤ 300 KB (CRF ile ayarla).
- **Görseller:** PNG, 720 × 720.
- **Renk kontrolü:** her MP4'ten bir kare çıkarıp köşe pikselini ölç; `#FBEAD6`'dan farkı kanal başına en fazla ±2 olmalı. Fark büyükse sitede video ile kart arasında çizgi görünür.

---

## 3. Geçiş kuralları (en önemli kısım)

Sitede akış şöyle: Klip 1 döngüde oynar → e-posta gönderilince Klip 2 bir kez oynar → bitince Klip 3 döngüye girer. Geçişlerde en ufak atlama olmamalı.

1. **Klip 1 kesintisiz döngü:** kare 71'den kare 0'a dönüş akıcı olmalı.
2. **Klip 2 kare 0 = Klip 1 kare 0** (piksel piksel aynı). Site, Klip 1 dinlenme anındayken Klip 2'ye geçecek.
3. **Klip 2 son kare (59) = Klip 3 kare 0** (ışın açısı, parlama ve tilki konumu dahil).
4. **Klip 3 kesintisiz döngü:** kare 89'dan kare 0'a dönüş akıcı olmalı.

Bu kuralları render sonrası kareleri karşılaştırarak doğrula ve farkı raporla.

---

## 4. Sahne

Referans: `referans/sahne-referans.html` (240 × 240 px'te çizildi, videoda **× 3**).
Tarayıcıda `?durum=kapali`, `?durum=sallanma`, `?durum=acilis`, `?durum=acik` ile açılabilir.
Referans kareler: `referans/kare-kapali-720.png`, `referans/kare-acik-720.png`, `referans/klip1-bekleme-kareler.png`, `referans/klip2-acilis-kareler.png`.

### Kamera
- Kutu hafif yukarıdan ve sağdan görünür: taslakta `rotateX(-21°) rotateY(-33°)`, perspektif 760 px, sahne ölçeği 0,86.
- Kutu yatayda ortada. 720 ölçeğinde: kutu merkezi y ≈ 414 px, zemin gölgesinin merkezi y ≈ 648 px.

### Kutu
- Küp gövde (taslakta kenar 120 px) ve üstünde kapak (taslakta 132 × 132 × 28 px; gövdeden her yandan biraz taşar).
- **Renkler:**
  - Ön yüz (logolu): `#E3123F` → `#D4002F` → `#A8001F` (yukarıdan aşağı, hafif çapraz)
  - Sağ yan: `#A80022` → `#7C001A`
  - İç yüzler (açılınca görünür): `#6A0016`, `#5C0013`
  - Kapak üstü: `#FF3A62` → `#D1002D` (sol üstten ışık)
  - Kapak ön yüzü: `#F0254F` → `#C4002A`
  - Kapak yanları: `#BF0029` → `#92001F`
- **Logo:** ön yüzün ortasında beyaz tilki (`logolar/jantifox-icon.svg`), yüz genişliğinin yaklaşık %65'i. Logo dosyasını yeniden çizme, değiştirme; ® işareti kalsın.

### Kurdele ve fiyonk
- Renk `#F8E2C7`; kenarlarında 1 px koyu çizgi `rgba(89,0,28,0.16)`. Genişlik taslakta 18 px (720'de ≈ 46 px).
- Kapağın üstünde **ortadan çapraz**: biri önden arkaya, biri soldan sağa.
- Kapağın **dört yan yüzünde** de kurdele görünür.
- Gövdede: **sağ ve sol yanlarda** yukarıdan aşağı tam boy iner; arka yüzde de iner.
- **Logolu ön yüzde kurdele gövdeye inmez**, sadece kapakta görünür. Logo temiz kalır.
- Fiyonk kapağın tam ortasında, **dört ilmekli** (krem, hafif parlak, ilmeklerin kenarı `#E2BF97`).

### Kutudan çıkan tilki
- `logolar/jantifox-icon-color.svg` (kırmızı tilki).
- Etrafında beyaz kontur (patch / çıkartma gibi, 720'de ≈ 6 px) ve altında yumuşak bordo gölge.
- **Kameraya dönük durur**, kutunun açısıyla eğilmez.
- Son konumda: merkezi y ≈ 186 px, boyu ≈ 248 px (üst kenarı güvenli alanın içinde).

### Zemin gölgesi
- Kutunun altında yumuşak elips, bordo tonlu (`#59001C`, en koyu yerde %28).

### Işık ve konfeti (sadece açılışta)
- **Parlama:** tilkinin arkasında beyaz-krem yumuşak ışık; açıldıktan sonra %75'te sabit kalır.
- **Işık huzmeleri:** altın sarısı `#FFC94A` (%55), 16 huzme, eşit aralıklı (22,5° periyot), her huzme ≈ 7° genişlikte. Merkezden dışa doğru söner, kenara ulaşmadan kaybolur. **Dönüş hızı 22,5°/sn** (Klip 2 ve Klip 3'te aynı).
- **Konfeti:** 26 parça. Şekiller: daire, yıldız, kalp, ince dikdörtgen. Renkler: `#BC0027`, `#FF501B`, `#FFC94A`, `#59001C`, `#FBEAD6` (ince kontur), beyaz (ince kontur).

---

## 5. Klip 1 · Bekleme (72 kare)

Referans: `referans/klip1-bekleme-kareler.png`. Değerler 720 ölçeğinde.

| Kare | Kutu (gövde + kapak birlikte) | Kapak (gövdeye göre ek) | Gölge |
|---|---|---|---|
| 0–33 | **Tamamen sabit** (kare 0 ile aynı) | yerinde | normal |
| 36 | 18 px yukarı, −7° | – | – |
| 37 | – | 26 px yukarı, −4° | – |
| 40 | 26 px yukarı, +6° | – | %82, soluk |
| 42 | – | 15 px yukarı, +5° | – |
| 45 | 15 px yukarı, −5° | – | – |
| 46 | – | 23 px yukarı, −3° | – |
| 49 | 8 px yukarı, +3° | – | – |
| 52 | – | yerine oturdu | – |
| 53 | yerine oturdu (0°) | – | normal |
| 53–71 | **Tamamen sabit** | yerinde | normal |

- Ara kareler yumuşak geçişli (ease-in-out). Dönme ekseni kutunun ortası.
- Kare 71 → kare 0 akıcı olmalı.

---

## 6. Klip 2 · Açılış (60 kare)

Referans: `referans/klip2-acilis-kareler.png`. Değerler 720 ölçeğinde.

| Kare | Olay |
|---|---|
| 0 | Klip 1 kare 0 ile aynı |
| 0–16 | Kutu basılıp esner: kare 5'te genişlik %108 / yükseklik %88, kare 10'da %96 / %106, kare 16'da normal |
| 0–8 | Kapak ≈ 120 px yukarı kalkar, −10° eğilir |
| 8–30 | Kapak dönerek sol üste uçar ve kadrajdan tamamen çıkar (soldurma yerine kadraj dışına uçur) |
| 6–33 | Tilkinin arkasında parlama belirir, %75'te kalır |
| 8–29 | Işık huzmeleri %30'dan %100'e büyüyerek belirir; sürekli 22,5°/sn döner |
| 8–38 | Tilki kutunun içinden yaylı (spring) hareketle çıkar: kare 8'de görünmez (kutunun içinde), kare 26 civarı tepede (son konumdan ≈ 21 px yukarı, %106 büyük), kare 32'de son konumdan ≈ 15 px aşağı (%98), kare 38'de son konumunda |
| 7–57 | Konfeti kutunun ağzından yukarı ve yanlara yay çizerek saçılır, dönerek düşer ve söner. **Kare 57'de hiç konfeti kalmamış olmalı.** |
| 38–59 | Tilki son konumunda sabit; ışınlar dönmeye devam eder |
| 59 | Klip 3 kare 0 ile aynı |

---

## 7. Klip 3 · Açık döngü (90 kare)

- **Tilki:** son konumundan başlayıp ≈ 18 px yukarı çıkar ve −4° eğilir, sonra geri döner. Tek bir yumuşak salınım, 90 kare. Hareket durağandan başlar (ör. `(1 − cos) / 2` eğrisi), böylece Klip 2'den geçiş pürüzsüz olur.
- **Işınlar:** 22,5°/sn döner → 3 sn'de 67,5° (= 3 desen periyodu), döngü kesintisiz.
- **Parlama:** %75'te sabit.
- Kutu sabit, kapak yok, konfeti yok.

---

## 8. Kalite ve yöntem notları

- Görünüm taslakla aynı kalmalı: renkler, kurdele düzeni, logo ve fiyonk konumu. Sadece ışık ve gölge daha yumuşak ve kaliteli yapılabilir (kapağın gövdeye düşen ince gölgesi, kenarlarda hafif parlama, fiyonkta ışık).
- Remotion'da **CSS animasyonu ve transition kullanılmaz**; her hareket `useCurrentFrame` + `interpolate` / `spring` ile kare bazlı yazılır.
- CSS 3D ile yapılırsa: 3D grubunun (kutu, kapak) üzerine `opacity` veya `filter` verilmez; tarayıcı grubu düzleştirir ve kapak bir anlığına kutunun içine düşmüş gibi görünür. Taslakta bu sorun yaşandı.
- Rastgelelik (konfeti) için Remotion'un `random('tohum')` fonksiyonu kullanılır; her render aynı çıkmalı.

---

## 9. Çıktı

`out/` klasöründe:
- 3 MP4 + 2 PNG
- `out/rapor.md`: dosya boyutları, geçiş kontrolü sonuçları (kare farkları), renk kontrolü
- `out/onizleme.html`: `#FBEAD6` zeminde 360 × 360 alanda Klip 1 döngüde oynar; "Aç" butonuyla (Klip 1 dinlenme anındayken) Klip 2'ye geçer; Klip 2 bitince Klip 3 döngüye girer. Geçişlerin atlamasız olduğunu görmek için.
