// Meta "Contact" isteginin agda gorunup gorunmedigi (beacon'lar iptal edilir).
const { chromium } = require('playwright');
const TID = process.argv[2];
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const fb = [];
  await ctx.route('**/*', r => {
    const q = r.request(), u = q.url();
    if (/wa\.me|whatsapp\.com/.test(u)) return r.abort();
    if (/facebook\.com\/tr/.test(u)) {
      const b = q.postData() || ''; const x = new URL(u);
      const al = n => x.searchParams.get(n) || (b.match(new RegExp('name="' + n + '"\\r?\\n\\r?\\n([^\\r\\n]+)')) || [])[1] || (b.match(new RegExp('(?:^|&)' + n + '=([^&]+)')) || [])[1];
      fb.push({ t: Date.now(), yontem: q.method(), ev: al('ev'), id: al('id'), tip: q.resourceType(), boyut: b.length, bas: u.slice(0, 90) });
      return r.abort();
    }
    if (/\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail|trueprofit/.test(u)) return r.abort();
    return r.continue();
  });
  const p = await ctx.newPage();
  p.on('console', m => { if (/fb|pixel|meta/i.test(m.text())) console.log('konsol:', m.type(), m.text().slice(0, 200)); });
  await p.goto('https://texttonext.com/products/auron-zaman-kapsulu-bileklik?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(8000);
  await p.evaluate(() => { const e = document.getElementById('PBarNextFrameWrapper'); if (e) e.style.setProperty('display', 'none', 'important'); });
  const durum = await p.evaluate(() => { try { const s = fbq.getState(); return { pikseller: s.pixels.map(x => x.id), surum: fbq.version, yuklendi: fbq.loaded, ozellik: Object.keys(s) }; } catch (e) { return 'getState yok: ' + e.message; } });
  console.log('fbq durum', JSON.stringify(durum));
  const t0 = Date.now(); console.log('--- tiklama');
  await p.click('a.tt-wa');
  await p.waitForTimeout(12000);
  for (const x of fb) console.log(((x.t - t0) / 1000).toFixed(1) + 's', x.yontem, x.tip, 'ev=' + x.ev, 'id=' + x.id, x.boyut, x.bas);
  console.log('--- elle fbq Contact');
  const t1 = Date.now(); const n = fb.length;
  await p.evaluate(() => fbq('track', 'Contact'));
  await p.waitForTimeout(6000);
  for (const x of fb.slice(n)) console.log(((x.t - t1) / 1000).toFixed(1) + 's', x.yontem, 'ev=' + x.ev, 'id=' + x.id);
  await br.close();
})();
