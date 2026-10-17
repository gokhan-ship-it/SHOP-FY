// Cerez bandi testi (taslak tema, ekran goruntusu yok). Chromium; iframe ve worker istekleri dahil baglam duzeyinde dinleniyor.
const { chromium } = require('playwright');
const T = 'preview_theme_id=189140861248', B = 'https://texttonext.com';
const SINIF = [
  ['meta', /facebook\.com\/tr|facebook\.com\/privacy_sandbox|connect\.facebook\.net/],
  ['google-analytics', /google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect|stats\.g\.doubleclick\.net\/g\/collect/],
  ['google-ads', /googleadservices\.com|doubleclick\.net\/(ccm|pagead)|google\.com\/(ccm|pagead)|googleads\.g\.doubleclick/],
  ['gtag-yukleme', /googletagmanager\.com\/gtag/],
  ['tiktok', /analytics\.tiktok\.com/],
  ['trueprofit', /trueprofit/],
];
const sinif = u => (SINIF.find(([, r]) => r.test(u)) || [null])[0];
async function yeni(br) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const log = []; ctx.on('request', r => { const s = sinif(r.url()); if (s) log.push({ s, u: r.url().slice(0, 160), t: Date.now() }); });
  return { ctx, log, p: await ctx.newPage() };
}
const ozet = (log, t0, t1) => { const o = {}; log.filter(x => x.t >= t0 && (!t1 || x.t < t1)).forEach(x => { o[x.s] = (o[x.s] || 0) + 1; }); return o; };
const gaGcs = (log, t0) => [...new Set(log.filter(x => x.t >= t0 && x.s === 'google-analytics').map(x => (x.u.match(/gcs=([^&]+)/) || [])[1] || 'gcs-yok'))];
const durum = p => p.evaluate(() => { const c = window.Shopify && Shopify.customerPrivacy; const b = document.getElementById('TtCerez');
  const gor = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).visibility : 'yok'; };
  return { bant: b ? !b.hidden : 'yok', html: document.documentElement.classList.contains('tt-cerez-acik'), onay: c && c.currentVisitorConsent ? c.currentVisitorConsent() : null, analytics: c ? c.analyticsProcessingAllowed() : null, marketing: c ? c.marketingAllowed() : null, eskiBant: (() => { const e = document.getElementById('CookieBanner'); return e ? 'var' : 'yok'; })(), sohbet: gor('shopify-chat'), ncDugme: gor('.tt-nc-dugme'), carkBar: gor('.ttn-cark-bar'), stickyForm: gor('product-sticky-form') }; });
(async () => {
  const br = await chromium.launch(); const sonuc = {};
  const URUN = `${B}/products/zaman-kapsul-kolye?${T}`, KOL = `${B}/collections/zaman-kapsulu-bileklik?${T}`;
  // A) Secim yok
  { const { ctx, log, p } = await yeni(br); const t0 = Date.now();
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000);
    await p.goto(KOL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(8000);
    sonuc.A_secimYok = { durum: await durum(p), istekler: ozet(log, t0), gaGcs: gaGcs(log, t0), bolge: await p.evaluate(() => Shopify.customerPrivacy.getRegion()) }; await ctx.close(); }
  // B) Kabul
  { const { ctx, log, p } = await yeni(br);
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(6000);
    const once = ozet(log, 0); await p.click('[data-tt-cerez-kabul]'); await p.waitForTimeout(2000); const d1 = await durum(p); const t1 = Date.now();
    await p.goto(KOL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000);
    sonuc.B_kabul = { tiklamadanOnce: once, tiklamaSonrasiDurum: d1, sonrakiSayfaDurum: await durum(p), sonrakiSayfaIstekler: ozet(log, t1), gaGcs: gaGcs(log, t1) }; await ctx.close(); }
  // C) Ret
  { const { ctx, log, p } = await yeni(br);
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(6000);
    const once = ozet(log, 0); await p.click('[data-tt-cerez-ret]'); await p.waitForTimeout(2000); const d1 = await durum(p); const t1 = Date.now();
    await p.goto(KOL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000);
    sonuc.C_ret = { tiklamadanOnce: once, tiklamaSonrasiDurum: d1, sonrakiSayfaDurum: await durum(p), sonrakiSayfaIstekler: ozet(log, t1), gaGcs: gaGcs(log, t1), ornek: log.filter(x => x.t >= t1).slice(0, 6).map(x => x.u) }; await ctx.close(); }
  // D) Klavye + tercih penceresi + footer + politika linki
  { const { ctx, p } = await yeni(br); const r = {};
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(5000);
    await p.focus('[data-tt-cerez-ac].ttc-yonet'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    r.pencereAcik = await p.evaluate(() => document.getElementById('TtCerezPencere').open);
    r.odak1 = await p.evaluate(() => document.activeElement && (document.activeElement.getAttribute('aria-label') || document.activeElement.className));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    r.escSonrasiAcik = await p.evaluate(() => document.getElementById('TtCerezPencere').open);
    r.escSonrasiOdak = await p.evaluate(() => document.activeElement && document.activeElement.className);
    await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    for (let i = 0; i < 6; i++) { const k = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-tt-cerez-kat')); if (k === 'analytics') break; await p.keyboard.press('Tab'); }
    r.analitikteOdak = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-tt-cerez-kat'));
    await p.keyboard.press('Space'); r.analitikSecili = await p.evaluate(() => document.querySelector('[data-tt-cerez-kat="analytics"]').checked);
    r.zorunluKilitli = await p.evaluate(() => { const z = document.querySelector('[data-tt-cerez-kat="zorunlu"]'); return z.checked && z.disabled; });
    await p.click('[data-tt-cerez-kaydet]'); await p.waitForTimeout(1500);
    r.kayitSonrasi = await durum(p); r.kayitSonrasiPencere = await p.evaluate(() => document.getElementById('TtCerezPencere').open);
    await p.evaluate(() => document.querySelector('.ttf-cerez') && document.querySelector('.ttf-cerez').scrollIntoView());
    r.footerLinkVar = await p.evaluate(() => !!document.querySelector('.tt-footer-yasal [data-tt-cerez-ac]'));
    await p.click('.tt-footer-yasal [data-tt-cerez-ac]'); await p.waitForTimeout(500);
    r.footerdenAcildi = await p.evaluate(() => document.getElementById('TtCerezPencere').open);
    r.footerdenAcilincaSecimler = await p.evaluate(() => [...document.querySelectorAll('[data-tt-cerez-kat]')].map(k => k.getAttribute('data-tt-cerez-kat') + ':' + k.checked).join(' '));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.goto(`${B}/pages/cerez-politikasi?${T}`, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(3000);
    r.politikaLinki = await p.evaluate(() => { const b = document.querySelector('#MainContent .rte .ttc-politika-link'); return b ? b.innerText + ' ' + Math.round(b.getBoundingClientRect().height) + 'px' : 'yok'; });
    if (r.politikaLinki !== 'yok') { await p.click('#MainContent .rte .ttc-politika-link'); await p.waitForTimeout(400); r.politikadanAcildi = await p.evaluate(() => document.getElementById('TtCerezPencere').open); }
    sonuc.D_klavye = r; await ctx.close(); }
  // E) Olculer (telefon ve masaustu)
  for (const [ad, vp] of [['telefon', { width: 390, height: 844 }], ['masaustu', { width: 1440, height: 900 }]]) {
    const ctx = await br.newContext({ viewport: vp }); const p = await ctx.newPage();
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(4000);
    sonuc['E_' + ad] = await p.evaluate(() => { const b = document.getElementById('TtCerez'); const r = b.getBoundingClientRect(); const k = document.querySelector('.ttc-kabul').getBoundingClientRect(), rr = document.querySelector('.ttc-ret').getBoundingClientRect(), y = document.querySelector('.ttc-yonet').getBoundingClientRect();
      return { kart: [Math.round(r.left), Math.round(innerWidth - r.right), Math.round(innerHeight - r.bottom), Math.round(r.width)], zemin: getComputedStyle(b).backgroundColor, metin: document.querySelector('.ttc-metin').innerText, link: (() => { const a = b.querySelector('a'); return a ? a.getAttribute('href') + ' ' + getComputedStyle(a).color + ' ' + getComputedStyle(a).textDecorationLine : null; })(), kabul: [Math.round(k.width), Math.round(k.height), getComputedStyle(document.querySelector('.ttc-kabul')).backgroundColor], ret: [Math.round(rr.width), Math.round(rr.height), getComputedStyle(document.querySelector('.ttc-ret')).backgroundColor], yanYana: Math.abs(k.top - rr.top) < 1, yonet: [Math.round(y.height), getComputedStyle(document.querySelector('.ttc-yonet')).color] }; });
    await ctx.close(); }
  console.log(JSON.stringify(sonuc, null, 1)); await br.close();
})();
