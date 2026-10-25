// Cark kodu gecerliyken (tarayicidaki cerezlerle, test oturumunda) Prizma kart ve urun sayfasi fiyat gosterimi
const { chromium } = require('playwright');
const TID = process.argv[2];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail/, /trueprofit\.io/];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0' });
  await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  const simdi = Date.now();
  await ctx.addCookies([['wlo-codebar-code', 'TESTKOD'], ['wlo-codebar-counter', '3600'], ['wlo-codebar-time', String(simdi)]].map(([name, value]) => ({ name, value, domain: 'texttonext.com', path: '/' })));
  const page = await ctx.newPage();
  const sonuc = {};
  const gor = `e => { if (!e) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).display !== 'none' && !e.closest('[hidden]'); }`;
  for (const [ad, p, kart] of [['erkek', '/collections/zaman-kapsulu-bileklik', '.tt-sc-karo'], ['ana', '/', '.tt-cs-kart'], ['urun', '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik', 'main']]) {
    await page.goto('https://texttonext.com' + p + (p.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(3500);
    sonuc[ad] = await page.evaluate(([kart, gorS]) => {
      const gor = eval(gorS);
      const k = [...document.querySelectorAll(kart)].find(x => /Prizma/.test(x.textContent) && !/\+|Couple/.test((x.querySelector('.tt-cs-ad, .tt-uk-ad, h1') || x).textContent));
      if (!k) return null;
      const g = [...k.querySelectorAll('.price, [data-tt-kart-fb], [data-tt-fb-serit], .tt-kart-fiyat, .tt-cs-fiyat, s, .price__sale')].filter(gor).map(e => (e.className || e.tagName).toString().slice(0, 40) + ': ' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 70));
      return { kodAktif: document.documentElement.hasAttribute('data-tt-kod'), rozet: [...k.querySelectorAll('[data-tt-kmp]')].filter(gor).map(e => e.textContent), gorunenFiyatlar: [...new Set(g)].slice(0, 8) };
    }, [kart, gor]);
  }
  console.log(JSON.stringify(sonuc, null, 1));
  await br.close();
})();
