// Önizleme linkinde: otomatik renk ve "Renkleri karıştır" yan yana göze aynı renk (ΔE < 10) koyuyor mu?
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node canli-renk-komsu.mjs [isim ...]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const PIRAMIT = '9722983907614';
const isimler = process.argv.slice(2).length ? process.argv.slice(2) : ['lv', 'ob', 'vol', 'bob', 'olva', 'ada', 'nesrin'];
const lab = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x > 0.04045 ? ((x + 0.055) / 1.055) ** 2.4 : x / 12.92));
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, Y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, Z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
const dE = (a, b) => Math.hypot(...lab(a).map((x, i) => x - lab(b)[i]));
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const hatalar = [];
s.on('pageerror', (e) => { if (!/Failed to fetch/.test(e.message)) hatalar.push(e.message); });
await s.goto('https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766', { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
await s.waitForTimeout(2500);
await s.keyboard.press('Escape');
await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
console.log('benzerRenk kodda var mı:', await s.evaluate(() => [...document.scripts].some((x) => /kisisel-editor/.test(x.src)) && fetch([...document.scripts].find((x) => /kisisel-editor/.test(x.src)).src).then((r) => r.text()).then((x) => x.includes('BENZER_RENK_ESIGI'))));
// Her harfin stoktaki renk kodları (kaçınılabilir mi diye bakmak için)
const stok = await s.evaluate((id) => {
  const p = JSON.parse(document.querySelector('[id^="KisiselVeri-"]').textContent).setler.find((x) => String(x.id) === id);
  const o = {};
  p.varyantlar.filter((v) => v.satilabilir && v.stok > 0).forEach((v) => { const [r, h] = v.baslik.split(' '); (o[h] = o[h] || []).push([r, v.renk_kodu]); });
  return o;
}, PIRAMIT);
await s.locator('kisisel-kart input[value="kisisel"]').dispatchEvent('click');
await s.waitForSelector('.kp-editor:not([hidden])');
await s.locator(`label:has([data-kp-set][value="${PIRAMIT}"])`).click();
const secili = () => s.$$eval('.kp-renk-harf', (h) => h.map((x) => {
  const n = x.querySelector('.kp-nokta[aria-pressed="true"]') || x.querySelector('.kp-nokta--pasif');
  return n ? [n.getAttribute('title'), n.style.getPropertyValue('--renk').trim()] : null;
}));
let toplamIhlal = 0;
for (const isim of isimler) {
  await s.locator('#kp-isim').fill(isim);
  await s.waitForTimeout(300);
  const harfler = [...(await s.locator('#kp-isim').inputValue())];
  const goruldu = new Set();
  let ihlal = 0, kacinilmaz = 0;
  for (let k = 0; k < 25; k++) {
    if (k) { await s.locator('[data-kp-karistir]').click(); await s.waitForTimeout(60); }
    const r = await secili();
    if (r.some((x) => !x)) continue;
    goruldu.add(r.map((x, i) => x[0] + ' ' + harfler[i]).join(', '));
    for (let i = 1; i < r.length; i++) {
      if (dE(r[i - 1][1], r[i][1]) < 10) {
        // Komşulardan biri başka renk alabilir miydi?
        const sec = (stok[harfler[i - 1]] || []).length > 1 || (stok[harfler[i]] || []).length > 1;
        if (sec) ihlal++; else kacinilmaz++;
      }
    }
  }
  toplamIhlal += ihlal;
  console.log(isim.toUpperCase().padEnd(8), 'stok:', harfler.map((h) => h + '=' + (stok[h] || []).map((x) => x[0]).join('/')).join(' '));
  console.log('   ihlal:', ihlal, '· kaçınılmaz (tek renk):', kacinilmaz, '· görülen dağılımlar:', [...goruldu].slice(0, 4).join(' | '));
}
console.log('TOPLAM İHLAL:', toplamIhlal, '· hatalar:', hatalar);
await t.close();
