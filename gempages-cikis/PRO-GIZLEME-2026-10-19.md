# Text To Next PRO sayfası gizlendi + GemPages son durum (19.10.2026)

Saatler Türkiye saati. Hiçbir temada dosya değişmedi (Prizma `updatedAt` hâlâ 2026-10-19T15:02:38Z). Hiçbir tema yayına alınmadı, hiçbir uygulama kaldırılmadı. Noir ürünlerine dokunulmadı.

## 1. PRO sayfası

### Önceki durum
| | |
|---|---|
| Adres | https://texttonext.com/pages/text-to-next-pro-1 |
| Kayıt | `gid://shopify/Page/149124284736` |
| Başlık | "Landing Page - Feb 16, 11:03:09" (SEO açıklaması: "Zaman Kapsülü artık işinde de yanında …") |
| Görünürlük | Yayında (`isPublished: true`, 2025-03-05'ten beri) |
| Şablon | `page.gp-template-553922254656766857` (GemPages) |
| Gövde | Boş; içerik GemPages şablonunda |
| Son 90 gün | Giriş sayfası olarak 11 oturum, hepsi "doğrudan". 7'si 17.10'da; büyük olasılıkla o günkü GemPages envanter taramalarım. |
| Durum kodu | 200 |

Yedek: `gempages-cikis/yedek/text-to-next-pro-1-oncesi-2026-10-19.json`

### Bu adrese link veren yerler (değiştirilmedi, yalnızca listelendi)
| Yer | Sonuç |
|---|---|
| Menüler (4 menü, 20 öğe) | yok |
| Diğer sayfaların gövdeleri (35 sayfa) | yok |
| Ürün açıklamaları (84) / koleksiyon açıklamaları (17) | yok |
| Blog yazıları (0) / mağaza politikaları (6) | yok |
| Yayındaki tema | yok. 700 dosyanın 640'ı tarandı: 584'ü MD5'i doğrulanmış yerel kopyadan, 56'sı canlıdan (settings_data, bütün şablon JSON'ları, tr/en dil dosyaları, 2 gp-global-section). Taranmayan 60 dosya: 24 CSS ve 36 başka dil dosyası. |
| URL yönlendirmesi | `gid://shopify/UrlRedirect/502545187136`: `/pages/landing-page-feb-16-11-03-09` → `/pages/text-to-next-pro-1` (sayfanın eski adresi; 90 günde 0 oturum) |

### Yapılan değişiklik
1. **Görünürlük kapatıldı.** Sayfaya `pageUpdate` ile `isPublished: false` verildi (18:46:12 UTC). Sayfa silinmedi. Başlık, gövde, SEO alanı ve şablon eki aynı kaldı.
2. **301 yönlendirmesi eklendi.** `urlRedirectCreate`:
   - **ID: `gid://shopify/UrlRedirect/560401023296`**
   - `/pages/text-to-next-pro-1` → `/`
   - Yeni PRO sayfası yayına alınınca bu yönlendirme silinecek.

**Geri alma:** `pageUpdate(isPublished: true)` ve 560401023296'yı silmek yeterli.

### Kontrol (temiz tarayıcı, iPhone)
| Adres | Zincir |
|---|---|
| `/pages/text-to-next-pro-1` | **301 → `/` → 200** (ana sayfa şablonu, Prizma, GemPages izi 0). curl: `HTTP/2 301`, `location: /` |
| `/pages/text-to-next-pro-1?utm_source=test` | 301 → `/?utm_source=test` → 200 (parametre korunuyor) |
| `/pages/landing-page-feb-16-11-03-09` | 301 → `/pages/text-to-next-pro-1` → 301 → `/` → 200 (iki adım, eski yönlendirme değiştirilmedi) |

Not: Tarayıcı dışı adım adım istek bu adreste Shopify bot sınırına (429) takıldı. Zincir tarayıcı ve curl ile doğrulandı.

## 2. GemPages son durum
- **Kurulu mu:** Evet. `appInstallations` GemPages Builder'ı (`gempages-cro`) listeliyor.
- **Görünür GemPages şablonlu içerik:** Yok.
  - **Sayfalar:** Yayındaki 26 sayfanın hiçbiri `gp-` şablonu kullanmıyor. GemPages şablonundaki 5 sayfanın hepsi gizli: `text-to-next-pro-1`, `ana-sayfa`, `event-zaman-kapsulu`, `landing-page-dec-12-23-44-18`, `landing-page-apr-7-16-02-03`.
  - **Ürün:** Tek ürün var: `couple-urun-olustur`. Durumu DRAFT; Online Mağaza dahil hiçbir kanalda yayında değil.
  - **Koleksiyon:** Yok.
- **App embed:** Kapalı. `config/settings_data.json`, blok `6478312753674380289` (`gempages-builder/blocks/embed-gp-script-head`), `"disabled": true`. Dosyanın MD5'i 15:02'deki kayıtla aynı (`42e7a169…`).
- **Hüküm: GemPages şimdi kaldırılabilir.**
  - Kaldırmadan önce başka bir temayı yayına almayın; GemPages yayına alma anında sayfaları kendi şablonlarına yeniden bağlıyor.
  - Kaldırınca kontrol listesi (QR adresleri, kılavuzlar, iletisimsayfasi, sozlesmeler, couplezamankapsulleri, şablon ekleri) çalıştırılacak. Bu turda GemPages kaldırılmadığı için çalıştırılmadı.

## Kanıt
- `gempages-cikis/betikler/pro-zincir.js`: zincir kontrol betiği (adım adım + tarayıcı)
- `gempages-cikis/yedek/text-to-next-pro-1-oncesi-2026-10-19.json`: değişiklik öncesi sayfa ve yönlendirme listesi
