# Çatal Karşılaştırma bölümü — devir notu

Tarih: 2026-09-03

## Amaç

Ana sayfadaki çatal (Single vs Couple seçimi) bölümünün yerine geçecek, **ortak
eksenli** bir karşılaştırma bloğu. Aynı soru iki ürüne birlikte soruluyor,
cevaplar iki kolonda alt alta hizalı duruyor.

## Tema

- Çalışma teması: **Catal karsilastirma - 2026-09-03**
  (`gid://shopify/OnlineStoreTheme/188025372992`, yayında değil)
- Yayındaki temaya (`Duzeltme 7 - kupon seridi konumu`,
  `187540275520`) **dokunulmadı** — geri dönüş noktası o.

## Yeni dosya

`sections/tt-catal-karsilastirma.liquid` (16938 bayt, md5 `6c36fa2ed1b530b6b0f0ab2f71f4e94a`)

Mevcut `sections/story-choice-cards.liquid` dosyasına **hiç dokunulmadı**. Yeni
bölüm ondan tamamen bağımsız çalışır; eski bölüm tema editöründen gizlenirse
veya kaldırılırsa yeni bölümde hiçbir şey bozulmaz.

## Butonların linkleri

Mevcut çatal bölümünden (`templates/index.json` →
`story_choice_cards_v1.blocks`) okundu, yeni link üretilmedi:

| Buton | Kaynak | Link |
|---|---|---|
| Single | `card_a.btn_link` | `https://texttonext.com/pages/hediye-daha-fazla-bilgi-al` |
| Couple | `card_b.btn_link` | `https://texttonext.com/pages/couple-daha-fazla-bilgi-al` |

İkisi de section'ın presetinde hazır geliyor ve tema editöründen düzenlenebilir.

## Tasarım kararları

- Zemin `#000000`, kart yüzeyi `#1d1d1f`, ayırıcı `#2a2a2c`.
- Metin hiyerarşisi: `#f5f5f7` (beyaz) / `#86868b` (gri).
- Vurgu rengi `#0071e3` — temanın kendi Apple paletindeki CTA mavisi
  (`story-choice-cards.liquid` içindeki `c_btn_bg` ile aynı değer).
- **Vurgu kuralı:** yalnızca 3. satır ("Ne zaman açılır?") CTA renginde ve 500
  ağırlıkta. Diğer üç satırın cevapları normal beyaz / normal ağırlık. Bölümde
  ikinci bir vurgulu satır yok.
- Ayırıcı çizgiler `0.5px`. Gradient, gölge, glow yok.
- Ölçekler CSS değişkeni olarak tek yerde tanımlı: boşluk 4px tabanlı
  (`--tt-catal-s2..s8`), tipografi tek blokta (`--tt-catal-fs-*`) ve kırılma
  noktalarında topluca büyüyor. Göz kararı ara değer yok.
- Kırılma noktaları temanın kendi sistemiyle aynı: 768 (tablet), 1024 (masaüstü).
- Masaüstünde `max-width: 680px` ve ortalanmış — kolonlar aşırı genişlemiyor.
- Görseller iki kolonda da `aspect-ratio: 4 / 3`, böylece hizalama kaymıyor.
- CSS class'ları `.tt-catal-*` öneki + section id ile scope'lu.

## Bekleyen iş: ana sayfaya yerleştirme

`templates/index.json` **API üzerinden güncellenemedi.** Bu ortamdaki Shopify
MCP güvenlik katmanı tema dosyası yazmak için yalnızca satır içi metin (`TEXT`)
gövdesine izin veriyor; `URL` gövdesi sessizce hiçbir şey yapmıyor ve
`bulkOperationRunMutation` tamamen engelli. 108 KB'lık ana sayfa şablonunu
(18 bölüm, yüzlerce ayar) elle yeniden yazmak diğer bölümlerin ayarlarını
sessizce bozma riski taşıdığı için o yol kullanılmadı.

Yerleştirme tema editöründen yapılacak: **Bölüm ekle → "Çatal Karşılaştırma"**,
sonra mevcut çatalın hemen altına sürükle. Preset bütün metinleri ve iki linki
dolu getirir; sadece iki görsel seçilecek.

Şablona elle eklemek gerekirse hazır parça:
`docs/catal-karsilastirma-index-parcasi.json`. `templates/index.json` içinde
`"sections"` nesnesine eklenir, ardından `"order"` dizisinde
`"story_choice_cards_v1"` satırının hemen altına
`"tt_catal_karsilastirma_v1",` yazılır.

## Temizlik

`snippets/tt-catal-yazma-testi.liquid` — yazma izni doğrulaması için oluşan,
hiçbir yerden çağrılmayan artık dosya. API'den silme engelli olduğu için içeriği
açıklayıcı bir yoruma çevrildi; admin > Kodu düzenle ekranından silinebilir.
