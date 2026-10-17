# Eski tema / farklı header-footer: teşhis (17.10.2026)

**Yalnızca okuma yapıldı.** Hiçbir link, sayfa, menü, tema dosyası ya da ayar değiştirilmedi.

---

## Özet

**1. Asıl neden: tarayıcıda takılı kalan tema önizleme oturumu.**

Sitedeki hiçbir link `preview_theme_id` taşımıyor. Ama bir tarayıcı **bir kez** `?preview_theme_id=<eski tema>` içeren bir adres açarsa, o tarayıcıda sitedeki **bütün normal linkler** o eski temayla açılmaya devam ediyor. Bunu temiz bir tarayıcıda gösterdim:
- `?preview_theme_id=187506262336` (YEDEK) bir kez açıldı.
- Ardından parametresiz ana sayfa, koleksiyon ve GemPages sayfası açıldı; üçü de YEDEK temasıyla geldi. Sunucu başlığında da `theme;desc="187506262336"` yazıyordu.
- Bu durum httpOnly bir Shopify çerezinde (büyük olasılıkla `_shopify_essential`, ömrü 1 yıl) tutuluyor.
- `https://texttonext.com/?preview_theme_id=` (boş değer) açılınca oturum yayındaki temaya döndü.

Önizleme oturumu genellikle şu yollarla başlar:
- Shopify yönetiminde bir temanın **Önizle** ya da **Özelleştir** düğmesi,
- paylaşılan bir önizleme linki,
- benim test raporlarımdaki `?preview_theme_id=…` linkleri.

**2. İkinci neden: yayındaki temada iki farklı header var.**

Temiz oturumda bile:
- **Yeni koyu header (`tt-baslik`):** yalnızca 11 şablonda (ana sayfa, 4 koleksiyon, 3 ürün şablonu, Couple/Hediye bilgi sayfaları).
- **Temanın eski, beyaz standart header'ı:** diğer 57 şablonda. Bunlara tüm GemPages sayfaları, politika sayfaları, yasal sayfalar, iletişim, sepet ve arama dahil.

Bu sayfalar bu yüzden "eski tema" gibi görünüyor. Footer temiz oturumda her sayfada aynı (yalnızca bülten bölümü).

**3. Benim ekran görüntülerim yayındaki tema değildi.**

Hepsi taslak tema önizlemesiyle (`?preview_theme_id=189140861248`, Tasarim dili) alındı. Merkez sayfanın şablonunda `tt-baslik` olmadığı için orada da beyaz standart header görünüyor.

**4. Yan bulgular:**
- **5 GemPages linki** `?_ab=0&key=<zaman damgası>` ekiyle kaydedilmiş (GemPages editöründen kalma). Test ettim: başka tema açmıyorlar, yayındaki tema açılıyor. Ama temizlenmeleri gerekir.
- **`shop.texttonext.com` linkleri kırık:** bu alt alan adı mağazaya bağlı değil ve SSL hatası veriyor. İletişim sayfalarında geçiyor.

---

## 1. Mağazadaki temalar (18)

| # | Tam ad | ID | Rol | Oluşturma | Son güncelleme |
|---|---|---|---|---|---|
| 1 | Dawn | 165930402112 | taslak | 2024-03-06 | 2026-09-22 |
| 2 | Prestige | 165944590656 | taslak | 2024-03-07 | 2025-04-19 |
| 3 | Prestige | 168738586944 | taslak | 2024-06-27 | 2024-12-11 |
| 4 | SparkLayer Dawn Theme | 172802605376 | taslak | 2024-12-10 | 2026-09-22 |
| 5 | Concept temasının kopyası | 184430297408 | taslak | 2026-03-16 | 2026-04-01 |
| 6 | YEDEK | 187506262336 | taslak | 2026-08-12 | 2026-09-22 |
| 7 | Duzeltme 3 - kart sepet butonu 2026-08-13 | 187518910784 | taslak | 2026-08-13 | 2026-09-22 |
| 8 | Duzeltme 4 - kupon seridi konumu 2026-08-13 | 187519172928 | taslak | 2026-08-13 | 2026-09-22 |
| 9 | Duzeltme 6 - orta yerlesimde dugme 2026-08-13 | 187538866496 | taslak | 2026-08-13 | 2026-09-22 |
| 10 | Duzeltme 7 - kupon seridi konumu | 187540275520 | taslak | 2026-08-13 | 2026-09-22 |
| 11 | Catal karsilastirma - 2026-09-03 | 188025372992 | taslak | 2026-09-03 | 2026-09-22 |
| 12 | Catal renk ayarlari - 2026-09-04 | 188044443968 | taslak | 2026-09-04 | 2026-10-04 |
| 13 | Urun sagsutun - 2026-09-04 | 188045295936 | taslak | 2026-09-04 | 2026-10-14 |
| 14 | **Calisma taslagi - 2026-10-05** | **188825207104** | **YAYINDA (MAIN)** | 2026-10-05 | 2026-10-14 |
| 15 | Text To Next PRO - Çalışma | 188945072448 | taslak | 2026-10-09 | 2026-10-09 |
| 16 | Redesign - 2026-10 | 189109076288 | taslak | 2026-10-14 | 2026-10-14 |
| 17 | Calisma kopyasi - 2026-10-15 | 189124936000 | taslak | 2026-10-15 | 2026-10-15 |
| 18 | Tasarim dili - 2026-10-16 | 189140861248 | taslak | 2026-10-15 | 2026-10-17 |

Tarihler UTC. Taslak temaların hepsi `?preview_theme_id=<ID>` ile herkese açık önizlenebilir. Bir tarayıcı bunlardan birini açarsa yukarıdaki takılı kalma durumu oluşur.

---

## 2. Arama: `preview_theme_id`, `_ab=`, `_fd=`, `_sc=`, `shopifypreview.com`, `myshopify.com` ve 18 tema ID'si

### Kapsam

| Yer | Ne tarandı |
|---|---|
| Tema dosyaları | 18 temanın **tüm** metin dosyaları: 10.194 tema×dosya, 2.090 benzersiz içerik (layout, templates, sections, snippets, blocks, config/settings_data.json, locales, assets/*.js/.css). Büyük dosyalar URL'den indirildi. Eksik dosya: 0. |
| Menüler | 4 menü (`main-menu`, `footer`, `customer-account-main-menu`, `footer-yasal`), 3 seviyeye kadar her öğe |
| Sayfalar | 33 sayfanın gövdesi ve metafield'ları. GemPages sayfalarının gövdesi boş; içerikleri tema bölümlerinde (`gp-section-*`) ve yukarıda tarandı. |
| Ürünler | 81 ürünün açıklaması ve metafield'ları (ürün başına ilk 100) |
| Koleksiyonlar | 17 koleksiyonun açıklaması ve metafield'ları |
| Blog | 1 blog ("News"), 0 yazı |
| URL yönlendirmeleri | 3 adet:<br>`/pages/i%cc%87letisim` → `/pages/iletisim`<br>`/pages/landing-page-feb-16-11-03-09` → `/pages/text-to-next-pro-1`<br>`/pages/contact-page-mar-5-21-32-02` → `/pages/iletisimsayfasi` |
| Politikalar | 6 politika içeriği (4 ana politika, İletişim, Yasal bildirim) |
| Mağaza metafield'ları | İlk 1.750 kayıt. **Sınır:** geri kalanlar bir çeviri uygulamasının `ls-rv-*` çeviri önbellek kayıtları (çevrilmiş cümleler, link değil); hepsi taranmadı. |

### Sonuç (terim bazında)

| Terim | Tema dosyaları | Menüler | Sayfalar | Ürün/Koleksiyon | Blog | Yönlendirme | Politikalar | Metafield'lar |
|---|---|---|---|---|---|---|---|---|
| `preview_theme_id` | **0** | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `_fd=` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `_sc=` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `shopifypreview.com` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 tema ID'sinden herhangi biri | **0** | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `_ab=` | **5 farklı link** (aşağıda) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `myshopify.com` | 2 (Prestige 165944590656 içinde başka bir mağazanın asset adresi) | 0 | 0 | 0 | 0 | 0 | 0 | 1 (Judge.me ayarı: `52ae29-e0.myshopify.com`, zararsız) |

### `_ab=` ve `myshopify.com` bulguları (dosya ve satır)

Satır numaraları içerik aynı olduğu için her temada aynı.

| Terim | Tam link | Dosya | Satır(lar) | Bulunduğu tema sayısı | Yayındaki tema (188825207104) | Tasarim dili (189140861248) |
|---|---|---|---|---|---|---|
| `_ab=` | `https://texttonext.com/pages/bireysel-hediye-kullanim-kilavuzu?_ab=0&key=1767610417973` | `sections/gp-section-600757128960934764.liquid` | 49 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couple-hediye-kullanim-kilavuzu?_ab=0&key=1767611056807` | `sections/gp-section-600757261668713324.liquid` | 35 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplekapsuldahafazlabilgial?_ab=0&key=1768300603877` | `sections/gp-global-section-624389509747835422.liquid` | 108, 121, 144, 154 | 13 | var (kullanılmıyor) | var (kullanılmıyor) |
| `_ab=` | `https://texttonext.com/pages/couplekapsuldahafazlabilgial?_ab=0&key=1768300603877` | `sections/gp-section-602071618163835431.liquid` | 823, 859 | 1 (YEDEK) | – | – |
| `_ab=` | `https://texttonext.com/pages/couplekapsuldahafazlabilgial?_ab=0&key=1768300603877` | `sections/gp-section-602077140871021095.liquid` | 823, 859 | 1 (YEDEK) | – | – |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-global-section-624389509747835422.liquid` | 180, 193, 216, 226, 272, 290, 308, 323, 344, 362, 380, 395, 415, 433, 451, 466 | 13 | var (kullanılmıyor) | var (kullanılmıyor) |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-601917427344736986.liquid` | 419, 455, 506, 574, 606, 642 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-601917427345588954.liquid` | 963, 999 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-601917427345720026.liquid` | 389, 425 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-601918380492063450.liquid` | 561, 597 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-601918380492391130.liquid` | 469, 505, 556, 624, 656, 692 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-601918380492522202.liquid` | 963, 999 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-601924819017008079.liquid` | 950, 986 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-601924925954982618.liquid` | 950, 986 | 13 | var | var |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-602071618163835431.liquid` | 902, 938 | 1 (YEDEK) | – | – |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `sections/gp-section-602077140871021095.liquid` | 902, 938 | 1 (YEDEK) | – | – |
| `_ab=` | `https://texttonext.com/pages/couplezamankapsulleri?_ab=0&key=1763216087047` | `templates/index.json` | 401 | 1 (Concept temasının kopyası) | – | – |
| `_ab=` | `https://texttonext.com/pages/hediyekapsuldahafazlabilgial?_ab=0&key=1768301130954` | `sections/gp-section-602071618163835431.liquid` | 439, 475 | 1 (YEDEK) | – | – |
| `_ab=` | `https://texttonext.com/pages/hediyekapsuldahafazlabilgial?_ab=0&key=1768301130954` | `sections/gp-section-602077140871021095.liquid` | 439, 475 | 1 (YEDEK) | – | – |
| `_ab=` | `https://texttonext.com/pages/hediyekapsuldahafazlabilgial?_ab=0&key=1768301130954` | `templates/index.json` | 1137 | 1 (Concept temasının kopyası) | – | – |
| `myshopify.com` | `https://nhocleo-live.myshopify.com/cdn/shop/t/1/assets/ecom-65d808d2464badc653063cc2.css?v=…` | `sections/ecom-default-template-quickview.liquid` | 16 | 1 (Prestige 165944590656) | – | – |
| `myshopify.com` | `https://nhocleo-live.myshopify.com/cdn/shop/t/1/assets/ecom-65d808d2464badc653063cc2.js?v=…` | `sections/ecom-default-template-quickview.liquid` | 17 | 1 (Prestige 165944590656) | – | – |

"13 tema": YEDEK, Duzeltme 3/4/6/7, Catal karsilastirma, Catal renk ayarlari, Urun sagsutun, Calisma taslagi (yayında), Text To Next PRO, Redesign, Calisma kopyasi, Tasarim dili.

**Bu linkler hangi temaya işaret ediyor?** Hiçbirine. Linklerde tema ID'si ya da `preview_theme_id` yok. `_ab=0&key=<13 haneli zaman damgası>` GemPages editörünün eklediği bir kalıntı; damgalar 15.11.2025 ile 13.01.2026 arasına denk geliyor. Temiz oturumda 5 linkin hepsini açtım; hepsi **yayındaki temayla** (188825207104) açıldı.

**Yayında görünen yerler.** `gp-global-section-624389509747835422` hiçbir şablonda kullanılmıyor. Kalan linkler yayında şu 3 GemPages sayfasında görünüyor:

| Sayfa | İçindeki `_ab` linkleri |
|---|---|
| `/pages/kullanim-kilavuzu` | `bireysel-hediye-kullanim-kilavuzu?_ab=0&key=1767610417973`, `couple-hediye-kullanim-kilavuzu?_ab=0&key=1767611056807` |
| `/pages/couplekapsuldahafazlabilgial` | `couplezamankapsulleri?_ab=0&key=1763216087047` (4 bölümde, 12 yerde) |
| `/pages/hediyekapsuldahafazlabilgial` | `couplezamankapsulleri?_ab=0&key=1763216087047` (4 bölümde, 12 yerde) |

### Ek bulgu: kırık alan adı

`https://shop.texttonext.com/#` şu iki yerde geçiyor:
- `iletisim` sayfasının gövdesi ("İstanbul Ofis" adresi),
- yayındaki temada `sections/gp-section-556461993255503041.liquid:664` ve `templates/page.gp-template-556461893263295681.json:35` (`/pages/iletisimsayfasi`).

`shop.texttonext.com` DNS'te `shops.myshopify.com`'a yönleniyor ama mağazaya bağlı değil. Tarayıcı SSL hatası verir.

---

## 3. Layout dosyaları ve şablon → layout eşlemesi

### Yayındaki tema (Calisma taslagi 188825207104) ve Tasarim dili (189140861248)

Layout dosyaları iki temada aynı:

| Layout | header-group | footer-group | Kullanan şablon |
|---|---|---|---|
| `layout/theme.liquid` | var | var | 67 şablon (Tasarim dili'nde 72); `password` dışındaki tüm JSON şablonlar |
| `layout/password.liquid` | – | – | `templates/password.json` |
| `layout/theme.gempages.header.liquid` | var | yok | **hiçbiri** |
| `layout/theme.gempages.footer.liquid` | var | var | **hiçbiri** |
| `layout/theme.gempages.blank.liquid` | yok | yok | **hiçbiri** |
| `layout/theme.gem-layout-none.liquid` | yok | yok | **hiçbiri** |
| (layout yok: `{% layout none %}`) | – | – | `templates/gift_card.liquid`, `templates/product.bundle-card.liquid` |

Hiçbir şablonda `"layout"` alanı yok; GemPages şablonları dahil hepsi `theme.liquid` kullanıyor.

**Eski header veya footer taşıyan alternatif layout var mı?** Hayır. 4 GemPages layout'u var ama hiçbir şablon kullanmıyor. Kullansaydı bile `gempages.header` ve `gempages.footer` aynı `header-group` / `footer-group`'u çağırıyor; `blank` ve `gem-layout-none` ise hiç header ya da footer basmıyor. Ayrı, eski bir header kopyası taşımıyorlar.

### Diğer temalar (özet)

| Tema | Layout dosyaları | Varsayılan dışı kullanım |
|---|---|---|
| Dawn, SparkLayer Dawn | theme, password | gift_card (none), password |
| Prestige 165944590656 | theme, **ecom** | 2 şablon `{% layout 'theme' %}` |
| Prestige 168738586944 | theme | – |
| Concept temasının kopyası | theme, password | 2 none, password |
| YEDEK | theme, password, gempages.blank/footer/header | 2 none, password |
| Diğer 10 Concept kopyası | theme, password, gem-layout-none, gempages.blank/footer/header | 2 none, password |

---

## 4. GemPages sayfaları kendi header/footer kopyasını taşıyor mu?

**Hayır.** Yayındaki temada GemPages sayfaları (`page.gp-template-*`) yalnızca `gp-section-*` bölümlerinden oluşuyor ve `theme.liquid` ile çiziliyor. Bu yüzden temanın kendi header'ını (`header-group` → `header`) ve footer'ını (`footer-group` → bülten) gösteriyorlar. Temiz oturumda ölçüldü: bu sayfaların üstünde `sections:header`, altında `sections:newsletter` var.

Temada 17 adet `gp-global-section-*` dosyası var. Bazılarında menü, logo ve sepet benzeri işaretleme bulunuyor (ör. `gp-global-section-546249485466993483`, `-584538881043465076`). Ancak **hiçbiri yayındaki temanın bir şablonunda ya da bölümünde kullanılmıyor**, yani sitede çizilmiyorlar.

**GemPages sayfaları neden "eski" görünüyor?** Bu şablonlarda yeni `tt-baslik` bölümü yok. O yüzden Concept temasının beyaz standart header'ı açılıyor.

Yayındaki temada yeni header taşıyan şablonlar (11):
- `index`, `index.gp-template-bk-default`
- `collection.celik-kolyeler`, `collection.couple-urunler`, `collection.zaman-kapsulu-bileklik`, `collection.zaman-kapsulu-kolyeler`
- `product.zaman-kapsulu`, `product.zaman-kapsulu-couple`, `product.couple`
- `page.couple-daha-fazla-bilgial`, `page.hediye-daha-fazla-bilgial`

Diğer 57 şablon ve `/policies/*` sayfaları standart header gösteriyor.

Ekran görüntüleri (`ekran/karsilastirma-ust.png`, telefon, soldan sağa):
1. Ana sayfa: koyu yeni header
2. couplekapsuldahafazlabilgial: beyaz standart header
3. kullanim-kilavuzu: beyaz standart header
4. /policies/refund-policy: beyaz standart header
5. merkez sayfa: video üstünde saydam header
6. koleksiyon: koyu yeni header

`ekran/karsilastirma-alt.png` footer'ların her sayfada aynı olduğunu gösteriyor.

---

## 5. Benim ekran görüntülerim

**Daha önce verdiklerim:**
- Adres kalıbı: `https://texttonext.com/<yol>?preview_theme_id=189140861248`
- Tema: **Tasarim dili - 2026-10-16 (189140861248, taslak)**. Yayındaki tema değil.
- Her test turu yeni ve çerezsiz bir Playwright oturumuyla başladı. İlk adresteki parametre o tur boyunca önizlemeyi sürdürdü; yani ben de testlerde bilerek bu "takılı önizleme" davranışını kullanıyordum.
- Önizleme çubuğunu ekran görüntülerinde CSS ile gizlemiştim. Bu yüzden görüntülerde önizleme olduğu anlaşılmıyordu.
- **Tek istisna:** masaüstü testinin ilk çalıştırmasında parametre yanlışlıkla `#` işaretinin arkasına düştü (`…#iade?preview_theme_id=…`). Shopify parametreyi görmedi ve **yayındaki tema** (video hero) açıldı. O görüntü sonra düzeltilmiş çalıştırmayla değiştirildi.
- Size gönderilen merkez sayfa görüntüsünde beyaz header görünmesinin nedeni bölüm 4'teki: `page.sozlesmeler` şablonunda `tt-baslik` yok.

**Temiz oturumda yeniden alınanlar** (önizleme parametresi yok, çerez yok):

| Sayfa | Cihaz | Görünen tema | Not |
|---|---|---|---|
| `/` | telefon, masaüstü | Calisma taslagi 188825207104 (main) | koyu yeni header |
| `/pages/sozlesmeler-ve-politikalar` | telefon, masaüstü | Calisma taslagi 188825207104 (main) | `page.sozlesmeler` yayındaki temada yok → `page.json` → video + ürün şeridi; metin ve sekme görünmüyor |
| `/pages/mesafeli-satis-sozlesmesi` | telefon | Calisma taslagi 188825207104 | aynı (`page.yasal` yayında yok) |
| GemPages sayfaları (6 adet) | telefon / masaüstü | Calisma taslagi 188825207104 | beyaz standart header |
| `/policies/refund-policy` | telefon | Calisma taslagi 188825207104 | beyaz standart header |
| koleksiyon, ürün, hediye bilgi | telefon | Calisma taslagi 188825207104 | koyu yeni header |

Ayrıca 56 adres temiz oturumda açıldı: ana sayfa, yayındaki tüm sayfalar (merkez sayfa dahil), 4 politika, 17 koleksiyon ve 5 `_ab` linki. İlk taramadaki 70 sayfa (menüden ulaşılan koleksiyonlar ve ürünler) da açıldı. **Hepsi 188825207104 (yayındaki tema) ile geldi.** Yalnızca `/collections/1-al-1-bedava-celik` 404 döndü (o da yayındaki temayla). Önizleme çubuğu hiçbirinde çıkmadı ve hiçbir sayfada önizleme parametreli link bulunmadı. Ham sonuç: `ekran/temiz-oturum-tarama.json`.

**Takılı önizleme kanıtı:** `ekran/yapiskan-*.png` ve `ekran/yapiskan.json`.
1. Temiz ana sayfa: yayındaki tema.
2. `?preview_theme_id=187506262336`: YEDEK.
3. Parametresiz ana sayfa: hâlâ YEDEK. Üstte "İki Günde Kapında" duyuru çubuğu ve beyaz header var.
4. Parametresiz koleksiyon: hâlâ YEDEK.
5. Parametresiz GemPages sayfası: hâlâ YEDEK.

`ekran/yapiskan-karsilastirma.png` 1, 3 ve 5'i yan yana gösteriyor.

---

## 6. Sorunun kaynağı, etkilenen linkler, önerilen düzeltme

### Kaynak

1. **"Bazı linklere tıklayınca eski tema açılıyor":** tarayıcıda önceden açılmış bir tema önizlemesi takılı kalmış. Bu durumda sitedeki **her link** o temayla açılır. Alt kısımda Shopify önizleme çubuğu görünür. Sitedeki linklerde bunu tetikleyen bir parametre **yok**; kaynak site içeriği değil, tarayıcı oturumu.
2. **"Header farklı görünüyor":** yayındaki temada bile 57 şablon (tüm GemPages sayfaları, politika ve yasal sayfalar, iletişim, sepet, arama…) yeni `tt-baslik` yerine temanın eski beyaz header'ını gösteriyor.
3. **"Footer farklı görünüyor":** temiz oturumda footer her yerde aynı. Footer'ın farklı görünmesi önizlemede açık kalan eski temadan gelir. Örneğin Dawn ve Prestige temalarının yapısı tamamen farklı; YEDEK'te de üstte "İki Günde Kapında" duyuru çubuğu var.

### Etkilenen linkler

- **Önizleme takılıyken:** sitedeki tüm linkler.
- **Temiz oturumda başka tema açan link:** yok.
- **Temizlenmesi gereken GemPages linkleri:** 5 adet `?_ab=0&key=…` (bölüm 2'deki tablo). Yayında `/pages/kullanim-kilavuzu`, `/pages/couplekapsuldahafazlabilgial` ve `/pages/hediyekapsuldahafazlabilgial` sayfalarında.
- **Kırık link:** `https://shop.texttonext.com/#`, `/pages/iletisim` ve `/pages/iletisimsayfasi` içinde.

### Önerilen düzeltme (onayınız olmadan hiçbiri yapılmadı)

1. **Hemen, kod gerektirmez.** Sorunu gördüğünüz tarayıcıda şunlardan birini yapın:
   - `https://texttonext.com/?preview_theme_id=` adresini açın (boş değer önizlemeden çıkarır),
   - ya da alttaki önizleme çubuğundan **Önizlemeden çık**'a basın,
   - ya da texttonext.com çerezlerini silin.

   Doğrulama: tarayıcı konsolunda `Shopify.theme.id` değeri `188825207104` olmalı. Ya da sayfa kaynağında `"role":"main"` yazmalı.
2. **Önleme.** Yayındaki siteyi kontrol ettiğiniz tarayıcıda önizleme linki açmayın; önizlemeleri gizli pencerede açın. Artık gerekmeyen eski temaları silmek bu riski azaltır. Adaylar: Dawn, iki Prestige, SparkLayer Dawn, Concept kopyası, YEDEK ve Ağustos-Eylül tarihli Duzeltme/Catal/Urun temaları. Silmeden önce Shopify yönetiminden tema dosyasını indirin. Tema silme API'de engelli, yönetim panelinden yapılır.
3. **Tek tip header (kod; onay gerekir).** `tt-baslik`'i şablon şablon eklemek yerine `header-group`'a taşıyıp temanın standart header'ını genel olarak gizlemek. Böylece GemPages sayfaları, politika ve yasal sayfalar dahil her sayfada aynı yeni header görünür. Önce taslak temada yapılıp test edilmeli.
4. **GemPages linklerini temizleme (onay gerekir).** 5 linkteki `?_ab=0&key=…` kısmını GemPages editöründe silip düz `/pages/…` yapmak. GemPages bölümleri editörden yeniden üretildiği için düzeltme tema kodunda değil GemPages'ta yapılmalı; yoksa ilk kaydette geri gelir.
5. **`shop.texttonext.com` (onay gerekir).** İletişim adres linkini doğru bir adresle (ör. harita linki) değiştirmek ya da linki kaldırmak. Ya da bu alt alan adını Shopify'da mağazaya bağlamak veya DNS kaydını silmek.
6. **Hatırlatma (önceki rapordan).** Yayındaki temada `page.json`'un metin bölümü kapalı. Merkez sayfa ve yasal sayfalar yayında metin göstermiyor; taslak tema yayına alınınca düzelir.
