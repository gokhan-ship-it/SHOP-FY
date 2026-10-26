// Kullanim: node slot-test.js <tema_id> <cikis.json>
// Bos slota basinca izgaraya kayma; cubuk acikken; dolu slot davranisi; az hareket ayari; konsol.
const { chromium } = require('playwright');
const fs = require('fs');
const [TID, OUT] = process.argv.slice(2);
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const KONUM = () => {
  const K = document.querySelector('[data-sc-kurulu]');
  const f = K.querySelector('[data-sc-filtre]'), iz = K.querySelector('[data-sc-izgara]');
  // ust sabitlerin alti
  let y = 1; const x = Math.round(innerWidth / 2);
  for (let n = 0; n < 4; n++) { let e = document.elementFromPoint(x, y), s = null; while (e && e !== document.body && e !== document.documentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') { s = e; break; } e = e.parentElement; } if (!s) break; const a = Math.round(s.getBoundingClientRect().bottom); if (a <= y || a > innerHeight / 2) break; y = a + 1; }
  const fb = f.getBoundingClientRect();
  const ilk = [...K.querySelectorAll('[data-sc-karo]')].find(e => e.getBoundingClientRect().height > 0);
  const ib = ilk ? ilk.getBoundingClientRect() : null;
  const ustundeki = (() => { const t = document.elementFromPoint(Math.round(fb.left + 20), Math.round(fb.top + fb.height / 2)); return t ? (f.contains(t) ? 'filtre' : ((t.id || t.className || t.tagName) + '').slice(0, 50)) : null; })();
  return { scrollY: Math.round(scrollY), ustSabitAlt: y - 1, filtreUst: Math.round(fb.top), filtreUstundeki: ustundeki, ilkUrunUst: ib ? Math.round(ib.top) : null, ilkUrunAlt: ib ? Math.round(ib.bottom) : null, vh: innerHeight,
    vurgu: iz.hasAttribute('data-sc-vurgu'), animasyonluDugme: [...iz.querySelectorAll('[data-sc-ekle]')].filter(b => b.getAnimations && b.getAnimations().length).length,
    dialog: [...document.querySelectorAll('dialog[open]')].length, cubuk: document.documentElement.classList.contains('tt-hatir-acik') };
};
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = { sonuc: [], konsol: [] };
  const sayfalar = ['/collections/zaman-kapsulu-kolyeler?mod=couple', '/collections/zaman-kapsulu-bileklik?mod=couple', '/collections/couple-urunler?mod=couple'];
  for (const [W, H, m] of [[390, 844, true], [360, 740, true], [1440, 900, false]]) {
    for (const [i, yol] of sayfalar.entries()) {
      for (const hal of (i === 0 ? ['normal', 'cubuk', 'azhareket'] : ['normal'])) {
        const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: m, hasTouch: m, locale: 'tr-TR', reducedMotion: hal === 'azhareket' ? 'reduce' : 'no-preference' });
        await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
        if (hal === 'cubuk') await ctx.addInitScript(() => { try { localStorage.setItem('ttnCark', JSON.stringify({ d: 'red', t: 0 })); sessionStorage.setItem('ttnHatirAcik', '1'); } catch (e) {} });
        await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
        const p = await ctx.newPage();
        p.on('pageerror', e => S.konsol.push(W + ' ' + yol + ' ' + String(e.message).slice(0, 160)));
        p.on('console', mm => { if (mm.type() === 'error' && !/ERR_FAILED|Failed to fetch|monorail|shop\.app|403/.test(mm.text())) S.konsol.push(W + ' ' + yol + ' ' + mm.text().slice(0, 160)); });
        await p.goto('https://texttonext.com' + yol + '&preview_theme_id=' + TID, { waitUntil: 'load', timeout: 90000 }); await bekle(2500);
        await p.evaluate(() => { window.__olc = []; const dl = window.dataLayer = window.dataLayer || []; const op = dl.push.bind(dl); dl.push = function (o) { if (o && o.event === 'tt_couple_slot_kaydir') window.__olc.push(o); return op(o); }; });
        const o = { boy: W, sayfa: yol.split('?')[0], hal };
        for (const slot of ['0', '1']) {
          await p.evaluate(s => { const e = document.querySelector('[data-sc-slot="' + s + '"]'); e.scrollIntoView({ block: 'center' }); }, slot); await bekle(600);
          const once = await p.evaluate(() => Math.round(scrollY));
          await p.locator(`[data-sc-slot="${slot}"]`).first().click();
          await bekle(250); const hemen = await p.evaluate(KONUM);
          await bekle(1700); const sonra = await p.evaluate(KONUM);
          o['slot' + slot] = { once, hemen: { vurgu: hemen.vurgu, animasyonluDugme: hemen.animasyonluDugme }, sonra };
        }
        o.olcum = await p.evaluate(() => window.__olc);
        if (hal === 'normal' && i === 0) {
          // dolu slot: bir urun ekle, slot 0'a bas -> urun cikmali, kayma olmamali
          const id = await p.evaluate(() => { const k = [...document.querySelectorAll('[data-sc-karo]')].find(k => { const b = k.querySelector('[data-sc-ekle]'); if (!b || !b.getBoundingClientRect().height) return false; try { return JSON.parse(k.querySelector('[data-sc-varyantlar]').textContent).filter(v => v["var"]).length === 1; } catch (e) { return false; } }); return k && k.getAttribute('data-sc-urun'); });
          await p.locator(`[data-sc-karo][data-sc-urun="${id}"] [data-sc-ekle]`).first().click(); await bekle(700);
          await p.evaluate(() => document.querySelector('[data-sc-slot="0"]').scrollIntoView({ block: 'center' })); await bekle(600);
          const d1 = await p.evaluate(() => ({ dolu: document.querySelector('[data-sc-slot="0"]').hasAttribute('data-sc-dolu'), y: Math.round(scrollY) }));
          await p.locator('[data-sc-slot="0"]').first().click(); await bekle(1200);
          const d2 = await p.evaluate(() => ({ dolu: document.querySelector('[data-sc-slot="0"]').hasAttribute('data-sc-dolu'), y: Math.round(scrollY) }));
          o.doluSlot = { once: d1, sonra: d2 };
        }
        S.sonuc.push(o);
        await ctx.close();
      }
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
