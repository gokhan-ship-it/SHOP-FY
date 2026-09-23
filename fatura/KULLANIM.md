# Günlük fatura kesme — kullanım kılavuzu

Program Shopify siparişlerinden Paraşüt'te **taslak** fatura oluşturur.
Resmileştirmeyi (ÖZELMATRAH + 808 seçerek) her zaman siz Paraşüt'ten elle yaparsınız.

## Her sabah

1. **Terminal**'i açın (Cmd + Boşluk → "Terminal" → Enter).
2. `cd ` yazın (sonunda bir boşluk olsun), `fatura` klasörünü pencereye sürükleyin, Enter'a basın.
3. Şunu yazın:
   ```
   node fatura.js --dun
   ```
4. Oranı sorar → o günkü oranı yazın (örnek: `5` veya `4,5`) → onay için `e`.
5. Özeti okuyun. Doğruysa "oluşturulsun mu?" sorusuna `e`.
6. Paraşüt → Satışlar → Faturalar → taslakları kontrol edip resmileştirin.

## Diğer komutlar

| Komut | Ne yapar |
|---|---|
| `node fatura.js --tarih 2026-09-24` | Belirli bir günün siparişleri |
| `node fatura.js --tarih 2026-09-24:2026-09-26` | Birden fazla gün |
| `node fatura.js --siparis 13580` | Tek sipariş (virgülle birden fazla: `13580,13581`) |
| Sonuna `--dry-run` | Hiçbir şey yazmadan dener |
| `node fatura.js --elle-kesildi 13580` | "Bunu elle kestim", program o siparişi atlar |

## Program şunları kendisi KESMEZ (atlar, özette listeler)

- İade / kısmi iade / sonradan değiştirilmiş siparişler
- Hazır couple setleri ("Luna + Aurora" gibi)
- Hem bileklik hem kolye olup kargo ücreti alınmış siparişler
- Hediye kutusu, ek paket, event ürünleri, künye
- Yurt dışı siparişler

Bunları Paraşüt'ten elle kesin, sonra programa bildirin:
`node fatura.js --elle-kesildi <sipariş no>`

## Dikkat

- **`fatura` klasörünü silmeyin, başka yere kopyalayıp oradan çalıştırmayın.**
  `invoices.json` ve `musteriler.json` dosyaları hangi siparişin kesildiğini tutar;
  kaybolursa aynı siparişe ikinci fatura kesilebilir.
- Yeni program dosyası geldiğinde dosyaları hep bu klasöre kopyalayın.
- Ekranda **BELİRSİZ** yazarsa: o siparişin Paraşüt'te faturası oluşmuş olabilir.
  Program, siz kontrol edene kadar yeni fatura kesmez. Claude'a haber verin.
- `.env` dosyasında şifreler var; kimseyle paylaşmayın.
