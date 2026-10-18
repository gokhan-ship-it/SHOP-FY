# Yayına almadan önce yapılanlar (17.10.2026)

Bütün tema işleri yalnızca **"Tasarim dili - 2026-10-16" (189140861248, taslak)** temasında yapıldı.

**Yayındaki tema "Calisma taslagi - 2026-10-05" (188825207104):** Dokunulmadı. Son güncelleme 2026-10-14, bu çalışmadan önce.

**Sayfa adresleri ve kurallar:**
- Hiçbir sayfanın adresi, handle'ı ya da yönlendirmesi değişmedi.
- Hiçbir sayfa silinmedi.
- GemPages'e dokunulmadı.
- Yedekler silinmedi.

**Dosya yükleme yöntemi:**
1. Dosya önce repoya gönderildi.
2. Taslak temaya o commit'in sabit adresinden yüklendi.
3. Yükleme sonrası MD5 değeri Shopify'dan okunup repodaki dosyayla karşılaştırıldı (bkz. bölüm 3).

---

## 1. Yapılanlar

| Madde / karar | Ne yapıldı | Durum |
|---|---|---|
| **Madde 7: Header birleştirme** | Yeni bölüm grubu `sections/tt-baslik-genel.json` eklendi. `layout/theme.liquid` dosyasına bir `elsif` dalı eklendi. Ana sayfa ve ürün sayfaları kendi çubuklarını kullanmaya devam ediyor. Kendi içinde TT Başlık olan 6 şablonda genel çubuk basılmıyor. Temanın beyaz header'ı yalnızca CSS ile gizleniyor; `header-group.json` değişmedi. | Tamam. 23 sayfa türünde telefon ve masaüstünde ölçüldü: **her sayfada tam 1 çubuk var, beyaz header hiçbir yerde görünmüyor.** |
| Ana sayfadaki çift çubuk (yeni bulgu) | Ana sayfada üst üste iki TT Başlık vardı. Biri şablonun içindeydi, öbürü `tt-anasayfa-cubuk` grubundaydı; ayarları birebir aynıydı. Gruptaki kapatıldı (`disabled`). Görünüm aynı kaldı. | Tamam |
| **K13: "Satın Al"** | Genel çubuktaki düğme `/collections/zaman-kapsulu-bileklik` adresine gidiyor. Hediye tanıtım sayfasındaki "Satın Al" düğmesinin bağlantısı boştu; o da aynı adrese bağlandı. Couple tanıtım sayfasındaki düğme eskisi gibi `/collections/couple-urunler` adresine gidiyor. | Tamam |
| **Madde 6: 2.499 → 2.000** | `page.couple-daha-fazla-bilgial.json` ve `page.hediye-daha-fazla-bilgial.json` dosyalarında ücretsiz kargo kartının 3 metni değişti: başlık, açıklama ve pencere metni. Yalnızca rakam değişti. | Tamam |
| **Madde 8: Poppins 500** | Taslak tema Poppins 500'ü zaten kendisi tanımlıyor (`poppins_n5`, `snippets/css-variables.liquid`). Bugün tarayıcı GemPages'in kopyasını kullanıyor. Benzetimde GemPages dosyaları engellenince 500 ağırlığı temanın kendi dosyasından yüklendi. **Kod değişikliği gerekmedi.** | Doğrulandı |
| **K5 + K6: iletişim bilgileri** | Yeni adres: "Göztepe Mah. Tepegöz Sk. Ikar İş Merkezi No:1 İç Kapı No:8 Kadıköy/İstanbul". Adres Google Haritalar linkiyle veriliyor. E-posta info@texttonext.com, saat **Hafta içi 10:00–18:00** (sizin seçiminiz). Değişen yerler: (1) temanın iletişim şablonu `page.contact.json`; (2) `/pages/iletisimsayfasi` sayfasının GemPages şablon ayarları (adres/link ve e-posta; saat zaten 10:00–18:00); (3) 4 aktif ürün şablonundaki "Hafta içi 09:30 – 18:00" → "10:00 – 18:00" ve SSS'deki bilgi@ → info@ (tıklanabilir); (4) `/pages/iletisim` sayfasının gövdesi (mağaza; eski adres, `shop.texttonext.com/#` linki, bilgi@ ve 09:30 değişti). | Tamam |
| **K7: `/pages/iletisim` → iletişim şablonu** | Temanın `page.contact.json` şablonu Türkçeleştirildi: "İletişim" başlığı, adres, e-posta, telefon/saat ve iletişim formu. Önizleme: `/pages/iletisim?view=contact`. | Şablon hazır. **Şablon değişikliği yayından sonra** yapılacak (bkz. bölüm 5). |
| **Madde 10: Kılavuz** | Yeni bölüm `sections/tt-kilavuz.liquid` ve 3 şablon eklendi: `page.kilavuz`, `page.kilavuz-bireysel`, `page.kilavuz-couple`. Metinler birebir. Kartlar resim değil metin. Videolar JavaScript beklemeden yükleniyor. **K14:** masaüstünde de 560 px dar, ortalanmış sütun. **K2:** başlık Poppins, gövde Inter. | Hazır. Önizleme `?view=` ile yapıldı. Şablon değişikliği yayından sonra. |
| **K8: `/pages/sozlesmeler`** | Yeni bölüm `sections/tt-belge-listesi.liquid` ve şablon `page.sozlesmeler-liste.json` eklendi. Sayfa `footer-yasal` menüsünü (merkez sayfa + 7 yasal metin) liste olarak gösteriyor. Altında "Önceki sürümler (arşiv, yürürlükte değildir)" başlığıyla iki eski PDF var. Sayfa başlığı "Sözleşmeler" yapıldı (mağaza). PDF'ler silinmedi. | Başlık değişti. Şablon hazır; şablon değişikliği yayından sonra. |
| **K10: `couple-urun-olustur`** | Ürün **taslağa alındı** (ACTIVE → DRAFT). Ürün silinmedi. Handle ve şablon kaydı aynı. | Tamam |
| **K12: `rewards-program-page`** | Sorunuz üzerine **yayından kaldırıldı** (isPublished: false). Handle ve içerik aynı. | Tamam |
| **K11: `hesap-silme-talebi`** | Taslak temaya `page.hesap-silme-talebi.json` şablonu eklendi. Sayfa bu şablonu zaten istiyordu; yayından sonra gövde görünür hale gelecek. **Metin henüz sayfaya yazılmadı.** Taslak metin: `HESAP-SILME-METNI-TASLAK.md`. | **Onayınızı bekliyor** |
| **K16: `product.ttwpm1/2/3`** | Silme komutu (`themeFilesDelete`) bağlı olduğum araçta güvenlik nedeniyle engelli. Dosyalar duruyor, hiçbir ürüne atanmamışlar. | **Elle silinmesi gerekiyor** (bölüm 4) |
| **Madde 5: 9 çelişen ifade** | Hiçbir şey değiştirilmedi. 9 ifadenin hepsinin taslak temada hâlâ yerinde olduğu doğrulandı. Liste: `MADDE5-URUN-IFADELERI.md`. | **Onayınızı bekliyor** |

## 2. Mağazada yapılan değişiklikler (öncesi `yedek-magaza/sayfalar-once-2026-10-17.json`)

| Kayıt | Önce | Sonra |
|---|---|---|
| Ürün `couple-urun-olustur` (9975548248384) | ACTIVE | DRAFT |
| Sayfa `rewards-program-page` (145695572288) | yayında | yayında değil |
| Sayfa `sozlesmeler` (160782123328), başlık | "Landing Page - Feb 12, 23:15:13" | "Sözleşmeler" |
| Sayfa `iletisim` (134497337664), gövde | Caddebostan adresi, `shop.texttonext.com/#` linki, bilgi@, 09:30–18:00 | Göztepe adresi (Google Haritalar), tel: linki, info@, 10:00–18:00 |

Hiçbir sayfanın handle'ı ya da template suffix'i değişmedi.

## 3. Taslak temaya yüklenen dosyalar (MD5 doğrulandı)

| Dosya | Durum | MD5 (Shopify = repo) |
|---|---|---|
| `layout/theme.liquid` | değişti | 01df7447ad1783e657b68eb03a271b64 |
| `sections/tt-baslik-genel.json` | yeni | 91fe6de2fdca22fc61438b22ef96e81b |
| `sections/tt-anasayfa-cubuk.json` | değişti | ad401645f24c3b8309492ff1ae5c4174 |
| `sections/tt-kilavuz.liquid` | yeni | 8b77efd895f507255dd709e860a4b3ae |
| `sections/tt-belge-listesi.liquid` | yeni | 12388c85013247390038ea64b502aa03 |
| `templates/page.kilavuz.json` | yeni | 416f9de9b560cf3cf367e24b63384f5c |
| `templates/page.kilavuz-bireysel.json` | yeni | 7a98ec76875212ef48b45664d5fa8dbe |
| `templates/page.kilavuz-couple.json` | yeni | 7cf3e870648184f5cd6a9911285a1028 |
| `templates/page.sozlesmeler-liste.json` | yeni | a8a9fa52e4c3468814bbf2771c62c5d1 |
| `templates/page.hesap-silme-talebi.json` | yeni | 5645ccd79de5dcb2638827497ad18469 |
| `templates/page.contact.json` | değişti | d8989e7c0fe98732ffe122e62c730dca |
| `templates/page.gp-template-556461893263295681.json` (iletisimsayfasi) | değişti | 41d4cd80e276dd8d49be6b91cbfa6372 |
| `templates/page.couple-daha-fazla-bilgial.json` | değişti | 8d6a6286ef14ad4d0968e4993798b167 |
| `templates/page.hediye-daha-fazla-bilgial.json` | değişti | 3dc4fb5776b226fc02b65b52b0d85cc4 |
| `templates/product.json` | değişti | f1f7141c4148ea56fbe0ef2786e0ffdf |
| `templates/product.zaman-kapsulu.json` | değişti | e4eb683d606f5f7983127bbdff604f6d |
| `templates/product.zaman-kapsulu-couple.json` | değişti | 748ebb8eff194e59c5ec5db080b7baff |
| `templates/product.couple.json` | değişti | dc23d814651c7d75e0791b83000e3876 |

Değişiklik öncesi kopyalar git geçmişinde (commit `a2141e1`). Bir dosyayı geri almak için o sürümün aynı yöntemle yeniden yüklenmesi yeterli.

## 4. Sizin elle yapmanız gerekenler

1. **K16, test şablonlarının silinmesi:**
   1. Online Mağaza → Temalar → "Tasarim dili - 2026-10-16" → ⋯ → **Kodu düzenle** yolunu açın.
   2. `templates` klasöründe şu üç dosyanın her birini açıp **Sil** düğmesine basın: `product.ttwpm1.liquid`, `product.ttwpm2.liquid`, `product.ttwpm3.liquid`.
   3. Yalnızca bu üç dosya silinecek.
2. Politikalar, kargo kuralı, çerez bandı ve sipariş e-postası. Bunları siz yapacağınızı yazdınız. Adımlar `yasal/RAPOR-yasal-metinler.md` bölüm 8'de.

## 5. Yayından sonra yapılacak şablon değişiklikleri (C/D bölümü, onayla)

Bu değişiklikler taslak tema yayına alınmadan yapılırsa sayfalar yayındaki sitede boş görünür. Bu yüzden bekletiliyor. Hepsinde adres ve handle aynı kalır; yalnızca sayfanın template suffix alanı değişir.

| Sayfa | Şu anki suffix | Yeni suffix | Önizleme (bugün) |
|---|---|---|---|
| `/pages/kullanim-kilavuzu` | `gp-template-600755391629886309` | `kilavuz` | `?view=kilavuz` |
| `/pages/bireysel-hediye-kullanim-kilavuzu` | `gp-template-600758654311858837` | `kilavuz-bireysel` | `?view=kilavuz-bireysel` |
| `/pages/couple-hediye-kullanim-kilavuzu` | `gp-template-600760696552030795` | `kilavuz-couple` | `?view=kilavuz-couple` |
| `/pages/iletisim` | (boş, varsayılan) | `contact` | `?view=contact` |
| `/pages/iletisimsayfasi` (18 Ekim 2026) | `gp-template-556461893263295681` | `contact` | `?view=contact` |
| `/pages/sozlesmeler` | `gp-template-606324753770218070` | `sozlesmeler-liste` | `?view=sozlesmeler-liste` |
| `/pages/couplekapsuldahafazlabilgial` (K18) | `gp-template-601917426203886298` | `couple-daha-fazla-bilgial` | `?view=couple-daha-fazla-bilgial` |
| `/pages/hediyekapsuldahafazlabilgial` (K18) | `gp-template-601918380005393114` | `hediye-daha-fazla-bilgial` | `?view=hediye-daha-fazla-bilgial` |

Gerekirse eski GemPages suffix'ine dönmek tek adım, çünkü eski şablonlar temada duruyor.

K3 ve K4 (sahte yorum kartları ve kırık video kutusu) GemPages sayfalarının içinde:
- **K3:** K18 ile temanın hazır şablonlarına geçilince sahte yorum bölümü kendiliğinden kalkıyor. Hazır şablonlarda o bölüm yok; bu doğrulandı.
- **K4:** `text-to-next-pro-1` sayfası taşınırken kırık video kutusu alınmayacak.

## 6. Notlar

- **Varsayılan ürün şablonu (ör. Premium Hediye Kutusu):** Ürün sayfası olduğu halde genel çubuk kullanıyor. Kaydırınca çıkan "Satın Al" düğmesi bileklik koleksiyonuna gidiyor (K13'ün harfi harfine uygulanması). Ürün sayfasında kafa karıştırırsa, bu şablonda düğme kapatılabilir.
- **Tanıtım şablonlarında hâlâ "Başlangıç fiyatı: 2.499 TL" yazıyor.** Bu bir **fiyat** bilgisi, kargo eşiği değil. Madde 6'nın kapsamı dışında kaldığı için değiştirilmedi. Doğru başlangıç fiyatını söylerseniz düzeltirim.
- **K18'de kullanılacak hazır şablonlarda 7 metin yorumu var.** Yorumlarda isim ve "doğrulandı" işareti bulunuyor (Ceren A., Mert S., Selin T., Burak T., Elif K., Yağmur S., Aleyna K.). Bunlarda stok fotoğraf yok, yani K3 kapsamında değiller. Yine de "doğrulandı" işareti taşıdıkları için gerçek müşteri yorumu olduklarını teyit etmenizi öneririm.
- **`contact` sayfası:** Handle'ı `contact`, başlığı İngilizce "Contact". Bu sayfa da `page.contact` şablonunu kullandığı için yayından sonra Türkçe içerikle görünecek. Bugün İngilizce demo metin gösteriyor. Sekme başlığındaki "Contact" yazısı sayfa başlığından geliyor; isterseniz değiştiririm.
- **Mağazanın müşteri hizmetleri e-postası hâlâ bilgi@texttonext.com.** Bu adres temada değil, Shopify Inbox sohbetinin yapılandırmasında görünüyor (`customerServiceEmail`). K5'e göre Ayarlar → Mağaza ayrıntıları bölümünde "Müşteri e-postası" alanının info@texttonext.com yapılması gerekir. Bu ayar elle yapılıyor.
- **iletisimsayfasi (GemPages):** Şablon ayarı taslak temada değişti. GemPages düzenleyicisi bu sayfayı yeniden yayınlarsa değişiklik geri gelebilir. Sayfa ileride taşınacağı için önemli değil.

## 7. Kontrol linkleri (taslak tema önizlemesi)

Son tur ekran görüntüleri isteğiniz üzerine yarıda bırakıldı; kontrolü bu linklerden siz yapacaksınız. Her link taslak temayı açar ve önizleme çubuğu görünür. `?view=` olan linkler, sayfanın şablonunu değiştirmeden yeni şablonu gösterir. Önizlemeden çıkmak için çubuktaki "Exit preview" düğmesine basın ya da `https://texttonext.com/?preview_theme_id=` adresini açın.

| Ne | Link |
|---|---|
| Ana sayfa (tek başlık çubuğu) | https://texttonext.com/?preview_theme_id=189140861248 |
| Tekli ürün (saat 10:00, info@) | https://texttonext.com/products/zaman-kapsul-kolye?preview_theme_id=189140861248 |
| Couple ürün | https://texttonext.com/products/zaman-kapsulu-kolye-classic-white-925-ayar-gumus-couple?preview_theme_id=189140861248 |
| Varsayılan ürün şablonu (genel çubuk) | https://texttonext.com/products/premium-hediye-kutusu?preview_theme_id=189140861248 |
| Couple koleksiyonu | https://texttonext.com/collections/couple-urunler?preview_theme_id=189140861248 |
| Varsayılan koleksiyon (genel çubuk) | https://texttonext.com/collections/zaman-kapsulu-charmlar?preview_theme_id=189140861248 |
| Sepet | https://texttonext.com/cart?preview_theme_id=189140861248 |
| Arama | https://texttonext.com/search?q=kolye&preview_theme_id=189140861248 |
| 404 | https://texttonext.com/sayfa-yok?preview_theme_id=189140861248 |
| Merkez sayfa | https://texttonext.com/pages/sozlesmeler-ve-politikalar?preview_theme_id=189140861248 |
| Yasal sayfa | https://texttonext.com/pages/mesafeli-satis-sozlesmesi?preview_theme_id=189140861248 |
| Politika | https://texttonext.com/policies/refund-policy?preview_theme_id=189140861248 |
| İletişim, YENİ şablon (K5–K7) | https://texttonext.com/pages/iletisim?view=contact&preview_theme_id=189140861248 |
| İletişim, ana menüdeki GemPages sayfası (yeni adres) | https://texttonext.com/pages/iletisimsayfasi?preview_theme_id=189140861248 |
| Kılavuz, YENİ (QR sayfası) | https://texttonext.com/pages/kullanim-kilavuzu?view=kilavuz&preview_theme_id=189140861248 |
| Bireysel kılavuz, YENİ | https://texttonext.com/pages/bireysel-hediye-kullanim-kilavuzu?view=kilavuz-bireysel&preview_theme_id=189140861248 |
| Couple kılavuz, YENİ | https://texttonext.com/pages/couple-hediye-kullanim-kilavuzu?view=kilavuz-couple&preview_theme_id=189140861248 |
| Sözleşmeler, YENİ liste (K8) | https://texttonext.com/pages/sozlesmeler?view=sozlesmeler-liste&preview_theme_id=189140861248 |
| Hesap silme (şablon hazır, metin onay bekliyor) | https://texttonext.com/pages/hesap-silme-talebi?preview_theme_id=189140861248 |
| Couple tanıtım (2.000 TL) | https://texttonext.com/pages/couple-daha-fazla-bilgi-al?preview_theme_id=189140861248 |
| Hediye tanıtım (2.000 TL, Satın Al bağlantısı) | https://texttonext.com/pages/hediye-daha-fazla-bilgi-al?preview_theme_id=189140861248 |
| K18: couplekapsuldahafazlabilgial, hazır şablonla | https://texttonext.com/pages/couplekapsuldahafazlabilgial?view=couple-daha-fazla-bilgial&preview_theme_id=189140861248 |
| K18: hediyekapsuldahafazlabilgial, hazır şablonla | https://texttonext.com/pages/hediyekapsuldahafazlabilgial?view=hediye-daha-fazla-bilgial&preview_theme_id=189140861248 |

Tarayıcıyla yapılan ölçümler (ekran görüntüsü yerine):
- **Başlık çubuğu:** 23 sayfa türünde telefon ve masaüstünde ölçüldü. Her sayfada 1 çubuk var, temanın beyaz header'ı görünmüyor.
- **Yeni şablonların metni:** İletişim, iletisimsayfasi, sözleşmeler listesi ve kılavuz sayfalarında bütün beklenen metinler ve linkler var. Eski adres, bilgi@, `shop.texttonext.com` ve 09:30 hiçbirinde geçmiyor.
- **Kargo eşiği:** Tanıtım sayfalarında "2.000₺ üzeri ücretsiz kargo." görünüyor.
