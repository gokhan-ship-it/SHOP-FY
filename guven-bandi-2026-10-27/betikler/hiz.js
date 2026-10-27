// LCP ve CLS olcumu (PerformanceObserver). Kullanim: node hiz.js <tema_id> <cikis.json> <etiket>
// Telefon: 390x844, CPU 4x yavas; masaustu 1440x900. Her sayfa 2 tur, reklam/analitik istekleri engelli.
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT, ETIKET] = process.argv.slice(2);
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const SAYFALAR = ['/', '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik', '/collections/zaman-kapsulu-bileklik'];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { etiket: ETIKET, olcum: [] };
  for (const [W, H, m] of [[390, 844, true], [1440, 900, false]]) {
    for (const y of SAYFALAR) {
      for (let tur = 0; tur < 2; tur++) {
        const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m, locale: 'tr-TR',
          userAgent: m ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
        await ctx.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          window.__lcp = []; window.__cls = 0; window.__kaymalar = [];
          new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), boyut: e.size, el: e.element ? (e.element.tagName + '.' + String(e.element.className || '').split(' ')[0]).slice(0, 60) : null }); }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { window.__cls += e.value; window.__kaymalar.push({ v: +e.value.toFixed(4), kaynak: (e.sources || []).map(s => s.node ? (s.node.nodeName + '.' + String(s.node.className || '').split(' ')[0]).slice(0, 50) : '?').slice(0, 3) }); } } }).observe({ type: 'layout-shift', buffered: true });
        });
        await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
        const p = await ctx.newPage();
        if (m) { const c = await ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
        const t0 = Date.now();
        await p.goto('https://texttonext.com' + y + '?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
        await bekle(6000);
        const o = await p.evaluate(() => { const son = window.__lcp[window.__lcp.length - 1] || {}; return { lcp: son.t, lcpEl: son.el, cls: +window.__cls.toFixed(4), kaymalar: window.__kaymalar.slice(0, 5), tema: Shopify.theme && Shopify.theme.name }; }).catch(e => ({ hata: String(e).slice(0, 100) }));
        o.boy = W; o.sayfa = y; o.tur = tur; S.olcum.push(o); console.log(JSON.stringify(o));
        await ctx.close(); await bekle(2500);
      }
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1)); await br.close();
})();
