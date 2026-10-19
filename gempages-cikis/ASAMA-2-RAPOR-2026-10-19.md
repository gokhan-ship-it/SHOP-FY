# GemPages çıkışı: Aşama 1 ve 2 (19.10.2026)

## Aşama 1 (Prizma yayına alınmadan önce)
- Kılavuzdaki geçici önizleme ayarının temizliği Prizma'ya (189250076992, o sırada UNPUBLISHED) yüklendi. Kaynak repo commit `6da03b5`; iki dosya:
  - `sections/tt-kilavuz.liquid`: md5 19058d77…
  - `templates/page.kilavuz.json`: md5 801dbd97…
- MD5'ler repoyla aynı.
- Önizlemede `?view=kilavuz` ile, telefon ve masaüstünde kontrol edildi:
  - İçerik tam (338 karakter).
  - GemPages izi ve isteği yok, geçici betik yok.
  - Alt kılavuz kartları temiz adreslere gidiyor.
  - Konsolda hata yok.

## Aşama 2

### Başlangıç durumu
- Prizma 14:56:35 UTC'de MAIN oldu. 2 dakika beklendi.
- 7 sayfanın şablon eki hâlâ GemPages şablonundaydı. Hepsi bugün 11:18'de geri bağlanmıştı. Prizma'nın yayına alınmasından sonra yeniden yazılmadılar (updatedAt 11:18).
- GemPages yayına alma sırasında (14:55:50–14:56:27) Prizma temasına yazdı:
  - İçeriği değişen 3 dosya: `gp-global-section-544534232731485313`, `gp-global-section-584538833496834629` ve `index.gp-template-bk-default`. Sonuncusu artık `index.json` ile aynı.
  - İçeriği aynı kalıp yeniden yazılan 3 dosya: `collection.gp-template-bk-default`, `product.gp-template-bk-default`, `locales/tr.json`.
- Kılavuz temizliğinin iki dosyası bozulmadı.

### Yapılan değişiklikler

| Sayfa | Eski şablon eki | Yeni şablon eki |
|---|---|---|
| kullanim-kilavuzu | gp-template-600755391629886309 | kilavuz |
| bireysel-hediye-kullanim-kilavuzu | gp-template-600758654311858837 | kilavuz-bireysel |
| couple-hediye-kullanim-kilavuzu | gp-template-600760696552030795 | kilavuz-couple |
| iletisimsayfasi | gp-template-556461893263295681 | iletisim |
| sozlesmeler | gp-template-606324753770218070 | sozlesmeler-liste |
| couplekapsuldahafazlabilgial | gp-template-601917426203886298 | couple-daha-fazla-bilgial |
| hediyekapsuldahafazlabilgial | gp-template-601918380005393114 | hediye-daha-fazla-bilgial |
| couplezamankapsulleri | gp-template-593136672170836500 | couple-daha-fazla-bilgial |

- couplezamankapsulleri:
  - Başlığı ("Couple Landing Page") ve SEO başlığı değişmedi.
  - Adres aynı; 301 kurulmadı.
- Gizlenen sayfalar ve 301'ler:
  - `/pages/landing-page-dec-12-23-44-18` ("Ana Sayfa"): gizlendi, 301 → `/`
  - `/pages/landing-page-apr-7-16-02-03`: gizlendi, 301 → `/`
  - Raporda 7–11 oturumlu üçüncü sayfa `text-to-next-pro-1` idi. Talimat gereği ona dokunulmadı; bu yüzden yalnızca iki sayfa gizlendi.
- GemPages app embed:
  - Yayındaki temaya dosya yazma bu bağlantıda engelli olduğu için kapatma elle yapıldı (sizin tarafınızdan).
  - `config/settings_data.json` okundu (15:02:38): GemPages bloğu `"disabled": true`.
  - Shopify Inbox açık, Wheelio kapalı; ikisi de değişmedi.

### Kontroller (yayın, temiz tarayıcı, telefon 390×844 ve masaüstü 1440)

| Kontrol | Sonuç |
|---|---|
| QR adresleri | 12 biçimin hepsi 200 ile bitiyor, yeni kılavuz, 338 karakter, GemPages izi yok. Zincirler aşağıda. |
| Alt kılavuzlar | Bireysel: 311 karakter, video 3/3. Couple: 182 karakter, video 1/1. |
| /pages/iletisimsayfasi | iletişim şablonu, 362 karakter |
| /pages/sozlesmeler | liste şablonu, 499 karakter |
| İki "daha fazla bilgi" ve couplezamankapsulleri | doğru şablon; couple 4.359 karakter, video 7/7; hediye 3.218 karakter, video 11/11 |
| Eski landing (2) | tek 301 → `/` → 200 |
| Ana sayfa, Erkek ve Kadın (Single ve Couple), Prizma, Prizma + Chloe, Auron, /pages/iletisim | GemPages betik ya da font isteği yok; yeni konsol hatası yok |
| Hamburger menü | 5 sayfa × 2 genişlik: açılıyor, X ve Esc ile kapanıyor, sayfa kaymıyor, 8 link eksiksiz, 11 hedef 200 |
| Couple %50 | Prizma + Auron: "İkinci Üründe %50 İndirim" uygulandı (Auron 1.199,50 TL). Çubukta "Çark indirimi −500 TL" satırı var. Sipariş oluşturulmadı. |
| Çark rozeti | Ana sayfa, koleksiyonlar, ürün, varyant penceresi ve yapışkan çubukta görünüyor. Çark yokken rozet yok. |
| Yapışkan çubuk | 390: tek satır, rozet solda, 11.5 px. 360 ve 1440: 10.5 px. Buton 44×44 / 141×51. Süre bitince sayfa yenilenmeden kalkıyor. |
| Varyant fiyatı | Lumin 925 seçilince hem sayfadaki hem çubuktaki fiyat 4.499 / 4.999 oldu. |

**QR yönlendirme zincirleri:**
- `https://texttonext.com/...`: yönlendirme yok, 200
- `http://texttonext.com/...` ve `https://www.texttonext.com/...`: tek 301 → `https://texttonext.com/...` → 200
- `http://www.texttonext.com/...`: iki 301 (önce `https://www`, sonra apex) → 200. Bu davranış Shopify alan adı ayarından geliyor.
- Parametreler (`_ab`, `key`) korunuyor.

**Konsol:** Tek JS hatası, sepet çekmecesindeki eski "reading 'open'" (`cart.js onCartRefresh`); önceki yayındaki temada da vardı.

**Geçici 503:** Masaüstünde www + `_ab` adresi bir kez 503 döndü. Ayrıca yeniden denendi; üç denemede de 301 → 200 oldu.

**Dokunulmayan GemPages sayfası (`text-to-next-pro-1`):**
- Hâlâ GemPages şablonunda.
- App embed kapandıktan sonra 15 videosunun hiçbiri yüklenmiyor; masaüstünde konsolda CSP uyarıları var.
- GemPages kaldırılınca tamamen bozulacak. 90 günde 11 oturum aldı. `/pages/landing-page-feb-16-11-03-09` yönlendirmesi bu sayfaya gidiyor.

### Yayındaki temanın MD5 kaydı
- Prizma (MAIN): 700 dosya, updatedAt 15:02:38.
- Yayına alınmadan önceki kayda göre 6 dosyanın içeriği değişti:
  - Aşama 1'in iki dosyası
  - GemPages'in yazdığı 3 dosya
  - App embed kapatılınca `settings_data.json`
- Kayıt, kaldırma sonrası karşılaştırma için saklandı: `scratchpad/prizma-md5/canli-prizma-asama2.json`.

## GemPages'i kaldırma hükmü: KALDIRILABİLİR
- **Bozulmaz:**
  - QR kılavuzu ve alt kılavuzlar, eski iletişim adresi, sözleşmeler, iki "daha fazla bilgi" sayfası ve reklam trafiği alan Couple sayfası artık temanın kendi şablonlarında. GemPages'e bağlılıkları yok.
  - App embed kapalıyken bütün kontroller geçti.
- **Bozulacak tek görünür sayfa:** `text-to-next-pro-1`. Kaldırmadan önce ya da sonra bu sayfa için karar verilmeli; önerim gizleyip `/` adresine 301.
- **Etkisi olmayanlar:**
  - Gizli GemPages sayfaları (`ana-sayfa`, `event-zaman-kapsulu`, yeni gizlenen iki landing).
  - Taslak ürün `couple-urun-olustur`.
- **Dikkat:** Kaldırmadan önce başka bir temayı yayına almayın; GemPages yayına alma anında sayfaları yeniden kendi şablonlarına bağlıyor.
- Temadaki ~162 GemPages dosyası zararsız; sonra ayrı bir temizlik işi olarak silinebilir.

## Kaldırdıktan hemen sonra çalıştıracağım kontrol listesi
1. **Admin API:**
   - 8 sayfanın şablon eki yerinde mi? (tablodaki "Yeni" sütunu; text-to-next-pro-1 hariç).
   - İki landing hâlâ gizli mi, 5 yönlendirme duruyor mu?
   - Prizma hâlâ MAIN mı?
   - `settings_data.json` içinde GemPages bloğu kalktı ya da kapalı mı; Inbox açık mı?
2. **Tema dosyaları:** Prizma'nın MD5 listesi `canli-prizma-asama2.json` ile karşılaştırılacak. GemPages kendi dosyalarını sildi mi? Bizim dosyalarımız değişmemiş olmalı.
3. **Vitrin:** `gempages-cikis/betikler/kaldirma-sonrasi.js` çalıştırılacak. Telefon ve masaüstünde 62 kontrol yapıyor:
   - 12 QR biçimi: 200, kılavuz, GemPages izi yok
   - Alt kılavuzlar ve videolar, iletisimsayfasi, sozlesmeler, iki "daha fazla bilgi" sayfası, couplezamankapsulleri
   - İki landing 301
   - Ana sayfa, koleksiyonlar (Single ve Couple), Prizma, Prizma + Chloe, Auron: GemPages isteği yok, konsol hatası yok
   - Kaldırma öncesi temel çalıştırma: 62 kontrolün 61'i geçti. Tek hata yukarıdaki geçici 503'tü; yeniden denemede geçti.
4. **Kısa işlev kontrolü:** Menü, Couple %50, yapışkan çubuk ve süre bitişi, varyant fiyatı.
5. **text-to-next-pro-1'in son durumu.**
