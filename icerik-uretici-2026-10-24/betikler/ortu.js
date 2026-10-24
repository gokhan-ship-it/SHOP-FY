// Sayfa en alta kaydirildiginda sabit (fixed) ogeler footer satirinin ustune biniyor mu?
const { chromium } = require('playwright');
const TID = process.argv[2];
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail-edge|\/\.well-known\/shopify\/monorail|trueprofit/;
const YOLLAR = (process.argv[3] || '/,/collections/all,/collections/couple-urunler,/products/auron-zaman-kapsulu-bileklik,/pages/icerik-uretici').split(',');
(async () => {
  const br = await chromium.launch();
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    for (const yol of YOLLAR) {
      const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
      await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
      const p = await ctx.newPage();
      for (let d = 0; d < 3; d++) { await p.goto('https://texttonext.com' + yol + '?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(5000); if (await p.evaluate(() => !!(window.Shopify && Shopify.theme))) break; await p.waitForTimeout(15000); }
      await p.evaluate(() => { const e = document.getElementById('PBarNextFrameWrapper'); if (e) e.style.setProperty('display', 'none', 'important'); });
      // Alt cubuklar kaydirinca beliriyor ve govdeye bosluk ekliyor: iki kez en alta kaydir
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2500);
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const a = document.querySelector('.tt-footer-satir a'); if (!a) return { link: 'yok' };
        const b = a.getBoundingClientRect();
        const noktalar = [0.05, 0.25, 0.5, 0.75, 0.97].map(f => { const el = document.elementFromPoint(b.left + b.width * f, b.top + b.height / 2); return a.contains(el) ? 'link' : (el ? el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] : null); });
        const sabit = [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); if (c.position !== 'fixed' && c.position !== 'sticky') return false; if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; const x = e.getBoundingClientRect(); return x.width > 0 && x.height > 0 && x.bottom > b.top && x.top < b.bottom && x.right > b.left && x.left < b.right; })
          .filter(e => e.tagName.toLowerCase() !== 'shopify-chat')
          .map(e => { const x = e.getBoundingClientRect(), c = getComputedStyle(e); return e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' [' + Math.round(x.left) + ',' + Math.round(x.top) + ' ' + Math.round(x.width) + 'x' + Math.round(x.height) + '] pe=' + c.pointerEvents + ' op=' + c.opacity + ' tr=' + c.transform; });
        const zemin = getComputedStyle(document.querySelector('.tt-footer-satir [class^="ttfs-"]')).backgroundColor;
        return { link: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], noktalar, sabit: sabit.slice(0, 6), zemin, bodyAltBosluk: getComputedStyle(document.body).paddingBottom };
      });
      console.log(w, yol, JSON.stringify(r));
      await ctx.close();
    }
  }
  await br.close();
})();
