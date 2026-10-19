# Prizma – 2. tur (19.10.2026)

Tema değişiklikleri yalnızca "Prizma - 2026-10-19" (189250076992, UNPUBLISHED) kopyasında. Yayındaki tema (189247717696) değişmedi: başta ve sonda 699 dosya, MD5 listesi birebir aynı. B (Noir arşivi) uygulanmadı.

## 1. Ürün bilgileri
- Üç Prizma ürünü 13:06'da Shopify Web'den ACTIVE yapılmış (benim değişikliğim değil); durumlarına dokunulmadı.
- **Prizma ve Prizma Couple, açıklama:** "Ölçü: [UZUNLUK – BELİRLENECEK]" → "Ölçü: 21 cm"
- **Prizma ve Prizma Couple, Ölçü alanı (custom.boyutlar):** "Ölçü: [UZUNLUK – BELİRLENECEK]" → "Ölçü: 21 cm"
- **Prizma + Chloe:**
  - Açıklamada yer tutucu yoktu.
  - Ölçü alanında "Prizma: [UZUNLUK – BELİRLENECEK]" → "Prizma: 21 cm" oldu. "Chloe: 17+5 cm (ayarlanabilir)" değişmedi.
- **Kalan yer tutucu:** Yok. Açıklamalar, meta alanlar, SEO ve görsel alt metinleri tarandı.
- **Stok:** Tek lokasyon var, "Ogün Sokak"; Noir'in stoğu da burada tutuluyor.
  - Prizma: 250
  - Prizma + Chloe: 461, Noir + Chloe ile aynı.
  - Prizma Couple: 0'da bırakıldı. Noir Couple'da adet −62; eksi stok kopyalanmadı.
  - Stok takibi açık ve "stok bitince satmaya devam" ayarı üçünde de Noir eşleriyle zaten aynıydı.

## 2. Yapışkan sepete ekle çubuğu
- **Gösterim:** Çark aktifken çubukta tek satır var: rozet solda, yanında indirimli fiyat (#0A0A0A, 700) ve üstü çizili normal fiyat (#5C5C57, 400).
  - Tutarlar kısa biçimde yazılıyor ("1.899 TL"); bu, tt-para'daki "sade" kuralıyla aynı.
  - Temanın kendi fiyat satırı bu sırada gizleniyor.
- **Ölçüler:**
  - 390 px: rozet 11.5 px.
  - 360 px ve masaüstü: rozet 10.5 px, fiyatlar 15/12 px.
  - Çubuğun yüksekliği kodsuz haliyle aynı (101 → 102 px).
  - Buton aynı boyutta (telefonda 44×44, masaüstünde 141×51) ve taşma yok.
- **Çark yokken:** Çubuk bugünkü gibi. Sayaç bitince sayfa yenilenmeden eski haline dönüyor.
- **Varyant değişince:** Fiyat doğru varyanta geçiyor.
  - Bu sırada eski bir hata bulundu ve kopyada düzeltildi: çark varken varyant değişince ürün sayfasındaki indirimli fiyat ilk varyantta kalıyordu. Hata yayındaki temada da var.
- **Couple çubuğu:** "Çark indirimi −500 TL" satırı değişmedi.
- **Değişen dosyalar:**
  - `snippets/tt-fiyat-kod.liquid`: çubuktaki kopya ve CSS.
  - `assets/taksit-tablosu.js`: fiyat kabı da izleniyor; çubukta kısa biçim kullanılıyor.

## 3. Hamburger menü
- **Yeniden üretilemedi.**
  - Chromium'da iPhone 13 emülasyonu (390×844, dokunmatik), Android 390/360, 768/1024/1280/1440 genişlikleri denendi.
  - Sayfalar: ana sayfa, Erkek, Prizma ürün, iki anlatım sayfası; hem kopya hem yayındaki tema.
  - Ek koşullar: aşağı kaydırılmış sayfa, sayfa yüklenirken dokunma, çark aktif, menüden gezinme, geri tuşu, products_preview bağlantıları.
  - Hepsinde menü açıldı, sayfa kaymadı, X ve Esc ile kapandı, 8 bağlantının hepsi 200 döndü.
- **WebKit bu ortamda yok;** gerçek Safari denenemedi.
- **Bulgular:**
  - Buton `type="button"`; bağlantı ya da çapa değil.
  - Yeni bir JS hatası yok.
  - Menünün CSS'i yükleniyor (`position: fixed`).
  - Bu çalışmadaki değişiklikler menü dosyalarına dokunmuyor; tt-menu ve tt-baslik kopyada ve yayında aynı.
- **Olası sebep (doğrulanamadı):** Tema düzenleyicide (Özelleştir) seçim aracı açıkken tıklama menüye gitmeyip "TT Başlık" bölümünü seçiyor. Ana sayfa, koleksiyon ve anlatım sayfalarında bu bölümün sarmalayıcısı sayfanın en altında duruyor (çubuk sabit). Düzenleyici bu yüzden sayfayı en alta kaydırıyor olabilir. Durum yayındaki temada da aynı.
- **Düzeltme yapılmadı.**

## 4. Genel kontrol
- **Çark rozeti:** Ana sayfa, koleksiyonlar, ürün sayfası, varyant penceresi ve yapışkan çubukta 3 genişlikte çalışıyor. Sayaç bitince sayfa yenilenmeden kalkıyor (33 → 0).
- **Couple modu:** Prizma + Auron sepete eklendi; "İkinci Üründe %50 İndirim" uygulandı (1.199,50 TL). Yalnızca test tarayıcısının sepeti kullanıldı, sipariş oluşturulmadı.
- **JS hataları:** Yeni hata yok. Yalnızca `cart.js` `onCartRefresh` "reading 'open'" hatası çıkıyor; bu hata yayındaki temada da aynen var.

## Önizleme
- Ana sayfa: https://texttonext.com/?preview_theme_id=189250076992
- Erkek: https://texttonext.com/collections/zaman-kapsulu-bileklik?preview_theme_id=189250076992
- Prizma: https://texttonext.com/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik?preview_theme_id=189250076992
- Prizma + Chloe: https://texttonext.com/products/prizma-chloe-couple-zaman-kapsulu?preview_theme_id=189250076992

Meta taraması ve B hazırlık raporu: `prizma/PRIZMA-A-RAPOR.md`.
