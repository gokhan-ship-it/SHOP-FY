// Kullanim: node atla-test.js <tema_id> <cikis.json>
// 27.10 ikinci surum: seridin ALTINDA ortali "Kendi setini olustur" dugmesi: gorunurluk (Couple / Single), konum,
// basinca olusturucu basligina kayma (header + cubuk payi), odak, olcum olayi, az hareket, konsol.
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT] = process.argv.slice(2);
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const OLC = () => {
  const K = document.querySelector('[data-sc-kurulu]') || document.querySelector('.tt-sc');
  let y = 1; const x = Math.round(innerWidth / 2);
  for (let n = 0; n < 4; n++) { let e = document.elementFromPoint(x, y), s = null; while (e && e !== document.body && e !== document.documentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') { s = e; break; } e = e.parentElement; } if (!s) break; const a = Math.round(s.getBoundingClientRect().bottom); if (a <= y || a > innerHeight / 2) break; y = a + 1; }
  const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return b.height ? { ust: Math.round(b.top), alt: Math.round(b.bottom), sol: Math.round(b.left), sag: Math.round(b.right), gen: Math.round(b.width) } : { gizli: true }; };
  const a = K.querySelector('[data-sc-setler-atla]'), h = K.querySelector('[data-sc-kur-hedef]');
  const ab = a && a.getBoundingClientRect();
  const ustunde = ab && ab.height ? (() => { const t = document.elementFromPoint(Math.round(ab.left + ab.width / 2), Math.round(ab.top + ab.height / 2)); return t && a.contains(t); })() : null;
  return { scrollY: Math.round(scrollY), vh: innerHeight, vw: innerWidth, ustSabitAlt: y - 1, mod: K.getAttribute('data-sc-aktif-mod'),
    atla: r(a), atlaMetin: a && a.textContent.trim(), atlaHref: a && a.getAttribute('href'), atlaTiklanabilir: ustunde,
    setlerBaslik: r(K.querySelector('.tt-sc-setler-baslik')), setlerIzgara: r(K.querySelector('.tt-sc-setler-izgara')), nav: r(K.querySelector('[data-sc-setler-nav]')), kutu: r(K.querySelector('.tt-sc-setler')), atlaH: a && Math.round(a.getBoundingClientRect().height), atlaZemin: a && getComputedStyle(a).backgroundColor, atlaOk: a && getComputedStyle(a.querySelector('svg')).color,
    hedef: r(h), hedefMetin: h && h.textContent.trim().slice(0, 60), slot0: r(K.querySelector('[data-sc-slot="0"]')), slot1: r(K.querySelector('[data-sc-slot="1"]')),
    odak: document.activeElement === h, yatayTasma: document.documentElement.scrollWidth > innerWidth };
};
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { sonuc: [], konsol: [] };
  const sayfalar = ['/collections/zaman-kapsulu-bileklik', '/collections/zaman-kapsulu-kolyeler', '/collections/couple-urunler'];
  for (const [W, H, m] of [[390, 844, true], [360, 740, true], [1440, 900, false]]) {
    for (const [i, yol] of sayfalar.entries()) {
      for (const hal of (i === 0 ? ['normal', 'cubuk', 'azhareket', 'single'] : (W === 390 ? ['normal'] : []))) {
        let o = { boy: W, sayfa: yol, hal };
        for (let deneme = 0; deneme < 2; deneme++) {
          const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m, locale: 'tr-TR', reducedMotion: hal === 'azhareket' ? 'reduce' : 'no-preference' });
          await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
          if (hal === 'cubuk') await ctx.addInitScript(() => { try { localStorage.setItem('ttnCark', JSON.stringify({ d: 'red', t: 0 })); sessionStorage.setItem('ttnHatirAcik', '1'); } catch (e) {} });
          await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
          const p = await ctx.newPage();
          p.on('pageerror', e => { if (!/Failed to fetch/.test(e.message)) S.konsol.push(W + ' ' + yol + ' ' + String(e.message).slice(0, 160)); });
          p.on('console', mm => { if (mm.type() === 'error' && !/ERR_FAILED|Failed to fetch|monorail|shop\.app|403/.test(mm.text())) S.konsol.push(W + ' ' + yol + ' ' + mm.text().slice(0, 160)); });
          try {
            const q = hal === 'single' ? '?mod=single' : '?mod=couple';
            await p.goto('https://texttonext.com' + yol + q + '&preview_theme_id=' + TID, { waitUntil: 'load', timeout: 90000 }); await bekle(2500);
            await p.evaluate(() => { window.__olc = []; const dl = window.dataLayer = window.dataLayer || []; const op = dl.push.bind(dl); dl.push = function (o) { if (o && /^tt_couple_/.test(o.event)) window.__olc.push(o.event); return op(o); }; });
            o = { boy: W, sayfa: yol, hal };
            o.ilk = await p.evaluate(OLC);
            if (hal !== 'single') {
              await p.evaluate(() => { const a = document.querySelector('[data-sc-setler-atla]'); a.scrollIntoView({ block: 'center' }); }); await bekle(700);
              o.once = await p.evaluate(OLC);
              await p.locator('[data-sc-setler-atla]').first().click();
              await bekle(1900);
              o.sonra = await p.evaluate(OLC);
              o.olcum = await p.evaluate(() => window.__olc);
              o.url = p.url().replace(/.*texttonext\.com/, '');
            }
            await ctx.close(); break;
          } catch (e) { o.hata = String(e).slice(0, 200); await ctx.close(); await bekle(3000); }
        }
        S.sonuc.push(o);
      }
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
