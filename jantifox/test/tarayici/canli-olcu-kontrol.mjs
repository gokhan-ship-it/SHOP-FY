// Önizleme linkindeki editör verisini olcu-v2.json ile karşılaştırır; rakamları ve Meteor'u çizip ekran görüntüsü alır.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const cikti = new URL('ekran/canli-olcu/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const beklenen = JSON.parse(readFileSync(new URL('../../veri/png/olcu-v2.json', import.meta.url)));
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await (await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' })).newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766', { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
const d = await s.evaluate(() => JSON.parse(document.querySelector('script[id^="KisiselVeri-"]').textContent));
const harita = {};
d.setler.concat(d.rakamlar).forEach((p) => p.varyantlar.forEach((v) => (harita['v' + v.id] = { en: v.png_en, boy: v.png_boy, sekil: null, png: v.png })));
d.ikonlar.forEach((p) => (harita['p' + p.id] = { en: p.png_en, boy: p.png_boy, sekil: p.png_sekil, png: p.png }));
const farklar = [];
let bulunan = 0;
const pngsiz = [];
for (const b of beklenen) {
  const g = b.tur === 'ikon' ? harita['p' + b.urun] : harita['v' + b.varyant];
  if (!g) continue; // bu çantanın kataloğunda olmayan ikon
  bulunan++;
  if (Math.abs(g.en - b.genislik_cm) > 0.005 || Math.abs(g.boy - b.yukseklik_cm) > 0.005 || (b.tur === 'ikon' && g.sekil !== b.sekil)) farklar.push([b.ad, g, [b.genislik_cm, b.yukseklik_cm, b.sekil]]);
  if (!g.png) pngsiz.push(b.ad);
}
console.log('karşılaştırılan', bulunan, '/', beklenen.length, '· farklı', farklar.length, '· PNG\'siz', pngsiz.length);
farklar.forEach((f) => console.log('  ✗', JSON.stringify(f)));
if (pngsiz.length) console.log('  PNG\'siz:', pngsiz.join(', '));
const katalogdaYok = beklenen.filter((b) => !(b.tur === 'ikon' ? harita['p' + b.urun] : harita['v' + b.varyant])).map((b) => b.ad);
console.log('bu çantanın kataloğunda olmayan:', katalogdaYok.join(', ') || '—');
// Ekran: rakamlar 0 4 6 9 ve Meteor
await s.waitForTimeout(2500);
await s.keyboard.press('Escape');
await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
await s.locator('kisisel-kart input[value="kisisel"]').dispatchEvent('click');
await s.waitForSelector('.kp-editor:not([hidden])');
await s.waitForTimeout(1200);
await s.locator('[data-kp-adim="rakam"]').click();
for (const r of ['0', '4', '6', '9']) {
  await s.locator('[data-kp-rakam]').filter({ hasText: new RegExp('^' + r + '$') }).first().click();
  await s.waitForTimeout(150);
}
const rakamlar = await s.evaluate(() => [...document.querySelectorAll('.kp-parca--number')].map((p) => ({ jpg: p.classList.contains('kp-parca--jpg'), w: Math.round(p.getBoundingClientRect().width), h: Math.round(p.getBoundingClientRect().height) })));
console.log('rakam parçaları:', JSON.stringify(rakamlar));
await s.screenshot({ path: cikti + '01-rakamlar.png' });
// Rakamları kaldır, Meteor'u ekle
for (let i = 0; i < 4; i++) await s.locator('[data-kp-kaldir]').first().click();
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-kategori="Oyun & Macera"]').click();
await s.locator('[data-kp-ikon="9941460255006"]').click();
await s.waitForTimeout(300);
const meteor = await s.evaluate(() => { const p = document.querySelector('.kp-parca--icon'); const r = p.getBoundingClientRect(); return { jpg: p.classList.contains('kp-parca--jpg'), w: Math.round(r.width), h: Math.round(r.height), src: p.querySelector('img').src.split('?')[0].split('/').pop() }; });
console.log('Meteor:', JSON.stringify(meteor));
await s.screenshot({ path: cikti + '02-meteor.png' });
console.log('sayfa hataları:', JSON.stringify(hatalar));
await t.close();
