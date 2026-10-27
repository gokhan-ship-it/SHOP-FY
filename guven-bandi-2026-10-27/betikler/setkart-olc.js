// Hazir set kartlarinin ic olculeri (Couple modu). node setkart-olc.js <tema> <cikis> 
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT] = process.argv.slice(2);
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = [];
  for (const [W, H, m] of [[390, 844, true], [360, 740, true], [1440, 900, false]]) {
    const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m, locale: 'tr-TR', userAgent: m ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
    await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    await p.goto('https://texttonext.com/collections/zaman-kapsulu-bileklik?mod=couple&preview_theme_id=' + TID, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
    await bekle(3000);
    const o = await p.evaluate(() => {
      const r = e => e ? e.getBoundingClientRect() : null;
      const kartlar = [...document.querySelectorAll('.tt-sc-setkart')].slice(0, 14).map(k => {
        const g = r(k.querySelector('.tt-uk-gorsel')), u = r(k.querySelector('.tt-sc-setkart-ust')), a = r(k.querySelector('.tt-sc-setkart-ad')), f = r(k.querySelector('.tt-sc-setkart-fiyatlar')), kb = r(k), e = r(k.querySelector('.tt-sc-setkart-etiket'));
        return { ad: (k.querySelector('.tt-sc-setkart-ad') || {}).textContent, kart: [Math.round(kb.width), Math.round(kb.height)], gorsel: Math.round(g.height), ustSatir: Math.round(u.height), adSatir: Math.round(a.height), adFiyatArasi: Math.round(f.top - a.bottom), etiketUst: e && Math.round(e.top - f.top), fiyatBlok: Math.round(f.height), altBosluk: Math.round(kb.bottom - f.bottom) };
      });
      const s = document.querySelector('.tt-sc-setler'), iz = document.querySelector('.tt-sc-setler-izgara'), nav = document.querySelector('[data-sc-setler-nav]'), ust = document.querySelector('.tt-sc-set-ust');
      return { kartlar, setlerH: s && Math.round(r(s).height), izgaraH: iz && Math.round(r(iz).height), nav: nav && !nav.hidden ? Math.round(r(nav).height) : 'gizli', navAlt_ustBasligaKadar: nav && ust ? Math.round(r(ust).top - r(nav).bottom) : null };
    });
    o.boy = W; S.push(o); console.log(W, JSON.stringify({ setlerH: o.setlerH, izgaraH: o.izgaraH, nav: o.nav, navAlt: o.navAlt_ustBasligaKadar }), JSON.stringify(o.kartlar.slice(0, 14).map(k => [k.ad, k.kart.join('x'), 'g' + k.gorsel, 'u' + k.ustSatir, 'a' + k.adSatir, 'bosluk' + k.adFiyatArasi, 'fb' + k.fiyatBlok, 'alt' + k.altBosluk])));
    await ctx.close(); await bekle(2000);
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1)); await br.close();
})();
