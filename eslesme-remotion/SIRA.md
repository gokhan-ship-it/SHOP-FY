# Remotion paketi · nasıl kullanılır

## 1. Dosyaları yerleştir
Bu klasördeki her şeyi (5 adet .html eskiz ve "promptlar" klasörü) Remotion projesinin olduğu klasöre koy. Couple eşleşme videoları için kurduğun klasör, yani Claude Code'u açtığın yer. Uygulama projesinin klasörüne koyma.

## 2. Sırayla yaptır
Claude Code'a her adımda şunu yazman yeterli:
"promptlar/3-couple-acilis-kalp-tuneli.md dosyasındaki talimatları uygula"
(dosya adını adıma göre değiştir). Bir adım bitip videoları kontrol etmeden sonrakine geçme.

| Sıra | Prompt | Eskiz | Çıkacak videolar |
|---|---|---|---|
| 1 | 1-couple-eslesme.md | eslesme-animasyon-v2.html | eslesme-A.mp4, eslesme-B.mp4 (bunu yaptın) |
| 2 | 2-single-kilit.md | single-kilit-final.html | single-kilit.mp4, single-kilit-bekleme.mp4 |
| 3 | 3-couple-acilis-kalp-tuneli.md | kapsul-acilis-kalp-tuneli.html | couple-acilis-giris.mp4, kalp-tuneli-loop.mp4, kalp-tuneli-cikis.mp4 |
| 4 | 4-single-acilis.md | single-acilis-v2.html | single-hazir-loop.mp4, single-acilis.mp4 |
| 5 | 5-bekleme-ekrani.md | kapsul-bekleme-ekrani.html | bekleme-loop.mp4, son-24-saat-loop.mp4, henuz-degil.mp4, ani-eklendi.mp4 |

Sıra önemli: 2. adımda yazılan kilit parçası 4 ve 5'te, 3. adımda yazılan kalp tüneli de 4'te kullanılıyor.

## 3. Hangi video nerede oynayacak
| Ekran | Videolar |
|---|---|
| Couple eşleşme | eslesme-A veya eslesme-B (loop) |
| Gönderen kapsülü kilitliyor (single) | single-kilit → single-kilit-bekleme (loop) |
| Alıcı, kapsül kilitli | bekleme-loop (loop) · son 24 saatte son-24-saat-loop · erken okutunca henuz-degil · anı eklenince ani-eklendi |
| Alıcı, açılmaya hazır | single-hazir-loop (loop) |
| Single açılış | single-acilis → kalp-tuneli-loop (yükleme sürdükçe) → kalp-tuneli-cikis → galeri |
| Couple açılış | couple-acilis-giris → kalp-tuneli-loop (yükleme sürdükçe) → kalp-tuneli-cikis → galeri |

## 4. Sonraki adım
Videolar bitince uygulamaya bağlama ayrı bir iş. O aşamada uygulamanın hangi bilgileri kullanacağını (kapsül durumu, tarihler, sunucu saati, bileklik kimliği vb.) içeren ayrı bir prompt yazılacak.
