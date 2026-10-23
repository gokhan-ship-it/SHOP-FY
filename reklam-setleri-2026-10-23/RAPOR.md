# Reklam setleri: rapor (23 Ekim 2026)

**Kısa özet**
- **Mevcut setler:** reklamdaki 3 mevcut set ACTIVE ve fiyatları listeyle aynı. Hiçbirine dokunulmadı.
- **Yeni setler:** iki set DRAFT olarak oluşturuldu.
  - Rose Pink + Prizma'nın galerisi hazır (12 görsel). Ürünü sonradan sen ACTIVE yaptın.
  - Gold + Nova'nın galerisi gold-nova-set.zip ile kuruldu (11 görsel, 4b bölümü). Ürün hâlâ DRAFT.
- **Çark kodu:** tüm ürünlere uygulanıyor, beş set de kapsamda. İndirimde değişiklik gerekmedi, yapılmadı.
- **İndirim testleri:**
  - Gerçek sepette (3 aktif set): 2.898 / 3.099 / 2.999 TL.
  - Sipariş oluşturmayan hesapla (5 setin hepsi): 2.898 / 3.099 / 3.299 / 3.299 / 2.999 TL.
- **Kampanyalı Couple Setler sırası:** koleksiyonda reklamdaki 5 set en başta.
- **Tema:** değişiklikler senin isteğinle **"Hiz paketi 1 - 2026-10-23"** temasında (ayrıntı 5. bölümde). Hiçbir tema yayına alınmadı.
- **Canlı tema:** başta ve sonda MD5 listesi birebir aynı (701 dosya).

**Temalar:**
- **Yayındaki:** "Gumus stok notu - 2026-10-21" (189316038976). Son değişikliği 21.10.2026 10:26 UTC; bu iş boyunca değişmedi.
- **"Reklam setleri - 2026-10-23" kopyası oluşturulamadı.**
  - Mağazada 20 tema var; bu Shopify'ın sınırı.
  - Kopya isteği hata vermedi ama tema oluşmadı.
  - Silme yasağı olduğu için yer açılmadı.
- Tema değişiklikleri senin mesajınla Hiz paketi 1 temasına uygulandı (189388095808, yayında değil).

---

## 1. Beş set

| Reklam | Ürün | ID | Handle | Durum | Fiyat | Karşılaştırma fiyatı | Çark indirimine dahil mi | Test (indirimli tutar) |
|---|---|---|---|---|---|---|---|---|
| couple1 | Prizma + Chloe Couple Zaman Kapsülü | 15434302423360 | prizma-chloe-couple-zaman-kapsulu | ACTIVE | 3.398 TL | boş | Evet | **2.898 TL** (sepet + hesap) |
| couple2 | Nova + Chloe Couple Zaman Kapsülü | 10040852316480 | nora-vera-couple-zaman-kapsulu-kopya | ACTIVE | 3.599 TL | boş | Evet | **3.099 TL** (sepet + hesap) |
| couple3 | Rose Pink + Prizma Couple Zaman Kapsülü | 15445654307136 | rose-pink-prizma-couple-zaman-kapsulu | **ACTIVE** (yeni; sonradan sen açtın) | 3.799 TL | boş | Evet | **3.299 TL** (hesap + sonradan sepet) |
| couple4 | Gold + Nova Couple Zaman Kapsülü | 15445657387328 | gold-nova-couple-zaman-kapsulu | **DRAFT** (yeni) | 3.799 TL | boş | Evet | **3.299 TL** (hesap) |
| couple5 | Luna + Aurora Couple Zaman Kapsülü, "316L Cerrahi Çelik" varyantı | 9976621793600 (varyant 67663049392448) | zaman-kapsulu-kolye-classic-white-925-ayar-gumus-couple-kopya | ACTIVE | 3.499 TL | **4.998 TL** (çelik varyantta dolu, değiştirmedim) | Evet | **2.999 TL** (sepet + hesap) |

**Testler**
- **Sepet:** her set için ayrı, boş bir test sepeti açıldı.
  - Set eklendi, çarkın kendi yöntemiyle kod uygulandı (`/cart/update.js`) ve `/cart.js` okundu.
  - Ödeme sayfasına gidilmedi, sipariş oluşmadı.
  - Sayfa çalıştırılmadığı için takip isteği de oluşmadı.
- **İki taslak set sepete eklenemiyor:** Shopify "Varyasyon bulunamıyor" (422) dönüyor.
  - Bunlar için en yakın yol olarak Shopify'ın `draftOrderCalculate` hesabı kullanıldı. Bu hesap hiçbir kayıt oluşturmaz.
  - Gerçek sepet testini sen ürünleri ACTIVE yaptıktan sonra yapacağım.
- **"İkinci Üründe %50 İndirim":** tek setle ne sepette ne hesapta devreye girdi. Beş testte de tek indirim çark koduydu.

**Reklam linkleri**
| Reklam | Link |
|---|---|
| couple1 | https://texttonext.com/products/prizma-chloe-couple-zaman-kapsulu |
| couple2 | https://texttonext.com/products/nora-vera-couple-zaman-kapsulu-kopya |
| couple3 | https://texttonext.com/products/rose-pink-prizma-couple-zaman-kapsulu (ürün ACTIVE; açılıyor, 200) |
| couple4 | https://texttonext.com/products/gold-nova-couple-zaman-kapsulu (ürün ACTIVE olunca açılır; bugün 404) |
| couple5 | https://texttonext.com/products/zaman-kapsulu-kolye-classic-white-925-ayar-gumus-couple-kopya |

couple5 için:
- Sayfa zaten ilk varyant olan çelikle açılıyor.
- Garanti olsun dersen şu adresi kullan: https://texttonext.com/products/zaman-kapsulu-kolye-classic-white-925-ayar-gumus-couple-kopya?variant=67663049392448

## 2. Mevcut setlerin kontrolü (değiştirilmedi)

**Ortak:**
- Üç set de ACTIVE ve fiyatları listeyle aynı.
- Satış kanalları (7): Online Mağaza, Point of Sale, parasut-integration, Facebook & Instagram, Google & YouTube, TikTok, Inbox.
- Koleksiyonlar: Couple Collection ve Kampanyalı Couple Setler.

| Set | Not |
|---|---|
| Prizma + Chloe | Karşılaştırma fiyatı boş. SKU PRIZMA-CHLOE-SET. Stok 461. |
| Nova + Chloe | Karşılaştırma fiyatı boş. SKU yok. Stok −447 ("stok bitince satmaya devam" açık). |
| Luna + Aurora | Mağazada tek ürün, iki varyant (ayrı bir çelik ürünü yok). Varyantlar aşağıda. |

**Luna + Aurora varyantları:**
- **316L Cerrahi Çelik (reklamdaki):** 3.499 TL, karşılaştırma fiyatı 4.998 TL. Vergi ayarı açık; diğer setlerde kapalı.
- **925 Ayar Gümüş:** 4.599 TL, karşılaştırma fiyatı 5.499 TL.

**Rose Pink + Nova Couple Zaman Kapsülü:**
- Kimlik: 15429346296128, rose-pink-nova-couple-zaman-kapsulu.
- Durum: **DRAFT**, 3.299 TL.
- Couple Collection ve Kampanyalı Couple Setler koleksiyonlarında; 7 kanala bağlı.
- Dokunulmadı. Kampanyalı Couple Setler'deki yeri yalnızca yeni sıralamayla değişti (7. sıra).

**Bileşenlerin tekli fiyatları:** hepsi listeyle aynı, değişiklik yok.
- Rose Pink 316L Çelik: 2.699 TL
- Gold 316L Çelik: 2.699 TL
- Prizma: 2.399 TL
- Nova: 2.399 TL

**"Gold" adlı kolyeler:**
| Ürün | Durum | Not |
|---|---|---|
| **Gold** (9100723585344), "316L Çelik" varyantı (SKU ATR313GY) | ACTIVE | **Bileşen olarak alınan.** Aynı üründe 925 Gümüş varyantı da var (3.899 TL). |
| Gold Çelik – ATR313GY (15418511393088) | DRAFT, 270 TL | Satış ürünü değil, maliyet/tedarik kaydı gibi duruyor. Alınmadı. |
| Gold Couple (9976387469632) | | Gold'un couple eşi. Alınmadı. |
| Taşlıkilit Gold / Taşlıkilit Gold Couple | UNLISTED | Başka tasarım. Alınmadı. |

Rose Pink için de aynı yapı var: bileşen **Rose Pink** (9908834533696) ürününün "316L Çelik" varyantı (SKU ATN313RG).

## 3. Yeni iki set

**Ortak ayarlar** (Prizma + Chloe ile aynı):
- Şablon `zaman-kapsulu-couple`, satıcı "Text To Next", ürün tipi boş, etiket yok.
- Kategori Kolyeler.
- Vergi kapalı, stok takibi açık, "stok bitince satmaya devam" açık, kargo gerekli, ağırlık 0.
- 7 satış kanalının hepsine bağlı. DRAFT oldukları için hiçbir kanalda görünmüyorlar; ACTIVE olunca görünecekler.
- Koleksiyonlar: Couple Collection, Kampanyalı Couple Setler. Prizma + Chloe başka koleksiyonda değil.

**Farklı olanlar:**
- **Tek varyant, karşılaştırma fiyatı boş.**
- **SKU:** ROSEPINK-PRIZMA-SET ve GOLD-NOVA-SET (mağazada başka yerde yok).
- **Stok:** 0 bırakıldı. Prizma + Chloe'de 461 var. "Satmaya devam" açık olduğu için 0 stokla da satılabilir. Adet istersen yazarım.
- **Admin linkleri:**
  - https://admin.shopify.com/store/52ae29-e0/products/15445654307136
  - https://admin.shopify.com/store/52ae29-e0/products/15445657387328

**Metafield'lar (Prizma + Chloe'den):**
| Alan | Nasıl dolduruldu |
|---|---|
| `custom.card_title` | Bileşenlerle değişti: "Rose Pink + Prizma" / "Gold + Nova". |
| `custom.boyutlar` | Bileşenlerin kendi Ölçü alanından yazıldı (aşağıda). |
| `delivery.category_setting` | Birebir kopya (sunucudan okunarak doğrulandı). |
| `shopify--discovery--product_recommendation.complementary_products`, `related_products_display` | Birebir kopya. Bunlar öneri ürünleri, set bileşeni değil. |
| SEO başlığı (`global.title_tag`) | "Rose Pink + Prizma Couple Zaman Kapsülü \| Text To Next" / "Gold + Nova Couple Zaman Kapsülü \| Text To Next". |
| SEO açıklaması (`global.description_tag`) | Prizma + Chloe'ninkiyle aynı metin. Metinde ürün adı ya da bileşene özel bilgi yok; uyarlanacak bir şey çıkmadı. |

`custom.boyutlar` değerleri:
- **Rose Pink + Prizma:** "Rose Pink: Zincir uzunluğu 40+5 cm (ayarlanabilir)" / "Prizma: 21 cm"
- **Gold + Nova:** "Gold: Zincir uzunluğu 40+5 cm (ayarlanabilir)" / "Nova: 17+5 cm (ayarlanabilir)"

Kaynaklar:
- Rose Pink, Gold, Prizma ve Nova'nın kendi Ölçü alanı.
- Prizma'nın zincir bilgisi kendi açıklamasından: "Fasetli çubuk halkalı 316L cerrahi çelik zincir; uzatma zinciri yoktur."

### Açıklama değişiklikleri (Prizma + Chloe metni temel alındı)

Her iki sette aynı değişiklikler:

| Eski | Yeni |
|---|---|
| "Prizma + Chloe Couple Zaman Kapsülü Bileklik Seti" | "<Set> Couple Zaman Kapsülü Kolye ve Bileklik Seti" |
| "Prizma + Chloe, çiftler için tasarlanmış özel bir zaman kapsülü bileklik setidir." | "<Set>, … kolye ve bileklik setidir." |
| "İki bileklik bir araya geldiğinde kapsülünüz açılır…" | "Kolye ve bileklik bir araya geldiğinde kapsülünüz açılır…" |
| "Bilekliklerdeki çip tamamen su geçirmezdir. …" | "Bileklikteki çip tamamen su geçirmezdir. … Kolyedeki çipin suya dayanıklılığı: **[BELİRLENECEK]**" |
| "• İkiniz de bilekliğinizi takıyorsunuz." | "• Biriniz kolyesini, diğeriniz bilekliğini takıyor." |
| "• Buluştuğunuzda iki bilekliği okutuyorsunuz ve kapsül açılıyor." | "• Buluştuğunuzda kolye ile bilekliği okutuyorsunuz ve kapsül açılıyor." |
| "Prizma + Chloe, sadece bir aksesuar değil; …" | "<Set>, sadece bir aksesuar değil; …" |

Ölçü bloğu (bileşene özel):
- **Rose Pink + Prizma:** "✔ Ayarlanabilir tasarım — her bileğe mükemmel uyum / Kadın–erkek fark etmeksizin tüm bilek ölçülerine rahatça uyacak şekilde tasarlanmıştır. …" → "✔ Ölçüler / Rose Pink kolye 40+5 cm ayarlanabilir ölçüde gönderilir. Prizma bileklik 21 cm'dir; fasetli çubuk halkalı 316L cerrahi çelik zincirlidir, uzatma zinciri yoktur. Takması kolaydır, gün boyu konfor sağlar."
  - Prizma ayarlanabilir olmadığı için başlık değişti.
- **Gold + Nova:** aynı blok → "✔ Ayarlanabilir tasarım / Gold kolye 40+5 cm, Nova bileklik 17+5 cm ayarlanabilir ölçüde gönderilir. Takması kolaydır, gün boyu konfor sağlar."
- "Tüm bilek ölçülerine…" cümlesi Chloe'ye ait bir iddia olduğu için iki sette de çıkarıldı.

**[BELİRLENECEK]:**
- Tek alan: kolyedeki çipin suya dayanıklılığı.
- Rose Pink ve Gold'un kendi açıklamasında su bilgisi yok. Prizma ve Nova'da "su geçirmez" yazıyor.

**Kontrol etmen gerekenler** (değiştirmedim, şablondan aynen kaldı):
- **"Hipoalerjenik 316L Çelik" ve "Kararmaz … solma veya renk atma yapmaz":**
  - Rose Pink ve Gold'un kendi açıklamasında "925 ayar gümüşten üretilmiştir" yazıyor; ürünlerin gümüş varyantı da var.
  - Sette 316L çelik varyant kullanıldığı için malzeme 316L çelik kaldı.
  - Renkli kolyelerde "renk atmaz" ifadesinin doğru olduğundan emin ol.
- Galeri: Rose Pink + Prizma'da 12 görsel (4. bölüm), Gold + Nova'da 11 görsel (4b bölümü).

## 4. Rose Pink + Prizma galerisi (12/12 READY)

İşlem:
- Ürüne manifest sırasıyla bağlandı.
- Dosya adları aynen korundu; alt metinler manifest'ten yazıldı.
- Varyanta bağlı görsel yok.
- Ürünün durumu (DRAFT), fiyatı ve diğer ayarları değişmedi.
- 400 KB üstü 8 görsel önceki yöntemle sıkıştırıldı (benzerlik ≥ %98,5, ad aynı).

| Sıra | Medya ID | Dosya adı | Alt metin | Kaynak | Boyut / sıkıştırma | Durum |
|---|---|---|---|---|---|---|
| 1 | 46389987868992 | `rose-pink-prizma-01-packshot.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – ürün fotoğrafı | pakette | 199KB olduğu gibi | READY |
| 2 | 46389987901760 | `rose-pink-prizma-02-couple-dort-adim.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – Couple 4 adımda nasıl çalışır | pakette | 337KB olduğu gibi | READY |
| 3 | 46389987934528 | `rose-pink-prizma-03-lifestyle-1.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – model üzerinde 1 | Rose Pink galerisi | 876KB → 399KB q60 %98.59 | READY |
| 4 | 46389987967296 | `rose-pink-prizma-04-sette-neler-var.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – sette neler var | pakette | 272KB olduğu gibi | READY |
| 5 | 46389988000064 | `rose-pink-prizma-05-lifestyle-2.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – model üzerinde 2 | pakette (Prizma model üzerinde) | 1128KB → 397KB q66 %98.74 | READY |
| 6 | 46389988032832 | `rose-pink-prizma-06-couple-uygulama.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – Couple uygulama ekranları | pakette | 548KB → 384KB q84 %99.75 | READY |
| 7 | 46389988065600 | `rose-pink-prizma-07-garanti.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – süresiz çip garantisi | pakette | 454KB → 364KB q89 %99.88 | READY |
| 8 | 46389988098368 | `rose-pink-prizma-08-hediyeler-biter.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – hediye ömrü karşılaştırması | pakette | 364KB olduğu gibi | READY |
| 9 | 46389988131136 | `rose-pink-prizma-09-kutu-teslimat.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – kutu ve teslimat | pakette | 516KB → 390KB q87 %99.81 | READY |
| 10 | 46389988163904 | `rose-pink-prizma-10-lifestyle-3.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – model üzerinde 3 | Rose Pink galerisi | 830KB → 398KB q69 %98.65 | READY |
| 11 | 46389988196672 | `rose-pink-prizma-11-lifestyle-4.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – model üzerinde 4 | pakette (Prizma deniz karesi) | 1083KB → 396KB q71 %98.76 | READY |
| 12 | 46389988229440 | `rose-pink-prizma-12-lifestyle-5.jpg` | Rose Pink + Prizma Couple Zaman Kapsülü – Couple set – model üzerinde 5 | Rose Pink galerisi | 580KB → 340KB q67 %98.93 | READY |

**Rose Pink'ten indirilen görseller:**
| Yeni dosya | Rose Pink'teki dosya | Kaynak medya ID |
|---|---|---|
| `rose-pink-prizma-03-lifestyle-1.jpg` | `rose-pink-03-lifestyle-1.jpg` | **46287658058048** |
| `rose-pink-prizma-10-lifestyle-3.jpg` | `rose-pink-05-lifestyle-2.jpg` | **46287658123584** |
| `rose-pink-prizma-12-lifestyle-5.jpg` | `rose-pink-08-lifestyle-3.jpg` | **46287658221888** |

- **Orijinal dosyanın kendisi indirildi:** 1856×2304; bayt sayıları Shopify'daki orijinalle eşit.
- **3. model fotoğrafı:** vardı, satır atlanmadı.
- **Rose Pink'in kendi galerisi:** dokunulmadı; işten sonra da aynı 10 görsel, aynı sırada.

## 4b. Gold + Nova galerisi (11/11 READY, ek iş: gold-nova-set.zip)

İşlem:
- Ürüne manifest sırasıyla bağlandı.
- Dosya adları aynen korundu; alt metinler manifest'ten yazıldı.
- Varyanta bağlı görsel yok.
- Ürünün durumu (DRAFT), fiyatı (3.799 TL) ve diğer ayarları değişmedi.
- 400 KB üstü 8 görsel aynı yöntemle sıkıştırıldı (benzerlik ≥ %98,5, ad aynı).
- Manifest'te atlanan satır yok.

| Sıra | Medya ID | Dosya adı | Alt metin | Kaynak | Boyut / sıkıştırma | Durum |
|---|---|---|---|---|---|---|
| 1 | 46391258939712 | `gold-nova-01-packshot.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – ürün fotoğrafı | pakette | 197KB olduğu gibi | READY |
| 2 | 46391258972480 | `gold-nova-02-couple-dort-adim.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – Couple 4 adımda nasıl çalışır | pakette | 337KB olduğu gibi | READY |
| 3 | 46391259005248 | `gold-nova-03-lifestyle-1.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – model üzerinde 1 | Gold (316L Çelik) galerisi | 783KB → 388KB q69 %98.82 | READY |
| 4 | 46391259038016 | `gold-nova-04-sette-neler-var.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – sette neler var | pakette | 260KB olduğu gibi | READY |
| 5 | 46391259070784 | `gold-nova-05-lifestyle-2.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – model üzerinde 2 | pakette (Nova model üzerinde 1) | 407KB → 341KB q89 %99.86 | READY |
| 6 | 46391259103552 | `gold-nova-06-couple-uygulama.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – Couple uygulama ekranları | pakette | 548KB → 384KB q84 %99.75 | READY |
| 7 | 46391259136320 | `gold-nova-07-garanti.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – süresiz çip garantisi | pakette (Nova garanti) | 514KB → 396KB q88 %99.90 | READY |
| 8 | 46391259169088 | `gold-nova-08-hediyeler-biter.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – hediye ömrü karşılaştırması | pakette | 363KB olduğu gibi | READY |
| 9 | 46391259201856 | `gold-nova-09-kutu-teslimat.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – kutu ve teslimat | pakette | 516KB → 390KB q87 %99.81 | READY |
| 10 | 46391259234624 | `gold-nova-10-lifestyle-3.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – model üzerinde 3 | Gold (316L Çelik) galerisi | 749KB → 372KB q69 %98.94 | READY |
| 11 | 46391259267392 | `gold-nova-11-lifestyle-4.jpg` | Gold + Nova Couple Zaman Kapsülü – Couple set – model üzerinde 4 | pakette (Nova model üzerinde 2) | 505KB → 394KB q85 %99.80 | READY |

**Gold'dan indirilen görseller:**
- **Kaynak ürün:** "Gold" (**9100723585344**). 316L Çelik varyantı: SKU ATR313GY, 2.699 TL.
- **Diğer "Gold" kayıtları kullanılmadı:**
  - "Gold Çelik – ATR313GY" (15418511393088): DRAFT, 270 TL, galerisinde model fotoğrafı yok.
  - Gold Couple ve Taşlıkilit Gold başka ürünler.

| Yeni dosya | Gold'daki dosya | Kaynak medya ID |
|---|---|---|
| `gold-nova-03-lifestyle-1.jpg` | `gold-03-lifestyle-1.jpg` | **46287649931584** |
| `gold-nova-10-lifestyle-3.jpg` | `gold-05-lifestyle-2.jpg` | **46287649997120** |

- **Orijinal dosyanın kendisi indirildi:** 1856×2304; bayt sayıları eşit (802.453 ve 766.989).
- **Gold'un kendi galerisi:** dokunulmadı; işten sonra da aynı 9 görsel, aynı sırada.

**Rose Pink + Prizma:**
- Aynı zip'le galerisi bu raporun 4. bölümünde kuruldu.
- Bu turda yeniden yüklenmedi, kopya dosya oluşmasın diye.
- Kontrol edildi: 12/12 READY, manifest sırasıyla.

**Rose Pink + Prizma'nın gerçek sepet testi** (ürün ACTIVE olduktan sonra):
- 3.799 TL → çark koduyla **3.299 TL**.
- Otomatik indirim devreye girmedi, sipariş oluşmadı.
- Kayıt: `veri/rose-pink-prizma-sepet.json`.

## 5. Çark indirimi (yalnızca okundu, değiştirilmedi)

**Kod nasıl çalışıyor:**
- Çark artık Wheelio değil, temanın kendi çarkı (`assets/ttn-cark.js`).
- Herkese aynı kodu veriyor: **K7QX4M9TR**.
- Kazanınca kodu sepete kendisi uyguluyor (`/cart/update.js`) ve 30 dakika sonra kaldırıyor.
- Eski "WHEELIO:500₺ İndirim" kodları kişiye özel, tek kullanımlık ve 30 dakikalıktı. Hepsi süresi dolmuş durumda; sonuncusu 11.10.2026'da üretilmiş.

**K7QX4M9TR, "Çark – 500 TL":**
| Özellik | Değer |
|---|---|
| Durum | ACTIVE; 23.09.2026'dan beri geçerli, bitiş tarihi yok, 153 kez kullanılmış |
| Tutar | Sabit 500 TL, sepet toplamından düşülüyor |
| Kapsam | **Tüm ürünler.** Koleksiyon ya da ürün kısıtı yok, hariç tutulan ürün/koleksiyon yok |
| Minimum sepet | Yok |
| Müşteri | Tüm müşteriler, kişi başı bir kez |
| Birleşme | Ürün indirimleri ve kargo indirimleriyle birleşir; başka sepet indirimleriyle birleşmez |

**Sonuç:**
- Beş set de kapsamda. Yeni setler, kodun "tüm ürünler" kapsamı sayesinde koleksiyondan bağımsız olarak otomatik dahil.
- Yapılması gereken bir şey yok.

**Otomatik indirimler (bilgi):**
- **"İkinci Üründe %50 İndirim" (bir alana bir):**
  - 8 koleksiyondaki ürünlerde geçerli; Couple Collection da bunlardan biri. Yeni setler de bu koleksiyonda olduğu için kapsamda.
  - Tek setle devreye girmiyor (test edildi).
  - Sepette bu koleksiyonlardan iki ürün olunca ikinciye %50 iner ve çark koduyla birleşir. Bu bugünkü davranış, değiştirmedim.
- **"2000₺ Üzeri Ücretsiz Kargo":** dört set fiyatı da bu tutarın üstünde.

## 6. Sıralama ve tema

### Kampanyalı Couple Setler koleksiyonu (manuel sıra)

| # | Önce | Sonra |
|---|---|---|
| 1 | Prizma + Chloe | **Prizma + Chloe** |
| 2 | Astor + Chloe | **Nova + Chloe** |
| 3 | Nova + Chloe | **Rose Pink + Prizma** (DRAFT) |
| 4 | Rose Pink + Nova (DRAFT) | **Gold + Nova** (DRAFT) |
| 5 | Luna + Aurora | **Luna + Aurora** |
| 6 | White + Luna | Astor + Chloe |
| 7 | Kral + Classic Ocean Blue | Rose Pink + Nova (DRAFT) |
| 8 | Lumin + Charm | White + Luna |
| 9 | Kral + Infinity Charm | Kral + Classic Ocean Blue |
| 10 | Luna + Infinity Charm | Lumin + Charm |
| 11 | Noir + Chloe Charm | Kral + Infinity Charm |
| 12 | (Rose Pink + Prizma, yeni eklendi) | Luna + Infinity Charm |
| 13 | (Gold + Nova, yeni eklendi) | Noir + Chloe Charm |

- Diğer setler kendi aralarındaki sırayı korudu.
- Taslaklar vitrinde görünmüyor; yayına alınınca yerlerinde çıkacaklar.

### Couple modu "hazır setler" bölümünün kaynağı

- Bölüm `sections/tt-secim-kartlari.liquid` içinde.
- Doğrudan **Kampanyalı Couple Setler** koleksiyonundan, onun manuel sırasıyla besleniyor (ayar `setler_koleksiyon` = kampanyali-couple-setler; ayarın olduğu 6 şablonda da böyle).
- Ayrı bir tema listesi yok; koleksiyon sırası buraya kendiliğinden yansıyor.

**Önizlemedeki sıra (Couple Ürünler, Erkek `?mod=couple`, Kadın `?mod=couple`):**
- Bugün: Prizma + Chloe, Nova + Chloe, Luna + Aurora, Astor + Chloe, White + Luna, … Noir + Chloe. 10 aktif setin hepsi görünüyor.
- İki yeni set ACTIVE olunca 3. ve 4. sıraya girecek.

### Hiz paketi 1 temasında değişen dosyalar

| Dosya:satır | Değişiklik |
|---|---|
| `templates/collection.json:314` | `setler_adet` 10 → 12 (ayarın izin verdiği en fazla değer) |
| `templates/collection.couple-urunler.json:502` | aynı |
| `templates/collection.zaman-kapsulu-bileklik.json:1424` | aynı |
| `templates/collection.zaman-kapsulu-kolyeler.json:314` | aynı |
| `templates/collection.celik-kolyeler.json:314` | aynı |
| `templates/collection.gp-template-bk-default.json:314` | aynı (yedek şablon; ayar burada da olduğu için) |
| `templates/index.json:330-351` | Çok satanlar'a iki yeni kart: Rose Pink + Prizma, Gold + Nova (kategori couple, rozet ve üst etiket boş, sıra rozeti kapalı) |
| `templates/index.json:354-374` | Kart sırası: Prizma + Chloe, Nova + Chloe, Rose Pink + Prizma, Gold + Nova, Luna + Aurora; sonra kalan 14 kart eski sırasıyla. Kart silinmedi (17 → 19). |
| `sections/tt-cok-satanlar.liquid:680, 687-700, 837, 842-843, 1080-1082` | Kart bazında yeni ayar: "Bu kartta sıra rozetini gösterme" (varsayılan kapalı). Ayrıntı aşağıda. |

Ayarın bulunmadığı koleksiyon şablonlarına dokunulmadı: couple-guncel, couple-koleksiyon, couple-zaman-kapsulleri, hediye-zaman-kapsulu, eski, gem-*.

**Neden sıra rozeti ayarı eklendi:**
- Çok satanlar bölümü her karta sırasına göre otomatik **"#n çok satan"** rozeti basıyor.
- Yeni setleri 3. ve 4. karta koymak, yayına alındıklarında "#3 çok satan" ve "#4 çok satan" yazması demekti. Bu, "yeni setlere çok satan rozeti ekleme" kuralına aykırıydı.
- Bölüm ayarı ya hepsini açıyordu ya hepsini kapatıyordu; kart bazında kapatma yoktu. Bu yüzden ayar eklendi ve yalnızca iki yeni kartta açıldı.
- Bu kartlar rozet ve sıra numarası almıyor; diğer kartlar numarayı atlamadan devam ediyor.
- İki setin "2'li set" kategori etiketi diğer couple kartlarındaki gibi duruyor; bu bir satış iddiası değil.
- Bu etki yalnızca ürünler ACTIVE olunca görülebilir; bugün taslak oldukları için kartları çizilmiyor. Yayından sonra kontrol edeceğim.
- İstemezsen tek satırla geri alınır.

**Dikkat (setler_adet):**
- İki yeni set de ACTIVE olunca aktif set sayısı 12 olur; 12 ile hepsi görünür.
- Rose Pink + Nova da yayına alınırsa sayı 13 olur. O durumda son sıradaki Noir + Chloe şeritten düşer, çünkü ayarın üst sınırı 12.

### Önizleme linkleri (Hiz paketi 1)
- Ana sayfa: https://texttonext.com/?preview_theme_id=189388095808
- Couple koleksiyonu: https://texttonext.com/collections/couple-urunler?preview_theme_id=189388095808
- Erkek koleksiyonu Couple modu: https://texttonext.com/collections/zaman-kapsulu-bileklik?mod=couple&preview_theme_id=189388095808

Otomatik kontrol (önizleme HTML'i):
- 4 sayfada Liquid hatası yok.
- Çok satanlar şu an #1 Prizma + Chloe, #2 Nova + Chloe, #3 Luna + Aurora, #4 Astor + Chloe … diye başlıyor (taslaklar gizli).
- Ekran görüntüsü alınmadı.

## 7. Doğrulamalar

**Yayındaki tema (189316038976):**
- Başta (18:02 UTC, hiçbir değişiklikten önce) ve sonda (19:48 UTC) 701 dosyanın MD5 listesi birebir aynı.
- Son değişikliği hâlâ 21.10.2026 10:26 UTC.
- Listeler: `veri/canli-tema-md5-basta.json`, `veri/canli-tema-md5-sonda.json`.

**Hiz paketi 1 (yayın öncesi kontrol, yenilendi):**
- Canlıdan farklı 21 dosya, yalnızca kopyada 2 dosya.
  - 14 + 2 dosya hız paketinden.
  - 7 şablon bu işten.
  - `tt-cok-satanlar` iki işte de değişti.
- `config/settings_data.json` 15:50 kontrolünden beri değişmedi; canlıyla farkı yine yalnızca 3 beklenen kayıt.
- Liste: `veri/hiz-paketi-1-md5-sonda.json`.

**Diğer:**
- Silme yok.
- Noir ürünlerine ve mevcut setlerin fiyatlarına dokunulmadı.
- İndirim kuralları değişmedi.
- Hiçbir tema yayına alınmadı.
- Takip koduna dokunulmadı.

**Dosyalar:**
- `veri/`: ham sonuçlar.
  - Sepet testi: `sepet-sonuc.json`.
  - Açıklama değişiklikleri: `aciklama-degisiklikleri.json`.
  - Koleksiyon sırası: `koleksiyon-sira.json`.
  - Sıkıştırma: `sikistirma.txt`.
- `betikler/`: kullanılan betikler.
