Bu klasörde "single-acilis-v2.html" adında bir animasyon eskizi var. Bunu birebir aynı görünecek şekilde, bu klasördeki mevcut Remotion projesine yeni composition'lar olarak ekle. Uygulama projeme dokunma.

AMAÇ
Hediye edilen single kapsülün açılış günü alıcının gördüğü animasyonlar: "açılmaya hazır" döngüsü ve bileklik okutulunca oynayan açılış. Açılış, kalp tüneline girerek bitiyor. Tünel ve çıkış için daha önce yaptığımız KalpTuneliLoop ve KalpTuneliCikis videoları kullanılacak; onları tekrar render etme.

VİDEO AYARLARI
1080x1920 piksel (dikey), 30 fps. Eskizdeki 540x960'lık koordinatları 2 ile çarp.

COMPOSITION'LAR
a) "SingleHazirLoop": kilit, kulpunu iki kez çekiştirerek "kapıyı çalıyor", her seferinde etrafına soluk lime bir halka yayılıyor (60 kare, loop). Eskizin başındaki "açılmaya hazır" bölümü. Motion blur'un döngünün ilk karelerinde de doğru çalışması için bu composition'ı eskizin 60–119. karelerinden al (ikinci tur).
b) "SingleAcilis": bileklik okutulduğu andan itibaren 56 kare (eskizde 120–175. kareler). Klik sesiyle kulp fırlayıp uçuyor, anahtar deliği anahtar çevrilmiş gibi dönüp küçülüyor, kilit düzleşiyor ve lime yüzü kalbe dönüşüyor (dönüşürken etrafa küçük noktalar fırlıyor), kalp bir kez atıyor, içi boşalıp kontura dönüşüyor, içine dalınıyor ve tünel başlıyor. İlk karesi SingleHazirLoop'un ilk karesiyle aynı; son karesi KalpTuneliLoop'un ilk karesine birebir bağlanmalı.

ÖNEMLİ
- Kilidi çizmek için single kilit işinde yazdığın "Lock" bileşenini, tüneli de couple açılış işinde yazdığın "HeartTunnel" bileşenini kullan. Eskizdeki kilit ölçüleri (540x960 ölçeğinde): yarıçap 100, kalınlık 30, merkez (270, 470); kalbin yarı genişliği 105.
- Geçiş kontrolü: SingleHazirLoop'un son karesinden kendi ilk karesine ve SingleAcilis'in son karesinden KalpTuneliLoop'un ilk karesine geçişte atlama olmamalı. Bunu kodla doğrula.
- Eskizdeki isim, "Kapsülün açılmaya hazır", "412 gün önce kilitlendi", bileklik butonu, gün sayacı ve galeri uygulamanın katmanı; videoya koyma.

GENEL KURALLAR
- Eskizdeki çizim mantığı kare numarasına bağlı saf fonksiyonlardan oluşuyor. Zamanlamaları, easing fonksiyonlarını ve yay (spring) değerlerini değiştirmeden aynen taşı; kare numarasını useCurrentFrame() ile al.
- Şekilleri keskin olması için SVG ile çiz.
- Motion blur: @remotion/motion-blur paketindeki CameraMotionBlur ile; 10 örnek, shutterAngle yaklaşık 288.
- Bloom: şekillerin etrafında yumuşak ışık olsun; eskizdeki gibi bulanık bir kopya arkaya yerleşsin. Lime rengin kendisi açılmasın, ışık sadece dışarıda görünsün.
- Renkler: arka plan #000000; lime yüz geçişi #ECFF8C → #DEFE52 → #C9E644; kenar ve kulp beyaz; gövde yanı #4c5913 → #9db234; anahtar deliği #0b0b0b.
- Çıktılar: H.264 codec, yuv420p piksel formatı, yüksek kalite (crf 16 civarı), ses kanalı olmasın.
- Remotion Studio'yu başlat ve bana önizleme linkini ver.
- Ekran görüntüsü alma. Kontrolü Studio linkinden kendim yapacağım.

ÇIKTILAR
out/single-hazir-loop.mp4, out/single-acilis.mp4

RAPOR
Kısa tut. Sadece şunları yaz: Studio önizleme linki, render edilen dosyaların yolu ve boyutu, oluşturulan ve değiştirilen dosyaların listesi.
