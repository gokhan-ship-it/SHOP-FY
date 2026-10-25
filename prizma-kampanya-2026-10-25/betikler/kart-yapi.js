const { chromium } = require('playwright');
const TID = process.argv[2]; const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  for (const W of [375, 1440]) {
    const m = W < 800; const ctx = await br.newContext({ viewport: { width: W, height: 844 }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 3 : 1 });
    await ctx.route('**/*', r => /facebook|google|tiktok|monorail|trueprofit/.test(r.request().url()) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    await p.goto('https://texttonext.com/search?q=prizma&type=product&preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(2500);
    console.log(W, 'ARAMA', JSON.stringify(await p.evaluate(() => {
      const a = [...document.querySelectorAll('.product-card a[href*="prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik"]')][0]; if (!a) return null;
      const med = a.closest('.product-card').querySelector('.product-card__media');
      const mb = med.getBoundingClientRect();
      return { medya: [Math.round(mb.width), Math.round(mb.height)], cocuklar: [...med.children].map(c => { const b = c.getBoundingClientRect(); const cs = getComputedStyle(c);
        return { s: (c.className || c.tagName).toString().slice(0, 50), pos: cs.position, disp: cs.display, ust: Math.round(b.top - mb.top), alt: Math.round(mb.bottom - b.bottom), sol: Math.round(b.left - mb.left), w: Math.round(b.width), h: Math.round(b.height) }; }) };
    })));
    await p.goto('https://texttonext.com/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik?preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(2500);
    console.log(W, 'URUN', JSON.stringify(await p.evaluate(() => {
      const g = document.querySelector('media-gallery, .product__media, [class*="product__media"], .media-gallery');
      const r = e => { const b = e.getBoundingClientRect(); return { s: (e.tagName + '.' + (e.className || '')).toString().slice(0, 70), x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height), pos: getComputedStyle(e).position, ov: getComputedStyle(e).overflow }; };
      const out = []; let e = g; for (let i = 0; e && i < 6; i++) { out.push(r(e)); e = e.parentElement; }
      const img = document.querySelector('product-info img, .product__media img, media-gallery img');
      const yol = []; let x = img; for (let i = 0; x && i < 10; i++) { yol.push(r(x)); x = x.parentElement; }
      return { galeriVeUstleri: out, ilkGorselYolu: yol };
    })));
    await ctx.close();
  }
  await br.close();
})();
