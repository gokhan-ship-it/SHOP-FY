# Alan çizici

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
      "allowed_types": ["letter", "number", "icon"], "genislik_cm": 16.9 }
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
   - JSON → `harita`.
   - Eş ürün → `es_urun`, iki yönde.
   - Aksesuar kataloğun `aksesuarlar` listesine eklenir.
6. Her yazma işlemi `docs/degisiklik-kaydi.md` dosyasına eklenir.
