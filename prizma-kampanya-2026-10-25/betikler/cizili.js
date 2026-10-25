// Kullanim: node cizili.js <tema_id> <cikis.json> [genislik]
// Ustu cizili fiyat denetimi (kopya tema onizlemesi). Takip istekleri yakalanip iptal edilir.
// Her sayfada: (1) Prizma kartlari/fiyat alani: satis fiyati, karsilastirma fiyati, ustu cizili mi, gorunur mu
//              (2) sayfadaki butun gorunur ustu cizili ogeler (genel kural kontrolu)
const { chromium } = require('playwright');
const fs = require('fs');
const TID = process.argv[2], OUT = process.argv[3], W = +(process.argv[4] || 390);
const H = 'prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik';
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/,
  /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const url = p => 'https://texttonext.com' + p + (p.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID;

async function olc(page, kok) {
  return page.evaluate(({ H, kok }) => {
    const gor = e => { if (!e) return false; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]') && +cs.opacity > 0; };
    const cizili = e => { for (let x = e; x && x !== document.body; x = x.parentElement) { if (getComputedStyle(x).textDecorationLine.includes('line-through')) return true; } return false; };
    const kap = document.querySelector(kok || 'body') || document.body;
    // (1) Prizma
    const prz = [];
    const linkler = [...kap.querySelectorAll('a[href*="/products/' + H + '"]')];
    const kartlar = new Set();
    for (const a of linkler) {
      let k = a;
      for (let i = 0; i < 8 && k.parentElement; i++) { k = k.parentElement; if (/(1[.,]999)/.test(k.textContent) && k.querySelector('a[href*="/products/' + H + '"]')) break; }
      if (/(1[.,]999)/.test(k.textContent)) kartlar.add(k);
    }
    for (const k of kartlar) {
      if ([...kartlar].some(o => o !== k && k.contains(o))) continue;
      const bolum = k.closest('[id^="shopify-section"]');
      const ogeler = [...k.querySelectorAll('*')].filter(e => e.children.length === 0 || e.matches('s,del'));
      const fiyat = ogeler.filter(e => /^\s*(1[.,]999([.,]00)?\s*(TL|₺)?|₺?\s*1[.,]999)/.test(e.textContent.trim()) && e.textContent.trim().length < 30);
      const karsi = ogeler.filter(e => /2[.,]399/.test(e.textContent) && e.textContent.trim().length < 30);
      const bilgi = e => ({ metin: e.textContent.trim().replace(/\s+/g, ' '), sinif: (e.className || '').toString().slice(0, 60), gorunur: gor(e), cizili: cizili(e),
        boyut: getComputedStyle(e).fontSize, kalinlik: getComputedStyle(e).fontWeight, renk: getComputedStyle(e).color });
      prz.push({ bolum: bolum ? bolum.id.replace('shopify-section-', '') : '?', kartGorunur: gor(k), fiyat: fiyat.map(bilgi), karsi: karsi.map(bilgi) });
    }
    // (2) butun gorunur ustu cizili ogeler
    const tum = [];
    for (const e of kap.querySelectorAll('s, del, .price__sale, .tt-uk-eski, .tt-cs-eski, [class*="eski"], [class*="compare"]')) {
      if (!gor(e) || !cizili(e) || !/\d/.test(e.textContent)) continue;
      const kart = e.closest('[class*="kart"], .product-card, li, article') || e.parentElement;
      const ad = (kart.querySelector('a[href*="/products/"]') || {}).getAttribute ? kart.querySelector('a[href*="/products/"]').getAttribute('href').split('/products/')[1].split(/[?#]/)[0] : '?';
      tum.push({ urun: ad, metin: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), sinif: (e.className || '').toString().slice(0, 50), bolum: (e.closest('[id^="shopify-section"]') || {}).id });
    }
    return { prizma: prz, tumCizili: tum };
  }, { H, kok });
}

(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const mobil = W < 800;
  const ctx = await br.newContext({ viewport: { width: W, height: mobil ? 844 : 900 }, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: mobil ? 3 : 1, locale: 'tr-TR',
    userAgent: mobil ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const beacon = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (BEACON.some(re => re.test(u))) { beacon.push(u.slice(0, 50)); return r.abort(); } return r.continue(); });
  const page = await ctx.newPage();
  const konsol = [];
  page.on('console', m => { if (m.type() === 'error') konsol.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => konsol.push('pageerror: ' + String(e.message).slice(0, 160)));
  const sonuc = { tema: TID, genislik: W, sayfalar: {} };
  const kaydir = async () => { for (let y = 0; y < 30; y++) { await page.mouse.wheel(0, 900); await bekle(150); } await page.evaluate(() => scrollTo(0, 0)); await bekle(600); };
  const git = async (p) => { for (let i = 0; i < 3; i++) { try { await page.goto(url(p), { waitUntil: 'load', timeout: 60000 }); await bekle(2500); return; } catch (e) { await bekle(3000); } } };

  // Ana sayfa
  await git('/'); await kaydir();
  sonuc.sayfalar['ana'] = await olc(page);
  // Koleksiyonlar: Single + Couple
  for (const [ad, p] of [['erkek', '/collections/zaman-kapsulu-bileklik'], ['kadin', '/collections/zaman-kapsulu-kolyeler']]) {
    await git(p); await kaydir();
    sonuc.sayfalar[ad + '-single'] = await olc(page);
    const c = await page.$('[data-sc-mod="couple"]');
    if (c) { await page.evaluate(() => { const f = document.querySelector('#PBarNextFrameWrapper'); if (f) f.style.display = 'none'; });
      await c.scrollIntoViewIfNeeded(); await c.click(); await bekle(1500); await kaydir(); sonuc.sayfalar[ad + '-couple'] = await olc(page); }
  }
  // Arama sonuclari
  await git('/search?q=prizma&type=product'); await kaydir();
  sonuc.sayfalar['arama'] = await olc(page, 'main');
  // Anlik arama onerileri (predictive search bolumu)
  sonuc.sayfalar['anlik-arama'] = await page.evaluate(async (TID) => {
    const r = await fetch('/search/suggest?q=prizma&section_id=predictive-search&preview_theme_id=' + TID); const t = await r.text();
    const d = document.createElement('div'); d.id = 'tt-test-onizleme'; d.innerHTML = t; document.body.appendChild(d); return { http: r.status, uzunluk: t.length };
  }, TID);
  Object.assign(sonuc.sayfalar['anlik-arama'], await olc(page, '#tt-test-onizleme'));
  // Prizma urun sayfasi
  await git('/products/' + H); await kaydir();
  sonuc.sayfalar['urun'] = await olc(page);
  sonuc.sayfalar['urun'].urunFiyatAlani = await page.evaluate(() => [...document.querySelectorAll('.price')].filter(e => e.closest('main, [id*="main"]')).slice(0, 6).map(e => ({
    bolum: (e.closest('[id^="shopify-section"]') || {}).id, sinif: e.className.slice(0, 60), metin: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
    satis: (e.querySelector('.price__regular') || {}).textContent?.trim(), karsi: (e.querySelector('.price__sale') || {}).textContent?.trim(),
    karsiCizili: e.querySelector('.price__sale') ? getComputedStyle(e.querySelector('.price__sale')).textDecorationLine : null,
    karsiGorunur: e.querySelector('.price__sale') ? e.querySelector('.price__sale').getBoundingClientRect().width > 0 : null })));
  // Oneri listesi: baska bir tekli urunun sayfasi (Prizma onerilerde cikabilir)
  for (const h of ['luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya', 'diamond-vantablack-zaman-kapsulu-erkek-kolye']) {
    await git('/products/' + h); await kaydir(); await bekle(1500);
    sonuc.sayfalar['oneri-' + h.slice(0, 12)] = await olc(page);
  }
  sonuc.konsol = konsol; sonuc.engellenenTakip = beacon.length;
  fs.writeFileSync(OUT, JSON.stringify(sonuc, null, 1));
  await br.close();
})();
