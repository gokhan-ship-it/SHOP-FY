// Ayrılmış harfler: ayrıyken yazılan yeni harf boş bir yere konur; iki harf üst üste gelince ikisi de kırmızı ve "!",
// Özet'te listelenir ve düzeltilmeden sepete eklenmez.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node ayri-harf-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const ana = '.kp-editor:not(.kp-editor--alt)';
const cdp = await baglam.newCDPSession(s);
const ustUste = () => s.evaluate((q) => {
  const k = [...document.querySelectorAll(q + ' .kp-onizleme .kp-parca--letter')].map((x) => ({ uid: x.getAttribute('data-uid'), r: x.getBoundingClientRect(), h: x.classList.contains('kp-parca--hatali') }));
  const ust = [];
  for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
    const a = k[i].r, b = k[j].r;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) ust.push([k[i].uid, k[j].uid, k[i].h, k[j].h]);
  }
  return { ust, hatali: k.filter((x) => x.h).map((x) => x.uid) };
}, ana);

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.waitForTimeout(600);
const girdi = s.locator('#kp-isim');
await girdi.click();
await girdi.pressSequentially('gok', { delay: 40 });
await girdi.blur();
await s.locator(ana + ' [data-kp-harf-mod]').click();
// 1) Ayrıyken yazılan yeni harfler (H, A, F) diğer harflerin üstüne değil boş yere konur
await girdi.click();
await girdi.press('End');
await girdi.pressSequentially('haf', { delay: 40 });
await girdi.blur();
await s.waitForTimeout(200);
assert.equal(await girdi.inputValue(), 'GOKHAF');
let d = await ustUste();
assert.deepEqual(d, { ust: [], hatali: [] }, 'yeni harfler boş yere: ' + JSON.stringify(d));

// 2) F'yi G'nin üstüne sürükle: ikisi de kırmızı ve "!" (son sürüklenen F de, altta kalan G de)
const surukle = async (q, hedef) => {
  const a = await s.locator(q).boundingBox(); const h = await s.locator(hedef).boundingBox();
  const x = a.x + a.width / 2, y = a.y + a.height / 2, X = h.x + h.width / 2 - 3, Y = h.y + h.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (X - x) * i / 8, y: y + (Y - y) * i / 8 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(150);
};
await surukle(ana + ' .kp-onizleme [data-uid="harf-5"]', ana + ' .kp-onizleme [data-uid="harf-0"]');
d = await ustUste();
assert.deepEqual(d.ust.map((x) => x.slice(0, 2).sort().join('×')), ['harf-0×harf-5']);
assert.deepEqual(d.hatali.sort(), ['harf-0', 'harf-5'], 'ikisi de işaretli');
assert.deepEqual(await s.$$eval(ana + ' .kp-onizleme .kp-parca--hatali', (l) => l.map((e) => getComputedStyle(e, '::after').content)), ['"!"', '"!"']);
assert.match(await s.locator(ana + ' [data-kp-yer-uyari]').innerText(), /üst üste geliyor/);

// 3) Özet'te listelenir; düzeltmeden sepete eklenmez; "Hepsini düzelt" ile düzelir ve eklenir
await s.locator(ana + ' [data-kp-ileri]').click();
assert.equal(await s.locator(ana + ' [data-kp-ozet-yer]').isVisible(), true);
assert.match(await s.locator(ana + ' [data-kp-ozet-yer]').innerText(), /üst üste geliyor/);
assert.equal(await s.locator(ana + ' [data-kp-ileri]').getAttribute('aria-disabled'), 'true');
await s.locator(ana + ' [data-kp-ileri]').click({ force: true });
assert.equal(eklenen, null, 'sepete eklenmedi');
await s.locator(ana + ' [data-kp-ozet-yer] [data-kp-hepsini-duzelt]').click();
await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
assert.deepEqual(await ustUste(), { ust: [], hatali: [] });
await s.locator(ana + ' [data-kp-ileri]').click();
await s.locator(ana + ' [data-kp-ileri]').click();
await s.waitForURL('**/cart');
assert.ok(eklenen && eklenen.items.length > 1, 'düzeltince sepete eklendi');

assert.deepEqual(hatalar, []);
await t.close();
console.log('AYRI HARF E2E TAMAM');
