# texttonext-motion

Meta reklamları (Instagram Reels / Story) için Apple tarzı, sade motion graphic videolar.
1080×1920 (9:16), 30 fps, saf beyaz (#FFFFFF) arka plan, Inter yazı tipi.

## Kurulum (bir kez)
- macOS / Linux: `./kurulum.sh`
- Windows: `kurulum.bat` dosyasına çift tıklayın.

## Dosyaları nereye koymalı
- Ürün fotoğrafları → `assets/urunler/` (jpg, png, webp; alfabetik sırayla 1, 2, 3… olarak kullanılır)
- Dış ses (MP3) → `assets/ses/` (klasördeki ilk MP3 kullanılır)

Klasörde fotoğraf yoksa gri yer tutucu gösterilir. Fotoğraflara yalnızca konum, ölçek ve opaklık animasyonu uygulanır.

## Önizleme
`npm run dev` yazın, tarayıcıda http://localhost:3000 adresini açın.

## MP4 dışa aktarma
Terminale `npm run render` yazın; video `out/reklam.mp4` olarak kaydedilir.

## Metinleri ve zamanlamayı değiştirme
`src/senaryo.ts` dosyasındaki metinleri ve saniyeleri dış sese göre düzenleyin.
