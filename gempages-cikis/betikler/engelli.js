// GemPages kaldirilmis gibi: GemPages uzanti betikleri, assets.gemcommerce.com ve files.gempages.net istekleri tarayicida engellenir.
// Sitede hicbir sey degismez; yalnizca bu tarayici bu dosyalari indirmez.
const { webkit, devices } = require('playwright'); const fs = require('fs');
const CIK = process.argv[2]; fs.mkdirSync(CIK, { recursive: true }); const isler = JSON.parse(process.argv[3]);
(async () => { const br = await webkit.launch(); const out = [];
 for (const [ad, url, cihaz] of isler) {
  const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  let engel = 0;
  await ctx.route(u => /cdn\.shopify\.com\/extensions\/[^/]+\/gempages|assets\.gemcommerce\.com|files\.gempages\.net|gempages/i.test(u.href), r => { engel++; return r.abort(); });
  const p = await ctx.newPage(); const r = await p.goto(url, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(4000);
  for (let y = 0; y < 30; y++) { const h = await p.evaluate(() => { scrollBy(0, 700); return document.documentElement.scrollHeight - scrollY - innerHeight; }); await p.waitForTimeout(350); if (h <= 0) break; }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1200);
  const bilgi = await p.evaluate(() => ({ tema: window.Shopify && Shopify.theme ? `${Shopify.theme.name} (${Shopify.theme.id}, ${Shopify.theme.role}) | GEMPAGES ENGELLI (benzetim)` : '?', cubuk: !!document.querySelector('#preview-bar-iframe, #PBarNextFrameWrapper, #PBarNextFrame'), videoSrc: [...document.querySelectorAll('#MainContent video')].map(v => v.currentSrc || v.getAttribute('src') || '(src yok)'), kartGorsel: [...document.querySelectorAll('#MainContent img')].map(i => (i.currentSrc || i.src).slice(0, 60)) }));
  bilgi.sunucuTema = (((r && r.headers()['server-timing']) || '').match(/theme;desc="(\d+)"/) || [])[1] || null; bilgi.engellenenIstek = engel;
  Object.assign(bilgi, { ad, url, cihaz, dosya: `${ad}-${cihaz}.png`, zaman: new Date().toISOString() });
  const yuk = await p.evaluate(() => document.documentElement.scrollHeight); bilgi.sayfaYuksekligi = yuk; if (yuk > 9000) { bilgi.not = 'sayfa ' + yuk + ' px; ilk 9000 px kaydedildi'; await p.setViewportSize({ width: p.viewportSize().width, height: 9000 }); await p.waitForTimeout(1500); await p.screenshot({ path: `${CIK}/${bilgi.dosya}` }); } else await p.screenshot({ path: `${CIK}/${bilgi.dosya}`, fullPage: true }); out.push(bilgi); console.log(JSON.stringify(bilgi)); await ctx.close();
 }
 fs.writeFileSync(CIK + '/goruntuler.json', JSON.stringify(out, null, 1)); await br.close(); })();
