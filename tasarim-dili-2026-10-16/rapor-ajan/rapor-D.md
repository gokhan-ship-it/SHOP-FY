# Rapor – Ajan D (çekirdek tema)

Aşama 1 ayarları (color_text/button/price #0A0A0A, sale tag lime+ink, rating ink, image bg #FFF, focus ink, Poppins, buton 999px/600) çekirdek bölümlerin büyük kısmını zaten değişkenlerle çeviriyor: header, cart-drawer, search-drawer, main-cart, main-search, product-recommendations, featured-collection, main-404 ve product-card*'ta sabit renk yok (yalnızca şema varsayılanları var; JSON değerleri bunları eziyor ya da ilgili bloklar kullanılmıyor). Aşağıda yalnızca gerçekten görünen sabit renkler değiştirildi.

## Değişen dosyalar

### assets/custom-tt.css
- `.tt-stars svg` (ürün sayfasında başlık üstündeki yıldızlar): fill #f5a623 -> #0a0a0a (yıldızlar ink).
- `.tt-proof-score, .tt-proof-users` (4.9 / 100.000+ Kullanıcı): #171717 -> #0a0a0a.
- `.tt-proof-sep`: #d4d4d4 -> #d2d2cd. `.tt-proof-icon` stroke: #171717 -> #0a0a0a.
- `.how-it-works-timeline-section ol > li` kenarlığı (masaüstü): #e8e8e8 -> #d2d2cd.
- `.tt-akis--cizgi` yedek kenarlığı: rgba(128,128,128,.32) -> rgba(138,138,133,.32) (#8A8A85 tabanlı).
- YENİ kurallar (en alta eklendi):
  - `.price__sale { color:#5c5c57 }`: üstü çizili karşılaştırma fiyatı muted kalıyor.
  - `.badge.badge--highlight`: --badge-background #f4f4f4, --badge-foreground #0a0a0a. Neden: sale tag artık lime olduğu için tema bu rozeti "lime %10 zemin + lime yazı" çiziyordu (açık zeminde lime yazı yasak). Sepetteki "İkinci Üründe %50 İndirim" etiketi artık nötr chip; tutar rozeti (`.badge--onsale`, "-1,149.50TL") ayardan lime+ink geliyor.
  - İkincil butonlar (beyaz zemin, ink yazı, 1px #d2d2cd): `.cookie-modal .cookie__buttons .button--secondary` (Reddet), `.page-404 .button--secondary` (Alışverişe devam), `.cart .title-wrapper .button--secondary` (sepetteki Alışverişe devam). Hover dolgusu temanın kendi davranışıyla aynı kalıyor (hover kuralı daha özgül).

### assets/theme.css (tek hedefli düzenleme)
- `.price__sale::before` üstü çizme çizgisi: `1px solid red` -> `1px solid #5c5c57` (sepette/aramada kırmızı çizgi görünüyordu).

### snippets/tt-urun-hap.liquid (Boyutlar + Taksit tablosu hapları, ürün sayfası)
- Yazı #1d1d1f -> #0a0a0a; Boyutlar kenarlığı #d2d2d7 -> #d2d2cd, zemin transparent -> #ffffff (ikincil buton); Taksit tablosu kenarlığı #e3e3e6 -> #d2d2cd.
- data-URI ikon stroke'ları %231d1d1f -> %230a0a0a.
- Hover kenarlığı #86868b -> #5c5c57, #c7c7cc -> #8a8a85; focus outline #0071e3 -> #0a0a0a.
- YENİ: Boyutlar penceresi (main-product JSON'undaki `size_popup` liquid bloğu) için `#MainContent.tt-urun-page` kapsamlı ezme: h3 başlık var(--font-heading-family) 700, ink, letter-spacing -0.3px (18px); kapatma düğmesi #f2f2f2/#171717 -> #f4f4f4/#0a0a0a. JSON'daki liquid bloğuna dokunulmadı (çok satırlı değer TSV'ye yamalanamaz); daha yüksek özgüllükle eziliyor.

### snippets/tt-couple-akis.liquid (ürün sayfasındaki Couple modundaki 3 adımlı akış)
- Açık: metin #1d1d1f -> #0a0a0a, soluk #86868b -> #5c5c57 (13px < 24px), aktif #1d1d1f -> #0a0a0a, vurgu (bordo #9e2b2b) -> #0a0a0a.
- Koyu varyant (.tt-cak--koyu): metin/aktif #f5f5f7 -> #ffffff, soluk #86868b -> #a3a39e, vurgu #e0685c -> #ffffff.
- Kalp ikonu: fill #e0364a -> #0a0a0a; ayrıca `.tt-cak-kalp { fill: var(--tt-cak-aktif) }` eklendi, koyu varyantta beyaz oluyor.

### snippets/tt-akis-seridi-klasik.liquid (Single akış şeridi)
- Nokta/çizgi grileri rgba(128,128,128,a) -> rgba(138,138,133,a) (×3, alfalar aynı).

### sections/newsletter.liquid
- `<style>` içine koşullu kural: bölüm zemini koyuysa (color_brightness < 40) `.newsletter-form .input` ve `:focus` -> #141414. Açık zeminli kullanımlar etkilenmez.

## Yamalar ($S/dil/yamalar/D.tsv, 7 satır, old_value'ların hepsi doğrulandı)
- header-group/header settings.color_text #171717 -> #0a0a0a
- overlay-group/cookie-banner color_drawer_text #171717 -> #0a0a0a; color_drawer_highlight #ffddbf -> #d6ff00; color_drawer_button_background #171717 -> #0a0a0a
- footer-group/newsletter_P9N9HX color_background #171717 -> #000000; color_button_background "" -> #ffffff; color_button_text "" -> #0a0a0a (bu ikisinde old_value boş string, uygulayıcı boş alanı "" olarak ele almalı). Sonuç: gönder düğmesi beyaz, ok ikonu ink (currentColor).

## Tutulan palet dışı renkler
- **Status kırmızıları (tutuldu):**
  - templates/product.zaman-kapsulu.json + product.couple.json `main-product.blocks.countdown` color_text #e11d48 / color_background #fff1f2: indirim geri sayımı ("Acele et"), indirim durumu bildirimi. Ekran görüntülerinde görünmüyor (yalnızca geri sayım metafield'ı olunca basılıyor). Şema varsayılanları da aynı (sections/main-product.liquid).
  - assets/theme.css `--color-red-200/300` (.swatches ... :disabled + .label-swatch / .color-swatch): stokta olmayan varyant işareti, stok durumu. Denetlenen ürünlerde tükenen varyant yok.
  - settings color_error_* (#be123c/#fff1f2), color_info_*, color_success_*: form hata/bilgi/başarı (Aşama 1, dokunulmadı).
- theme.css `.product__inventory .accent-N` renkli gradyanlar, sosyal paylaşım marka renkleri, flickity #333/#19f: denetlenen sayfalarda görünmüyor (stok çubuğu bloğu yok, paylaşım kapalı).
- header-group mega-menu promo_color_overlay_1..5 #171717 ve promo_color_text #ffffff: görsel üstü karartma katmanları (kural: overlay'ler kalır); mega menü yalnızca masaüstünde.
- product-badges.liquid `--badge-foreground:#ffffff` + metafield etiket rengi: ürün metafield'ından gelen özel etiket rengi, içerik verisi.
- Ürün dışı şema varsayılanları (#171717 vb., main-search promotion blokları, header): kullanılmıyor ya da JSON değeri eziyor; dokunulmadı.

## Belirsiz kararlar
- "Seçili adet seçici ink kenarlık": malzeme seçiminde seçili hap zaten `:checked + .label-swatch::after` ile 2px foreground (ink) halkasıyla çiziliyor. Adet seçicinin "seçili" durumu yok; kenarlığı foreground %10 (ink tabanlı) bırakıldı.
- Sepet indirim adı rozeti (badge--highlight) lime yerine #F4F4F4 + ink yapıldı: aynı satırda iki lime rozet "ekran başına en fazla 1–2 neon" kuralını zorlardı, ayrıca açık zeminde lime yazı yasak.
- cookie color_drawer_highlight lime yapıldı; şu an vurgulu metin olmadığı için görünmüyor.
- Varyant seçici açılır penceresi ("Seçenek seç") tt-secim-kartlari/tt-uk-kart'ın (başka ajan) çizdiği bir sheet; gp-variant-selected bir GemPages dosyası, dokunulmadı.
- Mobil menü (koyu, mavi odak halkası) denetlenen sayfaların çoğunda tt-baslik'in KENDİ çekmecesi (tt-baslik sahibinin dosyası). Temanın header-drawer'ı yalnızca Concept header'lı sayfalarda (07, 13–18) açılıyor ve ayarlardan renk alıyor; sabit renk yok. Odak halkası koyu zeminde artık ink (Aşama 1 color_keyboard_focus #0A0A0A), yani siyah menüde görünmez. tt-baslik sahibi menü için `outline-color:#fff` eklemeli.

## Açık konular (izin reddedildi / sahibi belirsiz)
Aşağıdaki layout seviyesi "katman" snippet'leri (layout/theme.liquid'den render ediliyor) başka ajanların bölümlerini daha yüksek özgüllükle eziyor. Düzenleme denemem otomatik izin denetimi tarafından "paylaşılan kaynak" gerekçesiyle reddedildi, bu yüzden DOKUNULMADI:
- **snippets/tt-couple.liquid** (sayfa 12): --tt-c-ink #1d1d1f, ink-2 #6e6e73, ink-3 #86868b, dark #f5f5f7/#a1a1a6/#86868b; .as-* slayt (#f5f5f7 başlık, #a1a1a6 etiket, #1c1c1e kart); **`[data-aln-cta]` zemini #0071e3 / hover #0077ed (mavi)**. Önerilen: #0a0a0a/#5c5c57/#8a8a85, koyu #fff/#a3a39e/#8a8a85, kart #141414, CTA #ffffff + color #0a0a0a, hover #f4f4f4.
- **snippets/tt-aln-mavi.liquid** (sayfa 11 ve 12): apple-local-nav CTA ve bölünmüş düğmeleri mavi (#0071e3, #0077ed, #2997ff). Bu dosya, apple-local-nav sahibinin yaptığı beyaz CTA değişikliğini EZER. Önerilen: dolu düğmeler #ffffff + #0a0a0a, hover #f4f4f4; çizgili düğme kenarlık/yazı #ffffff, hover zemin #ffffff + yazı #0a0a0a.
- snippets/tt-couple-banka.liquid: #86868b (koyu zeminde) -> #a3a39e, #f5f5f7 -> #ffffff.
- snippets/tt-yapilandirma.liquid: `.tt-kol-bilgi .tt-kol-metin` #1d1d1f -> #0a0a0a, `.tt-kol-saat` #6e6e73 -> #5c5c57.
- settings_data `color_shadow` #a8e8e2 (nane) ve card_shadow_opacity 10: kart gölgesi nane tonlu (Aşama 1'in alanı).

## Poppins taşma riskleri (boyutlar değiştirilmedi)
- Ürün sayfası 390px: fiyat bloğundaki taksit satırı ("Ayda 884,29 TL × 3 taksit" + "Taksit tablosu" hapı, nowrap). Poppins daha geniş, hap alt satıra düşebilir.
- tt-couple-akis etiketleri (13px, nowrap, 150px genişlik) ve tt-akis-seridi "Vakti gelince açılsın" (12px): dar ekranda yan yana etiketler sıkışabilir.
- H1 başlık + "Boyutlar" hapı aynı flex satırında (wrap açık): uzun ürün adlarında hap alt satıra iner (kırılmaz).
- 404 "sayfa bulunamadı" (48px) ve "Sepetiniz" başlıkları: Poppins 700 daha geniş, ek satır kırılması olabilir.
