// ACIL teshis: "Liquid error / Could not find asset" taramasi + giris sayfalarinin yonlendirme zinciri. Salt okuma.
const { chromium } = require('playwright');
const fs = require('fs');
const B = 'https://texttonext.com';
const YOLLAR = [
  // en cok giris alan 10 sayfa (son 7 gun) + Instagram/reklam adresleri
  '/', '/pages/couple-daha-fazla-bilgi-al', '/products/zaman-kapsulu-bileklik-kral', '/collections/zaman-kapsulu-bileklik',
  '/collections/couple-urunler', '/collections/zaman-kapsulu-kolyeler', '/pages/kullanim-kilavuzu', '/products/zaman-kapsulu-bileklik',
  '/products/zaman-kapsulu-kolye-tasli-kilit', '/pages/couplezamankapsulleri',
  // istenen diger sayfalar
  '/collections/zaman-kapsulu-bileklik?mod=couple', '/collections/zaman-kapsulu-kolyeler?mod=couple',
  '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik', '/products/prizma-chloe-couple-zaman-kapsulu', '/products/auron-zaman-kapsulu-bileklik',
  '/pages/couplekapsuldahafazlabilgial', '/pages/hediyekapsuldahafazlabilgial',
  '/pages/bireysel-hediye-kullanim-kilavuzu', '/pages/couple-hediye-kullanim-kilavuzu', '/pages/kullanim-kilavuzu?_ab=0&key=1767609525998',
  '/pages/iletisim', '/pages/iletisimsayfasi', '/pages/sozlesmeler', '/cart', '/pages/text-to-next-pro-1',
  '/pages/couplezamankapsulleri?utm_source=ig&utm_medium=paid&fbclid=test123',
];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage();
  const sonuc = [];
  for (const yol of YOLLAR) {
    let r = { yol };
    for (let deneme = 1; deneme <= 3; deneme++) {
      try {
        const res = await p.goto(B + yol, { waitUntil: 'domcontentloaded', timeout: 90000 });
        let q = res.request(); const z = [];
        while (q) { const rr = await q.response().catch(() => null); z.unshift((rr ? rr.status() : '?') + ' ' + q.url().replace(B, '')); q = q.redirectedFrom(); }
        const html = await res.text();
        const lq = html.match(/Liquid (syntax )?error[^<]{0,160}|Could not find asset[^<]{0,120}/gi) || [];
        r = { yol, deneme, durum: res.status(), zincir: z, son: p.url().replace(B, ''), liquidHata: [...new Set(lq)].slice(0, 5),
          sablon: await p.evaluate(() => (document.body && document.body.className.split(' ')[0]) || '').catch(() => ''),
          tema: await p.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.name + ' ' + Shopify.theme.role).catch(() => ''),
          gpIz: (html.match(/gp-|gempages|gemcommerce/gi) || []).length, cfh: (html.match(/web-pixels-manager-setup|ShopifyAnalytics/g) || []).length };
        if (res.status() === 429 || res.status() >= 500) { await bekle(15000 * deneme); continue; }
        break;
      } catch (e) { r = { yol, deneme, hata: String(e).split('\n')[0].slice(0, 160) }; await bekle(8000); }
    }
    sonuc.push(r);
    console.log(r.durum || r.hata, yol, (r.zincir || []).length - 1, 'yonl.', r.liquidHata && r.liquidHata.length ? 'LIQUID HATA' : '');
    await bekle(3000);
  }
  fs.writeFileSync(__dirname + '/tarama-sonuc.json', JSON.stringify(sonuc, null, 1));
  console.log('bitti'); await br.close();
})().catch(e => { fs.writeFileSync(__dirname + '/tarama-hata.txt', String(e && e.stack || e)); console.log('HATA', e); process.exit(1); });
