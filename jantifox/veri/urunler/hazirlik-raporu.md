# Kişiselleştirmeyi yayma: Aşama 1 hazırlık raporu (2026-10-12)

Mağazaya hiçbir şey yazılmadı. Ürün görsellerine dokunulmadı; işlenmiş kopyalar yalnızca depoda (`veri/urunler/png`).

## Özet

- **"patch-notice" etiketli ürün:** 43.
  - Yapıştırılabilir aksesuarlar (12, `stick-on`) zaten yapıldığı için hariç.
  - **İncelenen: 31 ürün, 11 grup.**
- **Çizilecek:** 18 ürün. Hepsinin önden şeffaf PNG'si hazır.
- **Kopyalanabilir:** 2 ürün (Kalem Kutusu Kırmızı ve Turuncu). Yapıştırılabilir sürümün düzeltilmiş görseli ve alanı aynen kullanılabilir.
- **Hazır:** 1 ürün (Kanvas Lacivert Tote).
- **Patch alanı yok:** 10 ürün. Ürün görselindeki rozet "PATCH ALANI YOKTUR" diyor:
  - Kalem Kutusu Sarı,
  - 4 Zarf Kalemlik,
  - 5 Mini Yuvarlak Çanta.

  Öneri: "Bu üründe kişiselleştirme olmasın".
- **Görsel sorunu olan:** 1 ürün, Pembe Kırmızı Spor Çanta. Önden tek görselinde Velcro dairenin üstünde patch var.
- **Perspektif düzeltme önerilen:** 1 ürün, Mavi Beyaz Spor Çanta. Daire 0,81 oranında basık.
- **Velcro ölçüsü eksik:**
  - Şapka (2 ürün),
  - Sırt Çantası (3 ürün),
  - Mini Sırt Çantası (2 ürün).

  Çantalarda ölçek, açıklamadaki çanta genişliğinden alınabilir.

## Gruplar

| Grup | Ürünler | Velcro alanı | Ölçü kaynağı | Durum |
|---|---|---|---|---|
| Tişört | Bej, Sarı, Mavi, Pudra Pembe | Daire, çap 22 cm | Açıklama | 4 çizilecek |
| Sweatshirt | Bej, Mavi, Yeşil | Daire, çap 22 cm | Açıklama | 3 çizilecek |
| Sweatshirt (siyah daireli) | İndigo, Pembe | Daire, çap 22 cm | Açıklama | 2 çizilecek |
| Janti Şapka | Siyah, Bej | Ön tepe paneli | **Yok** | 2 çizilecek, ölçü eksik |
| Kanvas Tote Çanta | Lacivert | Daire, çap 25 cm | Açıklama | Hazır |
| Çizgili Spor Çanta | Mavi Beyaz, Pembe Kırmızı | Daire, çap 21 cm (çanta 43 × 38) | Açıklama | 2 çizilecek (biri perspektif, biri görsel sorunlu) |
| Sırt Çantası | The Performer, The Racer, The Artist | Üst kemerli panel ve alt cep (fermuarla ayrılmış iki alan) | **Yok**; çanta G30 × Y40 × D13 | 3 çizilecek, Velcro ölçüsü eksik |
| Mini Sırt Çantası | The Daymaker, The Adventurer | Üst kemerli panel ve alt cep | **Yok**; çanta G25 × Y30 × D10 | 2 çizilecek, Velcro ölçüsü eksik |
| Kalem Kutusu | Kırmızı, Turuncu, Sarı | Yuvarlak köşeli dikdörtgen, genişlik 20,87 cm, köşe 2 cm (yapıştırılabilir sürümden) | Açıklama ve mevcut harita | Kırmızı ve Turuncu kopyalanabilir; Sarı'da patch alanı yok |
| Zarf Kalemlik | Sarı/Kırmızı, Kırmızı/Pembe, Turuncu/Kırmızı, Sarı/Turuncu | Yok | Rozet | Kişiselleştirme olmasın |
| Mini Yuvarlak Çanta | Pembe, Sarı, Mavi, Kırmızı, Turuncu | Yok | Rozet | Kişiselleştirme olmasın |

## Gruplamada emin olmadıklarım

1. **İki sweatshirt grubu.** Siyah daireli İndigo ve Pembe'yi ayrı model saydım:
   - etiketleri farklı (`jantifox-sweatshirt-typ2-color`);
   - Velcro'su siyah ve belirgin;
   - tek beden seçeneği var.

   Açıklamaya göre daire ölçüsü aynı (22 cm). Aynı modelse tek grupta da toplanabilir.
2. **Kalem Kutusu Sarı.** Model ve ölçü aynı, ama rozet "patch alanı yoktur" diyor ve açıklamada Velcro cümlesi yok. Bu yüzden ötekilerden ayrı tuttum.
3. **Sırt çantaları.** Performer, Racer ve Artist aynı ölçüde (30 × 40 × 13), yalnızca renk blokları farklı; aynı model saydım. Daymaker ve Adventurer da aynı şekilde mini model.
4. **Pudra Pembe Tişört'te 4 yaş grubu var**, diğerlerinde 3. Etiketi ve açıklaması aynı olduğu için aynı gruba koydum.
5. **Mini Sırt Çantası The Daymaker.** Açıklamada Velcro cümlesi yok, ama görsellerde ön yüzüne patch takılı; Velcro'lu saydım.

## Görsel seçimi

Seçilen görseller ve işlenmiş PNG'ler `veri/urunler/png/` altında; boyutlar ve kaynak adresler `png/rapor.json` dosyasında.

| Grup | Seçilen görsel |
|---|---|
| Tişört, Sweatshirt | 3. görsel (patch'siz, önden düz çekim) |
| Şapka | 3. görsel (önden, patch'siz) |
| Spor çanta | 5. görsel (Velcro dairenin göründüğü tek ön görsel) |
| Sırt çantaları | 1. görsel (önden, patch'siz) |

- Arka plan, aksesuarlardaki süreçle temizlendi:
  - rembg + isnet;
  - en büyük parça ve ona yapışık parçalar korunur;
  - en uzun kenar 1600 px.
- Mavi Beyaz Spor Çanta'da beyaz çizgiler arka plan sanıldı. Gövde boşlukları doldurularak düzeltildi.
- The Performer'ın sapının içindeki boşluk temizlendi. Sağda küçük bir beyaz kalıntı kaldı; Velcro alanının dışında olduğu için çizimi etkilemez.

## Perspektif

| Ürün | Ölçüm | Öneri |
|---|---|---|
| Mavi Beyaz Spor Çanta | Velcro daire 404 × 497 px (oran 0,81); çanta yaklaşık 35° dönük | Görseli yatayda × 1,23 germek daireyi yuvarlak yapar. Ya da alan oval çizilir; ölçek yükseklikten (21 cm) alınır. |
| Kalem Kutusu Kırmızı ve Turuncu | Ürün görselleri açılı | Yapıştırılabilir sürümde yapılan düzeltme (`veri/aksesuar/duz`) kullanılır. |
| İndigo ve Pembe Sweatshirt | Daire oranı 0,98–0,99 | Gerekmez. |
| Şapka | Ön panel kavisli | Önden görsel kullanılır; Velcro alanı panelin ortasıyla sınırlanmalı. |

## Aynı gruptaki görsel boyutları

- **Aynı oran:** Tişört (1076 × 893 ve 1290 × 1073), Sweatshirt (1198 × 1184–1186). Koordinatlar oranla aktarılabilir.
- **Farklı oran:** Siyah daireli sweatshirt (1226 × 1077 ve 1357 × 1078), sırt çantaları ve şapkalar. Aktarılan alan elle kontrol edilmeli.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `plan.json` | Gruplar, ürünler, seçilen görsel, PNG, ölçüler, eksikler, durum (2. aşamadaki panel bunu okuyacak) |
| `urunler.json` | Ürünlerin mağaza verisi (`/products/<handle>.js`) |
| `secim.json` | Ürün başına seçilen görsel ve temizleme ayarı |
| `hazirla.py` | Görsel hazırlama betiği |
| `png/` | 18 şeffaf PNG ve `rapor.json` |
