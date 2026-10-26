// Kullanim: node konsol.js <tema_id> <cikis.json>
// Ayni sayfalari temiz tarayiciyla acip konsol hatalarini toplar (canli ile kopyayi karsilastirmak icin).
// Akis: ana sayfa -> koleksiyon -> urun -> sepete urun ekle + cekmece -> /cart.
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT] = process.argv.slice(2);
const K = 'https://texttonext.com';
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/,
  /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { tema: TID, hatalar: [] };
  for (const [W, H, mobil] of [[390, 844, true], [1440, 900, false]]) {
    const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: mobil, hasTouch: mobil, locale: 'tr-TR',
      userAgent: mobil ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; tr_TR)' : undefined });
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
    const page = await ctx.newPage();
    const yol = () => page.url().replace(K, '').replace(/[?&]preview_theme_id=\d+/, '');
    page.on('console', m => { if (m.type() === 'error') S.hatalar.push({ boy: W, u: yol(), m: m.text().slice(0, 240) }); });
    page.on('pageerror', e => S.hatalar.push({ boy: W, u: yol(), m: 'PAGEERROR ' + String(e.message).slice(0, 240) }));
    for (const y of ['/', '/collections/zaman-kapsulu-bileklik', '/collections/zaman-kapsulu-bileklik?mod=couple', '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik']) {
      await page.goto(K + y + (y.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
      await bekle(2500);
      await page.evaluate(async () => { for (let i = 0; i < 12; i++) { window.scrollBy(0, 150); await new Promise(r => setTimeout(r, 60)); } }).catch(() => {});
      await bekle(1500);
    }
    await page.evaluate(async () => {
      const j = await (await fetch('/collections/zaman-kapsulu-bileklik/products.json?limit=30')).json();
      const v = j.products.map(p => p.variants.find(x => x.available)).filter(Boolean)[0];
      await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] }) });
      document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { open: true } }));
    }).catch(e => S.hatalar.push({ boy: W, u: 'ekle', m: String(e).slice(0, 200) }));
    await bekle(3500);
    await page.goto(K + '/cart?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
    await bekle(3000);
    await ctx.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
