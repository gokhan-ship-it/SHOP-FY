# Kapsül animasyonları (Remotion)

Tüm videolar: 60 fps, H.264, yuv420p, crf 16, ses yok. Eşleşme ve kilit 1080×1080, açılış 1080×1920.

Motion blur kilit ve açılış videolarında `src/FloatMotionBlur.tsx` ile yapılıyor: örnekler kayan noktalı tamponda ortalanıyor, böylece blur açık ve kapalı videolar aynı renkte buluşuyor ve lime gradyan kademelenmiyor.

## Couple eşleşme

Couple ürünlerde kişiler kapsüllerini ilk oluşturup eşleştiğinde, eşleşme ekranında sürekli loop olarak oynayan video.

**Kullanılan video:** `out/eslesme-A.mp4` (A · Çarpışma varyantı)

- 240 kare (4 sn); kare 0 ile döngünün bir sonraki başlangıcı birebir aynı, kesintisiz loop
- `out/eslesme-B.mp4` (B · Plak gibi dönüş) alternatif olarak duruyor
- Kaynak: `eslesme-animasyon-v2.html` → `src/anim.ts`, `src/Eslesme.tsx`

## Single kilit

Single kapsülde kullanıcı kapsülü her kilitlediğinde oynayan animasyon. İki parçadan oluşur:

1. `out/single-kilit.mp4`: kilit anı, 160 kare (2,67 sn). Her kilitlemede **bir kere** oynar.
2. `out/single-kilit-bekleme.mp4`: bekleme, 120 kare (2 sn). Kilit videosu bitince başlar, kapsül kilitli kaldıkça **loop** olarak döner.

- Kilit videosunun son karesi bekleme videosunun ilk karesiyle aynı; bekleme videosunu önceden yükleyip kilit bittiği anda aynı yerde başlatmak geçişi dikişsiz yapar
- Bekleme videosunda kare 0 ile döngünün bir sonraki başlangıcı birebir aynı; motion blur kapalı
- Kaynak: `single-kilit-final.html` → `src/kilit/`
- Kilit çizimi tekrar kullanılabilir `Lock` bileşeni (`src/kilit/Lock.tsx`); açılış ve bekleme ekranı videoları da bunu kullanacak

## Uygulama açılışı ("merhaba")

Uygulama açılırken oynayan video. Telefonun siyah açılış ekranından başlar (ilk kare tamamen siyah), uygulamanın ana ekranına bağlanır. Ekrana dokunulunca atlanabilir.

- 1080×1920 (dikey). Dosyalar `out/acilis/acilis-<fikir>-<versiyon>-<dil>.mp4`:
  - fikir: `el` (1 · tek çizgiyle el yazısı) veya `halka` (2 · halkalardan harfler)
  - versiyon: `tam` (~3 sn; ilk kurulumda ve günde bir kez) veya `kisa` (~1,3 sn; diğer açılışlar)
  - dil: `merhaba`, `hello`, `hallo`
- Video bittiğinde ana ekrana geçiş uygulamanın katmanında yapılır:
  - `el`: son kare siyah; ana ekran 10 karede (0,33 sn) siyahtan belirir
  - `halka`: son kare lime; ana ekranın üstündeki lime perde 12 karede (0,4 sn, easeInOutCubic) yukarı kayar
- Kaynak: `merhaba-acilis.html` → `src/acilis/`

## Sıradaki işler

`SIRA.md` ve `promptlar/` klasöründeki adımlar sırayla yapılıyor (1 ve 2 tamam). Eskizler bu klasörde.

## Komutlar

```sh
npm i
npm run studio        # Remotion Studio önizleme
npm run render        # out/ altındaki tüm videolar (yalnızca açılış: npm run render:acilis)
npm run verify-loop   # eşleşme loop doğrulaması
npm run verify-kilit  # kilit loop ve geçiş doğrulaması
npm run verify-acilis # açılış: ilk kare siyah, son kare siyah/lime (render sonrası)
```
