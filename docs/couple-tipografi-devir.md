# Couple sayfası tipografi revizyonu — devir notu

Bu iş **başlamadı**. Aşağıdakiler yalnızca keşif sonuçları ve yeni oturumun
ilk adımları. Kod değişikliği yapılmadı.

## Hedef

| | |
|---|---|
| Sayfa | `Couple Daha Fazla Bilgi Al` — `/pages/couple-daha-fazla-bilgi-al` |
| Page ID | `gid://shopify/Page/164143399232` |
| Şablon | `templates/page.couple-daha-fazla-bilgial.json` (77KB, yerel section tabanlı) |
| Tema | `Çalışma Kopyası - 2026-07-29` — `gid://shopify/OnlineStoreTheme/187210006848` (UNPUBLISHED) |
| Mağaza | `52ae29-e0.myshopify.com` |

Brief `/pages/couple` diyor ama o handle mevcut değil. Mağazada beş "couple"
sayfası var; hedef yukarıdaki, kullanıcı onayladı. Diğerleri:
`couplezamankapsulleri`, `couple-hediye-kullanim-kilavuzu`,
`couplekapsuldahafazlabilgial` (üçü GemPages), `couple-zaman-kapsulu-yeni`
(varsayılan `page` şablonu).

## Uyarılar

### 1. Brief'teki `--tx-*` öneki yanlış

Brief §0'da "dokunma" denen bitmiş sistemlerin `--tx-*` önekli tokenları
olduğu yazıyor. **Gerçekte önek `tt-`.** Dokunulmayacak seçiciler:

- Taksit modalı: `.tt-tk-*`, `dialog[data-tt-tk]`
- Ürün sayfası fiyat bloğu: `.tt-fb-*`, `[data-tt-fb]`
- Kart fiyat bloğu: `.tt-kart-*`, `[data-tt-kart-fb]`, `.tt-gizli`
- Koleksiyon indirim şeridi: `.tt-kol-*`, `[data-tt-kol]`

Bunları taşıyan dosyalar: `snippets/tt-kart-taksit.liquid`,
`snippets/tt-yapilandirma.liquid`, `snippets/tt-para.liquid`,
`assets/taksit-tablosu.js`.

### 2. Global CSS çakışma riski

`snippets/tt-yapilandirma.liquid` **`layout/theme.liquid`'den her sayfada**
yükleniyor ve içinde `<style>` bloğu var. Couple sayfası için yazılacak CSS
`.tt-couple-page` altına kapsanacağı için çakışma beklenmiyor, ama couple
sayfasında ürün kartı bulunan bir bölüm varsa (karusel, öneriler) kart fiyat
bloğu oraya da düşer — `.tt-couple-page` altındaki kurallar `.tt-kart-*`
seçicilerini ezmemeli.

### 3. Kardeş şablonlar — paylaşım riski

`templates/page.hediye-daha-fazla-bilgial.json` (87KB) ve
`templates/page.event-daha-fazla-bilgial.json` (39KB) aynı adlandırma
kalıbında. Section'ların büyük kısmının üçünde de kullanıldığı varsayılmalı;
envanterde doğrulanacak.

## Brief'teki bölümlerle eşleşen aday section'lar

Temada mevcut, isimleri brief §7 listesiyle örtüşüyor:

`adim-kartlari` (25KB), `adim-yigin` (63KB), `avantaj-kartlari` (41KB),
`couple-bulusma` (76KB), `comparison-table` (34KB), `dongu-seridi` (19KB),
`apple-baslik` (5KB), `apple-slayt` (33KB), `device-compat-bar` (23KB),
`countdown-condensed`, `feature-highlights`, `accordion-cards`, `faq`

Hangilerinin gerçekten bu şablonda olduğu **doğrulanmadı** — şablon JSON'u
okunmadı.

## Yeni oturumun ilk adımları (Aşama 1)

Kullanıcı alt ajan kullanımına onay verdi. Tarama şöyle bölünmeli:

1. Bir ajan `templates/page.couple-daha-fazla-bilgial.json`'u okusun, sadece
   **sıralı section tipi + section key** listesini döndürsün (ayarları değil).
2. Paralel ajanlar kalan şablonları (`templates/*.json`, `sections/*-group.json`,
   `templates/index.json`, `product.*`, `collection.*`) bölüşüp her birinden
   yalnızca **kullanılan section tipleri kümesini** döndürsün.
3. Kesişim alınıp paylaşım tablosu kurulsun: her section için "sadece couple"
   / "hediye+event'te de" / "ana sayfa/koleksiyonda da".
4. Couple'a özel section'ların `.liquid` dosyalarındaki `render` çağrılarından
   snippet envanteri çıkarılsın, aynı paylaşım sorusu snippet'ler için de
   cevaplansın.

Sonuç tablo halinde kullanıcıya verilip **durulacak** (brief §0 "Sıra").
Aşama 2 (token katmanı) da ayrı onay istiyor.

## Ağ kısıtı

Storefront'tan render edilmiş HTML çekilemiyor — ağ politikası
`texttonext.com:443` için CONNECT'e 403 dönüyor. Envanter yalnızca tema
dosyalarından çıkarılabilir. Görsel doğrulama için Playwright + yerel
kurgu kullanılmalı (bu oturumda kart fiyat bloğu böyle test edildi).

## Kullanıcıya sorulacaklar (brief §8)

Aşama 1 raporundan sonra netleşecek, ama şimdiden bekleyenler:
hangi gradient metinlerin kalacağı, 4. bölümün yeni başlık metni,
3 satırı geçen başlıklar, eşik altı kalan gradient kontrastları.

## Bu oturumda ne yapıldı (couple işi değil)

Kart fiyat bloğu revizyonu tamamlandı ve aynı branch'e push edildi:
`3c617ab` (baseline), `c3d5187` (revizyon), `cd55e2e` (şerit düzeltmeleri).
Değişen dosyalar: `snippets/tt-kart-taksit.liquid`,
`snippets/tt-yapilandirma.liquid`, `assets/taksit-tablosu.js`.
Üçü de çalışma kopyası temasına yazıldı. Açık kalan iki madde:
`tt_kart_etiket` / `tt_kart_itibaren` ayarları `settings_schema.json`'a
eklenmedi (kod `default:` ile çalışıyor), ve Durum 2'de fiyat temanın
İngilizce para biçiminde kalıyor.
