const { chromium } = require('playwright');
const TID = process.argv[2];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail/, /trueprofit\.io/];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  const page = await ctx.newPage();
  const istek = []; page.on('response', r => { if (/search\/suggest/.test(r.url())) istek.push([r.status(), r.url().replace(/^https:\/\/[^/]+/, '').slice(0, 160)]); });
  await page.goto('https://texttonext.com/?preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(2500);
  const ac = await page.$$eval('a[href*="search"], button[aria-controls*="search" i], [data-search-open], summary[aria-controls*="Search"]', els => els.map(e => e.outerHTML.slice(0, 160)));
  console.log('ACICI', ac.slice(0, 5));
  const inp = await page.$('input[id^="SearchFormInput-"]');
  console.log('INPUT', inp ? await inp.getAttribute('id') : null);
  await page.evaluate(() => { const f = document.querySelector('#PBarNextFrameWrapper'); if (f) f.style.display = 'none'; });
  // cekmeceyi ac (gorunur olmasi icin), sonra yaz
  const btn = await page.$('[aria-controls="SearchDrawer"], a[href="/search"], [href*="/search"]');
  if (btn) { try { await btn.click({ timeout: 3000 }); } catch (e) { console.log('tik hatasi', e.message.slice(0, 80)); } }
  await bekle(1200);
  const g = await page.$('input[id^="SearchFormInput-"]:visible');
  if (g) { await g.fill(''); await g.type('prizma', { delay: 80 }); } else { await page.evaluate(() => { const i = document.querySelector('input[id^="SearchFormInput-"]'); i.value = 'prizma'; i.dispatchEvent(new Event('input', { bubbles: true })); }); }
  await bekle(3500);
  console.log('ISTEK', istek);
  console.log('SONUC', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[id^="PredictiveSearchResults-"] a[href*="/products/"]')].slice(0, 8).map(a => {
    const k = a.closest('.horizontal-product, .product-card, li') || a; const s = k.querySelector('.price__sale');
    return { h: a.getAttribute('href').split('/products/')[1].split('?')[0].slice(0, 50), t: k.textContent.replace(/\s+/g, ' ').trim().slice(0, 110), gorunur: k.getBoundingClientRect().height > 0,
      karsi: s ? s.textContent.trim() : null, cizgi: s ? getComputedStyle(s, '::before').borderBottomWidth + ' ' + getComputedStyle(s, '::before').transform : null };
  }))));
  await br.close();
})();
