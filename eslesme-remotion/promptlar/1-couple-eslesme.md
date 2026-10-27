Bu klasörde "eslesme-animasyon-v2.html" adında bir animasyon eskizi var. Bunu birebir aynı görünecek şekilde bir Remotion projesine çevirmeni istiyorum.

AMAÇ
React Native ile yazılmış mobil uygulamamdaki couple kapsül eşleşme ekranında sürekli loop olarak oynayacak bir video üretmek. Bu ayrı bir proje; uygulama projeme dokunma.

YAPILACAKLAR
1. Bu klasörde yeni bir Remotion projesi kur (güncel Remotion sürümü, TypeScript, boş şablon). Uygulama projeme dokunma; bu ayrı bir proje.

2. HTML dosyasındaki animasyonu birebir aktar:
   - Dosyadaki çizim mantığı kare numarasına bağlı saf fonksiyonlardan oluşuyor (state, drawScene, render, shift). Zamanlamaları, easing fonksiyonlarını, yay (spring) değerlerini ve OFF = 15 kaydırmasını hiç değiştirmeden aynen taşı. Kare numarasını useCurrentFrame() ile al.
   - Video ayarları: 30 fps, 120 kare (4 saniye), 1080x1080 piksel.
   - İki ayrı composition oluştur: "EslesmeA" (Çarpışma varyantı) ve "EslesmeB" (Plak gibi dönüş varyantı).
   - Şekilleri keskin olması için SVG ile çiz. Lens ile kalp arasındaki dönüşümü, HTML'deki aynı nokta örnekleme mantığıyla (lensPt, heartPt, localPt) path olarak üret.
   - Motion blur: @remotion/motion-blur paketindeki CameraMotionBlur ile yap; HTML'deki gibi 10 örnek ve yaklaşık 0.8 karelik bulanıklık (shutterAngle yaklaşık 288).
   - Bloom: şeklin etrafında yumuşak ışık olsun; HTML'deki gibi bulanık bir kopya şeklin arkasına yerleşsin. Lime dolgunun kendi rengi açılmamalı, ışık sadece dışarıda görünmeli.
   - Efektler (motion blur, jöle, pop parçacıkları, ritim halkaları, bloom) composition prop'u olarak aç/kapa yapılabilsin; hepsi varsayılan olarak açık.
   - Renkler: arka plan #000000, lime #DEFE52, halkalar beyaz.

3. Loop kontrolü: 119. kareden sonra 0. kareye geçişte hiçbir atlama olmamalı. Kare 0 ile döngünün bir sonraki başlangıcı birebir aynı olmalı. Bunu kodla doğrula.

4. Remotion Studio'yu başlat ve bana önizleme linkini ver.

5. İki varyantı da render et:
   - out/eslesme-A.mp4 ve out/eslesme-B.mp4
   - H.264 codec, yuv420p piksel formatı (iOS ve Android uyumu için), yüksek kalite (crf 16 civarı), ses kanalı olmasın.

6. Ekran görüntüsü alma. Kontrolü Studio linkinden kendim yapacağım.

RAPOR
Kısa tut. Sadece şunları yaz: Studio önizleme linki, render edilen iki dosyanın yolu ve boyutu, oluşturulan ve değiştirilen dosyaların listesi.
