// Kullanim: node teshis.js <tema_id> <cikis.json>
// Cark teshisi (temiz tarayici, takip istekleri yakalanip iptal edilir):
//  - kart nerede, ilk ekranda mi; kompakt dokununca "Carki cevir" dugmesi ilk ekranda mi
//  - sabit ogelerle (WhatsApp, Nasil calisir, yapiskan cubuklar, cerez bandi) cakisma
//  - Esc / bosluga dokunma kapatiyor mu; "Istemiyorum" sonrasi durum ve localStorage/cerezler
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT] = process.argv.slice(2);
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/,
  /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];

const OLC = () => {
  const vw = innerWidth, vh = innerHeight;
  const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => e.getBoundingClientRect().height > 0);
  if (!k) return { kart: null };
  const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), alt: Math.round(b.bottom) }; };
  const kom = k.querySelector('[data-ttn-kompakt]'), cevir = k.querySelector('[data-ttn-cevir]'), vaz = k.querySelector('[data-ttn-kapat]'), acDug = k.querySelector('[data-ttn-ac]');
  // sabit/yapiskan ogeler
  const sabit = [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); if (c.position !== 'fixed' && c.position !== 'sticky') return false; const b = e.getBoundingClientRect();
    return b.width > 0 && b.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05 && b.width < vw * 1.01 && !(b.width >= vw - 1 && b.height >= vh - 1); })
    .filter(e => !e.parentElement.closest('[style*="fixed"]'))
    .map(e => ({ ad: (e.id || e.className || e.tagName).toString().slice(0, 50), r: r(e), z: getComputedStyle(e).zIndex }));
  const cakisma = el => { if (!el) return []; const a = el.getBoundingClientRect(); if (!a.width) return [];
    return sabit.filter(s => !el.closest('*') || true).filter(s => { const b = s.r; return b && a.left < b.x + b.w && a.right > b.x && a.top < b.y + b.h && a.bottom > b.y; })
      .filter(s => { const e = document.elementFromPoint(Math.round(a.left + a.width / 2), Math.round(a.top + a.height / 2)); return e && !el.contains(e); }).map(s => s.ad); };
  const ustteki = el => { if (!el) return null; const a = el.getBoundingClientRect(); if (!a.width || a.bottom < 0 || a.top > vh) return 'ekran-disi';
    const e = document.elementFromPoint(Math.round(a.left + a.width / 2), Math.round(Math.max(1, Math.min(vh - 1, a.top + a.height / 2)))); return e ? (el.contains(e) ? 'kendisi' : (e.id || e.className || e.tagName).toString().slice(0, 60)) : null; };
  let ls = null; try { ls = localStorage.getItem('ttnCark'); } catch (e) {}
  return { vw, vh, scrollY: Math.round(scrollY), bolum: ((k.closest('[id^="shopify-section"]') || {}).id || '').replace(/^.*__/, ''), durum: k.getAttribute('data-ttn-durum'), acik: k.hasAttribute('data-ttn-acik'),
    kart: r(k), kompakt: r(kom), acDugme: r(acDug), cevirDugme: r(cevir), vazgecDugme: r(vaz),
    cevirIlkEkranda: cevir ? (cevir.getBoundingClientRect().bottom <= vh && cevir.getBoundingClientRect().top >= 0 && cevir.getBoundingClientRect().height > 0) : null,
    cevirUstundeki: ustteki(cevir), kompaktUstundeki: ustteki(kom), sabitOgeler: sabit.map(s => s.ad + ' ' + JSON.stringify(s.r)).slice(0, 14),
    localStorage: ls, cerezler: document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => /wlo|ttn|cark/i.test(n)) };
};

(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { tema: TID, olcumler: {} };
  for (const [ad, W, H, mobil] of [['390x844', 390, 844, true], ['360x740', 360, 740, true], ['1440x900', 1440, 900, false]]) {
    for (const [sayfa, yol] of [['ana', '/'], ['erkek', '/collections/zaman-kapsulu-bileklik'], ['urun', '/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik']]) {
      const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: mobil ? 3 : 1, locale: 'tr-TR',
        userAgent: mobil ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; tr_TR)' : undefined });
      await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
      await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
      const page = await ctx.newPage();
      const anahtar = ad + '-' + sayfa;
      await page.goto('https://texttonext.com' + yol + '?preview_theme_id=' + TID, { waitUntil: 'load' });
      await page.evaluate(() => { const f = document.querySelector('#PBarNextFrameWrapper'); if (f) f.style.display = 'none'; });
      const t0 = Date.now(); await bekle(6000);
      const ilk = await page.evaluate(OLC);
      ilk.not = 'Yukleme + 6 sn bekleme, kaydirma yok: kendiliginden acildi mi -> acik=' + ilk.acik;
      S.olcumler[anahtar] = { ilk };
      if (!ilk.kart) { await ctx.close(); continue; }
      // karta kaydir (kullanici gibi), kompakt dokun
      await page.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => e.getBoundingClientRect().height > 0); k.scrollIntoView({ block: 'center' }); });
      await bekle(600);
      S.olcumler[anahtar].kartaKaydirinca = await page.evaluate(OLC);
      // kullanici karti gordugu yerden dokunur: kompakt satirin gorunur oldugu konumda
      await page.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => e.getBoundingClientRect().height > 0); k.querySelector('[data-ttn-kompakt]').click(); });
      await bekle(900);
      S.olcumler[anahtar].acilinca = await page.evaluate(OLC);
      // Esc ve bosluga dokunma
      await page.keyboard.press('Escape'); await bekle(300);
      const escSonra = await page.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => e.getBoundingClientRect().height > 0); return k.hasAttribute('data-ttn-acik'); });
      if (mobil) await page.touchscreen.tap(5, 300); else await page.mouse.click(5, 300);
      await bekle(400);
      const bosSonra = await page.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => e.getBoundingClientRect().height > 0); return k.hasAttribute('data-ttn-acik'); });
      S.olcumler[anahtar].kapanma = { escSonrasiAcik: escSonra, bosluktanSonraAcik: bosSonra };
      // Istemiyorum
      await page.evaluate(() => { const k = [...document.querySelectorAll('[data-ttn-cark]')].find(e => e.getBoundingClientRect().height > 0); const v = k.querySelector('[data-ttn-kapat]'); if (v) v.click(); });
      await bekle(700);
      S.olcumler[anahtar].istemiyorumSonra = await page.evaluate(OLC);
      // ayni oturumda yeni sayfa: kendiliginden aciliyor mu
      await page.goto('https://texttonext.com' + yol + '?preview_theme_id=' + TID, { waitUntil: 'load' }); await bekle(4000);
      const s2 = await page.evaluate(OLC);
      S.olcumler[anahtar].yenidenYukleme = { durum: s2.durum, acik: s2.acik, localStorage: s2.localStorage };
      await ctx.close();
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
