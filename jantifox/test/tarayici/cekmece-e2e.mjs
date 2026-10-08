// Sepet çekmecesi: tasarım satırında önizleme görseli (çizim kiti), içerik özeti, grup toplamı,
// patch satırları "N patch'i göster" ile açılıp kapanır; patch satırlarında tasarım özeti tekrar etmez.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node cekmece-e2e.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kod = readFileSync(new URL('../../assets/kisisel-sepet.js', import.meta.url), 'utf8');
const stil = readFileSync(new URL('../../snippets/kisisel-sepet.liquid', import.meta.url), 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];

const T = 'TXYZ';
const ozel = (rol, ek = {}) => ({ 'Tasarım': 'ECE + 7', _tasarim_id: T, _tasarim_rol: rol, ...ek });
const sepet = { items: [
  { key: 'k-baz', product_id: 10087205437726, variant_id: 51795696943390, quantity: 1, final_line_price: 270000, variant_title: 'Default Title', product_title: 'Kanvas Lacivert Tote Çanta', properties: ozel('baz', { 'İsim': 'ECE', _tasarim_konum: '{"v":2,"p":[]}' }) },
  { key: 'k-e', variant_id: 1004, quantity: 2, final_line_price: 56750, variant_title: 'E', product_title: 'Cool Alfabe Patch', properties: ozel('patch', { 'Harf sırası': '1, 3', _adet_birim: '2' }) },
  { key: 'k-c', variant_id: 1002, quantity: 1, final_line_price: 28375, variant_title: 'C', product_title: 'Cool Alfabe Patch', properties: ozel('patch', { 'Harf sırası': '2', _adet_birim: '1' }) },
  { key: 'k-7', variant_id: 2007, quantity: 1, final_line_price: 28375, variant_title: '7', product_title: 'Janti Rakam Patch', properties: ozel('patch', { _adet_birim: '1' }) },
  // Aksesuar alt grubu: aksesuar satırı + üzerindeki patch (A ×2)
  { key: 'k-aks', product_id: 9101, variant_id: 9201, quantity: 1, final_line_price: 170000, variant_title: 'Default Title', product_title: 'Yapıştırılabilir Kalem Kutusu Kırmızı- LE KOKO COLLECTIF-', properties: ozel('aksesuar', { 'Aksesuar tasarımı': 'ADA', _aksesuar_id: 'a1', _adet_birim: '1' }) },
  { key: 'k-aks-a', variant_id: 1000, quantity: 2, final_line_price: 56750, variant_title: 'A', product_title: 'Cool Alfabe Patch', properties: ozel('patch', { 'Harf sırası': '1, 3', _adet_birim: '2', _aksesuar_id: 'a1', Aksesuar: 'Kalem Kutusu Kırmızı' }) },
  { key: 'k-diger', variant_id: 9, quantity: 1, final_line_price: 50000, variant_title: 'Default Title', product_title: 'Şapka', properties: {} }
] };
const svg = (renk) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="${renk}"/></svg>`);
// Temanın çekmece satırının sadeleştirilmiş hali (snippets/cart-drawer.liquid)
const satir = (k, i) => `<div id="CartDrawer-Item-${i + 1}" class="cart-item" role="row">
<div class="cart-item__media"><a class="cart-item__link"> </a><img class="model" src="${svg('#c00')}" width="90"></div>
<div class="cart-item__infor"><div class="cart-item__details">
<a class="cart-item__name">${k.product_title}</a>
<dl>${k.variant_title !== 'Default Title' ? `<div class="product-option"><dt class="visually-hidden">Seçenek:</dt><dd>${k.variant_title}</dd></div>` : ''}${Object.entries(k.properties).filter(([a]) => !a.startsWith('_')).map(([a, v]) => `<div class="product-option"><dt class="visually-hidden">${a}:</dt><dd>${v}</dd></div>`).join('')}</dl>
<div class="product-option mt-1">birim</div></div>
<div class="cart-item__totals"><div class="cart-item__price-wrapper"><span class="price">${k.final_line_price}</span></div></div></div>
<quantity-input><input class="quantity__input" name="updates[]" value="${k.quantity}"></quantity-input>
<cart-remove-button><button type="button" class="cart-remove-button">Kaldır</button></cart-remove-button></div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${stil}</style><script>window.routes={cart_url:'/cart',cart_update_url:'/cart/update',cart_change_url:'/cart/change'};</script></head><body>
<cart-drawer><div class="drawer__inner"><cart-drawer-items><div class="liste">${sepet.items.map(satir).join('')}</div></cart-drawer-items></div></cart-drawer>
<script>${kod}</script></body></html>`;

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await (await t.newContext({ ...devices['iPhone 13'] })).newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.route('https://jantifox.test/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(sepet) });
  return r.fulfill({ contentType: 'text/html', body: html });
});
// Ürün sayfasında sepete eklerken kaydedilen çizim kiti
await s.addInitScript(([id, kit]) => localStorage.setItem('kisisel-sepet-cizim', JSON.stringify({ [id]: kit })), [T, {
  z: 1, g: svg('#1f2a44'), o: 1, y: { olcek: 2, sol: -50, ust: -50 },
  p: [{ u: svg('#f2c14e'), l: '40%', t: '40%', w: '6%', h: '8%', r: '', d: false, j: false }, { u: svg('#7fc8f8'), l: '50%', t: '50%', w: '6%', h: '8%', r: 'rotate(15deg)', d: true, j: false }]
}]);
await s.goto('https://jantifox.test/products/x');
await s.waitForSelector('.kp-sepet-icerik');

const baz = '#CartDrawer-Item-1';
// Görsel: tasarım önizlemesi, model fotoğrafı gizli
assert.equal(await s.locator(baz + ' .kp-sepet-mini').count(), 1);
assert.equal(await s.locator(baz + ' .kp-sepet-mini__parca').count(), 2);
assert.equal(await s.locator(baz + ' img.model').isVisible(), false, 'model fotoğrafı gizli');
// Etiket, ad, içerik özeti ve grup toplamı (çanta + patch'lerin indirimli satır fiyatları)
assert.equal(await s.locator(baz + ' .kp-sepet-rozet').textContent(), 'Kişiselleştirilmiş');
assert.equal(await s.locator(baz + ' .kp-sepet-icerik').textContent(), 'ECE · 7');
assert.equal(await s.locator(baz + ' .kp-sepet-toplam').textContent(), (2700 + 567.5 + 283.75 + 283.75 + 1700 + 567.5).toLocaleString('en-US', { minimumFractionDigits: 2 }) + 'TL');
assert.equal(await s.locator(baz + ' dl').isVisible(), false, 'özellik listesi yerine özet');
// Patch satırları varsayılan gizli; buton 4 patch (E ×2, C, 7)
const patchler = ['#CartDrawer-Item-2', '#CartDrawer-Item-3', '#CartDrawer-Item-4'];
for (const p of patchler) assert.equal(await s.locator(p).isVisible(), false, p + ' gizli');
assert.equal(await s.locator('[data-kp-patch-ac]').textContent(), "6 patch'i göster", 'aksesuar satırı patch sayılmaz, üzerindekiler sayılır');
// Aksesuar satırı görünür: "+ Kalem Kutusu Kırmızı ve tasarımı"; üzerindeki patch satırı patch'lerle birlikte gizli
assert.equal(await s.locator('#CartDrawer-Item-5').isVisible(), true);
assert.equal(await s.locator('#CartDrawer-Item-5 .kp-sepet-aks').textContent(), '+ Kalem Kutusu Kırmızı ve tasarımı');
assert.equal(await s.locator('#CartDrawer-Item-5 .cart-item__name').isVisible(), false);
assert.equal(await s.locator('#CartDrawer-Item-6').isVisible(), false);
await s.locator('[data-kp-patch-ac]').click();
for (const p of patchler) assert.equal(await s.locator(p).isVisible(), true, p + ' açıldı');
assert.equal(await s.locator('[data-kp-patch-ac]').textContent(), "Patch'leri gizle");
// Açılınca patch satırlarında tasarım özeti yok; patch adı (seçenek) görünür
const patchMetni = (await s.locator('#CartDrawer-Item-2').innerText()).replace(/\s+/g, ' ');
console.log('patch satırı:', patchMetni);
assert.doesNotMatch(patchMetni, /ECE \+ 7|Harf sırası|1, 3/);
assert.match(patchMetni, /Cool Alfabe Patch (Seçenek: )?E /);
await s.locator('[data-kp-patch-ac]').click();
assert.equal(await s.locator('#CartDrawer-Item-2').isVisible(), false, 'tekrar kapandı');
// Tasarım dışı ürün olduğu gibi
assert.equal(await s.locator('#CartDrawer-Item-7 img.model').isVisible(), true);
assert.equal(await s.locator('#CartDrawer-Item-7 .kp-sepet-icerik').count(), 0);
await s.screenshot({ path: '/tmp/cekmece.png' });
assert.deepEqual(hatalar, []);
await t.close();
console.log('ÇEKMECE E2E TAMAM');
