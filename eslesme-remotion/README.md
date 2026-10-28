# Kapsül animasyonları (Remotion)

Tüm videolar: 60 fps, H.264, yuv420p, crf 16, ses yok. Eşleşme ve kilit 1080×1080; uygulama açılışı, kapsül açılışları ve bekleme ekranı 1080×1920.

Motion blur kilit ve açılış videolarında (uygulama ve kapsül açılışı) `src/FloatMotionBlur.tsx` ile yapılıyor: örnekler kayan noktalı tamponda ortalanıyor, böylece blur açık ve kapalı videolar aynı renkte buluşuyor ve lime gradyan kademelenmiyor.

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

## Couple kapsül açılışı (kalp tüneli)

Couple kapsülde çip okutulunca, galeri açılmadan önce oynayan tam ekran geçiş. 1080×1920. Üç video sırayla oynar:

1. `out/couple-acilis-giris.mp4`: giriş, 120 kare (2 sn), **bir kere**. İki halka biri yukarıdan biri aşağıdan gelip buluşur, kalp olur, bir kez atar, kontura döner, içine dalınır ve tünel başlar.
2. `out/kalp-tuneli-loop.mp4`: kalp tüneli, 30 kare (0,5 sn, bir vuruş), yükleme sürdükçe **loop**.
3. `out/kalp-tuneli-cikis.mp4`: çıkış, 48 kare (0,8 sn), **bir kere**. Kamera hızlanır, uçtaki lime kalp üstümüze gelir; son kareler tamamen lime.

- Yükleme bitince uygulama döngünün bitmesini bekleyip çıkışı oynatır (en fazla 0,5 sn). Yükleme giriş bitmeden tamamlandıysa çıkış doğrudan girişin ardından oynayabilir; bu geçiş de dikişsiz.
- Galeri, çıkışın lime ekranından açılır: galerinin üstündeki lime perde 12 karede (0,4 sn, easeInOutCubic) yukarı kayar.
- Tarih sayacı uygulamanın katmanı; her kapsülde farklı olduğu için videoya gömülmez, uygulama videonun üstüne yazar.
- Tünel ve çıkış videoları single kapsülün açılışında da aynen kullanılır. Tünel ortak `HeartTunnel` bileşeni (`src/tunnel/`).
- Eskizden tek fark: çıkış başlarken merkezdeki ışık tek karede tepeye sıçrıyordu; artık normal vuruş gibi 2 karede yükseliyor (döngüden çıkışa geçiş dikişsiz).
- Kaynak: `kapsul-acilis-kalp-tuneli.html` → `src/couple-acilis/`, `src/tunnel/`

## Single kapsül açılışı

Hediye edilen single kapsülün açılış günü alıcının gördüğü animasyonlar. 1080×1920. Sırayla:

1. `out/single-hazir-loop.mp4`: açılmaya hazır, 120 kare (2 sn), **loop**. Kilit kulpunu iki kez çekiştirerek "kapıyı çalıyor"; her seferinde etrafına soluk lime bir halka yayılıyor.
2. `out/single-acilis.mp4`: bileklik okutulunca, 112 kare (1,87 sn), **bir kere**. Kulp fırlayıp uçar, anahtar deliği dönüp küçülür, kilit düzleşir, lime yüzü kalbe döner (etrafa küçük noktalar fırlar), kalp bir kez atar, kontura döner ve içine dalınır.
3. Ardından couple ile ortak `out/kalp-tuneli-loop.mp4` (yükleme sürdükçe) ve `out/kalp-tuneli-cikis.mp4`; galeri çıkışın lime ekranından açılır.

- Açılış videosunun ilk karesi hazır döngüsünün ilk karesiyle aynı. Bileklik döngünün ortasında okutulursa uygulama, döngünün o anki karesinden açılış videosuna 6 karede (0,2 sn) yumuşak geçiş yapar (eskizdeki gibi).
- Açılışın son karesi tünel döngüsünün ilk karesine bağlanır; yükleme açılış bitmeden tamamlandıysa doğrudan çıkışa geçilebilir.
- İsim, "Kapsülün açılmaya hazır", "412 gün önce kilitlendi", bileklik butonu, gün sayacı ve galeri uygulamanın katmanı.
- Kilit `Lock` bileşeniyle (yüzün kalbe dönüşmesi için `morph`), tünel `HeartTunnel` bileşeniyle çizilir.
- Kaynak: `single-acilis-v2.html` → `src/single-acilis/`

## Bekleme ekranı (alıcı)

Kapsül henüz açılmaya hazır değilken alıcının bekleme ekranındaki kilit. 1080×1920. Hepsi bekleme döngüsünün bir turu: 120 kare (2 sn).

1. `out/bekleme-loop.mp4`: **loop**. Kilit hafifçe sağa sola dönüp süzülür, yüzeyinden ışık yansıması geçer.
2. `out/son-24-saat-loop.mp4`: son 24 saatte **loop**. Aynı döngü; kilit saniyede bir nabız gibi atar, etrafına soluk lime halka yayılır.
3. `out/henuz-degil.mp4`: bileklik erken okutulunca **bir kere**. Kilit başını sallar gibi sağa sola sallanır, kulp tıkırdar.
4. `out/ani-eklendi.mp4`: gönderen anı ekleyince **bir kere**. Lime damla süzülüp anahtar deliğinden girer, delik lime yanar, yüzeyde dalga halkası ve dışarı ritim halkası çıkar, kilit esner.

- Uygulama bu videolar arasında yalnızca döngünün tur sonunda geçer: olay gelince tur bitince olay videosu bir kere oynar, sonra bekleme döngüsüne döner. Bütün bu geçişler dikişsiz.
- Süre dolunca uygulama tur sonunda `out/single-hazir-loop.mp4`'e geçer; kilidin konumu, boyutu ve açısı aynı.
- Motion blur yalnızca `henuz-degil` ve `ani-eklendi`'de; döngülerde kapalı.
- Zaman halkası, geri sayım, "Ayşe'den sana", "Kapsülün kilitli", tarih, uyarı ve bildirimler uygulamanın katmanı.
- Kilit `Lock` bileşeniyle çizilir (anahtar deliğinin lime yanması `keyLime`, yüzeydeki dalga halkası `ripple`).
- Kaynak: `kapsul-bekleme-ekrani.html` → `src/bekleme/`

## Sıradaki işler

`SIRA.md` ve `promptlar/` klasöründeki adımların hepsi (1–5) tamam. Sırada uygulamaya bağlama var (ayrı iş).

## Komutlar

```sh
npm i
npm run studio        # Remotion Studio önizleme
npm run render        # out/ altındaki tüm videolar (yalnızca uygulama açılışı: render:acilis, kapsül açılışı: render:tunel, single açılış: render:single, bekleme ekranı: render:bekleme)
npm run verify-loop   # eşleşme loop doğrulaması
npm run verify-kilit  # kilit loop ve geçiş doğrulaması
npm run verify-acilis # açılış: ilk kare siyah, son kare siyah/lime (render sonrası)
npm run verify-tunel  # kapsül açılışı: tünel döngüsü ve tüm geçişler (render sonrası)
npm run verify-single # single açılış: hazır döngüsü, açılış ve tünele geçişler (render sonrası)
npm run verify-bekleme # bekleme ekranı: döngüler, olay videoları ve SingleHazirLoop'a geçişler (render sonrası)
```
