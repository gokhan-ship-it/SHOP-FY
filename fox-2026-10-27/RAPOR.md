# Fox, Fox Couple ve Fox + Chloe (27.10.2026)

## Kısa özet
- Üç ürün de **DRAFT** (taslak), stok 0. Yayına almak size kalıyor; hiçbir şey silinmedi.
- Tema işleri **"Cark hatirlatma - 2026-10-26"** kopyasında. Yayındaki tema değişmedi (MD5 başta ve sonda aynı).
- Dünkü onayınızla "Kendi setini oluştur ↓" düğmesi de aynı kopyaya eklendi (bölüm 0).
- Dikkat isteyen 4 nokta:
  1. Fox'un rozeti "AVANTAJLI **ÜRÜN**" yazar (bölüm 4).
  2. Çark koduyla Fox alan müşteri ödeme adımında **99 TL kargo** görür (bölüm 5).
  3. Set şeridi 12 kartla sınırlı (bölüm 4).
  4. Fox + Chloe açıklamasına zincir satırı ekledim (bölüm 2).

## Temalar
| Tema | Rol | Yayına alınmamış iş |
|---|---|---|
| Prizma kampanya - 2026-10-25 (189440328000) | **YAYINDA** | Yok. Son değişikliği 25.10 12:45. |
| **Cark hatirlatma - 2026-10-26** (189466968384) | kopya | Var, işin tamamı burada. Çark hatırlatma çubuğu, sepet kutusu ve çark penceresi, ürün sayfası çarkı, süresi dolan kod düzeltmesi, set kutularına basınca kayma. Bugün eklenenler: atlama düğmesi, Fox kartları, rozet. |
| Icerik uretici - 2026-10-24 | kopya | Yok. İçindeki iş yayındaki temada; son değişikliği yayındakiyle aynı an. |
| Hiz paketi 1, Gumus stok notu, Calisma taslagi ve daha eski 8 tema | kopya | Yok. 26.10'daki karşılaştırmada bekleyen iş yoktu, o günden beri değişmediler. |

- "Reklam setleri" ve "WhatsApp" kopyaları artık listede yok.
- Yayına alınmamış iş tek kopyada toplu, birleştirme gerekmedi.

## 0. "Kendi setini oluştur ↓" düğmesi (dünkü 1. seçenek)
Düğme hazır setlerin başlığının altında, şeridin hemen üstünde duruyor. Yalnızca Couple modunda görünüyor; basınca sayfa "Kendi setini oluşturmak ister misin?" başlığına kayıyor.

- **Test (390 / 360 / 1440 px; Kadın, Erkek, Couple Ürünler):**
  - Hedef başlık menünün hemen altına geliyor: 116 px (telefon), 120 px (masaüstü).
  - Slot kutuları ekranda kalıyor.
  - Çark çubuğu açıkken de doğru yerde duruyor. "Hareketi azalt" açıkken kayma anında oluyor.
  - Single modda düğme gizli. Yatay taşma yok, konsolda yeni hata yok.
- **Ölçüm:** her basışta `tt_couple_set_atla` olayı gidiyor.
- **Metin:** "Kendi setini oluştur". Tema editöründe "Kendi setine atlama bağlantısı" ayarından değişir; boş bırakılırsa düğme gizlenir.

## 1–3. Ürünler
| | Fox | Fox Couple | Fox + Chloe Couple Zaman Kapsülü |
|---|---|---|---|
| ID | 15453165650240 | 15453164536128 | 15453168075072 |
| Handle | fox-zaman-kapsulu-bileklik-316l-paslanmaz-celik | fox-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple | fox-chloe-couple-zaman-kapsulu |
| Admin | [aç](https://admin.shopify.com/store/52ae29-e0/products/15453165650240) | [aç](https://admin.shopify.com/store/52ae29-e0/products/15453164536128) | [aç](https://admin.shopify.com/store/52ae29-e0/products/15453168075072) |
| Durum | DRAFT | DRAFT | DRAFT |
| Fiyat / karşılaştırma | 2.199 TL / boş | 2.199 TL / boş | 2.899 TL / boş |
| SKU (yeni) | FOX-316L | FOX-316L-CPL | FOX-CHLOE-SET |
| Şablon | zaman-kapsulu | zaman-kapsulu-couple | zaman-kapsulu-couple |
| Satıcı / tip / etiket | Zaman Kapsülü Bileklik / – / zaman kapsülü bileklik | Zaman Kapsülü Bileklik / – / – | Text To Next / – / – |
| Kategori | Bilezikler | Bilezikler | Kolyeler (Prizma + Chloe ile aynı) |
| Seçenek | Ham Madde: 316L Cerrahi Çelik | Ham Madde: 316L Cerrahi Çelik | Default Title |
| Ağırlık, vergi, stok | 0 kg, vergisiz, stok takibi açık, bitince satmaya devam, stok 0 | aynı | aynı |
| Kanallar | 7 kanal (Online Mağaza, POS, Paraşüt, Facebook, Google, TikTok, Inbox) | yalnız Online Mağaza | 7 kanal |
| Koleksiyonlar | Erkekler İçin Zaman Kapsülleri, 1 Al 1 Bedava — Çelik | Couple, Couple Collection, Couple Zaman Kapsülleri, Couple Ürünler | Couple Collection, Kampanyalı Couple Setler |
| Metafield | custom.couple_urun → Fox Couple; custom.boyutlar; öneri metafield'ları | custom.couple_ikizi = true; seo.hidden = 1; custom.boyutlar; öneri metafield'ları | custom.card_title "Fox + Chloe"; custom.boyutlar; SEO açıklaması; teslimat metafield'ı (delivery.category_setting, aynen); öneri metafield'ları |

- **Ad:** Prizma'nın adı yalnızca "Prizma", ikizininki "Prizma Couple". Aynı yapı izlendi: "Fox", "Fox Couple". Handle'lar Prizma'nınkiyle aynı yapıda.
- **SEO:** Prizma'da başlık ve açıklama boş, Fox'ta da boş (Shopify ad ve açıklamayı kullanır). Fox + Chloe'nin SEO açıklaması Prizma + Chloe'ninkinin aynısı (içinde Prizma geçmiyor).
- **Prizma'dan bilerek farklı olanlar:**
  - Fiyat 2.199 TL ve karşılaştırma fiyatı boş, istediğiniz gibi. Prizma kampanyada 1.999 TL, üstü çizili 2.399 TL.
  - Ürün referansı taşıyan metafield'lar: Fox'unki kendi ikizine bağlı. Prizma + Chloe'nin metafield'larında Prizma'ya ürün referansı yoktu.
- Görsellerin hiçbiri varyanta bağlı değil.

## Açıklama değişiklikleri (eski → yeni)
**Fox ve Fox Couple** (Prizma ile Prizma Couple'ın açıklaması aynı):
- "**Zincir**: Fasetli çubuk halkalı 316L cerrahi çelik zincir; uzatma zinciri yoktur." → "**Zincir**: Franco zincir (balık sırtı desenli, sık örgülü) 316L cerrahi çelik; uç kapakları silindir; uzatma zincirli."
- "**Ölçü**: 21 cm" → "**Ölçü**: [UZUNLUK – BELİRLENECEK]" (uzunluk ve uzatma zinciri ölçüsü buraya gelecek)
- custom.boyutlar: "Ölçü: 21 cm" → "Ölçü: [UZUNLUK – BELİRLENECEK]"
- Geri kalan (garanti, su geçirmezlik) aynen; yeni iddia eklenmedi.

**Fox + Chloe:**
- "Prizma + Chloe" → "Fox + Chloe" (3 yerde).
- **Eklenen satır** (tanıtım cümlesinin hemen altı): "Fox zinciri: Franco zincir (balık sırtı desenli, sık örgülü) 316L cerrahi çelik; uç kapakları silindir; uzatma zincirli."
  - Prizma + Chloe'nin açıklamasında zincir tarifi yoktu; "zincir tarifi 1. maddedeki gibi" dediğiniz için bu satırı ekledim. İstemezseniz silerim.
- custom.boyutlar: "Prizma: 21 cm" → "Fox: [UZUNLUK – BELİRLENECEK]". "Chloe: 17+5 cm (ayarlanabilir)" aynen kaldı.
- custom.card_title: "Prizma + Chloe" → "Fox + Chloe".

**[BELİRLENECEK] olan alanlar:**
- Fox ve Fox Couple açıklamasındaki Ölçü satırı.
- custom.boyutlar, üç üründe de.
- Stok, üç üründe de 0.

## Galeri (29/29 READY, sıra manifest.csv ile aynı, dosya adları aynen)
Önce bütün görseller dosya olarak yüklendi ve READY oldu, sonra ürünlere bağlandı. Sıkıştırma önceki yöntemle yapıldı: benzerlik en az %98,5 kalan en küçük JPEG.

- **400 KB'ın altına inemeyen 4 fotoğraf (8 dosya):**
  - lifestyle-1: 508 KB
  - lifestyle-2 / fox-chloe-10: 1.162 KB
  - fox-chloe-05: 567 KB
  - fox-chloe-11: 519 KB
- Neden: daha küçültünce benzerlik %98,5'in altına düşüyor (Prizma'da da iki görselde aynısı olmuştu).

**Fox**

| Sıra | Medya ID | Dosya adı | Alt metin | Boyut / sıkıştırma | Durum |
|---|---|---|---|---|---|
| 1 | 46438875332928 | `fox-01-packshot.jpg` | Fox – Zaman Kapsülü bileklik – ürün fotoğrafı | 290KB olduğu gibi | READY |
| 2 | 46438875365696 | `fox-02-dort-adim.jpg` | Fox – Zaman Kapsülü bileklik – 4 adımda nasıl çalışır | 384KB olduğu gibi | READY |
| 3 | 46438875398464 | `fox-03-lifestyle-1.jpg` | Fox – Zaman Kapsülü bileklik – model üzerinde 1 | 1291KB -> 508KB q69 %98.50 | READY |
| 4 | 46438875431232 | `fox-04-garanti.jpg` | Fox – Zaman Kapsülü bileklik – süresiz çip garantisi | 540KB -> 389KB q85 %99.80 | READY |
| 5 | 46438875464000 | `fox-05-lifestyle-2.jpg` | Fox – Zaman Kapsülü bileklik – model üzerinde 2 | 1522KB -> 1162KB q85 %98.52 | READY |
| 6 | 46438875496768 | `fox-06-single-couple.jpg` | Fox – Zaman Kapsülü bileklik – Single ve Couple karşılaştırması | 303KB olduğu gibi | READY |
| 7 | 46438875529536 | `fox-07-uygulama.jpg` | Fox – Zaman Kapsülü bileklik – uygulama ekranları | 498KB -> 399KB q89 %99.87 | READY |
| 8 | 46438875562304 | `fox-08-hediyeler-biter.jpg` | Fox – Zaman Kapsülü bileklik – hediye ömrü karşılaştırması | 387KB olduğu gibi | READY |
| 9 | 46438875595072 | `fox-09-kutu-teslimat.jpg` | Fox – Zaman Kapsülü bileklik – kutu ve teslimat | 516KB -> 390KB q87 %99.81 | READY |

**Fox Couple**

| Sıra | Medya ID | Dosya adı | Alt metin | Boyut / sıkıştırma | Durum |
|---|---|---|---|---|---|
| 1 | 46438875627840 | `fox-couple-01-packshot.jpg` | Fox Couple – Zaman Kapsülü bileklik – ürün fotoğrafı | 290KB olduğu gibi | READY |
| 2 | 46438875660608 | `fox-couple-02-couple-dort-adim.jpg` | Fox Couple – Zaman Kapsülü bileklik – Couple 4 adımda nasıl çalışır | 337KB olduğu gibi | READY |
| 3 | 46438875693376 | `fox-couple-03-lifestyle-1.jpg` | Fox Couple – Zaman Kapsülü bileklik – model üzerinde 1 | 1291KB -> 508KB q69 %98.50 | READY |
| 4 | 46438875726144 | `fox-couple-04-garanti.jpg` | Fox Couple – Zaman Kapsülü bileklik – süresiz çip garantisi | 540KB -> 389KB q85 %99.80 | READY |
| 5 | 46438875758912 | `fox-couple-05-lifestyle-2.jpg` | Fox Couple – Zaman Kapsülü bileklik – model üzerinde 2 | 1522KB -> 1162KB q85 %98.52 | READY |
| 6 | 46438875791680 | `fox-couple-06-single-couple.jpg` | Fox Couple – Zaman Kapsülü bileklik – Single ve Couple karşılaştırması | 303KB olduğu gibi | READY |
| 7 | 46438875824448 | `fox-couple-07-couple-uygulama.jpg` | Fox Couple – Zaman Kapsülü bileklik – Couple uygulama ekranları | 548KB -> 384KB q84 %99.75 | READY |
| 8 | 46438875857216 | `fox-couple-08-hediyeler-biter.jpg` | Fox Couple – Zaman Kapsülü bileklik – hediye ömrü karşılaştırması | 387KB olduğu gibi | READY |
| 9 | 46438875889984 | `fox-couple-09-kutu-teslimat.jpg` | Fox Couple – Zaman Kapsülü bileklik – kutu ve teslimat | 516KB -> 390KB q87 %99.81 | READY |

**Fox + Chloe Couple Zaman Kapsülü**

| Sıra | Medya ID | Dosya adı | Alt metin | Boyut / sıkıştırma | Durum |
|---|---|---|---|---|---|
| 1 | 46438875922752 | `fox-chloe-01-packshot.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – ürün fotoğrafı | 282KB olduğu gibi | READY |
| 2 | 46438875955520 | `fox-chloe-02-couple-dort-adim.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – Couple 4 adımda nasıl çalışır | 337KB olduğu gibi | READY |
| 3 | 46438875988288 | `fox-chloe-03-lifestyle-1.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – model üzerinde 1 | 1291KB -> 508KB q69 %98.50 | READY |
| 4 | 46438876021056 | `fox-chloe-04-sette-neler-var.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – sette neler var | 265KB olduğu gibi | READY |
| 5 | 46438876053824 | `fox-chloe-05-lifestyle-2.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – model üzerinde 2 | 1387KB -> 567KB q52 %98.59 | READY |
| 6 | 46438876086592 | `fox-chloe-06-couple-uygulama.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – Couple uygulama ekranları | 548KB -> 384KB q84 %99.75 | READY |
| 7 | 46438876119360 | `fox-chloe-07-garanti.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – süresiz çip garantisi | 540KB -> 389KB q85 %99.80 | READY |
| 8 | 46438876152128 | `fox-chloe-08-hediyeler-biter.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – hediye ömrü karşılaştırması | 364KB olduğu gibi | READY |
| 9 | 46438876184896 | `fox-chloe-09-kutu-teslimat.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – kutu ve teslimat | 516KB -> 390KB q87 %99.81 | READY |
| 10 | 46438876217664 | `fox-chloe-10-lifestyle-3.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – model üzerinde 3 | 1522KB -> 1162KB q85 %98.52 | READY |
| 11 | 46438876250432 | `fox-chloe-11-lifestyle-4.jpg` | Fox + Chloe Couple Zaman Kapsülü – Couple set – model üzerinde 4 | 1313KB -> 519KB q51 %98.55 | READY |

## 4. Yerleşim ve rozet
**Erkek koleksiyonu** (elle sıralı): 1 Prizma, **2 Fox**, 3 Vantablack, sonra eskiler aynı sırada.

**Kampanyalı Couple Setler:** 1 Prizma + Chloe, **2 Fox + Chloe**, 3 Nova + Chloe, sonra diğerleri aynı sırada.
- **setler_adet zaten 12, ayarın üst sınırı.** Bugün 13 aktif set var; 13. sıradaki Noir + Chloe Charm şeritte zaten görünmüyor.
- Fox + Chloe yayına alınınca set sayısı 14 olur. Fox + Chloe 2. sırada görünür, ama Luna + Infinity Charm da şeridin dışına düşer.
- 12'den fazlası için bölüm ayarının sınırını değiştirmek gerekir; yapmadım.

**Couple koleksiyonları** (Couple, Couple Collection, Couple Zaman Kapsülleri, Couple Ürünler) elle sıralı değil: sırayı Shopify çok satana ya da alaka düzeyine göre veriyor. Fox Couple'ın yeri de Prizma Couple'da olduğu gibi otomatik.

**Couple modu:**
- Erkek sayfasındaki set oluşturucu ürünleri Erkek koleksiyonunun sırasıyla alıyor, yani Fox Prizma'nın hemen arkasında çıkacak.
- Fox'un Couple görünümü custom.couple_urun ile Fox Couple'a bağlı.
- Kampanyalı Couple Setler şeridinde Fox + Chloe 2. sırada.
- Ürünler taslakken vitrinde görünmedikleri için bunları API'den doğruladım: koleksiyon sıraları, ikiz bağı ve tema dosyaları.

**Rozet:** Prizma'nın kartlardaki rozeti bir tema ayarından geliyor: *Tema ayarları → Kampanya rozeti*. Etiket ya da metafield değil.
| Ayar | Değer |
|---|---|
| tt_kmp_urunler (ürün listesi) | Prizma + **Fox** (Fox'u kopyada ekledim) |
| tt_kmp_ust (üst satır) | AVANTAJLI |
| tt_kmp_alt (alt satır) | "otomatik": karşılaştırma fiyatı − fiyat. Prizma'da "-400₺". |
| tt_kmp_serit (kart şeridi ve ürün sayfası etiketi) | Son gün 1 Kasım |
| tt_kmp_bitis | 2026-11-01 23:59 (İstanbul) |

- Fox'un karşılaştırma fiyatı boş. Bu yüzden rozetin alt satırı "-400₺" yerine **"ÜRÜN"** yazar: "AVANTAJLI ÜRÜN".
- Fox'un kartında da "Son gün 1 Kasım" şeridi çıkar. Rozet 1 Kasım 23:59'da Prizma'nınkiyle birlikte kalkar.
- Fox'ta indirim yokken "Son gün" yazması yanıltıcı olabilir. İsterseniz Fox'u listeden çıkarırım.

**Ana sayfa:** Prizma yalnızca "En çok tercih edilenler" bölümünde var.
- Yeni sıra:
  1. Prizma
  2. **Fox** (yeni)
  3. Prizma + Chloe
  4. **Fox + Chloe** (yeni)
  5. ve sonrası: eski kartlar aynı sırada
- Hiçbir kart silinmedi.
- İki yeni kartta da "sıra rozetini gösterme" açık, Prizma kartında olduğu gibi. Yani yeni ürünlere "#n çok satan" yazmıyor ve diğer kartların numaraları kaymıyor.
- Fox kartı aynı rozeti alıyor.
- Ürünler taslakken bu kartlar vitrinde görünmüyor. Ana sayfayı kopya temada açtım: 20 kart ve sıra numaraları yayındakiyle birebir aynı, hata yok.

## 5. Çark ve kargo
**Çark kodu K7QX4M9TR ("Çark – 500 TL"):**
- Aktif ve **tüm ürünlerde** geçerli. Hariç tutulan ürün ya da koleksiyon yok, en az sepet tutarı yok, kişi başı bir kez.
- Ürün ve kargo indirimleriyle birleşir.
- → **Fox, Fox Couple ve Fox + Chloe kapsamda.** Değişiklik gerekmedi, dokunmadım.
- "İkinci Üründe %50" otomatik indirimi de üçünü kapsıyor (Erkek ve Couple koleksiyonları üzerinden, Prizma'larla aynı).

**Kargo kuralları (iki tane):**
1. Kargo profili: 99 TL; sipariş tutarı **2.499 TL** ve üstüyse 0 TL.
2. Otomatik indirim "2000₺ Üzeri Ücretsiz Kargo": ara toplam **2.000 TL** ve üstüyse kargo ücretsiz. Çark koduyla birleşir.

**İki eşik de çark kodu düşüldükten sonraki tutara bakıyor.** Fox'la aynı fiyat yapısındaki yayındaki ürünlerle Shopify'ın sepet arayüzünde ölçtüm. Bu arayüz ödeme adımıyla aynı indirim ve kargo hesabını yapıyor; sipariş oluşturulmadı.
| Test sepeti | Ara toplam → çarkla | Kargo |
|---|---|---|
| Luna 2.299 TL, kodsuz | 2.299 | ücretsiz (2.000 indirimi) |
| Luna 2.299 TL + çark | 2.299 → 1.799 | **99 TL** (2.000 indirimi devreye girmedi) |
| Lumin 2.699 TL, kodsuz | 2.699 | 0 TL (2.499 kuralı) |
| Lumin 2.699 TL + çark | 2.699 → 2.199 | ücretsiz (2.499 kuralı tutmadı, 2.000 indirimi devreye girdi) |
| Chloe 2.099 TL + çark | 2.099 → 1.599 | **99 TL** |
| Prizma + Chloe 3.398 TL + çark | 3.398 → 2.898 | 0 TL |

**Sonuç:**
- **Fox / Fox Couple (2.199 TL):** kodsuz ücretsiz kargo. **Çarkla 1.699 TL olunca ödeme adımında 99 TL kargo çıkar**; toplam 1.798 TL.
- **Fox + Chloe (2.899 TL):** çarkla 2.399 TL; 2.000 TL indirimi devreye girer, **kargo ücreti yok**.
- İndirime ve kargoya dokunmadım.
- Çark kodlu Fox'ta da kargonun ücretsiz olmasını isterseniz bir yol, ücretsiz kargo indiriminin alt sınırını 1.699 TL veya altına çekmek. Karar sizde.

## Değişen tema dosyaları (yalnız kopya: Cark hatirlatma - 2026-10-26)
| Dosya | Değişiklik | MD5 önce → sonra |
|---|---|---|
| sections/tt-secim-kartlari.liquid | Atlama düğmesi (yapı, stil, ayar), hedef başlık | b1f0c463… → f97a59d7… |
| assets/tt-secim-kartlari.js | Atlama düğmesinin kayması ve ölçümü | 3f720dbf… → d5ff309c… |
| templates/index.json | En çok tercih edilenler: Fox ve Fox + Chloe kartları | ec9f42e0… → a481c64e… |
| config/settings_data.json | Kampanya rozeti listesine Fox | 04e6cc42… → 2020000e… |

Geri kalan her şey (çark, indirim kodu mantığı, takip kodları) aynı.

## Önizleme linkleri (kopya tema)
- Ana sayfa: https://texttonext.com/?preview_theme_id=189466968384
- Erkek (Couple modu ve düğme): https://texttonext.com/collections/zaman-kapsulu-bileklik?mod=couple&preview_theme_id=189466968384
- Kadın: https://texttonext.com/collections/zaman-kapsulu-kolyeler?mod=couple&preview_theme_id=189466968384
- Couple Ürünler: https://texttonext.com/collections/couple-urunler?mod=couple&preview_theme_id=189466968384
- Önizlemeden çıkmak için: https://texttonext.com/?preview_theme_id=

Fox ürünleri taslakken vitrinde ve önizlemede görünmez. Admin'deki "Önizle" düğmesi ürün sayfasını yayındaki temayla açar.

## Yayındaki tema değişmedi (MD5)
- "Prizma kampanya - 2026-10-25" temasının 710 dosyası iş başında (13:13 UTC) ve sonunda (13:42 UTC) karşılaştırıldı: **fark 0**.
- Temanın son güncellenme zamanı hâlâ 25.10 12:45.
- Dünün son listesiyle de aynı.
- Kayıtlar: `veri/canli-md5-bas.json`, `veri/canli-md5-son.json`.

## Klasör
- `betikler/atla-test.js`: düğme testi
- `betikler/sf-sepet.py`: kargo/sepet ölçümü (salt okuma)
- `betikler/kargo-test.js`: ödeme sayfası denemesi. Mağazanın bot korumasına (429, "Bir dakika lütfen") takıldı, yerine sepet arayüzü kullanıldı.
- `betikler/sikistir.py`
- `veri/`:
  - test sonuçları
  - ürün girdileri
  - Prizma okumaları
  - galeri planı
  - medya durumları
  - sıkıştırma kaydı
  - manifest
