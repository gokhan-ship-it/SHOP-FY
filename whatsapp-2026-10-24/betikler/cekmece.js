const { chromium } = require('playwright');
const TID = process.argv[2];
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail|trueprofit|wa\.me|whatsapp\.com/;
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
  const p = await ctx.newPage();
  await p.goto('https://texttonext.com/products/auron-zaman-kapsulu-bileklik?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(5000);
  console.log(await p.evaluate(() => [...document.querySelectorAll('a[aria-controls="CartDrawer"]')].map(a => { const b = a.getBoundingClientRect(); return a.className + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) + ' ' + getComputedStyle(a).visibility; })));
  const sonuc = await p.evaluate(async () => {
    const d = document.getElementById('CartDrawer'); if (!d) return 'CartDrawer yok';
    const tip = typeof d.show; if (tip === 'function') d.show(); else d.setAttribute('open', '');
    await new Promise(r => setTimeout(r, 1500));
    const c = getComputedStyle(document.querySelector('a.tt-wa'));
    return { show: tip, body: (document.body.className.match(/has-modal-[a-z]+/g) || []).join(' '), wa: c.visibility + ' / ' + c.opacity };
  });
  console.log(JSON.stringify(sonuc));
  await br.close();
})();
