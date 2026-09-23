# Kullanıcıyla netleşen kararlar

CLAUDE.md'deki kurallara ek olarak kullanıcının verdiği cevaplar:

1. **Fatura tarihi:** Siparişin Shopify'a düştüğü an (sipariş oluşturulma zamanı, Türkiye saati).
2. **Oran:** Her fatura çalıştırmasından önce kullanıcıya sorulur, oranı kullanıcı belirler.
3. **Adet:** Aynı üründen 2 tane alındıysa faturaya adet 2 yazılabilir.
4. **Vergi numarası olmayan bireysel müşteri:** TCKN olarak `11111111111` (11 adet 1) kullanılır.
5. **Test siparişi:** Olmayacak, ayrıca kontrol gerekmez.
6. **Kodun yeri:** Tema deposu içinde `fatura/` klasörü.

Henüz cevaplanmadı: kısmi iade durumunda ne yapılacağı.
