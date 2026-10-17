// Turkiye ziyaretcisi senaryosu. Sunucu bolgeyi IP'den belirliyor (konteyner IP'si ABD).
// Taklit: tarayicida (Playwright route) yalnizca Shopify'in bolge bilgisini tasiyan iki yeri TR'ye ceviriyoruz:
//  1) Sayfa yanitlarindaki Server-Timing basligi: _cmp;desc="3<onay>.<izinliAmaclar>_<BOLGE>_<bantGoster>_<satisBolgesi>_<id>"
//     ve country;desc="US". Onay harfleri sunucudan geldigi gibi kalir; bolge TR, bant t, izinli amaclar yalnizca kabul edilen onaylar.
//  2) setTrackingConsent'in cagirdigi /api/unstable/graphql.json consentManagement yanitindaki trackingConsentCookie (ayni bicim).
// Baska hicbir istek degistirilmiyor; pikseller, tema ve Shopify betikleri gercek.
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
const donusum = []; let sayac429 = 0, graphqlDonusum = 0;
function trCevir(v) {
  if (!v) return v; let s = v; try { if (s[0] === '%') s = decodeURIComponent(s); } catch (e) {}
  if (s[0] !== '3') return v;
  const p = s.slice(1).split('_'); const [onay = ''] = p[0].split('.');
  const amac = ['A', 'M', 'P', 'S'].filter(h => onay.includes(h)).join('');
  p[0] = onay + '.' + amac; p[1] = 'TR'; p[2] = 't'; p[3] = 'f';
  const y = '3' + p.join('_'); donusum.push(s.split('_').slice(0, 4).join('_') + ' -> ' + y.split('_').slice(0, 4).join('_')); return y;
}
async function yeni(br, vp) {
  const ctx = await br.newContext(vp ? { viewport: vp } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  // Onizleme cubugu yalnizca tema onizlemesinde var (gercek ziyaretcide yok); tiklamalari ortmesin.
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#PBarNextFrameWrapper,#PBarNextFrame{display:none!important}'; document.head.appendChild(st); }); });
  const p0 = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p0);
  await cdp.send('Fetch.enable', { patterns: [
    { urlPattern: 'https://texttonext.com/*', resourceType: 'Document', requestStage: 'Response' },
    { urlPattern: '*/api/unstable/graphql.json*', requestStage: 'Response' } ] });
  cdp.on('Fetch.requestPaused', async ev => {
    try {
      const hs = ev.responseHeaders || [];
      if (ev.resourceType === 'Document') {
        let degisti = false;
        const yeniH = hs.map(h => { if (h.name.toLowerCase() !== 'server-timing') return h; degisti = true;
          return { name: h.name, value: h.value.replace(/_cmp;desc="([^"]*)"/, (m, d) => '_cmp;desc="' + trCevir(d) + '"').replace(/country;desc="[A-Z]+"/, 'country;desc="TR"') }; });
        if (ev.responseStatusCode === 429) sayac429++;
        return await cdp.send('Fetch.continueResponse', degisti ? { requestId: ev.requestId, responseCode: ev.responseStatusCode, responseHeaders: yeniH } : { requestId: ev.requestId });
      }
      if ((ev.request.postData || '').includes('consentManagement')) {
        const g = await cdp.send('Fetch.getResponseBody', { requestId: ev.requestId });
        let b = g.base64Encoded ? Buffer.from(g.body, 'base64').toString('utf8') : g.body;
        try { const j = JSON.parse(b); const c = j.data.consentManagement.cookies; c.trackingConsentCookie = trCevir(c.trackingConsentCookie); b = JSON.stringify(j); graphqlDonusum++; } catch (e) {}
        const h2 = hs.filter(h => !/^(content-encoding|content-length)$/i.test(h.name));
        return await cdp.send('Fetch.fulfillRequest', { requestId: ev.requestId, responseCode: ev.responseStatusCode, responseHeaders: h2, body: Buffer.from(b, 'utf8').toString('base64') });
      }
      await cdp.send('Fetch.continueResponse', { requestId: ev.requestId });
    } catch (e) { try { await cdp.send('Fetch.continueResponse', { requestId: ev.requestId }); } catch (e2) {} }
  });
  const log = []; ctx.on('request', r => { const s = sinif(r.url()); if (s) log.push({ s, u: r.url().slice(0, 200), t: Date.now() }); });
  return { ctx, log, p: p0 };
}
const ozet = (log, t0, t1) => { const o = {}; log.filter(x => x.t >= t0 && (!t1 || x.t < t1)).forEach(x => { o[x.s] = (o[x.s] || 0) + 1; }); return o; };
const gaGcs = (log, t0, t1) => [...new Set(log.filter(x => x.t >= t0 && (!t1 || x.t < t1) && x.s === 'google-analytics').map(x => (x.u.match(/gcs=([^&]+)/) || [])[1] || 'gcs-yok'))];
const durum = p => p.evaluate(() => { const tema = window.Shopify && Shopify.theme && Shopify.theme.id; const c = window.Shopify && Shopify.customerPrivacy; const b = document.getElementById('TtCerez');
  const gor = s => { const e = document.querySelector(s); if (!e) return 'yok'; const st = getComputedStyle(e); return st.display === 'none' ? 'display:none' : st.visibility; };
  const nav = performance.getEntriesByType('navigation')[0]; const cmp = nav && nav.serverTiming ? (nav.serverTiming.find(x => x.name === '_cmp') || {}).description : null;
  return { tema, bant: b ? !b.hidden : 'yok', html: document.documentElement.classList.contains('tt-cerez-acik'), bolge: c && c.getRegion ? c.getRegion() : null, shouldShowBanner: c && c.shouldShowBanner ? c.shouldShowBanner() : null, cmp: cmp ? cmp.split('_').slice(0, 4).join('_') : cmp,
    onay: c && c.currentVisitorConsent ? c.currentVisitorConsent() : null, analytics: c ? c.analyticsProcessingAllowed() : null, marketing: c ? c.marketingAllowed() : null,
    shopifyBandi: gor('#shopify-pc__banner'), sohbet: gor('shopify-chat'), ncDugme: gor('.tt-nc-dugme'), carkBar: gor('.ttn-cark-bar'), stickyForm: gor('product-sticky-form') }; });
(async () => {
  const br = await chromium.launch(); const sonuc = {}; const yaz = o => require('fs').writeFileSync(__dirname + '/test-tr-sonuc.json', JSON.stringify(o, null, 1));
  const URUN = `${B}/products/zaman-kapsul-kolye?${T}`, KOL = `${B}/collections/zaman-kapsulu-bileklik?${T}`;
  // A) Secim yok: iki sayfa
  { const { ctx, log, p } = await yeni(br); const t0 = Date.now();
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000); const d1 = await durum(p);
    await p.goto(KOL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000);
    sonuc.A_secimYok = { urunSayfasi: d1, koleksiyonSayfasi: await durum(p), istekler: ozet(log, t0), gaGcs: gaGcs(log, t0), ornek: log.slice(0, 8).map(x => x.u) }; await ctx.close(); }
  yaz(sonuc);
  await new Promise(z => setTimeout(z, 20000));
  // B) Kabul
  { const { ctx, log, p } = await yeni(br);
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(8000);
    const once = ozet(log, 0); const tk = Date.now(); await p.click('[data-tt-cerez-kabul]'); await p.waitForTimeout(8000); const d1 = await durum(p); const t1 = Date.now();
    await p.goto(KOL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000);
    sonuc.B_kabul = { secimdenOnce: once, tiklamadanSonraAyniSayfa: ozet(log, tk, t1), tiklamaSonrasiDurum: d1, sonrakiSayfaDurum: await durum(p), sonrakiSayfaIstekler: ozet(log, t1), gaGcs: gaGcs(log, tk) }; await ctx.close(); }
  yaz(sonuc);
  await new Promise(z => setTimeout(z, 20000));
  // C) Ret
  { const { ctx, log, p } = await yeni(br);
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(8000);
    const once = ozet(log, 0); const tk = Date.now(); await p.click('[data-tt-cerez-ret]'); await p.waitForTimeout(8000); const d1 = await durum(p); const t1 = Date.now();
    await p.goto(KOL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000);
    sonuc.C_ret = { secimdenOnce: once, tiklamadanSonraAyniSayfa: ozet(log, tk, t1), tiklamaSonrasiDurum: d1, sonrakiSayfaDurum: await durum(p), sonrakiSayfaIstekler: ozet(log, t1), gaGcs: gaGcs(log, tk), ornek: log.filter(x => x.t >= tk).slice(0, 6).map(x => x.u) }; await ctx.close(); }
  yaz(sonuc);
  await new Promise(z => setTimeout(z, 20000));
  // D) Yalnizca analitik (tercih penceresi)
  { const { ctx, log, p } = await yeni(br);
    await p.goto(URUN, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(6000);
    await p.click('.ttc-yonet'); await p.waitForTimeout(500); await p.check('[data-tt-cerez-kat="analytics"]'); const tk = Date.now(); await p.click('[data-tt-cerez-kaydet]'); await p.waitForTimeout(3000); const t1 = Date.now();
    await p.goto(KOL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000);
    sonuc.D_yalnizAnalitik = { sonrakiSayfaDurum: await durum(p), sonrakiSayfaIstekler: ozet(log, t1), gaGcs: gaGcs(log, t1) }; await ctx.close(); }
  yaz(sonuc);
  await new Promise(z => setTimeout(z, 20000));
  // E) Masaustu: secim yok
  { const { ctx, log, p } = await yeni(br, { width: 1440, height: 900 });
    await p.goto(KOL, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(10000);
    sonuc.E_masaustuSecimYok = { durum: await durum(p), istekler: ozet(log, 0) }; await ctx.close(); }
  sonuc.yanit429 = sayac429; sonuc.graphqlDonusum = graphqlDonusum; sonuc.donusumOrnekleri = [...new Set(donusum)].slice(0, 12);
  require('fs').writeFileSync(__dirname + '/test-tr-sonuc.json', JSON.stringify(sonuc, null, 1)); console.log('bitti'); await br.close();
})().catch(e => { require('fs').writeFileSync(__dirname + '/test-tr-hata.txt', String(e && e.stack || e)); process.exit(1); });
