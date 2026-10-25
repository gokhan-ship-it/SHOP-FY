// Urun sayfasi: cark kodu varken / yokken rozet ve fiyat satiri konumlari (390 ve 1440)
const { chromium } = require('playwright');
const TID = process.argv[2];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail/, /trueprofit\.io/];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const out = {};
  for (const W of [390, 1440]) for (const kod of [false, true]) {
    const m = W < 800;
    const ctx = await br.newContext({ viewport: { width: W, height: m ? 844 : 900 }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 3 : 1, locale: 'tr-TR' });
    await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
    if (kod) await ctx.addCookies([['wlo-codebar-code', 'TESTKOD'], ['wlo-codebar-counter', '3600'], ['wlo-codebar-time', String(Date.now())]].map(([name, value]) => ({ name, value, domain: 'texttonext.com', path: '/' })));
    const page = await ctx.newPage();
    await page.goto('https://texttonext.com/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik?preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(3000);
    out[W + (kod ? '-kod' : '-normal')] = await page.evaluate(() => {
      const b = e => { if (!e) return null; const x = e.getBoundingClientRect(); if (!x.width) return 'gizli'; return { x: Math.round(x.left), y: Math.round(x.top + scrollY), w: Math.round(x.width), alt: Math.round(x.bottom + scrollY) }; };
      return { rozetUrun: b(document.querySelector('.tt-kmp-rozet--urun')), rozetKod: b(document.querySelector('.tt-kmp-rozet--kod')),
        temaFiyat: b(document.querySelector('.product__title .product__price')), carkFiyat: b(document.querySelector('product-info [data-tt-uf]:not([data-tt-uf-yapiskan])')),
        baslik: b(document.querySelector('.product__title h1')), taksit: b(document.querySelector('.tt-fb')), gorunenRozet: [...document.querySelectorAll('[data-tt-kmp]')].filter(e => e.getBoundingClientRect().width > 0).length };
    });
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1)); await br.close();
})();
