// Sunucu tarafi (Liquid) bitis kontrolu: HTML'de rozet ogesi hic var mi, JS sinifi, yedek rozet
const { chromium } = require('playwright');
const TID = process.argv[2];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await ctx.route('**/*', r => /facebook|google|tiktok|monorail|trueprofit/.test(r.request().url()) ? r.abort() : r.continue());
  const p = await ctx.newPage(); const out = {};
  for (const [ad, yol] of [['ana', '/'], ['erkek', '/collections/zaman-kapsulu-bileklik'], ['kadin', '/collections/zaman-kapsulu-kolyeler'], ['urun', '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik'], ['arama', '/search?q=prizma&type=product']]) {
    const r = await p.goto('https://texttonext.com' + yol + (yol.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID + '&_t=' + Date.now(), { waitUntil: 'load' });
    await bekle(1500);
    const ham = await r.text();
    out[ad] = { htmlRozetOgesi: (ham.match(/<svg[^>]*class="ttn-adv-badge[^>]*\sdata-tt-kmp[\s>]/g) || []).length, htmlSerit: (ham.match(/class="tt-kmp-serit"/g) || []).length, htmlEtiket: (ham.match(/class="tt-kmp-etiket"/g) || []).length, headStil: /\.ttn-adv-badge\{/.test(ham), htmlYedek: (ham.match(/<span[^>]*\sdata-tt-kmp-yedek[\s>]/g) || []).length,
      jsBitis: (ham.match(/var b=(\d+)/) || [])[1] || null, bittiSinifi: await p.evaluate(() => document.documentElement.classList.contains('tt-kmp-bitti')),
      gorunenRozet: await p.evaluate(() => [...document.querySelectorAll('[data-tt-kmp]')].filter(e => e.getBoundingClientRect().width > 0).length),
      gorunenIndirim17: await p.evaluate(() => [...document.querySelectorAll('.tt-uk-rozet--kampanya')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.textContent.trim()).slice(0, 2)) };
  }
  console.log(JSON.stringify(out)); await br.close();
})();
