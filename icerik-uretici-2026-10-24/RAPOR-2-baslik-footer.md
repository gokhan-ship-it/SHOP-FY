# İçerik üretici: başlık ve footer linki (24.10.2026)

## Özet

- İki değişiklik de sayfayı kurduğum kopya temada yapıldı: "Icerik uretici - 2026-10-24" (189413589312). Bu tema yayında değil.
- Hiçbir tema yayına alınmadı.
- Yayındaki tema "Hiz paketi 1 - 2026-10-23" değişmedi: MD5 listesi başta ve sonda aynı, 703 dosya, 0 fark.

## Önizleme linkleri

| Sayfa | Link | Ne görülür |
|---|---|---|
| İçerik üretici | https://texttonext.com/pages/icerik-uretici?preview_theme_id=189413589312 | yeni başlık + en altta footer linki |
| İletişim | https://texttonext.com/pages/iletisim?preview_theme_id=189413589312 | footer'ın tamamı + en altta link |
| Ana sayfa | https://texttonext.com/?preview_theme_id=189413589312 | footer'ın tamamı + en altta link |

## 1. Başlık

- Eski: "Hikâyeni anlat," / "kodunla kazan."
- Yeni: "Bir video çek." (beyaz) / "Her satıştan kazan." (#8A8A85)
- Boyut, kalınlık ve harf aralığı aynı: telefonda 32px, masaüstünde 40px, 700, -1px.
- Etiket, açıklama ve buton metinleri aynı kaldı.
- Uzun satır ("Her satıştan kazan.") 360px telefonda 298px tutuyor; alan 320px olduğu için tek satıra sığıyor.
- **SEO:** Sayfanın SEO başlığı ayrıca girilmemiş; sayfa adı "İçerik üreticisi ol" kullanılıyor. SEO açıklaması giriş açıklamasıyla aynı. İkisinde de eski başlık geçmiyor, bu yüzden değiştirilmedi.

## 2. Footer linki en altta

- "İçerik üreticisi ol" satırı newsletter'ın altından alındı. Artık footer'daki bütün içeriğin (newsletter ve TT Footer dahil) altında, sayfanın son satırı.
- Görünüş aynı: siyah zemin, beyaz yazı, sağda ince ok, 56px yükseklik.
- Diğer footer içeriğine dokunulmadı. Hamburger menüye link eklenmedi.
- **Ek: altta siyah boşluk.** Linkin altına 84px siyah boşluk eklendi (iPhone'larda ekranın alt kenarındaki güvenli alan da eklenir).
  - Neden: Sayfa en alta kaydırılınca ekranın altındaki yüzen butonlar linkin üstüne biniyordu. Ölçümde ana sayfada ve koleksiyonlarda, telefonda, soldaki "Nasıl çalışır?" butonu linkin yazı kısmını örtüyordu.
  - Şimdi link bu butonların 12px üstünde kalıyor.
  - Sepete ekle ve çark çubuklarının boşluğunu zaten temanın kendi alt düzeni ekliyor.

## Değişen dosyalar (yalnızca kopya temada)

| Dosya | Değişiklik |
|---|---|
| `templates/page.icerik-uretici.json` | başlığın iki satırı |
| `sections/tt-icerik-uretici.liquid` | yalnızca başlık alanlarının varsayılan metinleri (bölüm yeniden eklenirse yeni başlık gelsin diye) |
| `sections/footer-group.json` | footer satırının sırası en sona alındı; başka ayar değişmedi |
| `sections/tt-footer-satir.liquid` | açıklama notu ve alttaki boşluk |

Yükleme sırasında `tt-footer-satir.liquid` dosyasına bir kez yanlışlıkla boş bir yer tutucu metin yazıldı. Dosya yaklaşık 1 dakika içinde doğru hâliyle yeniden yüklendi ve MD5'i kontrol edildi. Bu yalnızca kopya temayı etkiledi; yayındaki site etkilenmedi.

## Kontrol sonuçları

390, 360 ve 1440 genişlikte; takip istekleri engellendi.

| Kontrol | Sonuç |
|---|---|
| Başlık | iki satır, yeni metinler, renkler beyaz / #8A8A85 |
| Footer sırası | newsletter → TT Footer → İçerik üreticisi ol |
| Linkin altında görünen başka öğe | yok (satırın alt kenarı = sayfanın sonu) |
| Link adresi | `/pages/icerik-uretici` |
| Tıklama | /pages/iletisim'den tıklayınca yeni sayfaya gidiyor |
| Dokunma alanı | 56px |
| Konsol | yeni hata yok (yalnızca engellenen takip isteklerinin bilinen mesajları) |

Shopify Inbox'ın sağ alttaki sohbet butonu telefonda hâlâ okun üstüne biniyor. Bu buton bir sonraki işte (WhatsApp "Bize ulaşın") kaldırılacak. Yeni WhatsApp butonu linkin altındaki boşluğa sığacak şekilde yerleşecek.

Veriler: `veri/baslik-footer/`.
