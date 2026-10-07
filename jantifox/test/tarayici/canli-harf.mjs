// Önizleme linkinde verilen ismi yazar; harf parçalarının şeffaf PNG ile çizildiğini ve ölçülerini kontrol eder.
// Kullanım: node canli-harf.mjs HALDA
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const isim = process.argv[2] || 'HALDA';
const cikti = new URL('ekran/canli-harf/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766', { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
await s.waitForTimeout(3000);
await s.keyboard.press('Escape');
await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
const veri = await s.evaluate((isim) => {
  const d = JSON.parse(document.querySelector('script[id^="KisiselVeri-"]').textContent);
  const v = d.setler.flatMap((p) => p.varyantlar).concat(d.rakamlar.flatMap((p) => p.varyantlar));
  return [...new Set(isim.split(''))].map((h) => { const x = v.find((y) => y.karakter === h); return x && [h, x.png, x.png_en, x.png_boy]; });
}, isim);
await s.locator('kisisel-kart input[value="kisisel"]').dispatchEvent('click');
await s.waitForSelector('.kp-editor:not([hidden])');
await s.waitForTimeout(1500);
await s.locator('#kp-isim').fill(isim);
await s.waitForTimeout(800);
const parcalar = await s.evaluate(() => [...document.querySelectorAll('.kp-parca--letter')].map((p) => ({ jpg: p.classList.contains('kp-parca--jpg'), w: Math.round(p.getBoundingClientRect().width), h: Math.round(p.getBoundingClientRect().height) })));
const kapasite = await s.locator('[data-kp-kapasite]').textContent().catch(() => '');
await s.screenshot({ path: cikti + isim + '.png' });
console.log(JSON.stringify({ isim, veri, parcalar, kapasite, hatalar }, null, 1));
await t.close();
