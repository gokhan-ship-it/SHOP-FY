# texttonext-motion

Meta reklamları (Instagram Reels / Story) için Apple tarzı, sade motion graphic videolar.
1080×1920 (9:16), 30 fps, saf beyaz (#FFFFFF) arka plan, Inter yazı tipi.

## Kurulum (bir kez)
- macOS / Linux: `./kurulum.sh`
- Windows: `kurulum.bat` dosyasına çift tıklayın.

## Videolar
| Video | Ayar dosyası | MP4 komutu | Çıktı |
|---|---|---|---|
| single-hediye-v1 | `src/videolar/single-hediye-v1.ts` | `npm run render:single-hediye-v1` | `out/single-hediye-v1.mp4` |
| Reklam (15 sn örnek) | `src/senaryo.ts` | `npm run render` | `out/reklam.mp4` |

## Dosyaları nereye koymalı
- Ürün fotoğrafları → `assets/urunler/` (ana fotoğraf: `kolye.png`, boyunda çekim: `kolye-boyunda.jpg`; adları ayar dosyasından değişir)
- Dış ses → `assets/ses/` (single-hediye-v1 için `single-hediye.mp3`)
- Logo → `assets/logo/` (yoksa "Text To Next" yazı logosu kullanılır)
- Arka plan müziği → `assets/muzik/` (yoksa müziksiz)

Eksik dosyaların yerine geçici yer tutucu gösterilir. Fotoğraflara yalnızca konum, ölçek, opaklık ve kenar kırpma uygulanır.

## Önizleme
`npm run dev` yazın, tarayıcıda http://localhost:3000 adresini açın.

## Ses senkronu
Dış ses Whisper ile yazıya dökülür ve her kelimenin zamanı `assets/transkript/` klasörüne yazılır.
`npm run dev` ve `npm run render:...` komutları bunu kendiliğinden yapar; ses dosyası değişirse zamanlamalar yeniden hesaplanır.
Elle çalıştırmak için: `npm run senkron`.

## Metin, renk, tarih değiştirme / bileklik versiyonu
`src/videolar/single-hediye-v1.ts` dosyasındaki ilgili satırı değiştirin.
Bileklik için dosyayı `single-bileklik-v1.ts` adıyla kopyalayın, `id`, ses ve fotoğraf adlarını,
"kolye" → "bileklik", "boynunda" → "bileğinde" metinlerini değiştirin ve `src/videolar/index.ts` listesine ekleyin.
