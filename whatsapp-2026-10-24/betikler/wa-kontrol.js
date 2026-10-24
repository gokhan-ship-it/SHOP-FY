// "Bize ulasin" WhatsApp butonu kontrolleri (kopya tema onizlemesi). Ekran goruntusu YOK.
// Takip beacon'lari yakalanip IPTAL edilir (gercek veri gitmez); wa.me istekleri de iptal.
// Kullanim: node wa-kontrol.js <tema_id> <cikis.json>
const { chromium } = require('playwright');
const fs = require('fs');
const TID = process.argv[2], OUT = process.argv[3];
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics\.com|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail-edge|\/\.well-known\/shopify\/monorail|trueprofit/;
const GURULTU = [/net::ERR_FAILED/, /^pageerror: Failed to fetch/, /Error producing monorail event/, /Refused to frame 'https:\/\/shop\.app/, /status of 403/, /error-analytics-sessions-production/, /\[bugsnag\]/, /net::ERR_BLOCKED_BY_CLIENT/];
const URUN = '/products/auron-zaman-kapsulu-bileklik';
const bekle = ms => new Promise(r => setTimeout(r, ms));

async function ac(br, w, h, ek) {
  const m = w < 768;
  const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 3 : 1, locale: 'tr-TR',
    userAgent: m ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
                 : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  if (ek) await ctx.addInitScript(ek);
  const kayit = { meta: [], ga: [], wa: [], chatjs: [] };
  await ctx.route('**/*', r => {
    const q = r.request(), u = q.url(), b = q.postData() || '';
    if (/wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com/.test(u)) { kayit.wa.push(u); return r.abort(); }
    if (/storefront\/web-components\/chat\.js|shopify-chat|\/inbox\//.test(u)) kayit.chatjs.push(u);
    if (!BEACON.test(u)) return r.continue();
    if (/facebook\.com\/tr/.test(u)) {
      const x = new URL(u);
      kayit.meta.push(x.searchParams.get('ev') || (b.match(/name="ev"\r?\n\r?\n([^\r\n]+)/) || b.match(/(?:^|&)ev=([^&]+)/) || [])[1] || '?');
    } else if (/collect/.test(u)) { const en = new URL(u).searchParams.get('en'); if (en) kayit.ga.push(en); (b.match(/en=([a-z_]+)/g) || []).forEach(x => kayit.ga.push(x.slice(3))); }
    return r.abort();
  });
  const p = await ctx.newPage();
  const konsol = [];
  p.on('console', x => { if (x.type() === 'error') konsol.push(x.text().slice(0, 160)); });
  p.on('pageerror', e => konsol.push('pageerror: ' + String(e.message).slice(0, 160)));
  return { ctx, p, kayit, konsol };
}
async function git(p, yol) {
  for (let d = 0; d < 3; d++) {
    await p.goto('https://texttonext.com' + yol + (yol.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
    await bekle(5000);
    if (await p.evaluate(() => !!(window.Shopify && Shopify.theme))) break;
    await bekle(15000);
  }
  // Onizleme cubugu yalnizca onizlemede var; alttaki ogeleri ortmesin
  await p.evaluate(() => { const e = document.getElementById('PBarNextFrameWrapper'); if (e) e.style.setProperty('display', 'none', 'important'); });
}
const olc = p => p.evaluate(() => {
  const R = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), sag: Math.round(b.right), alt: Math.round(b.bottom) }; };
  const gor = el => { if (!el) return false; const c = getComputedStyle(el); const b = el.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.01 && b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight; };
  const o = { vw: innerWidth, vh: innerHeight, scrollY: Math.round(scrollY), yigin: getComputedStyle(document.documentElement).getPropertyValue('--tt-alt-yigin').trim() || '0', ayVar: document.documentElement.classList.contains('tt-ay-var') };
  const a = document.querySelector('a.tt-wa');
  o.inbox = { shopifyChat: document.querySelectorAll('shopify-chat').length, embedVeri: document.querySelectorAll('#shopify-chat-app-embed-data, #shopify-chat-page-data').length };
  if (!a) { o.wa = null; return o; }
  const c = getComputedStyle(a), y = a.querySelector('.tt-wa-yazi'), s = a.querySelector('svg');
  const lh = parseFloat(getComputedStyle(y).lineHeight) || 15;
  let metin = null; try { metin = new URL(a.href).searchParams.get('text'); } catch (e) {}
  o.wa = { gorunur: gor(a), r: R(a), yazi: y.textContent, yaziSatir: Math.round(y.getBoundingClientRect().height / lh), zemin: c.backgroundColor, renk: c.color, kose: c.borderRadius,
    yukseklik: c.height, icSol: c.paddingLeft, icSag: c.paddingRight, aralik: c.columnGap || c.gap, font: c.fontFamily.split(',')[0].replace(/"/g, ''), kalinlik: c.fontWeight, boyut: c.fontSize,
    golge: c.boxShadow, logo: s ? Math.round(s.getBoundingClientRect().width) + 'x' + Math.round(s.getBoundingClientRect().height) + ' ' + s.querySelector('path').getAttribute('fill') : null,
    aria: a.getAttribute('aria-label'), target: a.target, rel: a.rel, href: a.getAttribute('href'), mesaj: metin, zIndex: c.zIndex };
  const nc = document.querySelector('.tt-nc-dugme');
  o.nc = gor(nc) ? R(nc) : null;
  const bar = [];
  document.querySelectorAll('.tt-sc-cubuk').forEach(e => { if (!e.hidden && !e.hasAttribute('data-sc-gizli') && gor(e)) bar.push(['Sepete ekle (Couple)', R(e)]); });
  const k = document.querySelector('product-sticky-form > :first-child');
  if (k && gor(k)) bar.push(['Urun yapiskan sepete ekle', R(k)]);
  const cb = document.querySelector('.ttn-cark-bar');
  if (cb && !cb.hidden && !cb.hasAttribute('data-ttn-ortulu') && gor(cb)) bar.push(['Cark sayaci', R(cb)]);
  o.cubuklar = bar.map(([ad, r]) => ({ ad, r, waAltiylaBosluk: o.wa.gorunur ? r.y - o.wa.r.alt : null }));
  if (o.nc && o.wa.gorunur) {
    const dikeyKesisir = o.nc.alt > o.wa.r.y && o.nc.y < o.wa.r.alt;
    o.ncYatayBosluk = dikeyKesisir ? o.wa.r.x - o.nc.sag : 'ayni satirda degil';
    o.ncAltHizasi = o.wa.r.alt - o.nc.alt;
  }
  // WA'nin ortasinda en ustte ne var (ustune binen bir sey var mi)
  if (o.wa.gorunur) { const el = document.elementFromPoint(o.wa.r.x + o.wa.r.w / 2, o.wa.r.y + o.wa.r.h / 2); o.waUstundeki = el && a.contains(el) ? 'kendisi' : (el ? el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] : null); }
  const h1 = document.querySelector('.product__title :is(h1,h2), h1.product__title, main h1');
  o.h1 = h1 ? h1.innerText.trim().replace(/\s+/g, ' ') : null;
  return o;
});
const sorunlu = r => {
  const s = [];
  if (!r.wa) return ['buton yok'];
  if (!r.wa.gorunur) s.push('gorunmuyor');
  if (r.wa.yaziSatir !== 1) s.push('yazi tek satir degil');
  if (typeof r.ncYatayBosluk === 'number' && r.ncYatayBosluk < 12) s.push('Nasil calisir? ile bosluk ' + r.ncYatayBosluk);
  r.cubuklar.forEach(c => { if (c.waAltiylaBosluk !== null && c.waAltiylaBosluk < 12) s.push(c.ad + ' ile bosluk ' + c.waAltiylaBosluk); });
  if (r.waUstundeki && r.waUstundeki !== 'kendisi') s.push('ustunde: ' + r.waUstundeki);
  if (r.inbox.shopifyChat || r.inbox.embedVeri) s.push('Inbox yuklu');
  return s;
};

(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { tema: TID, zaman: new Date().toISOString(), senaryolar: [], tiklama: {}, iletisim: {}, katman: {} };
  const ekle = (ad, w, r, k, kons) => { S.senaryolar.push({ ad, w, sorun: sorunlu(r), olcum: r, chatjs: k.chatjs.length, konsolYeni: [...new Set(kons.filter(t => !GURULTU.some(g => g.test(t))))] }); };
  const CARK = () => { try { localStorage.setItem('ttnCark', JSON.stringify({ d: 'kazandi', t: Date.now() })); } catch (e) {} };

  for (const [w, h] of [[390, 844], [360, 780], [1440, 900]]) {
    // 1) Ana sayfa: acilis, orta, en alt
    { const o = await ac(br, w, h); await git(o.p, '/');
      ekle('Ana sayfa - acilis', w, await olc(o.p), o.kayit, o.konsol);
      await o.p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2)); await bekle(1500);
      ekle('Ana sayfa - orta', w, await olc(o.p), o.kayit, o.konsol);
      await o.p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await bekle(2000);
      await o.p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await bekle(1000);
      const r = await olc(o.p);
      r.footerLink = await o.p.evaluate(() => { const a = document.querySelector('.tt-footer-satir a'); if (!a) return null; const b = a.getBoundingClientRect(); const pt = f => { const el = document.elementFromPoint(b.left + b.width * f, b.top + b.height / 2); return a.contains(el) ? 'link' : (el ? el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] : null); }; return [pt(0.05), pt(0.5), pt(0.97)]; });
      ekle('Ana sayfa - en alt', w, r, o.kayit, o.konsol); await o.ctx.close(); }
    // 2) Urun sayfasi: acilis + asagi kaydirinca (yapiskan cubuk)
    { const o = await ac(br, w, h); await git(o.p, URUN);
      ekle('Urun - acilis', w, await olc(o.p), o.kayit, o.konsol);
      await o.p.evaluate(() => window.scrollTo(0, 1600)); await bekle(2500);
      ekle('Urun - asagi kaydirinca', w, await olc(o.p), o.kayit, o.konsol); await o.ctx.close(); }
    // 3) Urun Couple gorunumu
    { const o = await ac(br, w, h); await git(o.p, URUN + '?view=couple');
      ekle('Urun - Couple gorunumu', w, await olc(o.p), o.kayit, o.konsol); await o.ctx.close(); }
    // 4) Couple modu: set kutusuna gelince
    { const o = await ac(br, w, h); await git(o.p, '/collections/couple-urunler');
      await o.p.evaluate(() => { const k = document.querySelector('[data-sc-set]'); if (k) window.scrollTo(0, k.getBoundingClientRect().top + scrollY - innerHeight * 0.5); }); await bekle(2500);
      ekle('Couple modu - set kutusunda', w, await olc(o.p), o.kayit, o.konsol);
      await o.p.evaluate(() => window.scrollBy(0, 900)); await bekle(2000);
      ekle('Couple modu - izgarada', w, await olc(o.p), o.kayit, o.konsol); await o.ctx.close(); }
    // 5) Cark cevrilmis (kazandi durumu): ana sayfa + urun sayfasi asagi
    { const o = await ac(br, w, h, CARK); await git(o.p, '/');
      await o.p.evaluate(() => window.scrollTo(0, 600)); await bekle(2500);
      ekle('Cark cevrilmis - ana sayfa', w, await olc(o.p), o.kayit, o.konsol);
      await git(o.p, URUN); await o.p.evaluate(() => window.scrollTo(0, 1600)); await bekle(2500);
      ekle('Cark cevrilmis - urun asagi', w, await olc(o.p), o.kayit, o.konsol);
      await git(o.p, '/collections/couple-urunler');
      await o.p.evaluate(() => { const k = document.querySelector('[data-sc-set]'); if (k) window.scrollTo(0, k.getBoundingClientRect().top + scrollY - innerHeight * 0.5); }); await bekle(2500);
      ekle('Cark cevrilmis - Couple set kutusu', w, await olc(o.p), o.kayit, o.konsol); await o.ctx.close(); }
    // 6) Kullanim kilavuzu + iletisim + koleksiyon
    for (const yol of ['/pages/kullanim-kilavuzu', '/pages/iletisim', '/collections/all']) {
      const o = await ac(br, w, h); await git(o.p, yol);
      ekle('Sayfa ' + yol, w, await olc(o.p), o.kayit, o.konsol); await o.ctx.close();
    }
  }

  // 7) Tiklama olcumu (390, urun sayfasi + iletisim karti)
  for (const [yol, sec, ad] of [[URUN, 'a.tt-wa', 'urun yuzen buton'], ['/pages/kullanim-kilavuzu', 'a.tt-wa', 'kilavuz yuzen buton'], ['/pages/iletisim', 'a.tti-kart[data-tt-wa]', 'iletisim karti']]) {
    const o = await ac(br, 390, 844); await git(o.p, yol); await bekle(4000);
    await o.p.evaluate(() => { window.__yayin = []; if (window.Shopify && Shopify.analytics && Shopify.analytics.publish) { const asil = Shopify.analytics.publish; Shopify.analytics.publish = function (a, b) { window.__yayin.push(a); return asil.apply(this, arguments); }; } window.__fbq = []; if (typeof fbq === 'function') { const af = window.fbq; window.fbq = function () { window.__fbq.push([].slice.call(arguments)); return af.apply(this, arguments); }; } });
    const metaOnce = o.kayit.meta.slice(), gaOnce = o.kayit.ga.slice();
    const popup = o.ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await o.p.click(sec);
    const yeni = await popup; await bekle(5000);
    S.tiklama[ad] = { metaYeni: o.kayit.meta.slice(metaOnce.length), gaYeni: o.kayit.ga.slice(gaOnce.length), fbqCagri: await o.p.evaluate(() => window.__fbq), shopifyYayin: await o.p.evaluate(() => window.__yayin),
      yeniSekme: yeni ? yeni.url().slice(0, 140) : null, waIstek: o.kayit.wa.slice(0, 2), metaSayfaAcilis: metaOnce };
    if (yol === '/pages/iletisim') S.iletisim = await o.p.evaluate(() => ({ kart: [...document.querySelectorAll('.tti-kart')].map(k => ({ etiket: k.tagName.toLowerCase(), metin: k.innerText.replace(/\s+/g, ' ').trim(), href: k.getAttribute('href'), target: k.getAttribute('target') })), eskiSohbetButonu: document.querySelectorAll('[data-tti-sohbet]').length }));
    await o.ctx.close();
  }
  // 8) Katmanlar acikken gizleniyor mu (CSS)
  { const o = await ac(br, 390, 844); await git(o.p, URUN);
    S.katman = await o.p.evaluate(() => { const a = document.querySelector('a.tt-wa'); const d = () => { const c = getComputedStyle(a); return c.visibility + '/' + c.opacity; }; const r = { normal: d() };
      document.body.classList.add('has-modal-open'); r.modalAcik = d(); document.body.classList.remove('has-modal-open');
      document.documentElement.classList.add('ttm-kilit'); r.hamburgerAcik = d(); document.documentElement.classList.remove('ttm-kilit');
      document.body.setAttribute('data-tt-nc-acik', ''); r.nasilCalisirPaneli = d(); document.body.removeAttribute('data-tt-nc-acik'); return r; });
    // gercek sepet cekmecesi
    try { await o.p.click('a[href="/cart"], [aria-controls="CartDrawer"], cart-count, .header__icon--cart', { timeout: 5000 }); await bekle(2500); S.katman.sepetCekmecesi = await o.p.evaluate(() => ({ bodyClass: document.body.className.match(/has-modal-[a-z]+/g), wa: getComputedStyle(document.querySelector('a.tt-wa')).visibility })); } catch (e) { S.katman.sepetCekmecesi = 'acilamadi: ' + e.message.slice(0, 60); }
    await o.ctx.close(); }
  await br.close();
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  for (const x of S.senaryolar) console.log(x.w, x.ad, '|', x.sorun.length ? 'SORUN: ' + x.sorun.join('; ') : 'ok', '| chatjs', x.chatjs, '| konsolYeni', x.konsolYeni.length);
  console.log(JSON.stringify(S.tiklama, null, 1)); console.log(JSON.stringify(S.iletisim)); console.log(JSON.stringify(S.katman));
})();
