// Kaydırınca küçülen önizleme: İkon / Aksesuar / Hazır setler listesi kaydırılınca önizleme ~140 px'e küçülür,
// "Büyüt", en üste dönme ya da önizlemedeki patch'e dokunma tam boyuta döndürür; Yazı adımında küçülmez.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kucuk-onizleme-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// Kısa ekranlı telefon: listeler kayacak kadar uzun
const baglam = await t.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 560 } });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const ed = '.kp-editor:not(.kp-editor--alt)';
const kucuk = () => s.evaluate((q) => document.querySelector(q).classList.contains('kp-editor--kucuk'), ed);
const yukseklik = () => s.evaluate((q) => Math.round(document.querySelector(q + ' .kp-onizleme__ic').getBoundingClientRect().height), ed);
const gorunur = (q) => s.locator(ed + ' ' + q).first().isVisible();
const kaydir = async (dy) => {
  const b = await s.locator(ed + ' .kp-kaydir').boundingBox();
  await s.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await s.mouse.wheel(0, dy);
  await s.waitForTimeout(500);
};
const cdp = await baglam.newCDPSession(s);
const dokun = (tip, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tip, touchPoints: tip === 'touchEnd' ? [] : [{ x, y, id: 0 }] });

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('#kp-isim').fill('ece');
await s.locator('#kp-isim').blur();
const tam = await yukseklik();
assert.ok(tam > 180, 'tam boy: ' + tam);
assert.equal(await gorunur('[data-kp-gorunum]'), true, 'Tüm çantayı gör görünür');

// 1) Yazı adımında küçülmez
await kaydir(200);
assert.equal(await kucuk(), false, 'Yazı adımında küçülmez');

// 2) İkon listesi kaydırılınca küçülür: ~140 px, Tüm çantayı gör gizli, geri al/yinele küçük, sağ altta Büyüt
await s.locator(ed + ' [data-kp-adim="ikon"]').click();
await kaydir(120);
assert.equal(await kucuk(), true, 'ikon listesi kayınca küçülür');
assert.ok(Math.abs((await yukseklik()) - 140) <= 2, 'yaklaşık 140 px: ' + (await yukseklik()));
assert.equal(await gorunur('[data-kp-gorunum]'), false, 'Tüm çantayı gör gizli');
// Eklenenler satırı küçük önizlemenin de hemen altında
const [icK, satirK] = await s.evaluate((q) => [' .kp-onizleme__ic', ' .kp-satir'].map((x) => document.querySelector(q + x).getBoundingClientRect()).map((r) => ({ t: r.top, b: r.bottom, h: r.height })), ed);
assert.ok(satirK.h > 30 && satirK.t >= icK.b && satirK.t - icK.b < 12, 'satır önizlemenin hemen altında: ' + JSON.stringify([icK, satirK]));
assert.equal(await gorunur('[data-kp-buyut]'), true);
// Araçlar küçük önizlemede de solunda, orantılı küçük (yalnızca simge ve rozet), önizlemeden uzun değil
const aracK = await s.evaluate((q) => {
  const a = document.querySelector(q + ' [data-kp-araclar]').getBoundingClientRect(); const o = document.querySelector(q + ' .kp-onizleme__ic').getBoundingClientRect();
  const d = document.querySelector(q + ' .kp-arac-dugme').getBoundingClientRect();
  return { solda: a.right <= o.left, ust: Math.abs(a.top - o.top) < 2, sigar: a.bottom <= o.bottom + 1, d: [Math.round(d.width), Math.round(d.height)], adGizli: getComputedStyle(document.querySelector(q + ' .kp-arac-dugme__ad')).display === 'none' };
}, ed);
assert.deepEqual(aracK, { solda: true, ust: true, sigar: true, d: [42, 42], adGizli: true });
const [ic, buyut, geri] = await s.evaluate((q) => [' .kp-onizleme__ic', ' [data-kp-buyut]', ' [data-kp-geri-al]'].map((x) => document.querySelector(q + x).getBoundingClientRect()).map((r) => ({ r: r.right, b: r.bottom, w: r.width })), ed);
assert.ok(ic.r - buyut.r < 12 && ic.b - buyut.b < 12, 'Büyüt sağ altta');
assert.ok(geri.w <= 26, 'geri al küçük: ' + geri.w);
// Çanta ve patch'ler orantılı: harfler önizlemenin içinde kalır
assert.ok(await s.evaluate((q) => { const o = document.querySelector(q + ' .kp-gorunum').getBoundingClientRect(); return [...document.querySelectorAll(q + ' .kp-parca--letter')].every((p) => { const r = p.getBoundingClientRect(); return r.top >= o.top - 1 && r.bottom <= o.bottom + 1; }); }, ed));

// 3) Küçükken patch eklenirse küçük kalır, eklenen patch vurgulanır
await s.locator(ed + ' [data-kp-ikon]').first().click();
assert.equal(await kucuk(), true, 'ekleyince küçük kalır');
assert.equal(await s.locator(ed + ' .kp-parca--yeni').count(), 1, 'eklenen vurgulanır');

// 4) En üste kaydırınca tam boyut
await kaydir(-2000);
assert.equal(await kucuk(), false, 'en üste dönünce büyür');
assert.equal(await yukseklik(), tam);

// 5) Büyüt düğmesi
await kaydir(120);
assert.equal(await kucuk(), true);
await s.locator(ed + ' [data-kp-buyut]').click();
assert.equal(await kucuk(), false, 'Büyüt');
await s.waitForTimeout(500);

// 6) Önizlemedeki bir patch'e dokununca tam boyut
await kaydir(120);
assert.equal(await kucuk(), true);
const p = await s.locator(ed + ' .kp-parca--letter').first().boundingBox();
await dokun('touchStart', p.x + p.width / 2, p.y + p.height / 2);
await dokun('touchMove', p.x + p.width / 2 + 8, p.y + p.height / 2);
await dokun('touchEnd');
await s.waitForTimeout(400);
assert.equal(await kucuk(), false, 'patch\'e dokununca büyür');

// 7) Aksesuar listesinde de (kayacak kadar uzunsa); Metin aracına geçince tam boyut
await s.locator(ed + ' [data-kp-adim="aksesuar"]').click();
const kayabilir = await s.evaluate((q) => { const k = document.querySelector(q + ' .kp-kaydir'); return k.scrollHeight - k.clientHeight; }, ed);
if (kayabilir > 40) {
  await kaydir(120);
  await s.waitForTimeout(100);
  assert.equal(await kucuk(), true, 'aksesuar listesi kayınca da küçülür');
} else console.log('aksesuar listesi kaymıyor (' + kayabilir + ' px), küçülme denetimi atlandı');
await s.locator(ed + ' [data-kp-adim="yazi"]').click();
assert.equal(await kucuk(), false, 'Yazı adımında tam boyut');

console.log('hatalar:', hatalar);
assert.deepEqual(hatalar, []);
await t.close();
console.log('KÜÇÜK ÖNİZLEME E2E TAMAM');
