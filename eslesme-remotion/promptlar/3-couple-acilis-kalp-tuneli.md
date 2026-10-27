Bu klasörde "kapsul-acilis-kalp-tuneli.html" adında bir animasyon eskizi var. Bunu birebir aynı görünecek şekilde, bu klasördeki mevcut Remotion projesine yeni composition'lar olarak ekle. Uygulama projeme dokunma.

AMAÇ
Couple kapsülde çip okutulunca, galeri açılmadan önce oynayacak tam ekran (dikey) geçiş. Üç video olacak: giriş, kalp tüneli döngüsü ve çıkış. Tünel döngüsü ve çıkış videoları single kapsülün açılışında da aynen kullanılacak; o yüzden tüneli ortak bir parça olarak yaz.

VİDEO AYARLARI
1080x1920 piksel (dikey), 30 fps. Eskizdeki 540x960'lık koordinatları 2 ile çarp. Eskizde "Tünel: Kalp" seçeneği geçerli; daire seçeneğini taşıma.

COMPOSITION'LAR
a) "CoupleAcilisGiris": eskizin 0–59. kareleri (60 kare). İki halka biri yukarıdan biri aşağıdan gelip buluşuyor, kalp oluyor, kalp bir kez atıyor, içi boşalıp kontura dönüşüyor, içine dalınıyor ve tünel başlıyor. Son karesi tünelin seyir haline birebir bağlanmalı.
b) "KalpTuneliLoop": tünelde bir vuruşluk ilerleme (15 kare), sürekli loop. Eskizde 60. kareden sonra her 15 karede bir aynı görüntü tekrar ediyor. Motion blur'un döngünün ilk karelerinde de doğru çalışması için bu composition'ı eskizin 75–89. karelerinden al (tünelin ikinci turu).
c) "KalpTuneliCikis": tünelden çıkış (24 kare). Tünel döngüsünün başlangıç halinden başlıyor; kamera hızlanıyor, uçtaki lime kalp üstümüze geliyor ve son kareler tamamen lime (#DEFE52). Eskizde yükleme "2 sn" seçiliyken 90–113. kareler.

ÖNEMLİ
- Tüneli (kalp halkaları, halkaların kıvrılması, uçtaki lime kalp, merkezdeki ışık, ritim nabzı, kamera hareketi ve çıkıştaki hızlanma) ayrı ve tekrar kullanılabilir bir "HeartTunnel" bileşeni olarak yaz. Bir sonraki işte single kapsülün açılış videosu tünele bu bileşenle girecek.
- Geçiş kontrolü: CoupleAcilisGiris'in son karesinden KalpTuneliLoop'un ilk karesine, KalpTuneliLoop'un son karesinden kendi ilk karesine ve KalpTuneliLoop'un son karesinden KalpTuneliCikis'in ilk karesine geçişte atlama olmamalı. Bunu kodla doğrula.
- Eskizdeki tarih sayacı ve galeri sadece temsili; bunlar uygulamanın katmanı, videoya koyma.

GENEL KURALLAR
- Eskizdeki çizim mantığı kare numarasına bağlı saf fonksiyonlardan oluşuyor. Zamanlamaları, easing fonksiyonlarını ve yay (spring) değerlerini değiştirmeden aynen taşı; kare numarasını useCurrentFrame() ile al.
- Şekilleri keskin olması için SVG ile çiz.
- Motion blur: @remotion/motion-blur paketindeki CameraMotionBlur ile; 10 örnek, shutterAngle yaklaşık 288.
- Bloom: şekillerin etrafında yumuşak ışık olsun; eskizdeki gibi bulanık bir kopya arkaya yerleşsin. Lime rengin kendisi açılmasın, ışık sadece dışarıda görünsün.
- Renkler: arka plan #000000, lime #DEFE52, halkalar beyaz.
- Çıktılar: H.264 codec, yuv420p piksel formatı, yüksek kalite (crf 16 civarı), ses kanalı olmasın.
- Remotion Studio'yu başlat ve bana önizleme linkini ver.
- Ekran görüntüsü alma. Kontrolü Studio linkinden kendim yapacağım.

ÇIKTILAR
out/couple-acilis-giris.mp4, out/kalp-tuneli-loop.mp4, out/kalp-tuneli-cikis.mp4

RAPOR
Kısa tut. Sadece şunları yaz: Studio önizleme linki, render edilen dosyaların yolu ve boyutu, oluşturulan ve değiştirilen dosyaların listesi.
