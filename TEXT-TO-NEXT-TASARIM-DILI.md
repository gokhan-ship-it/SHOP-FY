# Text To Next – Tasarım Dili

Sürüm: Ekim 2026. Kaynak: Text To Next tasarım sistemi (claude.ai Design System artifact'i, `tokens.json` + `README.md`), onaylanmış ekran çizimleri ("Nasıl çalışır" kartı ve pencereleri, mobil menü), Claude Code'a verilen ve uygulanan talimatlar ve Claude Code'un uygulama raporları.

**Okuma notu.** Bu dosyadaki değerlerin bir kısmı temaya uygulanmış kodda var, ama tema kodunun kendisi bu sohbette görülmedi; değerler tasarım sistemi dosyalarından, Claude Code'a verilen birebir talimatlardan ve Claude Code'un "uygulandı ve doğrulandı" raporlarından alındı. Temada farklı bir değer görürsen temadaki değeri kaynak kabul etme; bu dosyayla çelişiyorsa bildir. "Belirlenmedi" yazan her şey konuşulmadı; kendi kararınla doldurma, sor.

---

## 1. Genel ilke

- **His:** Kalın ve sade. Siyah-beyaz zemin, tek bir neon yeşil vurgu, kalın Poppins başlıklar, ince çizgili ikonlar, bol boşluk. Bir bölüm tek bir şey söyler; metin az, başlık büyük.
- **Kaynak dil:** Ürün galerisi kareleri (açık gri zemin, siyah başlık, gri ikinci satır, neon küçük vurgular) ve bunlardan türetilen "Nasıl çalışır?" kartı, alttan açılan anlatım pencereleri ve yeni mobil menü.
- **Referanslar:** Galeri yapısı için Ridge tarzı ürün galerisi; header, menü ve tipografi ritmi için Apple'ın sade düzeni (ama Apple'ın renkleri ve mavisi değil). Renk kararı markanın kendi kurumsal renkleri: siyah #0A0A0A, neon yeşil #D6FF00, açık gri #F4F4F4 (15 Ekim 2026 kararı).
- **İlkeler:**
  1. Kalın ve sade: başlıklar Poppins 700, metin az.
  2. Zemin ya açık (#F4F4F4 / #FFFFFF) ya koyu (#0A0A0A / #000000). Renk olarak sadece neon yeşil var ve küçük kullanılır.
  3. Neon bir ekranda en fazla 1-2 noktada görünür.
  4. Yerleşim korunur, dil değişir: mevcut düzenler ve görseller korunur; renk, yazı, buton ve kart stili değişir. Yeni blok eklemek ayrı bir karardır.
  5. Çalışan hiçbir şey bozulmaz: sepet, %50 indirim, set oluşturma, çark, Single/Couple modu, pikseller, takip kodları.

---

## 2. Renkler

### Palet

| Token | HEX | Kullanım |
|---|---|---|
| `ink` | `#0A0A0A` | Ana metin (açık zeminde), birincil buton zemini, koyu kartlar ("Nasıl çalışır?" kartı), numara daireleri, açık zemindeki ikonlar, fiyat, seçili filtre çipi, odak halkası (açık zeminde). Saf siyah yerine her yerde bu. |
| `lime` | `#D6FF00` | TEK vurgu rengi. Sadece küçük öğeler: rozetler ("İkincisi yarı fiyatına", "%50", "2'li set"), vurgulu adım dairesi, ok dairesi, adım numaraları (01, 02…) koyu zeminde, sayaç rakamları, sepet sayı rozeti, çark "Çevir" butonu, indirim etiketi zemini, "Nasıl çalışır?" yüzen butonunun 2px çerçevesi, koyu zemindeki çerçeve/kenarlık vurguları. Üzerine her zaman `ink` yazılır. |
| `surface` | `#F4F4F4` | Açık bölüm zemini, alttan açılan pencerelerin zemini, bilgi kareleri (galeri), güven kutusu, SSS kartları bölümü, yorum kartları zemini. |
| `white` | `#FFFFFF` | `surface` üstündeki kartlar, ürün görseli zemini, koyu zeminde birincil metin ve ikonlar, ikincil buton zemini, kapat butonu dairesi, koyu zemindeki birincil buton zemini. |
| `black` | `#000000` | Tam ekran mobil menü zemini, koyu tam bölümler (adım bölümleri, istatistik, avantaj kartları, UGC, karşılaştırma koyu versiyonu, newsletter). |
| `dark-raised` | `#141414` | Koyu zemin (`black`) üstündeki kartlar: menüdeki Single/Couple kartları, avantaj kartları, UGC video kartları, slayt kartları, newsletter giriş alanı. |
| `muted` | `#5C5C57` | Açık zeminde ikincil metin: açıklamalar, adım açıklamaları, kutu açıklamaları, ürün sayısı, üstü çizili eski fiyat, açık zemindeki küçük etiketler. 24px altı iki satırlı başlıkların ikinci kısmı (telefonda). |
| `muted-strong` | `#8A8A85` | İki satırlı başlığın gri ikinci satırı (24px ve üstü), koyu zemindeki küçük üst etiketler (ör. "NASIL ÇALIŞIR?", "ÜRÜNLER", "KARŞILAŞTIRMA"). Açık zeminde 24px altı metinde KULLANILMAZ (kontrast yetmez). Tükenen varyant metni. |
| `muted-dark` | `#A3A39E` | Koyu zeminde ikincil metin: açıklamalar, sayaç birimleri, SSS cevapları (koyu kartta), destek satırı. |
| `line` | `#D2D2CD` | Açık zeminde ince çizgiler: adım bağlantı çizgisi, ayraçlar, seçili olmayan çip/kart kenarlığı, ikincil buton kenarlığı, ilerleme çubuğunun boş kısmı, pasif galeri noktası. |
| `line-dark` | `#262624` | Koyu zeminde ince çizgiler ve kart kenarlıkları, pasif nokta göstergeleri (koyu zeminde). |

### Onaylı çizimlerden gelen renk istisnaları (17 Ekim 2026)

Aşağıdaki üç renk paletin dışında ama onaylanmış çizimlerden geliyor; yalnızca yazılı oldukları bileşende kullanılır, başka yerde palet geçerlidir. Eşleştirme tablosundaki `#BDBDB8` → `#A3A39E` satırı bu bileşen için uygulanmaz.

| HEX | Yalnızca şurada |
|---|---|
| `#F2F2EF` | "Nasıl çalışır?" kartının adım satırı metni |
| `#BDBDB8` | "Nasıl çalışır?" kartının alt satırı ("4 adımda gör") |
| `#CFCFCB` | Alttan açılan pencerenin tutamacı (40×5px) |

### Rol bazında özet

- **Arka plan:** açık `#FFFFFF` / `#F4F4F4`; koyu `#000000`; koyu üstü kart `#141414`.
- **Metin:** açık zeminde `#0A0A0A` (birincil), `#5C5C57` (ikincil); koyu zeminde `#FFFFFF` (birincil), `#A3A39E` (ikincil); gri ikinci satır `#8A8A85`.
- **Vurgu:** sadece `#D6FF00`, küçük öğelerde.
- **Çizgi:** açık zeminde `#D2D2CD`, koyu zeminde `#262624`.
- **Buton:** birincil `#0A0A0A` zemin + `#FFFFFF` yazı; koyu zeminde `#FFFFFF` zemin + `#0A0A0A` yazı.
- **Hover:** belirlenmedi (hover renkleri konuşulmadı).
- **Karartma (overlay):** `rgba(0,0,0,0.5)` (alttan açılan pencere ve masaüstü menü arkası).
- **Üst bar (tt-baslik) zemini:** `#0A0A0A` %80 opak (bulanıklık efekti varsa korunur).

### Durum renkleri (değiştirilmedi)

Hata, uyarı, başarı renkleri (temanın `color_error_*`, `color_info_*`, `color_success_*`, `checkout_error_color` ayarları) olduğu gibi kaldı. Fiyat indirimi, stok uyarısı, form hatası gibi durum bildiren kırmızılar korunabilir. Hızlı Bakış'taki yeşil "Stokta var" uyarısı nötrleştirildi (`#F4F4F4` zemin + ink).

### Kontrast kuralları

- Tüm metinler 4.5:1 (24px ve üstü 3:1) geçmeli.
- `#D6FF00` açık zeminde ASLA yazı rengi değildir.
- `#8A8A85` açık zeminde sadece 24px ve üstünde.

### Kullanılmayacak renkler (emekliye ayrıldı)

- Apple mavisi ve tüm maviler: `#0071E3`, `#0A6CFF`, `#0B61CD` (linkler, "Ürünü Öğren", "Tümü" çipi, Single/Couple seç butonları, ilerleme çubukları).
- Yeşiller: adaçayı, nane, orman tonları; `#3E5E4A`, `#30614B`, `#2E5E46` ("Sepete ekle" çubuğu), `#1F4648`, `#599176`, `#8FCBB0`, `#9FC4B0`, `#9FD4BD`, `#78F5AB`, `#5CC98F`, `#4FB883`, `#1A7F37`, `#EDF7F0`, `#D3DDD2`, `#EEF6F1`, `#F0F7F3`.
- Kırmızı/bordo vurgular: `#C60303`, `#B21E3A`, `#FF453A`, `#9E2B2B`, `#E0364A` (durum bildirenler hariç).
- Renkli ikonlar: mor `#BF5AF2`, turuncu `#FF9F0A`, yeşil `#2CD784`, sarı-yeşil `#D3FB04`; yıldızlarda sarı/turuncu `#F5A623`, `#F59E0B`, `#E0A95A`; mavi tik `#1D9BF0`.
- Apple grileri: `#1D1D1F`, `#F5F5F7`, `#6E6E73`, `#86868B`, `#D2D2D7` vb. (tablo karşılıklarına çevrildi).
- Satış etiketi kırmızısı `#E11D48` (indirim etiketi artık `#D6FF00` + ink, indirimli fiyat ink).
- Degrade metin ve renkli degrade zeminler (görsel üstündeki siyah karartma degradeleri hariç).
- Leica paleti (denendi, vazgeçildi).

### Eski → yeni eşleştirme tablosu (uygulandı)

| Eski | Yeni |
|---|---|
| `#171717`, `#111111`, `#1D1D1F`, `#15171C`, `#16181D`, `#0A1A1C`, `#161617`, `#1C1C1C`, `#121212`, `#242424`, `#15181C`, `#16231C` | Metin: `#0A0A0A`; koyu bölüm zemini: `#000000`; kart/kutu: `#0A0A0A` |
| Koyu zemindeki kartlar `#161616`, `#1B1D1F`, `#1D1D1F`, `#2D2D2F`, `#1C1C1E`, `#181B1E`, `#1C232B`, `#101010`, `#2C2E33`, `#1F2C26`, `#4A4A4A` | `#141414` |
| Açık zeminler `#F5F5F7`, `#F1F2F5`, `#F7F8FA`, `#F1F2F6`, `#F7F7F8`, `#FAFAFA`, `#F8F8F8`, `#F5F5F5`, `#F9F9F9`, `#F7F7F7`, `#ECEEF1`, `#E5E8EC`, `#E9E9EC`, `#EBEBEB` | `#F4F4F4` |
| İkincil metin (açık zeminde) `#6E6E73`, `#6B6F78`, `#6B7280`, `#4B4B4B`, `#3D3D3D`, `#575757`, `#666666`, `#777777`, `#999999`, `#8B8E95`, `#A3A6AD`, `#86868B`, `#7D858E`, `#79828C`, `#5D666F`, `#30373E` | `#5C5C57` |
| İkincil metin (koyu zeminde) `#86868B`, `#A1A1A6`, `#C9C9C9`, `#B8BEC6`, `#8B939D`, `#BDBDB8`, `#E8E8E8`, `#DADADA` | `#A3A39E` (küçük üst etiketler `#8A8A85`) |
| Çizgi (açık) `#D2D2D7`, `#E3E5E8`, `#E1E4E8`, `#E8E8ED`, `#E3E3E6`, `#E5E5E5`, `#C9CED5`, `#E6E8EB`, `#7D7D7D` | `#D2D2CD` |
| Çizgi (koyu) `#2A2A2C`, `#2E2E30`, `#2E2E2C`, `#FFFFFF` %10-14, `#2A323C` | `#262624` |
| Maviler | Buton/çip zemini `#0A0A0A` (yazı white); link/vurgu metni `#0A0A0A`; ilerleme dolgusu `#0A0A0A` |
| Yeşil buton zeminleri | `#0A0A0A` |
| Yeşil küçük rozet zeminleri | `#D6FF00` + `#0A0A0A` yazı |
| Yeşil açık zeminler | `#F4F4F4` |
| Yeşil çerçeveler | Koyu zeminde `#D6FF00`, açık zeminde `#0A0A0A` |
| `#D3FB04`, `#D6FF02` | `#D6FF00` |

### Tema genel ayarları (settings_data.json, uygulandı)

| Ayar | Değer |
|---|---|
| `color_text` | `#0A0A0A` |
| `color_button_background` / `color_button_text` | `#0A0A0A` / `#FFFFFF` |
| `color_drawer_button_background`, `color_drawer_text`, `color_drawer_overlay` | `#0A0A0A` |
| `color_price` | `#0A0A0A` |
| `color_sale_price` | `#0A0A0A` |
| `color_sale_tag` / `color_sale_tag_text` | `#D6FF00` / `#0A0A0A` |
| `color_rating` | `#0A0A0A` |
| `color_image_background` | `#FFFFFF` |
| `color_keyboard_focus` | `#0A0A0A` |
| `color_highlight` | `#D6FF00` |
| `tt_bilgi_zemin` | `#F4F4F4` |
| `tt_kart_renk` | `#5C5C57` |
| `tt_serit_metin_rengi` | `#0A0A0A` |
| `tt_serit_zemin` | `#F4F4F4` |
| `checkout_accent_color`, `checkout_button_color` | `#0A0A0A` |

---

## 3. Tipografi

### Aile ve ağırlıklar

- **Tek aile: Poppins.** Gövde 400, orta 500, yarı kalın 600, başlık 700.
- Temada: `type_header_font = poppins_n7`, `type_body_font = poppins_n4` (Shopify font kütüphanesi). Buton, menü ve ürün adı ayarları "body".
- Özel bölümlerde (tt-*, apple-*, hediye-omru, mozaik-kartlar, avantaj-kartlari, adim-yigin, couple-bulusma, video-slider-kapsul, tt-veri, guclu-header, hero-video-kapsul vb.) sabit yazılmış Inter / -apple-system / SF Pro / system-ui değerleri temanın font değişkenlerine bağlandı.
- Yeni font dosyası eklenmez, Google Fonts'tan yükleme yapılmaz (istisna: GemPages ile yapılmış iletişim sayfası kendi Poppins'ini Google Fonts'tan yüklüyor).
- Serif yok, ikinci bir aile yok.

### Seviyeler (tasarım sistemi değerleri)

Bu tablo telefon için tanımlandı. Masaüstü boyutları ayrıca tanımlanmadı: **belirlenmedi**. Mevcut tema bölümlerinin boyutlarına dokunulmadı; dönüşümde sadece font ailesi ve harf aralığı değişti.

| Seviye | Boyut | Ağırlık | Satır yüksekliği | Harf aralığı | Kullanım |
|---|---|---|---|---|---|
| Büyük başlık (`title-xl`) | 32px | 700 | 1.08 | -1px | Sayfa ve bölüm başlıkları (mobil); iki satırlı yapılır |
| Başlık (`title-lg`) | 24px | 700 | 1.08 | -0.8px | Pencere başlıkları, kart başlıkları |
| Alt başlık (`title-md`) | 17px | 700 | 1.2 | -0.3px | Adım başlıkları, liste maddeleri |
| Gövde (`body`) | 15px | 400 | 1.45 | belirlenmedi (0) | Paragraf |
| Küçük metin (`small`) | 13.5px | 400 | 1.35 | belirlenmedi (0) | Adım ve kutu açıklamaları, `muted` renkte |
| Etiket (`label`) | 11px | 600 | 1.2 | +1.3px | BÜYÜK HARF bölüm etiketleri |
| Buton (`button`) | 15px | 600 | 1 | belirlenmedi (0) | Buton metinleri |
| Link | belirlenmedi (ayrı seviye tanımlanmadı; bulunduğu metnin boyutu) | — | — | — | — |

### Harf aralığı kuralı (mevcut başlıklara uygulandı)

- 28px ve üstü: -1px
- 20–27px: -0.8px
- 16–19px: -0.3px
- Ürün adı (ürün sayfası): Poppins 700, -0.8px. Fiyat: 600.

### İki satırlı başlık (marka imzası)

- Başlığın ilk kısmı açık zeminde `#0A0A0A`, koyu zeminde `#FFFFFF`.
- İkinci kısım: başlık **24px ve üstündeyse** `#8A8A85`; **24px altındaysa** `#5C5C57` (kontrast için). Örnek: "Uzun yıllar sizinle kalması için tasarlandı." telefonda 22px → vurgulu kısım `#5C5C57`; masaüstünde 28px → `#8A8A85`.
- Örnekler: "Single / nasıl çalışır?", "Couple / nasıl çalışır?", "Astor + Chloe / Couple Set".
- Degrade metin (background-clip: text) yok; düz renk.
- Koyu zeminde ikinci kısmın neon yeşil olması seçenek olarak konuşuldu, uygulanmadı (gri kaldı).

### Büyük/küçük harf ve yazım

- Bölüm etiketleri BÜYÜK HARF ("NASIL ÇALIŞIR?", "ÜRÜNLER", "HEDİYE ETTİKTEN SONRA DA", "İLİŞKİNİN EN GÜZEL ALIŞKANLIĞI"), 1.3–1.4px harf aralığı.
- Ürün kartlarında kategori etiketi BÜYÜK HARF ("ZAMAN KAPSÜLÜ BİLEKLİK / KOLYE / CHARM").
- Başlıklar ve maddeler cümle düzeninde; cümleler noktayla biter, kısa ve emir kipinde: "Anılarını yükle.", "Buluşunca açılır."

### Bileşene özel tipografi (onaylanmış çizimlerden)

| Bileşen | Değer |
|---|---|
| "Nasıl çalışır?" kartı başlığı | 21px, 600, satır 1.12, -0.6px |
| Kart adım satırları | numara 10.5px 600 +0.5px lime; metin 13px 500 satır 1.3 `#F2F2EF` |
| Kart alt satırı ("4 adımda gör") | 12.5px 500 `#BDBDB8` |
| Alttan açılan pencere başlığı | 24px, 700, satır 1.08, -0.8px |
| Pencere adım başlığı / açıklaması | 17px 700 -0.3px / 13.5px `#5C5C57` satır 1.35 (Couple penceresinde 16px / 13px) |
| Pencere bilgi kutusu | başlık 13px 700 (Couple: 12.5px); açıklama 11.5px `#5C5C57` (Couple: 11px) |
| Pencere bölüm etiketi | 11px 600 +1.3px `#8A8A85` |
| Mobil menü ürün satırları | 28px, 700, -0.8px, `#FFFFFF` |
| Mobil menü etiketleri | 11.5px, 600, +1.4px, `#8A8A85` |
| Mobil menü kart başlığı / açıklaması | 20px 700 -0.4px / 12.5px `#A3A39E` |
| Mobil menü alt linkler | 17px 500 `#FFFFFF`; destek satırı 12.5px `#A3A39E` |
| Rozet | 11.5px 600 |

---

## 4. Boşluklar

| Token | Değer | Kullanım |
|---|---|---|
| `space-2` | 8px | Kutular arası boşluk, ikon ile metin arası |
| `space-3` | 12px | Adımlar arası, etiket ile içerik arası |
| `space-4` | 16px | Kart iç boşluğu, ızgara aralığı |
| `space-6` | 24px | Sayfa kenar boşluğu (mobil), küçük bölüm arası |

Uygulanmış/onaylanmış özel değerler:

- **Mobil menü kenar boşluğu:** 24px.
- **Koleksiyon ızgarası (çizim):** kenar 16px, sütun aralığı 12px, satır aralığı 26px, 2 sütun (telefon).
- **"Nasıl çalışır?" kartı iç boşluğu:** üst 18px, yanlar 16px, alt 16px.
- **Alttan açılan pencere iç boşluğu:** üst 10px, yanlar 20px, alt 22px; altta `env(safe-area-inset-bottom)` boşluğu.
- **Alt yüzen öğeler arası:** en az 12px.
- **Bölümler arası boşluk:** belirlenmedi (mevcut tema bölümlerinin boşlukları korunur).
- **Maksimum içerik genişliği:** belirlenmedi. Masaüstünde alttan açılan pencere en fazla 440px; masaüstü mobil menü paneli 420px.
- **Masaüstü kenar boşlukları:** belirlenmedi.

---

## 5. Köşe yuvarlaklığı, çizgiler, kenarlıklar, gölgeler

### Köşeler

| Token | Değer | Kullanım |
|---|---|---|
| `radius-sm` | 12px | Ürün kartları, "Nasıl çalışır?" kartı, sayaç kutusu, UGC video kartı |
| `radius-md` | 16px | Bilgi kutuları |
| — | 18px | Mobil menüdeki Single/Couple kartları |
| `radius-lg` | 24px | Alttan açılan pencerenin üst köşeleri |
| `radius-pill` | 999px | Butonlar, rozetler, filtre çipleri, daireler |

### Çizgiler ve kenarlıklar

- İnce çizgiler 1px; açık zeminde `#D2D2CD`, koyu zeminde `#262624`.
- Adım listesindeki dikey bağlantı çizgisi 2px `#D2D2CD`.
- Seçili öğe: 1.5px `#0A0A0A` kenarlık (varyant hapı) ya da 2px `#0A0A0A` (seçili küçük galeri görseli). Seçili olmayan: 1px `#D2D2CD`.
- Kesikli çizgi: set oluşturma kutusundaki "1. ürün / 2. ürün" kutuları (renk `#0A0A0A` / `#D2D2CD`).
- "Nasıl çalışır?" yüzen butonu: 2px `#D6FF00` çerçeve.

### Gölgeler

- Ürün kartındaki "+" butonu: `0 4px 14px rgba(0,0,0,0.10)` (çizim değeri).
- Pencere arkası karartma: `rgba(0,0,0,0.5)`.
- Bunun dışında gölge kullanımı belirlenmedi; dil gölgesiz ve düzdür.

---

## 6. Bileşenler

### Butonlar

| Tip | Stil |
|---|---|
| Birincil (dolu) | `#0A0A0A` zemin, `#FFFFFF` yazı, 600, tam yuvarlak, en az 44px yükseklik (pencerelerde 50px). Koyu zeminde ters: `#FFFFFF` zemin, `#0A0A0A` yazı. Sitedeki tüm mavi/yeşil butonlar buna döndü ("Sepete ekle", "Sepete ekle (0/2)", "Satın Al", "HEMEN İNCELE", "Single'ı seç / Couple'ı seç", "Gönder"). |
| İkincil (çerçeveli) | `#FFFFFF` zemin, `#0A0A0A` yazı, 1px `#D2D2CD` kenar (açık zeminde), tam yuvarlak ("Ürünü Öğren", "Boyutlar", "Taksit tablosu", "Hızlı Bakış"). "Cihaz uyumluluğu" butonu `#F4F4F4` zemin + ink. |
| Metin | `#0A0A0A`, altı çizili ya da yanında ok ("Ürünü öğren →", "İade Koşulları"). Mavi link yok. |
| Ok dairesi | 34px `#D6FF00` daire içinde `#0A0A0A` sağ ok (çizgi 2px). Kartın tamamı tıklanabilirken yön gösterir. |
| Kapat | 44×44 beyaz daire içinde X (14px, ink, çizgi 2px); bütün açılır pencerelerde en az 44×44. |
| Büyük neon buton | YOK. İstisna: çark kartındaki "Çevir" butonu (`#D6FF00` + ink). |

**Hover / aktif:** belirlenmedi. Odak halkası: açık zeminde `#0A0A0A`, koyu zeminde `#FFFFFF`. Pasif buton durumu (ör. "Sepete ekle (0/2)", "(1/2)") var, görünümü belirlenmedi.

### Linkler

`#0A0A0A`, altı çizili veya yanında ok. Koyu zeminde `#FFFFFF` altı çizili. Hover belirlenmedi. Bulunulan sayfanın menü satırı `aria-current="page"` ve sağdaki ok `#FFFFFF`.

### Kartlar

- **Ürün kartı:** görsel 4:5 (portrait), `object-fit: cover`, görsel zemini `#FFFFFF`, köşe 12px. Sağ altta "+" butonu (44×44, beyaz, 12px köşe, gölgeli), sol altta kaydırma noktaları (aktif `#0A0A0A` uzun, pasif `#D2D2CD`). Altında kategori etiketi (BÜYÜK HARF), ad, fiyat.
- **Kartta sadece fotoğraf:** kaydırıcı en fazla 3 görsel: packshot, model üzerinde 1, model üzerinde 2. Bilgi kareleri (dört adım, garanti, karşılaştırma, uygulama, hediyeler biter, kutu, "sette neler var") kartta gösterilmez. Görsel türü DOSYA ADINDAN belirlenir (`-packshot`, `-lifestyle-N`), alt metin yedek. Single ve Couple modunda kart görselleri aynıdır.
- **"Nasıl çalışır?" kartı:** ızgarada 4. hücre, ürün kartıyla aynı genişlik ve yükseklik; `#0A0A0A` zemin, 12px köşe. Üstte marka simgesi, iki satırlı başlık ("Single" / "Couple" beyaz + "nasıl çalışır?" `#8A8A85`), "01 02 03" lime numaralı satırlar (ayraç `#262624`), altta "4 adımda gör" + lime ok dairesi. Dokununca alttan pencere açılır.
- **Bilgi kutusu:** `#F4F4F4` üstünde `#FFFFFF`, 14–16px köşe, ikon + kalın başlık yan yana, altında tek satır `#5C5C57` açıklama; 2×2 ızgara, 8px aralık.
- **Koyu kart:** `#141414` zemin (`#000000` üstünde), `#262624` kenar.

### Alttan açılan pencere (bottom sheet)

`#F4F4F4` zemin, üst köşeler 24px, ortada 40×5px `#CFCFCB` tutamaç, sağ üstte beyaz daire X, iki satırlı başlık, adım listesi (30px daireler: normal `#0A0A0A` + beyaz numara, vurgulu `#D6FF00` + ink; aralarında 2px `#D2D2CD` çizgi), bölüm etiketi + 2×2 bilgi kutuları, en altta tam genişlik birincil "Anladım" butonu (50px). En fazla 90dvh; sığmazsa kendi içinde kayar, buton sabit kalır. Masaüstünde ortalanmış, en fazla 440px. Native `<dialog>`; Esc, X, karartma ve "Anladım" ile kapanır, odak tetikleyiciye döner.

### Rozetler

- Neon: `#D6FF00` zemin, `#0A0A0A` yazı, 11.5px 600, tam yuvarlak, iç boşluk 5px 10px ("İkincisi yarı fiyatına", "%50", "2'li set").
- Koyu: `#0A0A0A` zemin, 6px lime nokta + lime yazı, 12px 600 ("48 yeni anı galerinize eklendi").
- Adım rozeti (koyu bölümlerde "Adım 1-4"): `#D6FF00` zemin + ink.
- Sıralama rozeti ("#1 çok satan"): `#FFFFFF` + ink + `#D2D2CD` kenar.
- Sepet sayı rozeti: en az 16×16, `#D6FF00` + ink, 10px 700.
- Bir ekranda tek rozet tercih edilir.

### Adım listesi

Numaralı daireler (`#0A0A0A` + beyaz numara), aralarında 2px `#D2D2CD` dikey çizgi, listede tek vurgulu adım (`#D6FF00` + ink). Başlık alt başlık seviyesi, açıklama küçük metin `#5C5C57`.

### İkonlar

- İnce çizgi, yuvarlak uç; çizgi kalınlığı 1.8–2px, boyut 18–22px; dokunma alanı en az 44×44.
- Açık zeminde `#0A0A0A`, koyu zeminde `#FFFFFF`. Dolgulu ikon ve emoji yok. Çok renkli ikon yok.
- Yıldızlar: açık zeminde `#0A0A0A`, koyu zeminde `#FFFFFF`.
- **Marka simgeleri:**
  - Single (kilitli halka): `<svg viewBox="-15 -15 30 30" fill="none"><circle r="12.5" stroke="#262624" stroke-width="1.6"/><path d="M0 -12.5 A12.5 12.5 0 1 1 -10.8 6.25" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/><circle cx="-10.8" cy="6.25" r="2.4" fill="#D6FF00"/><path d="M-2.6 -1v-1.8a2.6 2.6 0 0 1 5.2 0v1.8" stroke="#FFFFFF" stroke-width="1.4"/><rect x="-4.2" y="-1.2" width="8.4" height="6.4" rx="1.5" fill="#FFFFFF"/></svg>` (halka rengi `#262624`; 17 Ekim 2026'da `#3A3A38`'den güncellendi, menü ve kılavuzla aynı).
  - Couple (iç içe halkalar, kesişim lime): `<svg viewBox="-17 -12 34 24" fill="none"><defs><clipPath id="BENZERSIZ"><circle cx="-5.5" r="9.5"/></clipPath></defs><circle cx="5.5" r="9.5" fill="#D6FF00" clip-path="url(#BENZERSIZ)"/><circle cx="-5.5" r="9.5" stroke="#FFFFFF" stroke-width="1.6"/><circle cx="5.5" r="9.5" stroke="#FFFFFF" stroke-width="1.6"/></svg>` (clipPath ID sayfada benzersiz olmalı).
- Bilgi kutusu ikonları (viewBox 0 0 30 30, stroke ink 2px): bulut-yükleme (uzaktan yükle), açık kilit (tekrar kullan), sonsuzluk (sınırsız yükle), onaylı kalkan (garanti), onaylı takvim (gelecek inşa edin), iç içe halkalar (otomatik kilitlenir), kilit (sadece ikiniz). Path'ler "Nasıl çalışır" talimatında.

### Görsel ve video kuralları

- Ürün görselleri ve galeri 4:5 (1856×2304). Packshot zemini saf `#FFFFFF`.
- Ürün galerisi sırası (Single): packshot, dört adım, model 1, garanti, model 2, Single/Couple karşılaştırma, uygulama, model 3, hediyeler biter, kutu ve teslimat, kalan modeller. Couple: dört adım yerine Couple dört adım, uygulama yerine Couple uygulama. Set ürünleri: set packshot, Couple dört adım, model 1, sette neler var, model 2, Couple uygulama, garanti, hediyeler biter, kutu, kalan modeller.
- Bilgi kareleri `#F4F4F4` zeminli; siyah zemini yalnızca garanti karesi kullanır.
- Galeri karelerinin şablon değerleri (1080×1350 tuval): başlık 58px 700 satır 1.06 -2px; gri ikinci satır `#9A9A95`; açıklama `#64645F`; kart zemini `#FFFFFF`, köşe 28px. Bunlar görsel şablon değerleridir; site arayüzünde site token'ları kullanılır.
- Alt metin formatı: "<Ürün adı> – Zaman Kapsülü <bileklik/kolye> – <tür>"; setlerde "<Set adı> Couple Zaman Kapsülü – Couple set – <tür>". #single/#couple etiketi yok.
- Görseller varyanta bağlanmaz.
- Görsel üstündeki siyah karartma degradeleri (mozaik kartlar) kalır. Videosuz/görselsiz mozaik kartlarının medya zemini `#141414`.
- UGC video kartları: `#141414`, 12px köşe, oynat butonu beyaz daire + ink üçgen; Single görünümünde Single videoları, Couple görünümünde Couple videoları.
- Ürün görseli, galeri karesi, video ve logolara stil işi sırasında dokunulmaz.

---

## 7. Header, hamburger menü, footer

### Header (tt-baslik)

- Zemin `#0A0A0A` %80 opak (bulanıklık varsa kalır), ikonlar `#FFFFFF`.
- Solda hamburger (44×44), ortada logo (beyaz, ana sayfaya link), sağda arama ve sepet (44×44, çizgi 1.8px, ~20px). Sepette ürün varsa lime sayı rozeti.
- "Ürünü Öğren" butonu hiçbir sayfada ve kaydırma durumunda çıkmayacak; sağda her zaman arama + sepet. (Son talimatla istendi; uygulama raporu bu sohbette gelmedi.)
- Header ilk çizimde her zaman görünür olmalı; yenilemeden sonra kaybolma hatası bildirildi, düzeltme talimatı verildi (rapor bekleniyor).

### Hamburger menü (tt-menu)

Tam ekran, `#000000` zemin. Yukarıdan aşağıya:

1. **Üst çubuk:** 60px, `#0A0A0A`, altında 1px `#262624`. Hamburger aynı yerde X'e döner (18px, beyaz, 2px). Ortada logo; sağda arama + sepet (+ lime sayı rozeti). Menü açıkken "Ürünü Öğren"/"Satın Al" gizli.
2. **"ÜRÜNLER"** etiketi (üstten 28px). Üç satır, her biri 64px, aralarında 1px `#262624`, metin 28px 700 beyaz, sağda ">" (10×16, `#5C5C57`, 2px):
   - Kadın → `/collections/zaman-kapsulu-kolyeler`
   - Erkek → `/collections/zaman-kapsulu-bileklik`
   - Couple → `/collections/couple-urunler` + lime rozet "İkincisi yarı fiyatına"
3. **"NASIL ÇALIŞIR?"** etiketi (32px altta). İki kart yan yana (10px aralık): `#141414` zemin, 1px `#262624` kenar, 18px köşe, iç boşluk 16px, en az 132px yükseklik; üstte simge + çapraz ok (14px `#8A8A85`), altta başlık + açıklama:
   - Single – "Belirlediğin tarihte açılır." → `/pages/hediye-daha-fazla-bilgi-al`
   - Couple – "Buluşunca açılır." → `/pages/couple-daha-fazla-bilgi-al`
4. **En alt:** "Etkinlik" → `/pages/event-daha-fazla-bilgi-al`, "İletişim" → `/pages/iletisim` (48px, 17px 500 beyaz); 1px `#262624` çizgi; "Hafta içi 10.00–18.00 · 0216 606 14 15" (12.5px `#A3A39E`, tel: linki). "Satın alma sonrası desteğimiz süresizdir" metni menüde YOK.

Davranış: `aria-expanded`/`aria-controls`, odak içeride döner, Esc ile kapanır, odak hamburger'e döner, arka sayfa kayması kilitli, içerik uzunsa menü kendi içinde kayar, animasyon 200–250ms (prefers-reduced-motion'da yok). Masaüstü: soldan 420px panel + `rgba(0,0,0,0.5)` karartma. Metin ve linkler tema editöründen düzenlenebilir.

### Footer

- **Belirlenmedi.** Footer tasarımı bu çalışmada konuşulmadı.
- Mevcut durum (Claude Code raporu): footer grubunda yalnızca newsletter bölümü açık; footer ve telif satırı bölümleri kapalı.
- Newsletter kuralı (uygulandı): zemin `#000000`, giriş alanı `#141414`, gönder butonu beyaz zemin + ink ok, başlık beyaz Poppins 700, açıklama `#A3A39E`.

### Alt yüzen öğeler (telefon)

Alttan yukarıya: "Sepete ekle (…)" çubuğu (birincil buton) → çark sayaç çubuğu ("500 TL indirim aktif" + lime sayaç) → solda "Nasıl çalışır?" yüzen butonu (`#0A0A0A` zemin, beyaz yazı, 2px lime çerçeve), sağda "Sohbet" butonu; aralarında en az 12px, birbirine binmez. (Son talimatla istendi; uygulama raporu bekleniyor.) "Sepete ekle (0/2)" çubuğu Couple modunda, "Kendi setini oluştur" kutusu ekrana girince çıkar; en az 1 ürün seçiliyse her yerde görünür kalır.

---

## 8. Temadaki ilgili dosyalar

Tema: "Tasarim dili - 2026-10-16" (ID 189140861248), "Calisma kopyasi - 2026-10-15"ten türetildi. Yayındaki tema (bu dosya yazılırken): "Calisma taslagi - 2026-10-05". Değişiklikler önce kopya temada yapılır, yayına alma kullanıcıdadır.

| Dosya | İçerik (raporlardan) |
|---|---|
| `config/settings_data.json` | Genel renk ve font ayarları (bölüm 2 ve 3'teki tablo); `tt_bilgi_zemin`, `tt_kart_renk`, `tt_serit_*`. Temada `color_schemes` yok; renkler genel ayarlardan ve her bölümün kendi ayarlarından geliyor. |
| `layout/theme.liquid` | Ürün sayfası CSS katmanlarının yüklenme koşulu (`couple` son eki de normal ürün sayfası katmanlarını alıyor). |
| `sections/tt-baslik` (+ `sections/tt-couple-urun.json` header grubu) | Üst bar. |
| `sections/tt-menu.liquid` | Hamburger menü. |
| `sections/tt-secim-kartlari.liquid` + `assets/tt-secim-kartlari.js` | Koleksiyon üstündeki Single/Couple seçim kartları, set oluşturma kutusu, "Nasıl çalışır?" kartı ve pencereleri, mod geçişi (`?mod=couple`, `data-sc-aktif-mod`, bölüm kökü `[data-tt-sc]`), `setler_adet` ayarı (Kampanyalı Couple Setler şeridi). |
| `snippets/tt-uk-kart.liquid` + `assets/tt-uk-kart.js` | Koleksiyon ürün kartı (4:5, sadece fotoğraf filtresi, kaydırıcı, `uk_gorsel_sayisi`). |
| `snippets/tt-urun-dil.liquid` | Yalnızca ürün sayfalarında yüklenen tasarım dili katmanı (galeri çerçevesi/noktalar, ad harf aralığı, fiyat 600, adım şeridi renkleri, malzeme hapı, adet kutusu, güven kutusu, SSS, UGC, öneri kartları, pencere kapat butonları). Kurallar `body.template-product` kapsamında. |
| `snippets/product-media-gallery.liquid` | Ürün galerisi; Couple görünümünde ikiz ürün medyası ve alt metin üretimi (`couple_ad` parametresi). |
| `sections/ugc-video-gallery.liquid` | UGC video kartları (12px köşe, beyaz oynat düğmesi). |
| `sections/product-recommendations.liquid` | Öneri kartları (4:5, sadece fotoğraf, ikiz filtresi `custom.couple_ikizi`). |
| `templates/product.zaman-kapsulu.json` | Normal ürün şablonu. |
| `templates/product.couple.json` | Couple görünümü (`?view=couple`), Couple UGC videoları, 25 bölüm sınırı. |
| `templates/product.zaman-kapsulu-couple.json` | Couple ikiz ürünlerin şablonu (renkleri Couple görünümüyle eşitlendi). |
| `templates/collection.zaman-kapsulu-bileklik.json`, `collection.zaman-kapsulu-kolyeler.json`, `collection.couple-urunler.json`, `collection.celik-kolyeler.json` | Koleksiyon şablonları (`setler_adet`). |
| `templates/page.hediye-daha-fazla-bilgial.json`, `page.couple-daha-fazla-bilgial.json` | Single ve Couple anlatım sayfaları (guclu-header, adim-yigin, couple-bulusma, video-slider-kapsul, hediye-omru, apple-slayt, mozaik-kartlar, tt-veri, `_blocks` karşılaştırma, avantaj-kartlari). |
| Diğer bölümler | `tt-cok-satanlar`, `tt-catal-karsilastirma`, `tt-veri`, `tt-nasil-calisir` (yüzen buton), `ttn-cark-genel` (temaya gömülü çark), `dongu-seridi`, `hediye-omru`, `mozaik-kartlar`, `avantaj-kartlari`, `adim-yigin`, `couple-bulusma`, `guclu-header`, `apple-slayt`, `video-slider-kapsul`, `hero-video-kapsul`, `device-compat-bar`, `feature-highlights`, `accordion-cards`, `urun-alt-cta`, `faq`, `newsletter`. |

**Metafield'lar:** `custom.couple_urun` (tekli ürün → Couple ikizi, ürün referansı), `custom.couple_ikizi` (boolean, ikiz ürünleri işaretler; öneri filtresi bunu kullanır).

**CSS değişkenleri / token'lar:**
- Tasarım sistemi token adları: `ink`, `lime`, `surface`, `white`, `black`, `dark-raised`, `muted`, `muted-strong`, `muted-dark`, `line`, `line-dark`; `space-2/3/4/6`; `radius-sm/md/lg/pill`; tipografi stilleri `title-xl`, `title-lg`, `title-md`, `body`, `small`, `label`, `button`.
- Temada bu token'ların hangi CSS değişken adlarıyla (ve hangi önekle) tanımlandığı: **bu sohbette görülmedi**. Tema kodundan okunmalı (`tt-urun-dil.liquid`, `layout/theme.liquid`, tt-* bölümlerinin `<style>` blokları).
- Alt yüzen öğeler için ortak boşluk değişkeni önerildi (`--tt-alt-yigin`); uygulanıp uygulanmadığı belirlenmedi.
- Dosya/sınıf öneki: özel bölümler `tt-` (bir kısmı `ttn-`, `apple-`), ürün kartı sınıfları `tt-uk-` (ör. `tt-uk-ad`).

---

## 9. Yapılmayacaklar (denendi, vazgeçildi)

| Vazgeçilen | Neden |
|---|---|
| Apple mavisi (`#0071E3`) ve mavi aksan | Fazla Apple'a benziyordu; markanın kendi rengi değil. |
| Leica paleti | Önce seçildi, 15 Ekim 2026'da kurumsal renkler (siyah, neon yeşil, açık gri) lehine bırakıldı. |
| Cartier, Pandora, Jo Malone, Rolex ve teknoloji markası paletleri | Denendi, seçilmedi. |
| Inter fontu | Poppins'e geçildi (tek aile). |
| Serif vurgu fontu (başlıklarda) | İstenmedi. |
| Sayfa başına farklı vurgu rengi (Single'da adaçayı yeşili, Couple'da bordo, çarkta nane yeşili) | Tek dil konuşulmalı; hepsi kaldırıldı. |
| Renkli degrade başlıklar ve degrade zeminler | Düz renk iki satırlı başlık kuralına çevrildi. |
| Yeşil "Sepete ekle" çubuğu, mavi butonlar | Birincil siyah butona döndü. |
| Çok renkli ikonlar, sarı yıldızlar, mavi tik | Tek renk (ink/white). |
| Büyük neon buton / büyük neon alan | Neon sadece küçük vurgu. |
| Ürün kartında bilgi karesi (dört adım vb.) | Kartta kırpılıyor ve okunmuyordu; kartlar sadece fotoğraf. |
| Her ürün kartına "nasıl çalışır" eklemek | 23 kartta tekrar ve kalabalık; yerine ızgarada tek "Nasıl çalışır?" kartı. |
| Kartlarda Couple modunda ayrı görsel şeridi | Kaldırıldı; Couple hikâyesi karttaki "Nasıl çalışır?" kartı ve ürün sayfasındaki Couple galerisiyle anlatılıyor. |
| Kartta kare oran | 4:5'e geçildi (görseller kırpılıyordu). |
| Header'da "Ürünü Öğren" butonu | Gereksiz; yerine arama + sepet. |
| Müşteriye "Auron Couple" gibi ikiz ürün adı göstermek | "Bir ürün alınca iki adet gelir" algısı yaratıyor. |
| Üstü çizili karşılaştırma fiyatı (yeni set ürünlerinde) | Önceki 30 günün en düşük fiyatı kuralı riski; yeni sette boş bırakıldı. |
| Menüde "Satın alma sonrası desteğimiz süresizdir" | İstenmedi. |
| Galeride `#single/#couple` alt metin etiketi ve galeri filtresi kodu | Single ve Couple ayrı ürünler; gerek yok. |
| Görsel türünü alt metinden okumak | Alt metinler bir toplu değişiklikle bozuldu; dosya adından okunuyor. |
| Couple görünümünde galeriyi JS ile yüklemek (A seçeneği) | Piksel olaylarında ikiz ürün geçmediği için gerek kalmadı (C: olduğu gibi). |
| Couple anlatım penceresinde sitedeki uzun adım metinleri | Kullanıcı galerideki kısa dört adım metinlerini tercih etti. |

---

## 10. Kontrol listesi (yeni bir bileşen bu dile uyuyor mu?)

1. Sadece paletteki renkler mi var (bölüm 2'deki üç onaylı istisna hariç; `#0A0A0A`, `#D6FF00`, `#F4F4F4`, `#FFFFFF`, `#000000`, `#141414`, `#5C5C57`, `#8A8A85`, `#A3A39E`, `#D2D2CD`, `#262624`)? Mavi, yeşil, bordo, mor, turuncu, degrade yok mu?
2. Neon yeşil sadece küçük bir öğede mi, ekranda en fazla 1-2 yerde mi, üzerinde ink yazı mı? Açık zeminde neon yazı yok mu?
3. Font Poppins mi, başlıklar 700 ve negatif harf aralıklı mı? Yeni font yüklenmiyor mu?
4. Başlıkta vurgu gerekiyorsa iki satırlı kural mı (ilk kısım ink/white, ikinci kısım 24px+ `#8A8A85`, altında `#5C5C57`)?
5. Butonlar tam yuvarlak mı; birincil ink + white (koyu zeminde ters), ikincil white + 1px `#D2D2CD`? Mavi link yok mu?
6. Dokunma alanları en az 44×44 mı (butonlar, ikonlar, kapat)?
7. İkonlar ince çizgili, tek renk (açıkta ink, koyuda white), dolgusuz ve emojisiz mi?
8. Köşeler token'lardan mı (12 / 16 / 24 / pill; menü kartı 18)? Gereksiz gölge yok mu?
9. Kontrast 4.5:1 (24px+ 3:1) geçiyor mu?
10. Mevcut işlevler bozulmadı mı (sepet, %50 indirim, set oluşturma, çark ve indirimli fiyat gösterimi, Single/Couple modu, pikseller), değişiklik yayında olmayan kopya temada mı yapıldı ve yayındaki tema MD5 ile değişmedi mi?
