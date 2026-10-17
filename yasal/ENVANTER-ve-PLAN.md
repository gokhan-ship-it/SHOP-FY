# Yasal metinler – envanter ve plan (17.10.2026)

Hiçbir şey değiştirilmedi. Yalnızca okundu ve yedek alındı.

Çalışılacak tema: **Tasarim dili - 2026-10-16** (gid://shopify/OnlineStoreTheme/189140861248), rol **UNPUBLISHED**.
Yayındaki tema: Calisma taslagi - 2026-10-05 (188825207104). Bu temaya dokunulmayacak.

## 1. Sayfalar (/pages/*)

| Handle | Başlık | Yayında | Şablon | Not |
|---|---|---|---|---|
| contact | Contact | evet | contact | |
| **mesafeli-satis-sozlesmesi** | Mesafeli Satış Sözleşmesi | evet | varsayılan | eski metin ("TEXT TO NEXT TEKNOLOJİ A.Ş.", Caddebostan adresi); "footer" menüsünde |
| **gizlilik-sozlesmesi** | Gizlilik Sözleşmesi | evet | varsayılan | eski KVKK metni; "footer" menüsünde |
| **i̇ade-kosullari** (noktalı İ, URL: /pages/i%CC%87ade-kosullari) | İade Koşulları | evet | varsayılan | eski metin; "footer" menüsünde |
| iletisim | İletişim | evet | varsayılan | "footer" menüsünde |
| ar | AR | hayır | ecom-ar | |
| **hesap-silme-talebi** | Hesap Silme Talebi | evet | hesap-silme-talebi | muhtemelen uygulamadan açılıyor |
| rewards-program-page | Rewards Program Page | evet | rise-full-page-template | |
| landing-page-dec-12-23-44-18 | Ana Sayfa | evet | gp-template-544431830779036655 | |
| ana-sayfa | Ana Sayfa | hayır | gp-template-544431830779036655 | |
| text-to-next-pro-1 | Landing Page - Feb 16 | evet | gp-template-553922254656766857 | |
| iletisimsayfasi | Contact Page - Mar 5 | evet | gp-template-556461893263295681 | ana menüde |
| event-zaman-kapsulu | Event Zaman Kapsülü | hayır | gp-template-562089975860954304 | |
| landing-page-apr-7-16-02-03 | Landing Page - Apr 7 | evet | gp-template-561200095932974170 | |
| collection-bundle | Mix and Match | evet | – | |
| couplezamankapsulleri | Couple Landing Page | evet | gp-template-593136672170836500 | |
| kullanim-kilavuzu | Kullanım Kılavuzu | evet | gp-template-600755391629886309 | |
| bireysel-hediye-kullanim-kilavuzu | Bireysel Hediye Kullanım Kılavuzu | evet | gp-template-600758654311858837 | |
| couple-hediye-kullanim-kilavuzu | Couple Hediye Kullanım Kılavuzu | evet | gp-template-600760696552030795 | |
| couplekapsuldahafazlabilgial | Landing COUPLE … V2 | evet | gp-template-601917426203886298 | |
| hediyekapsuldahafazlabilgial | Landing Bireysel … | evet | gp-template-601918380005393114 | |
| **sozlesmeler** | Landing Page - Feb 12 | evet | gp-template-606324753770218070 | GemPages; iki PDF'e link veriyor: kvkk_acik_riza.pdf ("KVKK ve Açık Rıza") ve uyelik_sozlesmesi.pdf ("Üyelik Sözleşmesi"). Uygulamanın açtığı sayfa olabilir |
| couple-zaman-kapsulu-yeni | Couple Zaman Kapsülü Yeni | hayır | page | |
| bundles | Bundles | evet | – | |
| couple-daha-fazla-bilgi-al | Couple Daha Fazla Bilgi Al | evet | couple-daha-fazla-bilgial | |
| hediye-daha-fazla-bilgi-al | Hediye Daha Fazla Bilgi Al | evet | hediye-daha-fazla-bilgial | |
| event-daha-fazla-bilgi-al | Event Daha Fazla Bilgi Al | evet | event-daha-fazla-bilgial | |
| hediye-zaman-kapsulu-urunleri-gor | Hediye Zaman Kapsülü Ürünleri Gör | evet | hediye-urunleri-gor | |
| boyutlar | Boyutlar | evet | – | |

Yeni handle'lar (on-bilgilendirme-formu, cerez-politikasi, uygulama-kullanim-kosullari, sozlesmeler-ve-politikalar) **mevcut değil**; çakışma yok.

## 2. Shopify politikaları (mevcut durum)

| Tür | Başlık | Adres | Mevcut içerik | Son güncelleme |
|---|---|---|---|---|
| TERMS_OF_SERVICE | Hizmet şartları | /policies/terms-of-service | kısa genel "Hizmet Şartları" (2,7 KB) | 19.03.2024 |
| REFUND_POLICY | Para iade politikası | /policies/refund-policy | eski iade metni (24 KB) | 19.03.2024 |
| **SHIPPING_POLICY** | Kargo | /policies/shipping-policy | **eski Mesafeli Satış Sözleşmesi** ("Madde: Taraflar … TEXT TO NEXT TEKNOLOJİ A.Ş.", 35 KB) | 19.03.2024 |
| PRIVACY_POLICY | Gizlilik politikası | /policies/privacy-policy | eski KVKK aydınlatma metni (24 KB) | 19.03.2024 |
| CONTACT_INFORMATION / LEGAL_NOTICE | – | – | boş | – |

Yedek: `scratchpad/yasal/yedek/` (4 politika + 3 eski yasal sayfanın tam HTML'i).

## 3. Menüler

- **main-menu**: Couple, Kadın, Erkek, Etkinlik, İletişim (yasal link yok).
- **footer** (Footer menu): Mesafeli Satış Sözleşmesi → /pages/mesafeli-satis-sozlesmesi, İade Koşulları → /pages/i̇ade-kosullari, İletişim → /pages/iletisim, Gizlilik Sözleşmesi → /pages/gizlilik-sozlesmesi. **Hiçbir temada görünür bir yere bağlı değil** (aşağıya bakın).
- customer-account-main-menu.

## 4. Taslak temada yasal sayfalara verilen linkler

**Footer:** Her iki temada da `sections/footer-group.json` içinde temanın `footer` ve `footer-copyright` bölümleri **kapalı**. Sitenin altında yalnızca bülten bölümü var. Şu an **footer'da hiçbir yasal link görünmüyor.**

| Dosya:satır | Link | Amaç |
|---|---|---|
| sections/cart-drawer.liquid:729-734 | `shop.shipping_policy.url` (tr.json `taxes_included_and_shipping_policy_html`: "Vergi dahil. <a>Ödeme</a> sırasında kargo bedeli hesaplanır.") | ⚠️ **/policies/shipping-policy** – kargo bedeli notu; bağlantı metni "Ödeme". Şu an tıklayan sözleşmeyi görüyor; değişiklikten sonra kargo politikası açılacak (doğru amaç) |
| sections/main-cart.liquid:624-629 | aynı (sepet sayfası) | ⚠️ aynı |
| sections/main-product.liquid:311-318 | `shop.shipping_policy.url` ("Ödeme sırasında <a>kargo bedeli</a> hesaplanır") | ⚠️ /policies/shipping-policy – kargo amacı (tema ayarında açıksa) |
| sections/main-product-modal.liquid:243-250, featured-product.liquid:318-325, quick-order-list.liquid:143-148, snippets/product-placeholder.liquid:239-246 | aynı kalıp | ⚠️ aynı (kullanılmayan/az kullanılan bölümler) |
| templates/product.zaman-kapsulu.json:203, product.zaman-kapsulu-couple.json:198, product.couple.json:193, product.json:147, product.gp-template-bk-default.json:147 | "Kolay İade & Değişim <a href=/policies/refund-policy>İade Koşulları</a>" | iade – doğru adres |
| sections/tmp-bilek-tpl.liquid:224 | aynı (geçici şablon) | iade |
| sections/cookie-banner.liquid:440 | `/policies/privacy-policy` "Privacy Policy" (temanın çerez bandı, İngilizce) | gizlilik |
| sections/gp-section-606324820946191108.liquid:89,125 (sozlesmeler sayfası) | kvkk_acik_riza.pdf, uyelik_sozlesmesi.pdf (CDN) | eski PDF'ler |

**/policies/shipping-policy adresine "sözleşme" amacıyla link veren tema yeri bulunamadı.** Bu adrese giden tüm tema linkleri "kargo bedeli" notları; bunlar değişiklikten sonra doğru içeriği gösterecek. Sözleşme amaçlı erişim büyük olasılıkla şu yerlerden geliyor (temada değil):
- Shopify ödeme sayfasının alt linkleri ("Kargo politikası" bağlantısı şu an sözleşmeyi açıyor),
- mobil uygulama ya da eski e-posta/SMS şablonları (kontrol edilmeli).

## 5. Sepet

- Sepet türü: çekmece (`cart_type: drawer`). Çekmecede "Ödeme ekranı" butonu `sections/cart-drawer.liquid:750`, sepet sayfasında `sections/main-cart.liquid:661`.
- Hediye paketi (gift wrap) özelliği temada var ama **ayarlı ürün yok** (`gift_wrap_product: null`), şu an pasif. Kod korunacak.
- ⚠️ Sepet sayfasında **hızlı ödeme butonları** (Shop Pay / Google Pay vb., `show_accelerated_buttons`, varsayılan açık) onay kutusunu atlayabilir.
- Ürün sayfalarındaki "Hemen al" (dynamic checkout) ana ürün şablonlarında kapalı; yalnızca gift-card / modal / pre-order / sibling şablonlarında açık.

## 6. Yeni metinlerle çelişen mevcut tema metinleri (bilgi; dokunulmayacak)

| Yer | Mevcut | Yeni yasal metin |
|---|---|---|
| Sepet çekmecesi ücretsiz kargo çubuğu | eşik **2.500 TL** | 2.000 TL |
| Ürün sayfası "2499₺ üzeri Ücretsiz Kargo" + "Kargo & Teslimat" sekmesi | 2.499 TL, "1-3 iş günü" | 2.000 TL, "en geç 30 gün" |
| Ürün sayfası "İade & Değişim" sekmesi | "kullanılmamış ve orijinal ambalajında" | kapsül oluşturulmamışsa 14 gün, kutuyu açmak engel değil |
| Ürün sayfası "Garanti" | "316L … ömür boyu garantilidir" | çip süresiz garanti; kullanım kaynaklı hasar kapsam dışı |
| SSS "Ömür Boyu Garanti Neleri Kapsar?" | "çipini ve Zaman Kapsülü yazılımını kapsar" | – |
