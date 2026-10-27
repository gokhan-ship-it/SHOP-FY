Bu klasörde "single-kilit-final.html" adında bir animasyon eskizi var. Bunu birebir aynı görünecek şekilde Remotion'a aktarmanı istiyorum.

AMAÇ
React Native ile yazılmış mobil uygulamamda single zaman kapsülü kilitlendiği an oynayacak animasyon. İki video olacak: kilit anı (bir kere oynar) ve bekleme döngüsü (kapsül kilitli kaldıkça loop olarak döner). Uygulama projeme dokunma.

YAPILACAKLAR
1. Bu klasördeki mevcut Remotion projesini kullan (couple eşleşme videolarının olduğu proje); yeni composition'ları onun içine ekle. Proje yoksa bu klasörde yeni bir Remotion projesi kur (güncel sürüm, TypeScript).

2. Animasyonu birebir aktar:
   - Eskizdeki çizim mantığı kare numarasına bağlı saf fonksiyonlardan oluşuyor (lockState, drawBody, drawShackle, drawFace, drawLock). Zamanlamaları, easing fonksiyonlarını ve yay (spring) değerlerini değiştirmeden aynen taşı. Kare numarasını useCurrentFrame() ile al.
   - Video ayarları: 30 fps, 1080x1080 piksel. Eskizdeki 800x800'lük koordinatları 1080'e oranla ölçekle.
   - İki composition oluştur:
     a) "SingleKilit": eskizdeki 0–79. kareler (80 kare), bir kere oynar.
     b) "SingleKilitBekleme": eskizdeki 80–139. kareler (60 kare), loop.
   - SingleKilit'in son karesinden SingleKilitBekleme'nin ilk karesine geçişte hiçbir atlama olmamalı. Bekleme videosunun son karesinden ilk karesine dönüşte de atlama olmamalı. Bunu kodla doğrula.
   - Şekilleri keskin olması için SVG ile çiz: tepesi açık beyaz halka, alttan dalgalanarak dolan lime dolgu, 3D gövde (arka elips + yan yüzey), iki yandan çizilip tepede birleşen beyaz kulp, anahtar deliği, klik anındaki parlama, bekleme döngüsündeki ışık yansıması.
   - Motion blur: @remotion/motion-blur paketindeki CameraMotionBlur ile; 10 örnek, shutterAngle yaklaşık 288. Bekleme videosunda hareket yavaş olduğu için motion blur kapalı olsun, loop dikişi bozulmasın.
   - Bloom: şekillerin etrafında yumuşak ışık olsun; eskizdeki gibi bulanık bir kopya arkaya yerleşsin. Lime rengin kendisi açılmasın, ışık sadece dışarıda görünsün.
   - Renkler: arka plan #000000; lime yüz geçişi #ECFF8C → #DEFE52 → #C9E644; kenar ve kulp beyaz; gövde yanı #4c5913 → #9db234; anahtar deliği #0b0b0b.

3. ÖNEMLİ: Kilidi tekrar kullanılabilir bir bileşen olarak yaz.
   Kilit çizimini ayrı bir "Lock" bileşeni yap. Props: merkez, yarıçap, derinlik, dönüş açısı (yaw), x/y esneme, kulp yüksekliği, kulp çizim ilerlemesi, kulp şeffaflığı, halkadaki açıklık açısı, anahtar deliği ölçeği ve dönüş açısı, anahtar deliğinin lime yanması, yüzeydeki dalga halkası, parlama, dolgu seviyesi, dalga şiddeti, ışık yansıması. Sonraki işlerde alıcının "kapsül açılışı" ve "bekleme ekranı" videoları bu bileşeni kullanacak.

4. Remotion Studio'yu başlat ve bana önizleme linkini ver.

5. İki videoyu render et:
   - out/single-kilit.mp4 ve out/single-kilit-bekleme.mp4
   - H.264 codec, yuv420p piksel formatı, yüksek kalite (crf 16 civarı), ses kanalı olmasın.

6. Ekran görüntüsü alma. Kontrolü Studio linkinden kendim yapacağım.

RAPOR
Kısa tut. Sadece şunları yaz: Studio önizleme linki, render edilen iki dosyanın yolu ve boyutu, oluşturulan ve değiştirilen dosyaların listesi.
