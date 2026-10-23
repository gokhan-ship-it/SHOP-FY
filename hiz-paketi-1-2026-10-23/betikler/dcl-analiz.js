// Kullanim: node dcl-analiz.js <tema_id> <cikis.json> [yol]
// Telefon kosullarinda (150 ms RTT, 1,6 Mbit/sn, CPU 4x; gorunur.js ile ayni) bir sayfayi acar ve
// DOMContentLoaded'a kadar olanlari kaydeder: istek sirasi/boyut/sure/oncelik, defer betiklerin inis ve calisma zamani,
// ekran disi eager gorsel/videolar, uzun gorevler (ana is parcacigi), ve DCL oncesi JS'e bagli ogelerin calisip calismadigi.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const tid = process.argv[2];
const cikis = process.argv[3];
const yol = process.argv[4] || '/pages/couple-daha-fazla-bilgi-al';
const engel = fs.readFileSync(path.join(__dirname, 'engel.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const engelRe = engel.map(p => new RegExp('^' + p.split('*').map(x => x.replace(/[.+?^${}()|[\]\\\/]/g, '\\$&')).join('.*') + '$'));

(async () => {
  const browser = await chromium.launch({ executablePath: '/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/chrome/opt/google/chrome/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  let engellenen = 0;
  await ctx.route('**/*', r => { if (engelRe.some(re => re.test(r.request().url()))) { engellenen++; return r.abort(); } return r.continue(); });
  await ctx.addInitScript(() => {
    window.__uzun = [];
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__uzun.push({ bas: Math.round(e.startTime), sure: Math.round(e.duration), kaynak: (e.attribution && e.attribution[0] && (e.attribution[0].containerSrc || e.attribution[0].containerName)) || '' }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
    window.__defer = {};
    document.addEventListener('DOMContentLoaded', () => { window.__dclAn = performance.now(); }, { once: true });
    // DCL oncesi yoklama: ozel ogeler tanimli mi, bolum betikleri kurulmus mu?
    window.__yokla = [];
    const yokla = () => {
      if (window.__dclAn) return;
      window.__yokla.push({ t: Math.round(performance.now()), readyState: document.readyState,
        sliderElement: !!(window.customElements && customElements.get('slider-element')),
        productForm: !!(window.customElements && customElements.get('product-form')),
        vsKurulu: !!document.querySelector('[data-vs-root]') && !!document.querySelector('[data-vs-root]').vsInited,
        mkKurulu: !!document.querySelector('[data-mk-root]') && !!document.querySelector('[data-mk-root]').mkInited,
        cbVar: !!document.querySelector('[class*=cb-]') });
      setTimeout(yokla, 500);
    };
    setTimeout(yokla, 300);
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const ist = {};
  let t0 = null;
  cdp.on('Network.requestWillBeSent', e => { if (t0 === null) t0 = e.timestamp; ist[e.requestId] = { url: e.request.url, tur: e.type, oncelik: e.request.initialPriority, bas: e.timestamp, govde: 0 }; });
  cdp.on('Network.responseReceived', e => { const r = ist[e.requestId]; if (r) { r.ilkBayt = e.timestamp; r.mime = e.response.mimeType; r.durum = e.response.status; } });
  cdp.on('Network.dataReceived', e => { const r = ist[e.requestId]; if (r) r.govde += e.dataLength; });
  cdp.on('Network.loadingFinished', e => { const r = ist[e.requestId]; if (r) { r.son = e.timestamp; r.aktarim = e.encodedDataLength; } });
  cdp.on('Network.loadingFailed', e => { const r = ist[e.requestId]; if (r) { r.son = e.timestamp; r.hata = e.errorText; } });

  await page.goto('https://texttonext.com' + yol + '?preview_theme_id=' + tid, { waitUntil: 'load', timeout: 180000 });
  await page.waitForTimeout(3000);
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime;
    const kaynaklar = performance.getEntriesByType('resource').map(r => ({ url: r.name, bas: Math.round(r.startTime), son: Math.round(r.responseEnd), engelleyici: r.renderBlockingStatus, tur: r.initiatorType, boyut: r.transferSize }));
    const html = document.documentElement.outerHTML;
    const satirIci = [...document.querySelectorAll('script:not([src])')].map(s => s.textContent.length);
    const deferler = [...document.querySelectorAll('script[src]')].map(s => ({ src: s.src, defer: s.defer, async: s.async, head: !!s.closest('head') }));
    const vh = innerHeight;
    const ekranDisiEager = [...document.querySelectorAll('img, video, iframe')].filter(e => {
      const r = e.getBoundingClientRect();
      const lazy = e.getAttribute('loading') === 'lazy';
      const pre = e.tagName === 'VIDEO' ? e.getAttribute('preload') : null;
      return r.top > vh && (e.tagName === 'VIDEO' ? pre !== 'none' : !lazy);
    }).map(e => ({ tag: e.tagName, src: (e.currentSrc || e.src || '').split('?')[0].split('/').pop(), top: Math.round(e.getBoundingClientRect().top), preload: e.getAttribute('preload'), loading: e.getAttribute('loading') }));
    return { dcl: Math.round(n.domContentLoadedEventStart), dclSon: Math.round(n.domContentLoadedEventEnd), domInteractive: Math.round(n.domInteractive), load: Math.round(n.loadEventStart), responseEnd: Math.round(n.responseEnd), fcp: Math.round(fcp || 0), htmlBayt: html.length, satirIciJsAdet: satirIci.length, satirIciJsBayt: satirIci.reduce((a, b) => a + b, 0), betikler: deferler, ekranDisiEager, kaynaklar };
  });
  const uzun = await page.evaluate(() => window.__uzun);
  const yokla = await page.evaluate(() => window.__yokla);
  const istekler = Object.values(ist).map(r => ({ url: r.url.split('?')[0].replace('https://texttonext.com', ''), tur: r.tur, oncelik: r.oncelik, bas: Math.round((r.bas - t0) * 1000), ilkBayt: r.ilkBayt ? Math.round((r.ilkBayt - t0) * 1000) : null, son: r.son ? Math.round((r.son - t0) * 1000) : null, govde: r.govde, aktarim: r.aktarim || 0, hata: r.hata || '' })).sort((a, b) => a.bas - b.bas);
  const dclOncesi = istekler.filter(r => r.bas < nav.dcl);
  const ozet = {};
  for (const r of dclOncesi) { ozet[r.tur] = ozet[r.tur] || { adet: 0, govdeKB: 0 }; ozet[r.tur].adet++; ozet[r.tur].govdeKB += r.govde / 1024; }
  for (const k in ozet) ozet[k].govdeKB = Math.round(ozet[k].govdeKB);
  const uzunDclOncesi = uzun.filter(u => u.bas < nav.dcl);
  const sonuc = { yol, tid, engellenen, dcl: nav.dcl, domInteractive: nav.domInteractive, fcp: nav.fcp, load: nav.load, htmlBayt: nav.htmlBayt, satirIciJsAdet: nav.satirIciJsAdet, satirIciJsBayt: nav.satirIciJsBayt,
    dclOncesiOzet: ozet, dclOncesiUzunGorevMs: uzunDclOncesi.reduce((a, b) => a + b.sure, 0), uzunGorevler: uzun, betikler: nav.betikler, ekranDisiEager: nav.ekranDisiEager, yoklama: yokla, istekler };
  fs.writeFileSync(cikis, JSON.stringify(sonuc, null, 1));
  console.log(JSON.stringify({ dcl: nav.dcl, domInteractive: nav.domInteractive, fcp: nav.fcp, load: nav.load, ozet, uzunGorevDclOncesiMs: sonuc.dclOncesiUzunGorevMs, ekranDisiEager: nav.ekranDisiEager.length }));
  await browser.close();
})();
