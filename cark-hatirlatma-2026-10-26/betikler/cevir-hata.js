// Kullanim: node cevir-hata.js <tema_id>  -- carki ana sayfada cevirir, sayfa hatalarini (pageerror) yazar.
// Yalnizca bu tarayici oturumu; siparis yok. Takip istekleri iptal.
const { chromium } = require('playwright');
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  const p = await ctx.newPage(); const hatalar = [];
  p.on('pageerror', e => hatalar.push(String(e.message).slice(0, 160) + ' @ ' + String(e.stack || '').split('\n').slice(1, 2).join('').trim().slice(0, 160)));
  await p.goto('https://texttonext.com/?preview_theme_id=' + process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => !e.closest('[data-tt-cark-pencere]') && e.getBoundingClientRect().height > 0); k.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(500);
  await p.locator('[data-ttn-cark]:not([data-tt-cark-pencere] *) [data-ttn-kompakt]').first().click(); await p.waitForTimeout(900);
  const once = hatalar.length;
  await p.locator('[data-ttn-cark]:not([data-tt-cark-pencere] *) [data-ttn-cevir]').first().click(); await p.waitForTimeout(8000);
  console.log(JSON.stringify({ tema: process.argv[2], cevirmedenOnce: once, hatalar }, null, 1));
  await br.close();
})();
