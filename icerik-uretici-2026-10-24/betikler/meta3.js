// Meta isteklerinin ayrintisi (facebook.com/tr iptal edilir, digerleri gozlenir).
const { chromium } = require('playwright');
const TID = process.argv[2];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  for (const yol of ['/pages/icerik-uretici', '/pages/iletisim']) {
    for (let tur = 0; tur < 1; tur++) {
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
      await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
      const fb = [];
      await ctx.route('**/*', r => {
        const q = r.request(), u = q.url();
        if (/facebook\.(com|net)/.test(u)) {
          const b = q.postData() || '';
          fb.push(q.method() + ' ' + u.replace(/^(https:\/\/[^?]+)\?.*?(ev=[^&]+)?.*$/, '$1 $2').slice(0, 110) + (b ? ' body-ev=' + ((b.match(/name="ev"\r?\n\r?\n([^\r\n]+)/) || b.match(/(?:^|&)ev=([^&]+)/) || [])[1] || b.slice(0, 60).replace(/\s+/g, ' ')) : ''));
          if (/facebook\.com\/tr/.test(u)) return r.abort();
          return r.continue();
        }
        if (/\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail|trueprofit/.test(u)) return r.abort();
        return r.continue();
      });
      const p = await ctx.newPage();
      await p.goto('https://texttonext.com' + yol + '?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
      await p.waitForTimeout(20000);
      const fbq = await p.evaluate(() => typeof window.fbq);
      console.log(yol, 'tur', tur + 1, 'fbq(ana pencere)=', fbq, '\n  ' + fb.join('\n  '));
      await ctx.close();
    }
  }
  await br.close();
})();
