# Editör performans ölçümleri (2026-10-12)

Kopya tema "Kişiselleştirme DEV" üzerinde. Canlı temaya ve mağaza verisine dokunulmadı.

## Nasıl ölçüldü

- **Yerel**: `test/tarayici/sayfa.html` (testlerin kullandığı sayfa; Storefront taklit), Chromium 141.
  - Koşullar: iPhone 13 (390×844, DPR 3), aynı cihaz + CPU 4× ve 6× yavaşlatma, masaüstü 1440×900.
  - Araçlar: Event Timing, Long Animation Frames (betik başına süre, zorunlu stil/yerleşim süresi), CDP `Performance.getMetrics`, `Profiler` (CPU profili, fonksiyon çağrı sayısı), yığın ölçümü.
  - Betikler: `test/performans/olcum.mjs`, `profil.mjs`, `karsilastir-*.mjs`.
- **Canlı (kopya tema önizlemesi)**: `canli-olcum.mjs`. iPhone 13, CPU 4× + yavaş 4G (150 ms gecikme, ~1,6 Mbit/s), masaüstü.
- Ham sonuçlar `test/performans/sonuclar/` altında: `once-*.json` (düzeltmelerden önce), `sonra-*.json`.
- Tek seferlik ölçümler gürültülü olduğu için önemli kalemler eski ve yeni sayfayla 5–9 kez tekrarlandı (medyan).
- "Boyamaya kadar": olaydan sonraki ilk karenin çizilmesine kadar geçen süre (rAF + setTimeout).

## Önce / sonra

| Ölçüm | Koşul | Önce | Sonra | Hedef | Durum |
|---|---|---|---|---|---|
| Harf gecikmesi, yavaş yazma (medyan) | iPhone 13 | 21 ms | 19 ms | < 50 ms | ✓ |
| Harf gecikmesi, yavaş yazma (medyan, 5×6 tekrar) | CPU 4× | 83 ms | 74 ms | < 50 ms | ✗ |
| Tuş başına betik süresi (medyan, 4×8 tekrar) | CPU 4× | 39 ms | 28 ms | — | iyileşti |
| Harf gecikmesi, hızlı yazma (medyan / p95) | CPU 4× | 89 / 296 ms | 44 / 54 ms | < 50 ms | ✓ (medyan) |
| Harf gecikmesi, yavaş yazma (medyan, 5×6 tekrar) | CPU 6× | 124 ms | 113 ms | < 50 ms | ✗ |
| Harf gecikmesi | Masaüstü | 28 ms | 29 ms | < 50 ms | ✓ |
| Tuş başına zorunlu yerleşim okuması | tümü | 4 (2 fonksiyon) | 0 | 0 | ✓ |
| Sürükleme | iPhone / 4× / 6× | 60 / 60 / 57 fps | 60 / 60 / 56 fps | 60; 4×'te ≥ 50 | ✓ |
| Döndürme | iPhone / 4× / 6× | 60 / 60 / 60 fps | 60 / 60 / 56 fps | 60; 4×'te ≥ 50 | ✓ |
| Araç değiştirme | CPU 4× | 53–67 ms | 41–60 ms | < 100 ms | ✓ |
| Hepsi Piramit (medyan, 5 tekrar) | CPU 4× | 142 ms | 130 ms | < 100 ms | ✗ |
| Set ekleme (medyan, 5 tekrar) | CPU 4× | 260 ms | 236 ms | < 100 ms | ✗ |
| Set ekleme (medyan, 5 tekrar) | CPU 6× | 433 ms | 363 ms | < 100 ms | ✗ |
| İkon ekleme (medyan, 5 tekrar) | CPU 4× / 6× | 85 / 165 ms | 89 / 127 ms | < 100 ms | 4× ✓ |
| Ayır / Birleştir | CPU 4× | 90 / 75 ms | 58 / 51 ms | < 100 ms | ✓ |
| Geri al / Yinele | CPU 4× | 46 / 52 ms | 37 / 33 ms | < 100 ms | ✓ |
| Aksesuar ekle (düz) / tasarım ekranı | CPU 4× | 100 / 80 ms | 92 / 82 ms | < 100 ms | ✓ |
| Kampanya paneli | CPU 4× | 39 ms | 27 ms | < 100 ms | ✓ |
| Özet | CPU 4× | 128 ms | 128 ms | < 100 ms | ✗ |
| Editörü açma (medyan, 9 tekrar) | CPU 4× | 133 ms | 138 ms | < 1,5 s | ✓ (fark gürültü düzeyinde) |
| Açılışta ilk çizim (canlı) | iPhone / 4×+yavaş 4G / masaüstü | 43 / 284 / 79 ms | 48 / 280 / 73 ms | < 1,5 s | ✓ |
| Görseller yüklendi (canlı) | 4× + yavaş 4G | 9,2 s | 5,4 s | < 1,5 s | ✗ (ağ sınırlı) |
| 6 harfin görselleri (canlı) | 4× + yavaş 4G | 5,5 s | 2,7 s | — | iyileşti |
| Patch / kart görselleri toplamı (canlı, Görsel paneli açık) | iPhone (Safari gibi PNG) | 23,2 MB | 7,2 MB | — | −%69 |
| Aynısı | Masaüstü (AVIF/WebP) | 4,2 MB | 0,9 MB | — | −%79 |
| Tek patch görseli (canlı, iPhone) | 300 px PNG | 250–315 KB | 72–80 KB (150 px), 135–146 KB (220 px) | — | ✓ |
| Kampanya isteği (6 harf, canlı) | 4× + yavaş 4G | 3 | 1 | 1 | ✓ |
| Kampanya isteği (6 harf, yerel, yavaş yazma) | CPU 6× | 4 | 1 | 1 | ✓ |
| Bellek, 60 işlem | tümü | 3,57 → 3,77 MB | 3,61 → 3,80 MB | sızıntı yok | ✓ |
| DOM düğümü, 60 işlem | tümü | sabit | sabit | sabit | ✓ |
| Önizleme küçülmesi (kaydırma) | CPU 4× / 6× | 50 / 49 fps | 50 / 47 fps | 4×'te ≥ 50 | sınırda / ✗ |
| Yakınlaştırma | CPU 4× | 60 fps | 60 fps | ≥ 50 | ✓ |
| Bildirim, kampanya paneli, aksesuar ekranı | CPU 4× | 54–60 fps | 54–60 fps | ≥ 50 | ✓ |

### Tuş başına hesap sayıları (6 harf, yerel)

Değişmedi: `isimAnaliz` 1, `duzenle` 2, `fiyatHesapla` 2, `Yerlesim.parcalar` 5, `Sahne.ciz` 1, `kampanyaGuncelle` 1. Kampanya simülasyonu artık yazma durduktan 400 ms sonra bir kez gidiyor; yerel tahmin her tuşta anında.

## Hareketler: hangi özellik animasyonlu

| Hareket | Özellik | Durum |
|---|---|---|
| Bildirimler, kazanç bildirimi, kampanya paneli, onay kutusu | transform + opacity | ✓ |
| Kampanya noktası atımı | transform (scale) | ✓ |
| Kırmızı kenar nabzı | SVG opacity (+ drop-shadow) | Kısa (3 × 0,6 s); bırakıldı |
| Kazanç parıltısı | box-shadow | Kısa (2 × 0,6 s); bırakıldı |
| Yeni patch vurgusu (küçük önizleme) | filter | Kısa (1,2 s); bırakıldı |
| Kampanya çizgisi dolumu | width (mutlak konumlu, küçük) | Test `style.width` okuyor; bırakıldı |
| Önizleme küçülme / büyüme | width (+ araç düğmeleri width/height) | Öneri (aşağıda) |
| Yakınlaştırma | width/left/top | 60 fps ölçüldü; transform'a çevirmek kenar çizgilerini de ölçekler (görünüş değişir); bırakıldı |

Süreler artık ortak tanımlardan: `--kp-sure-kisa` 0,2 s, `--kp-sure-orta` 0,25 s, `--kp-sure-panel` 0,3 s, eğri ease-out (`--kp-egri`). Azaltılmış hareket tercihinde kayma, ölçek ve vurgu hareketleri kapalı; yalnızca kısa renk/opaklık geçişleri kalıyor.

## Uygulanan düzeltmeler

| Commit | Ne | Neden |
|---|---|---|
| 539e884 | Tuş başına ve sürüklemede zorunlu yerleşim ölçümleri kaldırıldı | 4×'te tuş başına 10–52 ms zorunlu stil/yerleşim vardı |
| 983dc35 | Önizlemede, karakter kartlarında ve eklenenler satırında yalnızca değişen öğe güncelleniyor | Her tuşta tüm patch'ler ve görselleri baştan kuruluyordu |
| feae64c | Kampanya doğrulaması yazma durduktan 400 ms sonra | 6×'te 6 harfte 4 istek gidiyordu |
| 63a588a | Yazı alanı ölçüm anahtarı daraltıldı, kampanya satırları önbellekte | Gereksiz ölçüm ve sepet kalemi kurulumu |
| 65b5a3c | Hareket süreleri ortak tanımlardan, ease-out, eksik azaltılmış hareket kuralı | Dağınık süreler (0,18–0,4 s) |
| bb1b933 | Patch görselleri ekrandaki boyutta (srcset/sizes, en büyük yine 300 px) | iPhone'da 300 px PNG'ler, Görsel panelinde ~23 MB |
| 37c46f4 | En yakın yer aramasında tam sıralama yerine öncelik kuyruğu | Set eklemenin çoğu on binlerce adayı sıralamaktı |

Her düzeltmeden sonra 57 birim + 20 tarayıcı testi çalıştırıldı; hepsi geçti, geri alınan düzeltme yok.

## Uygulanmayanlar ve öneriler (hedef dışında kalanlar)

1. **4× ve 6×'te harf gecikmesi (74 / 113 ms)**: Betik payı 28 ms; geri kalanı kare bekleme ve boyama. Kalan en büyük betik kalemi kampanya hesabı (~%30) ve karakter kartları. Öneri: `yenile` ikiye bölünüp önizleme ve yazı aynı karede, kampanya/fiyat/şerit bir sonraki karede (≈16 ms sonra) güncellensin. Fiyat ve kazanç bildirimlerinin güncellenme sırası değiştiği için uygulanmadı.
2. **Set ekleme (236 ms), Hepsi Piramit (130 ms), Özet (128 ms) 4×'te > 100 ms**: Set eklemede kalan süre yer geçerlilik denetimleri (her aday için alan + çakışma). Öneri: alan sınırına göre önceden hesaplanmış geçerlilik ızgarası. Yerleşim kuralına dokunduğu için uygulanmadı. Özet'te tüm özet yeniden kuruluyor; Özet'e de "yalnızca değişeni güncelle" uygulanabilir.
3. **Önizlemenin kaydırmayla sürekli küçülmesi ve en yakın duruma oturması**: Bugün sınıf değişimi + width geçişi (4×'te 50 fps, 6×'te 47). Önerilen tasarım:
   - Önizleme üstte sabit katman, ölçeği `transform: scale()` ile kaydırma miktarına bağlı.
   - Panel listesi önizleme yüksekliği kadar üst boşlukla başlar.
   - Bırakınca en yakın duruma (büyük/küçük) oturur.

   Büyük yeniden yazım; uygulanmadı.
4. **Yavaş 4G'de görsellerin 5,4 s'de yüklenmesi**: Safari bu şeffaf görseller için Shopify'dan PNG alıyor (WebP/AVIF verilmiyor). Öneri: patch görsellerinin WebP olarak yüklenmesi ya da `kisisellestirme` alanına ayrıca küçük (ör. 220 px) WebP yüklenmesi. Görsel yüklemesi gerektiği için uygulanmadı.
5. **Kırmızı nabız / parıltı / yeni patch vurgusu** boyama gerektiren özellikleri canlandırıyor, ama kısa süreli; ölçümde kare kaybı yok. Bırakıldı.
