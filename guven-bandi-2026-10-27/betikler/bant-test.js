// Guven bandi otomatik kontrolleri. Kullanim: node bant-test.js <tema_id> <cikis.json>
// A) 390/360/1280/1440 x 6 sayfa: bant var mi, header'la arasi, yukseklik, icerik basi, mod, tasarim olculeri, aria, yatay tasma.
// B) Senaryolar: kayan serit hareketi + dokununca durma (390), hareketi azalt (390), uzun metin masaustu (1440),
//    cark cubugu (390 + 1440; ana sayfa, urun, Erkek), hamburger menu (390). Konsol hatalari her yukte.
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT] = process.argv.slice(2);
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const SAYFALAR = {
  ana: '/',
  urun: '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik',
  couple: '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple',
  erkek: '/collections/zaman-kapsulu-bileklik',
  sepet: '/cart',
  kilavuz: '/pages/kullanim-kilavuzu',
};
const BOYLAR = [[390, 844, true], [360, 740, true], [1280, 800, false], [1440, 900, false]];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

// Sayfa icinde: bandin ve cevresinin olculeri
const OLC = () => {
  const b = document.querySelector('.tt-gb');
  let hb = null; { let e = document.elementFromPoint(innerWidth / 2, 2); while (e && e !== document.body) { if (getComputedStyle(e).position === 'fixed') { hb = Math.round(e.getBoundingClientRect().bottom * 10) / 10; break; } e = e.parentElement; } }
  const main = document.querySelector('#MainContent');
  let ilk = main && main.firstElementChild; while (ilk && !ilk.getBoundingClientRect().height) ilk = ilk.nextElementSibling;
  const o = { scrollY: Math.round(scrollY), headerAlt: hb, mainUst: main && Math.round(main.getBoundingClientRect().top * 10) / 10, ilkIcerikUst: ilk && Math.round(ilk.getBoundingClientRect().top * 10) / 10, yatayTasma: document.documentElement.scrollWidth > innerWidth, htmlGecti: document.documentElement.classList.contains('tt-gb-gecti') };
  if (!b) return Object.assign(o, { bant: false });
  const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
  const ul = [...b.querySelectorAll('ul')];
  const g = ul[0], li = [...g.querySelectorAll('.tt-gb-oge')];
  const sp = li.map(x => x.querySelector('span')), sv = li.map(x => x.querySelector('svg'));
  const aralar = li.slice(0, -1).map((x, i) => Math.round((sv[i + 1].getBoundingClientRect().left - sp[i].getBoundingClientRect().right) * 10) / 10);
  const nokta = getComputedStyle(li[0], '::after');
  const ss = getComputedStyle(sp[0]), ic = getComputedStyle(sv[0]);
  Object.assign(o, {
    bant: true, ust: Math.round(r.top * 10) / 10, alt: Math.round(r.bottom * 10) / 10, yuk: Math.round(r.height * 10) / 10,
    bosluk: hb == null ? null : Math.round((r.top - hb) * 10) / 10,
    mod: b.getAttribute('data-mod'), sure: b.style.getPropertyValue('--tt-gb-sure'), yol: b.style.getPropertyValue('--tt-gb-yol'),
    zemin: cs.backgroundColor, cizgi: cs.borderTopWidth + ' ' + cs.borderTopColor, golge: cs.boxShadow, gorsel: cs.backgroundImage,
    yazi: ss.color + ' ' + ss.fontFamily.split(',')[0] + ' ' + ss.fontWeight + ' ' + ss.fontSize,
    ikon: Math.round(sv[0].getBoundingClientRect().width) + 'px ' + ic.color + ' sw' + sv[0].getAttribute('stroke-width') + ' ' + sv[0].getAttribute('stroke-linecap') + ' fill:' + sv[0].getAttribute('fill'),
    ikonYazi: Math.round((sp[0].getBoundingClientRect().left - sv[0].getBoundingClientRect().right) * 10) / 10,
    maddeArasi: aralar, nokta: nokta.width + ' ' + nokta.height + ' ' + nokta.backgroundColor + ' ' + nokta.borderRadius,
    metinler: sp.map(x => x.textContent),
    aria: ul.map(u => (u.getAttribute('aria-hidden') || '-') + ':' + getComputedStyle(u).display),
    okunanMadde: ul.filter(u => u.getAttribute('aria-hidden') !== 'true').reduce((n, u) => n + u.querySelectorAll('li').length, 0),
    animasyon: getComputedStyle(b.querySelector('.tt-gb-serit')).animationName, durum: getComputedStyle(b.querySelector('.tt-gb-serit')).animationPlayState,
    ilkMaddeGorunur: (() => { const q = sp[0].getBoundingClientRect(); return q.left >= 0 && q.right <= innerWidth; })(),
    maddelerEkranda: li.every(x => { const q = x.getBoundingClientRect(); return q.left >= -1 && q.right <= innerWidth + 1; }),
  });
  const h = document.querySelector('.tt-hatir');
  if (h) { const hr = h.getBoundingClientRect(); const hs = getComputedStyle(h); o.cubuk = hs.display === 'none' ? 'kapali' : { ust: Math.round(hr.top * 10) / 10, alt: Math.round(hr.bottom * 10) / 10, konum: hs.position, z: hs.zIndex }; }
  return o;
};
const X = () => { const s = document.querySelector('.tt-gb-serit'); return Math.round(new DOMMatrix(getComputedStyle(s).transform).m41 * 10) / 10; };

(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { tema: TID, a: [], b: {}, konsol: [] };
  async function ac(W, H, m, yol, opt = {}) {
    for (let deneme = 0; deneme < 2; deneme++) {
      const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m, locale: 'tr-TR', userAgent: m ? UA : undefined, reducedMotion: opt.az ? 'reduce' : 'no-preference' });
      await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
      if (opt.cubuk) await ctx.addInitScript(() => { try { localStorage.setItem('ttnCark', JSON.stringify({ d: 'red', t: 0 })); sessionStorage.setItem('ttnHatirAcik', '1'); } catch (e) {} });
      await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
      const p = await ctx.newPage();
      const etiket = W + ' ' + yol;
      p.on('pageerror', e => { if (!/Failed to fetch/.test(e.message)) S.konsol.push(etiket + ' pageerror ' + String(e.message).slice(0, 160)); });
      p.on('console', mm => { if (mm.type() === 'error' && !/ERR_FAILED|Failed to fetch|monorail|shop\.app|403|net::/.test(mm.text())) S.konsol.push(etiket + ' ' + mm.text().slice(0, 160)); });
      try {
        const r = await p.goto('https://texttonext.com' + yol + (yol.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID, { waitUntil: 'load', timeout: 90000 });
        if (r && r.status() === 429) throw new Error('429');
        await bekle(2500);
        return { ctx, p, durum: r && r.status() };
      } catch (e) { await ctx.close(); console.log('tekrar', etiket, String(e).slice(0, 80)); await bekle(8000); }
    }
    return null;
  }

  // A) Yerlesim
  for (const [W, H, m] of BOYLAR) {
    for (const [ad, yol] of Object.entries(SAYFALAR)) {
      const a = await ac(W, H, m, yol);
      if (!a) { S.a.push({ boy: W, sayfa: ad, hata: 'acilamadi' }); continue; }
      const o = await a.p.evaluate(OLC); o.boy = W; o.sayfa = ad; o.durum = a.durum;
      o.tema = await a.p.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.name);
      S.a.push(o);
      console.log(W, ad, 'bant', o.bant, 'ust', o.ust, 'yuk', o.yuk, 'bosluk', o.bosluk, 'main', o.mainUst, 'ilk', o.ilkIcerikUst, 'mod', o.mod, 'tasma', o.yatayTasma);
      await a.ctx.close(); await bekle(1500);
    }
  }

  // B1) Kayan serit + dokununca durma (390 ana sayfa)
  {
    const a = await ac(390, 844, true, '/');
    if (a) {
      const p = a.p, cdp = await a.ctx.newCDPSession(p);
      const x0 = await p.evaluate(X); await bekle(2000); const x1 = await p.evaluate(X);
      const kutu = await p.evaluate(() => { const r = document.querySelector('.tt-gb').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: kutu.x, y: kutu.y }] });
      await bekle(300); const d0 = await p.evaluate(X); const dDurum = await p.evaluate(() => getComputedStyle(document.querySelector('.tt-gb-serit')).animationPlayState);
      await bekle(1500); const d1 = await p.evaluate(X);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await bekle(1000); const b0 = await p.evaluate(X);
      await bekle(2500); const b1 = await p.evaluate(X); await bekle(1500); const b2 = await p.evaluate(X);
      const sure = await p.evaluate(() => document.querySelector('.tt-gb').style.getPropertyValue('--tt-gb-sure'));
      const yol = await p.evaluate(() => document.querySelector('.tt-gb').style.getPropertyValue('--tt-gb-yol'));
      S.b.serit = { sure, yol, hizPxSn: Math.round((x0 - x1) / 2 * 10) / 10, x0, x1, dokunurken: { d0, d1, durum: dDurum, durdu: Math.abs(d1 - d0) < 0.5 }, birakinca1sn: b0, birakinca: { b1, b2, devam: b2 < b1 - 5 } };
      console.log('serit', JSON.stringify(S.b.serit));
      await a.ctx.close(); await bekle(1500);
    }
  }
  // B2) Hareketi azalt (390 ana sayfa)
  {
    const a = await ac(390, 844, true, '/', { az: true });
    if (a) {
      const o = await a.p.evaluate(OLC);
      const k = await a.p.evaluate(async () => { const pn = document.querySelector('.tt-gb-pencere'); const once = pn.scrollLeft; pn.scrollLeft = 120; await new Promise(r => setTimeout(r, 200)); return { kaydirilabilir: pn.scrollWidth > pn.clientWidth, overflowX: getComputedStyle(pn).overflowX, once, sonra: pn.scrollLeft, scrollWidth: pn.scrollWidth, clientWidth: pn.clientWidth }; });
      const x0 = await a.p.evaluate(X); await bekle(1500); const x1 = await a.p.evaluate(X);
      S.b.azHareket = { mod: o.mod, animasyon: o.animasyon, aria: o.aria, okunanMadde: o.okunanMadde, x0, x1, hareketYok: x0 === x1, elle: k };
      console.log('azHareket', JSON.stringify(S.b.azHareket));
      await a.ctx.close(); await bekle(1500);
    }
  }
  // B3) Uzun metin masaustunde kayan seride geciyor mu (1440 ana sayfa; metin sayfa icinde degistiriliyor)
  {
    const a = await ac(1440, 900, false, '/');
    if (a) {
      const once = await a.p.evaluate(() => document.querySelector('.tt-gb').getAttribute('data-mod'));
      await a.p.evaluate(() => { document.querySelectorAll('.tt-gb-oge span').forEach(s => { s.textContent = s.textContent + ' — çok uzun deneme metni ile genişletilmiş madde, masaüstüne sığmasın'; }); });
      await bekle(800);
      const sonra = await a.p.evaluate(OLC);
      const x0 = await a.p.evaluate(X); await bekle(1500); const x1 = await a.p.evaluate(X);
      const hYuk = await a.p.evaluate(() => document.querySelector('.tt-gb').getBoundingClientRect().height);
      S.b.uzunMetin = { once, sonra: sonra.mod, yukseklik: hYuk, hareket: x1 < x0, x0, x1, tasma: sonra.yatayTasma };
      console.log('uzunMetin', JSON.stringify(S.b.uzunMetin));
      await a.ctx.close(); await bekle(1500);
    }
  }
  // B4) Cark hatirlatma cubugu senaryosu
  S.b.cubuk = [];
  for (const [W, H, m] of [[390, 844, true], [1440, 900, false]]) {
    for (const ad of ['ana', 'urun', 'erkek']) {
      const a = await ac(W, H, m, SAYFALAR[ad], { cubuk: true });
      if (!a) { S.b.cubuk.push({ boy: W, sayfa: ad, hata: 'acilamadi' }); continue; }
      const adimlar = [];
      for (const y of [0, 18, 40, 300, 0]) {
        await a.p.evaluate(yy => window.scrollTo(0, yy), y); await bekle(500);
        const o = await a.p.evaluate(OLC);
        const c = o.cubuk;
        const ust_uste = c && c !== 'kapali' && o.alt > c.ust + 0.5 && o.alt > o.headerAlt + 0.5;
        const icerikOrtulu = c && c !== 'kapali' && y === 0 && o.ilkIcerikUst < c.alt - 0.5;
        adimlar.push({ kaydirma: o.scrollY, bantUst: o.ust, bantAlt: o.alt, header: o.headerAlt, cubuk: c, gecti: o.htmlGecti, icerikUst: o.ilkIcerikUst, ustUste: !!ust_uste, icerikOrtulu: !!icerikOrtulu });
      }
      S.b.cubuk.push({ boy: W, sayfa: ad, adimlar });
      console.log('cubuk', W, ad, JSON.stringify(adimlar.map(s => [s.kaydirma, s.bantUst, s.bantAlt, s.cubuk && s.cubuk.ust, s.cubuk && s.cubuk.konum, s.icerikUst, s.ustUste, s.icerikOrtulu])));
      await a.ctx.close(); await bekle(1500);
    }
  }
  // B5) Hamburger menu acikken bant menunun altinda (390 ana sayfa)
  {
    const a = await ac(390, 844, true, '/');
    if (a) {
      const btn = await a.p.$('[data-tth-menu-ac]:not([hidden])');
      let ok = null;
      if (btn) {
        await btn.click(); await bekle(900);
        ok = await a.p.evaluate(() => {
          const r = document.querySelector('.tt-gb').getBoundingClientRect();
          const pts = [[20, r.top + r.height / 2], [innerWidth / 2, r.top + r.height / 2], [innerWidth - 20, r.top + r.height / 2]];
          return pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return { x, y: Math.round(y), ust: e ? (e.closest('.tt-gb') ? 'BANT' : (e.id || e.tagName) + '.' + String(e.className || '').split(' ')[0].slice(0, 30)) : null }; });
        });
      }
      S.b.menu = { dugme: !!btn, noktalar: ok, bantUstte: ok ? ok.some(n => n.ust === 'BANT') : null };
      console.log('menu', JSON.stringify(S.b.menu));
      await a.ctx.close();
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  console.log('konsol', S.konsol.length, S.konsol.slice(0, 10));
  await br.close();
})();
