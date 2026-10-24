// Ek kontroller: (1) urun sayfasi yapiskan cubuk 390/360/1440, cark cevrilmis/cevrilmemis;
// (2) katmanlar acikken buton gizleniyor mu (gecis suresi beklenerek); gercek sepet cekmecesi.
const { chromium } = require('playwright');
const fs = require('fs');
const TID = process.argv[2], OUT = process.argv[3];
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail|trueprofit|wa\.me|whatsapp\.com/;
const URUN = '/products/auron-zaman-kapsulu-bileklik';
const S = { yapiskan: [], katman: {} };
(async () => {
  const br = await chromium.launch();
  for (const cark of [false, true]) for (const [w, h] of [[390, 844], [360, 780], [1440, 900]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    if (cark) await ctx.addInitScript(() => { try { localStorage.setItem('ttnCark', JSON.stringify({ d: 'kazandi', t: Date.now() })); } catch (e) {} });
    await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    await p.goto('https://texttonext.com' + URUN + '?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
    await p.waitForTimeout(5000);
    await p.evaluate(() => { const e = document.getElementById('PBarNextFrameWrapper'); if (e) e.style.setProperty('display', 'none', 'important'); });
    let sonuc = null;
    for (let y = 300; y <= 6000; y += 300) {
      await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(500);
      const r = await p.evaluate(() => {
        const a = document.querySelector('a.tt-wa').getBoundingClientRect();
        const k = document.querySelector('product-sticky-form > :first-child'); const c = k && getComputedStyle(k);
        const kart = k && c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.01 ? k.getBoundingClientRect() : null;
        const cb = document.querySelector('.ttn-cark-bar'); const cbg = cb && !cb.hidden && !cb.hasAttribute('data-ttn-ortulu') && getComputedStyle(cb).display !== 'none' ? cb.getBoundingClientRect() : null;
        return { waUst: Math.round(a.top), waAlt: Math.round(a.bottom), waSol: Math.round(a.left), waSag: Math.round(a.right), kartUst: kart ? Math.round(kart.top) : null, kartSol: kart ? Math.round(kart.left) : null, carkUst: cbg ? Math.round(cbg.top) : null, yigin: getComputedStyle(document.documentElement).getPropertyValue('--tt-alt-yigin').trim() };
      });
      if (r.kartUst !== null) { await p.waitForTimeout(800); sonuc = { y, ...(await p.evaluate(() => { const a = document.querySelector('a.tt-wa').getBoundingClientRect(); const k = document.querySelector('product-sticky-form > :first-child').getBoundingClientRect(); const cb = document.querySelector('.ttn-cark-bar'); const cr = cb && !cb.hidden && !cb.hasAttribute('data-ttn-ortulu') ? cb.getBoundingClientRect() : null; return { waUst: Math.round(a.top), waAlt: Math.round(a.bottom), kartUst: Math.round(k.top), carkUst: cr && cr.height ? Math.round(cr.top) : null, yigin: getComputedStyle(document.documentElement).getPropertyValue('--tt-alt-yigin').trim() }; })) }; break; }
    }
    if (sonuc) { const ust = Math.min(sonuc.kartUst, sonuc.carkUst ?? 1e9); sonuc.bosluk = ust - sonuc.waAlt; }
    S.yapiskan.push({ w, cark, sonuc });
    console.log(w, cark ? 'cark cevrilmis' : 'cark yok', JSON.stringify(sonuc));
    await ctx.close();
  }
  // Katmanlar
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
  const p = await ctx.newPage();
  await p.goto('https://texttonext.com' + URUN + '?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(5000);
  await p.evaluate(() => { const e = document.getElementById('PBarNextFrameWrapper'); if (e) e.style.setProperty('display', 'none', 'important'); });
  const d = () => p.evaluate(() => { const c = getComputedStyle(document.querySelector('a.tt-wa')); return c.visibility + ' / opaklik ' + c.opacity + ' / tiklama ' + c.pointerEvents; });
  S.katman.normal = await d();
  for (const [ad, ac, kapa] of [
    ['modal (has-modal-open)', () => document.body.classList.add('has-modal-open'), () => document.body.classList.remove('has-modal-open')],
    ['hamburger (ttm-kilit)', () => document.documentElement.classList.add('ttm-kilit'), () => document.documentElement.classList.remove('ttm-kilit')],
    ['Nasil calisir paneli', () => document.body.setAttribute('data-tt-nc-acik', ''), () => document.body.removeAttribute('data-tt-nc-acik')]]) {
    await p.evaluate(ac); await p.waitForTimeout(500); S.katman[ad] = await d(); await p.evaluate(kapa); await p.waitForTimeout(500);
  }
  S.katman.kapaninca = await d();
  try {
    await p.click('a[aria-controls="CartDrawer"]', { timeout: 8000 }); await p.waitForTimeout(2000);
    S.katman['gercek sepet cekmecesi'] = (await d()) + ' / body: ' + (await p.evaluate(() => (document.body.className.match(/has-modal-[a-z]+/g) || []).join(' ')));
  } catch (e) { S.katman['gercek sepet cekmecesi'] = 'acilamadi: ' + e.message.split('\n')[0]; }
  console.log(JSON.stringify(S.katman, null, 1));
  await br.close();
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
})();
