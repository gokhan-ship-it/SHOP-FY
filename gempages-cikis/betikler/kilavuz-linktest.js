// Kilavuz link testi. Onizleme cubugu gizlenmez.
// 1) ?view=kilavuz sayfasini acar, sunucunun bastigi href'leri (ham HTML) ve betikten sonraki href'leri kaydeder
// 2) bireysel ve couple kartlarina gercekten tiklar, acilan adresi ve sablonu kaydeder, ekran goruntusu alir
// 3) QR adresleri (?_ab=0&key=..., ?key=...) ile ayni icerigin geldigini karsilastirir
const { webkit, devices } = require('playwright');
const fs = require('fs');
const CIK = process.argv[2]; fs.mkdirSync(CIK, { recursive: true });
const T = 'preview_theme_id=189140861248';
const KOK = 'https://texttonext.com/pages/kullanim-kilavuzu';
(async () => {
  const br = await webkit.launch(); const sonuc = [];
  for (const cihaz of ['telefon', 'masaustu']) {
    const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const durum = async () => p.evaluate(() => ({
      adres: location.pathname + location.search,
      tema: window.Shopify && Shopify.theme ? `${Shopify.theme.name} (${Shopify.theme.id}, ${Shopify.theme.role})` : '?',
      cubuk: !!document.querySelector('#preview-bar-iframe, #PBarNextFrameWrapper, #PBarNextFrame'),
      h1: (document.querySelector('#MainContent h1') || {}).innerText || null,
      ttk: !!document.querySelector('#MainContent [id^="ttk-"]'),
      kartlar: [...document.querySelectorAll('#MainContent a[data-ttk-view]')].map(a => ({ baslik: (a.querySelector('.ttk-kart-baslik, h3, strong') || a).innerText.trim().split('\n')[0], href: a.getAttribute('href') })),
    }));
    const kayit = async (ad, ek) => { const d = await durum(); d.ad = ad; d.cihaz = cihaz; d.zaman = new Date().toISOString(); d.dosya = `${ad}-${cihaz}.png`; Object.assign(d, ek || {}); await p.screenshot({ path: `${CIK}/${d.dosya}` }); sonuc.push(d); console.log(JSON.stringify(d)); return d; };
    const kartaGit = async (bas) => {
      const a = p.locator(`#MainContent a[href^="${bas}"]`).first();
      await a.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
      return a;
    };

    // 1) Ana kilavuz (?view=kilavuz)
    await p.goto(`${KOK}?view=kilavuz&${T}`, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(3500);
    const ham = await p.evaluate(async () => { const h = await (await fetch(location.href)).text(); return [...h.matchAll(/<a[^>]*data-ttk-view="([^"]+)"[^>]*>/g)].map(m => { const href = (m[0].match(/href="([^"]+)"/) || [])[1]; return { view: m[1], hamHref: href }; }); });
    const kart1 = await kartaGit('/pages/bireysel-hediye-kullanim-kilavuzu');
    await kayit('1-ana-kilavuz-kartlar', { hamHTML: ham });

    // 2a) Bireysel kartina tikla
    await Promise.all([p.waitForNavigation({ waitUntil: 'load', timeout: 120000 }), kart1.click()]); await p.waitForTimeout(3000);
    await kayit('2-bireysel-karta-tiklandi');

    // 2b) Geri don, couple kartina tikla
    await p.goBack({ waitUntil: 'load' }); await p.waitForTimeout(3000);
    const kart2 = await kartaGit('/pages/couple-hediye-kullanim-kilavuzu');
    await Promise.all([p.waitForNavigation({ waitUntil: 'load', timeout: 120000 }), kart2.click()]); await p.waitForTimeout(3000);
    await kayit('3-couple-karta-tiklandi');

    // 3) QR adresleri
    const icerik = async () => p.evaluate(() => (document.querySelector('#MainContent') || {}).innerText || '');
    await p.goto(`${KOK}?view=kilavuz&${T}`, { waitUntil: 'load' }); await p.waitForTimeout(2500); const temel = await icerik();
    for (const [ad, q] of [['4-qr-ab-key', '_ab=0&key=1767609525998&view=kilavuz'], ['5-qr-key', 'key=1767609525998&view=kilavuz']]) {
      await p.goto(`${KOK}?${q}&${T}`, { waitUntil: 'load' }); await p.waitForTimeout(3000);
      const ic = await icerik();
      await kayit(ad, { ayniIcerik: ic === temel, icerikUzunluk: ic.length });
    }
    // QR adresinden karta tiklama
    const kart3 = await kartaGit('/pages/bireysel-hediye-kullanim-kilavuzu');
    await Promise.all([p.waitForNavigation({ waitUntil: 'load', timeout: 120000 }), kart3.click()]); await p.waitForTimeout(3000);
    await kayit('6-qr-adresinden-bireysel-karta-tiklandi');
    await ctx.close();
  }
  fs.writeFileSync(CIK + '/goruntuler.json', JSON.stringify(sonuc.map(s => ({ ...s, url: 'https://texttonext.com' + s.adres })), null, 1));
  await br.close();
})();
