// Önce/sonra karşılaştırması (5-9 tekrar, medyan): node tekrar.mjs <sayfa.html yolu> [cpu]. Eski sürüm için: git show <commit>:jantifox/test/tarayici/sayfa.html > once.html
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium, devices } = require('playwright');
const html = readFileSync(process.argv[2], 'utf8');
const cpu = Number(process.argv[3] || 4);
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const yaz = [], set = [], ikon = [], piramit = [];
const sonraki = (fn) => new Promise((ok) => { const t0 = performance.now(); fn(); requestAnimationFrame(() => setTimeout(() => ok(performance.now() - t0), 0)); });
for (let i = 0; i < 5; i++) {
  const b = await t.newContext(devices['iPhone 13']); const s = await b.newPage(); const cdp = await b.newCDPSession(s);
  await s.route('https://jantifox.test/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }); if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 500, body: '' }); return r.fulfill({ contentType: 'text/html', body: html }); });
  await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta'); await s.waitForTimeout(300);
  const ana = '.kp-editor:not(.kp-editor--alt)';
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click(); await s.waitForTimeout(600);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  // Yavaş yazma: her harf için input olayından sonraki boyamaya kadar
  for (const h of 'GOKHAN') {
    yaz.push(await s.evaluate(([q, h]) => new Promise((ok) => { const g = document.querySelector(q + ' [data-kp-isim]'); const t0 = performance.now(); g.value += h; g.dispatchEvent(new Event('input', { bubbles: true })); requestAnimationFrame(() => setTimeout(() => ok(performance.now() - t0), 0)); }), [ana, h]));
    await s.waitForTimeout(300);
  }
  const tik = async (q) => s.evaluate((q) => new Promise((ok) => { const t0 = performance.now(); document.querySelector(q).click(); requestAnimationFrame(() => setTimeout(() => ok(performance.now() - t0), 0)); }), q);
  const p = await s.$(ana + ' [data-kp-hepsi]:nth-child(2)');
  if (p) { piramit.push(await tik(ana + ' [data-kp-hepsi]:nth-child(2)')); await s.waitForTimeout(400); }
  await tik(ana + ' .kp-arac-dugme[data-kp-adim="ikon"]'); await s.waitForTimeout(500);
  set.push(await tik(ana + ' [data-kp-hazir-set="8001"]')); await s.waitForTimeout(600);
  await tik(ana + ' [data-kp-kategori="Spor"]'); await s.waitForTimeout(400);
  ikon.push(await tik(ana + ' [data-kp-gorsel-icerik] [data-kp-ikon="2"]'));
  await b.close();
}
const md = (a) => { a = a.map(Math.round).sort((x, y) => x - y); return 'medyan ' + a[Math.floor(a.length / 2)] + ' p95 ' + a[Math.min(a.length - 1, Math.floor(a.length * 0.95))]; };
console.log(process.argv[2].split('/').pop(), 'cpu' + cpu, '| yaz', md(yaz), '| piramit', md(piramit), '| set', md(set), '| ikon', md(ikon));
await t.close();
