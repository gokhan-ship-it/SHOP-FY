const { webkit } = require('playwright');
(async () => { const br = await webkit.launch();
 for (const [h, ifade] of JSON.parse(process.argv[2])) for (const th of ['', '?preview_theme_id=189140861248']) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  await p.goto('https://texttonext.com/pages/' + h + th, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const v = await p.evaluate((ifade) => { const m = document.querySelector('#MainContent') || document.body; const t = m.innerText; return { tema: Shopify.theme.name, uzunluk: t.length, ifade: t.includes(ifade), bas: t.trim().slice(0, 90).replace(/\s+/g, ' ') }; }, ifade);
  console.log(h.padEnd(30), (th ? 'TASLAK' : 'YAYIN').padEnd(7), v.tema.padEnd(28), 'metin=' + String(v.uzunluk).padEnd(6), 'ifade=' + v.ifade, '|', v.bas);
  await ctx.close(); }
 await br.close(); })();
