// Kullanim: node rozet.js <kopya_tema> <canli_tema> <cikis.json> <genislik> [bitti]
// Kampanya rozeti + Prizma ilk sira kontrolleri (onizleme). Takip istekleri yakalanip iptal edilir.
// "bitti" verilirse tarayici saati kampanya bitisinden 1 dk sonraya alinir (JS gizleme testi).
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, CANLI, OUT, Ws, MOD] = process.argv.slice(2);
const W = +Ws, mobil = W < 800;
const H = 'prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik';
const COUPLE = ['prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple', 'prizma-chloe-couple-zaman-kapsulu', 'rose-pink-prizma-couple-zaman-kapsulu'];
const BITIS = 1793566740000; // 2026-11-01 23:59 +03:00
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/,
  /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];

async function yeniSayfa(br) {
  const ctx = await br.newContext({ viewport: { width: W, height: mobil ? 844 : 900 }, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: mobil ? 3 : 1, locale: 'tr-TR',
    userAgent: mobil ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; tr_TR)' : undefined });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  if (MOD === 'bitti') await ctx.addInitScript(b => { const fark = b + 60000 - Date.now(); const D = Date; const N = D.now.bind(D);
    D.now = () => N() + fark; }, BITIS);
  const beacon = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (BEACON.some(re => re.test(u))) { beacon.push(u.slice(0, 40)); return r.abort(); } return r.continue(); });
  const page = await ctx.newPage();
  const konsol = [];
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) konsol.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => konsol.push('pageerror: ' + String(e.message).slice(0, 160)));
  return { ctx, page, konsol, beacon };
}
const git = async (page, tema, p) => { const u = 'https://texttonext.com' + p + (p.includes('?') ? '&' : '?') + 'preview_theme_id=' + tema;
  for (let i = 0; i < 3; i++) { try { await page.goto(u, { waitUntil: 'load', timeout: 60000 }); await bekle(2500); return; } catch (e) { await bekle(3000); } } };
const kaydir = async page => { for (let y = 0; y < 25; y++) { await page.mouse.wheel(0, 800); await bekle(120); } await page.evaluate(() => scrollTo(0, 0)); await bekle(700); };

// Rozetlerin gorunurlugu, stili, gorsele gore konumu
const rozetOlc = page => page.evaluate(({ H, COUPLE }) => {
  const gor = e => { const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.display !== 'none' && c.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const sonuc = [];
  for (const r of document.querySelectorAll('[data-tt-kmp]')) {
    const kart = r.closest('.tt-uk, .tt-cs-kart, .product-card, [class*="product-card"]') || r.parentElement;
    const link = kart.querySelector('a[href*="/products/"]');
    const urun = link ? link.getAttribute('href').split('/products/')[1].split(/[?#]/)[0] : (kart.querySelector('.tt-cs-ad') || {}).textContent || (document.querySelector('meta[property="og:url"]') || {}).content;
    const gorsel = kart.querySelector('img');
    const b = r.getBoundingClientRect(), g = gorsel ? gorsel.getBoundingClientRect() : null, c = getComputedStyle(r);
    sonuc.push({ urun: String(urun).slice(0, 60), gorunur: gor(r), metin: r.textContent.trim(), yer: r.className.replace('tt-kmp-rozet ', ''),
      bolum: ((r.closest('[id^="shopify-section"]') || {}).id || '').replace(/^.*__/, ''),
      zemin: c.backgroundColor, yazi: c.color, kalinlik: c.fontWeight, boyut: c.fontSize, kose: c.borderRadius, font: c.fontFamily.split(',')[0],
      w: Math.round(b.width), h: Math.round(b.height),
      gorselIci: g ? { sol: Math.round(b.left - g.left), ust: Math.round(b.top - g.top), alanOrani: +(b.width * b.height / (g.width * g.height)).toFixed(3) } : null });
  }
  const yedek = [...document.querySelectorAll('[data-tt-kmp-yedek]')].map(e => ({ metin: e.textContent.trim(), gorunur: gor(e) }));
  const coupleRozet = sonuc.filter(x => COUPLE.some(c => x.urun.includes(c)) || /\+|Couple/.test(x.urun));
  return { bitti: document.documentElement.classList.contains('tt-kmp-bitti'), rozetler: sonuc, gorunenRozet: sonuc.filter(x => x.gorunur).length, yedek, coupleRozet: coupleRozet.length };
}, { H, COUPLE });

(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { genislik: W, mod: MOD || 'kampanya', sayfalar: {} };
  const { page, konsol, beacon } = await yeniSayfa(br);

  // 1) ANA SAYFA: kopya + canli karsilastirma (bolum konumlari)
  const anaOlc = () => page.evaluate(() => {
    const y = e => e ? Math.round(e.getBoundingClientRect().top + scrollY) : null;
    const hh = e => e ? Math.round(e.getBoundingClientRect().height) : null;
    const bol = id => document.querySelector('[id^="shopify-section-"][id$="__' + id + '"]');
    const kartlar = [...document.querySelectorAll('.tt-cs-serit .tt-cs-kart')];
    const ilk = kartlar.slice(0, 4).map(k => ({ ad: (k.querySelector('.tt-cs-ad') || {}).textContent, kat: k.dataset.csKat, h: hh(k),
      rozetler: [...k.querySelectorAll('.tt-cs-rozetler > *')].map(r => r.textContent.trim()), fiyat: (k.querySelector('.tt-cs-fiyat:not([hidden]) .tt-cs-satir') || {}).textContent?.replace(/\s+/g, ' ').trim() }));
    return { heroY: y(bol('hero_video_kapsul_ALtinB')), heroH: hh(bol('hero_video_kapsul_ALtinB')), csY: y(bol('tt_cok_satanlar_1')), csH: hh(bol('tt_cok_satanlar_1')),
      catalY: y(bol('tt_catal_karsilastirma_DR3MX8')), kartSayisi: kartlar.length, kartYukseklikleri: [...new Set(kartlar.map(hh))], ilkKartlar: ilk,
      sayfaGenisligiTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  await git(page, CANLI, '/'); await kaydir(page); S.sayfalar.anaCanli = await anaOlc();
  await git(page, TID, '/'); await kaydir(page); S.sayfalar.ana = Object.assign(await anaOlc(), await rozetOlc(page));
  // Erkek cipi: Prizma ilk mi
  const cip = await page.$('.tt-cs-cip[data-cs-cip="erkek"]');
  if (cip) { await page.evaluate(() => { const f = document.querySelector('#PBarNextFrameWrapper'); if (f) f.style.display = 'none'; });
    await cip.scrollIntoViewIfNeeded(); await cip.click(); await bekle(800);
    S.sayfalar.ana.erkekCipi = await page.evaluate(() => [...document.querySelectorAll('.tt-cs-serit .tt-cs-kart')].filter(k => k.getBoundingClientRect().width > 0).slice(0, 3).map(k => (k.querySelector('.tt-cs-ad') || {}).textContent)); }

  // 2) KOLEKSIYONLAR: Single + Couple, gorunen kart sirasi
  const kartSira = () => page.evaluate(() => [...document.querySelectorAll('.tt-sc-karo')].filter(k => { const b = k.getBoundingClientRect(); return b.width > 0 && b.height > 0; })
    .map(k => { const a = k.querySelector('a[href*="/products/"]'); return { h: a ? a.getAttribute('href').split('/products/')[1].split(/[?#]/)[0] : '?', kime: k.dataset.scKime,
      rozet: [...k.querySelectorAll('.tt-kmp-rozet, .tt-uk-rozet')].filter(r => r.getBoundingClientRect().width > 0).map(r => r.textContent.trim()) }; }));
  for (const [ad, p] of [['erkek', '/collections/zaman-kapsulu-bileklik'], ['kadin', '/collections/zaman-kapsulu-kolyeler']]) {
    await git(page, TID, p); await kaydir(page);
    const sira = await kartSira();
    const filtre = await page.evaluate(() => { const s = document.querySelector('[role="radio"][aria-checked="true"][data-sc-kime], .tt-sc-kime [aria-checked="true"], [data-sc-kime-sec][aria-checked="true"]'); return s ? s.textContent.trim() : null; });
    S.sayfalar[ad + '-single'] = Object.assign({ filtre, gorunenKart: sira.length, ilk5: sira.slice(0, 5), prizmaSirasi: sira.findIndex(x => x.h === 'prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik') + 1,
      tasma: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) }, await rozetOlc(page));
    const c = await page.$('[data-sc-mod="couple"]');
    if (c) { await page.evaluate(() => { const f = document.querySelector('#PBarNextFrameWrapper'); if (f) f.style.display = 'none'; });
      await c.scrollIntoViewIfNeeded(); await c.click(); await bekle(1500);
      const sc = await kartSira();
      S.sayfalar[ad + '-couple'] = Object.assign({ gorunenKart: sc.length, prizmaSirasi: sc.findIndex(x => x.h === 'prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik') + 1 }, await rozetOlc(page)); }
  }
  // Kadin sayfasinda Erkek filtresi secilince
  const ek = await page.$$('[role="radio"]');
  // 3) URUN SAYFALARI
  await git(page, TID, '/products/' + H);
  S.sayfalar.urun = Object.assign(await page.evaluate(() => {
    const r = document.querySelector('.tt-kmp-rozet--urun'), f = document.querySelector('.product__title .price, .product__price .price');
    const b = e => { if (!e) return null; const x = e.getBoundingClientRect(); return { x: Math.round(x.left), y: Math.round(x.top + scrollY), w: Math.round(x.width), h: Math.round(x.height), sag: Math.round(x.right) }; };
    return { rozetKutu: b(r), fiyatKutu: b(f), fiyatMetin: f ? f.textContent.replace(/\s+/g, ' ').trim() : null, ustuste: r && f ? (r.getBoundingClientRect().bottom > f.getBoundingClientRect().top + 1 && r.getBoundingClientRect().top < f.getBoundingClientRect().bottom - 1 && r.getBoundingClientRect().right > f.getBoundingClientRect().left && r.getBoundingClientRect().left < f.getBoundingClientRect().right) : null,
      temaIndirimEtiketi: (document.querySelector('.product__badges .badge--onsale') || {}).textContent?.trim() || null, tasma: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  }), await rozetOlc(page));
  for (const h of COUPLE) { await git(page, TID, '/products/' + h); S.sayfalar['couple-' + h.slice(0, 18)] = await rozetOlc(page); }
  // 4) ARAMA + ANLIK ARAMA
  await git(page, TID, '/search?q=prizma&type=product'); await kaydir(page);
  S.sayfalar.arama = await rozetOlc(page);
  await git(page, TID, '/');
  S.sayfalar.anlikArama = await page.evaluate(async () => {
    const el = document.querySelector('[is="predictive-search"], predictive-search'); const sid = el.dataset.sectionId;
    const t = await (await fetch('/search/suggest?q=prizma&resources[limit]=3&resources[limit_scope]=each&section_id=' + sid)).text();
    const d = document.createElement('div'); d.innerHTML = t; return { rozet: d.querySelectorAll('[data-tt-kmp]').length, prizmaVar: t.includes('prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik') };
  });
  S.konsol = konsol; S.engellenenTakip = beacon.length;
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
