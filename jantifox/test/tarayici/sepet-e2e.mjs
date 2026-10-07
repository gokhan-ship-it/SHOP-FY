// Sepet gruplaması: sıralama, çanta silme (grup), patch silme (özet güncelleme), adet orantısı
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kod = readFileSync(new URL('../../assets/kisisel-sepet.js', import.meta.url), 'utf8');

const T = 'TABC';
const ozel = (rol, ek = {}) => ({ 'Tasarım': 'ECE + 7', _tasarim_id: T, _tasarim_rol: rol, ...ek });
// Shopify sırası: en son eklenen üstte; burada gruplar karışık geliyor
const sepet = { items: [
  { key: 'k-e', variant_id: 1004, quantity: 2, variant_title: 'E', product_title: 'Cool Alfabe Patch', properties: ozel('patch', { 'Harf sırası': '1, 3', _adet_birim: '2' }) },
  { key: 'k-diger', variant_id: 9, quantity: 1, variant_title: 'Default Title', product_title: 'Şapka', properties: {} },
  { key: 'k-baz', variant_id: 51795696943390, quantity: 1, variant_title: 'Default Title', product_title: 'Kanvas Lacivert Tote Çanta', properties: ozel('baz', { 'İsim': 'ECE', _tasarim_konum: '{"v":1,"p":[{"v":1004},{"v":1002},{"v":1004},{"v":2007}]}' }) },
  { key: 'k-c', variant_id: 1002, quantity: 1, variant_title: 'C', product_title: 'Cool Alfabe Patch', properties: ozel('patch', { 'Harf sırası': '2', _adet_birim: '1' }) },
  { key: 'k-7', variant_id: 2007, quantity: 1, variant_title: '7', product_title: 'Janti Rakam Patch', properties: ozel('patch', { _adet_birim: '1' }) }
] };
const satir = (k, i) => `<div id="CartDrawer-Item-${i + 1}" class="cart-item"><a class="cart-item__name">${k.product_title} ${k.variant_title}</a>
<quantity-input><input class="quantity__input" name="updates[]" data-index="${i + 1}" value="${k.quantity}"></quantity-input>
<cart-remove-button data-index="${i + 1}"><button type="button" class="cart-remove-button">Sil</button></cart-remove-button></div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><script>window.routes={cart_url:'/cart',cart_update_url:'/cart/update',cart_change_url:'/cart/change'};</script></head><body>
<cart-drawer><div class="drawer__inner"><cart-drawer-items><div class="liste">${sepet.items.map(satir).join('')}</div></cart-drawer-items></div></cart-drawer>
<script>document.addEventListener('click',function(e){if(e.target.closest('cart-remove-button'))window.__tema=(window.__tema||0)+1;});</script>
<script>${kod}</script></body></html>`;

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await (await t.newContext({ ...devices['iPhone 13'] })).newPage();
const istekler = [];
s.on('pageerror', (e) => console.log('ERR', e.message));
s.on('dialog', (d) => d.accept());
await s.route('https://jantifox.test/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(sepet) });
  if (u.pathname === '/cart/update.js' || u.pathname === '/cart/change.js') {
    istekler.push([u.pathname, JSON.parse(r.request().postData())]);
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify(sepet) });
  }
  if (u.searchParams.get('sections')) return r.fulfill({ contentType: 'application/json', body: '{}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
await s.goto('https://jantifox.test/products/x');
await s.waitForSelector('.kp-sepet-rozet');
const sira = await s.$$eval('.liste > .cart-item', (l) => l.map((x) => x.id));
console.log('sıra:', sira);
assert.deepEqual(sira, ['CartDrawer-Item-2', 'CartDrawer-Item-3', 'CartDrawer-Item-1', 'CartDrawer-Item-4', 'CartDrawer-Item-5']);
assert.equal(await s.locator('#CartDrawer-Item-1 quantity-input').count(), 1);

// Çanta adedi 2 → patch'ler orantılı
await s.locator('#CartDrawer-Item-3 input').fill('2');
await s.locator('#CartDrawer-Item-3 input').dispatchEvent('change');
await s.waitForTimeout(300);
assert.deepEqual(istekler.pop(), ['/cart/update.js', { updates: { 'k-baz': 2, 'k-e': 4, 'k-c': 2, 'k-7': 2 } }]);
istekler.length = 0;

// Rakam patch'ini sil → patch silinir, çanta özeti güncellenir
await s.locator('#CartDrawer-Item-5 .cart-remove-button').tap();
await s.waitForTimeout(400);
const [sil, degistir] = istekler.splice(0).slice(-2); // girdi blur'u ek bir change üretebilir (sahte sepet güncellenmiyor)
assert.deepEqual(sil, ['/cart/update.js', { updates: { 'k-7': 0 } }]);
assert.equal(degistir[0], '/cart/change.js');
assert.equal(degistir[1].properties['Tasarım'], 'ECE');
assert.equal(JSON.parse(degistir[1].properties._tasarim_konum).p.length, 3);

// Çantayı sil → grup silinir, diğer ürün kalır
await s.locator('#CartDrawer-Item-3 .cart-remove-button').tap();
await s.waitForTimeout(300);
assert.deepEqual(istekler.pop(), ['/cart/update.js', { updates: { 'k-baz': 0, 'k-e': 0, 'k-c': 0, 'k-7': 0 } }]);
assert.equal(await s.evaluate(() => window.__tema || 0), 0, 'tema sil dinleyicisi çalışmamalı');

// Tasarım dışı ürün temaya bırakılır
await s.locator('#CartDrawer-Item-2 .cart-remove-button').tap();
assert.equal(await s.evaluate(() => window.__tema || 0), 1);
await t.close();
console.log('SEPET E2E TAMAM');
