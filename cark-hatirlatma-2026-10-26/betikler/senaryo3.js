// Kullanim: node senaryo3.js <tema_id> <390|360|1440> <cikis.json>
// Cark hatirlatma kontrolleri (temiz tarayici; her senaryo yeni baglam; takip istekleri iptal).
// Yalnizca bu tarayici oturumunun sepeti. Siparis olusturulmaz; "Odemeye gec" gonderimi
// yakalanip durduruluyor (yalnizca engellenip engellenmedigi olculuyor).
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, BOY, OUT] = process.argv.slice(2);
const K = 'https://texttonext.com';
const KOL = '/collections/zaman-kapsulu-bileklik';
const URUN = '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik';
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/,
  /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const [W, H, MOBIL] = { 390: [390, 844, true], 360: [360, 740, true], 1440: [1440, 900, false] }[BOY];
const S = { tema: TID, boy: BOY, senaryolar: {}, konsol: [] };
let TOPLA = null; // senaryo boyunca sayfa degismeden once olaylari topla

async function baglam(br) {
  const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: MOBIL, hasTouch: MOBIL, deviceScaleFactor: MOBIL ? 3 : 1, locale: 'tr-TR',
    userAgent: MOBIL ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; tr_TR)' : undefined });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') S.konsol.push({ u: page.url().replace(K, '').replace(/[?&]preview_theme_id=\d+/, ''), m: m.text().slice(0, 240) }); });
  page.on('pageerror', e => S.konsol.push({ u: page.url().replace(K, '').replace(/[?&]preview_theme_id=\d+/, ''), m: 'PAGEERROR ' + String(e.message).slice(0, 240) }));
  return { ctx, page };
}
async function git(page, yol, bek = 2500) {
  if (TOPLA && page.url().startsWith(K)) { const l = await page.evaluate(() => (window.ttnCarkOlaylar || []).map(o => o.ad + ' ' + JSON.stringify(o.p))).catch(() => []); TOPLA.push(...(l || [])); }
  await page.goto(K + yol + (yol.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const ilk = await page.evaluate(() => ({ sinif: document.documentElement.classList.contains('tt-hatir-acik'), durum: document.documentElement.getAttribute('data-ttn-cark-durum') }));
  await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
  await page.addStyleTag({ content: '#preview-bar-iframe,#PBarNextFrameWrapper,#PBarNextFrame{display:none!important}' }).catch(() => {});
  await bekle(bek);
  return ilk;
}
const kaydir = (page, px, adim = 60) => page.evaluate(async ([px, adim]) => {
  const n = Math.ceil(Math.abs(px) / adim);
  for (let i = 0; i < n; i++) { window.scrollBy(0, Math.sign(px) * adim); await new Promise(r => setTimeout(r, 40)); }
  await new Promise(r => setTimeout(r, 500));
}, [px, adim]);

// ---- olcumler (sayfa icinde) ----
const OLC_CUBUK = () => {
  const h = document.documentElement, c = document.querySelector('[data-tt-hatir]');
  const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
  const gor = e => !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const sonuc = { sinif: h.classList.contains('tt-hatir-acik'), durum: window.ttnCarkDurum ? window.ttnCarkDurum().kod : null, gorunur: gor(c), scrollY: Math.round(scrollY) };
  if (!sonuc.gorunur) return sonuc;
  const m = c.querySelector('[data-tt-hatir-metin]'), cv = c.querySelector('[data-tt-hatir-cevir]'), x = c.querySelector('[data-tt-hatir-kapat]'), ik = c.querySelector('.tt-hatir-ikon');
  const cs = getComputedStyle(c), ms = getComputedStyle(m), cvs = getComputedStyle(cv);
  // header'in alti
  let hb = null; { let e = document.elementFromPoint(Math.round(innerWidth / 2), 2); while (e && e !== document.body) { if (getComputedStyle(e).position === 'fixed') { hb = Math.round(e.getBoundingClientRect().bottom); break; } e = e.parentElement; } }
  const ortada = (el) => { const b = el.getBoundingClientRect(); const t = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2)); return t ? (el.contains(t) ? 'kendisi' : ((t.id || t.className || t.tagName) + '').slice(0, 60)) : null; };
  const main = document.querySelector('main.main-content');
  Object.assign(sonuc, {
    kutu: r(c), headerAlti: hb, ustBosluk: main ? getComputedStyle(main).paddingTop : null,
    zemin: cs.backgroundColor, altCizgi: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor, z: cs.zIndex, font: cs.fontFamily.split(',')[0],
    metin: m.textContent, metinKisa: m.textContent === m.getAttribute('data-kisa'), metinTasiyor: m.scrollWidth > m.clientWidth + 1, metinYukseklik: Math.round(m.getBoundingClientRect().height),
    metinStil: ms.fontSize + ' ' + ms.fontWeight + ' ' + ms.color,
    ikon: r(ik), cevir: r(cv), cevirStil: cvs.backgroundColor + ' ' + cvs.color + ' ' + cvs.fontWeight + ' r=' + cvs.borderRadius, kapat: r(x),
    ortadaki: ortada(c), cevirUstundeki: ortada(cv), kapatUstundeki: ortada(x),
  });
  return sonuc;
};
const OLC_KUTU = (kap) => {
  const k = document.querySelector(kap + ' [data-tt-cark-sepet]');
  const sonuc = { var: !!k };
  if (!k) return sonuc;
  const b = k.getBoundingClientRect(), cs = getComputedStyle(k);
  const kapEl = k.closest('.drawer__content, cart-drawer');
  const gorunur = b.height > 0 && cs.display !== 'none' && b.bottom > 0 && b.top < innerHeight && (!kapEl || getComputedStyle(kapEl).visibility !== 'hidden');
  sonuc.gorunur = gorunur;
  if (!gorunur) return sonuc;
  const bas = k.querySelector('.tt-cark-sepet-baslik'), s1 = bas.children[0], s2 = bas.children[1], alt = k.querySelector('.tt-cark-sepet-alt'), d = k.querySelector('[data-tt-cark-sepet-ac]');
  const st = e => { const c = getComputedStyle(e); return c.fontSize + ' ' + c.fontWeight + ' ' + c.color; };
  const liste = k.parentElement; const ilkMi = liste.firstElementChild === k || [...liste.children].filter(e => e.getBoundingClientRect().height > 0)[0] === k;
  const t = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(Math.min(innerHeight - 2, b.top + b.height / 2)));
  const db = d.getBoundingClientRect(), dt = document.elementFromPoint(Math.round(db.left + db.width / 2), Math.round(db.top + db.height / 2));
  Object.assign(sonuc, {
    yer: k.getAttribute('data-yer'), kutu: { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }, listeninIlki: ilkMi,
    zemin: cs.backgroundColor, kose: cs.borderRadius, baslik: [s1.textContent, s2.textContent], baslikStil: [st(s1), st(s2)], alt: alt.textContent, altStil: st(alt),
    dugme: { w: Math.round(db.width), h: Math.round(db.height), stil: getComputedStyle(d).backgroundColor + ' ' + getComputedStyle(d).color }, dugmeEkranda: db.bottom <= innerHeight && db.top >= 0,
    ortadaki: t ? (k.contains(t) ? 'kendisi' : ((t.id || t.className || t.tagName) + '').slice(0, 60)) : null, dugmeUstundeki: dt ? (d.contains(dt) ? 'kendisi' : ((dt.id || dt.className || dt.tagName) + '').slice(0, 60)) : null,
  });
  return sonuc;
};
const OLC_PENCERE = () => {
  const p = document.querySelector('[data-tt-cark-pencere]'), k = p && p.querySelector('[data-ttn-cark]');
  const cd = document.querySelector('cart-drawer');
  const s = { acik: !!(p && p.open), kartAcik: !!(k && k.hasAttribute('data-ttn-acik')), cekmeceAcik: !!(cd && cd.hasAttribute('open')), durum: window.ttnCarkDurum().kod };
  if (s.acik && k) {
    const c = k.querySelector('[data-ttn-cevir]'), v = k.querySelector('[data-ttn-kapat]');
    const b = c.getBoundingClientRect(); const t = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
    s.cevir = { y: Math.round(b.top), alt: Math.round(b.bottom), ekranda: b.top >= 0 && b.bottom <= innerHeight, ustundeki: t ? (c.contains(t) ? 'kendisi' : ((t.id || t.className || t.tagName) + '').slice(0, 60)) : null };
    const kb = k.getBoundingClientRect(); s.kart = { y: Math.round(kb.top), h: Math.round(kb.height), w: Math.round(kb.width) };
    s.vazgecEkranda = v ? v.getBoundingClientRect().top >= 0 : null;
  }
  return s;
};
const SEPET = () => fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(r => r.json()).then(c => ({
  adet: c.item_count, ara: c.original_total_price / 100, toplam: c.total_price / 100, indirim: c.total_discount / 100,
  kodlar: (c.discount_codes || []).map(d => d.code + ':' + d.applicable),
  uygulamalar: (c.cart_level_discount_applications || []).map(d => d.title + ' -' + d.total_allocated_amount / 100),
  satirIndirim: c.items.flatMap(i => (i.line_level_discount_allocations || []).map(d => d.discount_application.title + ' -' + d.amount / 100)),
}));
const OLAYLAR = () => (window.ttnCarkOlaylar || []).map(o => o.ad + ' ' + JSON.stringify(o.p));
const URUN_EKLE = async (n) => {
  for (let deneme = 0; deneme < 4; deneme++) {
    try {
      const j = await (await fetch('/collections/zaman-kapsulu-bileklik/products.json?limit=30', { headers: { Accept: 'application/json' } })).json();
      const v = j.products.map(p => p.variants.find(x => x.available)).filter(Boolean).slice(0, n);
      const r = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: v.map(x => ({ id: x.id, quantity: 1 })) }) });
      if (r.ok) return r.status;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 2500));
  }
  return 'basarisiz';
};
const CEKMECE_AC = async () => {
  for (let deneme = 0; deneme < 3; deneme++) {
    document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { open: true } }));
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 400));
      const cd = document.querySelector('cart-drawer');
      if (cd && cd.hasAttribute('open') && (document.querySelector('cart-drawer [data-tt-cark-sepet]') || document.querySelector('cart-drawer button[name="checkout"]') || !document.querySelector('cart-drawer cart-items ul'))) return true;
    }
  }
  return false;
};
const CEKMECE_YAZI = () => { const m = document.querySelector('[id^="MiniCart-"]'); return m ? m.innerText.replace(/\s+/g, ' ').slice(0, 2000) : null; };
const SABITLER = () => {
  const r = e => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  const gor = e => { if (!e) return false; const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return !e.hidden && c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight; };
  const adlar = { cubuk: '[data-tt-hatir]', header: 'header, .tth, [data-tth]', coupleCubuk: '.tt-sc-cubuk', carkSayac: '[data-ttn-bar]', nasil: '.tt-nc-dugme', whatsapp: '.tt-wa', urunCubuk: 'product-sticky-form > :first-child' };
  const o = {};
  for (const [ad, sel] of Object.entries(adlar)) { const e = [...document.querySelectorAll(sel)].find(gor); if (e) o[ad] = r(e); }
  const cak = [];
  if (o.cubuk) for (const [ad, b] of Object.entries(o)) {
    if (ad === 'cubuk') continue; const a = o.cubuk;
    const yat = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), dik = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (yat > 0.5 && dik > 0.5) cak.push(ad + ' (' + Math.round(dik) + 'px)');
  }
  return { ogeler: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [Math.round(v.x), Math.round(v.y), Math.round(v.w), Math.round(v.h)]])), cubukCakisma: cak };
};
async function kartiAc(page) { // sayfadaki karti kullanici gibi: kaydir, kompakt satira dokun
  await page.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => !e.closest('[data-tt-cark-pencere]') && e.getBoundingClientRect().height > 0); k.scrollIntoView({ block: 'center' }); });
  await bekle(500);
  await page.locator('[data-ttn-cark]:not([data-tt-cark-pencere] *) [data-ttn-kompakt]').first().click();
  await bekle(900);
}
async function odemeEngellendiMi(page, kap) { // "Odemeye gec" gonderimi engelleniyor mu? (gonderim burada durduruluyor)
  await page.evaluate(() => { window.__odeme = null; window.__odemeDinle = e => { window.__odeme = { engellendi: e.defaultPrevented, hedef: (e.target.getAttribute('action') || '') }; e.preventDefault(); }; window.addEventListener('submit', window.__odemeDinle); });
  const btn = page.locator(kap + ' button[name="checkout"]').first();
  const gorunur = await btn.isVisible().catch(() => false);
  if (gorunur) await btn.click().catch(() => {});
  await bekle(600);
  const r = await page.evaluate(() => { window.removeEventListener('submit', window.__odemeDinle); return window.__odeme; });
  return { dugmeGorunur: gorunur, sonuc: r };
}

// Kartin yanindan adim adim asagi gec: cubuk ilk ne zaman cikti, o an kart nerede?
async function gecisOlc(page) {
  return page.evaluate(async () => {
    const kart = [...document.querySelectorAll('[data-ttn-cark]')].find(e => !e.closest('[data-tt-cark-pencere]') && e.getBoundingClientRect().height > 0);
    const h = document.documentElement; const adimlar = [];
    for (let i = 0; i < 120; i++) {
      const kb = kart ? Math.round(kart.getBoundingClientRect().bottom) : null;
      const acik = h.classList.contains('tt-hatir-acik');
      adimlar.push({ y: Math.round(scrollY), kartAlt: kb, cubuk: acik });
      if (acik) break;
      window.scrollBy(0, 40); await new Promise(r => setTimeout(r, 90));
    }
    const ilk = adimlar.findIndex(a => a.cubuk);
    return { kartVar: !!kart, ilk: ilk >= 0 ? adimlar[ilk] : null, onceki: ilk > 0 ? adimlar[ilk - 1] : null, adimSayisi: adimlar.length,
      durum: window.ttnCarkDurum(), gecildiAnahtari: localStorage.getItem('ttnCarkGecildi'), ttnCark: localStorage.getItem('ttnCark') };
  });
}
const KOD_AYARLA = (gun) => { const t = Date.now() - gun * 864e5; localStorage.setItem('ttnCark', JSON.stringify({ d: 'kazandi', t })); localStorage.setItem('ttKod', JSON.stringify({ k: 'K7QX4M9TR', b: t + 1800000 }));
  return fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ discount: 'K7QX4M9TR' }) }).then(r => r.status); };

const URUN_C = '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik-couple';
const KART_OLC = () => {
  const k = [...document.querySelectorAll('[data-ttn-cark]')].filter(e => !e.closest('[data-tt-cark-pencere]'));
  const g = k.find(e => e.getBoundingClientRect().height > 0);
  if (!g) return { adet: k.length, gorunur: false };
  const ana = document.querySelector('main [id$="__main-product"]');
  const sar = g.closest('[data-tt-cark-urun]');
  const b = g.getBoundingClientRect();
  return { adet: k.length, gorunur: true, y: Math.round(b.top + scrollY), h: Math.round(b.height), w: Math.round(b.width), x: Math.round(b.left),
    anaUrununArdinda: !!(sar && ana && ana.nextElementSibling === sar), anaAlt: ana ? Math.round(ana.getBoundingClientRect().bottom + scrollY) : null, durumAttr: g.getAttribute('data-ttn-durum') };
};

(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const kos = async (ad, fn) => { const { ctx, page } = await baglam(br); const o = {}; S.senaryolar[ad] = o; TOPLA = []; try { await fn(page, o); } catch (e) { o.HATA = String(e.stack || e).slice(0, 600); } const son = await page.evaluate(OLAYLAR).catch(() => []); o.olaylar = TOPLA.concat(son || []); TOPLA = null; await ctx.close(); };

  // ---------- U1: urun sayfasi (single) -- kart yeri, gecince cubuk, cevir ----------
  await kos('u1_urun_single', async (page, o) => {
    o.ilk = await git(page, URUN);
    o.kart = await page.evaluate(KART_OLC);
    o.gecis = await gecisOlc(page);
    o.cubuk = await page.evaluate(OLC_CUBUK);
    o.sabitler = await page.evaluate(SABITLER);
    await kartiAc(page);
    o.acik = await page.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => !e.closest('[data-tt-cark-pencere]') && e.getBoundingClientRect().height > 0); const c = k.querySelector('[data-ttn-cevir]').getBoundingClientRect(); const t = document.elementFromPoint(Math.round(c.left + c.width / 2), Math.round(c.top + c.height / 2)); return { acik: k.hasAttribute('data-ttn-acik'), cevirEkranda: c.top >= 0 && c.bottom <= innerHeight, cevirUstundeki: t ? (k.contains(t) ? 'kendisi' : ((t.id || t.className || t.tagName) + '').slice(0, 60)) : null }; });
    await page.locator('[data-ttn-cark]:not([data-tt-cark-pencere] *) [data-ttn-cevir]').first().click(); await bekle(7000);
    o.sonra = await page.evaluate(() => ({ durum: window.ttnCarkDurum().kod, cubuk: document.documentElement.classList.contains('tt-hatir-acik'), sayac: !!document.querySelector('[data-ttn-bar]:not([hidden])'), indirimliFiyat: document.querySelectorAll('[data-tt-uf]:not([hidden])').length }));
    o.sepet = await page.evaluate(SEPET);
  });

  // ---------- U2: urun sayfasi (couple) -- kart yeri ----------
  await kos('u2_urun_couple', async (page, o) => {
    o.ilk = await git(page, URUN_C);
    o.kart = await page.evaluate(KART_OLC);
    o.gecis = await gecisOlc(page);
  });

  // ---------- U3: reklam linki ?cark=1 urun sayfasinda karta kaydiriyor mu ----------
  await kos('u3_reklam', async (page, o) => {
    await git(page, URUN + '?cark=1', 4000);
    o.konum = await page.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => !e.closest('[data-tt-cark-pencere]') && e.getBoundingClientRect().height > 0); const b = k.getBoundingClientRect(); return { scrollY: Math.round(scrollY), kartUst: Math.round(b.top), kartAlt: Math.round(b.bottom), ekranda: b.top >= 0 && b.bottom <= innerHeight }; });
  });

  // ---------- S1: suresi dolmus kupon, dogrudan /cart (kod artik kalkmali) ----------
  await kos('s1_sure_doldu_sepet', async (page, o) => {
    await git(page, '/', 1500);
    o.ekle = await page.evaluate(URUN_EKLE, 1);
    o.kodYaz = await page.evaluate(KOD_AYARLA, 2);
    o.sepetOnce = await page.evaluate(SEPET);
    o.ilk = await git(page, '/cart', 300);
    o.ilkKodYazi = await page.evaluate(() => /K7QX4M9TR/.test(document.querySelector('main-cart').innerText));
    await bekle(6000);
    o.kutu = await page.evaluate(OLC_KUTU, 'main-cart');
    o.sonKodYazi = await page.evaluate(() => /K7QX4M9TR/.test(document.querySelector('main-cart').innerText));
    o.sepetSon = await page.evaluate(SEPET);
    o.gezinme = await page.evaluate(() => performance.getEntriesByType('navigation').length);
  });

  // ---------- S2: suresi dolmus kupon, sepet cekmecesi ----------
  await kos('s2_sure_doldu_cekmece', async (page, o) => {
    await git(page, '/', 1500);
    o.ekle = await page.evaluate(URUN_EKLE, 1);
    o.kodYaz = await page.evaluate(KOD_AYARLA, 2);
    await git(page, KOL, 6000);
    await page.evaluate(CEKMECE_AC); await bekle(1500);
    o.kutu = await page.evaluate(OLC_KUTU, 'cart-drawer');
    o.cekmeceKodVar = await page.evaluate(() => /K7QX4M9TR/.test(document.querySelector('[id^="MiniCart-"]').innerText));
    o.sepetSon = await page.evaluate(SEPET);
  });

  // ---------- S3: sure SAYFA ACIKKEN doluyor (/cart) ----------
  await kos('s3_sure_sayfada_doluyor', async (page, o) => {
    await git(page, '/', 1500);
    o.ekle = await page.evaluate(URUN_EKLE, 1);
    // 30 dakikanin dolmasina ~15 sn kala kazanilmis kupon
    o.kodYaz = await page.evaluate(() => { const t = Date.now() - (30 * 60000 - 15000); localStorage.setItem('ttnCark', JSON.stringify({ d: 'kazandi', t })); localStorage.setItem('ttKod', JSON.stringify({ k: 'K7QX4M9TR', b: t + 1800000 }));
      return fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ discount: 'K7QX4M9TR' }) }).then(r => r.status); });
    o.ilk = await git(page, '/cart', 1500);
    o.once = await page.evaluate(() => ({ durum: window.ttnCarkDurum().kod, kodYazi: /K7QX4M9TR/.test(document.querySelector('main-cart').innerText), kutu: !!document.querySelector('main-cart [data-tt-cark-sepet]') && getComputedStyle(document.querySelector('main-cart [data-tt-cark-sepet]')).display !== 'none' }));
    o.sepetOnce = await page.evaluate(SEPET);
    await page.evaluate(() => { window.__isaret = 1; });
    await bekle(24000);
    o.sonra = await page.evaluate(() => ({ durum: window.ttnCarkDurum().kod, kodYazi: /K7QX4M9TR/.test(document.querySelector('main-cart').innerText), yenilenmedi: window.__isaret === 1 }));
    o.kutu = await page.evaluate(OLC_KUTU, 'main-cart');
    o.sepetSon = await page.evaluate(SEPET);
  });

  // ---------- R1: kisa regresyon -- cekmeceden cevir ----------
  await kos('r1_cekmece', async (page, o) => {
    await git(page, KOL);
    o.ekle = await page.evaluate(URUN_EKLE, 1);
    await page.evaluate(CEKMECE_AC); await bekle(1500);
    o.kutu = await page.evaluate(OLC_KUTU, 'cart-drawer');
    await page.locator('cart-drawer [data-tt-cark-sepet-ac]').click(); await bekle(1000);
    await page.locator('[data-tt-cark-pencere] [data-ttn-cevir]').click(); await bekle(9000);
    o.sonra = await page.evaluate(OLC_PENCERE);
    o.sonraKutu = await page.evaluate(OLC_KUTU, 'cart-drawer');
    o.sepetSonra = await page.evaluate(SEPET);
  });

  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
