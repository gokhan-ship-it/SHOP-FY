// SALT OKUMA (yalnizca bu tarayici oturumunun sepeti): /cart.js'te hangi indirim alanlari var?
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await br.newContext(); await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const p = await ctx.newPage();
  await p.goto('https://texttonext.com/?preview_theme_id=' + process.argv[2], { waitUntil: 'load' });
  const r = await p.evaluate(async () => {
    const j = await (await fetch('/collections/zaman-kapsulu-bileklik/products.json?limit=5')).json();
    const v = j.products.map(p => p.variants.find(x => x.available)).filter(Boolean)[0];
    await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] }) });
    await fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discount: 'K7QX4M9TR' }) });
    const c = await (await fetch('/cart.js', { headers: { Accept: 'application/json' } })).json();
    return { anahtarlar: Object.keys(c), discount_applications: c.discount_applications, discount_codes: c.discount_codes, cart_level: (c.cart_level_discount_applications || []).map(d => ({ type: d.type, title: d.title, key: d.key })) };
  });
  console.log(JSON.stringify(r, null, 1));
  await br.close();
})();
