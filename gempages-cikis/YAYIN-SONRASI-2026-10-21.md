# Yayın sonrası GemPages kontrolü (21.10.2026)

Kullanıcı "Gumus stok notu - 2026-10-21" temasını (189316038976) yayına aldı. GemPages hâlâ yüklü olduğu için yayına alma anında (10:26–10:27Z) yine sayfaları kendi şablonlarına bağladı ve temaya yazdı.

## Sayfa şablonları: geri alındı
GemPages 8 yayındaki sayfayı `gp-template-*` eklerine bağlamıştı. `pageUpdate` ile Aşama 2'deki onaylı eklere geri alındı:

| Sayfa | GemPages'in bağladığı | Geri alınan |
|---|---|---|
| kullanim-kilavuzu (QR) | gp-template-600755391629886309 | kilavuz |
| bireysel-hediye-kullanim-kilavuzu | gp-template-600758654311858837 | kilavuz-bireysel |
| couple-hediye-kullanim-kilavuzu | gp-template-600760696552030795 | kilavuz-couple |
| iletisimsayfasi | gp-template-556461893263295681 | iletisim |
| sozlesmeler | gp-template-606324753770218070 | sozlesmeler-liste |
| couplekapsuldahafazlabilgial | gp-template-601917426203886298 | couple-daha-fazla-bilgial |
| hediyekapsuldahafazlabilgial | gp-template-601918380005393114 | hediye-daha-fazla-bilgial |
| couplezamankapsulleri | gp-template-593136672170836500 | couple-daha-fazla-bilgial |

Gizli sayfalar ve 6 yönlendirme değişmedi.

## Temaya yazılanlar (yayından önceki MD5 kaydına göre)
- `config/settings_data.json` (10:26:19): **GemPages app embed (`embed-gp-script-head`) yeniden açıldı** (`"disabled": false`). Yayından önce kapalıydı (MD5 `42e7a169…`). Yayındaki temaya bu bağlantıyla yazılamadığı için kapatma elle yapılmalı.
- `sections/gp-global-section-544534232731485313.liquid` ve `sections/gp-global-section-584538833496834629.liquid`: GemPages içeriği yeniden yazıldı. Yalnızca GemPages şablonlarında kullanılıyor.
- `templates/collection.gp-template-bk-default.json`, `templates/product.gp-template-bk-default.json`, `locales/tr.json`: tarih değişti, içerik (MD5) aynı.
- Bizim üç dosyamız (`layout/theme.liquid`, `snippets/tt-stok-notu.liquid`, `snippets/tt-urun-dil.liquid`) değişmedi.

## Not
GemPages kaldırılana kadar her tema yayına alımında aynı şey tekrar olur.

## Canlı kontrol (`betikler/kaldirma-sonrasi.js`, telefon 390 ve masaüstü 1440, sayfa ekleri geri alındıktan sonra)
- 62 kontrolün 60'ı geçti. QR adresinin 12 biçimi, alt kılavuzlar, iletisimsayfasi, sozlesmeler, iki "daha fazla bilgi" sayfası, couplezamankapsulleri ve gizli sayfaların 301'leri doğru.
- Kalan 2 hata ana sayfada (telefon ve masaüstü): açılan app embed, GemPages betiklerini (`gp-lazyload.v2.js`, `gp-global.js`) ve `files.gempages.net` yazı tiplerini yüklüyor. Sayfa 200 dönüyor; metin ve 5 videonun hepsi yükleniyor. Embed elle kapatılınca bu iki kontrolün de geçmesi beklenir.

## Kaldırma öncesi son kontrol (23.10.2026)
- Canlı tema hâlâ "Gumus stok notu - 2026-10-21" (189316038976); arada başka tema yayına alınmadı.
- Shopify bağlantısı bu sırada başka bir mağazaya (JantiFox) bağlıydı; orada yalnızca okuma yapıldı. texttonext kontrolü vitrin üzerinden yapıldı.
- `betikler/kaldirma-sonrasi.js`: 62 kontrolün 60'ı geçti, 21.10 ile aynı. Kalan 2 hata yine ana sayfada (telefon ve masaüstü): açık app embed'in GemPages betikleri ve fontları. Sayfa 200 dönüyor; metin ve 5 videonun hepsi yükleniyor.
- **Hüküm: GemPages kaldırılabilir.** Uygulama kaldırılınca embed de kalkar; kaldırma sonrası aynı betik 62/62 vermeli.

## Kaldırma sonrası kontrol (23.10.2026)
- GemPages kullanıcı tarafından kaldırıldı. Canlı tema aynı (189316038976).
- `betikler/kaldirma-sonrasi.js`: **62/62 geçti.** QR adresinin 12 biçimi, alt kılavuzlar, iletisimsayfasi, sozlesmeler, iki "daha fazla bilgi" sayfası, couplezamankapsulleri, ana sayfa, koleksiyonlar ve ürünler; telefon ve masaüstü. Hiçbir sayfada GemPages isteği ya da JS hatası yok.
- Yönlendirmeler: `text-to-next-pro-1` ve iki eski landing → `/`; `landing-page-feb-16-11-03-09` → `text-to-next-pro-1` → `/`; `contact-page-mar-5-21-32-02` → `iletisimsayfasi`. `ana-sayfa` ve `event-zaman-kapsulu` 404 (gizli sayfalar, önceden de öyle).
- Kalan iz: ana sayfa kaynağında görünmeyen bir HTML yorumu ("Failed to render app block 6478312753674380289 … does not exist"). Sebep: `settings_data.json` içinde silinen embed'in kaydı duruyor. Görünür etkisi yok; sonraki tema çalışmasında taslak temada bu blok kaydı silinebilir.
