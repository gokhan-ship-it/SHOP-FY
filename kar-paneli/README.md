# TTN Kâr Paneli

Text To Next için TrueProfit'in yerine geçen **yerel** kâr paneli. Shopify ve Meta verisini yalnızca **okur**; ay ay, hafta hafta, gün gün gerçek kârı gösterir. Yalnızca Mac'te çalışır, bulut yoktur.

> Bu klasör herkese açık depoda durduğu için **ticari veriler (maliyetler, kurallar, TrueProfit dökümleri, doğrulama rakamları) burada değildir**. Onlar kurulum paketiyle (`TTN-Kar-Kurulum.zip`) ayrıca gelir ve `seed/`, `trueprofit/` klasörlerine konur (bu klasörler `.gitignore`'da).

## Kurulum (Mac)

Kurulum paketindeki `BENIOKU.txt`'ye bakın. Kısaca:

```bash
bash ~/Downloads/TTN-Kar-Kurulum/kurulum.command
```

- Program `~/TTN-Kar` klasörüne kurulur. Node.js yalnızca bu klasörün içine indirilir, sisteme bir şey kurulmaz.
- Arka plan servisi: `~/Library/LaunchAgents/com.texttonext.kar.plist`. Oturum açılınca başlar, çökerse yeniden başlar.
- Masaüstü: `TTN Kâr.app` (servis kapalıysa başlatır, sonra `http://localhost:4747`'i açar) ve `TTN-Kar` klasör kısayolu.
- Anahtarlar panelin **Kurulum** ekranından girilir ve yalnızca `~/TTN-Kar/.env` dosyasına yazılır (izin: 600). Asla loglanmaz, git'e girmez.

## Yapı

| Yol | İçerik |
|---|---|
| `src/lib/db/schema.ts` | Veritabanı şeması (SQLite + Drizzle). `data/ttn.db` |
| `src/lib/calc/` | Hesap motoru: sipariş/iade hesapları, sabit gider dağıtımı, günlük kâr tablosu |
| `src/lib/sync/` | Shopify (toplu + artımlı), Meta (arşiv + saatlik + gece), TCMB kuru, kilit kontrolleri |
| `src/lib/scheduler.ts` | Sunucu içi zamanlayıcı (Shopify 15 dk, Meta saatlik + 03:00, kur günlük, yedek 04:00) |
| `src/lib/validation.ts` | TrueProfit referansıyla aylık doğrulama raporu |
| `src/lib/metaCsv.ts` | Meta API'ye erişilemediğinde Reklam Yöneticisi'nden indirilen gün kırılımlı raporun içe aktarılması (Ayarlar → Meta raporu yükle) |
| `src/app/` | Ekranlar: Ana ekran, Kâr tablosu, Ürünler, Giderler, Maliyetler, Veri sağlığı ve Ayarlar, Kurulum |
| `mac/` | Kurulum/kaldırma betikleri, uygulama simgesi |
| `tests/` | Birim ve uçtan uca testler (`npm test`) |

## Güvenlik kuralları

- Shopify ve Meta'ya yalnızca okuma yapılır (Shopify'da tek mutation, okuma amaçlı `bulkOperationRunQuery`'dir).
- Her Shopify senkronunun başında `shop { myshopifyDomain }` ayardaki adresle karşılaştırılır; tutmazsa hiçbir veri yazılmaz ve panelde kırmızı uyarı çıkar.
- Meta verisi yalnızca `META_ALLOWED_AD_ACCOUNTS` listesindeki hesaplardan çekilir. JantiFox hesabı (`act_1389905762203018`) hiçbir koşulda çekilmez. Elle yüklenen raporlarda JantiFox ya da izinsiz hesap görünürse dosya reddedilir.
- Meta anahtarı URL'ye değil `Authorization` başlığına konur; hata mesajları gizli değerlerden temizlenir.
- Müşteri kişisel verisi (ad, adres, telefon, e-posta) çekilmez; yalnızca müşteri ID'si tutulur.

## Geliştirme

```bash
npm install
npm test          # birim + uçtan uca testler (seed/ ve trueprofit/ varsa TrueProfit provası da çalışır)
npm run dev       # http://127.0.0.1:4747
```

Şema değişince: `npm run db:generate` (migrasyon `drizzle/` klasörüne yazılır, açılışta otomatik uygulanır).

Kurulum paketi üretmek için: `scripts/paketle.sh <veri-klasörü> <çıktı.zip>`.
