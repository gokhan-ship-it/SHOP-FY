// Footer A/B mock: taslak temada sayfa acilir, mock newsletter bolumunun hemen arkasina eklenir (temaya yuklenmez).
// Onizleme cubugu gizlenmez. Cubuk ekranin altinda sabit durdugu icin telif satirini ortmesin diye mock'un altina
// cubuk yuksekliginden biraz fazla (96px, #000000) bosluk eklenir; bu bosluk gercek footer'da yok.
const { webkit, devices } = require('playwright');
const fs = require('fs');
const [CIK, MOCK] = [process.argv[2], JSON.parse(fs.readFileSync(process.argv[3]))];
const URL = 'https://texttonext.com/pages/sozlesmeler?view=sozlesmeler-liste&preview_theme_id=189140861248';
(async () => {
  const br = await webkit.launch(); const out = [];
  for (const v of ['A', 'B']) for (const cihaz of ['telefon', 'masaustu']) {
    const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(3500);
    const bilgi = await p.evaluate((h) => {
      const nl = document.querySelector('[id$="__newsletter_P9N9HX"]');
      nl.insertAdjacentHTML('afterend', '<div id="tt-footer-mock">' + h + '<div aria-hidden="true" style="height:96px;background:#000;font-size:0">&nbsp;</div></div>');
      return { tema: `${Shopify.theme.name} (${Shopify.theme.id}, ${Shopify.theme.role})`, cubuk: !!document.querySelector('#PBarNextFrameWrapper, #PBarNextFrame'),
        linkler: [...document.querySelectorAll('#tt-footer-mock a')].map(a => { const r = a.getBoundingClientRect(); return a.innerText + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); }),
        footerYukseklik: Math.round(document.querySelector('#tt-footer-mock .ttf-mock').getBoundingClientRect().height) };
    }, MOCK[v]);
    await p.waitForTimeout(800);
    for (let i = 0; i < 3; i++) { await p.evaluate(() => { const e = document.scrollingElement || document.documentElement; e.scrollTop = 1e7; document.body.scrollTop = 1e7; window.scrollTo(0, 1e7); }); await p.waitForTimeout(700); }
    bilgi.altBosluk = await p.evaluate(() => { const r = document.querySelector('#tt-footer-mock .ttf-telif').getBoundingClientRect(); return { telifAlt: Math.round(r.bottom), ekran: innerHeight }; });
    Object.assign(bilgi, { ad: 'MOCK-footer-' + v, cihaz, url: URL + '  [MOCK: footer ' + v + ' sayfaya enjekte edildi, temaya yuklenmedi]', dosya: `MOCK-footer-${v}-${cihaz}.png`, zaman: new Date().toISOString() });
    await p.screenshot({ path: `${CIK}/${bilgi.dosya}` }); out.push(bilgi); console.log(JSON.stringify(bilgi));
    await ctx.close();
  }
  fs.writeFileSync(CIK + '/goruntuler.json', JSON.stringify(out, null, 1)); await br.close();
})();
