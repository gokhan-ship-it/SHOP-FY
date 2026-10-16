# Tasarım dili – beş sorun (16.10.2026)

Tema: **Tasarim dili - 2026-10-16** (189140861248). İş öncesinde ve her yüklemede **UNPUBLISHED** olduğu doğrulandı. Bu tema en son düzenlenen tema (updatedAt 16.10 16:50, bizim `setler_adet` yüklememiz).
Yayındaki tema: Calisma taslagi - 2026-10-05 (188825207104). Bu temaya ve diğer temalara dokunulmadı, hiçbir tema yayına alınmadı.
Ürünlere, indirim kurallarına ve uygulama ayarlarına dokunulmadı. Tek istisna önceki mesajda istenen Rose Pink + Nova birim maliyeti (380).

Önizleme linkleri (telefonda açın):
- Ana sayfa: https://texttonext.com/?preview_theme_id=189140861248
- Koleksiyon (Couple): https://texttonext.com/collections/zaman-kapsulu-kolyeler?mod=couple&preview_theme_id=189140861248
- Ürün: https://texttonext.com/products/auron-zaman-kapsulu-bileklik?preview_theme_id=189140861248
- Anlatım: https://texttonext.com/pages/couple-daha-fazla-bilgi-al?preview_theme_id=189140861248

Testler Playwright **WebKit** (iPhone 13 profili, 390×844 ve 360×740) ile yapıldı. Chromium bir süre sonra Cloudflare doğrulama ekranına düştü; iPhone'a daha yakın olduğu için tüm ölçümler WebKit'e taşındı.

---

## 1. Header bazen kayboluyor

### Teşhis
- **Neden:** Header DOM'da duruyor ve sınıf, transform ya da opacity ile gizlenmiyor. Kaydırınca gizlenme mantığı da yok, TT Başlık hiç gizlenmiyor.
- **Asıl sebep temanın kendi CSS'i** (`assets/theme.css`): `body[data-page-rendering]` varken `#MainContent` içindeki 3. ve sonraki bölümlere `content-visibility: auto` veriliyor. `.no-touch` bu kuralı geri alıyor, yani kural **yalnızca dokunmatik cihazlarda** (iPhone, Instagram/WhatsApp tarayıcısı) geçerli.
- **Hangi sayfalarda:** Koleksiyon ve anlatım sayfalarında TT Başlık şablonun içinde, sayfanın aşağısında bir bölüm. Tarayıcı bu bölümü "ekran dışı" sayıp çizmiyor. `content-visibility`'nin getirdiği containment yüzünden `position: fixed` bar da ekrana değil bölüme bağlanıyor. Ölçüm: bar `top: 5277px` konumunda, ekranın dışında.
- **Neden "bazen":** `data-page-rendering`, temanın `initWhenVisible` fonksiyonuyla ancak ilk dokunma ya da kaydırmada veya bir zaman aşımında kalkıyor. Sayfa yenilenip dokunulmadan bakıldığında bar yok; dokununca ya da yeniden yenileyince geliyor.
- **Etkilenmeyen sayfalar:** Ana sayfa ve ürün sayfalarında bar bölüm grubu olarak `#MainContent` dışında basılıyor, orada sorun yok.
- **Elenen olasılıklar:** Scroll restoration, bfcache, backdrop-filter ve header yüksekliği nedenleri araştırıldı; ölçümde bunların hiçbiri gizlemeye yol açmıyor.

### Düzeltme (`sections/tt-baslik.liquid`)
- Bölümün sarmalayıcısı `content-visibility: visible !important; contain: none !important` ile muaf tutuldu. Aynı çözüm temada `hediye-secim-cubugu` için zaten kullanılıyordu.
- Düğme ve ikon durumu `load` ve `pageshow` olaylarında mevcut kaydırma konumundan yeniden hesaplanıyor.
- bfcache'ten dönüşte açık kalmış menü kilidi ve sınıflar temizleniyor. Bar hiçbir durumda gizlenmiyor.

### WebKit yenileme testi (20 yenileme, ilk 3,5 sn kare kare izlendi)

| Sayfa | Konum | Önce: kayboldu | Sonra: kayboldu |
|---|---|---|---|
| Ana sayfa | en üst | 0/20 | 0/20 |
| Ana sayfa | orta | 0/20 | 0/20 |
| Ana sayfa | en alt | 0/20 | 0/20 |
| Koleksiyon | en üst | 20/20 | 0/20 |
| Koleksiyon | orta | 20/20 | 0/20 |
| Koleksiyon | en alt | 20/20 | 0/20 |
| Ürün | en üst | 0/20 | 0/20 |
| Ürün | orta | 0/20 | 0/20 |
| Ürün | en alt | 0/20 | 0/20 |
| Anlatım (couple) | en üst | 20/20 | 0/20 |
| Anlatım (couple) | orta | 20/20 | 0/20 |
| Anlatım (couple) | en alt | 20/20 | 0/20 |

---

## 2. Çark çevrilince fiyatlar düşmüyor

### Teşhis
- **Çark:** Temaya gömülü çark kullanılıyor (`sections/ttn-cark.json` → `ttn-cark-genel`, `assets/ttn-cark.js`, kod `K7QX4M9TR`, 30 dk). Wheel.io değil.
- **Durumun saklandığı yerler:**
  - Çerezler: `wlo-codebar-code`, `wlo-codebar-counter` (sn), `wlo-codebar-time` (ms).
  - localStorage: `ttnCark` (durum) ve `ttKod` (kod + bitiş, çerez aynası).
  - `<html data-ttn-kod>` niteliği.
- **Gösterimi yapan kod:** `assets/taksit-tablosu.js`
  - `kolCiz()`: `[data-tt-kart-fb]` bloklarını açıyor, temanın `.price` satırını gizliyor.
  - `fbCiz()`: ürün sayfasındaki şerit.
  - Bloklar Liquid'de (`snippets/tt-kart-taksit.liquid`, Çok satanlar, set şeridi) `[hidden]` basılıyor.
- **Tasarım dili işi bu kodu bozmadı:** Aynı testte yayındaki tema ile Tasarim dili birebir aynı sonucu verdi.
- **Kullanıcının "düşmüyor" deneyiminin olası sebepleri:**
  1. Öneri kartlarında indirimli fiyat hiç çıkmıyor (her iki temada).
  2. Yenilemede fiyat önce normal görünüp sonra değişiyor.
  3. Biçim kart tiplerine göre farklı; ürün sayfasında büyük rakam "Kodunuzla …" şeridinde.
  4. Yapışkan sepete ekle çubuğu normal fiyat gösteriyor (her iki temada).

| Bileşen | Yayındaki tema (önce) | Tasarım dili (önce) | Tasarım dili (sonra) | Not |
|---|---|---|---|---|
| Koleksiyon kartları (tt-uk-kart) | çalışıyor (22/22) | çalışıyor (22/22) | çalışıyor (22/22) | biçim etiket + tutar + çizili olarak birleştirildi |
| Set şeridi kartları (Couple modunda) | çalışıyor | çalışıyor | çalışıyor (9/9) | zaten doğru biçimdeydi |
| Ana sayfa Çok satanlar | çalışıyor (16/16) | çalışıyor (16/16) | çalışıyor (16/16) | zaten doğru biçimdeydi |
| Öneri kartları (ürün sayfası altı) | **çalışmıyor (0/6)** | **çalışmıyor (0/6)** | çalışıyor (6/6) | kartlar `kolCiz`'den sonra fetch ile geliyordu; gözlemci eklendi |
| Ürün sayfası ana fiyat | "Kodunuzla 1.899,00 TL" şeridi | aynı | "İNDİRİM KODU İLE / 1.899,00 TL / ~~2.399,00 TL~~" | yeni Liquid bloğu, varyant değişiminde güncelleniyor |
| Couple görünümü (?view=couple) | şerit | şerit | yeni blok | aynı snippet |
| Set oluşturma kutusu (çubuk) | "Çark indirimi −500" satırı | aynı | aynı + 3–6 ürün toplamı | çalışıyordu |
| Sepet çekmecesi | kod uygulanıyor (−500) | aynı | aynı | Shopify kod satırı |
| Yapışkan sepete ekle çubuğu | normal fiyat | normal fiyat | normal fiyat | yayındakinde de yok; dokunulmadı (öneri) |

### Düzeltmeler
- **Tek biçim:** Üstte küçük "İNDİRİM KODU İLE", altında koyu indirimli tutar (#0A0A0A), yanında üstü çizili normal fiyat (#5C5C57). Değişen dosyalar `snippets/tt-kart-taksit.liquid`, `snippets/tt-yapilandirma.liquid` ve `snippets/tt-fiyat-kod.liquid`.
- **İlk boyamada indirim** (`snippets/tt-kod-erken.liquid`, `<head>`):
  - Kod geçerliyse bloklar HTML ayrıştırılırken açılıyor, normal fiyat CSS `:has` ile gizleniyor.
  - Yenilemede zıplama yok. Ölçülen CLS: koleksiyon 0, ürün 0.
  - DOMContentLoaded anında ürün bloğu açık (önce 0/0, sonra 1/1).
- **Sonradan gelen kartlar:** `taksit-tablosu.js` içinde yeni `[data-tt-kart-fb]` gelince `kolCiz` yeniden çalışıyor (öneriler, filtre). `<html data-tt-kod>` kod durumuyla eşitleniyor.
- **Süre bitince yenilemesiz geri dönüş:** Kalan süre 25 sn ile test edildi. Koleksiyonda 22 blok → 0 ve normal fiyat geri geldi. Üründe blok kapandı, tema fiyatı göründü, çark çubuğu kalktı.
- **Dokunulmayanlar:** Çarkın kendisi, indirim tutarı ve kod mantığı.

Görüntüler: `fiyat/once-td`, `fiyat/once-canli`, `fiyat/sonra-kazanilmis`, `fiyat/sonra-kazanilmamis`, `fiyat/sure-bitti`.

---

## 3. Çark sayacı çubuğu ve yüzen öğeler

### Önce (ölçülen)
- **Couple modu:** "Nasıl çalışır?" "Sepete ekle" çubuğunun **98 px altında/arkasında** kalıyor.
- **Çark sayaç çubuğu:** Sepet çubuğu çıkınca tamamen gizleniyordu (`gizle_secici: .tt-sc-cubuk`). Ürün sayfasında sticky form ile ikisi de `bottom: 0`.
- **Sohbet:** Kendi kuralıyla, çark çubuğunu bilmeden kayıyordu.

### Düzeltme (`snippets/tt-alt-yigin.liquid`, `layout/theme.liquid` sonu)
- Tek değişken: `--tt-alt-yigin = --tt-alt-sepet + --tt-alt-cark`. Görünür çubuklar kendi işaretlerinden ölçülüyor: `tt-sc-cubuk` için `[hidden]` / `[data-sc-gizli]`, `product-sticky-form` için opacity, çark için `[hidden]` / `[data-ttn-ortulu]`.
- Sıra alttan yukarı: **Sepete ekle → çark sayacı → yüzen butonlar**. Sepet çubuğu kaydırınca gizlenince üsttekiler kayıyor; sayfa altına yığın kadar boşluk bırakılıyor.
- **"Nasıl çalışır?":** yığının 12 px üstünde, solda.
- **Sohbet (Shopify Inbox):** Uygulamanın ayarında alt ofset yok (yalnızca sol/sağ). Uygulamanın kendi CSS değişkeni `--shopify-chat-activator-offset` kullanıldı, uygulama koduna dokunulmadı. Inbox butonu bu değerin ~68 px üstüne koyuyor; bu yüzden Sohbet yığının **80 px** üstünde. Şart (≥12 px) sağlanıyor. Tam hizalamak için Inbox'ın iç sabitine bağlanmak gerekir; bilerek yapılmadı.
- **`sections/ttn-cark.json`:** `kaydir_secici` ve `gizle_secici` boşaltıldı (alt yığınla çakışıyorlardı). Çarkın kendisine dokunulmadı.

### Sonra (WebKit, 12 durum)

| Durum | Boyut | Sayfa | Çakışma | Nasıl çalışır ↔ çubuk | Sohbet ↔ çubuk | Nasıl ↔ Sohbet |
|---|---|---|---|---|---|---|
| kazanılmamış | 390×844 | koleksiyon-couple | yok | 12 | 80 | 76 |
| kazanılmamış | 360×740 | koleksiyon-couple | yok | 12 | 80 | 46 |
| kazanılmış | 390×844 | koleksiyon-couple | yok | 12 | 80 | 76 |
| kazanılmış | 360×740 | koleksiyon-couple | yok | 12 | 80 | 46 |
| kazanılmış | 390×844 | ürün | yok | – | 80 | – |
| kazanılmış | 390×844 | ana | yok | 12 | 80 | 76 |
| kazanılmış | 360×740 | ana | yok | 12 | 80 | 46 |

Kazanılmamış ürün ve ana sayfa durumlarında çubuk yok, butonlar kendi yerinde. Önce: koleksiyon-couple'da her durumda **sepet çubuğu × Nasıl çalışır çakışması** vardı. Görüntüler `alt-yigin/once`, `alt-yigin/sonra`.

---

## 4. Header'da "Ürünü Öğren"
- **Kaynak:** TT Başlık bölümünün düğmesi, 4 koleksiyon şablonunda (`collection.celik-kolyeler`, `couple-urunler`, `zaman-kapsulu-bileklik`, `zaman-kapsulu-kolyeler`).
- **Nasıl kapatıldı:** TT Başlık'a **"Düğmeyi göster"** (`dugme_goster`) ayarı eklendi. Bu 4 şablonda **kapalı**. Metin ("Ürünü Öğren") ve bağlantı ayarda duruyor; tema düzenleyiciden bu kutu işaretlenince geri gelir. Kod silinmedi.
- **Sonuç:**
  - Koleksiyonlarda kaydırmadan önce ve sonra sağda her zaman arama + sepet ikonları duruyor.
  - Sepet rozeti tüm örneklerde #D6FF00 zemin, #0A0A0A yazı (zaten böyleydi).
  - Ana sayfa ve ürün sayfasında düğme yoktu, değişmedi.
- **Dokunulmayan:** Anlatım sayfalarında (couple / hediye) aynı mekanizmayla bir **"Satın Al"** düğmesi var; kaydırınca çıkıyor.

| Sayfa | Önce (kaydırınca) | Sonra (kaydırınca) |
|---|---|---|
| Ana sayfa | ikonlar | ikonlar |
| Koleksiyon (kolye/bileklik/couple-ürünler) | **Ürünü Öğren**, ikonlar gizli | ikonlar |
| Ürün | ikonlar | ikonlar |
| Anlatım (couple) | Satın Al | Satın Al (dokunulmadı) |

Görüntüler `ust-bar/once`, `ust-bar/sonra`.

---

## 5. Set oluşturma: 2'den fazla ürün

### Teşhis – "İkinci Üründe %50 İndirim"
- **Tip:** Otomatik **Buy X Get Y**.
- **X ve Y:** 1 ürün al, 1 ürün **%50**.
- **Kapsam (X ve Y aynı):** Erkekler İçin Zaman Kapsülleri, Kadınlar İçin Zaman Kapsülleri, Event Zaman Kapsülü, Zaman Kapsülü Erkek Kolye, Couple, Couple Collection, Couple Zaman Kapsülleri, Couple Ürünler.
- **Sipariş başına kullanım:** sınırsız (`usesPerOrderLimit: null`).
- **Birleşme:** sipariş, ürün ve kargo indirimleriyle birleşebiliyor.
- **Uygulanan ürünler:** Her 1+1 çift için bir indirim, **en ucuz** ürünlere.

Sepette gerçekten denendi (WebKit, yalnızca test oturumunun sepeti, **sipariş oluşturulmadı**, her adımda sepet boşaltıldı):

| Ürün | Liste toplamı | %50 alan ürünler | %50 tutarı | Toplam | + çark kodu |
|---|---|---|---|---|---|
| 2 (Gourmet 4.499, Kral 4.299) | 8.798 | Kral | −2.149,50 | 6.648,50 | 6.148,50 (−500 birlikte uygulandı) |
| 3 (+ Gemici 3.499) | 12.297 | Gemici (en ucuz) | −1.749,50 | 10.547,50 | 10.047,50 |
| 4 (+ Lumin 2.699) | 14.996 | Lumin + Gemici | −3.099 | 11.897 | 11.397 |
| 5 (+ Auron 2.399) | 17.395 | Auron + Lumin | −2.549 | 14.846 | 14.346 |

Sonuç: n üründe **floor(n/2)** en ucuz ürün %50 indirimli. Çark kodu (500 TL, sepet düzeyi) her durumda birlikte uygulanıyor.

### Uygulama (`sections/tt-secim-kartlari.liquid`, `assets/tt-secim-kartlari.js/.css`)
- **Sınır:** Bölüm ayarı "En fazla seçilebilecek ürün" (`secim_sinir`, 2–10, varsayılan **6**). Üçüncü seçim artık en eskiyi düşürmüyor.
- **Metinler ve buton:** İstenen metinler uygulandı (ölçülen):
  - 0: "0/2 seçildi", "2 ürün daha seç", "Sepete ekle (0/2)" pasif.
  - 1: "1/2 seçildi", "1 ürün daha seç", "Sepete ekle (1/2)" pasif.
  - 2: "2/2 seçildi ✓", "İstersen daha fazla ürün ekleyebilirsin.", "Sepete ekle (2)".
  - 3: "3 ürün seçildi ✓", aynı alt metin, "Sepete ekle (3)".
  - 6: "6 ürün seçildi ✓", "En fazla 6 ürün seçebilirsin.", "Sepete ekle (6)"; seçilmemiş 16 kartın "+"sı pasif.
  - 7. ürün denemesi: aynı uyarı, ürün eklenmiyor.
- **Ayarlar:** Yeni metinler bölüm ayarı (`set_sayac_cok`, `ek_ipucu`, `sinir_metin`, `ek_on`, `ek_cikar`). `set_hazir` ve `dugme_tam` değerleri istenen metne çevrildi.
- **Kutular ve liste:** 1. ve 2. ürün kutuları aynen duruyor. 3.–6. ürünler kutuların altında küçük bir listede, her biri "×" ile kaldırılabiliyor.
- **Çubuk toplamı:** Yukarıdaki gerçek kurala göre hesaplanıyor. Doğrulandı: 3 ürün için çubuk **5.697,50 TL**, sepet **5.697,50 TL**.
- **Sepete ekleme:** Seçilenlerin hepsi tek `/cart/add.js` isteğinde. Aynı varyant birden çok seçilmişse adet birleşiyor.
- **Değişmeyenler:** Çubuğun görünme kuralı aynı (kutu ekrana gelince, ≥1 ürün seçiliyken her yerde).

### Önerilen indirim metni (henüz uygulanmadı – sizin onayınız gerekiyor)
**Uyumsuzluk:** Mevcut metinler ("2. ürün – Sepette %50 indirimli", "İkincisi yarı fiyatına") iki ürün için doğru. 3+ üründe %50'yi her zaman 2. kutudaki ürün değil, **en ucuz** ürünler alıyor. Örneğin 3 üründe 2. kutudaki Santorin değil, listedeki Klasik Zaman Kapsülü indirimli oldu.

Öneri:
- Kural bandı: **"Her 2 üründe 1'i %50 indirimli"** (alt satır: "İndirim sepette en uygun fiyatlı ürünlere uygulanır.").
- 3+ üründe 2. kutunun alt yazısı: "Sepette %50'ye dahil olabilir" ya da 2. kutunun %50 rozeti 3+ üründe gizlensin.
- Çubukta tasarrufun yanında küçük not: "%50, en uygun fiyatlı [k] ürüne uygulanır."

Varsayılan olarak mevcut metinler değiştirilmedi.

---

## Genel kontroller (sonra, WebKit)

| Kontrol | Sonuç |
|---|---|
| Couple modunda 2 ürün → sepete ekle | 2 ürün, "İkinci Üründe %50" Santorin Gold'a uygulandı (2.299 → 1.149,50), toplam 3.448,50 |
| Single modunda "+" ile sepete ekleme | 1 ürün eklendi |
| Hazır set (Nova + Chloe) sepete ekleme | 1 adet 3.599 eklendi |
| Nasıl çalışır yüzen butonu → pencere | açıldı |
| Izgaradaki "Nasıl çalışır?" kartı → pencere | açıldı |
| Yeni menü | açıldı (Kadın / Erkek / Couple / Nasıl çalışır? kartları) |
| Liquid hatası | yok (5 sayfa) |

**Sohbet ve menü:** Menü açıkken Sohbet butonu menünün üstünde görünüyor. Bu sırada alt yığın boş olduğu için yeni kodla ilgisi yok, önceden de vardı. İsterseniz menü açıkken Sohbet de gizlenebilir.

---

## Değişen dosyalar (yalnızca Tasarim dili, MD5 temada doğrulandı)

| Dosya | MD5 |
|---|---|
| layout/theme.liquid | d2ba1794ce56a28ed4887ab2e4aa456a |
| sections/tt-baslik.liquid | 8c796a9c93f5998e86120c9181f2b644 |
| sections/tt-secim-kartlari.liquid | 538c842f3f32246b7f34d343822b42c0 |
| sections/ttn-cark.json | 230a3e8e8eaa75d4fa5fdcd22d1aaffc |
| snippets/tt-alt-yigin.liquid (yeni) | 42d250f2ca78803ec9fa5b1c66b42fa8 |
| snippets/tt-kod-erken.liquid (yeni) | 4ccfbf4a0990fa0aa79529170ebc1bb5 |
| snippets/tt-fiyat-kod.liquid | cb0cb492d48722adde06c08e7f54a107 |
| snippets/tt-kart-taksit.liquid | a020664c3af68fc4caa80478dbf51855 |
| snippets/tt-yapilandirma.liquid | aa6f6424de49fe803c86bab738d9dbf3 |
| assets/taksit-tablosu.js | a206834aad39ad936d35165ece9c2de9 |
| assets/tt-secim-kartlari.js | b7ae28602817c62a022cbf36aa582a2f |
| assets/tt-secim-kartlari.css | 82340b52c2fa858ab04a32529260740a |
| templates/collection.celik-kolyeler.json | b6866c7079605407457c79c18632cdc5 |
| templates/collection.couple-urunler.json | c4adcb759590ed8ed2e91af019080081 |
| templates/collection.zaman-kapsulu-bileklik.json | a30d62e49c6a412b73320c5f13832b0e |
| templates/collection.zaman-kapsulu-kolyeler.json | a6b47ea1147b954a551cd1061fe6ffe8 |

Commit'ler: c305b9b (ana iş), e755d43 (geri sayım boşluğu). Dal: `claude/new-session-uhmgke`.

## Yayındaki temanın MD5'i
İş başında ve sonunda Calisma taslagi - 2026-10-05 temasının 669 dosyasının MD5'i alındı: **669 dosya, fark: 0** — yayındaki tema değişmedi.

## Açık konular / öneriler
1. **Yapışkan sepete ekle çubuğu (ürün sayfası):** Yayındaki temada da indirimli fiyat göstermiyor. Temanın `main-product` bölümüne dokunmak gerektiği için kapsam dışı bırakıldı.
2. **İndirim metni:** 5. maddedeki öneri onayınızı bekliyor.
3. **Sohbet hizası:** Sohbet, "Nasıl çalışır?"tan ~68 px yüksekte (Inbox'ın kendi payı). Binme yok.
4. **Ana sayfadaki çift TT Başlık:** Ana sayfada TT Başlık iki yerde var: `index.json` içinde ve bölüm grubunda (`tt-anasayfa-cubuk`). Görünen bölüm grubundaki; şablondaki fazlalık kaldırılabilir. Dokunulmadı.
