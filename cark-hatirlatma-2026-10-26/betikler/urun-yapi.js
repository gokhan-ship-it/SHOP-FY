// SALT OKUMA: urun sayfasindaki ana bolumun bloklari (telefon 390 ve masaustu), y konumlari.
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  for (const [W, H, m] of [[390, 844, true], [1440, 900, false]]) {
    const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m });
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    const p = await ctx.newPage();
    await p.goto('https://texttonext.com/products/' + process.argv[3] + '?preview_theme_id=' + process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const sec = [...document.querySelectorAll('main [id^="shopify-section-"]')].map(s => ({ id: s.id.replace('shopify-section-', ''), y: Math.round(s.getBoundingClientRect().top + scrollY), h: Math.round(s.getBoundingClientRect().height) }));
      const ana = document.querySelector('main [id*="__main"]');
      const bloklar = ana ? [...ana.querySelectorAll('[class*="product__"], product-form, .product-form, [data-block-type], [id*="Block"], .buy-buttons, form[action*="/cart/add"]')].filter(e => e.getBoundingClientRect().height > 0).slice(0, 40).map(e => ({ tag: e.tagName.toLowerCase(), id: e.id, cls: (e.className + '').slice(0, 70), y: Math.round(e.getBoundingClientRect().top + scrollY), h: Math.round(e.getBoundingClientRect().height) })) : [];
      return { sec, bloklar };
    });
    console.log('=====', W); console.log(JSON.stringify(r.sec)); r.bloklar.forEach(b => console.log(JSON.stringify(b)));
    await ctx.close();
  }
  await br.close();
})();
