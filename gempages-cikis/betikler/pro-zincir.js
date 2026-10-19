// PRO sayfasi: yonlendirme zinciri (adim adim, maxRedirects 0) + temiz tarayicida son durum. Salt okuma.
const { chromium } = require('playwright');
const B = 'https://texttonext.com';
const YOLLAR = process.argv.slice(2).length ? process.argv.slice(2) : ['/pages/text-to-next-pro-1', '/pages/landing-page-feb-16-11-03-09'];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  const out = [];
  for (const yol of YOLLAR) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    // 1) adim adim
    const adim = []; let url = B + yol;
    for (let i = 0; i < 6; i++) {
      let r = null;
      for (let d = 0; d < 3; d++) { r = await ctx.request.get(url, { maxRedirects: 0, failOnStatusCode: false }); if (r.status() !== 429 && r.status() < 500) break; await bekle(10000 * (d + 1)); }
      const loc = r.headers()['location'];
      adim.push(r.status() + ' ' + url.replace(B, '') + (loc ? ' -> ' + loc.replace(B, '') : ''));
      if (!loc || r.status() < 300 || r.status() >= 400) break;
      url = new URL(loc, url).toString();
    }
    // 2) tarayici
    const p = await ctx.newPage();
    const res = await p.goto(B + yol, { waitUntil: 'domcontentloaded', timeout: 90000 });
    let q = res.request(); const z = [];
    while (q) { const rr = await q.response().catch(() => null); z.unshift((rr ? rr.status() : '?') + ' ' + q.url().replace(B, '')); q = q.redirectedFrom(); }
    const d = await p.evaluate(() => ({ baslik: document.title, sablon: document.body && document.body.className.split(' ')[0], gp: document.querySelectorAll('[class*="gp-"], [id^="gp-"]').length, tema: window.Shopify && Shopify.theme && Shopify.theme.name }));
    out.push({ yol, adimAdim: adim, tarayiciZinciri: z, sonAdres: p.url().replace(B, ''), sonDurum: res.status(), ...d });
    await ctx.close(); await bekle(3000);
  }
  console.log(JSON.stringify(out, null, 1));
  await br.close();
})().catch(e => { console.log('HATA', e); process.exit(1); });
