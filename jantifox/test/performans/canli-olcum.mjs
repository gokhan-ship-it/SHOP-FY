// Kopya temanın önizlemesinde (gerçek görseller ve ağ) ölçüm: açılış, görsellerin yüklenmesi, görsel boyut/format,
// yazma gecikmesi, kampanya isteği sayısı. Yalnızca okur; hiçbir şeyi değiştirmez.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node canli-olcum.mjs <etiket>
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const etiket = process.argv[2] || 'canli';
const URL0 = 'https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766';
const KOSULLAR = [
  { ad: 'iphone13', cihaz: devices['iPhone 13'], cpu: 1 },
  { ad: 'cpu4-yavas4g', cihaz: devices['iPhone 13'], cpu: 4, ag: { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 } },
  { ad: 'masaustu', cihaz: { viewport: { width: 1440, height: 900 } }, cpu: 1 }
];
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const sonuc = { etiket, zaman: new Date().toISOString(), kosullar: {} };
for (const kos of KOSULLAR) {
  const baglam = await t.newContext({ ...kos.cihaz, locale: 'tr-TR' });
  const s = await baglam.newPage();
  const cdp = await baglam.newCDPSession(s);
  await cdp.send('Network.enable');
  if (kos.ag) await cdp.send('Network.emulateNetworkConditions', kos.ag);
  const turler = {};
  cdp.on('Network.responseReceived', (e) => { if (e.type === 'Image') turler[e.response.url] = e.response.mimeType; });
  let istek = 0;
  s.on('request', (r) => { if (/\/api\/[^/]+\/graphql\.json/.test(r.url())) istek++; });
  await s.addInitScript(() => {
    const o = (window.__olc = { tus: [] });
    document.addEventListener('keydown', (e) => { const t0 = e.timeStamp; requestAnimationFrame(() => setTimeout(() => o.tus.push(performance.now() - t0), 0)); }, true);
  });
  await s.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 60000 });
  await s.waitForTimeout(2500);
  await s.keyboard.press('Escape');
  await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: kos.cpu });
  const R = {};
  // Açılış: tıklamadan editörün çizilmesine ve görsellerin (ürün + patch) yüklenmesine kadar
  R.acilis = await s.evaluate(() => new Promise((son) => {
    const t0 = performance.now();
    document.querySelector('[data-kisisel-davet] [data-kisisel-ac]').click();
    requestAnimationFrame(() => setTimeout(() => {
      const cizim = performance.now() - t0;
      const bekle = () => {
        const imgs = [...document.querySelectorAll('.kp-editor:not(.kp-editor--alt) .kp-onizleme img')];
        if (imgs.length && imgs.every((i) => i.complete)) return son({ cizim: Math.round(cizim), gorseller: Math.round(performance.now() - t0), adet: imgs.length });
        if (performance.now() - t0 > 30000) return son({ cizim: Math.round(cizim), gorseller: null });
        setTimeout(bekle, 20);
      };
      bekle();
    }, 0));
  }));
  await s.waitForTimeout(800);
  // Yazma (tek tek) ve patch görsellerinin yüklenmesi
  istek = 0;
  await s.locator('#kp-isim').focus();
  for (const h of 'gokhan') { await s.keyboard.type(h); await s.waitForTimeout(300); }
  R.yazTek = await s.evaluate(() => window.__olc.tus.slice().map(Math.round));
  R.harfGorselleri = await s.evaluate(() => new Promise((son) => {
    const t0 = performance.now();
    const bekle = () => {
      const imgs = [...document.querySelectorAll('.kp-editor:not(.kp-editor--alt) .kp-onizleme .kp-parca img')];
      if (imgs.every((i) => i.complete)) return son({ ms: Math.round(performance.now() - t0), adet: imgs.length });
      if (performance.now() - t0 > 20000) return son({ ms: null });
      setTimeout(bekle, 20);
    };
    bekle();
  }));
  await s.waitForTimeout(1500);
  R.kampanyaIstek6Harf = istek;
  // Görsellerin boyutu: ekranda gösterilen (× cihaz piksel oranı) ile dosyanın çözünürlüğü ve aktarılan bayt
  await s.locator('.kp-editor:not(.kp-editor--alt) .kp-arac-dugme[data-kp-adim="ikon"]').click();
  await s.waitForTimeout(3000);
  R.gorseller = await s.evaluate(() => {
    const dpr = devicePixelRatio;
    const kayit = new Map(performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'img' || /\.(png|jpe?g|webp|avif)/.test(e.name)).map((e) => [e.name, e]));
    return [...document.querySelectorAll('.kp-editor:not(.kp-editor--alt) img')].filter((i) => i.currentSrc && i.complete && i.naturalWidth).map((i) => {
      const r = i.getBoundingClientRect();
      const e = kayit.get(i.currentSrc);
      return { yer: i.closest('.kp-parca') ? 'onizleme-patch' : i.closest('.kp-sahne') ? 'onizleme-urun' : i.closest('.kp-secim, .kp-karakter') ? 'kart' : 'diger', dosyaGen: i.naturalWidth, ekranGen: Math.round(r.width * dpr), bayt: e ? e.transferSize || e.encodedBodySize : null, url: i.currentSrc.split('?')[0].split('/').pop() + '?' + (i.currentSrc.split('?')[1] || '') };
    });
  });
  R.gorselTurleri = Object.values(turler).reduce((a, x) => { a[x] = (a[x] || 0) + 1; return a; }, {});
  sonuc.kosullar[kos.ad] = R;
  const pg = R.gorseller.filter((g) => g.yer === 'onizleme-patch' || g.yer === 'kart');
  console.log(kos.ad, JSON.stringify({ acilis: R.acilis, yazTek: R.yazTek, harfGorselleri: R.harfGorselleri, istek: R.kampanyaIstek6Harf, turler: R.gorselTurleri }));
  console.log('  görsel örnekleri:', JSON.stringify(pg.slice(0, 6)));
  console.log('  patch görseli: ort. dosya genişliği', Math.round(pg.reduce((a, g) => a + g.dosyaGen, 0) / (pg.length || 1)), 'ort. ekran genişliği', Math.round(pg.reduce((a, g) => a + g.ekranGen, 0) / (pg.length || 1)), 'toplam bayt', pg.reduce((a, g) => a + (g.bayt || 0), 0));
  await baglam.close();
}
await t.close();
mkdirSync(new URL('sonuclar/', import.meta.url), { recursive: true });
writeFileSync(new URL('sonuclar/' + etiket + '-canli.json', import.meta.url), JSON.stringify(sonuc, null, 1));
