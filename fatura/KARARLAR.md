# Kullanıcıyla netleşen kararlar

CLAUDE.md'deki kurallara ek olarak kullanıcının verdiği cevaplar:

1. **Fatura tarihi:** Siparişin Shopify'a düştüğü an (sipariş oluşturulma zamanı, Türkiye saati).
2. **Oran:** Her fatura çalıştırmasından önce kullanıcıya sorulur, oranı kullanıcı belirler.
3. **Adet:** Aynı üründen 2 tane alındıysa faturaya adet 2 yazılabilir.
4. **Vergi numarası olmayan bireysel müşteri:** TCKN olarak `11111111111` (11 adet 1) kullanılır.
5. **Test siparişi:** Olmayacak, ayrıca kontrol gerekmez.
6. **Kodun yeri:** Tema deposu içinde `fatura/` klasörü.
7. **Ürün kartları:** Önce A (mevcut kartlara kod yazmak) seçildi, sonra B'ye dönüldü. Mevcut 844 kart model kısaltmalı (NOT20101 vb.) ve markasız bir bileklik/kolye kartı yok. CLAUDE.md'deki 7 kart yeni açılır (`urun-olustur.js`), eski kartlara dokunulmaz. Stok takibi kapalı; kullanıcı Paraşüt'te model bazlı satış takip etmiyor.
8. **Çelik (316L) varyantlar:** Gümüş ürünler gibi ikiye bölünür (%20 işçilik + %0 gümüş). Kullanıcı: çelik ürünlerde gümüş parça var, uygulama vergi açısından doğru.
9. **Varyant eşlemesi (`urun-kodlari.json`, 78 varyant):** Text To Next kataloğundan (Shopify) çıkarıldı.
   - BLK: Gourmet, Gemici, Kral, Nora, Velor, Auron, Astor, Luna, Noir, Chloe, Chloe Gold, Santorin, Santorin Gold, Nova + Couple sürümleri
   - KLY: White, Rose, Gold, Rose Pink, Ocean Blue, Baget (arşivde), Taşlıkilit White/Gold/Rose, Vantablack, Lumin, Aurora, Aurora çocuk + Couple sürümleri
   - CRM: Eight Stars White, Infinity Glow + Couple sürümleri
   - KZK: Klasik Zaman Kapsülü, Red Velvet
   - Bilerek eşlenmedi, sipariş atlanır: Premium Hediye Kutusu, Ek Paketler, Event Zaman Kapsülü (2 ürün), Zaman Kapsülü Künye, COUPLE ÜRÜN OLUSTUR ve hazır "X + Y Couple Zaman Kapsülü" setleri (tek varyantta iki kategori; nasıl bölüneceği sorulacak).
10. **Shopify erişimi:** Dev Dashboard uygulaması "Parasut Fatura", client credentials (token 24 saat). `.env`: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`. İzinler: `read_orders`, `read_customers`, `read_products` (varyant no'su için gerekli).
11. **Siparişlerden görülenler (Eylül 2026):**
    - Kargo 99 TL ayrı satır olarak geliyor. 177 no'lu fatura (1.898 = 2.299 − 500 çark + 99 kargo) kargonun ürün satırlarına gömüldüğünü gösteriyor. Kod kargoyu tek kategorili siparişte o kategoriye ekliyor; çok kategorili + kargolu sipariş atlanıyor (kullanıcıya teyit ettirilecek).
    - Çark kodları (`WLO...`) ve couple %50 indirimi satır indirimi olarak geliyor; kod `originalTotal − discountAllocations` kullanıyor.
    - Fatura tarihi = siparişin Türkiye saatine göre günü.
12. **Aşama 1 onayı (23.09.2026):** 10 siparişlik deneme çıktısı bağımsız hesapla doğrulandı (10/10 kuruşu kuruşuna). Kullanıcı teyit etti:
    - Aynı kategoriden iki ürün tek satır çiftinde, adet 1 ile yazılır (elle de böyle kesiliyor).
    - Kargo ücreti ürün tutarının içinde faturalanır.
    - Shopify e-postayı veriyor; son 10 siparişin müşterileri Paraşüt'te e-postayla bulunamadı.
13. **Müşteri kartları (musteri-kesif.js):** Elle açılan kartlarda e-posta boş, her faturada yeni kart açılmış. Program e-postayla arar; bulamazsa `name, email, contact_type=person, account_type=customer, tax_number=11111111111, city (Shopify province), district (Shopify city'de "/" sonrası), address, phone, is_abroad=false` ile açar. Alan adları gerçek kayıttan doğrulandı.
14. **Aşama 2 tasarımı:** `node fatura.js --siparis 13575` ile seçilen siparişler. Onaydan önce plan gösterilir. Sıra: invoices.json'a "isleniyor" → (gerekirse) müşteri → taslak fatura → "tamam" + fatura no. Paraşüt reddederse kayıt silinir; bağlantı koparsa "isleniyor" kalır ve sonraki gerçek çalıştırma bu çözülmeden başlamaz. `ortak.js/gonder()` sadece `/contacts` ve `/sales_invoices` POST'una izin verir, `e_archives`/`e_invoices` ve kayıt güncelleme engelli.

Henüz cevaplanmadı: kısmi iade durumunda ne yapılacağı.
