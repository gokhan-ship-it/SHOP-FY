// Kullanim: node galeri-genislik.js <tema_id> <cikis.json>
// Urun galerisindeki gorsellerin masaustu genisliklerini birkac pencere genisliginde olcer (takip engelli).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const tid = process.argv[2];
const cikis = process.argv[3];
const engel = fs.readFileSync(path.join(__dirname, 'engel.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const engelRe = engel.map(p => new RegExp('^' + p.split('*').map(x => x.replace(/[.+?^${}()|[\]\\\/]/g, '\\$&')).join('.*') + '$'));
const sayfalar = {
  kunye: '/products/zaman-kapsulu-kunye',
  'astor-chloe-couple': '/products/luna-aurora-couple-zaman-kapsulu-kopya',
  noir: '/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya',
  'kral-zincir': '/products/zaman-kapsulu-bileklik-kral'
};
const genislikler = [768, 1024, 1280, 1366, 1440, 1680, 1920];
(async () => {
  const browser = await chromium.launch({ executablePath: '/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/chrome/opt/google/chrome/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const sonuc = {};
  for (const [ad, yol] of Object.entries(sayfalar)) {
    sonuc[ad] = {};
    for (const w of genislikler) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      await ctx.route('**/*', r => engelRe.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
      const page = await ctx.newPage();
      await page.goto('https://texttonext.com' + yol + '?preview_theme_id=' + tid, { waitUntil: 'load', timeout: 90000 });
      await page.waitForTimeout(1500);
      sonuc[ad][w] = await page.evaluate(() => {
        const g = document.querySelector('media-gallery');
        const imgs = g ? [...g.querySelectorAll('img')] : [];
        return imgs.map(i => ({ w: Math.round(i.getBoundingClientRect().width), sizes: i.getAttribute('sizes') || '', onizleme: !!i.closest('.product__preview'), kucuk: !!i.closest('.product__thumbnail, .thumbnail, [class*=thumb]') }))
          .filter(x => x.w > 0);
      });
      await ctx.close();
    }
    console.log(ad, JSON.stringify(Object.fromEntries(Object.entries(sonuc[ad]).map(([w, l]) => [w, [...new Set(l.filter(x => !x.kucuk).map(x => (x.onizleme ? 'P' : '') + x.w))]]))));
  }
  fs.writeFileSync(cikis, JSON.stringify(sonuc, null, 1));
  await browser.close();
})();
