// Sayfa gecis perdesi (<loading-bar>) olcumu. Salt okuma.
// Telefon (390x844, DPR 3), CPU 4x yavaslatma, ag ~ Lighthouse "yavas 4G" (150 ms RTT, 1,6 Mbit/s indirme, 750 kbit/s yukleme).
// Her sayfa 3 kez acilir; her turda su anlar (ms, gezinme basindan) kaydedilir:
//   fcp, lcp, dcl, load, perde_baslar (opaklik 1'den dusmeye basladi), perde_biter (opaklik 0 ya da hidden).
// Kullanim: NODE_PATH=/opt/node22/lib/node_modules node sayfa-gecis.js <cikis.json>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const SAYFALAR = [
  ['anasayfa', 'https://texttonext.com/'],
  ['couple-landing', 'https://texttonext.com/pages/couple-daha-fazla-bilgi-al'],
  ['kunye', 'https://texttonext.com/products/zaman-kapsulu-kunye'],
  ['astor-chloe-couple', 'https://texttonext.com/products/luna-aurora-couple-zaman-kapsulu-kopya'],
  ['noir', 'https://texttonext.com/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya'],
  ['kral-zincir', 'https://texttonext.com/products/zaman-kapsulu-bileklik-kral'],
  ['couple-urunler', 'https://texttonext.com/collections/couple-urunler'],
];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  const sonuc = [];
  for (let tur = 1; tur <= 3; tur++) {
    for (const [ad, url] of SAYFALAR) {
      const ctx = await br.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
      await ctx.addInitScript(() => {
        const t = window.__ttT = { lcp: 0 };
        try { new PerformanceObserver(l => { for (const e of l.getEntries()) t.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
        try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') t.fcp = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
        // Kayma kayitlari ve data-page-rendering'in kalktigi an (theme.js: etkilesim ya da 5 sn)
        t.kaymalar = [];
        try { new PerformanceObserver(l => { for (const e of l.getEntries()) t.kaymalar.push({ t: Math.round(e.startTime), deger: +e.value.toFixed(4), girdi: e.hadRecentInput, kaynak: (e.sources || []).map(s => s.node ? (s.node.id ? '#' + s.node.id : s.node.nodeName + '.' + String(s.node.className || '').split(' ')[0]) : null) }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
        new MutationObserver((m, o) => { if (document.body && !document.body.hasAttribute('data-page-rendering') && t.dcl) { t.render_kalkti = Math.round(performance.now()); o.disconnect(); } }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-page-rendering'] });
        document.addEventListener('DOMContentLoaded', () => { t.dcl = Math.round(performance.now()); });
        addEventListener('load', () => { t.load = Math.round(performance.now()); });
        const izle = () => {
          const lb = document.querySelector('loading-bar');
          if (lb) {
            t.perde_var = true;
            const op = parseFloat(getComputedStyle(lb).opacity);
            if (t.perde_baslar === undefined && op < 0.999) t.perde_baslar = Math.round(performance.now());
            if (lb.hidden || op <= 0.001) { t.perde_biter = Math.round(performance.now()); return; }
          }
          if (performance.now() < 60000) requestAnimationFrame(izle);
        };
        requestAnimationFrame(izle);
      });
      const p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      try {
        await p.goto(url, { waitUntil: 'load', timeout: 120000 });
        await p.waitForFunction(() => window.__ttT && (window.__ttT.perde_biter !== undefined || !document.querySelector('loading-bar')), null, { timeout: 30000 }).catch(() => {});
        // Kayma olcumu ilk turda (7 sn bekleme ile) alindi: sayfa-gecis-cls.json. Bu tur perde zamanlari icin.
        await bekle(2000);
        const t = await p.evaluate(() => { const t = window.__ttT; t.cls_toplam = +t.kaymalar.filter(k => !k.girdi).reduce((s, k) => s + k.deger, 0).toFixed(4); return t; });
        sonuc.push({ tur, ad, ...t });
        console.log(tur, ad, JSON.stringify(t));
      } catch (e) { sonuc.push({ tur, ad, hata: String(e).slice(0, 120) }); console.log('HATA', ad, e.message); }
      await ctx.close();
      await bekle(1000);
    }
  }
  fs.writeFileSync(process.argv[2] || 'sayfa-gecis.json', JSON.stringify(sonuc, null, 1));
  await br.close();
})();
