# Text To Next — tema çalışma kuralları

## Bu depo temanın TAMAMI DEĞİL

Depoda yalnızca üzerinde çalışılan dosyalar var (~35 dosya). Temada bunların
**yüzlercesi** daha var ve **depodaki kopya temadakinden eski olabilir** —
tema düzenleyiciden ya da önceki oturumlardan yapılan değişiklikler depoya
geri alınmamış olabilir.

### KURAL: Yüklemeden önce uzak kopyayı doğrula

Bir dosyayı `themeFilesUpsert` ile göndermeden önce **her zaman** o dosyanın
temadaki md5'ini oku ve depodaki kopyayla karşılaştır:

```graphql
query($id: ID!, $n: [String!]) {
  theme(id: $id) { files(filenames: $n, first: 5) {
    nodes { filename size checksumMd5 } } }
}
```

- **md5 aynı** → gönderilebilir.
- **md5 farklı** → depodaki kopya bayat. Önce temadaki içeriği indir, depoyu
  ona eşitle, değişikliği onun üzerine yap. Aksi halde aradaki bütün iş silinir.

Yükledikten sonra md5'i tekrar doğrula (kısmi/yamalı yükleme yok; dosyanın
tamamı gidiyor, tek karakterlik aktarım hatası mümkün).

**Bu kural bir kez çiğnendi:** `layout/theme.liquid` bayat yerel kopyayla
üzerine yazıldı; couple/tekli/ürün katmanları, koleksiyon kart kuralı, üç
bölüm grubu ve çarkın `[data-ttn-veri]` düğümü silindi — çark tamamen
kayboldu. Canlı temadan okunarak yeniden kuruldu.

## Temalar

| Tema | ID | Rol |
|---|---|---|
| Urun sagsutun - 2026-09-04 | `188045295936` | **taslak — bütün iş burada** |
| Catal renk ayarlari - 2026-09-04 | `188044443968` | **MAIN (canlı) — sadece OKU** |

Canlı temaya **hiçbir koşulda yazma**. Yayına alma kullanıcının onayıyla.
Canlı tema, taslağın bayatlamış bir dosyasını kurtarmak için iyi bir
referans kaynağıdır (yalnızca okuma).

## layout/theme.liquid — sıra bağımlılığı

`{% sections 'ttn-cark' %}` **`<div class="page-container">`'dan ÖNCE**
olmalı. Çark kartının bölümü ilk boyamadan önce çalışan senkron bir script
taşıyor ve `[data-ttn-veri]` düğümünü arıyor; bulamazsa kart kendini
gizliyor, `assets/ttn-cark.js` de hemen `return` ediyor. Bu satır aşağı
kayarsa çark sessizce kaybolur.

## Ürün tarafı kuralları

- Ön yüzde yeni bir fiyat hesabı **icat etme**. Ekranda gösterilen her tutar
  sepette ve ödeme sayfasında çıkacak tutarla birebir aynı olmalı.
- Kendi başına sepet veya indirim mantığı kurma.
- Mevcut ayar id'lerini **değiştirme**, sadece yeni ayar ekle.
- Dokunulmayacaklar: taksit/PayTR modalı, fiyat/indirim/varyant eşleme/sepete
  ekleme mantığı, HAM MADDE segmenti, Kadın/Erkek segment yapısı,
  `sections/main-product.liquid`, `snippets/product-card.liquid`,
  `sections/main-collection.liquid`, bileklik şablonu.
- Dosya önekleri `tt-` / `ttn-`; CSS önekleri `.tt-sc-*`, `.tt-uk-*`,
  `.ttn-cark-*`. Her şey tema düzenleyiciden ayarlanabilir olmalı.
- Mobil öncelikli: 360 / 390 / 430 px.

## Ağ

Bu ortamdan `texttonext.com` ve `*.myshopify.com` adreslerine çıkış
engelli (`403 CONNECT`), yani taslak önizleme buradan açılamıyor. Doğrulama
yerel Playwright fikstürleriyle yapılıyor (`scratchpad/*/`, Chromium
`/opt/pw-browsers/chromium`, `headless: false` + `--headless=new`).
Gerçek sayfada doğrulama kullanıcının tarayıcısından yapılmalı.
