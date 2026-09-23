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

Henüz cevaplanmadı: kısmi iade durumunda ne yapılacağı.
