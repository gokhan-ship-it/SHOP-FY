# Ölçüm betikleri

Bu betikler yalnızca okur. Mağazada ve temalarda hiçbir şeyi değiştirmezler. Hepsi Playwright (WebKit) ile temiz bir tarayıcı oturumunda çalışır.

| Betik | Ne yapar |
|---|---|
| `goruntu.js` | Ekran görüntüsü alır. Önizleme çubuğunu gizlemez. Her görüntünün temasını, sunucunun döndürdüğü tema numarasını ve önizleme çubuğu durumunu `goruntuler.json` dosyasına yazar. |
| `etiket.py` | Görüntülerin üstüne "TEMA: …" şeridini ekler ve `*-etiketli.png` dosyası üretir. Yayındaki tema yeşil, öteki temalar sarı şeritle işaretlenir. |
| `medya.js` | GemPages sayfalarında ağ isteklerini ve DOM'daki medyayı toplar. |
| `kilavuz.js`, `domtel.js` | Kılavuz sayfalarının bölüm dökümünü ve render edilmiş DOM'unu çıkarır. |
| `stil.js`, `fontbul.js` | Hesaplanmış yazı tipi ve renk değerlerini ölçer, yüklenen fontları listeler. |
| `metin.js` | Bir sayfanın içerik metninin yayındaki ve taslak temada görünüp görünmediğini ölçer. |
| `gorunurmu.js` | Belirli medya dosyalarının ekranda görünür olup olmadığını kontrol eder. |
| `betik.js` | Yayındaki ve taslak temada yüklenen üçüncü taraf betikleri karşılaştırır. Sonuç `betik-karsilastirma.json` dosyasında. |
| `engelli.js` | GemPages benzetimi yapar: tarayıcıda yalnızca GemPages dosyalarını engeller. Sitede hiçbir şey değişmez. |
