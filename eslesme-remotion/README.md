# Eşleşme animasyonu (Remotion)

Couple ürünlerde kişiler kapsüllerini ilk oluşturup eşleştiğinde, eşleşme ekranında sürekli loop olarak oynayan video.

**Kullanılan video:** `out/eslesme-A.mp4` (A · Çarpışma varyantı)

- 1080×1080, 60 fps, 240 kare (4 sn), H.264, yuv420p, crf 16, ses yok
- Kare 0 ile döngünün bir sonraki başlangıcı birebir aynı; kesintisiz loop

`out/eslesme-B.mp4` (B · Plak gibi dönüş) alternatif olarak duruyor.

## Komutlar

```sh
npm i
npm run studio       # Remotion Studio önizleme
npm run render       # out/eslesme-A.mp4 ve out/eslesme-B.mp4
npm run verify-loop  # loop doğrulaması
```

Animasyonun kaynağı `eslesme-animasyon-v2.html`; çizim mantığı `src/anim.ts` içinde birebir aktarıldı.
