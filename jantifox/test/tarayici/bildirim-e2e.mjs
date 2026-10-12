// Bildirimler: 4,5 sn (eylemli "Geri al" 6 sn); dokununca / fare üstündeyken kaybolmaz, bırakınca süre baştan;
// alttan kayarak gelir (~250 ms), aşağı kayarak söner (~200 ms); sıraya girer (kazanma > öneri > diğer), tekrar etmez.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node bildirim-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.route('https://jantifox.test/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 500, body: '' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const ana = '.kp-editor:not(.kp-editor--alt)';
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.waitForTimeout(500);
const durum = () => s.evaluate((q) => {
  const b = document.querySelector(q + ' [data-kp-bildirim]'); const k = document.querySelector(q + ' [data-kp-kazanc]');
  const e = document.querySelector('kisisel-kart').editor;
  return { diger: b.hidden ? null : b.innerText.replace(/\s+/g, ' ').trim(), kazanc: k.hidden ? null : k.innerText.replace(/\s+/g, ' ').trim(), sira: (e.bildirimSirasi || []).map((x) => x.tur + ':' + x.metin) };
}, ana);
const bekleGizli = (q, ms) => s.waitForFunction((q) => document.querySelector(q).hidden, q, { timeout: ms });

// 1) Sıra: A gösterilirken gelen B (Geri al'lı) ve kampanya kazanma sıraya girer; kazanma önce gelir; A tekrar eklenmez
const t0 = Date.now();
await s.evaluate(() => {
  const e = document.querySelector('kisisel-kart').editor;
  e.bildir('A bildirimi');
  e.bildir('B bildirimi', { eylem: { yazi: 'Geri al', fn: function () { window.__geriAl = 1; } } });
  e.bildirimEkle({ tur: 'kazanc', metin: '🎉 Test indirimi · −60 TL' });
  e.bildir('A bildirimi');
});
let d = await durum();
assert.deepEqual(d, { diger: 'A bildirimi', kazanc: null, sira: ['kazanc:🎉 Test indirimi · −60 TL', 'diger:B bildirimi'] }, 'üst üste binmez, öncelik sırası, tekrar yok');
// Giriş animasyonu ~250 ms (alttan kayarak)
assert.deepEqual(await s.evaluate((q) => { const c = getComputedStyle(document.querySelector(q + ' [data-kp-bildirim]')); return [c.animationName.split(',')[0].trim(), c.animationDuration.split(',')[0].trim()]; }, ana), ['kp-bildirim-gir', '0.25s']);

// 2) Fare üstündeyken kaybolmaz; bırakınca süre baştan (4,5 sn)
await s.waitForTimeout(1000);
await s.hover(ana + ' [data-kp-bildirim]');
await s.waitForTimeout(5000);
assert.equal((await durum()).diger, 'A bildirimi', 'fare üstündeyken kalır');
await s.mouse.move(5, 5);
const birakildi = Date.now();
await s.waitForTimeout(4200);
assert.equal((await durum()).diger, 'A bildirimi', 'bırakınca süre baştan başlar');
// Çıkış animasyonu ~200 ms (aşağı kayarak söner)
await s.waitForFunction((q) => document.querySelector(q).classList.contains('kp-bildirim-cikis'), ana + ' [data-kp-bildirim]', { timeout: 2000 });
assert.deepEqual(await s.evaluate((q) => { const c = getComputedStyle(document.querySelector(q + ' [data-kp-bildirim]')); return [c.animationName, c.animationDuration]; }, ana), ['kp-bildirim-cik', '0.2s']);
const kapanis = Date.now() - birakildi;
assert.ok(kapanis > 4300 && kapanis < 5200, 'bırakıldıktan ~4,5 sn sonra: ' + kapanis);
await bekleGizli(ana + ' [data-kp-bildirim]', 1000);

// 3) Sıradaki: önce kampanya kazanma (4,5 sn), sonra B
await s.waitForFunction((q) => !document.querySelector(q).hidden, ana + ' [data-kp-kazanc]', { timeout: 1000 });
d = await durum();
assert.equal(d.kazanc, '🎉 Test indirimi · −60 TL');
assert.equal(d.diger, null, 'aynı anda tek bildirim');
const k0 = Date.now();
await bekleGizli(ana + ' [data-kp-kazanc]', 6000);
const kSure = Date.now() - k0;
assert.ok(kSure > 4400 && kSure < 5200, 'kazanma bildirimi ~4,5 sn: ' + kSure);

// 4) "Geri al"lı bildirim 6 sn; dokunup tutunca kaybolmaz, bırakınca süre baştan
await s.waitForFunction((q) => /B bildirimi/.test(document.querySelector(q).textContent) && !document.querySelector(q).hidden, ana + ' [data-kp-bildirim]', { timeout: 1000 });
const b0 = Date.now();
await s.waitForTimeout(5300);
assert.equal((await durum()).diger, 'B bildirimi Geri al', '6 sn dolmadan kaybolmaz');
await bekleGizli(ana + ' [data-kp-bildirim]', 1500);
const bSure = Date.now() - b0;
assert.ok(bSure > 5900 && bSure < 6800, 'Geri al\'lı bildirim ~6 sn: ' + bSure);
// Dokunup tutma
await s.evaluate(() => document.querySelector('kisisel-kart').editor.bildir('C bildirimi'));
const kutu = await s.locator(ana + ' [data-kp-bildirim]').boundingBox();
const cdp = await baglam.newCDPSession(s);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: kutu.x + 10, y: kutu.y + kutu.height / 2 }] });
await s.waitForTimeout(5500);
assert.equal((await durum()).diger, 'C bildirimi', 'dokunurken kalır');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await s.waitForTimeout(4000);
assert.equal((await durum()).diger, 'C bildirimi', 'bırakınca süre baştan');
await bekleGizli(ana + ' [data-kp-bildirim]', 2000);
console.log('toplam süre:', Math.round((Date.now() - t0) / 1000), 'sn');

assert.deepEqual(hatalar, []);
await t.close();
console.log('BİLDİRİM E2E TAMAM');
