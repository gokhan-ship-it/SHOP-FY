// Urun sayfasinda yapiskan sepete ekle cubugu ne zaman aciliyor; WA ile bosluk.
const { chromium } = require('playwright');
const TID = process.argv[2], YOL = process.argv[3] || '/products/auron-zaman-kapsulu-bileklik';
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail|trueprofit/;
(async () => {
  const br = await chromium.launch();
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    await p.goto('https://texttonext.com' + YOL + (YOL.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
    await p.waitForTimeout(5000);
    await p.evaluate(() => { const e = document.getElementById('PBarNextFrameWrapper'); if (e) e.style.setProperty('display', 'none', 'important'); });
    const bilgi = await p.evaluate(() => { const f = document.querySelector('product-sticky-form'); return { var: !!f, display: f ? getComputedStyle(f).display : null, cocuk: f && f.firstElementChild ? f.firstElementChild.tagName + '.' + f.firstElementChild.className.split(' ')[0] : null, yukseklik: document.documentElement.scrollHeight, tekli: !!document.querySelector('[data-tt-ts-sepet]') }; });
    console.log(w, YOL, JSON.stringify(bilgi));
    for (const y of [400, 900, 1400, 2000, 3000, 4500]) {
      await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const a = document.querySelector('a.tt-wa').getBoundingClientRect();
        const k = document.querySelector('product-sticky-form > :first-child'); let kart = null;
        if (k) { const c = getComputedStyle(k), b = k.getBoundingClientRect(); kart = { op: c.opacity, vis: c.visibility, y: Math.round(b.top), h: Math.round(b.height) }; }
        const t = document.querySelector('[data-tt-ts-sepet]'); let ts = null;
        if (t) { const b = t.getBoundingClientRect(); ts = { y: Math.round(b.top), alt: Math.round(b.bottom), x: Math.round(b.left), sag: Math.round(b.right) }; }
        return { waY: Math.round(a.top), waAlt: Math.round(a.bottom), waX: Math.round(a.left), yigin: getComputedStyle(document.documentElement).getPropertyValue('--tt-alt-yigin').trim(), kart, tekliSepet: ts, tasi: document.documentElement.classList.contains('tt-ts-sohbet-tasi'), kaydir: getComputedStyle(document.documentElement).getPropertyValue('--tt-ts-sohbet-kaydir').trim() };
      });
      console.log('  y=' + y, JSON.stringify(r));
    }
    await ctx.close();
  }
  await br.close();
})();
