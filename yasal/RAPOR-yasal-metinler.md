# Yasal metinler: uygulama raporu (17.10.2026)

Çalışılan tema: **Tasarim dili - 2026-10-16** (189140861248, yayında değil).
Yayındaki tema (Calisma taslagi - 2026-10-05) değişmedi: **669 dosyanın 669'unun MD5'i başlangıçla aynı** (bkz. bölüm 9).

Sepet çekmecesine ve sepet sayfasına **hiçbir şey eklenmedi**: onay kutusu, bilgi satırı ve `_sozlesme_onayi` özelliği yok. **Hızlı ödeme butonlarına dokunulmadı.** Sepette değişen tek şey, istenen ücretsiz kargo eşiği (2.000 TL).

---

## 1. Yapılamayan: 4 Shopify politikası (elle yapılmalı)

`shopPolicyUpdate` şu hatayı verdi: *"Access denied … Required access: `write_legal_policies` access scope."* Bağlı uygulamanın politika yazma izni yok. Bu yüzden politikalar **hiç değişmedi**.

**Adım adım (Shopify Admin):**

1. **Ayarlar → Politikalar** sayfasını açın.
2. **Hizmet şartları** kutusunda düzenleyicinin **`<>` (HTML'yi göster)** düğmesine basın. İçeriğin tamamını silin, `yasal/belgeler/belge-2.html` dosyasının içeriğini olduğu gibi yapıştırın. *"Şablondan oluştur"* düğmesini kullanmayın.
3. **Para iade politikası** için `belge-3.html` ile aynı adımı uygulayın.
4. **Kargo politikası** için `belge-4.html` ile aynı adımı uygulayın.
5. **Gizlilik politikası** için `belge-5.html` ile aynı adımı uygulayın.
6. **Kaydet**'e basın.

Kaydettikten sonra haber verirseniz dört metni API'den okuyup kelime kelime karşılaştırırım (okuma iznim var).

Adresler aynı kalır: `/policies/terms-of-service`, `/policies/refund-policy`, `/policies/shipping-policy`, `/policies/privacy-policy`. Sayfa başlıkları Shopify'ın sabit politika adları olarak görünür (ör. "Hizmet şartları").

**Bu adım yapılana kadar:**
- `/policies/shipping-policy` hâlâ **eski Mesafeli Satış Sözleşmesi'ni** gösteriyor.
- Merkez sayfadaki 4 sekme ve footer'daki 4 politika linki **eski metinleri** gösteriyor:
  - Mesafeli Satış (`terms_of_service`)
  - İade (`refund_policy`)
  - Kargo (`shipping_policy`)
  - Gizlilik (`privacy_policy`)
- Eski metinlerin yedeği `scratchpad/yasal/yedek/` klasöründe.

Alternatif: uygulamaya `write_legal_policies` izni verilirse bu adımı ben de yapabilirim.

---

## 2. Önemli bulgu: yayındaki temada `/pages/...` yasal sayfaları metin göstermiyor

Her iki temada da `templates/page.json` içindeki metin bölümü (`main-page`) **kapalı**. Sayfa gövdesi yerine yalnızca video ve ürün şeridi çıkıyor. Yayındaki sitede bunu doğruladım: `/pages/mesafeli-satis-sozlesmesi` adresinde metin yalnızca `<meta description>` içinde var. Sorun bu çalışmadan önce de vardı; eski metinler de görünmüyordu.

Taslak temada çözüm olarak **`templates/page.yasal.json`** şablonunu ekledim (metin bölümü açık, tablolar düzenli). 6 yasal sayfanın şablonunu buna bağladım. Yayındaki temada bu şablon olmadığı için sayfalar eskisi gibi varsayılan şablonla açılır; adresler değişmedi.

Sonuç:
- **Taslak tema yayına alınınca** 6 sayfa ve merkez sayfa düzgün görünür.
- **O zamana kadar yayındaki sitede** bu sayfalar ve merkez sayfa (bağlantı listesi dahil) **görünmez**; yalnızca video ve ürün şeridi çıkar.
- Yayındaki temaya dokunmadım. Daha erken düzelsin isterseniz yayındaki temada Tema düzenleyici → Sayfa şablonu → "Sayfa" bölümünü açmanız yeterli.

---

## 3. Mağaza genelinde yapılanlar (onaylı)

### 3.1 İçeriği değişen eski sayfalar

Adres ve başlık aynı kaldı; içerikler kelime kelime doğrulandı.

| Sayfa | Adres | Yeni içerik | ID |
|---|---|---|---|
| Mesafeli Satış Sözleşmesi | /pages/mesafeli-satis-sozlesmesi | BELGE 2 | 134431506752 |
| Gizlilik Sözleşmesi | /pages/gizlilik-sozlesmesi | BELGE 5 | 134431539520 |
| İade Koşulları | /pages/i%CC%87ade-kosullari | BELGE 3 | 134431572288 |

### 3.2 Yeni sayfalar (yayında)

| Sayfa | Adres | İçerik | ID |
|---|---|---|---|
| Ön Bilgilendirme Formu | /pages/on-bilgilendirme-formu | BELGE 1 | 167271006528 |
| Çerez Politikası | /pages/cerez-politikasi | BELGE 6 | 167271039296 |
| Uygulama Kullanım Koşulları | /pages/uygulama-kullanim-kosullari | BELGE 7 | 167271072064 |
| Sözleşmeler ve Politikalar | /pages/sozlesmeler-ve-politikalar | 7 belgelik bağlantı listesi | 167271104832 |

Merkez sayfanın şablonu `sozlesmeler`.

### 3.3 Şablon atamaları

İlk 6 sayfanın şablonu `yasal` yapıldı. Yayındaki temada bu şablon yok; orada etkisi yok. Geri almak için şablonu "Varsayılan sayfa"ya çevirmek yeterli.

### 3.4 Menü

Yeni menü **`footer-yasal` ("Yasal")**, 8 bağlantı:
1. Sözleşmeler ve Politikalar → /pages/sozlesmeler-ve-politikalar
2. Mesafeli Satış Sözleşmesi → /policies/terms-of-service
3. Ön Bilgilendirme Formu → /pages/on-bilgilendirme-formu
4. İade ve Cayma Politikası → /policies/refund-policy
5. Kargo ve Teslimat → /policies/shipping-policy
6. Gizlilik Politikası (KVKK) → /policies/privacy-policy
7. Çerez Politikası → /pages/cerez-politikasi
8. Uygulama Kullanım Koşulları → /pages/uygulama-kullanim-kosullari

### 3.5 Doğrulama ve yedek

Her sayfanın gövdesi API'den geri okunup `belge-N.html` ile karşılaştırıldı:
- 4 sayfa **birebir aynı**.
- Tablolu 2 sayfa (Gizlilik, Çerez) yalnızca Shopify'ın etiketler arasına eklediği satır sonlarıyla farklı; metin aynı.

Hiçbir sayfa silinmedi, hiçbir adres değişmedi. `/pages/sozlesmeler` (GemPages) sayfasına ve eski `footer` menüsüne dokunulmadı. Eski sayfa içeriklerinin yedeği: `scratchpad/yasal/yedek/eski-yasal-sayfalar.json`.

---

## 4. Taslak temada değişen dosyalar (Tasarim dili)

| Dosya | Değişiklik |
|---|---|
| `sections/legal-hub.liquid` (yeni) | Merkez sayfa. Ayrıntılar aşağıda. |
| `templates/page.sozlesmeler.json` (yeni) | Merkez sayfa şablonu |
| `templates/page.yasal.json` (yeni) | Tek tek yasal sayfalar: temanın `main-page` bölümü + stil |
| `sections/tt-yasal-stil.liquid` (yeni) | Yalnızca CSS: yasal sayfalardaki tabloların görünümü |
| `sections/footer-group.json` | Kapalı olan tema `footer` bölümü açıldı. İçine tek bir "Yasal" bağlantı listesi kondu (`footer-yasal`, mobilde açık). Üst boşluk 0 → 48 px. Bülten bölümü ve içindeki (kapalı) linkler olduğu gibi duruyor; hiçbir link silinmedi. Temanın mevcut ayarı açık olduğu için sosyal ikonlar (Instagram, YouTube, TikTok) da görünüyor. |
| `sections/overlay-group.json` | Sepet çekmecesi ücretsiz kargo eşiği **2500 → 2000** |
| `templates/cart.json` | Sepet sayfası ücretsiz kargo eşiği **1000 → 2000** (eski değer 1.000 TL idi) |
| `templates/product.zaman-kapsulu.json`, `product.zaman-kapsulu-couple.json`, `product.couple.json` | Beşer yerde 2499₺ / 2.499₺ / 2.499 ₺ → 2.000₺ / 2.000 ₺. Yalnızca rakam değişti. |
| `templates/product.json` (varsayılan; 5 aktif ürün kullanıyor) | Üç yerde 2499₺ → 2.000₺ |

**`legal-hub.liquid` ayrıntıları:**
- 7 sekme, içerikler canlı kaynaktan okunuyor (`shop.*_policy.body`, `pages[...]`).
- Hash'ler: `#mesafeli-satis`, `#on-bilgilendirme`, `#iade`, `#kargo`, `#gizlilik`, `#cerez`, `#kullanim-kosullari`. Hash yoksa ya da tanımsızsa ilk sekme açılır. Sekme değişince hash güncellenir.
- Erişilebilirlik: `tablist`/`tab`/`tabpanel` rolleri ve ok tuşu, Home, End desteği.
- Mobil: sekmeler yatay kayar, tablolar kendi kutusunda kayar.
- En altta iletişim satırı var. Sade (vanilla) JS kullanıldı, başka CSS kütüphanesi eklenmedi.

Repo commit'leri (`claude/new-session-uhmgke` dalı): 7fe1dc1, 649310a, 8033947, 10383d9, 296b233. Temadaki MD5'lerin hepsi repodaki dosyalarla aynı.

---

## 5. Ücretsiz kargo eşiği ve Shopify kargo ayarı

**Taslak tema:**
- Çekmece ve sepet sayfası artık 2.000 TL üzerinden hesaplıyor. Test: 1.799 TL'lik üründe ikisi de "Ücretsiz kargo için **201,00 TL** daha harcayın!" diyor ve çubuk %90 dolu. 3.599 TL'lik üründe "Ücretsiz kargo avantajından yararlanabilirsiniz" yazıyor.
- Ürün sayfası metinleri 2.000₺ oldu; ürün sayfasında 2.499 ifadesi kalmadı.

**Shopify kargo ayarı (değiştirilmedi):**

| Profil | Bölge | Kural |
|---|---|---|
| Genel profil (varsayılan) | Türkiye | "Kargo Ücreti" **99 TL** (koşulsuz) + "Kargo Ücreti" **0 TL, sipariş toplamı ≥ 2.499 TL** |
| Koşullu Kargo | Türkiye | "üc" 0 TL (koşulsuz; bu profile bağlı ürünler için) |
| Ek paketler ücretsiz | Türkiye | "Standart" 0 TL (koşulsuz; bu profile bağlı ürünler için) |

⚠️ **Ödeme sayfasındaki ücretsiz kargo kuralı 2.499 TL, 2.000 TL değil.** Taslak tema yayına alınınca 2.000–2.498 TL arasındaki siparişlerde site "ücretsiz kargo" der, ödeme sayfası ise 99 TL alır. Bu, Mesafeli Satış Sözleşmesi m.5.2 ile de çelişir.

Düzeltme: **Ayarlar → Kargo ve teslimat → Genel profil → Türkiye → 0 TL'lik "Kargo Ücreti"** oranının koşulunu **minimum 2.000 TL** yapın. Ayrıca iki oranın adı aynı ("Kargo Ücreti"); 0 TL olanı "Ücretsiz kargo" diye adlandırmak ödeme sayfasında karışıklığı önler.

**Kapsam dışında kalan ve hâlâ 2.499 diyen yerler (değiştirilmedi):**
- `templates/page.hediye-daha-fazla-bilgial.json` ve `page.couple-daha-fazla-bilgial.json`: tanıtım sayfalarındaki "2.499₺ üzeri ücretsiz kargo" kartı.
- Hiçbir ürüne atanmamış yedek şablonlar ve `sections/tmp-bilek-tpl.liquid`.

İsterseniz tanıtım sayfalarını da 2.000'e çekerim.

---

## 6. Ürün sayfasında yeni metinlerle çelişen ifadeler (DEĞİŞTİRİLMEDİ, öneri)

Satır numaraları taslak temadaki dosyalar içindir. Sıra: `product.zaman-kapsulu.json` / `product.zaman-kapsulu-couple.json` / `product.couple.json` / `product.json`. Aynı blok üç Zaman Kapsülü şablonunda da aynı metinle var.

| # | Yer (dosya:satır) | Mevcut | Çelişki | Öneri |
|---|---|---|---|---|
| 1 | Garanti sekmesi (`collapsible_tab-4`) — 817 / 812 / 807 / 707. Ayrıca `product.json`:384 "Ömür Boyu Garanti" satırı | "316L Çelik kararmaz ve paslanmaz, **ömür boyu garantilidir**." | Yasal metinlerde süresiz garanti yalnızca **çip** için (BELGE 2 m.8.2). Takının kendisi için yasal 2 yıllık ayıp hakları geçerli; kullanım kaynaklı hasar kapsam dışı. | "Ürün içindeki çip süresiz garantilidir; çip çalışmazsa ücretsiz değiştiririz. Üretim hatalarında teslimden itibaren 2 yıl boyunca yasal haklarınız geçerlidir. 925 ayar gümüşte zamanla oluşan kararma metalin doğal özelliğidir. Kopma, kırılma, yamulma, ezilme ve çizilme gibi kullanım kaynaklı hasarlar garanti kapsamı dışındadır." |
| 2 | SSS "Ömür Boyu Garanti Neleri Kapsar?" (`product-accordion` row-2) — 478 / 473 / 468 / – | "…çipini **ve Zaman Kapsülü yazılımını** kapsar… içeriklere **her zaman** erişmeye devam edebilirsiniz." | Yazılım için garanti yok; hizmette "makul özen" ve kesinti olabilir (BELGE 7 m.6). İçerik saklama süresiz değil: 5 yıl giriş yapılmazsa silinebilir, hizmet sona ererse 90 gün önce bildirilir (BELGE 5 m.6, BELGE 7 m.5). | Başlık: "Garanti Neleri Kapsar?" Metin: "Ürün içindeki çip süresiz garantilidir; çip çalışmazsa ücretsiz değiştiririz. Kapsül içerikleriniz hesabınıza bağlıdır; ürün değişse de hesabınızdan erişmeye devam edersiniz. Saklama kuralları Gizlilik Politikası'nda yer alır. Kopma, kırılma, darbe, ezilme gibi kullanım kaynaklı hasarlar ve ürünün kaybolması kapsam dışıdır; üretim hatalarında 2 yıllık yasal haklarınız saklıdır." |
| 3 | İade sekmesi (`collapsible_tab-3`) — 805 / 800 / 795 / 695. Ayrıca `product.json`:392 "Kargo & İade" satırı | "14 gün içinde kolay iade hakkınız bulunur. Ürünü **kullanılmamış ve orijinal ambalajında** bize ulaştırmanız yeterlidir." | Yasal koşul "kapsül oluşturulmamış olması"; kutuyu açmak iadeye engel değil (BELGE 3). "Kullanılmamış" şartı yasal metinde yok. | "Kapsül oluşturmadıysanız, teslimden itibaren 14 gün içinde gerekçe göstermeden iade edebilirsiniz; ürünü incelemek için kutuyu açmanız iade hakkınızı etkilemez. Kapsül oluşturulduğunda dijital kapsül hizmeti başlar ve iade hakkı sona erer. DHL iade koduyla gönderim ücretsizdir." |
| 4 | SSS "İade edebilir miyim?" (row-3) — 486 / 481 / 476 / – | "…kapsül oluşturmadıysanız **ve ürünü kişiselleştirmediyseniz** 14 gün… kişiye özel hale geldiği için iade süreci tamamlanamaz." | Büyük ölçüde uyumlu. Gerekçe yasal metindekinden farklı (yasal gerekçe: dijital hizmetin ifasına başlanması); hediye alan kişinin kapsül oluşturması ve ayıplı ürün hakları belirtilmemiş. | "Kapsül oluşturmadıysanız teslimden itibaren 14 gün içinde iade edebilirsiniz. Kapsül oluşturulduğunda dijital kapsül hizmeti başlar ve cayma hakkı sona erer; kapsülü hediye alan kişinin oluşturması da aynı sonucu doğurur. Üretim hatası olan ürünlerde, kapsül oluşturulmuş olsa bile yasal haklarınız geçerlidir." |
| 5 | "Kolay İade & Değişim" satırı (`text_Rn8tTW`) — 203 / 198 / 193 / 147 | "Kolay İade **& Değişim**" | Yasal metinlerde isteğe bağlı **değişim** hakkı yok; değişim yalnızca ayıplı ürün için var. | "14 gün içinde kolay iade (kapsül oluşturulmadıysa) · <a href=/policies/refund-policy>İade Koşulları</a>". Sekme başlığı "İade & Değişim" → "İade". |
| 6 | Kargo sekmesi (`collapsible_tab-2`) — 793 / 788 / 783 / 683 | "Siparişiniz 1-3 iş günü içinde kargoya teslim edilir." | Doğrudan çelişmiyor: BELGE 4'e göre "tahmini kargoya veriliş süresi ürün sayfasında belirtilir". Ancak tahmini olduğu ve yasal üst sınır belirtilmemiş. | "2.000₺ ve üzeri siparişlerde kargo ücretsizdir. Siparişiniz genellikle 1-3 iş günü içinde kargoya verilir; teslimat her durumda sipariş tarihinden itibaren en geç 30 gün içinde DHL ile yapılır." |
| 7 | SSS "Kargom Ne Zaman Ulaşır?" (row-4) — 494 / 489 / 484 / – | "Siparişiniz **24 saat içinde** … DHL Kargo'ya teslim edilir … **1–3 iş günü içerisinde** adresinize ulaştırılır." | Kesin taahhüt gibi okunuyor; yasal azami süre (30 gün) yok. | "Siparişiniz genellikle 24 saat içinde hazırlanıp DHL'e verilir ve hafta sonu ile resmi tatiller hariç 1–3 iş günü içinde ulaşır. Teslimat her durumda sipariş tarihinden itibaren en geç 30 gün içinde yapılır. Kargoya verildiğinde takip bilgileriniz paylaşılır." |
| 8 | "Kargo Bizden" penceresi (`pop_metin`) — 1116 / 1383 / 1377 / – | "…saat 12.00'ye kadar verilen siparişler **aynı gün** kargoya teslim edilir… **ortalama 2 iş günü**" | 7 ile aynı (kesin taahhüt, üst sınır yok). | "2.000 ₺ ve üzeri siparişlerinizde kargo ücretsizdir. Hafta içi saat 12.00'ye kadar verilen siparişler genellikle aynı gün kargoya verilir ve DHL ile ortalama 2 iş günü içinde ulaşır. Yasal azami teslim süresi sipariş tarihinden itibaren 30 gündür." |
| 9 | "2.000₺ üzeri Ücretsiz Kargo" satırı ve Kargo sekmesi (yukarıdaki satırlar) | "2.000₺ **üzeri**" | Yasal metin "2.000 TL **ve üzeri**" diyor; hesaplama da ≥ 2.000. "Üzeri" tam 2.000'i dışarıda bırakıyor gibi okunabilir. | "2.000₺ ve üzeri Ücretsiz Kargo" |

Onay verirseniz bunları üç Zaman Kapsülü şablonuna ve `product.json`'a birlikte uygularım.

---

## 7. `/policies/shipping-policy` adresine "sözleşme" amacıyla verilen linkler

Temada **yok**. Bu adrese giden tüm tema linkleri kargo bedeli notları:
- `sections/cart-drawer.liquid`
- `sections/main-cart.liquid`
- `sections/main-product.liquid`
- az kullanılan birkaç bölüm

Politika güncellenince bu linkler doğru içeriği (kargo politikası) gösterecek.

Sözleşme amaçlı erişim büyük olasılıkla temanın dışından geliyor: **ödeme sayfasının alt linkleri**, **mobil uygulama** ya da eski **e-posta/SMS şablonları**. Bunları aşağıdaki manuel listede kontrol edin.

---

## 8. Elle yapılacaklar listesi (kod yok)

1. **4 politikayı güncelleyin.** Adımlar bölüm 1'de.
2. **Kargo kuralını 2.000 TL yapın.** Adımlar bölüm 5'te.
3. **Çerez bandı:** Ayarlar → **Müşteri gizliliği** → **Çerez banner'ı**.
   - Bandı Türkiye için açın ve metni BELGE 8.5'teki metin yapın:
     > Sitemizin çalışması için zorunlu çerezler kullanıyoruz. Onay verirsen, siteyi geliştirmek için analitik çerezleri (Google Analytics) ve reklamlarımızın etkisini ölçmek için pazarlama çerezlerini (Meta Pixel) de kullanırız. Bu çerezlerle toplanan veriler yurt dışındaki sunucularda işlenebilir. Ayrıntılar Çerez Politikası'nda.
   - Düğmeler: **Tümünü kabul et**, **Reddet**, **Tercihleri yönet**. **Reddet**, **Kabul et** kadar görünür olmalı (aynı boyut ve vurgu).
   - Politika linki olarak `/pages/cerez-politikasi` verin.
   - Not: Temanın kendi çerez bandı da açık ("Kabul et / Reddet", tercih yönetimi yok; `overlay-group` → `cookie-banner`). Shopify'ın bandını açınca **iki bant görünmemesi için** temanınkini kapatın. İsterseniz taslak temada ben kapatırım.
   - **Çerez Tercihleri linki:** BELGE 6 "sayfanın altındaki Çerez Tercihleri bağlantısı"ndan söz ediyor; footer'da şu an böyle bir bağlantı yok. Shopify bandı açıldıktan sonra bu bağlantıyı footer'a eklememi isterseniz söyleyin.
   - **Meta Pixel ve Google Analytics** onaydan önce çalışmamalı. Ayarlar → Müşteri gizliliği'nde ilgili bölge için "izin gerekli" seçili olmalı. Ayrıca Meta ve Google uygulamalarının "Customer Privacy API"ye uyumlu olduğu bağlantı ayarlarından kontrol edilmeli.
   - **Test:** Gizli pencerede siteyi açın, **Reddet**'e basın, Meta Pixel Helper ve Google Tag Assistant ile hiçbir olayın gitmediğini görün. Sonra **Kabul et**'le tekrar deneyin.
4. **Sipariş onay e-postası:** Ayarlar → Bildirimler → Sipariş onayı → Kodu düzenle. Uygun bir yere (ör. altbilgi) şu iki linki ekleyin:
   - `<a href="{{ shop.url }}/policies/terms-of-service">Mesafeli Satış Sözleşmesi</a>`
   - `<a href="{{ shop.url }}/pages/on-bilgilendirme-formu">Ön Bilgilendirme Formu</a>`
5. **Ödeme sayfası alt linkleri:** Politikalar güncellendikten sonra ödeme sayfasında alt linkleri tıklayın. "Kargo politikası" artık kargo metnini, "Hizmet şartları" Mesafeli Satış Sözleşmesi'ni açmalı. Ödeme sayfasında bu başlıkların Shopify'ın sabit adlarıyla göründüğünü unutmayın.
6. **Mobil uygulama (ayrı repo, dokunulmadı):** Uygulamanın açtığı yasal adresleri kontrol edin. Mevcut adreslerin hiçbiri değişmedi.
   - `/pages/sozlesmeler` (GemPages, eski PDF'ler) olduğu gibi duruyor.
   - Uygulama kayıt ekranı için BELGE 8.2'deki iki kutucuk metni ve `/pages/uygulama-kullanim-kosullari` adresi kullanılabilir.
   - Kapsül oluşturma ekranı için BELGE 8.3 metni kullanılabilir.
7. **Sepet onayı (BELGE 8.1):** Kararınız gereği sepete hiçbir şey eklenmedi. Bilginize: bu onay metni şu an sitenin hiçbir yerinde gösterilmiyor.

---

## 9. Testler

WebKit motoruyla test edildi: telefon (iPhone 13, 390×844) ve masaüstü (1440×900), taslak tema önizlemesiyle. Ekran görüntüleri ve ham sonuçlar `yasal/ekran/` klasöründe (`sonuc.json`).

| Test | Sonuç |
|---|---|
| Hash'siz açılış | İlk sekme (Mesafeli Satış) açık |
| 7 hash'in her biriyle açılış | Doğru sekme ve yalnız o panel açık |
| Tanımsız hash (`#yok-boyle-bir-sey`) | İlk sekme |
| Sekmeye tıklama | Hash `#cerez` oldu, panel değişti |
| Klavye | → ileri; son sekmede → başa sarıyor; Home, ←, End çalışıyor; odak sekmede kalıyor; Tab sırasında yalnız seçili sekme (tabindex 0) |
| Mobil taşma | Sayfa yatay taşması **0 px** (merkez sayfa ve 6 yasal sayfa) |
| Tablo | Çerez tablosu telefonda 348 px kutu içinde 648 px; kendi içinde kayıyor |
| Sekme şeridi | Telefonda yatay kayıyor, masaüstünde iki satıra sarıyor |
| Alt satır | "Sorularınız için: info@texttonext.com · KEP: texttonext@hs06.kep.tr" |
| 6 yasal sayfa (page.yasal) | Metin görünüyor (her sayfada belgeye özgü bir başlık arandı) |
| Footer | "Yasal" başlığı ve 8 bağlantı doğru adreslerle (mobil ve masaüstü) |
| Sepet / çekmece | 1.799 TL → "201,00 TL daha"; eşik 2.000 TL |
| Ürün sayfası | "2.000₺ üzeri…" 3 yerde; 2.499 kalmadı |

Merkez sayfadaki sürüm satırı testi şu an 0 buluyor: Mesafeli Satış sekmesi politikadan okuyor ve politika henüz eski metin. Politikalar güncellenince her sekmede belgenin kendi sürüm satırı görünecek.

**Kendiniz denemek için:**
- `https://texttonext.com/pages/sozlesmeler-ve-politikalar?preview_theme_id=189140861248#iade` adresini açın.
- Sonra hash'i `#kargo` ya da `#cerez` yapıp sayfayı yenileyin.

**Yayındaki temanın MD5'i:** son tema yüklemesinden sonra 669 dosyanın 669'u başlangıçla (`scratchpad/yasal/canli-md5-once.json`) aynı, fark yok.
