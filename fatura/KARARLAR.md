# Kullanıcıyla netleşen kararlar

CLAUDE.md'deki kurallara ek olarak kullanıcının verdiği cevaplar:

1. **Fatura tarihi:** Siparişin Shopify'a düştüğü an (sipariş oluşturulma zamanı, Türkiye saati).
2. **Oran:** Her fatura çalıştırmasından önce kullanıcıya sorulur, oranı kullanıcı belirler.
3. **Adet:** Aynı üründen 2 tane alındıysa faturaya adet 2 yazılabilir.
4. **Vergi numarası olmayan bireysel müşteri:** TCKN olarak `11111111111` (11 adet 1) kullanılır.
5. **Test siparişi:** Olmayacak, ayrıca kontrol gerekmez.
6. **Kodun yeri:** Tema deposu içinde `fatura/` klasörü.

7. **Ürün kartları:** Önce A (mevcut kartlara kod yazmak) seçildi, sonra B'ye dönüldü. Mevcut 844 kart model kısaltmalı (NOT20101 vb.) ve markasız bir bileklik/kolye kartı yok. CLAUDE.md'deki 7 kart yeni açılır (`urun-olustur.js`), eski kartlara dokunulmaz. Stok takibi kapalı; kullanıcı Paraşüt'te model bazlı satış takip etmiyor.

Henüz cevaplanmadı: kısmi iade durumunda ne yapılacağı.
