// ACIL teshis: yayindaki vitrinde sayac/piksel istekleri. Salt okuma; magazaya bir sey yazilmaz.
// Turkiye ziyaretcisi emulasyonu (CDP: yalnizca bu tarayicida Server-Timing _cmp bolgesi -> TR).
// 2 cihaz x 2 izin durumu (secim yok / kabul) x 6 sayfa.
const { chromium } = require('playwright');
const fs = require('fs');
const B = 'https://texttonext.com';
const SAYFALAR = [
  '/',
  '/collections/zaman-kapsulu-bileklik',
  '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik',
  '/pages/couplezamankapsulleri',
  '/pages/couple-daha-fazla-bilgi-al',
  '/pages/kullanim-kilavuzu?_ab=0&key=1767609525998',
];
const CIHAZ = {
  masaustu: { viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
  iphone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
};
function bolgeTR(v) { let s = v; try { if (s[0] === '%') s = decodeURIComponent(s); } catch (e) {} if (s[0] !== '3') return v; const p = s.slice(1).split('_'); p[1] = 'TR'; return '3' + p.join('_'); }
function tur(url) {
  if (/\/\.well-known\/shopify\/monorail|monorail-edge\.shopifysvc\.com/.test(url)) return 'monorail';
  if (/web-pixels-manager|\/wpm@|\/web-pixel-/.test(url)) return 'wpm';
  if (/facebook\.com\/tr/.test(url)) return 'meta';
  if (/connect\.facebook\.net/.test(url)) return 'meta-js';
  if (/google-analytics\.com\/g\/collect|analytics\.google\.com\/g\/collect/.test(url)) return 'ga';
  if (/googletagmanager\.com\/gtag/.test(url)) return 'gtag-js';
  if (/analytics\.tiktok\.com\/api/.test(url)) return 'tiktok';
  if (/analytics\.tiktok\.com\/i18n\/pixel/.test(url)) return 'tiktok-js';
  if (/gempages|gemcommerce|01a13da1/.test(url)) return 'gempages';
  return null;
}
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch();
  const sonuc = [];
  for (const cihaz of Object.keys(CIHAZ)) for (const izin of ['secim-yok', 'kabul']) {
    const ctx = await br.newContext(CIHAZ[cihaz]);
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: 'https://texttonext.com/*', resourceType: 'Document', requestStage: 'Response' }] });
    cdp.on('Fetch.requestPaused', async ev => { try { let d = false; const y = (ev.responseHeaders || []).map(h => { if (h.name.toLowerCase() !== 'server-timing') return h; d = true; return { name: h.name, value: h.value.replace(/_cmp;desc="([^"]*)"/, (m, x) => '_cmp;desc="' + bolgeTR(x) + '"').replace(/country;desc="[A-Z]+"/, 'country;desc="TR"') }; });
      await cdp.send('Fetch.continueResponse', d ? { requestId: ev.requestId, responseCode: ev.responseStatusCode, responseHeaders: y } : { requestId: ev.requestId }); } catch (e) { try { await cdp.send('Fetch.continueResponse', { requestId: ev.requestId }); } catch (e2) {} } });
    const log = [];
    const reqMeta = new Map();
    ctx.on('request', r => {
      const url = r.url(); const t = tur(url); if (!t) return;
      let pd = ''; try { pd = r.postData() || ''; } catch (e) {}
      let olay = [];
      if (t === 'monorail') { olay = (pd.match(/"event_name"\s*:\s*"([a-z_]+)"/g) || []).map(x => x.split('"')[3]); (pd.match(/"schema_id"\s*:\s*"([^"]+)"/g) || []).forEach(x => olay.push('schema:' + x.split('"')[3].split('/')[0])); }
      else if (t === 'meta') { let ev = null; try { ev = new URL(url).searchParams.get('ev'); } catch (e) {} olay = [ev || (pd.match(/name="ev"\r?\n\r?\n([^\r\n]+)/) || [])[1] || (pd.match(/(?:^|&)ev=([^&]+)/) || [])[1] || '?']; }
      else if (t === 'ga') { const m = url.match(/[?&]en=([^&]+)/); const m2 = pd.match(/(?:^|&|\n)en=([^&\n]+)/g) || []; olay = [m ? m[1] : null].concat(m2.map(x => x.split('en=')[1])).filter(Boolean); if (!olay.length) olay = ['hit']; }
      else if (t === 'tiktok') { olay = [(pd.match(/"event"\s*:\s*"([^"]+)"/) || [0, 'istek'])[1]]; }
      const k = { t: Date.now(), tur: t, url: url.split('?')[0].slice(0, 110), olay, durum: null };
      log.push(k); reqMeta.set(r, k);
    });
    ctx.on('requestfinished', async r => { const k = reqMeta.get(r); if (!k) return; try { const res = await r.response(); k.durum = res ? res.status() : 'yanit-yok'; } catch (e) { k.durum = 'hata'; } });
    ctx.on('requestfailed', r => { const k = reqMeta.get(r); if (k) k.durum = 'BASARISIZ ' + ((r.failure() || {}).errorText || ''); });
    const hatalar = [];
    p.on('pageerror', e => hatalar.push({ t: Date.now(), m: 'pageerror: ' + String(e.message || e).slice(0, 200) }));
    p.on('console', m => { if (m.type() === 'error') hatalar.push({ t: Date.now(), m: 'console: ' + m.text().slice(0, 200) }); });
    const durum = () => p.evaluate(() => { const c = window.Shopify && Shopify.customerPrivacy; const vis = s => { const e = document.querySelector(s); if (!e) return 'yok'; const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden || b.height === 0) ? 'gizli' : 'GORUNUR'; };
      return { tema: window.Shopify && Shopify.theme && (Shopify.theme.id + ' ' + Shopify.theme.name + ' ' + Shopify.theme.role), bolge: c && c.getRegion && c.getRegion(), bantGerekli: c && c.shouldShowBanner && c.shouldShowBanner(), analitik: c && c.analyticsProcessingAllowed && c.analyticsProcessingAllowed(), pazarlama: c && c.marketingAllowed && c.marketingAllowed(), shopifyBandi: vis('#shopify-pc__banner'), cfhSayisi: document.querySelectorAll('script#shopify-features, script[id^="web-pixels-manager-setup"], #web-pixels-manager-setup').length,
        sablon: document.body && document.body.className.split(' ')[0], liquidHata: /Liquid error|Could not find asset/i.test(document.documentElement.innerHTML), gp: document.querySelectorAll('[class*="gp-"], [id^="gp-"], link[href*="gempages"], script[src*="gempages"]').length }; }).catch(e => ({ hata: String(e).slice(0, 120) }));
    let kabulYapildi = null;
    for (const yol of SAYFALAR) {
      const t0 = Date.now();
      let zincir = [], nav = null;
      try {
        const res = await p.goto(B + yol, { waitUntil: 'load', timeout: 90000 });
        let q = res && res.request(); const z = [];
        while (q) { const rr = await q.response().catch(() => null); z.unshift((rr ? rr.status() : '?') + ' ' + q.url().replace(B, '')); q = q.redirectedFrom(); }
        zincir = z; nav = res ? res.status() : null;
      } catch (e) { nav = 'HATA ' + String(e).split('\n')[0].slice(0, 120); }
      await bekle(2500);
      if (izin === 'kabul' && kabulYapildi === null) {
        kabulYapildi = await p.evaluate(async () => {
          const b = document.querySelector('#shopify-pc__banner__btn-accept');
          if (b && b.offsetParent) { b.click(); return 'bant-kabul'; }
          const c = window.Shopify && Shopify.customerPrivacy; if (!c || !c.setTrackingConsent) return 'api-yok';
          return await new Promise(res => c.setTrackingConsent({ analytics: true, marketing: true, preferences: true, sale_of_data: true }, () => res('api-kabul')));
        }).catch(e => 'hata ' + String(e).slice(0, 80));
        await bekle(3000);
      }
      await bekle(7000);
      const d = await durum();
      const t1 = Date.now();
      const pencere = log.filter(x => x.t >= t0 && x.t < t1);
      const ozet = {};
      pencere.forEach(x => { const k = x.tur; ozet[k] = ozet[k] || { istek: 0, durumlar: {}, olaylar: {} }; ozet[k].istek++; ozet[k].durumlar[x.durum] = (ozet[k].durumlar[x.durum] || 0) + 1; x.olay.forEach(o => { ozet[k].olaylar[o] = (ozet[k].olaylar[o] || 0) + 1; }); });
      const ilk = (tr, ad) => { const x = pencere.find(z => z.tur === tr && (!ad || z.olay.includes(ad))); return x ? ((x.t - t0) / 1000).toFixed(1) + 's ' + x.durum + ' ' + x.url : 'GITMEDI'; };
      sonuc.push({ cihaz, izin, yol, nav, zincir, kabul: kabulYapildi, durum: d,
        pageViewed: ilk('monorail', 'page_viewed'), monorailIlk: ilk('monorail'), wpm: ilk('wpm'), metaPageView: ilk('meta', 'PageView'), gaPageView: ilk('ga', 'page_view'), tiktok: ilk('tiktok'), gempagesIstek: pencere.filter(x => x.tur === 'gempages').length,
        ozet, hatalar: hatalar.filter(h => h.t >= t0 && h.t < t1).map(h => ((h.t - t0) / 1000).toFixed(1) + 's ' + h.m) });
      console.log(cihaz, izin, yol, nav, 'pv:', sonuc[sonuc.length - 1].pageViewed.split(' ')[0], 'meta:', sonuc[sonuc.length - 1].metaPageView.split(' ')[0]);
      await bekle(2000);
    }
    await ctx.close();
  }
  fs.writeFileSync(__dirname + '/izleme-sonuc.json', JSON.stringify(sonuc, null, 1));
  console.log('bitti'); await br.close();
})().catch(e => { fs.writeFileSync(__dirname + '/izleme-hata.txt', String(e && e.stack || e)); console.log('HATA', e); process.exit(1); });
