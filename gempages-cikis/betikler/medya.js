// Temiz oturum, yayindaki site. Her sayfa icin: ag istekleri + DOM'daki medya (img/video/source/iframe/arka plan/pdf linki).
const { webkit, devices } = require('playwright');
const fs = require('fs');
const CIK = process.argv[2]; const sayfalar = JSON.parse(process.argv[3]);
(async () => {
  const br = await webkit.launch(); const sonuc = {};
  for (const h of sayfalar) {
    sonuc[h] = { ag: {}, dom: {} };
    for (const cihaz of ['masaustu', 'telefon']) {
      const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
      const p = await ctx.newPage();
      p.on('request', r => { const u = r.url(); if (!u.startsWith('data:')) (sonuc[h].ag[u] = sonuc[h].ag[u] || { tip: r.resourceType(), cihaz: [] }).cihaz.includes(cihaz) || sonuc[h].ag[u].cihaz.push(cihaz); });
      await p.goto('https://texttonext.com/pages/' + h, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(3000);
      for (let i = 0; i < 40; i++) { const kalan = await p.evaluate(() => { window.scrollBy(0, 600); return document.documentElement.scrollHeight - scrollY - innerHeight; }); await p.waitForTimeout(400); if (kalan <= 0) break; }
      await p.waitForTimeout(2500);
      const dom = await p.evaluate(() => {
        const ana = document.querySelector('#MainContent') || document.body; const o = [];
        const ekle = (u, tur, el) => { if (u && !u.startsWith('data:')) o.push({ u: new URL(u, location.href).href, tur, alt: el && (el.alt || el.getAttribute('aria-label') || '') || '' }); };
        ana.querySelectorAll('img').forEach(i => { ekle(i.currentSrc || i.src, 'img', i); (i.getAttribute('data-src') || '') && ekle(i.getAttribute('data-src'), 'img', i); });
        ana.querySelectorAll('source').forEach(s => { (s.getAttribute('src') || s.getAttribute('data-src')) && ekle(s.getAttribute('src') || s.getAttribute('data-src'), 'video-kaynak', s); (s.srcset || '').split(',').map(x => x.trim().split(' ')[0]).filter(Boolean).slice(0, 1).forEach(u => ekle(u, 'picture', s)); });
        ana.querySelectorAll('video').forEach(v => { ekle(v.currentSrc || v.getAttribute('src') || v.getAttribute('data-src'), 'video', v); v.poster && ekle(v.poster, 'video-poster', v); });
        ana.querySelectorAll('iframe').forEach(f => ekle(f.src || f.getAttribute('data-src'), 'iframe', f));
        ana.querySelectorAll('*').forEach(el => { const b = getComputedStyle(el).backgroundImage; if (b && b !== 'none') (b.match(/url\(["']?([^"')]+)/g) || []).forEach(m => ekle(m.replace(/^url\(["']?/, ''), 'arka-plan', el)); });
        ana.querySelectorAll('a[href]').forEach(a => { if (/\.pdf(\?|$)/i.test(a.href)) ekle(a.href, 'pdf', a); });
        ana.querySelectorAll('[data-gp-lite-video], gp-lite-html5-embed, [data-video-url], [data-youtube], [data-vimeo]').forEach(el => ['data-video-url', 'data-src', 'src'].forEach(a => el.getAttribute(a) && ekle(el.getAttribute(a), 'video-gomme', el)));
        return o;
      });
      dom.forEach(x => { const k = x.u; (sonuc[h].dom[k] = sonuc[h].dom[k] || { tur: x.tur, alt: x.alt, cihaz: [] }).cihaz.includes(cihaz) || sonuc[h].dom[k].cihaz.push(cihaz); });
      console.log(h, cihaz, Object.keys(sonuc[h].ag).length, Object.keys(sonuc[h].dom).length);
      await ctx.close(); await new Promise(z => setTimeout(z, 1500));
    }
  }
  fs.writeFileSync(CIK, JSON.stringify(sonuc, null, 1)); await br.close();
})();
