// Temanın ürün sayfası yapısını taklit eden test sayfası üretir (Liquid yerine hazır JSON).
import { readFileSync, writeFileSync } from 'node:fs';
import { ornekVeriPiramitli } from '../ornek-veri.mjs';

const svg = (icerik, w = 300, h = 300) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${icerik}</svg>`);
const harfGorsel = (h, renk = '#f2c14e') => svg(`<rect x="6" y="6" width="288" height="288" rx="40" fill="${renk}" stroke="#222" stroke-width="10"/><text x="150" y="215" font-size="200" font-family="Arial" font-weight="bold" text-anchor="middle" fill="#222">${h}</text>`);
// Kırpılmış, şeffaf zeminli çanta görseli (1344x1460): daire merkez (672, 766), yarıçap 420 px = 25 cm
const canta = svg(`<rect x="0" y="0" width="1344" height="1460" rx="30" fill="#1f2a44"/><circle cx="672" cy="766" r="420" fill="#111"/>`, 1344, 1460);

const v = ornekVeriPiramitli();
v.gorsel = { en: 1344, boy: 1460, kucuk: canta, buyuk: canta, dev: canta };
// Kanvas Lacivert Tote: metin karakter sınırı 6 (kisisellestirme.metin_karakter_siniri)
v.urun.metin_siniri = 6;
v.harita = {
  surum: 2, kalibre: true, gorsel: { en: 1344, boy: 1460 },
  zones: [{ id: 'on-daire', shape: 'circle', x: (252 / 1344) * 100, y: (346 / 1460) * 100, w: (840 / 1344) * 100, h: (840 / 1460) * 100, cap_cm: 25, allowed_types: ['letter', 'number', 'icon'] }],
  forbidden: []
};
v.setler[0].varyantlar.forEach((x) => (x.gorsel = harfGorsel(x.karakter)));
// Piramit: her renk varyantı kendi renginde, yuvarlatılmış harf (şeffaf zemin)
v.setler[1].varyantlar.forEach((x) => {
  const h = x.baslik.split(' ').pop();
  const renk = x.renk_kodu || '#f6f7f8';
  x.gorsel = svg(`<text x="150" y="270" font-size="320" font-family="Arial" font-weight="900" text-anchor="middle" fill="${renk}" stroke="#333" stroke-width="6">${h}</text>`, 300, 300);
});
v.rakamlar[0].varyantlar.forEach((x) => (x.gorsel = harfGorsel(x.karakter, '#7fc8f8')));
v.ikonlar.forEach((i, n) => (i.gorsel = svg(`<circle cx="150" cy="150" r="140" fill="${['#e63946', '#2a9d8f', '#e9c46a', '#8d6cab', '#f4a261'][n]}"/><text x="150" y="175" font-size="70" text-anchor="middle" fill="#fff" font-family="Arial">${i.baslik.slice(0, 5)}</text>`)));
// Döndürme testleri için uzun bir ikon (3,5 × 8,5 cm, taş altta, kuyruk üstte)
v.ikonlar.push({ id: 6, baslik: 'Meteor', tip: 'icon', en: '3.5', boy: '8.5', sekil: 'rect', etiketler: ['janti oyuncular'], png: true,
  gorsel: svg(`<path d="M50 0 L90 300 L10 300 Z" fill="#2ec4b6"/><circle cx="50" cy="300" r="48" fill="#ff8fa3" stroke="#222" stroke-width="6"/>`, 100, 350),
  varyantlar: [{ id: 3006, fiyat: 33000, satilabilir: true, stok: 50 }] });

// Aksesuarlar: kalem kutusu (kırmızı gövde, açık kırmızı Velcro yüzey), zarf, yuvarlak (kancalı)
const aksGorsel = {
  9101: svg(`<rect x="10" y="10" width="980" height="525" rx="90" fill="#c4251b"/><rect x="91" y="91" width="818" height="363" rx="20" fill="#e85c55"/>`, 1000, 545),
  9102: svg(`<rect x="0" y="0" width="1000" height="450" fill="#d22"/><circle cx="500" cy="225" r="18" fill="#fff"/>`, 1000, 450),
  9103: svg(`<rect x="560" y="0" width="60" height="200" rx="20" fill="#14a"/><circle cx="575" cy="575" r="375" fill="#2459c9"/>`, 1000, 1000)
};
v.aksesuarlar.forEach((a) => { if (aksGorsel[a.id]) a.gorsel = { ...a.gorsel, kucuk: aksGorsel[a.id], buyuk: aksGorsel[a.id] }; });

const kod = readFileSync(new URL('../../assets/kisisel-editor.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../assets/kisisel-editor.css', import.meta.url), 'utf8');
const sepetKod = readFileSync(new URL('../../assets/kisisel-sepet.js', import.meta.url), 'utf8');
const kart = readFileSync(new URL('../../snippets/kisisel-kart.liquid', import.meta.url), 'utf8');
// Liquid kartının HTML kısmını basitçe çıkar
const kartHtml = kart
  .slice(kart.indexOf('<kisisel-kart'), kart.indexOf('</kisisel-kart>') + 15)
  .replace(/\{\{ section\.id \}\}/g, 'main')
  .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');

writeFileSync(new URL('sayfa.html', import.meta.url), `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html{font-size:62.5%}body{font-family:Arial,sans-serif;font-size:1.5rem;margin:0}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 1.6rem;border:1px solid #111;background:#fff;cursor:pointer}.btn-primary{background:#111;color:#fff}.button--full-width{width:100%}.hidden{display:none}.visually-hidden{position:absolute;clip:rect(0 0 0 0);width:1px;height:1px;overflow:hidden}.splide__slide{position:relative;aspect-ratio:1;background:#eee}.shopify-payment-button button{width:100%;min-height:44px;background:#5a31f4;color:#fff;border:0}</style>
<style>${css}</style>
<script>
  window.routes = { cart_add_url: '/cart/add', cart_url: '/cart', cart_update_url: '/cart/update', cart_change_url: '/cart/change' };
  window.Shopify = { currency: { active: 'TRY' }, analytics: { publish: function (ad, veri) { (window.__olaylar = window.__olaylar || []).push([ad, veri]); } } };
  window.PUB_SUB_EVENTS = { cartUpdate: 'cart-update' };
  window.publish = function (ad, veri) { (window.__pubsub = window.__pubsub || []).push([ad, veri]); };
</script>
</head><body>
<section id="MainProduct-main">
  <div class="product__media-wrapper"><gallery-carousel>
    <div class="main-carousel"><div class="splide__list"><div class="splide__slide is-active"><img alt="" src="${canta}" style="width:100%"></div><div class="splide__slide"><img alt="" src="${canta}" style="width:100%"></div></div></div>
    <div class="thumbnail-carousel"><div class="splide__list" style="display:flex;gap:8px"><div class="splide__slide" style="width:70px;aspect-ratio:1" onclick="window.__kucukTik=(window.__kucukTik||0)+1"><span class="thumbnail" style="display:block;width:70px;height:70px"><img alt="" src="${canta}" width="70" height="70"></span></div><div class="splide__slide" style="width:70px;aspect-ratio:1"><span class="thumbnail" style="display:block;width:70px;height:70px"><img alt="" src="${canta}" width="70" height="70"></span></div></div></div>
  </gallery-carousel></div>
  <script>
    // Tema: gallery-carousel Splide örneğini "main" olarak tutar; sayfa ikinci görselde açılmış gibi
    document.querySelector('gallery-carousel').main = { index: 1, go: function (i) { this.index = i; window.__galeriGit = i; } };
  </script>
  <product-info id="ProductInfo-main">
    <h1>Kanvas Lacivert Tote Çanta</h1>
    <div class="product__price">3.000 TL</div>
    ${kartHtml}
    <script type="application/json" id="KisiselVeri-main">${JSON.stringify(v)}</script>
    <input type="number" name="quantity" form="product-form-main" value="1" id="Quantity-main">
    <div class="bag-notice">Değiştirilebilir patchler ayrı olarak satılmaktadır.</div>
    <product-form><form id="product-form-main" action="/cart/add" method="post" data-type="add-to-cart-form">
      <input type="hidden" name="id" value="51795696943390">
      <button id="ProductSubmitButton-main" type="submit" name="add" class="btn btn-outline button--full-width"><span>Sepete ekle</span><div class="loading__spinner hidden">…</div></button>
      <div class="shopify-payment-button"><button type="button">Hemen satın al</button></div>
    </form></product-form>
  </product-info>
  <product-add-to-cart-sticky><form id="product-form-main" data-type="add-to-cart-form"><button id="StickyProductSubmitButton-main" type="submit" class="btn btn-primary"><span>Sepete ekle</span></button></form></product-add-to-cart-sticky>
</section>
<script>
  // Tema: product-form submit'i kendi dinleyicisiyle yakalar
  document.querySelectorAll('form[data-type="add-to-cart-form"]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); window.__temaSubmit = (window.__temaSubmit || 0) + 1; });
  });
</script>
<script>${kod}</script>
<script>${sepetKod}</script>
</body></html>`);
console.log('sayfa.html yazıldı');
