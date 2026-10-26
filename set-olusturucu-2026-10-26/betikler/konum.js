// SALT OKUMA: Couple modunda set olusturucu parcalarinin konumu ve bos slota tiklayinca ne oldugu.
// Kullanim: node konum.js <tema_id> <cikis.json>
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT] = process.argv.slice(2);
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const OLC = () => {
  const K = document.querySelector('[data-sc-kurulu]') || document.querySelector('.tt-sc');
  const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); if (!b.height) return { gizli: true }; return { y: Math.round(b.top + scrollY), h: Math.round(b.height) }; };
  const q = s => K && K.querySelector(s);
  const ilkKaro = K && [...K.querySelectorAll('[data-sc-karo]')].find(e => e.getBoundingClientRect().height > 0);
  return { vh: innerHeight, mod: K && K.getAttribute('data-sc-aktif-mod'),
    kartlar: r(q('[data-sc-mod]') && q('[data-sc-mod]').parentElement), cark: r(q('[data-ttn-cark]')), setler: r(q('.tt-sc-setler')), setlerAdet: K ? K.querySelectorAll('.tt-sc-setler-izgara > *').length : 0,
    setUst: r(q('.tt-sc-set-ust')), setKutu: r(q('[data-sc-set]')), slot1: r(q('[data-sc-slot="0"]')), filtre: r(q('[data-sc-filtre]')), izgara: r(q('[data-sc-izgara]')), ilkUrun: r(ilkKaro), sayfaBoyu: document.documentElement.scrollHeight };
};
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = {};
  for (const [W, H, m] of [[390, 844, true], [360, 740, true], [1440, 900, false]]) {
    for (const yol of ['/collections/zaman-kapsulu-kolyeler?mod=couple', '/collections/zaman-kapsulu-bileklik?mod=couple', '/collections/couple-urunler?mod=couple']) {
      const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m, locale: 'tr-TR' });
      await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
      await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
      const p = await ctx.newPage();
      await p.goto('https://texttonext.com' + yol + '&preview_theme_id=' + TID, { waitUntil: 'load', timeout: 90000 }); await bekle(2500);
      const o = { ilk: await p.evaluate(OLC) };
      // bos slota tikla (once slotu ekrana getir)
      await p.evaluate(() => { const s = document.querySelector('[data-sc-slot="0"]'); if (s) s.scrollIntoView({ block: 'center' }); }); await bekle(500);
      const once = await p.evaluate(() => Math.round(scrollY));
      await p.locator('[data-sc-slot="0"]').first().click().catch(e => o.tikHata = String(e).slice(0, 120)); await bekle(1200);
      o.slotTik = { scrollOnce: once, scrollSonra: await p.evaluate(() => Math.round(scrollY)), acikDialog: await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.className).join(',')) };
      S[W + ' ' + yol.split('?')[0]] = o;
      await ctx.close();
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
