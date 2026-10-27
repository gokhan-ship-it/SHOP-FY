// Ayni kopya temada bantli / bantsiz A-B olcumu (LCP, CLS + kayma kaynaklari).
// "bantsiz" turda sayfa HTML'i test sirasinda yakalanip yalnizca bant blogu (stil + isaretleme + betik) cikariliyor;
// geri kalan her sey ayni. Turlar donusumlu: ag dalgalanmasi iki tarafa esit dagilsin.
// Kullanim: node hiz-ab.js <tema_id> <cikis.json> [tur]
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT, TUR] = process.argv.slice(2);
const N = parseInt(TUR || '3');
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const SAYFALAR = ['/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik', '/collections/zaman-kapsulu-bileklik'];
const BANT = /<style>\s*\.tt-gb\{[\s\S]*?<\/style>\s*<div class="tt-gb" data-tt-gb>[\s\S]*?<\/script>/;
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { olcum: [] };
  for (const [W, H, m] of [[390, 844, true], [1440, 900, false]]) {
    for (const y of SAYFALAR) {
      for (let tur = 0; tur < N; tur++) {
        for (const hal of (tur % 2 ? ['bantli', 'bantsiz'] : ['bantsiz', 'bantli'])) {
          const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m, locale: 'tr-TR',
            userAgent: m ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
          await ctx.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            window.__lcp = []; window.__cls = 0; window.__kaymalar = [];
            const ad = n => { if (!n) return '?'; const e = n.nodeType === 1 ? n : n.parentElement; const s = e ? (e.tagName + '.' + String(e.className || '').split(' ')[0]).slice(0, 40) : '?'; const p = e && e.parentElement ? (e.parentElement.tagName + '.' + String(e.parentElement.className || '').split(' ')[0]).slice(0, 30) : ''; return (n.nodeType === 1 ? '' : n.nodeName + '@') + s + '<' + p; };
            new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), el: e.element ? (e.element.tagName + '.' + String(e.element.className || '').split(' ')[0]).slice(0, 60) : null }); }).observe({ type: 'largest-contentful-paint', buffered: true });
            new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { window.__cls += e.value; window.__kaymalar.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), kaynak: (e.sources || []).slice(0, 4).map(s => ({ n: ad(s.node), once: [Math.round(s.previousRect.x), Math.round(s.previousRect.y), Math.round(s.previousRect.width), Math.round(s.previousRect.height)], sonra: [Math.round(s.currentRect.x), Math.round(s.currentRect.y), Math.round(s.currentRect.width), Math.round(s.currentRect.height)] })) }); } } }).observe({ type: 'layout-shift', buffered: true });
          });
          await ctx.route('**/*', async r => {
            const u = r.request().url();
            if (BEACON.some(re => re.test(u))) return r.abort();
            if (hal === 'bantsiz' && r.request().resourceType() === 'document') {
              const resp = await r.fetch(); let body = await resp.text();
              const once = body.length; body = body.replace(BANT, '');
              S.kesim = S.kesim || []; if (S.kesim.length < 6) S.kesim.push({ y, cikan: once - body.length });
              return r.fulfill({ response: resp, body });
            }
            return r.continue();
          });
          const p = await ctx.newPage();
          if (m) { const c = await ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
          await p.goto('https://texttonext.com' + y + '?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
          await bekle(6000);
          const o = await p.evaluate(() => { const son = window.__lcp[window.__lcp.length - 1] || {}; return { lcp: son.t, lcpEl: son.el, cls: +window.__cls.toFixed(4), kaymalar: window.__kaymalar.filter(k => k.v > 0), bant: !!document.querySelector('.tt-gb') }; }).catch(e => ({ hata: String(e).slice(0, 100) }));
          Object.assign(o, { boy: W, sayfa: y, tur, hal }); S.olcum.push(o);
          console.log(W, y.slice(0, 30), tur, hal, 'bant', o.bant, 'lcp', o.lcp, 'cls', o.cls, JSON.stringify(o.kaymalar).slice(0, 400));
          await ctx.close(); await bekle(2000);
        }
      }
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1)); await br.close();
})();
