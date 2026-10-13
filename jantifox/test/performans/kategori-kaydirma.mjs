// Kategori sayfası dikey kaydırma akıcılığı: iPhone 13 boyutu, CPU normal / 4 kat yavaş. "efektsiz" turunda temanın
// "kaydırınca belir" efekti YALNIZCA ölçüm için tarayıcıda kapatılır (sayfaya / temaya bir şey yazılmaz).
// Kullanım: node test/performans/kategori-kaydirma.mjs [taban] [tema_id] [yol] [cpu]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [taban = 'https://jantifox.com', tema = '', yol = '/collections/all', cpuS = '4'] = process.argv.slice(2);
const adres = taban + yol + (tema ? (yol.includes('?') ? '&' : '?') + 'preview_theme_id=' + tema : '');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const sonuc = [];
for (const tur of ['efektli', 'efektsiz', 'efektli', 'efektsiz']) {
  const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
  await c.addInitScript((efektsiz) => {
    const o = (window.__k = { kareler: [], uzun: [], kaydet: false });
    const dongu = (z) => { if (o.kaydet) o.kareler.push(z); requestAnimationFrame(dongu); };
    requestAnimationFrame(dongu);
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => o.kaydet && o.uzun.push(Math.round(e.duration)))).observe({ type: 'longtask' }); } catch (e) {}
    if (efektsiz) {
      const st = document.createElement('style');
      st.textContent = '.scroll-trigger{animation:none!important;opacity:1!important;transform:none!important}';
      document.documentElement.appendChild(st);
    }
  }, tur === 'efektsiz');
  const s = await c.newPage();
  const cdp = await c.newCDPSession(s);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(cpuS) });
  await s.goto(adres, { waitUntil: 'load', timeout: 90000 });
  await s.evaluate(() => document.querySelectorAll('#popupOverlay, .coupon-modal, #shopify-pc__banner').forEach((e) => e.remove()));
  await s.waitForTimeout(1500);
  const efektliKart = await s.evaluate(() => document.querySelectorAll('#product-grid .scroll-trigger').length);
  await s.evaluate(() => { window.__k.kaydet = true; });
  // Parmakla kaydırma; dokunma hareketi sayfayı kaydırmazsa (ör. üstte katman) aynı mesafe yumuşak kaydırmayla
  for (let i = 0; i < 8; i++) {
    const once = await s.evaluate(() => scrollY);
    await cdp.send('Input.synthesizeScrollGesture', { x: 190, y: 400, yDistance: -450, speed: 1500, gestureSourceType: 'touch' }).catch(() => {});
    if ((await s.evaluate(() => scrollY)) <= once + 5) await s.evaluate(() => window.scrollBy({ top: 450, behavior: 'smooth' }));
    await s.waitForTimeout(400);
  }
  await s.waitForTimeout(600);
  const o = await s.evaluate(() => { window.__k.kaydet = false; return window.__k; });
  const fark = o.kareler.slice(1).map((z, i) => z - o.kareler[i]);
  const sure = (o.kareler[o.kareler.length - 1] - o.kareler[0]) / 1000;
  sonuc.push({ tur, cpu: Number(cpuS), efektliKart, kaydirilan: await s.evaluate(() => Math.round(scrollY)), fps: Math.round((o.kareler.length - 1) / sure), kareler33msUstu: fark.filter((d) => d > 33).length, enUzunKare: Math.round(Math.max(...fark)), uzunIs: o.uzun.length, uzunIsToplam: o.uzun.reduce((a, b) => a + b, 0) });
  await c.close();
}
console.log(JSON.stringify(sonuc));
await t.close();
