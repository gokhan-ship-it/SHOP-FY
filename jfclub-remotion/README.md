# JantiFox Club · Remotion

JantiFox Club pop-up'ının kutu alanı için 3 video ve 2 görsel. Brief, onaylı referanslar ve logolar `public/` altında (`public/BRIEF.md`).

| Kompozisyon | Kare (30 fps) | Çıktı |
|---|---|---|
| `Klip1Bekleme` | 72 | `out/jfclub-1-bekleme.mp4`, `out/jfclub-kapali.png` (kare 0) |
| `Klip2Acilis` | 60 | `out/jfclub-2-acilis.mp4` |
| `Klip3Acik` | 90 | `out/jfclub-3-acik.mp4`, `out/jfclub-acik.png` (kare 0) |

## Komutlar

```bash
npm install
npx remotion studio      # Studio
npm run render           # 3 MP4 + 2 PNG → out/
npm run check            # geçiş / renk / boyut kontrolleri → out/rapor.md
```

`node scripts/kareler.mjs <klasör> Klip3Acik:0,45,89` seçilen kareleri kayıpsız PNG olarak çıkarır.

Geçişleri görmek için `out/onizleme.html` dosyasını tarayıcıda aç.

## Yapı

- `src/Sahne.tsx`: sahne (parlama, ışınlar, zemin gölgesi, 3D kutu, konfeti). Bir karedeki durumu (`SahneDurumu`) çizer.
- `src/Kutu.tsx`: CSS 3D kutu, kapak, fiyonk ve tilki (referans HTML × 3).
- `src/Konfeti.tsx`: 26 parça; `random()` sabit tohumlarla.
- `src/klipler.tsx`: üç klibin kare tabloları (`useCurrentFrame` + `interpolate`). CSS animasyonu yok.
- `src/sabitler.ts`: ölçüler, renkler, kamera.

Üç klip aynı sahne bileşenini kullanır. Bu yüzden geçiş karelerinde (Klip1 0 = Klip2 0, Klip2 59 = Klip3 0) DOM ve kaynak kare birebir aynıdır.
