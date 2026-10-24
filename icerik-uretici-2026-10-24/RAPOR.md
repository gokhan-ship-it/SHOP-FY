# "İçerik üreticisi ol" başvuru sayfası – rapor (24.10.2026)

## Özet

- Sayfa kopya temada hazır. **Önizleme:** https://texttonext.com/pages/icerik-uretici?preview_theme_id=189413589312
- Yayındaki temaya dokunulmadı. MD5 listesi başta ve sonda aynı: 703 dosya, 0 fark.
- Hiçbir tema yayına alınmadı.
- Ürün, indirim, uygulama, menü ve takip kodlarına dokunulmadı.
- Spam koruması açık ve çalışıyor (bkz. 4).
- **Test başvurusu otomatik olarak gönderilemedi.** Spam koruması, otomatik tarayıcıya resimli doğrulama gösterdi. Korumayı aşmaya çalışmadım. 1 dakikalık elle test adımları 5. bölümde.

## 1. Temalar

- 19 tema var.
- **Yayındaki tema:** "Hiz paketi 1 - 2026-10-23" (189388095808).
- **Kopya:** "Icerik uretici - 2026-10-24" (189413589312). Bugün yayındaki temadan kopyalandı. Bütün tema değişiklikleri yalnızca bunda yapıldı.

**Yayındaki temanın MD5 karşılaştırması**

| | Dosya | Eklenen | Silinen | Değişen |
|---|---|---|---|---|
| Başta (09.00) | 703 | – | – | – |
| Sonda (10.12) | 703 | 0 | 0 | 0 |

En yeni dosya tarihi iki listede de 23.10.2026 19.48. Kayıtlar `veri/canli-md5-*.json` dosyalarında.

## 2. Oluşturulanlar

**Sayfa (mağaza)**
- Başlık "İçerik üreticisi ol", adres `/pages/icerik-uretici`, şablon `page.icerik-uretici`.
- Görünür (yayında). Hiçbir menüye eklenmedi; Ana Menü, Footer menu ve Yasal menüleri kontrol edildi.
- Arama motoru açıklaması, sayfadaki giriş metniyle aynı.

**Kopya temada eklenen ve değişen dosyalar**

| Dosya | Durum | Ne işe yarıyor |
|---|---|---|
| `sections/tt-icerik-uretici.liquid` | yeni | Sayfanın tamamı: giriş, adımlar, kutular, form, onay mesajı |
| `snippets/tt-icerik-uretici-onay.liquid` | yeni | Onay mesajındaki küçük neon tik ikonu |
| `templates/page.icerik-uretici.json` | yeni | Sayfa şablonu; bütün metinler birebir ve tema editöründen değiştirilebilir |
| `sections/tt-footer-satir.liquid` | yeni | Footer'daki ince link satırı |
| `sections/footer-group.json` | değişti | Yalnızca yeni satır eklendi; mevcut bölümlerin hiçbir ayarı değişmedi (dosya farkıyla kontrol edildi) |

Yüklenen beş dosyanın MD5'i, yüklemeden sonra Shopify'daki kopyayla birebir eşleşti.

**KVKK linki:** "KVKK aydınlatma metnini" yazısı `/policies/privacy-policy` adresine gidiyor (yeni sekmede açılır). Bu sayfanın başlığı "Gizlilik Politikası ve KVKK Aydınlatma Metni". Aynı metin `/pages/sozlesmeler-ve-politikalar` sayfasında da var.

**Dikkat (yayındaki tema):** Sayfa mağazada yayında, ama yayındaki temada bu şablon yok. Bu yüzden `texttonext.com/pages/icerik-uretici` adresi şu an yalnızca başlığı gösteriyor. Yayındaki sitede bu adrese giden hiçbir link yok (kontrol edildi). Kopya tema yayına alındığında sayfa ve footer linki birlikte görünür.

## 3. Footer

**Footer grubundaki bölümler**

| Bölüm | Durum |
|---|---|
| Newsletter ("İlk siz keşfedin" + e-posta kutusu) | açık |
| TT Footer (ÜRÜNLER, NASIL ÇALIŞIR, YARDIM, YASAL; iletişim butonları; sosyal; telif) | açık |
| Eski "Footer" | kapalı |
| Eski "Footer copyright" | kapalı |

Mevcut başlıkların hiçbiri bu linke uygun değildi. Bu yüzden newsletter'ın hemen altına, TT Footer'ın üstüne ince bir satır eklendi:
- siyah zemin, üstte ince #262624 çizgi
- beyaz "İçerik üreticisi ol" yazısı, sağda ince ok
- 56px yükseklik

Diğer footer içeriği aynı kaldı. Hamburger menüye link eklenmedi.

## 4. Form ve e-posta

**Kurulum ve alanlar**
- Form Shopify'ın kendi iletişim formuyla kuruldu (`{% form 'contact' %}`).
- Alanlar e-postada şu sırayla gelir:

| Sıra | Alan adı |
|---|---|
| 1 | `contact[subject]` |
| 2 | `contact[Ad soyad]` |
| 3 | `contact[Instagram]` |
| 4 | `contact[TikTok]` |
| 5 | `contact[Takipçi]` |
| 6 | `contact[Ürün]` |
| 7 | `contact[Telefon]` |
| 8 | `contact[email]` |
| 9 | `contact[Onay]` (onay kaydı) |

**Konu**
- Gönderirken konu alanı otomatik olarak "İçerik üretici başvurusu – <Ad soyad>" olur.
- Shopify'ın bu alanı e-postanın konu satırına koyup koymadığı belgelerde yazmıyor. Koymazsa e-postanın ilk satırında görünür.
- Filtreyi bu yüzden "konuda" değil "içinde geçen kelimeler" üzerinden kuruyoruz. İki durumda da çalışır.

**Gittiği adres:** info@texttonext.com (mağazanın iletişim e-postası). Bu adres Google Workspace (Gmail) üzerinde. Mağaza e-postası değiştirilmedi.

**Spam koruması: açık.**
- Shopify artık reCAPTCHA yerine hCaptcha kullanıyor. Koruma sayfada yükleniyor ve forma bağlanıyor.
- Otomatik test tarayıcısı göndermeye çalışınca resimli doğrulama çıktı ve gönderim durdu.
- Forma tarayıcı dışından doğrudan gönderim de Shopify/Cloudflare tarafından engellendi (403, "Verifying your connection").
- Gerçek ziyaretçilerin çoğu doğrulamayı görmez.

### Başvuruların [BAŞVURU E-POSTASI] adresine gitmesi

**(a) Önerim: Gmail filtresiyle yönlendirme.** Ücretsiz, temaya veya uygulamaya dokunmaz. info@texttonext.com hesabında:

1. Gmail → sağ üstte dişli → **Tüm ayarları görün** → **Yönlendirme ve POP/IMAP** sekmesi.
2. **Yönlendirme adresi ekle** → [BAŞVURU E-POSTASI] yazın → İleri → Devam.
3. [BAŞVURU E-POSTASI] kutusuna Google'dan onay e-postası gelir. Oradaki linke tıklayın.
4. Ayarlar sayfasına geri dönün. "Yönlendirmeyi devre dışı bırak" seçili kalsın; tüm e-postaları yönlendirmeyi açmayın. Sayfanın altında **Değişiklikleri kaydet**.
5. Gmail arama kutusunun sağındaki **filtre simgesine** tıklayın. **İçerdiği kelimeler** kutusuna tırnaklarla birlikte `"İçerik üretici başvurusu"` yazın.
6. **Filtre oluştur** → **Şuna yönlendir:** [BAŞVURU E-POSTASI].
7. İsterseniz **Etiket uygula: İçerik üretici** da işaretleyin.
8. **Filtre oluştur**.
9. 5. bölümdeki testle deneyin.

Not: Gmail "otomatik yönlendirme kapalı" derse Google Workspace yöneticisinin açması gerekir. Yer: Yönetici paneli → Uygulamalar → Google Workspace → Gmail → Son kullanıcı erişimi → Otomatik yönlendirme. Alternatif olarak yönetici, aynı kelimeyle bir "yönlendirme (routing)" kuralı da kurabilir.

**(b) Diğer yollar (kurulmadı, yalnızca öneri)**
- **Form uygulaması** (ör. Shopify App Store'daki form oluşturucular): çoğunda her form için ayrı alıcı e-posta tanımlanabiliyor. Ancak:
  - Uygulama eklemek sayfaya ek kod getirir.
  - Başvuru verisi uygulama firmasında saklanır; KVKK metninde bunun belirtilmesi gerekebilir.
- **Shopify Forms:** daha çok bülten ve müşteri kaydı için tasarlanmış. Başvuruları müşteri kaydı olarak tutar. Bu iş için (a) daha uygun.
- **Temada güvenli bir alternatif yok.** Shopify iletişim formunun alıcısı temadan değiştirilemiyor; bu yüzden (a)'yı öneriyorum.

## 5. Test başvurusu: elle gönderilmesi gerekiyor (1 dakika)

Otomatik gönderim spam korumasına takıldı (bkz. 4). Bu yüzden gelen e-postanın içeriğini doğrulayamadım; ben info@texttonext.com kutusunu da göremiyorum.

**Test adımları:**
1. Telefonda önizleme linkini açın.
2. "Hemen başvur"a dokunun.
3. Formu doldurun:
   - Ad soyad: `TEST – silinebilir`
   - Instagram ve TikTok: `@test_silinebilir`
   - Takipçi: `1–10 B`
   - Ürün: `Single`
   - Telefon: `0500 000 00 00`
   - E-posta: kendi adresiniz
4. Onay kutusunu işaretleyip gönderin.

**Beklenen sonuç:**
- Sayfada siyah onay kutusu görünür.
- info@texttonext.com'a Shopify'ın iletişim formu e-postası gelir. İçinde alanlar adlarıyla listelenir: "İçerik üretici başvurusu – TEST – silinebilir", Ad soyad, Instagram, TikTok, Takipçi, Ürün, Telefon, E-posta, Onay.

E-posta gelince konu satırını bana yazarsanız konu ve filtre notunu kesinleştiririm.

Not: Gönderdiğiniz cihazda onay mesajı 30 gün boyunca form yerine görünür; istenen davranış bu. Formu yeniden görmek için gizli sekme kullanın.

## 6. Otomatik kontroller (kopya tema önizlemesi)

Bütün kontrollerde takip istekleri yakalanıp iptal edildi; gerçek veri gönderilmedi.

**Görünüm**

| | 390 | 360 | 1440 |
|---|---|---|---|
| Yatay taşma | yok | yok | yok |
| İçerik genişliği | 350px | 320px | 640px, ortalı |
| Düzen | tek sütun | tek sütun | tek sütun |

- **Renkler ve yazılar:** başlık Poppins 700, telefonda 32px, masaüstünde 40px, harf aralığı -1px. Satırlar beyaz / #8A8A85.
- **Diğer renkler:**
  - etiket 11px, harf aralığı 1.3px, #8A8A85
  - açıklama #A3A39E
  - 3. adım dairesi #D6FF00 + siyah; diğer daireler #0A0A0A + beyaz
  - form başlığı 24px, ikinci satır #8A8A85
  - "Başvuruyu gönder" siyah, tam yuvarlak, 50px
  - "Hemen başvur" beyaz zemin, siyah yazı
- **Dokunma alanları (en küçük):**
  - hap butonlar 78×44
  - Single/Couple kartları 140×88 (360px'te)
  - metin kutuları 50px
  - onay kutusu 44×44
  - gönder 50px
  - footer linki 56px
- **360px notu:** Bilgi kutularının başlıkları ("Ücretsiz ürün", "Sana özel kod") dar ekranda iki satıra iniyor. Kutular tasarım dilindeki "2×2 yan yana" kuralına göre yapıldı. İsterseniz 360px'te alt alta dizebilirim.

**İşlev (telefon)**
- "Hemen başvur" formu ekranın üstüne getiriyor ve imleci "Ad soyad"a koyuyor.
- **Boş gönderim:** 7 alanın altında kısa uyarılar çıktı, imleç ilk hatalı alana gitti, sunucuya hiçbir şey gitmedi. Uyarılar:
  - "Adını ve soyadını yaz."
  - "Takipçi aralığını seç."
  - "Devam etmek için onay kutusunu işaretle."
  - ve diğer zorunlu alanlar için benzerleri
- **Klavye:**
  - Tab tuşu takipçi grubuna geçiyor.
  - Ok tuşu "10–50 B"yi seçiyor ve odak çerçevesi görünüyor.
  - Boşluk tuşu "Single"ı seçiyor ve onay kutusunu işaretliyor.
- **Ekran okuyucu:**
  - Bütün alanların okunur adları var.
  - Seçimler gerçek radyo düğmesi: "Toplam takipçi sayın" grubu ve "Single Tek ürün, hediye" kartı.
  - Onay kutusu metniyle okunuyor; uyarılar alanlarla bağlantılı.
- **Gönderim sonrası:** Shopify başarılı gönderimden sonra sayfayı `?contact_posted=true` ile açıyor. Bu adreste:
  - siyah kutu, neon tik ve "Başvurun bize ulaştı. 3 gün içinde inceleyip dönüyoruz." görünüyor, form gizleniyor
  - sayfa iki kez yenilendikten sonra da mesaj kalıyor

**Konsol**
- Yeni sayfadaki konsol mesajları, karşılaştırma sayfası /pages/iletisim ile aynı türde.
- Hepsi iptal edilen takip isteklerinden ya da masaüstü önizleme çubuğundan geliyor.
- Yeni bölümden gelen hata yok.

**Analitik ve pikseller:** yeni sayfa diğer sayfalarla aynı olayları gönderiyor.

| Olay | Yeni sayfa | /pages/iletisim | Ana sayfa |
|---|---|---|---|
| Shopify page_viewed | var | var | var |
| Meta PageView | var | var | var |
| GA4 page_view | var | var | var |
| TikTok Pageview + LandingPageView | var | var | var |
| Google Ads dönüşüm isteği | var | var | var |

Meta, otomatik tarayıcıyı tanıdığında hiç istek göndermiyor (iki sayfada da). Bu yüzden PageView testi, tarayıcının otomasyon işareti gizlenerek tekrarlandı.

## 7. Dosyalar

| Dosya | İçerik |
|---|---|
| `veri/kontrol-1.json` | görünüm, konsol, takip ve etkileşim ölçümleri |
| `veri/meta-1.json` | piksel karşılaştırması |
| `veri/onay-1.json` | gönderim sonrası mesaj ve kalıcılık |
| `veri/basvuru-denemesi.json` | otomatik gönderim denemesi (spam koruması devreye girdi) |
| `veri/canli-md5-*.json` | yayındaki tema MD5 listeleri |
| `betikler/` | testlerde kullanılan betikler |

Tema dosyaları repoya eklenmedi; yalnızca kopya temada duruyor.
