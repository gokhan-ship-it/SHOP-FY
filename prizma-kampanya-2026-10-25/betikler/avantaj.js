// Kullanim: node avantaj.js <kopya_tema> <canli_tema> <cikis.json> <genislik> [bitti|kod]
// "AVANTAJLI" rozeti + "Son gun" seridi + urun sayfasi etiketi kontrolleri (onizleme).
// Takip istekleri yakalanip iptal edilir. "bitti": tarayici saati bitisten 1 dk sonraya alinir.
// "kod": cark kodu cerezleri test oturumunda kurulur (yalnizca gosterim).
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, CANLI, OUT, Ws, MOD] = process.argv.slice(2);
const W = +Ws, mobil = W < 800;
const H = 'prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik';
const COUPLE = ['prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple', 'prizma-chloe-couple-zaman-kapsulu', 'rose-pink-prizma-couple-zaman-kapsulu'];
const BITIS = 1793566740000;
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/,
  /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];

// Sayfa icinde calisan ortak olcum: rozet(ler), serit(ler), etiket, eski hap, id tekilligi
const OLC = () => {
  const gor = e => { if (!e) return false; const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.display !== 'none' && c.visibility !== 'hidden'; };
  const kutu = (e, ref) => { const b = e.getBoundingClientRect(), r = ref ? ref.getBoundingClientRect() : { left: 0, top: -scrollY, right: 0, bottom: 0 };
    return { sol: Math.round(b.left - r.left), ust: Math.round(b.top - r.top), sag: ref ? Math.round(r.right - b.right) : null, alt: ref ? Math.round(r.bottom - b.bottom) : null, w: Math.round(b.width), h: Math.round(b.height) }; };
  const urunOf = e => { const k = e.closest('.tt-uk, .tt-cs-kart, .product-card') || document.body; const a = k.querySelector('a[href*="/products/"]');
    return a ? a.getAttribute('href').split('/products/')[1].split(/[?#]/)[0] : (k.querySelector('.tt-cs-ad') || {}).textContent || location.pathname.split('/products/')[1] || '?'; };
  const rozetler = [...document.querySelectorAll('svg.ttn-adv-badge')].map(s => {
    const ref = s.parentElement;
    const metinler = [...s.querySelectorAll('text')].map(t => { const bb = t.getBBox();
      const kose = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]];
      const enUzak = Math.max(...kose.map(([x, y]) => Math.hypot(x - 50, y - 50)));
      return { m: t.textContent, x0: +bb.x.toFixed(1), x1: +(bb.x + bb.width).toFixed(1), y0: +bb.y.toFixed(1), y1: +(bb.y + bb.height).toFixed(1), merkezeEnUzak: +enUzak.toFixed(1), font: getComputedStyle(t).fontFamily.split(',')[0].replace(/"/g, ''), kalinlik: getComputedStyle(t).fontWeight }; });
    const cs = getComputedStyle(s);
    return { urun: urunOf(s), sinif: s.getAttribute('class'), gorunur: gor(s), bolum: ((s.closest('[id^="shopify-section"]') || {}).id || '').replace(/^.*__/, ''), aria: s.getAttribute('aria-label'), role: s.getAttribute('role'),
      kutu: kutu(s, ref), kap: (ref.className || ref.tagName).toString().slice(0, 40), transform: cs.transform, filter: cs.filter, ids: [...s.querySelectorAll('[id]')].map(e => e.id), metinler };
  });
  const seritler = [...document.querySelectorAll('.tt-kmp-serit')].map(s => { const ref = s.parentElement; const cs = getComputedStyle(s); const ik = s.querySelector('svg'); const sp = s.querySelector('span');
    const altlar = [...ref.children].filter(c => c !== s && /tt-uk-noktalar|tt-uk-dugme|quick-add/.test(c.className) && gor(c)).map(c => ({ s: c.className.split(' ')[0], altBosluk: kutu(c, ref).alt, seritUstundenMi: c.getBoundingClientRect().bottom <= s.getBoundingClientRect().top + 0.5 }));
    return { urun: urunOf(s), gorunur: gor(s), metin: s.textContent.trim(), kutu: kutu(s, ref), refW: Math.round(ref.getBoundingClientRect().width), zemin: cs.backgroundColor, yazi: cs.color, boyut: cs.fontSize, kalinlik: cs.fontWeight, tekSatir: sp ? sp.getBoundingClientRect().height < parseFloat(cs.fontSize) * 1.6 && s.scrollWidth <= s.clientWidth : null,
      ikon: ik ? [Math.round(ik.getBoundingClientRect().width), Math.round(ik.getBoundingClientRect().height)] : null, ikonYaziArasi: ik && sp ? Math.round(sp.getBoundingClientRect().left - ik.getBoundingClientRect().right) : null, altOgeler: altlar };
  });
  const etiketler = [...document.querySelectorAll('.tt-kmp-etiket')].map(e => { const cs = getComputedStyle(e); const ik = e.querySelector('svg');
    return { sinif: e.className, gorunur: gor(e), metin: e.textContent.trim(), kutu: kutu(e), zemin: cs.backgroundColor, yazi: cs.color, boyut: cs.fontSize, kalinlik: cs.fontWeight, padding: cs.padding, kose: cs.borderRadius, ikon: ik ? Math.round(ik.getBoundingClientRect().width) : null, onceki: (e.previousElementSibling || {}).className?.toString().slice(0, 40) }; });
  const idler = [...document.querySelectorAll('[id^="ttnb-"]')].map(e => e.id);
  const tekrar = idler.filter((x, i) => idler.indexOf(x) !== i);
  return { bitti: document.documentElement.classList.contains('tt-kmp-bitti'), rozetler, gorunenRozet: rozetler.filter(r => r.gorunur).length, seritler, gorunenSerit: seritler.filter(s => s.gorunur).length,
    etiketler, gorunenEtiket: etiketler.filter(e => e.gorunur).length, eskiHap: document.querySelectorAll('.tt-kmp-rozet').length, idTekrar: tekrar.length,
    yedek: [...document.querySelectorAll('[data-tt-kmp-yedek]')].map(e => ({ m: e.textContent.trim(), gorunur: gor(e) })),
    poppins700: document.fonts.check('700 17px Poppins', '-400₺AVANTAJLI'), tasma: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await br.newContext({ viewport: { width: W, height: mobil ? 812 : 900 }, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: mobil ? 3 : 1, locale: 'tr-TR',
    userAgent: mobil ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; tr_TR)' : undefined });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  if (MOD === 'bitti') await ctx.addInitScript(b => { const fark = b + 60000 - Date.now(); const N = Date.now.bind(Date); Date.now = () => N() + fark; }, BITIS);
  if (MOD === 'kod') await ctx.addCookies([['wlo-codebar-code', 'TESTKOD'], ['wlo-codebar-counter', '3600'], ['wlo-codebar-time', String(Date.now())]].map(([name, value]) => ({ name, value, domain: 'texttonext.com', path: '/' })));
  await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  const page = await ctx.newPage();
  const konsol = [];
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|monorail|Failed to fetch|shop\.app|403/.test(m.text())) konsol.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => { if (!/Failed to fetch/.test(e.message)) konsol.push('pageerror: ' + String(e.message).slice(0, 160)); });
  const git = async (tema, p) => { const u = 'https://texttonext.com' + p + (p.includes('?') ? '&' : '?') + 'preview_theme_id=' + tema;
    for (let i = 0; i < 3; i++) { try { await page.goto(u, { waitUntil: 'load', timeout: 60000 }); await bekle(2500); return; } catch (e) { await bekle(3000); } } };
  const kaydir = async () => { for (let y = 0; y < 22; y++) { await page.mouse.wheel(0, 800); await bekle(110); } await page.evaluate(() => scrollTo(0, 0)); await bekle(700); };
  const cubuguGizle = () => page.evaluate(() => { const f = document.querySelector('#PBarNextFrameWrapper'); if (f) f.style.display = 'none'; });
  const S = { genislik: W, mod: MOD || 'kampanya', sayfalar: {} };

  // ANA SAYFA (canli ile kart boyu ve bolum konumlari karsilastirmasi)
  const ana = () => page.evaluate(() => {
    const bol = id => document.querySelector('[id^="shopify-section-"][id$="__' + id + '"]');
    const y = e => e ? Math.round(e.getBoundingClientRect().top + scrollY) : null;
    const kartlar = [...document.querySelectorAll('.tt-cs-serit .tt-cs-kart')];
    const k = kartlar[0];
    const r = k ? k.querySelector('.tt-cs-rozetler') : null, g = k ? k.querySelector('.tt-cs-gorsel') : null;
    const erkek = r ? r.querySelector('.tt-cs-rozet') : null;
    return { csY: y(bol('tt_cok_satanlar_1')), csH: bol('tt_cok_satanlar_1') ? Math.round(bol('tt_cok_satanlar_1').getBoundingClientRect().height) : null, catalY: y(bol('tt_catal_karsilastirma_DR3MX8')),
      kartBoylari: [...new Set(kartlar.map(x => Math.round(x.getBoundingClientRect().height)))],
      ilkKart: k ? { ad: (k.querySelector('.tt-cs-ad') || {}).textContent, kat: k.dataset.csKat, satir: [...k.querySelectorAll('.tt-cs-metin > *')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
        erkekEtiket: erkek ? { m: erkek.textContent.trim(), sol: Math.round(erkek.getBoundingClientRect().left - g.getBoundingClientRect().left), ust: Math.round(erkek.getBoundingClientRect().top - g.getBoundingClientRect().top), w: Math.round(erkek.getBoundingClientRect().width) } : null } : null };
  });
  await git(CANLI, '/'); await kaydir(); S.sayfalar.anaCanli = await ana();
  await git(TID, '/'); await kaydir(); S.sayfalar.ana = Object.assign(await ana(), await page.evaluate(OLC));
  for (const cip of ['erkek', 'kadin', 'tumu']) {
    const c = await page.$('.tt-cs-cip[data-cs-cip="' + cip + '"]'); if (!c) continue;
    await cubuguGizle(); await c.scrollIntoViewIfNeeded(); await c.click(); await bekle(700);
    S.sayfalar.ana['cip_' + cip] = await page.evaluate(() => { const v = [...document.querySelectorAll('.tt-cs-serit .tt-cs-kart')].filter(k => k.getBoundingClientRect().width > 0);
      return { ilk3: v.slice(0, 3).map(k => (k.querySelector('.tt-cs-ad') || {}).textContent), prizmaRozetGorunur: v.some(k => k.querySelector('svg.ttn-adv-badge') && k.querySelector('svg.ttn-adv-badge').getBoundingClientRect().width > 0) }; });
  }
  // KOLEKSIYONLAR
  const kolOlc = () => page.evaluate(() => {
    const v = [...document.querySelectorAll('.tt-sc-karo')].filter(k => k.getBoundingClientRect().width > 0);
    const i = v.findIndex(k => k.querySelector('a[href*="/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik"]'));
    const pk = i >= 0 ? v[i] : null;
    const komsu = pk ? v.filter(k => Math.abs(k.getBoundingClientRect().top - pk.getBoundingClientRect().top) < 2).map(k => Math.round(k.getBoundingClientRect().height)) : [];
    return { gorunenKart: v.length, prizmaSirasi: i + 1, ayniSatirKartBoylari: komsu,
      prizmaMetin: pk ? (pk.querySelector('.tt-uk-metin') || {}).textContent?.replace(/\s+/g, ' ').trim().slice(0, 90) : null };
  });
  for (const [ad, p] of [['erkek', '/collections/zaman-kapsulu-bileklik'], ['kadin', '/collections/zaman-kapsulu-kolyeler']]) {
    await git(TID, p); await kaydir();
    S.sayfalar[ad + '-single'] = Object.assign(await kolOlc(), await page.evaluate(OLC));
    const c = await page.$('[data-sc-mod="couple"]');
    if (c) { await cubuguGizle(); await c.scrollIntoViewIfNeeded(); await c.click(); await bekle(1500);
      S.sayfalar[ad + '-couple'] = Object.assign(await kolOlc(), await page.evaluate(OLC)); }
  }
  // URUN SAYFASI
  await git(TID, '/products/' + H); await bekle(800);
  S.sayfalar.urun = Object.assign(await page.evaluate(() => {
    const f = document.querySelector('.product__title .price, .product__price .price');
    const e = [...document.querySelectorAll('.tt-kmp-etiket')].find(x => x.getBoundingClientRect().width > 0);
    const uf = document.querySelector('product-info [data-tt-uf]:not([data-tt-uf-yapiskan])');
    const fiyatAlti = (e && f && f.getBoundingClientRect().width > 0) ? Math.round(e.getBoundingClientRect().top - f.getBoundingClientRect().bottom) : null;
    const ufAlti = (e && uf && !uf.hidden) ? Math.round(e.getBoundingClientRect().top - uf.getBoundingClientRect().bottom) : null;
    const gorsel = [...document.querySelectorAll('svg.ttn-adv-badge')].find(x => x.getBoundingClientRect().width > 0);
    const img = gorsel ? gorsel.parentElement.querySelector('img') || gorsel.parentElement : null;
    return { etiketFiyatAraligi: fiyatAlti, etiketCarkFiyatAraligi: ufAlti, carkSatiriGorunur: uf ? !uf.hidden : null,
      rozetGorselIcinde: gorsel && img ? (() => { const a = gorsel.getBoundingClientRect(), b = img.getBoundingClientRect(); return { sol: Math.round(a.left - b.left), ust: Math.round(a.top - b.top), imgW: Math.round(b.width), imgH: Math.round(b.height) }; })() : null };
  }), await page.evaluate(OLC));
  for (const h of COUPLE) { await git(TID, '/products/' + h); S.sayfalar['couple-' + h.slice(0, 22)] = await page.evaluate(OLC); }
  // ARAMA
  await git(TID, '/search?q=prizma&type=product'); await kaydir();
  S.sayfalar.arama = await page.evaluate(OLC);
  S.konsol = konsol;
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
