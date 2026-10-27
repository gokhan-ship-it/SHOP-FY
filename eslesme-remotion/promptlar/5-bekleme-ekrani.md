Bu klasörde "kapsul-bekleme-ekrani.html" adında bir animasyon eskizi var. Bunu birebir aynı görünecek şekilde, bu klasördeki mevcut Remotion projesine yeni composition'lar olarak ekle. Uygulama projeme dokunma.

AMAÇ
Kapsül henüz açılmaya hazır değilken alıcının bekleme ekranındaki kilit animasyonları. Ekrandaki zaman halkası, geri sayım, yazılar ve bildirimler uygulamanın kendisi tarafından çizilecek; videoda sadece kilit ve onun animasyonları olacak.

VİDEO AYARLARI
1080x1920 piksel (dikey), 30 fps. Eskizdeki 540x960'lık koordinatları 2 ile çarp. Kilidin boyutu ve konumu SingleHazirLoop ile birebir aynı olmalı ("Lock" bileşeni; 540x960 ölçeğinde yarıçap 100, kalınlık 30, merkez (270, 470)). Çünkü süre dolunca uygulama bu ekrandan SingleHazirLoop'a geçecek.

COMPOSITION'LAR (hepsi 60 kare; bekleme döngüsünün tam bir turu)
a) "BeklemeLoop": kilit hafifçe sağa sola dönüp süzülüyor, yüzeyinden ışık yansıması geçiyor. Loop.
b) "Son24SaatLoop": aynı döngü + kilit saniyede bir nabız gibi atıyor ve etrafına soluk lime bir halka yayılıyor. Loop. (Eskizde "Son 24 saat" seçeneği.)
c) "HenuzDegil": bekleme döngüsünün bir turu + 0. karede başlayan "henüz değil" tepkisi: kilit başını sallar gibi sağa sola sallanıyor, kulp tıkırdıyor. (Eskizde "Bilekliği erken okut".)
d) "AniEklendi": bekleme döngüsünün bir turu + 0. karede başlayan damla: lime bir damla yandan süzülüp anahtar deliğinden içeri giriyor, delik bir an lime yanıyor, yüzeyde dalga halkası ve dışarı doğru ritim halkası çıkıyor, kilit hafifçe esniyor. (Eskizde "Gönderen anı ekledi".)

ÖNEMLİ
- Eskizdeki "Süre dolsun" için video yapma; uygulama o anda SingleHazirLoop'a geçecek.
- HenuzDegil ve AniEklendi uygulamada BeklemeLoop'un yerine bir tur oynayıp tekrar BeklemeLoop'a dönecek. Bu yüzden bu iki videonun ilk karesi BeklemeLoop'un ilk karesiyle aynı olmalı, son karesinden de BeklemeLoop'un ilk karesine atlamadan geçilmeli. BeklemeLoop ve Son24SaatLoop'ta da son kareden ilk kareye dönüşte atlama olmamalı. Bunların hepsini kodla doğrula.
- Motion blur: HenuzDegil ve AniEklendi'de açık; BeklemeLoop ve Son24SaatLoop'ta kapalı (hareket yavaş, döngü dikişi bozulmasın).
- Zaman halkası, geri sayım, "Ayşe'den sana", "Kapsülün kilitli", tarih, uyarı ve bildirim yazıları videoya girmeyecek.

GENEL KURALLAR
- Eskizdeki çizim mantığı kare numarasına bağlı saf fonksiyonlardan oluşuyor. Zamanlamaları, easing fonksiyonlarını ve yay (spring) değerlerini değiştirmeden aynen taşı; kare numarasını useCurrentFrame() ile al.
- Kilidi çizmek için daha önce yazdığın "Lock" bileşenini kullan. Gerekirse bileşene anahtar deliğinin lime yanması ve yüzeydeki dalga halkası için prop ekle.
- Şekilleri keskin olması için SVG ile çiz.
- Motion blur: @remotion/motion-blur paketindeki CameraMotionBlur ile; 10 örnek, shutterAngle yaklaşık 288.
- Bloom: şekillerin etrafında yumuşak ışık olsun; eskizdeki gibi bulanık bir kopya arkaya yerleşsin. Lime rengin kendisi açılmasın, ışık sadece dışarıda görünsün.
- Renkler: arka plan #000000; lime yüz geçişi #ECFF8C → #DEFE52 → #C9E644; kenar ve kulp beyaz; gövde yanı #4c5913 → #9db234; anahtar deliği #0b0b0b.
- Çıktılar: H.264 codec, yuv420p piksel formatı, yüksek kalite (crf 16 civarı), ses kanalı olmasın.
- Remotion Studio'yu başlat ve bana önizleme linkini ver.
- Ekran görüntüsü alma. Kontrolü Studio linkinden kendim yapacağım.

ÇIKTILAR
out/bekleme-loop.mp4, out/son-24-saat-loop.mp4, out/henuz-degil.mp4, out/ani-eklendi.mp4

RAPOR
Kısa tut. Sadece şunları yaz: Studio önizleme linki, render edilen dosyaların yolu ve boyutu, oluşturulan ve değiştirilen dosyaların listesi.
