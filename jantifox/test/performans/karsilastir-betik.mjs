// Önce/sonra karşılaştırması (5-9 tekrar, medyan): node betik.mjs <sayfa.html yolu> [cpu]. Eski sürüm için: git show <commit>:jantifox/test/tarayici/sayfa.html > once.html
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium, devices } = require('playwright');
const html = readFileSync(process.argv[2], 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const r = { betik: [], toplam: [] };
for (let i = 0; i < 4; i++) {
const b = await t.newContext(devices['iPhone 13']); const s = await b.newPage(); const cdp = await b.newCDPSession(s);
await s.route('https://jantifox.test/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }); if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 500, body: '' }); return r.fulfill({ contentType: 'text/html', body: html }); });
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
const ana = '.kp-editor:not(.kp-editor--alt)';
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click(); await s.waitForTimeout(1000);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
for (const h of 'GOKHANAB') { const x = await s.evaluate(([q, h]) => new Promise((ok) => { const g = document.querySelector(q + ' [data-kp-isim]'); const t0 = performance.now(); g.value += h; g.dispatchEvent(new Event('input', { bubbles: true })); const t1 = performance.now(); requestAnimationFrame(() => setTimeout(() => ok([t1 - t0, performance.now() - t0]), 0)); }), [ana, h]); r.betik.push(x[0]); r.toplam.push(x[1]); await s.waitForTimeout(450); }
await b.close();
}
const md = (a) => { a = a.map(Math.round).sort((x, y) => x - y); return a[Math.floor(a.length / 2)] + ' (p95 ' + a[Math.floor(a.length * 0.95)] + ')'; };
console.log(process.argv[2].split('/').pop(), 'betik', md(r.betik), 'boyamaya kadar', md(r.toplam));
await t.close();
