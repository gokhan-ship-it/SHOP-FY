// Kampanya simülasyonu (Storefront API cartCreate) sayfanın fetch / XMLHttpRequest'inden geçmez: Shopify'ın Web Pixels
// Manager'ı bunları sarıp yanıttaki extensions.cart_changelog'u "ürün sepete eklendi" olarak yayınlar (Meta'ya AddToCart).
// Test, sayfanın fetch ve XHR'ını WPM gibi sarar: editör açılıp yazı ve ikon eklenince simülasyon istekleri sunucuya
// gider ama sarılmış fetch / XHR'dan hiçbiri geçmez; gerçek sepete ekleme (/cart/add.js) ise sarılmış fetch'ten geçer.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node izsiz-simulasyon-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
// WPM'in yaptığı gibi: sayfanın fetch ve XHR'ı sarılır, geçen adresler Node'a bildirilir (sayfa değişse de kalır)
const sarili = [];
await baglam.exposeFunction('__sariliKaydet', (x) => { sarili.push(x); });
await baglam.addInitScript(() => {
  // WPM yalnızca sayfanın ana penceresine yüklenir (Playwright init betiği her çerçevede çalışır)
  if (window.top !== window) return;
  const f = window.fetch;
  window.fetch = function (u) { window.__sariliKaydet('fetch ' + (u && u.url ? u.url : String(u))); return f.apply(this, arguments); };
  const ac = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { window.__sariliKaydet('xhr ' + String(u)); return ac.apply(this, arguments); };
});
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let sunucuya = 0;
let eklenen = null;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (/^\/api\/[0-9-]+\/graphql\.json$/.test(url.pathname)) {
    sunucuya++;
    return r.fulfill({ contentType: 'application/json', body: '{"data":null}' });
  }
  if (url.pathname === '/cart/add.js') { eklenen = JSON.parse(r.request().postData()); return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }); }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
await s.goto('https://jantifox.test/products/x');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('.kp-onizleme .kp-sahne').waitFor();
await s.locator('#kp-isim').fill('ECE');
await s.waitForTimeout(1200);
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await s.waitForTimeout(1500);
assert.ok(sunucuya >= 1, 'simülasyon istekleri sunucuya gitti: ' + sunucuya);
assert.deepEqual(sarili.filter((x) => /\/api\/[0-9-]+\/graphql/.test(x)), [], 'simülasyon sarılmış fetch / XHR\'dan geçmedi');
// Gerçek sepete ekleme izlenen yoldan
while (!(await s.locator('.kp-ozet').isVisible().catch(() => false))) { await s.locator('[data-kp-ileri]').click(); await s.waitForTimeout(300); }
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
assert.ok(eklenen && eklenen.items.length >= 2, 'sepete eklendi');
assert.ok(sarili.some((x) => /\/cart\/add\.js/.test(x)), 'gerçek sepete ekleme izlenen fetch\'ten');
assert.deepEqual(sarili.filter((x) => /\/api\/[0-9-]+\/graphql/.test(x)), [], 'sepete eklerken de simülasyon izlenen yoldan geçmedi');
assert.deepEqual(hatalar, []);
await t.close();
console.log('İZSİZ SİMÜLASYON E2E TAMAM', { sunucuya });
