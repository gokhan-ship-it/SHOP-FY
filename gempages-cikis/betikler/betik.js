// Yayindaki ve taslak temada yuklenen ucuncu taraf betik/istek alanlari. Temiz oturum, her tema icin ayri tarayici baglami.
const { webkit } = require('playwright'); const fs = require('fs');
const yollar = JSON.parse(process.argv[2]);
(async () => { const br = await webkit.launch(); const out = {};
 for (const [ad, th] of [['YAYIN', ''], ['TASLAK', 'preview_theme_id=189140861248']]) {
  out[ad] = {};
  for (const y of yollar) {
   const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
   const istek = {}; p.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http')) { const k = r.resourceType() + ' ' + u.host + (r.resourceType() === 'script' ? u.pathname.slice(0, 80) : ''); istek[k] = (istek[k] || 0) + 1; } });
   const url = 'https://texttonext.com' + y + (th ? (y.includes('?') ? '&' : '?') + th : '');
   const r = await p.goto(url, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(7000);
   for (let i = 0; i < 6; i++) { await p.evaluate(() => scrollBy(0, 800)); await p.waitForTimeout(500); }
   await p.waitForTimeout(3000);
   const g = await p.evaluate(() => ({ tema: Shopify.theme.name, fbq: typeof window.fbq, gtag: typeof window.gtag, dataLayer: Array.isArray(window.dataLayer), ttq: typeof window.ttq, klaviyo: typeof window.klaviyo, wheelio: !!document.querySelector('[id*=wheelio],[class*=wheelio]'), inbox: !!document.querySelector('#ShopifyChat,inbox-online-store-chat,[id*=shopify-chat]'), gp: !!document.querySelector('[class*="gps-"],gp-row'), judgeme: !!document.querySelector('.jdgm-widget,[class*=jdgm]'), uygulamaBlok: [...document.querySelectorAll('[id^="shopify-block-"]')].map(e => e.id.replace(/^shopify-block-/, '').slice(0, 60)) }));
   g.sunucu = (((r && r.headers()['server-timing']) || '').match(/theme;desc="(\d+)"/) || [])[1];
   out[ad][y] = { genel: g, istek };
   console.log(ad, y, g.tema, g.sunucu, Object.keys(istek).length);
   await ctx.close();
  }
 }
 fs.writeFileSync('betik-karsilastirma.json', JSON.stringify(out, null, 1)); await br.close(); })();
