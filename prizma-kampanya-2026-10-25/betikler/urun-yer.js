const { chromium } = require('playwright');
const TID = process.argv[2], W = +(process.argv[3] || 390); const H = 'prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik';
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail/, /trueprofit\.io/];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] }); const m = W < 800;
  const ctx = await br.newContext({ viewport: { width: W, height: m ? 844 : 900 }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 3 : 1, locale: 'tr-TR',
    userAgent: m ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
  await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  const page = await ctx.newPage();
  await page.goto('https://texttonext.com/products/' + H + '?preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(2500);
  console.log(JSON.stringify(await page.evaluate(() => {
    const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height), t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 60), bg: c.backgroundColor, renk: c.color, disp: c.display, gtc: c.gridTemplateColumns }; };
    return { rozetBlok: r('.product__badges'), rozet: r('.product__badges .badge'), baslikBlok: r('.product__title'), h1: r('.product__title h1, .product__title .heading'), fiyatKap: r('.product__title .product__price'), fiyat: r('.product__title .price'), fb: r('.tt-fb'), sticky: r('product-sticky-form, .product-sticky-form') };
  }), null, 1));
  await br.close();
})();
