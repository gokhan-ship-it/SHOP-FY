// GemPages kaldirildiktan sonra vitrin kontrolu (temiz tarayici, onizleme yok). Salt okuma.
// Calistirma: NODE_PATH=/opt/node22/lib/node_modules node kaldirma-sonrasi.js
// Yonetim tarafi (sablon ekleri, gizli sayfalar, yonlendirmeler, app embed) ayrica Admin API ile okunur.
const { chromium, devices } = require('playwright');
const QR = ['https://texttonext.com/pages/kullanim-kilavuzu?_ab=0&key=1767609525998', 'https://texttonext.com/pages/kullanim-kilavuzu?key=1767609525998', 'https://texttonext.com/pages/kullanim-kilavuzu',
  'http://texttonext.com/pages/kullanim-kilavuzu?_ab=0&key=1767609525998', 'http://texttonext.com/pages/kullanim-kilavuzu?key=1767609525998', 'http://texttonext.com/pages/kullanim-kilavuzu',
  'https://www.texttonext.com/pages/kullanim-kilavuzu?_ab=0&key=1767609525998', 'https://www.texttonext.com/pages/kullanim-kilavuzu?key=1767609525998', 'https://www.texttonext.com/pages/kullanim-kilavuzu',
  'http://www.texttonext.com/pages/kullanim-kilavuzu?_ab=0&key=1767609525998', 'http://www.texttonext.com/pages/kullanim-kilavuzu?key=1767609525998', 'http://www.texttonext.com/pages/kullanim-kilavuzu'];
const SAYFA = { '/pages/bireysel-hediye-kullanim-kilavuzu': 'kilavuz', '/pages/couple-hediye-kullanim-kilavuzu': 'kilavuz', '/pages/iletisimsayfasi': 'iletisim', '/pages/sozlesmeler': 'liste',
  '/pages/couplekapsuldahafazlabilgial': 'guclu_header_couple', '/pages/hediyekapsuldahafazlabilgial': 'guclu_header_1', '/pages/couplezamankapsulleri': 'guclu_header_couple',
  '/pages/landing-page-dec-12-23-44-18': '301->/', '/pages/landing-page-apr-7-16-02-03': '301->/',
  '/': null, '/collections/zaman-kapsulu-bileklik': null, '/collections/zaman-kapsulu-bileklik?mod=couple': null, '/collections/zaman-kapsulu-kolyeler': null, '/collections/zaman-kapsulu-kolyeler?mod=couple': null,
  '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik': null, '/products/prizma-chloe-couple-zaman-kapsulu': null, '/products/auron-zaman-kapsulu-bileklik': null, '/pages/iletisim': null, '/pages/text-to-next-pro-1': null };
const GPRE = /assets\.gemcommerce\.com|files\.gempages\.net|gempages|gem-cro/i;
const bekle = ms => new Promise(z => setTimeout(z, ms));
async function olc(p) {
  return p.evaluate(() => { const m = document.getElementById('MainContent') || document.body; const v = [...m.querySelectorAll('video')];
    return { bolum: [...m.querySelectorAll('[id^="shopify-section-"]')].map(e => e.id.replace(/^shopify-section-(template|sections)--\d+__/, ''))[0], gp: m.querySelectorAll('[class^="gp-"],[class*=" gp-"]').length, metin: m.innerText.replace(/\s+/g, ' ').length, video: v.length + '/' + v.filter(x => x.currentSrc || x.src || x.querySelector('source[src]')).length }; });
}
(async () => {
  const br = await chromium.launch(); let sorun = 0;
  for (const [ad, opt] of [['tel390', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }], ['masa1440', { viewport: { width: 1440, height: 900 } }]]) {
    for (const u of QR) {
      const ctx = await br.newContext(opt); const p = await ctx.newPage(); const gp = new Set(); p.on('request', r => { if (GPRE.test(r.url())) gp.add(new URL(r.url()).host); });
      const r = await p.goto(u, { waitUntil: 'load', timeout: 90000 }); await bekle(2500);
      const z = []; let q = r.request(); while (q.redirectedFrom()) { q = q.redirectedFrom(); const rr = await q.response(); z.unshift(rr ? rr.status() : '?'); }
      const o = await olc(p); const ok = r.status() === 200 && o.bolum === 'kilavuz' && o.gp === 0 && o.metin > 300 && !gp.size;
      if (!ok) sorun++; console.log(ok ? 'OK  ' : 'HATA', ad, u, 'zincir', z.join('>') || '-', 'son', r.status(), JSON.stringify(o), [...gp].join(','));
      await ctx.close(); await bekle(2500);
    }
    const ctx = await br.newContext(opt);
    for (const [y, bek] of Object.entries(SAYFA)) {
      const p = await ctx.newPage(); const gp = new Set(), hata = [];
      p.on('request', r => { if (GPRE.test(r.url())) gp.add(new URL(r.url()).host); });
      p.on('pageerror', e => hata.push(e.message.slice(0, 80)));
      const r = await p.goto('https://texttonext.com' + y, { waitUntil: 'load', timeout: 90000 }); await bekle(3000);
      const yon = r.request().redirectedFrom() ? (await r.request().redirectedFrom().response()).status() + '->' + new URL(p.url()).pathname : '';
      const o = await olc(p);
      let ok;
      if (bek === '301->/') ok = yon === '301->/';
      else if (bek) ok = r.status() === 200 && o.bolum === bek && o.gp === 0 && !gp.size;
      else ok = r.status() === 200 && (y === '/pages/text-to-next-pro-1' || !gp.size);
      if (!ok) sorun++;
      console.log(ok ? 'OK  ' : 'HATA', ad, y, r.status(), yon, JSON.stringify(o), 'gpIstek:', [...gp].join(',') || '-', 'hata:', hata.filter(h => !/reading 'open'/.test(h)).join(' | ') || '-');
      await p.close(); await bekle(1500);
    }
    await ctx.close();
  }
  console.log('SORUN SAYISI', sorun); await br.close();
})();
