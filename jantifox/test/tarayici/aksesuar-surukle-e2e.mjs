// Çantadaki ya da kenardaki bir patch aksesuarın Velcro yüzeyine sürüklenince aksesuarın tasarımına geçer.
// Sürüklerken aksesuar vurgulanır; bildirimde "Geri al" (tek adım, Yinele geri getirir).
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node aksesuar-surukle-e2e.mjs  (önce: node sayfa-uret.mjs)
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
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const ana = '.kp-editor:not(.kp-editor--alt)';
const metin = async (q) => (await s.locator(q).first().innerText()).replace(/\s+/g, ' ').trim();
const cipler = () => s.$$eval(ana + ' .kp-cip__ad', (b) => b.map((x) => x.textContent));
const cdp = await baglam.newCDPSession(s);
const dokun = (tip, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tip, touchPoints: tip === 'touchEnd' ? [] : [{ x, y, id: 0 }] });
const surukle = async (x0, y0, x1, y1, ara) => {
  await dokun('touchStart', x0, y0);
  for (let i = 1; i <= 10; i++) await dokun('touchMove', x0 + ((x1 - x0) * i) / 10, y0 + ((y1 - y0) * i) / 10);
  if (ara) await ara();
  await dokun('touchEnd');
  await s.waitForTimeout(150);
};
const merkez = async (q) => { const b = await s.locator(q).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const kenarSayisi = () => s.locator(ana + ' [data-kp-kenar-grup]').count();
const aksIc = () => s.locator(ana + ' .kp-aks__parca').count();

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
if (await s.locator(ana + ' [data-kp-adim="ozet"][aria-current]').count()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
await s.locator(ana + ' [data-kp-adim="ikon"]').click();
await s.locator(ana + ' [data-kp-kategori="Spor"]').click();
await s.locator(ana + ' [data-kp-ikon="2"]').click();
if (await s.locator(ana + ' [data-kp-adim="ozet"][aria-current]').count()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
// Düz ekle: kalem kutusu alanın büyük kısmını kaplar, ikon kenara alınır
await s.locator('[data-kp-aks-duz="9101"]').click();
assert.equal(await kenarSayisi(), 1);
const toplam0 = await metin(ana + ' [data-kp-toplam]');
if (await s.locator(ana + ' [data-kp-secim-kaldir]').isVisible()) await s.locator(ana + ' [data-kp-secim-kaldir]').click();

// 1) Kenardan aksesuarın üstüne: aksesuarın tasarımına geçer
const oge = await merkez(ana + ' [data-kp-kenar-grup]');
const aks = await merkez(ana + ' .kp-parca--aksesuar');
await surukle(oge[0], oge[1], aks[0], aks[1]);
assert.equal(await kenarSayisi(), 0, 'kenardan çıktı');
assert.equal(await aksIc(), 1, 'kalem kutusunun üzerinde');
assert.deepEqual(await cipler(), ['Kalem Kutusu Kırmızı']);
assert.equal(await metin(ana + ' [data-kp-bildirim]'), 'Futbol Topu, kalem kutusu tasarımına eklendi. Geri al');
assert.equal(toplam0, '4.700 TL', 'kenardaki fiyata dahil değil');
assert.equal(await metin(ana + ' [data-kp-toplam]'), '5.030 TL', 'aksesuara geçince fiyata eklenir');
assert.equal(await s.locator(ana + ' .kp-parca--hatali').count(), 0);
const tas = await s.evaluate(() => document.querySelector('kisisel-kart').editor.t);
assert.equal(tas.parcalar.length, 0);
assert.equal(tas.aksesuarlar[0].tasarim.parcalar.length, 1);

// 2) Geri al → kenara döner; Yinele → yine aksesuarda
await s.locator(ana + ' [data-kp-bildirim-eylem]').click();
assert.equal(await kenarSayisi(), 1);
assert.equal(await aksIc(), 0);
await s.locator(ana + ' [data-kp-yinele]').click();
assert.equal(await aksIc(), 1);
await s.locator(ana + ' [data-kp-geri-al]').click();
assert.equal(await kenarSayisi(), 1);

// 3) Çantadan aksesuarın üstüne: önce kenardan çantada aksesuarın dışında bir yere, sonra aksesuarın üstüne.
// Sürüklerken aksesuar vurgulanır.
const daire = await s.evaluate(() => { const r = document.querySelector('.kp-editor:not(.kp-editor--alt) .kp-gorunum ellipse').getBoundingClientRect(); return [r.x + r.width * 0.3, r.y + r.height * 0.2]; });
const oge2 = await merkez(ana + ' [data-kp-kenar-grup]');
await surukle(oge2[0], oge2[1], daire[0], daire[1]);
assert.equal(await kenarSayisi(), 0);
assert.equal(await s.locator(ana + ' .kp-onizleme .kp-parca--icon').count(), 1, 'çantada');
if (await s.locator(ana + ' [data-kp-secim-kaldir]').isVisible()) await s.locator(ana + ' [data-kp-secim-kaldir]').click();
await s.waitForTimeout(350); // kenar boşalınca yakın görünüm yeniden ortalanır
const ikon = await merkez(ana + ' .kp-onizleme .kp-parca--icon');
const aks2 = await merkez(ana + ' .kp-parca--aksesuar');
let vurgu = 0;
await surukle(ikon[0], ikon[1], aks2[0], aks2[1], async () => { vurgu = await s.locator(ana + ' .kp-parca--aksesuar.kp-parca--hedef').count(); });
assert.equal(vurgu, 1, 'sürüklerken aksesuar vurgulanır');
assert.equal(await s.locator(ana + ' .kp-parca--hedef').count(), 0, 'bırakınca vurgu kalkar');
assert.equal(await aksIc(), 1, 'çantadan aksesuara geçti');
assert.equal(await s.locator(ana + ' .kp-onizleme .kp-parca--icon').count(), 0);
assert.equal(await s.locator(ana + ' .kp-parca--hatali').count(), 0);

// 4) Aksesuarın tasarım ekranında aktarılan patch görünür
await s.locator(ana + ' [data-kp-aks-duzenle]').click();
await s.locator('.kp-editor--alt').waitFor({ state: 'visible' });
assert.equal(await s.locator('.kp-editor--alt .kp-parca--icon').count(), 1);

console.log('hatalar:', hatalar);
assert.deepEqual(hatalar, []);
await t.close();
console.log('AKSESUAR SÜRÜKLE E2E TAMAM');
