const { webkit, devices } = require('playwright'); const fs = require('fs');
(async () => { const br = await webkit.launch();
 for (const h of JSON.parse(process.argv[3])) { const ctx = await br.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  const r = await p.goto('https://texttonext.com/pages/' + h, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  for (let i = 0; i < 25; i++) { await p.evaluate(() => scrollBy(0, 500)); await p.waitForTimeout(300); }
  const tema = await p.evaluate(() => Shopify.theme.name + ' (' + Shopify.theme.id + ')');
  fs.writeFileSync(`${process.argv[2]}/${h}-render-dom-telefon.html`, '<!-- Render edilmis DOM (JS calistiktan sonra), telefon (iPhone 13), yayindaki site, ' + new Date().toISOString() + ', tema: ' + tema + ' -->\n' + await p.content());
  console.log(h, tema); await ctx.close(); }
 await br.close(); })();
