// Kullanim: node mozaik-canli.js <tema_id|canli> <cikis.json>
// Mozaik video kartlarindaki oynat dugmesini Google Chrome (H.264 destekli) ile dener. Salt okuma.
// Her dugme icin: dugmeyi ekranin ortasina getirir, o noktada gercekten dugmenin olup olmadigini kontrol eder
// (ustune binen oge varsa adini yazar), gercek dokunma/tiklama yapar, 5 sn sonra oynayan video var mi bakar.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const tema = process.argv[2];
const cikis = process.argv[3];
const CH = '/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/chrome/opt/google/chrome/chrome';
const engel = fs.readFileSync(path.join(__dirname, 'engel.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const engelRe = engel.map(p => new RegExp('^' + p.split('*').map(x => x.replace(/[.+?^${}()|[\]\\\/]/g, '\\$&')).join('.*') + '$'));
const SAYFALAR = ['/pages/couple-daha-fazla-bilgi-al', '/pages/hediye-daha-fazla-bilgi-al', '/products/luna-aurora-couple-zaman-kapsulu-kopya'];
const bekle = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const br = await chromium.launch({ executablePath: CH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const sonuc = [];
  for (const cihaz of ['telefon', 'masaustu']) {
    for (const yol of SAYFALAR) {
      const opt = cihaz === 'telefon' ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 } : { viewport: { width: 1440, height: 900 } };
      const ctx = await br.newContext(opt);
      await ctx.route('**/*', r => engelRe.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
      const page = await ctx.newPage();
      const url = 'https://texttonext.com' + yol + (tema === 'canli' ? '' : '?preview_theme_id=' + tema);
      await page.goto(url, { waitUntil: 'load', timeout: 120000 });
      await bekle(3000);
      const tema_id = await page.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.id);
      const adet = await page.evaluate(() => document.querySelectorAll('[data-mk-play]').length);
      for (let i = 0; i < adet; i++) {
        // Ust uste binen katman/acik pencere kalmasin diye her dugmede sayfayi yeniden ac
        if (i > 0) { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); await bekle(3000); }
        const gorunur = await page.evaluate(i => {
          const b = document.querySelectorAll('[data-mk-play]')[i];
          const st = getComputedStyle(b);
          return st.display !== 'none' && st.visibility !== 'hidden' && b.getBoundingClientRect().width > 0;
        }, i);
        if (!gorunur) { sonuc.push({ cihaz, yol, dugme: i, durum: 'dugme gorunmuyor (gizli kart)' }); continue; }
        // scrollIntoView bu cok sutunlu (CSS columns) yerlesimde dugmeyi ekrana getirmiyor; ustelik kaydirdikca yuklenen
        // gorseller sutunlari yeniden dengeliyor ve dugme yer degistiriyor. Kullanici gibi: kaydir, bekle, dugme gercekten
        // dokunma noktasinda olana kadar tekrarla (en fazla 8 kez).
        let nokta = null;
        for (let d = 0; d < 8; d++) {
          await page.evaluate(i => { const r = document.querySelectorAll('[data-mk-play]')[i].getBoundingClientRect(); window.scrollTo(0, r.top + scrollY - innerHeight / 2); }, i);
          await bekle(1200);
          nokta = await page.evaluate(i => {
            const b = document.querySelectorAll('[data-mk-play]')[i];
            const r = b.getBoundingClientRect();
            const x = r.left + r.width / 2, y = r.top + r.height / 2;
            const e = document.elementFromPoint(x, y);
            return { x, y, ustteki: e ? (e.tagName + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 50)) : null, dugmeyeAit: !!(e && b.contains(e)), deneme: 0 };
          }, i);
          nokta.deneme = d + 1;
          if (nokta.dugmeyeAit) break;
        }
        if (cihaz === 'telefon') await page.touchscreen.tap(nokta.x, nokta.y); else await page.mouse.click(nokta.x, nokta.y);
        await bekle(5000);
        const v = await page.evaluate(() => {
          const lb = document.querySelector('.tt-vid-kapak video');
          const hepsi = [...document.querySelectorAll('video')].filter(x => !x.paused);
          const ilk = lb || hepsi[0] || null;
          return {
            isikKutusu: !!document.querySelector('.tt-vid-kapak'),
            oynayanVideo: hepsi.length,
            video: ilk ? { src: (ilk.currentSrc || '').split('?')[0].split('/').pop().slice(0, 70), paused: ilk.paused, readyState: ilk.readyState, sure: +ilk.currentTime.toFixed(2), muted: ilk.muted, hata: ilk.error ? ilk.error.code : null } : null
          };
        });
        const oynadi = !!(v.video && !v.video.paused && v.video.sure > 0.5);
        sonuc.push({ cihaz, yol, tema_id, dugme: i, nokta, ...v, durum: oynadi ? 'OYNADI' : 'OYNAMADI' });
        console.log(cihaz, yol, 'dugme', i, nokta.dugmeyeAit ? 'nokta=dugme' : 'nokta=' + nokta.ustteki, '->', oynadi ? 'OYNADI' : 'OYNAMADI', JSON.stringify(v));
      }
      await ctx.close();
    }
  }
  fs.writeFileSync(cikis, JSON.stringify(sonuc, null, 1));
  await br.close();
})();
