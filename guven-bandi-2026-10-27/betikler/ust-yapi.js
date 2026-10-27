// SALT OKUMA: her sayfa tipinde ekranin ustu: sabit header, govde boslugu, ilk akistaki ogeler.
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT, W] = process.argv.slice(2);
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const SAYFALAR = ['/', '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik', '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple', '/collections/zaman-kapsulu-bileklik', '/cart', '/pages/kullanim-kilavuzu', '/pages/iletisim', '/pages/couple-daha-fazla-bilgi-al', '/pages/sozlesmeler-ve-politikalar'];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const w = parseInt(W || '390'); const m = w < 750;
  const ctx = await br.newContext({ viewport: { width: w, height: m ? 844 : 900 }, isMobile: m, hasTouch: m, locale: 'tr-TR',
    userAgent: m ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  const p = await ctx.newPage();
  const S = [];
  for (const y of SAYFALAR) {
    const r = await p.goto('https://texttonext.com' + y + (y.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID, { waitUntil: 'load', timeout: 90000 }).catch(e => null);
    await bekle(3000);
    const o = await p.evaluate(() => {
      const fixedChain = (x, yy) => { let e = document.elementFromPoint(x, yy); while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.position === 'fixed' || cs.position === 'sticky') return e; e = e.parentElement; } return null; };
      const hd = fixedChain(innerWidth / 2, 2);
      const hb = hd ? hd.getBoundingClientRect() : null;
      const desc = e => e ? (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 80) : null;
      const pc = document.getElementById('PageContainer'), mn = document.getElementById('MainContent');
      // header'in hemen altindaki nokta neye ait
      const alt = hb ? document.elementFromPoint(innerWidth / 2, Math.round(hb.bottom) + 4) : null;
      // body'nin dogrudan cocuklari arasinda akista gorunen ve PageContainer'dan once gelenler
      const once = [];
      for (const c of document.body.children) { if (c === pc) break; const cs = getComputedStyle(c); const b = c.getBoundingClientRect(); if (cs.display !== 'none' && cs.position !== 'fixed' && cs.position !== 'absolute' && b.height > 0) once.push(desc(c) + ' h=' + Math.round(b.height) + ' top=' + Math.round(b.top)); }
      const ilk = mn ? [...mn.children].find(c => c.getBoundingClientRect().height > 0) : null;
      return { header: desc(hd), headerSection: hd && hd.closest('[id^="shopify-section"]') ? hd.closest('[id^="shopify-section"]').id : null, headerAlt: hb && Math.round(hb.bottom), headerZ: hd && getComputedStyle(hd).zIndex,
        bodyPadTop: getComputedStyle(document.body).paddingTop, pcTop: pc && Math.round(pc.getBoundingClientRect().top), mainTop: mn && Math.round(mn.getBoundingClientRect().top), mainPadTop: mn && getComputedStyle(mn).paddingTop,
        ilkIcerik: desc(ilk), ilkIcerikTop: ilk && Math.round(ilk.getBoundingClientRect().top), headerAltindaki: desc(alt), pcOncesiAkis: once, tema: window.Shopify && Shopify.theme && Shopify.theme.name };
    }).catch(e => ({ hata: String(e).slice(0, 120) }));
    o.sayfa = y; o.durum = r ? r.status() : 0; S.push(o); console.log(JSON.stringify(o));
    await bekle(1500);
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1)); await br.close();
})();
