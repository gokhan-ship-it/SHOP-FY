const { webkit } = require('playwright');
(async () => { const br = await webkit.launch();
 for (const [ad, q] of [['YAYIN', ''], ['TASLAK', '?preview_theme_id=189140861248']]) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); const f = [];
  p.on('request', r => { if (r.resourceType() === 'font' && !/inter_|GTStandard/.test(r.url())) f.push(r.url()); });
  await p.goto('https://texttonext.com/' + q, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  for (let i = 0; i < 12; i++) { await p.evaluate(() => scrollBy(0, 700)); await p.waitForTimeout(400); }
  await p.waitForTimeout(2000);
  const aileler = await p.evaluate(() => { const s = {}; document.querySelectorAll('body *').forEach(e => { if (!e.childNodes.length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return; const ff = getComputedStyle(e).fontFamily.split(',')[0].trim().replace(/"/g, ''); s[ff] = s[ff] || (e.closest('[id^="shopify-section"]') || {}).id || e.tagName; }); return s; });
  const yuklenen = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight));
  console.log('==', ad, '\n fontlar(istek):', f, '\n metinde kullanilan aileler:', JSON.stringify(aileler), '\n yuklenen FontFace:', JSON.stringify([...new Set(yuklenen)]));
  await ctx.close(); }
 await br.close(); })();
