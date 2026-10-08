# Kişiselleştirme: yayına alma planı (taslak, uygulanmadı)

Hazırlandığı tarih: 2026-10-08. Onay gelmeden hiçbir adım uygulanmaz.

## Durum

| Tema | ID | Rol |
|---|---|---|
| JantiFox 2026 Back to School – Satış Noktaları v2 | 206825619742 | **Canlı** |
| Kişiselleştirme DEV - 2026-10-07 | 206773780766 | Bizim çalışma kopyamız (eski "Back to School"dan alındı) |
| YEDEK – Satış Noktaları öncesi – 8 Ekim | 206824079646 | Yedek |

Kopya temayı olduğu gibi yayına almak, canlıya sonradan eklenen "Satış Noktaları" değişikliklerini siler. Bu yüzden ters yönde gidilir: **güncel canlı temanın yeni bir kopyası alınır, bizim dosyalarımız onun üzerine eklenir.**

## 1. Bizim tema değişikliklerimizin tam listesi

### Yeni dosyalar (7) — canlı temada bu adlarla dosya yok, olduğu gibi eklenir

| Dosya | Ne yapar |
|---|---|
| `assets/kisisel-editor.js` | Editör, ürün kartı, yerleşim/geometri, fiyat ve kampanya simülasyonu |
| `assets/kisisel-editor.css` | Editör ve kart görünümü |
| `assets/kisisel-sepet.js` | Sepet çekmecesinde tasarım grupları, önizleme, aksesuar satırları |
| `snippets/kisisel-kart.liquid` | Ürün sayfasındaki "Ürünü kişiselleştir" kartı; JS/CSS'i yükler |
| `snippets/kisisel-veri.liquid` | Editör verisi (harita, katalog, setler, aksesuarlar) JSON olarak |
| `snippets/kisisel-veri-patch.liquid` | Tek patch ürününün JSON'u (kisisel-veri içinden çağrılır) |
| `snippets/kisisel-sepet.liquid` | Sepet çekmecesi eklentisinin yükleyicisi ve stili |

Kaynak: `gokhan-ship-it/SHOP-FY`, dal `claude/new-session-f6ol92`, klasör `jantifox/`. Yükleme her zaman belirli bir commit'ten yapılır ve MD5 ile doğrulanır.

### Temanın kendi dosyalarında değişiklik (2) — üzerine yazılmaz, satır eklenir

1. **`layout/theme.liquid`** — `</body>`'den hemen önce 1 satır:
   ```liquid
   {%- render 'kisisel-sepet' -%}
   ```
   Canlı temadaki dosya bizim başladığımız dosyayla birebir aynı (MD5 `32305e3a…`, 8 Ekim kontrolü). Yine de taşıma anında yeniden karşılaştırılır.

2. **`templates/product.product-canta.json`** — `main` bölümüne 1 blok + `block_order`'da `price`'tan hemen sonra 1 giriş:
   ```json
   "kisisel_kart": {
     "type": "custom_liquid",
     "settings": { "custom_liquid": "{% render 'kisisel-kart', product: product, section: section %}" }
   }
   ```
   Canlıdaki şablonda bölümler ve 22 blok bizim başlangıç dosyamızla aynı. MD5 farkı yalnızca biçimden kaynaklanıyor. Ekleme, dosyanın taşıma anındaki güncel hali okunup üzerine programla yapılır; dosyanın tamamı değiştirilmez.

### Temaya dokunmayan, zaten mağazada olanlar (taşıma gerektirmez)

Bunlar temadan bağımsız mağaza verisidir; yeni temada otomatik olarak geçerlidir:
- metafield tanımları ve değerleri (`kisisellestirme.*`: harita, önizleme görseli, PNG ölçüleri, eş ürün, set içeriği…),
- katalog metaobject'i (`kisisellestirme_katalog` / `ana`),
- Dosyalar bölümüne yüklenen PNG/WebP'ler.

Canlı tema şu an bunları göstermediği için müşteri hiçbir şey görmüyor.

### Faz 4 notu
Aksesuar ürün sayfaları (Faz 4) hangi ürün şablonlarına kart eklenecekse onlar da bu listeye **"temanın kendi dosyalarında değişiklik"** olarak eklenecek. Faz 4 bitince bu plan güncellenir.

## 2. Taşıma adımları

0. **Hazırlık:** taşıma sırasında canlı temada düzenleme yapılmaması için ekibe haber verilir. Saat değişiklik kaydına yazılır.
1. **Yeni kopya:** Admin → Online Mağaza → Temalar → canlı tema → "…" → **Çoğalt**. Ad: `Kişiselleştirme YAYIN – <tarih>`. Bu, canlının o anki halinin birebir kopyasıdır. Canlı temaya dokunulmaz.
2. **Yeni dosyalar:** 7 dosya, onaylanan commit'ten `themeFilesUpsert` ile yalnızca yeni kopyaya yüklenir. Her birinin MD5'i repodaki dosyayla karşılaştırılır.
3. **`layout/theme.liquid`:** Kopyadaki dosya okunur.
   - MD5 başlangıç dosyamızla aynıysa (`32305e3a…`) bizim düzenlenmiş halimiz yüklenir.
   - Farklıysa canlıda biri değiştirmiş demektir: güncel içerik alınır, yalnızca `</body>` öncesine tek satır eklenir. Fark sana gösterilir, onayla yüklenir.
4. **`templates/product.product-canta.json`:** Kopyadaki güncel JSON okunur. `kisisel_kart` bloğu ve `block_order` girişi programla eklenir, başka hiçbir alan değişmez. Yüklenir ve geri okunup yalnızca bu farkın olduğu doğrulanır.
5. **Önizleme testi:** Aşağıdaki kontrol listesi yeni kopyanın önizleme linkinde, telefonda yapılır.
6. **Yayın:** Temayı yayına almayı **sen** yaparsın (Admin → Yayınla). Bizim araçlarımız yayın işlemine izin vermiyor, bu bilinçli bir güvenlik.
7. **Geri dönüş:** Bir sorun olursa önceki canlı tema ("Satış Noktaları v2") silinmeden durur, tek tıkla yeniden yayınlanır. Mağaza verisinde geri alınacak bir şey yoktur.
8. **Kayıt:** Tüm adımlar `docs/degisiklik-kaydi.md`'ye işlenir.

## 3. Taşıma sonrası kontrol listesi (yeni kopyanın önizlemesinde)

**Canlıdaki yeni özellikler korunmuş mu**
- [ ] "Satış Noktaları" sayfası/bölümü, ana sayfa, menü ve kampanya pop-up'ları canlıdaki gibi.
- [ ] Kişiselleştirme olmayan bir ürün sayfası (patch, aksesuar) canlıdakiyle aynı görünüyor.

**Çanta sayfası**
- [ ] "Ürünü kişiselleştir" kartı fiyatın altında; kırmızı "Değiştirilebilir patchler…" kutusu yerine kartın notu.
- [ ] Editör açılıyor: Yazı → İkon → Aksesuar → Özet; Hazır setler, kalem kutusu tasarımı, Vazgeç.
- [ ] Özet'te kampanya satırları ve üstü çizili toplam; buton "Tasarımımı sepete ekle · …".
- [ ] Sepete ekleme; temanın "Sadece çantayı sepete ekle" butonu ve sabit alt çubuk.

**Sepet ve ödeme**
- [ ] Çekmecede tasarım grubu, önizleme, aksesuar satırı, grup toplamı.
- [ ] Sepetteki tasarımı düzenleme ve silme.
- [ ] Ödeme sayfasında satır özellikleri (İsim, Tasarım, Harf sırası) ve kampanya indirimleri.
- [ ] Test siparişi açılmaz; ödeme adımına kadar gidilir.

**Cihazlar**
- [ ] iPhone Safari, Android Chrome, Instagram uygulama içi tarayıcı.
- [ ] Masaüstü Chrome.

**Teknik**
- [ ] Tarayıcı konsolunda hata yok.
- [ ] JS yüklenmezse (ör. engellenirse) sayfa temanın normal haliyle çalışıyor (kart gizli, Sepete ekle çalışıyor).
- [ ] Sayfa hızı canlıyla kıyaslanır. Editör JS/CSS'i yalnızca kartın olduğu çanta sayfalarında yüklenir; sepet çekmecesi eklentisi (`kisisel-sepet.js`, küçük, `defer`) her sayfada yüklenir.
