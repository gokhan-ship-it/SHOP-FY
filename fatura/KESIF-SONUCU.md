# Aşama 0 — Paraşüt keşif sonucu

Kaynak: NX02026000000177 (30.08.2026, 1.898,00 TL, ÖZELMATRAH, 2 satır), `kesif.js` ile okundu.
Müşteri kişisel bilgileri bu dosyaya bilerek alınmadı.

## Sorulan dört nokta

| Soru | Sonuç |
|---|---|
| ÖZELMATRAH'ı belirten alan | Satış faturası (`sales_invoices`) üzerinde **yok**. E-arşiv kaydında (`e_archives`) da görünmüyor. Resmileştirme sırasında seçiliyor. |
| `item_type` | `"invoice"` |
| Satır KDV oranı | `sales_invoice_details.attributes.vat_rate` → `"20.0"` ve `"0.0"` |
| 808 istisna kodu | Satırda `vat_exemption_code` alanı var ama **null**. 808 fatura tarafında tutulmuyor, resmileştirmede elle seçiliyor. |

## Kod yazarken dikkat edilecek bulgular

- **Paraşüt'ün alan adları ters görünüyor:**
  - Fatura `net_total` = **KDV dahil genel toplam** (1898.0)
  - Fatura `gross_total` = KDV hariç toplam (1882.18)
  - `total_vat` = 15.82
  - Satırda da `net_total` KDV dahil (94.9). Tutar doğrulaması `net_total` ile yapılmalı.
- İşçilik satırı `unit_price` = `79.0833333333333`. Paraşüt tam hassasiyet saklıyor. 4 hane (79.0833) gönderildiğinde toplamın yine 1898,00 çıktığı Aşama 2'de ilk taslakta doğrulanmalı.
- Gümüş satırı: `unit_price` 1803.1, `vat_rate` 0.0.
- Para birimi kodu: `"TRL"`.
- Fatura `description` boş. Shopify sipariş no buraya yazılacak. Ayrıca `order_no` / `order_date` alanları da mevcut ve boş.
- Bireysel müşteri: `tax_number` = `11111111111`, `contact_type` = `person`.
- `shipment_included` = true.
- Mevcut ürün kartları:
  - `NOT20101 ZAMAN KAPSÜLÜ BİLEKLİK` (id 1072588137, KDV %20, `code` boş)
  - `NOT20102 ZAMAN KAPSÜLÜ BİLEKLİK` (id 1072588138, KDV %0, `code` boş)
  - İkisinde de stok takibi açık, stok -18.
  - `code` alanı boş olduğu için `filter[code]=BLK-01` bu kartları bulamaz.

## Ürün kartları taraması (`urunler.js`)

- Paraşüt'te 844 ürün kartı var. Ürün kodu dolu olan tek kart `shipping-ikas-product` (Kargo Bedeli).
- Takı kartları çoğunlukla **model kısaltması + sıra numarası** ile çiftler halinde açılmış:
  - `NOT20101` (%20) / `NOT20102` (%0), `AST21101` / `AST21102`, `NOIR23101` / `NOIR23102`, `ASCH201` / `ASCH202 COUPLE SET` vb.
  - Kart adında model/marka kısaltması var. Bu, CLAUDE.md'deki "marka faturaya girmez" kuralıyla çelişiyor.
- Markasız genel kartlar:
  - `GÜMÜŞ TAKI İŞCİLİĞİ` (%20)
  - `925 AYAR GÜMÜŞ BEDELİ` (%0)
  - `ZAMAN KAPSÜLÜ CHARM` (%20)
  - `ZAMAN KAPSÜLÜ CHARM 925 Ayar Gümüş` (%0)
- Klasik adaylar:
  - `Klasik Zaman Kapsülü` (**%0, yanlış**)
  - `RED VELVET LİMİTED EDİTİON KLASİK ZAMAN KAPSÜLÜ` (%20)
  - `KLASİK ZAMAN KAPSÜLÜ KKS5` (%20)
- Markasız bir bileklik çifti ya da kolye çifti yok.
