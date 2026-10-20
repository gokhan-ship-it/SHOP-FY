# Alan paneli (toplu)

`alan-paneli/panel.html`: kişiselleştirilecek tüm ürünlerin alanlarını tek yerde çizmek için. İnternet gerekmez. **Klasörü olduğu gibi** kopyala (`panel.html`, `veri.js`, `gorseller/`) ve `panel.html`'i Chrome, Edge ya da Safari'de çift tıklayıp aç.

## Kullanım

1. **Sol** liste: gruplar ve renkleri, her ürünün durumu (**Çizilecek**, **Hazır**, **Görsel yok**, **Atlandı**) ve işaretleri (**ölçü tahmini**, **ölçü bekleniyor**, **kontrol et**).
   - Üstte ilerleme ("12 / 21 hazır"; atlananlar sayılmaz).
   - "Yalnızca çizilecekler" filtresi.
2. **Orta** alan: ürünün editör görseli. Araçlar:
   - Daire `C`, Oval `O`, Dikdörtgen `R` (köşe yarıçapı sağ panelden), Yasaklı ▭ `Y` / ◯, Ölçek çizgisi `L`, Seç `V`.
   - Tutamaçlardan boyutlandır, gövdeden taşı. Ok tuşları 1 px, Shift+ok 10 px, `Delete` siler.
   - Yakınlık `+` `−` `0`, Ctrl/Cmd + tekerlek.
   - Sarı **A** karesi gerçek ölçüde bir harf patch'idir (5,5 × 6 cm, değiştirilebilir); alan dışına taşarsa kırmızı olur.
   - **Kalem** `P` (serbest çokgen): alanın kenarı boyunca tıklayarak nokta koy. İlk noktaya tıklayınca ya da `Enter` ile şekil kapanır; `Esc` iptal eder, `Backspace` son noktayı siler.
     - Araç çubuğundaki seçimle **Velcro alanı** ya da **Yasaklı bölge** çizilir.
     - Kapandıktan sonra noktaları sürükle. Kenara tıklayınca araya yeni nokta eklenir. Noktayı seçip `Delete` ile sil (en az 3 nokta kalır).
     - Sağ panelde **Kenarları yumuşat**: köşeler kavisli olur; kaydırıcı kavis miktarını ayarlar. Kemerli alanlarda az noktayla düzgün kavis verir.
   - **Sihirli değnek** `W`: görselde tıkladığın noktadan benzer renkli bitişik bölgeyi seçip kenarını 20–60 noktalı bir çokgene çevirir.
     - **Hassasiyet** (varsayılan 15): seçim taşıyorsa düşür, eksik kalıyorsa artır. Seçili şekil anında güncellenir.
     - Kumaş dokusundan ve gölgeden kalan küçük delikler doldurulur, ince çıkıntılar atılır.
     - **Kenarı içeri çek** (varsayılan 0,3 cm): biye ve dikiş alana girmez. Ölçek henüz yoksa yaklaşık uygulanır; ölçüyü girince değneği yeniden çalıştır.
     - Seçimden sonra şekil kalemle çizilmiş gibi noktalarla düzenlenir. Elle düzenlenince hassasiyet kaydırıcısı o şekli artık değiştirmez.
     - Aynı renkteki komşu parçalar (ör. The Performer'da ön cep ile yan cepler) birlikte seçilebilir. Hassasiyeti düşür ya da noktaları düzelt.
   - Çokgen ve diğer şekiller birlikte kullanılabilir. Bir patch tek bir alanın içinde kalmak zorundadır; bu yüzden şekilleri üst üste koyarak alan genişletme, alanın tamamını tek çokgenle çiz.
3. **Sağ** panel:
   - **Gerçek Velcro ölçüsü**: alanı seçip gir. Daire için çap; oval ve dikdörtgen için genişlik ya da yükseklik. Ölçek buradan hesaplanır.
   - Velcro ölçüsü bilinmiyorsa **ölçek çizgisi**: bilinen bir uzunluğu çiz (ör. çanta genişliği), cm'sini gir. Bu bir tahmindir; ürün "ölçü tahmini" diye işaretlenir. Bir alana gerçek ölçü girilince ölçek oradan alınır, işaret kalkar.
   - **Metin karakter sınırı** (boş: yalnızca alanın sığdırdığı kadar), **izin verilen tipler** (harf, rakam, ikon, set, aksesuar), **Bu üründe kişiselleştirme olmasın**.
   - **Önceki üründen kopyala**, **Grubun tüm renklerine uygula**. Görsel oranları farklıysa şekiller genişlik oranıyla taşınır, ürün "kontrol et" diye işaretlenir.
   - **Durum** kutusu sorunları listeler. Kırmızı sorun varken ürün Hazır olamaz.
4. Kısayollar: `]` / `[` ya da `Alt`+`→` / `←` sonraki / önceki ürün, `Ctrl`/`Cmd`+`S` kaydet (Hazır).
5. Çalışma tarayıcıya **otomatik kaydedilir**; panel yeniden açılınca kaldığın üründen devam eder. **Sıfırla** başlangıca döner.
6. **Dışa aktar**: tek JSON dosyası (`alan-paneli-YYYYMMDD-HHMM.json`). İçinde:
   - hazır ürünlerin haritası (`kisisellestirme.harita` biçiminde), ölçeği, karakter sınırı ve izinleri;
   - atlanan ürünler;
   - panelin tüm durumu (başka bilgisayarda **İçe aktar** ile devam edilir).

## Mağazaya yazma (dışa aktarılan dosya geldikten sonra)

1. Mağazadaki mevcut değerler okunur: ilgili ürünlerin `kisisellestirme` alanları → `magaza.json` (`{handle: {anahtar: değer}}`);
   kategori aday listesi ve ürünlerin `aktif` durumu `araclar/alan-paneli/liste-sorgu.graphql` ile → `liste.json`
   (biçim: `veri/urunler/liste/magaza-durum-20261013.json`).
2. Denetim, hiçbir şey yazmaz:

   ```
   python3 -I araclar/alan-paneli/dogrula.py alan-paneli-....json --magaza magaza.json --liste liste.json
   ```

   Kontrol edilenler:
   - Ürün plan'da var mı, görsel dosyası var mı, boyutu haritayla aynı mı.
   - Alanlar ve yasaklı bölgeler görselin içinde mi.
   - İlk alanda ölçü var mı; ölçek akla yatkın mı (görselin cm genişliği ürün ölçüsüyle uyumlu mu); örnek harf her alana sığıyor mu.
   - Patch tipi ve izinler eksik mi; ölçü tahmini mi.
   - Mevcut değerlerle çakışma var mı (dolu bir alanın üzerine yazılacaksa ayrıca belirtilir).
   - `plan.json`'da "patch alanı yok" olan ürün panelde Hazır gelirse hata (ör. Kalem Kutusu Sarı'lar).
   - **Kategori aday listesi** (`shop.metafields.kisisellestirme.acik_urunler`): açılan ürün eklenir, kapatılan çıkarılır;
     yeni değer planın `acik_urunler` bölümünde. `--liste` verilmezse "LİSTE ADIMI EKSİK" yazar; yazmadan önce `--liste`
     ile yeniden çalıştırılır. Kategori sayfaları ürünleri yalnızca bu listeden okur.

   Sorunsuzsa `-plan.json` yazma planını çıkarır.
3. Sorun listesi kullanıcıya gösterilir. Onaydan sonra hepsi tek seferde yazılır:
   - Yeni görseller: `fileCreate` (kaynak: depodaki PNG'nin commit'e sabit ham GitHub adresi) → MediaImage → `kisisellestirme.onizleme_gorseli`. Ürün medyasına eklenmez.
   - `metafieldsSet` (25'erli): `harita`, `metin_karakter_siniri`, `aktif`.
   - Atlanan ürünlere `aktif = false`.
   - Aynı `metafieldsSet` içinde planın `acik_urunler.metafield` değeri (mağaza sahibi `gid://shopify/Shop/...`).
   - Açılan ürünler **"Kendin Tasarla"** koleksiyonuna (`kendin-tasarla`, elle sıralı) da eklenir: `collectionAddProductsV2`,
     sonra kendi grubunun sonuna taşınır (Admin > Koleksiyonlar > Kendin Tasarla ya da `collectionReorderProducts`).
     Grup sırası: çantalar, kıyafetler, şapkalar, kalem kutuları, patch setleri, tek patch'ler (harf, rakam, ikon).
     Ana sayfadaki "Tüm kişiselleştirilebilir ürünler →" butonu bu koleksiyona gider; site menüsünde yoktur.
     dogrula.py yazma planında açılan ürün varsa bunu hatırlatır. Kataloğa yeni patch ya da hazır set eklenince de
     aynı koleksiyonun "patch setleri" / "tek patch'ler" grubuna eklenir.
4. Yazdıktan sonra kontrol: `liste-sorgu.graphql` yeniden okunur ve

   ```
   python3 -I araclar/alan-paneli/liste-kontrol.py liste.json
   ```

   kişiselleştirmesi açık ürünlerle listeyi karşılaştırır (kartın koşuluyla aynı: `patch-notice` etiketi + `aktif = true` +
   harita). Fark varsa eksik / fazla ürünleri ve önerilen listeyi yazar, çıkış kodu 1. Panelden bağımsız olarak, bir ürünün
   `aktif` değeri elle değiştirildiğinde de çalıştırılır.
   Girdide `kendin_tasarla` (koleksiyondaki ürünler) ve `katalog_patchler` (katalogdaki harf / rakam / ikon ürünleri ve hazır
   setler) varsa — ikisi de `liste-sorgu.graphql`'den gelir — kişiselleştirmesi açık her ürünün ve satıştaki her katalog
   patch'inin "Kendin Tasarla" koleksiyonunda olduğunu da denetler; eksikleri gireceği grupla yazar (çıkış kodu 1).
   Örnek girdi: `veri/urunler/liste/magaza-durum-20261014.json`.
   - Her yazma `docs/degisiklik-kaydi.md` dosyasına eklenir.

Çokgen alan ve yasaklı bölge haritada şöyle yazılır:
- `"shape": "poly"`;
- `points`: noktalar, görselin genişliği / yüksekliğine göre %. Yumuşatılmışsa eğri noktalarıyla, sadeleştirilmiş.
- `x / y / w / h`: noktaların kutusu. Ölçek için kutunun genişliği kullanılır (`genislik_cm`).
- `duzen`: paneldeki kontrol noktaları ve yumuşatma miktarı. Yalnızca yeniden düzenlemek için; editör okumaz.

Editör patch'in dışbükey zarfının çokgenin tamamen içinde olmasını ister: alanın kenarı patch'i kesemez, içbükey alanın girintisi patch'in altında kalamaz. Alan taşma toleransı (0,2 cm) çokgende de geçerlidir.

Haritaya panelin eklediği alanlar:
- `izinler: {set, aksesuar}` (ürün düzeyinde set ve aksesuar izni);
- `olcu_tahmini: true` (ölçek tahmindeyse);
- `yukseklik_cm` (ölçek yükseklikten alındıysa, kayıt için);
- `tek_patch: true` (grubu `plan.json`'da `tek_patch` olan ürünler, ör. Çok Amaçlı Mini Çanta).

Editör ölçeği ilk alanın `cap_cm` / `genislik_cm` değerinden okur. Panel, yükseklikten ya da çizgiden gelen ölçeği bu değere çevirip yazar.

### Tek patch'lik ürünler (`tek_patch`)

Küçük Velcro'lu ürünler (ör. 5 cm daireli Çok Amaçlı Mini Çanta) için kural: bir harf, bir rakam ya da bir ikon; boyut
sınırı yok, en küçükten en büyüğe her patch Velcro'nun ortasına takılır; hazır set ve aksesuar yok.
- `plan.json`'da grup `"tek_patch": true`. Panel bu gruptaki ürünlere set ve aksesuar iznini kapalı açar, harf sığma
  denetimini atlar ve haritaya `tek_patch: true` yazar. Alan Velcro'nun kendisi çizilir (gerçek çapıyla).
- Editör: metin en fazla 1 karakter; yeni patch (harf, rakam ya da ikon) öncekinin yerine geçer ve bildirim çıkar; sığma
  denetimi Velcro'yla aynı merkezli 16 cm'lik dairede yapılır (önizlemede çizgi Velcro'nun kendisi); patch sürüklenmez,
  döndürülebilir; Aksesuar adımı ve hazır setler görünmez. Ürün kartının metinleri tek patch'e göre.
- `patch-notice` etiketi gerekmez ve verilmez (etiket ürün sayfasına "Değiştirilebilir patchler ayrı olarak satılmaktadır"
  yazısını da koyar). Kart, kategori etiketi ve Çok satanlar koşulu `snippets/kisisel-acik-mi.liquid`: (etiket ya da
  `tek_patch`) + `aktif = true` + harita. liste-kontrol.py de aynı koşulu kullanır; etiketsiz ürünler sorguya aday
  listesinden (`acikListe`) gelir.

## Yeni ürün ekleme (hazırlık)

1. Ürüne Shopify'da `patch-notice` etiketi verilir (tek patch'lik ürünlerde verilmez, yukarıya bak).
2. `veri/urunler/urunler.json`'a ürünün vitrin verisi (`/products/<handle>.js`) eklenir.
3. `veri/urunler/secim.json`'a önden, patch'siz görselin sırası yazılır. Gerekirse temizleme ayarı da eklenir:
   - `bosluk_doldur`: açık renkli gövde parçaları arka plan sanılıyorsa;
   - `delik_temizle`: sap içindeki arka plan kalıyorsa.
4. Görsel hazırlanır: şeffaf PNG, en uzun kenar 1600 px.

   ```
   U2NET_HOME=<model klasörü> <venv>/bin/python -I veri/urunler/hazirla.py veri/urunler/urunler.json veri/urunler/secim.json veri/urunler/png
   ```

   PNG'ye göz atılır. Velcro üstünde patch takılıysa önce patch'siz fotoğraf istenir; olmazsa rötuş yapılır (örnek: `veri/urunler/rotus/`).
5. `veri/urunler/plan.json`'da ürün grubuna eklenir: `handle`, `urun_id`, `baslik`, `png`, `png_boyut`, `durum: "cizilecek"`. Yeni modelse grup da eklenir:
   - `velcro`: sitedeki Velcro ölçüsü;
   - `urun_olcu`: ürünün ölçüsü (ölçek denetimi için).
6. İsteğe bağlı ön dolgu: `veri/urunler/on-dolgu.json`. İçine önceden çizilmiş şekiller (px) ya da ölçek çizgisi yazılır.
7. Panel verisi yeniden üretilir:

   ```
   python3 -I araclar/alan-paneli/panel-verisi.py veri/urunler araclar/alan-paneli
   ```

   `veri.js` ve `gorseller/` güncellenir. Tarayıcıdaki çalışma korunur; yeni ürün listede "Çizilecek" olarak çıkar.

   `gorseller/<handle>.js`: aynı görselin `data:` adresli kopyası. Sihirli değnek pikselleri buradan okur, çünkü dosyadan açılan sayfada tarayıcı görselin piksellerini okutmaz. Yalnızca değnek kullanılınca yüklenir.

# Alan çizici (tek ürün)

`alan-cizici.html`: tek dosya, internet bağlantısı gerektirmez. Bilgisayarda çift tıklayıp tarayıcıda aç.

1. **Görsel yükle**: ürünün `kisisellestirme.onizleme_gorseli` alanındaki PNG'nin aynısı. Koordinatlar bu görsele göre yüzde olarak hesaplanır.
2. **Daire / Oval / Dikdörtgen** seç, görselin üzerinde sürükleyerek takılabilir alanı çiz.
   - Köşe ve kenar tutamaçlarından boyutlandır, gövdeden tutup taşı.
   - İnce ayar: ok tuşları 1 px, Shift+ok 10 px ya da sağ paneldeki px kutuları.
   - Yakınlaştırma: + / − / Sığdır ya da Ctrl/Cmd + tekerlek.
3. Sağ panelde alanın **gerçek ölçüsünü** gir: daire için çap, oval ve dikdörtgen için genişlik (cm). Ölçek (cm/px) buradan hesaplanır; çanta genişliği gerekmez.
4. Alan için **izin verilen patch tiplerini** seç: harf, rakam, ikon.
5. Gerekirse **Yasaklı** bölge çiz: fermuar, dikiş vb.
6. **Sarı "A" karesi** gerçek ölçüde bir harf patch'idir (varsayılan 5,5 × 6 cm). Alanın içinde gezdirip ölçeği gözle kontrol et; alan dışına taşarsa kırmızıya döner.
7. **JSON'u kopyala** → Shopify Admin → Ürün → Meta alanları → **Kişiselleştirme: Alan haritası** alanına yapıştır, kaydet.

Var olan bir haritayı düzenlemek için görseli yükle, **JSON içe al** ile mevcut değeri yapıştır.

Çıktı biçimi (editörün okuduğu):

```json
{
  "surum": 2,
  "kalibre": true,
  "gorsel": { "en": 1920, "boy": 1920 },
  "zones": [
    {
      "id": "on-alan",
      "ad": "Ön alan",
      "shape": "circle",
      "x": 27.083,
      "y": 44.792,
      "w": 43.75,
      "h": 43.75,
      "cap_cm": 25,
      "allowed_types": ["letter", "number", "icon"]
    }
  ],
  "forbidden": []
}
```

- `x`, `y`, `w`, `h`: şeklin dış kutusu, görselin genişliği ve yüksekliğine göre %.
- Ölçek, gerçek ölçüsü girilmiş ilk alandan alınır. Araç o alanı listenin başına koyar.
- `gorsel`: haritanın çizildiği görselin boyutu. Editör farklı oranlı bir görselle karşılaşırsa "kalibre edilmedi" uyarısı gösterir.

## Aksesuar modu

Yapıştırılabilir aksesuarlar (kalem kutusu, zarf kalemlik, mini yuvarlak çanta) için harita da bu araçla çizilir. Sağ panelin en üstünde **Ne çiziyorsun? → Aksesuar** seçilir.

1. **Görsel yükle**: aksesuarın işlenmiş şeffaf PNG'si (`veri/aksesuar/png/kisisel-aksesuar-<anahtar>.png`). Bu, ürünün `kisisellestirme.onizleme_gorseli` alanına yüklenen dosyanın aynısıdır.
2. **Dış ölçü ▭ / Dış ölçü ◯** (kısayol `D`): aksesuarın çantaya takıldığında kapladığı alanı çiz.
   - Kalem kutusu ve zarfta ön yüzün dikdörtgeni, yuvarlak çantada gövde dairesi. Kanca, fermuar ipi ve yan yüz dışarıda kalır.
   - Panelde **sitedeki ölçüyü** gir: genişlik × yükseklik ya da çap (cm). Ölçek buradan hesaplanır.
   - Çizilen kutunun oranı sitedeki ölçüden %5'ten fazla saparsa araç uyarır. Bu genellikle görselin açılı çekildiği anlamına gelir.
3. **Daire / Oval / Dikdörtgen**: aksesuarın **kendi Velcro yüzeyini** çiz; patch'ler buraya takılır. İzin verilen patch tiplerini seç.
   - Yüzeyin köşeleri yuvarlaksa Dikdörtgen'i seçip sağ panelde **Köşe yarıçapı (cm)** gir; çizim yuvarlak köşeli olur, JSON'a `kose_cm` yazılır. Editör patch'lerin köşe yuvarlaklığının dışına taşmasına izin vermez. Köşeleri doldurmak için üst üste şekil çizme: bir patch tek bir alanın içinde kalmak zorundadır.
   - Aksesuarın önünde Velcro yüzey yoksa bu adım atlanır. Aksesuar tasarlanamaz, çantaya düz yerleştirilir.
4. **JSON'u kopyala** → ürünün **Kişiselleştirme: Alan haritası** (`kisisellestirme.harita`) alanına yapıştır.

Çıktı biçimi: çanta haritasıyla aynıdır, ek olarak `tip` ve `dis` alanları gelir. Editör ölçeği ilk alanın cm değerinden okur; araç bu değeri dış ölçüden hesaplayıp yazar.

```json
{
  "surum": 2,
  "tip": "aksesuar",
  "kalibre": true,
  "gorsel": { "en": 1000, "boy": 498 },
  "dis": { "shape": "rect", "x": 2.1, "y": 18.4, "w": 78.3, "h": 71.2, "en_cm": 22, "boy_cm": 12 },
  "zones": [
    { "id": "velcro-yuzeyi", "ad": "Velcro yüzeyi", "shape": "rect", "x": 10, "y": 25, "w": 60, "h": 55,
      "kose_cm": 2, "allowed_types": ["letter", "number", "icon"], "genislik_cm": 16.9 }
  ],
  "forbidden": []
}
```

## Yeni aksesuar ekleme (tüm süreç)

Yeni bir yapıştırılabilir aksesuar geldiğinde aynı adımlar izlenir. Kod değişikliği gerekmez.

1. **Shopify'da ürün**
   - Yapıştırılabilir modelin etiketlerinde `stick-on` olmalı.
   - Velcro'suz eşi varsa ayrı ürün olarak durur: aynı ad, başında "Yapıştırılabilir" olmadan, aynı fiyat.
2. **Görsel işleme**
   - Ürünün ana görselini `veri/aksesuar/ham/` klasörüne indir (`?width=2048` yeterli).
   - `veri/aksesuar/liste.json` dosyasına bir satır ekle: anahtar, model, ürün ve eş kimliği, sitedeki ölçü, önünde Velcro yüzey var mı.
   - Çalıştır: `U2NET_HOME=<model klasörü> <venv>/bin/python -I veri/aksesuar/isle-aksesuar.py veri/aksesuar/liste.json veri/aksesuar/ham veri/aksesuar/png`
     - Arka planı temizler, köşedeki bilgi rozetlerini atar, en dış kenardan kırpar, şeffaf PNG yazar.
     - Dış ölçü önerisini `png/rapor.json`'a koyar.
   - `python3 -I veri/faz1-kontrol.py` ile kontrol sayfasını üretip PNG'ye göz at.
3. **Ölçü kuralı**: sitedeki ölçü esastır. Görsel oranı yalnızca eksik ölçüyü tamamlar ve yönü (yatay/dikey) belirler.
4. **Alan çizici**: yukarıdaki "Aksesuar modu" adımları; dış ölçü + Velcro yüzeyi → JSON.
5. **Shopify alanları** (hepsi `kisisellestirme` namespace'inde):
   - PNG Dosyalar bölümüne yüklenir, ürünün `onizleme_gorseli` alanına bağlanır. Ürün medyasına eklenmez.
   - Aynı PNG'nin PNG kaynaklı kopyası `onizleme_gorseli_png` alanına bağlanır (aşağıdaki "PNG kaynaklı kopya" adımı).
   - JSON → `harita`.
   - Eş ürün → `es_urun`, iki yönde.
   - Aksesuar kataloğun `aksesuarlar` listesine eklenir.
6. Her yazma işlemi `docs/degisiklik-kaydi.md` dosyasına eklenir.

## PNG kaynaklı kopya (her yeni patch ve aksesuar için zorunlu adım)

Neden: Shopify CDN, kaynağı şeffaf **WebP** olan görseli iPhone Safari'ye her zaman büyük **PNG** olarak gönderir
(`format` parametresi yok sayılır). Kaynağı **PNG** olan görsel ise herkese küçük AVIF/WebP olarak gider.
Editörde 6 harf + 2 ikonlu tasarımda bu fark iPhone'da indirilen görsel boyutunu birkaç MB değiştirir.
Bu yüzden her patch ve aksesuar görselinin bir PNG kaynaklı kopyası ayrı alana bağlanır. Eski alanlar ve ürün/varyant
görselleri olduğu gibi kalır; tema yeni alanı tercih eder, yoksa eskisine düşer.

| Görsel | Yeni alan (yalnızca boşsa yazılır) | Eski alan (dokunulmaz) |
|---|---|---|
| Harf / rakam (varyant) | varyant `kisisellestirme.onizleme_png_kaynakli` | varyant `kisisellestirme.onizleme_png` |
| İkon / set patch'i (ürün) | ürün `kisisellestirme.onizleme_png_kaynakli` | ürün `kisisellestirme.onizleme_png` |
| Aksesuar (ürün) | ürün `kisisellestirme.onizleme_gorseli_png` | ürün `kisisellestirme.onizleme_gorseli` |

Adımlar:

1. Patch'in mevcut şeffaf görselini (`onizleme_png`, genelde `kisisel-*.webp`) ya da aksesuarın işlenmiş PNG'sini
   kendi boş klasörüne indir.
2. PNG'ye çevir:
   ```
   python3 -I araclar/png-kopya/png-kopya.py <dosyalar> --cikti veri/png/kaynak-png/patch --en-uzun 600
   python3 -I araclar/png-kopya/png-kopya.py <dosyalar> --cikti veri/png/kaynak-png/aksesuar
   ```
   - RGBA PNG yazar, şeffaflık korunur; dosya adı aynı kalır, uzantı `.png` olur.
   - Patch'lerde en uzun kenar 600 px (editör en fazla 300 px'lik sürümü ister, 2x ekran için yeter).
     Aksesuarlarda boyut değişmez (editör 600 ve 1000 px ister).
3. Commit edip push et. `fileCreate` ile Dosyalar bölümüne yükle; kaynak, commit'e sabit ham GitHub adresi
   (`https://raw.githubusercontent.com/<repo>/<commit>/jantifox/veri/png/kaynak-png/...`). `fileStatus: READY` olana kadar bekle.
4. Dosya adı → MediaImage kimliği eşlemesini `veri/png/kaynak-png/dosya-idleri.json`'a, sahibini
   (ürün/varyant kimliği, grup) `veri/png/kaynak-png/patch-kayit.json`'a ekle.
5. Alan boşsa `metafieldsSet` ile yukarıdaki tablodaki yeni alana bağla. Doluysa üzerine yazma, önce sor.
   Ürün medyasına eklenmez.
6. Kontrol: iPhone kullanıcı ajanıyla editörü aç, patch görselinin `image/avif` ya da `image/webp` geldiğini gör
   (`node test/performans/editor-gorsel-boyut.mjs <tema_id> <ürün handle>`).
7. Yazma işlemlerini `docs/degisiklik-kaydi.md` dosyasına ekle.
