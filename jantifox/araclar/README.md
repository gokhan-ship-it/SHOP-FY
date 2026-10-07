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
