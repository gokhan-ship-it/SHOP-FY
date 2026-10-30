// Sepette Sweatshirt kombini (2026-10-30, v5: 1 sweatshirt + 4 patch ya da 4'lü set): hediye Tshirt grubun son satırı
// ("🎁 Hediye Tshirt"), rozet "Sweatshirt kombini", kombin satırlarında adet kutusu yok ve adet değiştirilemez. Set
// satırı içindeki patch sayısı kadar sayılır (_patch_sayisi). Ekstra patch silinince kombin bozulmaz (onay yok); set
// silinince kombin bozulacağı için onaydan sonra set ve Tshirt birlikte çıkar; sweatshirt silinirse grup (Tshirt dahil)
// çıkar; bozuk kombinde (sweatshirt yok) uyarı ve "Tshirt'ü çıkar".
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kombin-sepet-e2e.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kod = readFileSync(new URL('../../assets/kisisel-sepet.js', import.meta.url), 'utf8');

const K = 'TKMB';
const oz = (rol, ek = {}) => ({ 'Tasarım': 'AB', _tasarim_id: K, _tasarim_rol: rol, _kombin: K, ...ek });
const kalem = (key, variant_id, product_title, variant_title, properties, quantity = 1) => ({ key, variant_id, product_title, variant_title, quantity, properties, final_line_price: 0 });
const tamSepet = () => ({ items: [
  kalem('k-t', 51790886666526, 'Pudra Pembe Tshirt', '4-5 yaş', { 'Kombin': 'Hediye Tshirt', _tasarim_id: K, _tasarim_rol: 'hediye', _kombin: K, _adet_birim: '1' }),
  kalem('k-b', 59857935335710, 'Football Lover Patch Seti', 'Default Title', oz('patch', { _adet_birim: '1', _patch_sayisi: '4' })),
  kalem('k-a', 49646794735902, 'Futbol Topu Patch', 'Default Title', oz('patch', { _adet_birim: '1' })),
  kalem('k-s', 50171329544478, 'İndigo Sweatshirt', '3-5', oz('baz', { _tasarim_konum: '{"v":2,"p":[]}' })),
  kalem('k-x', 9, 'Şapka', 'Default Title', {})
] });
let sepet = tamSepet();
const satir = (k, i) => `<div id="CartDrawer-Item-${i + 1}" class="cart-item"><a class="cart-item__name">${k.product_title} ${k.variant_title}</a>${Object.keys(k.properties).filter((a) => a[0] !== '_').map((a) => `<dl><dt>${a}:</dt><dd>${k.properties[a]}</dd></dl>`).join('')}
<quantity-input><input class="quantity__input" name="updates[]" data-index="${i + 1}" value="${k.quantity}"></quantity-input>
<cart-remove-button data-index="${i + 1}"><button type="button" class="cart-remove-button">Sil</button></cart-remove-button></div>`;
const html = () => `<!doctype html><html><head><meta charset="utf-8"><script>window.routes={cart_url:'/cart',cart_update_url:'/cart/update',cart_change_url:'/cart/change'};window.KisiselKombinAyar={dahil:4};</script>
<style>.kp-sepet-gizli{display:none!important}.cart-item.kp-sepet-kombin quantity-input{display:none!important}</style></head><body>
<cart-drawer><div class="drawer__inner"><cart-drawer-items><div class="liste">${sepet.items.map(satir).join('')}</div></cart-drawer-items></div></cart-drawer>
<script>${kod}</script></body></html>`;

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await (await t.newContext({ ...devices['iPhone 13'] })).newPage();
const istekler = [];
const onaylar = [];
s.on('pageerror', (e) => { throw e; });
s.on('dialog', (d) => { onaylar.push(d.message()); d.accept(); });
await s.route('https://jantifox.test/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(sepet) });
  if (u.pathname === '/cart/update.js' || u.pathname === '/cart/change.js') {
    istekler.push([u.pathname, JSON.parse(r.request().postData())]);
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify(sepet) });
  }
  return r.fulfill({ contentType: 'text/html', body: html() });
});
const ac = async () => {
  await s.goto('https://jantifox.test/cart-cekmece');
  await s.waitForSelector('.kp-sepet-rozet, .kp-sepet-kombin-uyari');
  await s.waitForTimeout(150);
};

// 1) Grup: sweatshirt, patch'ler, en sonda Tshirt; rozet, hediye etiketi, adet kutuları gizli
await ac();
const sira = await s.$$eval('.liste > .cart-item', (l) => l.map((x) => x.id));
assert.deepEqual(sira.slice(0, 4), ['CartDrawer-Item-4', 'CartDrawer-Item-2', 'CartDrawer-Item-3', 'CartDrawer-Item-1'], 'Tshirt grubun sonunda');
assert.equal(await s.locator('#CartDrawer-Item-4 .kp-sepet-rozet').textContent(), 'Sweatshirt kombini');
assert.equal(await s.locator('#CartDrawer-Item-1 .kp-sepet-aks').textContent(), '🎁 Hediye Tshirt');
assert.ok(await s.locator('#CartDrawer-Item-1').isVisible(), 'Tshirt satırı görünür');
assert.equal(await s.locator('.kp-sepet-kombin quantity-input:visible').count(), 0, 'kombin satırlarında adet yok');
assert.ok(await s.locator('#CartDrawer-Item-5 quantity-input').isVisible(), 'diğer ürünün adedi var');
assert.equal(await s.locator('.kp-sepet-kombin-uyari').count(), 0, 'kombin sağlam: uyarı yok');

// 2) Sweatshirt adedi değiştirilemez
await s.locator('#CartDrawer-Item-4 input').evaluate((i) => { i.value = '2'; i.dispatchEvent(new Event('change', { bubbles: true })); });
await s.waitForTimeout(200);
assert.equal(istekler.length, 0, 'adet isteği yok');
assert.equal(await s.locator('#CartDrawer-Item-4 input').inputValue(), '1');

// 3) Ekstra tekli patch silinince kombin bozulmaz (set 4 patch): kombin onayı yok, Tshirt kalır
// Patch satırları "5 patch'i göster" ile açılır (set 4 + tekli 1)
assert.equal(await s.locator('[data-kp-patch-ac]').textContent(), '5 patch\'i göster');
await s.locator('[data-kp-patch-ac]').click();
const onayOnce = onaylar.length;
await s.locator('#CartDrawer-Item-3 .cart-remove-button').click();
await s.waitForTimeout(500);
assert.ok(onaylar.slice(onayOnce).every((o) => !/Hediye Tshirt/.test(o)), 'kombin onayı yok');
assert.deepEqual(istekler[0], ['/cart/update.js', { updates: { 'k-a': 0 } }]);
assert.ok(!istekler.some((x) => x[1].updates && 'k-t' in x[1].updates), 'Tshirt kalır');
istekler.length = 0;

// 3b) Set silinince kombin bozulur (1 patch kalır): onay, set + Tshirt çıkar, sweatshirt özeti güncellenir
sepet = tamSepet();
await ac();
await s.locator('[data-kp-patch-ac]').click();
await s.locator('#CartDrawer-Item-2 .cart-remove-button').click();
await s.waitForTimeout(500);
assert.match(onaylar.pop(), /Hediye Tshirt için 1 sweatshirt \+ 4 patch gerekiyor\. Bu patch'i silersen hediye Tshirt de sepetten çıkar/);
assert.deepEqual(istekler[0], ['/cart/update.js', { updates: { 'k-b': 0 } }]);
assert.equal(istekler[1][0], '/cart/change.js');
assert.equal(istekler[1][1].id, 'k-s');
assert.deepEqual(istekler[2], ['/cart/update.js', { updates: { 'k-t': 0 } }]);
istekler.length = 0;

// 4) Sweatshirt silinince: kombin onayı, grubun tamamı (Tshirt dahil)
sepet = tamSepet();
await ac();
await s.locator('#CartDrawer-Item-4 .cart-remove-button').click();
await s.waitForTimeout(400);
assert.match(onaylar.pop(), /Sweatshirt'ü silersen kombindeki patch'ler ve hediye Tshirt de sepetten çıkar/);
assert.deepEqual(istekler.pop(), ['/cart/update.js', { updates: { 'k-s': 0, 'k-t': 0, 'k-b': 0, 'k-a': 0 } }]);
istekler.length = 0;

// 5) Bozuk kombin (sweatshirt başka yoldan silinmiş): Tshirt satırında uyarı ve "Tshirt'ü çıkar"
sepet = tamSepet();
sepet.items = sepet.items.filter((k) => k.key !== 'k-s');
await ac();
assert.match(await s.locator('#CartDrawer-Item-1 .kp-sepet-kombin-uyari').textContent(), /Hediye Tshirt için 1 sweatshirt \+ 4 patch gerekiyor/);
await s.locator('[data-kp-hediye-cikar]').click();
await s.waitForTimeout(300);
assert.deepEqual(istekler.pop(), ['/cart/update.js', { updates: { 'k-t': 0 } }]);
console.log('KOMBİN SEPET E2E TAMAM');
await t.close();
