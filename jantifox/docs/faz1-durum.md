# Faz 1: Durum raporu (Kanvas Lacivert Tote pilotu)

Tarih: 2026-10-07

## Önizleme

`https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766`

- Tema: `Kişiselleştirme DEV - 2026-10-07` (yayında değil).
- Canlı temaya dokunulmadı.

## Yapılanlar

### Veri katmanı

Ayrıntılar `degisiklik-kaydi.md` dosyasında.

- `kisisellestirme` namespace'inde 12 metafield tanımı.
- `kisisellestirme_katalog` metaobject tanımı ve `ana` kaydı.
- 60 patch ürününün ölçüleri sayısal alanlara aktarıldı. Kontrol listesi: `veri/olcu-kontrol-listesi.md`.
- Cool Alfabe ve Rakam varyantlarının `karakter` değerleri girildi.
- Pilot çantanın haritası, önizleme görseli ve `aktif` bayrağı girildi.

### Tema (kopya temada)

Yeni dosyalar:

| Dosya | Görev |
|---|---|
| `snippets/kisisel-kart.liquid` | Ürün sayfası kartı. Yalnızca `patch-notice` etiketli, `aktif` ve haritası olan üründe görünür. |
| `snippets/kisisel-veri.liquid`, `snippets/kisisel-veri-patch.liquid` | Metafield ve katalogdan editör verisini JSON olarak basar. Stok bilgisi dahil. |
| `assets/kisisel-editor.js` / `.css` | Tam ekran editör, geometri, sığma, stok, sürükleme, sepete ekleme, ölçüm olayları. Harici kütüphane yok. |
| `snippets/kisisel-sepet.liquid`, `assets/kisisel-sepet.js` | Sepet çekmecesinde ve sepet sayfasında grup gösterimi, silme ve adet kuralları. |

Mevcut dosyalarda zorunlu değişiklikler (ikisi de tek ekleme):

1. `templates/product.product-canta.json`: fiyat bloğunun altına `custom_liquid` bloğu `kisisel_kart` eklendi. İçeriği: `{% render 'kisisel-kart', product: product, section: section %}`.
   - Bu şablonu kullanan diğer ürünlerde kart görünmez, çünkü `kisisellestirme.aktif` yalnızca pilot çantada `true`.
2. `layout/theme.liquid`: `</body>` öncesine `{%- render 'kisisel-sepet' -%}` eklendi.
   - Sepet gruplaması her sayfadaki çekmecede çalışmalı.
   - Sepette tasarım kalemi yoksa hiçbir istek atmaz.

### Kararlarının uygulanışı

| Karar | Uygulama |
|---|---|
| Türkçe harf | İ, Ç, Ğ, Ö, Ş, Ü stokta yoksa uyarı ve öneri çıkar, örneğin "İ harfi şu an yok, I olarak yazmak ister misin?" yanında [I olarak yaz] ve [İ harfini sil] seçenekleri. Otomatik değiştirme yapılmaz. Öneri onaylanmadan ya da harf silinmeden İleri butonu çalışmaz. |
| Piramit | Pilotta yalnızca Cool Alfabe var. Katalogdaki `harf_setleri` listesine Piramit ürünü eklenince set kartı otomatik çıkar. Varyant `renk` alanı tanımlı; harf başına renk seçimi Faz 1 sonrası eklenecek. |
| Harf genişliği | Katalog ayarı `varsayilan_harf_genislik_cm = 5.5`, tek yerden değişir: Admin → İçerik → Metaobject'ler → Kişiselleştirme kataloğu → Ana katalog → Genel ayarlar. Gerçek ölçü gelince Cool Alfabe ürününün `genislik_cm` alanına girilirse o değer önceliklidir. |
| İki satır | İsim gerekirse iki satıra bölünür. Kapasite, daire geometrisi, harf ölçüsü, boşluk ve kenar payından hesaplanır; sabit bir sayı yazılmadı. Bugünkü yer tutucu ölçülerle sonuç: tek satır 4 harf, iki satır 6 harf. |
| İkon kategorileri | `janti …` etiketlerinden okunur. Kategori sırası katalogdaki `kategoriler` listesidir. Bir ikon, listede ilk eşleşen kategoride görünür; Kalpler listede Spor'dan önce olduğu için kalpler yalnızca Kalpler'de çıkar. |
| Sepet | Çanta silinirse onay sorulur, grup silinir. Tek patch silinirse uyarı çıkar, patch silinir ve çanta kalemindeki "Tasarım" ve "İsim" bilgisi güncellenir. Çanta adedi değişirse patch adetleri orantılı değişir. Patch satırlarında adet kutusu gizlidir. |
| "Hemen satın al" | Kişiselleştirme modunda hem üründe hem sabit çubukta gizlenir. Sabit çubuktaki buton da tasarımla sepete ekler. Tasarım boşken butona basılırsa editör açılır; ürün asla düz satılmaz. |
| Yedek plan | Kart `hidden` gelir. JS veya veri hatasında görünmez, sayfa bugünkü gibi çalışır. |

### Siparişte görünenler (paketleme için)

**Çanta kalemi**
- Görünür: `Tasarım: ECE + 7 + Futbol Topu`, `İsim: ECE`
- Gizli: `_tasarim_id`, `_tasarim_rol=baz`, `_tasarim_konum` (JSON, cm cinsinden konumlar)

**Harf kalemleri**
- Görünür: `Tasarım: …`, `Harf sırası`. Örnek: E ×2, `Harf sırası: 1, 3`; C ×1, `Harf sırası: 2`.
- Gizli: `_tasarim_id`, `_adet_birim`

**Rakam ve ikon kalemleri**
- Görünür: `Tasarım: …`
- Gizli: `_tasarim_id`, `_adet_birim`

Not: Brief'te görünür özet yalnızca çanta kalemi için istenmişti. Siparişte kalemler gruplanmadığı için patch kalemlerine de aynı `Tasarım` özetini ekledim; paketlemede hangi patch'in hangi çantaya ait olduğu böylece okunur. İstemezsen kaldırırım.

### Ölçüm

Tema şu olayları `Shopify.analytics.publish` ile yayınlar:

| Olay | Gönderilen veri |
|---|---|
| `kisisellestirme_acildi` | |
| `isim_yazildi` | Yalnızca `harf_sayisi` |
| `ikon_eklendi` | |
| `tasarim_tamamlandi` | |
| `tasarimla_sepete_eklendi` | `toplam` ve `para_birimi` |

Meta'ya iletmek için `docs/customer-events-pixel.js` kodu Admin → Ayarlar → Müşteri etkinlikleri → Özel piksel olarak eklenmeli; piksel kimliği girilmeli. Bunu senin eklemen gerekiyor.

## Test durumu

### Otomatik testler (geçti)

- `test/editor.test.mjs`: 14 test.
  - Ölçek ve 25 cm daire, tr-TR büyük harf.
  - Kapasite, ECE, ELİF uyarısı, Ç/Ğ/Ö/Ş/Ü önerileri.
  - Aynı harf stok kontrolü, sığmayan isim.
  - Daire, elips ve dikdörtgen alan; yasaklı bölge; çakışma; fiyat; kategori önceliği.
- `test/tarayici/e2e.mjs`: Chromium, iPhone 13 emülasyonu ve dokunmatik olaylarla şu akış:
  - "Kişiselleştir" seçilir.
  - "elif" yazılır, İ uyarısı çıkar.
  - Uzun isim yazılır, "sığmıyor" uyarısı ve öneriler çıkar.
  - "ECE" yazılır, 7 eklenir, Futbol Topu eklenir.
  - İkon dokunarak daire dışına sürüklenir ve en yakın geçerli yere döner; sayfa kaymaz.
  - Özet doğru, kart özeti doğru, buton metni doğru, "Hemen satın al" gizli.
  - Sabit çubuktan sepete ekleme tek istekte gider; tema submit'i çalışmaz; property'ler doğru.
- `test/tarayici/sepet-e2e.mjs`:
  - Satırlar gruplanır.
  - Çanta adedi 2 olunca patch'ler orantılı artar.
  - Patch silinince çanta özeti güncellenir.
  - Çanta silinince grup silinir.
  - Tasarım dışı ürün temaya bırakılır.

### Yapılamayanlar (gerçek mağazada)

Bu ortamın ağ politikası `jantifox.com` ve `cdn.shopify.com` adreslerine izin vermiyor. Bu yüzden:

1. Önizleme linkini açıp Liquid çıktısını doğrulayamadım. Dosyalar kopya temaya yüklendi, checksum'lar doğrulandı.
2. **EasyBundle testini yapamadım.** İki yol var:
   - (a) Ortam ayarlarında Network access → Allowed domains'e `jantifox.com` ve `cdn.shopify.com` eklersen, testi headless Chromium ile ben yaparım.
   - (b) Aşağıdaki testi sen yaparsın.
3. iPhone Safari ve Instagram uygulama içi tarayıcı testleri gerçek cihaz gerektiriyor (aşağıdaki liste).

### EasyBundle testi (elle)

1. Önizleme linkinde sepeti boşalt.
2. Çantayı "ECE + 7 + bir ikon" ile sepete ekle.
3. Sepet çekmecesinde 4 kalem grup olarak görünmeli: çanta, E ×2, C, 7, ikon.
4. Bir "Patch Seti" ürününü (örneğin Hearts Patch Seti) sepete ekle.
5. Sepet sayfasında ve ödeme ekranında kalemlerin, fiyatların ve tasarım bilgilerinin değişmediğini kontrol et.
6. Tarayıcı konsolunda şunu çalıştırıp çıktıyı bana gönder:

   ```js
   fetch('/cart.js').then(r=>r.json()).then(c=>console.log(JSON.stringify(c.items.map(i=>({t:i.title,q:i.quantity,p:i.properties})),null,1)))
   ```

## Cihaz test listesi (kabul kriteri)

iPhone Safari ve Instagram uygulama içi tarayıcıda yapılacak. Linki Instagram'da kendine DM olarak gönderip oradan açabilirsin.

- [ ] Kart fiyatın altında görünüyor. "Sadece çanta" seçiliyken sayfa bugünkü gibi çalışıyor.
- [ ] "Kişiselleştir"e basınca editör tam ekran açılıyor. Arkadaki sayfa kaymıyor.
- [ ] "ece" yazınca "ECE" oluyor, kapasite "3 / 6" görünüyor.
- [ ] "elif" yazınca İ uyarısı çıkıyor. Öneri onaylanmadan İleri çalışmıyor.
- [ ] Rakam adımında 7 ekleniyor. İkon adımında bir ikon ekleniyor ve parmakla sürüklenebiliyor.
- [ ] Sürüklerken sayfa kaymıyor. Daire dışına bırakılan ikon geri dönüyor.
- [ ] Özet: 3.000 + 3 harf + 1 rakam + 1 ikon = **4.650 TL**.
- [ ] Tamam'dan sonra:
  - [ ] Galerinin ilk görseli "Senin tasarımın" oluyor.
  - [ ] Kartta "ECE · 3 harf", "7 · 1 rakam", "… · 1 ikon" görünüyor.
  - [ ] Buton "Tasarımımla sepete ekle · 4.650 TL" oluyor.
  - [ ] "Hemen satın al" görünmüyor.
- [ ] Sepete ekleyince çekmece açılıyor, kalemler grup halinde ve toplam 4.650 TL.
- [ ] Test siparişinde:
  - [ ] Çanta kaleminde "Tasarım" ve "İsim" görünüyor.
  - [ ] Harflerde "Harf sırası" görünüyor.
  - [ ] Stoklar düşüyor.

## Açık işler ve bilmen gerekenler

1. **Harita kalibre edilmedi.** Daire konumu ve çantanın görseldeki kutusu tahmini değerler; görseli göremedim. Editörde "Önizleme ölçüleri henüz kalibre edilmedi" notu çıkıyor. Çözüm yolları:
   - CDN erişimi açılırsa görsele bakıp ben kalibre ederim.
   - Ya da Faz 2 aracıyla kalibre ederiz.
   - Elle de girilebilir: `kisisellestirme.harita` metafield'ında `urun_kutusu` alanı çantanın görseldeki kutusu, `zones[0]` dairenin kutusu; ikisi de % cinsinden. Sonra `"kalibre": true` yapılır.
2. **Şeffaf PNG'ler yok.** Patch'ler şu an beyaz zeminli JPG kutular olarak görünüyor. PNG'ler geldikçe ürünün ya da varyantın `kisisellestirme.onizleme_png` alanına yüklenmesi yeterli; kod değişmez.
3. **Ölçüsü eksik ikonlar editörde listelenmiyor:**
   - 5 kalp: yükseklik yok.
   - Kapibara ve Meteor: birimsiz yükseklik.
   - Ölçüler girilince otomatik görünecekler. Ayrıntı: `veri/olcu-kontrol-listesi.md`.
4. **Worm Family Patch Seti katalogda yok.** Set ürünü olduğu için ekleyip eklememe kararı senin.
5. **Kategorisi olmayan ikonlar "Diğer"de görünüyor.** Örnekler: Musical Note, Retro Casette Player, Eggcellent.
6. **Adet kuralı:** Ürün sayfasında adet 2 seçilirse 2 çanta ve her patch'ten 2 kat eklenir.
