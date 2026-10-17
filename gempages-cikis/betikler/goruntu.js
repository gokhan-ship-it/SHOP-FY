// Temiz oturum, onizleme cubugu GIZLENMEZ. Her goruntu icin Shopify.theme + sunucu temasi kaydedilir.
// kullanim: node goruntu.js <cikis_klasoru> '<json: [[ad, url, "telefon"|"masaustu", tamSayfa(0/1), js(opsiyonel)]]>'
const { webkit, devices } = require('playwright');
const fs = require('fs');
const CIK = process.argv[2]; fs.mkdirSync(CIK, { recursive: true });
const isler = JSON.parse(process.argv[3]);
(async () => {
  const br = await webkit.launch(); const out = [];
  for (const [ad, url, cihaz, tam, js] of isler) {
    const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const r = await p.goto(url, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(4000);
    if (js) { await p.evaluate(js).catch(e => null); await p.waitForTimeout(1500); }
    if (tam) { for (let y = 0; y < 30; y++) { const h = await p.evaluate(() => { window.scrollBy(0, 700); return document.documentElement.scrollHeight - window.scrollY - innerHeight; }); await p.waitForTimeout(350); if (h <= 0) break; } await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1200); }
    const bilgi = await p.evaluate(() => ({ tema: window.Shopify && Shopify.theme ? `${Shopify.theme.name} (${Shopify.theme.id}, ${Shopify.theme.role})` : '?', cubuk: !!document.querySelector('#preview-bar-iframe, #PBarNextFrameWrapper, #PBarNextFrame'), baslik: document.title }));
    bilgi.sunucuTema = (((r && r.headers()['server-timing']) || '').match(/theme;desc="(\d+)"/) || [])[1] || null;
    bilgi.ad = ad; bilgi.url = url; bilgi.cihaz = cihaz; bilgi.dosya = `${ad}-${cihaz}.png`; bilgi.zaman = new Date().toISOString();
    await p.screenshot({ path: `${CIK}/${bilgi.dosya}`, fullPage: !!tam });
    out.push(bilgi); console.log(JSON.stringify(bilgi));
    await ctx.close(); await new Promise(z => setTimeout(z, 1200));
  }
  const eski = fs.existsSync(CIK + '/goruntuler.json') ? JSON.parse(fs.readFileSync(CIK + '/goruntuler.json')) : [];
  fs.writeFileSync(CIK + '/goruntuler.json', JSON.stringify(eski.concat(out), null, 1));
  await br.close();
})();
