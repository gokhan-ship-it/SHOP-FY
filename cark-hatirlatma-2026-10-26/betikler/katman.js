const { chromium } = require('playwright');
const TID = process.argv[2]; const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  for (const W of [390, 1440]) {
    const m = W < 800; const ctx = await br.newContext({ viewport: { width: W, height: m ? 844 : 900 }, isMobile: m, hasTouch: m });
    await ctx.route('**/*', r => /facebook|google|tiktok|monorail|trueprofit/.test(r.request().url()) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    for (const yol of ['/', '/collections/zaman-kapsulu-bileklik', '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik']) {
      await p.goto('https://texttonext.com' + yol + '?preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(2000);
      await p.evaluate(() => { const f = document.querySelector('#PBarNextFrameWrapper'); if (f) f.style.display = 'none'; });
      for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 300); await bekle(150); }
      await bekle(600);
      const ust = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); if (c.position !== 'fixed' && c.position !== 'sticky') return false; const b = e.getBoundingClientRect(); return b.height > 0 && b.width > 0 && b.top < 160 && b.bottom > 0 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05 && b.height < innerHeight - 5; })
        .filter(e => { let x = e.parentElement; while (x) { const c = getComputedStyle(x); if (c.position === 'fixed' || c.position === 'sticky') return false; x = x.parentElement; } return true; })
        .map(e => { const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return (e.tagName.toLowerCase() + '#' + e.id + '.' + (e.className || '').toString().slice(0, 40)) + ' pos=' + c.position + ' top=' + c.top + ' z=' + c.zIndex + ' y=' + Math.round(b.top) + ' h=' + Math.round(b.height); }));
      const main = await p.evaluate(() => { const m = document.querySelector('main'); return m ? (m.className.slice(0, 60) + ' pt=' + getComputedStyle(m).paddingTop + ' mt=' + getComputedStyle(m).marginTop + ' top=' + Math.round(m.getBoundingClientRect().top + scrollY)) : null; });
      console.log(W, yol, 'scrollY', await p.evaluate(() => Math.round(scrollY)), '\n  ', ust.join('\n   '), '\n   main:', main);
    }
    // hamburger menu ac
    const ac = await p.$('[data-ttm-ac], .ttm-dugme[aria-controls], button[aria-controls*="Menu" i], button[aria-label*="Menü" i], .tth-menu-dugme, [data-tth-menu]');
    console.log('menu dugmesi', ac ? await ac.evaluate(e => e.outerHTML.slice(0, 160)) : null);
    if (ac) { try { await ac.click({ timeout: 3000 }); await bekle(900);
      console.log('  menu acik:', await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return (c.position === 'fixed') && b.width > innerWidth * 0.5 && b.height > innerHeight * 0.5 && c.visibility !== 'hidden' && +c.opacity > 0.5; }).slice(0, 5).map(e => (e.tagName + '#' + e.id + '.' + (e.className || '').toString().slice(0, 40)) + ' z=' + getComputedStyle(e).zIndex + ' top=' + Math.round(e.getBoundingClientRect().top)))); } catch (e) { console.log('menu tik hatasi', e.message.slice(0, 80)); } }
    console.log('  cekmece z:', await p.evaluate(() => { const d = document.querySelector('cart-drawer'); return d ? getComputedStyle(d).zIndex : null; }));
    await ctx.close();
  }
  await br.close();
})();
