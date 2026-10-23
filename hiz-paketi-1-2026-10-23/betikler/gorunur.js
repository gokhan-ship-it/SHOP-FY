// Iceriğin ekranda gercekten gorundugu an (perde dahil), DOMContentLoaded, load ve kaymalar.
// Telefon 390x844 DPR 3, CPU 4x, ag 150 ms / 1,6 Mbit/s indirme / 750 kbit/s yukleme. Her sayfa 3 kez.
// Takip istekleri bu tarayicida engellenir (siteye ya da takip koduna dokunulmaz); engellenen ve gecen istekler kaydedilir.
// Kullanim: NODE_PATH=/opt/node22/lib/node_modules node gorunur.js <tema_id> <cikis.json>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const TID = process.argv[2];
const CIKIS = process.argv[3];
const SAYFALAR = [
  ['anasayfa', 'https://texttonext.com/'],
  ['couple-landing', 'https://texttonext.com/pages/couple-daha-fazla-bilgi-al'],
  ['kunye', 'https://texttonext.com/products/zaman-kapsulu-kunye'],
  ['astor-chloe-couple', 'https://texttonext.com/products/luna-aurora-couple-zaman-kapsulu-kopya'],
  ['noir', 'https://texttonext.com/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya'],
  ['kral-zincir', 'https://texttonext.com/products/zaman-kapsulu-bileklik-kral'],
  ['couple-urunler', 'https://texttonext.com/collections/couple-urunler'],
];
// Engellenecek takip adresleri (engel.txt ile ayni liste)
const ENGEL = [/facebook\.com\/tr/, /connect\.facebook\.net/, /googletagmanager\.com/, /google-analytics\.com/, /googleadservices\.com/,
  /doubleclick\.net/, /google\.com\/ccm\//, /google\.com\/pagead/, /analytics\.tiktok\.com/, /trueprofit\.io/,
  /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /\/cdn\/wpm\//, /\/wpm@/];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ executablePath: '/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/chrome/opt/google/chrome/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const sonuc = [];
  for (let tur = 1; tur <= 3; tur++) {
    for (const [ad, url] of SAYFALAR) {
      const ctx = await br.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
      const engellenen = {}, gecenTakip = [], medya = [];
      await ctx.route('**/*', route => {
        const u = route.request().url();
        const e = ENGEL.find(r => r.test(u));
        if (e) { engellenen[e.source] = (engellenen[e.source] || 0) + 1; return route.abort('blockedbyclient'); }
        return route.continue();
      });
      ctx.on('requestfinished', async req => {
        const u = req.url();
        if (ENGEL.some(r => r.test(u))) gecenTakip.push(u.slice(0, 120));
        if (req.resourceType() === 'media' || /\.mp4(\?|$)/.test(u)) {
          try { const s = await req.sizes(); medya.push({ url: u.split('?')[0].slice(-80), bayt: s.responseBodySize, t: Math.round(req.timing().startTime) }); } catch (e) {}
        }
      });
      await ctx.addInitScript(() => {
        const t = window.__ttT = { lcp: 0, kaymalar: [] };
        try { new PerformanceObserver(l => { for (const e of l.getEntries()) t.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
        try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') t.fcp = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
        try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) t.kaymalar.push({ t: Math.round(e.startTime), d: +e.value.toFixed(4) }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
        // Perde yoksa (kopya tema) bunu DCL aninda karara bagla; daha once karar verilirse <body> ile <loading-bar> arasinda yaris olur.
        document.addEventListener('DOMContentLoaded', () => { t.dcl = Math.round(performance.now()); if (!document.querySelector('loading-bar')) t.perde_var = false; });
        addEventListener('load', () => { t.load = Math.round(performance.now()); });
        const izle = () => {
          const lb = document.querySelector('loading-bar');
          if (lb) {
            t.perde_var = true;
            const op = parseFloat(getComputedStyle(lb).opacity);
            if (t.perde_baslar === undefined && op < 0.999) t.perde_baslar = Math.round(performance.now());
            if (lb.hidden || op <= 0.001) { t.perde_biter = Math.round(performance.now()); return; }
          } else if (t.perde_var === false) { return; }
          if (performance.now() < 60000) requestAnimationFrame(izle);
        };
        requestAnimationFrame(izle);
      });
      const p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable');
      const medyaCdp = {};
      cdp.on('Network.requestWillBeSent', e => { if (/\.mp4(\?|$)/.test(e.request.url)) medyaCdp[e.requestId] = { url: e.request.url.split('?')[0].split('/').pop(), bayt: 0 }; });
      cdp.on('Network.dataReceived', e => { const m = medyaCdp[e.requestId]; if (m) m.bayt += e.dataLength; });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      try {
        await p.goto(url + '?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
        await p.waitForFunction(() => window.__ttT && (window.__ttT.perde_biter !== undefined || window.__ttT.perde_var === false), null, { timeout: 30000 }).catch(() => {});
        await bekle(4000);
        const t = await p.evaluate(() => window.__ttT);
        const tema = await p.evaluate(() => (window.Shopify && Shopify.theme) ? Shopify.theme.id : null);
        t.gorunur_an = Math.max(t.lcp || 0, t.perde_var ? (t.perde_biter || 0) : 0);
        t.cls = +t.kaymalar.reduce((s, k) => s + k.d, 0).toFixed(4);
        const videoBayt = Object.values(medyaCdp).reduce((s, m) => s + m.bayt, 0);
        sonuc.push({ tur, ad, tema, ...t, engellenen, gecenTakip, medya, videoMB: +(videoBayt / 1048576).toFixed(2), videoIstekleri: Object.values(medyaCdp) });
        console.log(tur, ad, 'tema', tema, 'gorunur', t.gorunur_an, 'fcp', t.fcp, 'lcp', t.lcp, 'dcl', t.dcl, 'load', t.load, 'perde', t.perde_var, t.perde_biter, 'cls', t.cls, 'engel', Object.values(engellenen).reduce((a, b) => a + b, 0), 'gecen-takip', gecenTakip.length, 'video-MB', (videoBayt / 1048576).toFixed(2));
      } catch (e) { sonuc.push({ tur, ad, hata: String(e).slice(0, 160) }); console.log('HATA', ad, e.message); }
      await ctx.close();
      await bekle(1000);
    }
  }
  fs.writeFileSync(CIKIS, JSON.stringify(sonuc, null, 1));
  await br.close();
})();
