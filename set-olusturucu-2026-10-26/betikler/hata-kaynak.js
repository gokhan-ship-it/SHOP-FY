// Kullanim: node hata-kaynak.js <cikis.json>
// Slot testindeki "Failed to fetch" sayfa hatalarinin kaynagi: canli ve kopya, reklam beacon'lari engelli ve serbest.
const { chromium } = require('playwright');
const fs = require('fs');
const K = 'https://texttonext.com';
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  const S = [];
  for (const [ad, onek] of [['canli', ''], ['kopya', 'preview_theme_id=189466968384']]) {
    for (const engel of [true, false]) {
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR' });
      if (engel) await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
      const p = await ctx.newPage();
      const h = []; const basarisiz = [];
      p.on('pageerror', e => h.push(String(e.message).slice(0, 120)));
      p.on('requestfailed', r => basarisiz.push(r.url().slice(0, 90)));
      await p.goto(K + '/collections/zaman-kapsulu-kolyeler?mod=couple' + (onek ? '&' + onek : ''), { waitUntil: 'load', timeout: 90000 }).catch(() => {});
      await bekle(4000);
      await p.evaluate(async () => { for (let i = 0; i < 15; i++) { window.scrollBy(0, 150); await new Promise(r => setTimeout(r, 80)); } });
      await bekle(2500);
      S.push({ tema: ad, beaconEngelli: engel, failedToFetch: h.filter(x => /Failed to fetch/.test(x)).length, digerHata: h.filter(x => !/Failed to fetch/.test(x)), basarisizIstek: basarisiz.length });
      await ctx.close();
    }
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(S, null, 1));
  console.log(JSON.stringify(S));
  await br.close();
})();
