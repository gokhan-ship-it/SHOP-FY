# Fatura Paneli — kullanım kılavuzu

Program, Shopify siparişlerinden Paraşüt'te **taslak** fatura oluşturur.
Resmileştirmeyi (ÖZELMATRAH + 808 seçerek) her zaman siz Paraşüt'ten elle yaparsınız.

## Her gün (veya birkaç günde bir)

1. Masaüstündeki **Fatura Paneli** simgesine çift tıklayın. Panel tarayıcıda açılır.
2. Tarih aralığı kendiliğinden **son kesilen siparişin gününden bugüne** ayarlanır.
   Birkaç gün ara verdiyseniz de sorun olmaz, kaldığı yerden devam eder.
3. **İşçilik oranını** yazın (örnek: `5` veya `4,5`). "Aynısını kullan" ile son oranı seçebilirsiniz.
4. **Siparişleri getir ve önizle**'ye basın. Paraşüt'e hiçbir şey yazılmaz.
5. Önizlemeyi kontrol edin:
   - **Kesilecek faturalar**: Satıra tıklayınca fatura satırları görünür.
   - **Yeni ürün bulundu** kutusu çıkarsa her ürün için kategori seçip kaydedin.
     Program bir öneri yapar. Emin değilseniz "elle keseceğim" seçin.
   - **İl/ilçesi boş** olanlar: Fatura yine oluşturulur, resmileştirirken Paraşüt sorarsa ilçeyi seçin.
   - **Elle bakılacak** siparişler (iade, 1 kuruş farkı, karışık set vb.): Bunları Paraşüt'te elle kesin.
6. **"N taslak faturayı Paraşüt'te oluştur"**a basın ve onaylayın.
7. Paraşüt → Satışlar → Faturalar'dan taslakları kontrol edip resmileştirin.

## Elle kestiğiniz siparişler

Bir siparişi Paraşüt'te elle kestiyseniz panelin sağındaki **"Elle kestiğim siparişler"**
kutusuna numarasını yazıp **Bildir**'e basın (`13669` veya `13700-13705` gibi).
Yoksa program o siparişe ikinci bir fatura keser.

## Güncelleme

Claude yeni bir sürüm hazırladığında GitHub'dan ZIP'i indirip açmanız yeterli.
Panel İndirilenler'deki yeni sürümü fark eder ve üstte **"Güncellemeyi yükle"** düğmesi çıkar.
Kesilen faturalar, müşteri kayıtları ve sizin seçtiğiniz ürün kategorileri korunur.

## Ekranda kırmızı uyarı çıkarsa

- **"Yarıda kalmış işlem var"**: Bağlantı faturayı gönderirken kopmuş. O siparişin
  Paraşüt'te faturası oluşmuş olabilir. Kontrol edip Claude'a haber verin.
  Bu çözülene kadar yeni fatura kesilmez.
- **"Tutarı farklı çıkan"**: Paraşüt'teki taslağın toplamı Shopify'dan farklı. Resmileştirmeden önce düzeltin.

## Dikkat

- **`fatura` klasörünü silmeyin ve taşımayın.** Konumu:
  `İndirilenler/SHOP-FY-claude-new-session-5q510d/fatura` (numarasız olan).
  `invoices.json` ve `musteriler.json` hangi siparişin kesildiğini tutar.
  Bu dosyalar kaybolursa aynı siparişe ikinci fatura kesilebilir.
- `.env` dosyasında şifreler var. Kimseyle paylaşmayın.
- Panel sadece bu bilgisayarda çalışır. İnternetten veya başka cihazdan erişilemez.
- 45 dakika kullanılmazsa panel kendiliğinden kapanır, simgeyle tekrar açılır.

## Terminal ile (eski yöntem, hâlâ çalışır)

| Komut | Ne yapar |
|---|---|
| `node fatura.js --tarih 2026-10-01:2026-10-05` | O tarihlerin siparişleri |
| `node fatura.js --dun` | Dünün siparişleri |
| `node fatura.js --siparis 13580` | Tek sipariş |
| Sonuna `--dry-run` | Hiçbir şey yazmadan dener |
| `node fatura.js --elle-kesildi 13580` | Elle kesilen siparişi bildirir |
| `node kurulum.js` | Masaüstü simgesini (yeniden) oluşturur |
