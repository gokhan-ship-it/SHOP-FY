# Güven bandı + hazır set kartları (27.10.2026)

## Hangi temada
- Temalar listelendi: yayında **"Prizma kampanya - 2026-10-25"** (189440328000). Ona dokunulmadı.
- Çalışılan kopya: **"Cark hatirlatma - 2026-10-26"** (189466968384). Fox işi de bu temada
  yapıldı ve yayına alınmamış önceki işler de burada toplu. Hiçbir tema yayına alınmadı.

## Değişen / eklenen dosyalar (kopya tema)
| Dosya | Durum | Ne |
|---|---|---|
| snippets/tt-guven-bandi.liquid | yeni | Bandın kendisi: biçim, üç madde, kayan şerit betiği |
| layout/theme.liquid | değişti | `#PageContainer`'ın ilk satırına `render 'tt-guven-bandi'`, yani bütün sayfalar |
| config/settings_schema.json | değişti | Tema ayarlarına "Güven bandı" grubu eklendi |
| sections/tt-secim-kartlari.liquid | değişti | Hazır set kartları sıkıştırıldı; "Kendi setini oluştur" düğmesi şeridin altına alındı |
| assets/tt-secim-kartlari.js | değişti | Yalnızca bir açıklama satırı (düğmenin yeni yeri). Çalışan kod aynı |

- MD5'ler `veri/kopya-md5.json` dosyasında.
- `config/settings_data.json` değişmedi: ayarların varsayılan değerleri şemadan geliyor.
- Çark dosyaları değişmedi: `tt-cark-durum`, `tt-cark-hatir` ve `tt-cark-hatir.js`.
- İndirim kuralları ve reklam takip kodları da değişmedi.

## Metinleri nereden değiştireceksiniz
**Özelleştir → Tema ayarları (dişli simgesi) → "Güven bandı"**, listenin en altında.
- "Güven bandını göster": bandı açar ya da kapatır.
- 1., 2. ve 3. madde metinleri: kamyon, damla ve telefon ikonları sabit kalır.
- Boş bırakılan madde gösterilmez. Üçü de boşsa bant hiç çıkmaz.

## Önizleme linkleri (kopya tema)
- Ana sayfa: https://texttonext.com/?preview_theme_id=189466968384
- Ürün (Prizma): https://texttonext.com/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik?preview_theme_id=189466968384
- Ürün, Couple görünümü: https://texttonext.com/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple?preview_theme_id=189466968384
- Erkek koleksiyonu (hazır setler için Couple'a geçin): https://texttonext.com/collections/zaman-kapsulu-bileklik?preview_theme_id=189466968384
- Önizlemeden çıkmak için: https://texttonext.com/?preview_theme_id=

## Hazır set kartları + "Kendi setini oluştur" düğmesi
Kartlardaki boşluk iki yerden geliyordu:
- "COUPLE ZAMAN KAPSÜLÜ" iki satıra düşüyordu.
- Tek bir uzun ad ("Kral + Classic Ocean Blue") iki satıra düştüğü için bütün kartlarda ad ile fiyat
  arasında 17 px boş satır kalıyordu.

Telefonda yapılanlar:
- Üst etiket 10 px'e indirildi ve tek satıra alındı.
- Ad tek satır ve 12 px yapıldı.
- İç boşluklar daraltıldı.

Sonuç (`veri/setkart-once.json` → `veri/setkart-sonra.json`):

| Genişlik | Kart yüksekliği | Ad ile fiyat arası |
|---|---|---|
| 390 | 386 → 340 px | 17 → 0 px |
| 360 | 383 → 336 px | 17 → 0 px |
| 1440 | 625 → 611 px | 0 px |

- **Bedeli:** telefonda yalnızca "Kral + Classic Ocean Blue" adı üç noktayla kısalıyor ("Kral + Classic
  Ocean…"). Tam ad ekran okuyucuda ve fotoğrafta duruyor. Masaüstünde iki satır kuralı değişmedi.

Düğme:
- Artık seridin (ok ve noktaların) altında, ortada duruyor. Görünüşü: siyah dolgulu hap, 44 px
  yüksekliğinde, beyaz yazı, yeşil (#D6FF00) ok.
- 390, 360 ve 1440 px'de ortalama farkı 0 px.
- Basınca set oluşturucunun başlığına kayıyor ve ölçüm olayı (`tt_couple_set_atla`) gidiyor.
- Bu davranış Kadın, Erkek ve Couple Ürünler sayfalarında; çark çubuğu açıkken ve "hareketi azalt"
  açıkken de doğrulandı (`veri/atla-dugmesi.json`).
- Konsol hatası 0.

## Güven bandı kontrolleri
Betik: `betikler/bant-test.js`. Sonuçlar: `veri/bant-kontrol.json`.

**Yerleşim** (390, 360, 1280 ve 1440 px × ana sayfa, ürün, Couple ürün, Erkek, sepet ve kullanım
kılavuzu = 24 sayfa):

| Genişlik | Bant | Header ile arası | İçerik başlangıcı | Görünüm |
|---|---|---|---|---|
| 390 / 360 | 52–88 px, 36 px | 0 | 88 px (bandın altı) | kayan şerit |
| 1280 / 1440 | 56–96 px, 40 px | 0 | 96 px (bandın altı) | ortalı, sabit |

- 24 sayfanın hepsi aynı sonucu verdi ve hiçbirinde yatay taşma yok.
- İletişim, Sözleşmeler ve Couple anlatım sayfasında da bant header'ın hemen altında; içerik 88 px'de
  başlıyor (`veri/ust-390-sonra.json`).

**Tasarım** (ölçülen değerler):
- Zemin #0A0A0A, üst çizgi 1 px #262624.
- Yazı beyaz, Poppins 500, telefonda 12 px, masaüstünde 13 px.
- İkon 16 px, #D6FF00, yuvarlak uç, dolgusuz, çizgi 1,8 px. İkon ile yazı arası 6 px.
- Maddeler arası 28 px. Aralarında 3 px'lik #5C5C57 nokta.
- Gölge ve degrade yok.

**Kayan şerit** (390 px):
- Bir tam tur 35 sn, hızı yaklaşık 14 px/sn.
- Dokununca duruyor (1,5 sn boyunca 0 px hareket). Parmak kalkınca 2,5 sn sonra devam ediyor.
- Masaüstünde fare üzerine gelince duruyor.

**Hareketi azalt açıkken:**
- Kayma yok; kopyalar gizli.
- Bant elle yatay kaydırılıyor (501 px içerik, 390 px ekran).

**Ekran okuyucu:** her madde bir kez okunuyor. Okunan liste 3 madde; iki kopya `aria-hidden="true"`.

**Uzun metin (masaüstü):** metinler uzatılınca bant ortalı görünümden kayan şeride geçiyor. Yükseklik
40 px'de kalıyor.

**Çark hatırlatma çubuğu** (390 ve 1440; ana sayfa, ürün, Erkek): üst üste binme ve içeriği örtme
hiçbir adımda yok.

| Sayfa kaydırması | Bant | Çark çubuğu | İçerik başı |
|---|---|---|---|
| 0 | 52–88 | 88'de, bandın hemen altında | 140 |
| 18 px | 34–70 | 70'te, bantla birlikte kayıyor | 122 |
| 40 px ve fazlası | header'ın altında kayboldu | 52'de, header'ın altına yapıştı | — |

Masaüstünde aynı sıra 56 / 96 / 148 px.

**Hamburger menü:** menü açıkken bandın üç noktasında da en üstte menü var; bant menünün altında.

**Konsol:** testlerdeki bütün sayfa açılışlarında yeni hata 0.

## Hız (LCP / CLS)
Ölçüm iki yoldan yapıldı:
- **Önce/sonra:** `veri/hiz-once.json` ile `veri/hiz-sonra.json`.
- **A/B karşılaştırması:** aynı kopya temada, bant HTML'den çıkarılmış ve çıkarılmamış sayfa
  dönüşümlü açıldı (`betikler/hiz-ab.js`, `veri/hiz-ab.json`). Ağdaki dalgalanmayı ayıran ölçüm bu.

**LCP (ms)**

| Sayfa | Bantsız | Bantlı |
|---|---|---|
| 390 Ürün | 2540, 1816 | 1220, 1116 |
| 390 Erkek | 1444, 1168 | 1344, 1592 |
| 1440 Ürün | 1060, 1512 | 1060, 1212 |
| 1440 Erkek | 1108, 1520 | 1236, 976 |

- Bantlı sürüm yavaş değil; farklar ölçüm dalgalanması içinde.

**CLS:** bandın kendi kaydırması en fazla 0,0001. Masaüstünde, Poppins yazı tipi yüklenirken yazı
genişliği değiştiği an bir kez görüldü. Ölçülen diğer kaymalar bant yokken de aynen çıkıyor:
- Ürün sayfasında 0,0023: galeri küçük resimleri.
- Masaüstünde 0,0342 ve telefonda 0,0445: sayfa kabının üstündeki 52 px'lik alan açılışta kapanıyor.

## Not: masaüstü ürün sayfasında ara sıra büyük kayma (bantla ilgisi yok)
- 1440 px ürün sayfasında 6 açılıştan 2'sinde CLS 0,90–0,94 ölçüldü. Bunlardan biri bant yokken
  ölçüldü.
- Kaynak: ürün sayfasındaki çark kartı (`tt-cark-urun`) ve footer. Açılışta ürün içeriği geç
  çiziliyor; o arada çark kartı ve footer ekranın üstünde görünüyor.
- Bu kart bu kopya temada önceki işte (çark → ürün sayfası) eklendi, canlıda yok. Tema yayına alınırsa
  bu durum da yayına çıkar.
- Bu iş kapsamında dokunulmadı. İsterseniz ayrıca bakabilirim.

## Yayındaki tema
- Yayındaki temanın 710 dosyası iş başındaki listeyle karşılaştırıldı: fark 0.
- Temanın son güncellenme zamanı hâlâ 25.10.2026 12:45 (`veri/canli-md5-bas.json`,
  `veri/canli-md5-son.json`).
- Hiçbir tema yayına alınmadı.

## Yayına alırken
- Bu kopya temada yayına alınmamış önceki işlerin hepsi de var: çark hatırlatma, set oluşturucu, Fox
  vitrini ve bu iş. Tema yayına alınınca hepsi birlikte yayına çıkar.
- Fox ürünleri hâlâ TASLAK; onları ayrıca sizin aktif etmeniz gerekiyor.
- Bandı geri almak için: Tema ayarları → Güven bandı → "Güven bandını göster" kutusunu kapatın.
  Kod yerinde kalır, bant görünmez.
