# Patch dış çizgileri (kontur) – denetim (2026-10-12)

## Nasıl üretildi

- Araç: `araclar/kontur-cikar.py`.
  - Girdi: kopya temanın sayfasındaki KisiselVeri JSON'u.
  - Çıktı: `araclar/konturlar.json`, her görsel için çokgen, denetim değerleri ve sorunlar.
- Görseller Shopify CDN'den 600 px genişlikte indirildi.
  - Kaynaklar: kisisellestirme.onizleme_png ve aksesuarlarda onizleme_gorseli.
  - Alfa > 127 olan pikseller opak sayıldı, küçük delikler kapatıldı.
- Dış çizgi şöyle seçildi:
  - Dolu oranı (alan / dışbükey zarf) ≥ 0,93 ise dışbükey zarf kullanıldı.
  - Daha girintili şekillerde (L, J, T, F, ahtapot, dinozor, Good Luck…) gerçek çizgi kullanıldı.
  - Her iki durumda da en fazla 32 noktaya sadeleştirildi.
- Noktalar görsele göre 0..1 aralığında kaydedildi.
  - Aksesuarlarda dış ölçü kutusuna göre kaydedildi; kanca ve fermuar ipi kutunun dışında kaldığı için çokgene girmedi.
- Kayıt: yeni `kisisellestirme.kontur` (json) alanı, ürün ve varyant için.
  - Varyantın kendi PNG'si varsa varyanta, yoksa ürüne yazıldı.
  - 137 kayıt yapıldı:
    - Cool 26, Piramit 39, Rakam 10 (varyant);
    - 52 ikon (ürün; hazır setlerin patch'leri de bunlar);
    - 10 aksesuar.
- Mevcut hiçbir alanın üzerine yazılmadı. Görseller, ölçüler, ürünler ve varyantlar değişmedi.

## Sonuç

- 137 görselin hepsinden çokgen çıktı. Çokgenlerin 61'i içbükey (gerçek çizgi), 76'sı dışbükey zarf.
- Hiçbirinde şu sorunlar yok:
  - şeffaflık eksikliği;
  - boş kenar;
  - kendini kesen çizgi;
  - %3'ü aşan sadeleştirme kaybı.
- Görseller tek tek çizilip gözle kontrol edildi.
  - Çizgiler patch'lerin kenarını izliyor.
  - Piramit F, J, 4 gibi girintili şekillerde dışbükey zarf girintiyi kapatıyordu. Bunlar gerçek çizgiye geçirildi (eşik 0,88 → 0,93).

## Dikkat: görsel oranı ile kayıtlı ölçü uyuşmayan patch'ler

Editör görseli patch'in kayıtlı ölçü kutusuna (genislik_cm × yukseklik_cm) **oranını koruyarak** sığdırıyor. Görselin oranı kutununkinden farklıysa önizlemede patch kutudan küçük görünüyor.

Örneğin Retro Casette Player kayıtta 8 × 5 cm. Görseli ise neredeyse kare, bu yüzden önizlemede yaklaşık 5,4 × 5 cm görünüyor. Kutuya göre yapılan eski kontrol bu patch'leri olduğundan büyük sayıyordu; daire kenarındaki gereksiz uyarıların bir kaynağı da buydu.

Yeni kontrol, çokgeni önizlemedeki gibi yerleştiriyor; kırmızı uyarı ekranda görünen şekle göre çıkıyor. Kayıtlı ölçülere dokunulmadı. Gerçek ürün ölçüsünü kontrol edip gerekirse ölçüyü ya da görseli düzeltmek gerekebilir.

**Düzeltildi (2026-10-12):** aşağıdaki 29 ikonun `png_genislik_cm` / `png_yukseklik_cm` değerleri görselin oranına göre güncellendi. Görselin önizlemede sığdığı kenar korundu, yani görünen boyut değişmedi; kayıtlı `genislik_cm` / `yukseklik_cm` aynen duruyor. Ayrıntı: `araclar/olcu-duzeltme.json`.

Farkı %3'ü aşanlar (görsel oranı / kayıtlı ölçü oranı):

| Patch | Görsel oranı | Ölçü oranı |
|---|---|---|
| Retro Casette Player | 1,07 | 1,60 |
| Good Luck | 0,90 | 0,63 |
| Oyun Sembolleri | 3,41 | 2,29 |
| Cool | 2,79 | 2,00 |
| Donut Planet | 1,44 | 1,89 |
| Aksolotl | 1,34 | 1,60 |
| Roller Skate | 0,97 | 0,75 |
| School Rocks | 0,93 | 0,75 |
| Adventurer | 0,84 | 1,00 |
| Jimnastik | 0,88 | 1,00 |
| Doing My Best | 1,15 | 1,00 |
| Manifest It: Pink | 1,13 | 1,00 |
| Octopus | 1,03 | 1,14 |
| GOAT | 1,45 | 1,60 |
| Eggcellent | 1,19 | 1,07 |
| Kapibara | 0,80 | 0,87 |
| Too Cool for School | 0,68 | 0,75 |
| Tenis | 1,07 | 1,00 |
| GIRLGANG | 1,50 | 1,60 |
| Whatever | 1,69 | 1,60 |
| Volleyball Love | 0,94 | 1,00 |
| Dog Person | 2,08 | 2,00 |
| I love swimming | 1,63 | 1,70 |
| Dinozor Dino | 0,71 | 0,67 |
| Uzay Gemisi | 0,78 | 0,75 |
| Yıldız | 0,96 | 1,00 |
| Drama and Theatre | 0,96 | 1,00 |
| Kaykay | 2,67 | 2,57 |
| Meteor | 0,43 | 0,41 |

Zarf Kalemlik Turuncu/Kırmızı da listede çıkıyor (2,29 / 2,22), ama sorun değil: aksesuar çizgisi dış ölçü kutusuna göre kaydedildiği için oran farkı denetimi etkilemiyor.

## Yeni bir patch eklenince

`araclar/kontur-cikar.py` yeniden çalıştırılır. Yalnızca yeni ürün veya varyantların `kontur` değeri yazılır; editör çokgeni her açılışta yeniden hesaplamaz. Konturu olmayan patch eski dikdörtgen ya da daire kontrolüyle çalışmaya devam eder.
