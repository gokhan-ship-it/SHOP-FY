// Önce/sonra karşılaştırması (5-9 tekrar, medyan): node acilis.mjs <sayfa.html yolu> [cpu]. Eski sürüm için: git show <commit>:jantifox/test/tarayici/sayfa.html > once.html
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium, devices } = require('playwright');
const html = readFileSync(process.argv[2], 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const sonuc = [];
for (let i = 0; i < 9; i++) {
  const b = await t.newContext(devices['iPhone 13']); const s = await b.newPage(); const cdp = await b.newCDPSession(s);
  await s.route('https://jantifox.test/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }); if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 500, body: '' }); return r.fulfill({ contentType: 'text/html', body: html }); });
  await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta'); await s.waitForTimeout(300);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const ms = await s.evaluate(() => new Promise((ok) => { const d = document.querySelector('[data-kisisel-davet] [data-kisisel-ac]'); const t0 = performance.now(); d.click(); requestAnimationFrame(() => setTimeout(() => ok(performance.now() - t0), 0)); }));
  sonuc.push(Math.round(ms)); await b.close();
}
sonuc.sort((a, b) => a - b); console.log(process.argv[2].split('/').pop(), 'medyan', sonuc[4], sonuc.join(','));
await t.close();
