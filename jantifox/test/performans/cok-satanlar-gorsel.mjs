// Ana sayfa Çok satanlar: örnek tasarım için indirilen görsellerin toplam boyutu (önizleme, harf) ve betikler;
// telefon (iPhone: CDN bu dosyaları PNG gönderiyor) ve masaüstü. Yalnızca okur.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node cok-satanlar-gorsel.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [ad, cihaz] of [['iphone13', devices['iPhone 13']], ['masaustu-1440', { viewport: { width: 1440, height: 900 } }]]) {
  const c = await t.newContext({ ...cihaz, locale: 'tr-TR' });
  const s = await c.newPage();
  const cdp = await c.newCDPSession(s);
  await cdp.send('Network.enable');
  const urls = {};
  const boy = {};
  cdp.on('Network.responseReceived', (e) => { urls[e.requestId] = e.response.url + ' ' + e.response.mimeType; });
  cdp.on('Network.loadingFinished', (e) => { boy[e.requestId] = e.encodedDataLength; });
  await s.goto('https://jantifox.com/?preview_theme_id=206773780766', { waitUntil: 'load', timeout: 90000 });
  await s.waitForFunction(() => document.querySelectorAll('.kp-ornek').length >= 6, null, { timeout: 30000 });
  await s.waitForTimeout(2000);
  const top = { onizleme: [0, 0], harf: [0, 0], betik: [0, 0] };
  Object.keys(boy).forEach((k) => {
    const u = urls[k] || '';
    const tur = /kisisel-urun-/.test(u) ? 'onizleme' : /kisisel-harf-/.test(u) ? 'harf' : /kisisel-(editor|cok-satanlar|koleksiyon)\.(js|css)/.test(u) ? 'betik' : null;
    if (tur) { top[tur][0]++; top[tur][1] += boy[k]; }
  });
  console.log(ad, Object.entries(top).map(([k, v]) => k + ' ' + v[0] + ' adet ' + Math.round(v[1] / 1024) + ' KB').join(' · '));
  await c.close();
}
await t.close();
