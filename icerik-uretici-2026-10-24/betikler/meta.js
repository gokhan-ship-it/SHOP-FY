// Meta / GA4 / TikTok / Shopify page_viewed: yeni sayfa ile /pages/iletisim karsilastirmasi.
// Beacon'lar yakalanip iptal edilir (gercek veri gitmez). Kullanim: node meta.js <tema_id> <cikis.json>
const { chromium } = require('playwright');
const fs = require('fs');
const TID = process.argv[2], OUT = process.argv[3];
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/,
  /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
(async () => {
  const br = await chromium.launch();
  const S = {};
  for (const [ad, w, h, m] of [['390', 390, 844, true], ['1440', 1440, 900, false]]) {
    for (const yol of ['/pages/icerik-uretici', '/pages/iletisim', '/']) {
      const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, locale: 'tr-TR' });
      const kayit = { meta: [], ga4: [], tiktok: [], page_viewed: 0 };
      await ctx.route('**/*', r => {
        const q = r.request(); const u = q.url(); const b = q.postData() || '';
        if (!BEACON.some(re => re.test(u))) return r.continue();
        if (/facebook\.com\/tr/.test(u)) {
          const x = new URL(u);
          const ev = x.searchParams.get('ev') || (b.match(/name="ev"\r?\n\r?\n([^\r\n]+)/) || b.match(/(?:^|&)ev=([^&]+)/) || [])[1] || '?';
          kayit.meta.push({ ev, id: x.searchParams.get('id') || (b.match(/name="id"\r?\n\r?\n([^\r\n]+)/) || [])[1], dl: decodeURIComponent((x.searchParams.get('dl') || (b.match(/name="dl"\r?\n\r?\n([^\r\n]+)/) || [])[1] || '')).replace(/\?.*$/, '').slice(0, 80), yontem: q.method() });
        } else if (/collect/.test(u) && /google|doubleclick/.test(u)) {
          const en = new URL(u).searchParams.get('en'); if (en) kayit.ga4.push(en);
        } else if (/tiktok/.test(u)) {
          const e = (b.match(/"event":"([^"]+)"/) || [])[1]; if (e) kayit.tiktok.push(e);
        } else if (/monorail/.test(u) && /page_viewed/.test(b)) kayit.page_viewed++;
        return r.abort();
      });
      const p = await ctx.newPage();
      const giden = yol + (yol.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID;
      await p.goto('https://texttonext.com' + giden, { waitUntil: 'load', timeout: 120000 });
      await p.waitForTimeout(15000);
      kayit.tema = await p.evaluate(() => Shopify.theme.id);
      S[ad + ' ' + yol] = kayit;
      await ctx.close();
    }
  }
  await br.close();
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  for (const [k, v] of Object.entries(S)) console.log(k, 'tema', v.tema, '| meta', JSON.stringify(v.meta), '| ga4', v.ga4.join(','), '| tiktok', v.tiktok.join(','), '| page_viewed istek', v.page_viewed);
})();
