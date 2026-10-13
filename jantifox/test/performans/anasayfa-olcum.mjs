// Ana sayfa hızı (kopya temanın önizlemesi): TTFB, DOMContentLoaded, load, LCP, ana iş parçacığı uzun görevleri,
// aktarılan bayt, JS bayt. Her koşul için N temiz açılış (önbelleksiz) ve ortanca. Çok satanlar bölümü varsa örnek
// tasarımların çizilme süresi ve ikinci açılışta (önbellekten) çizim süresi de ölçülür. Yalnızca okur.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node anasayfa-olcum.mjs <etiket> [N]
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const etiket = process.argv[2] || 'olcum';
const N = Number(process.argv[3] || 5);
const URL0 = 'https://jantifox.com/?preview_theme_id=206773780766';
const KOSULLAR = [
  { ad: 'masaustu', cihaz: { viewport: { width: 1440, height: 900 } } },
  { ad: 'iphone13', cihaz: devices['iPhone 13'] }
];
const ortanca = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const sonuc = { etiket, zaman: new Date().toISOString(), N, kosullar: {} };
for (const kos of KOSULLAR) {
  const olcumler = [];
  for (let i = 0; i < N; i++) {
    const baglam = await t.newContext({ ...kos.cihaz, locale: 'tr-TR' });
    const s = await baglam.newPage();
    let bayt = 0;
    let jsBayt = 0;
    const cdp = await baglam.newCDPSession(s);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const tipler = {};
    cdp.on('Network.responseReceived', (e) => { tipler[e.requestId] = e.type; });
    cdp.on('Network.loadingFinished', (e) => { bayt += e.encodedDataLength; if (tipler[e.requestId] === 'Script') jsBayt += e.encodedDataLength; });
    await s.addInitScript(() => {
      const o = (window.__olc = { lcp: 0, uzun: 0 });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { o.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { o.uzun += Math.max(0, e.duration - 50); })).observe({ type: 'longtask', buffered: true });
    });
    await s.goto(URL0, { waitUntil: 'load', timeout: 90000 });
    await s.waitForTimeout(3000);
    const R = await s.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0];
      return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), lcp: Math.round(window.__olc.lcp), tbt: Math.round(window.__olc.uzun), bolum: !!document.querySelector('[data-kp-cs]') };
    });
    if (R.bolum) {
      // Bölüme kaydır, örneklerin çizilmesini bekle
      R.ornek = await s.evaluate(() => new Promise((son) => {
        const t0 = performance.now();
        document.querySelector('[data-kp-cs]').scrollIntoView();
        const bekle = () => {
          const n = document.querySelectorAll('.kp-ornek').length;
          if (n >= 6) return son(Math.round(performance.now() - t0));
          if (performance.now() - t0 > 20000) return son(null);
          setTimeout(bekle, 20);
        };
        bekle();
      }));
      R.ornekAdet = await s.locator('.kp-ornek').count();
      // İkinci açılış: aynı tarayıcı, önbellekten çizim
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
      await s.reload({ waitUntil: 'load' });
      R.ornekOnbellek = await s.evaluate(() => new Promise((son) => {
        const t0 = performance.now();
        document.querySelector('[data-kp-cs]').scrollIntoView();
        const bekle = () => {
          if (document.querySelectorAll('.kp-ornek').length >= 6) return son(Math.round(performance.now() - t0));
          if (performance.now() - t0 > 20000) return son(null);
          setTimeout(bekle, 20);
        };
        bekle();
      }));
      R.editorIkinci = await s.evaluate(() => performance.getEntriesByType('resource').some((e) => /kisisel-editor\.js/.test(e.name)));
    }
    R.kb = Math.round(bayt / 1024);
    R.jsKb = Math.round(jsBayt / 1024);
    olcumler.push(R);
    await baglam.close();
  }
  const ozet = {};
  Object.keys(olcumler[0]).forEach((k) => { if (typeof olcumler[0][k] === 'number') ozet[k] = ortanca(olcumler.map((x) => x[k])); });
  sonuc.kosullar[kos.ad] = { ortanca: ozet, tum: olcumler };
  console.log(kos.ad, JSON.stringify(ozet));
}
await t.close();
mkdirSync(new URL('./sonuclar/', import.meta.url), { recursive: true });
writeFileSync(new URL('./sonuclar/anasayfa-' + etiket + '.json', import.meta.url), JSON.stringify(sonuc, null, 2));
