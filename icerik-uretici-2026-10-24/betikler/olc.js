// Yeni baslik metinleri mevcut stille kac piksel tutuyor (sayfaya gecici yazilir, kaydedilmez).
const { chromium } = require('playwright');
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail-edge|\/\.well-known\/shopify\/monorail|trueprofit/;
(async () => {
  const br = await chromium.launch();
  for (const [w, m] of [[360, true], [390, true], [1440, false]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 800 }, isMobile: m, hasTouch: m });
    await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    await p.goto('https://texttonext.com/pages/icerik-uretici?preview_theme_id=189413589312', { waitUntil: 'load', timeout: 120000 });
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const h = document.querySelector('[data-ttiu] h1'), s = h.querySelectorAll('span');
      const genis = el => { const g = document.createRange(); g.selectNodeContents(el); return Math.round(g.getBoundingClientRect().width * 10) / 10; };
      const once = [genis(s[0]), genis(s[1])];
      s[0].textContent = 'Bir video çek.'; s[1].textContent = 'Her satıştan kazan.';
      const lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 1.08;
      return { kutu: h.clientWidth, eski: once, yeni: [genis(s[0]), genis(s[1])], satir: Math.round(h.getBoundingClientRect().height / lh), font: getComputedStyle(h).fontFamily.split(',')[0] + ' ' + getComputedStyle(h).fontSize };
    });
    console.log(w, JSON.stringify(r));
    await ctx.close();
  }
  await br.close();
})();
