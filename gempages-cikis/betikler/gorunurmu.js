const { webkit, devices } = require('playwright');
const ara = ['ucarecdn.com', '/1/2005/9307/', '/1/0703/5214/2562/'];
(async () => { const br = await webkit.launch();
 for (const h of JSON.parse(process.argv[2])) for (const cihaz of ['masaustu', 'telefon']) {
  const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.goto('https://texttonext.com/pages/' + h, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(3000);
  for (let i = 0; i < 40; i++) { const k = await p.evaluate(() => { scrollBy(0, 600); return document.documentElement.scrollHeight - scrollY - innerHeight; }); await p.waitForTimeout(300); if (k <= 0) break; }
  await p.waitForTimeout(1500);
  const r = await p.evaluate((ara) => { const o = []; const gor = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const rc = el.getBoundingClientRect(); return rc.width > 2 && rc.height > 2; };
   document.querySelectorAll('#MainContent *').forEach(el => { let u = ''; if (el.tagName === 'IMG') u = el.currentSrc || el.src; else { const b = getComputedStyle(el).backgroundImage; if (b && b !== 'none') u = b; } if (u && ara.some(a => u.includes(a))) o.push((gor(el) ? 'GORUNUR ' : 'gizli   ') + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height) + ' ' + u.replace(/^url\("?|"?\)$/g, '').slice(0, 110)); }); return o; }, ara);
  console.log('==', h, cihaz); [...new Set(r)].forEach(x => console.log('   ', x)); await ctx.close(); }
 await br.close(); })();
