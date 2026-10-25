const { chromium } = require('playwright');
const TID = process.argv[2]; const H = 'prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik';
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail/, /trueprofit\.io/];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  const page = await ctx.newPage();
  const cizgi = () => page.evaluate(() => [...document.querySelectorAll('.price__sale')].filter(e => e.getBoundingClientRect().width > 0).slice(0, 4).map(e => {
    const b = getComputedStyle(e, '::before'); const c = getComputedStyle(e);
    const sat = e.closest('.price').querySelector('.price__regular'); const sc = getComputedStyle(sat);
    return { bolum: (e.closest('[id^="shopify-section"]') || {}).id?.replace(/.*__/, ''), karsi: e.textContent.trim(), karsiBoyut: c.fontSize, karsiRenk: c.color, konum: c.position,
      cizgi: { content: b.content, kalinlik: b.borderBottomWidth, renk: b.borderBottomColor, donus: b.transform, genislik: b.width, konum: b.position },
      satis: sat.textContent.trim(), satisBoyut: sc.fontSize, satisKalinlik: sc.fontWeight, satisRenk: sc.color };
  }));
  await page.goto('https://texttonext.com/products/' + H + '?preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(2500);
  console.log('URUN', JSON.stringify(await cizgi(), null, 0));
  // urun sayfasindaki diger fiyat satirlari (yapiskan cubuk, alt CTA)
  for (let y = 0; y < 12; y++) { await page.mouse.wheel(0, 900); await bekle(200); }
  console.log('URUN-DIGER', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[id^="shopify-section"]')].map(s => ({ id: s.id.replace(/.*__/, ''), t: (s.textContent.match(/[12][.,]\d{3}([.,]\d\d)?\s?(TL|₺)/g) || []).slice(0, 6) })).filter(x => x.t.length))));
  console.log('YAPISKAN', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); return (c.position === 'fixed' || c.position === 'sticky') && e.getBoundingClientRect().height > 0 && /[12][.,]\d{3}/.test(e.textContent); }).map(e => ({ s: (e.className || '').toString().slice(0, 60), t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 140), cizili: [...e.querySelectorAll('s,del,.price__sale')].map(x => x.textContent.trim()) })))));
  await page.goto('https://texttonext.com/search?q=prizma&type=product&preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(2500);
  console.log('ARAMA', JSON.stringify(await cizgi(), null, 0));
  const sid = await page.evaluate(() => (document.querySelector('[is="predictive-search"], predictive-search') || {}).dataset?.sectionId || theme.utils.sectionId(document.querySelector('[is="predictive-search"], predictive-search')));
  console.log('SID', sid);
  const r = await page.evaluate(async ([TID, sid]) => { const u = '/search/suggest?q=prizma&resources[limit]=3&resources[limit_scope]=each&section_id=' + sid + '&preview_theme_id=' + TID;
    const x = await fetch(u); const t = await x.text(); const d = document.createElement('div'); d.id = 'tt-anlik'; d.style.cssText = 'position:relative;width:390px'; d.innerHTML = t; document.body.prepend(d); return [x.status, t.length]; }, [TID, sid]);
  console.log('ANLIK http', r); await bekle(800);
  console.log('ANLIK', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#tt-anlik a[href*="/products/"]')].slice(0, 6).map(a => { const k = a.closest('.horizontal-product, .product-card, li') || a; return { h: a.getAttribute('href').split('/products/')[1].split('?')[0].slice(0, 40), t: k.textContent.replace(/\s+/g, ' ').trim().slice(0, 120), sale: !!k.querySelector('.price__sale'), ciz: k.querySelector('.price__sale') ? getComputedStyle(k.querySelector('.price__sale'), '::before').borderBottomWidth : null }; }))));
  await br.close();
})();
