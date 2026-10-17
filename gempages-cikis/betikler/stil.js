const { webkit, devices } = require('playwright');
const fs = require('fs');
(async () => { const br = await webkit.launch(); const out = {};
 for (const h of JSON.parse(process.argv[2])) {
  const ctx = await br.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  await p.goto('https://texttonext.com/pages/' + h, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  for (let i = 0; i < 20; i++) { await p.evaluate(() => scrollBy(0, 500)); await p.waitForTimeout(300); }
  out[h] = await p.evaluate(() => { const o = [];
   document.querySelectorAll('[id^="shopify-section-template--"]').forEach(sec => {
    const r = sec.getBoundingClientRect(); const s = getComputedStyle(sec.querySelector('section') || sec);
    o.push({ bolum: sec.id.slice(-18), yukseklik: Math.round(r.height), bg: s.backgroundColor });
    sec.querySelectorAll('h1,h2,h3,p,video,img,a').forEach(el => { const c = getComputedStyle(el); const rr = el.getBoundingClientRect(); if (rr.height === 0) return;
     let bg = 'transparent'; for (let e = el; e && e !== sec; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b !== 'rgba(0, 0, 0, 0)') { bg = b; break; } }
     o.push({ etiket: el.tagName.toLowerCase(), metin: (el.innerText || '').trim().slice(0, 80), font: c.fontFamily.slice(0, 60), boyut: c.fontSize, agirlik: c.fontWeight, renk: c.color, zemin: bg, hiza: c.textAlign, satir: c.lineHeight, harf: c.letterSpacing, gen: Math.round(rr.width), yuk: Math.round(rr.height), radius: c.borderRadius });
    });
   }); return o; });
  await ctx.close();
 }
 fs.writeFileSync('kk/stil.json', JSON.stringify(out, null, 1)); await br.close(); })();
