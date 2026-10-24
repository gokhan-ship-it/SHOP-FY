// Baslik + footer en alt satir kontrolu (kopya tema onizlemesi). Takip beacon'lari iptal edilir.
// Kullanim: node kontrol2.js <tema_id> <cikis.json>
const { chromium } = require('playwright');
const fs = require('fs');
const TID = process.argv[2], OUT = process.argv[3];
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail-edge|\/\.well-known\/shopify\/monorail|trueprofit/;
// Engellenen takip isteklerinden ve onizleme cubugundan gelen bilinen mesajlar
const GURULTU = [/net::ERR_FAILED/, /^pageerror: Failed to fetch/, /Error producing monorail event/, /Refused to frame 'https:\/\/shop\.app/, /status of 403/, /error-analytics-sessions-production/, /\[bugsnag\]/];
(async () => {
  const br = await chromium.launch();
  const S = { tema: TID, zaman: new Date().toISOString(), sonuc: {} };
  for (const [ad, w, h, m] of [['390', 390, 844, true], ['360', 360, 780, true], ['1440', 1440, 900, false]]) {
    for (const yol of ['/pages/icerik-uretici', '/pages/iletisim', '/']) {
      const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 3 : 1, locale: 'tr-TR' });
      await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
      const p = await ctx.newPage();
      const konsol = [];
      p.on('console', x => { if (x.type() === 'error') konsol.push(x.text().slice(0, 160)); });
      p.on('pageerror', e => konsol.push('pageerror: ' + String(e.message).slice(0, 160)));
      // Gecici dogrulama/bos sayfa gelirse en fazla 3 kez yeniden dene
      for (let deneme = 1; deneme <= 3; deneme++) {
        await p.goto('https://texttonext.com' + yol + '?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
        await p.waitForTimeout(6000);
        if (await p.evaluate(() => typeof window.Shopify === 'object' && !!Shopify.theme)) break;
        await p.waitForTimeout(15000);
      }
      await p.evaluate(() => document.fonts.ready);
      // Shopify onizleme cubugu (yalnizca onizlemede var, gercek sitede yok) altta linkin ustune biniyor: gizle
      const onizlemeCubugu = await p.evaluate(() => { const e = document.getElementById('PBarNextFrameWrapper'); if (!e) return false; e.style.setProperty('display', 'none', 'important'); return true; });
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const o = { tema: Shopify.theme.id };
        const h1 = document.querySelector('[data-ttiu] h1');
        if (h1) {
          const sp = h1.querySelectorAll('span'), cs = getComputedStyle(h1);
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.08;
          o.baslik = { satir1: sp[0].textContent, satir2: sp[1].textContent, renk1: getComputedStyle(sp[0]).color, renk2: getComputedStyle(sp[1]).color,
            boyut: cs.fontSize, kalinlik: cs.fontWeight, harf: cs.letterSpacing, satirSayisi: Math.round(h1.getBoundingClientRect().height / lh),
            span1Yukseklik: Math.round(sp[0].getBoundingClientRect().height), span2Yukseklik: Math.round(sp[1].getBoundingClientRect().height),
            etiket: document.querySelector('.ttiu-giris .ttiu-etiket').textContent, aciklama: document.querySelector('.ttiu-aciklama').textContent, buton: document.querySelector('.ttiu-ters').textContent };
        }
        const gruplar = [...document.querySelectorAll('[id^="shopify-section-sections--"]')].filter(e => e.classList.contains('shopify-section-group-footer-group'));
        o.footerSirasi = gruplar.map(e => e.id.replace(/^.*__/, ''));
        const satir = document.querySelector('.tt-footer-satir');
        const a = satir && satir.querySelector('a');
        if (a) {
          const b = a.getBoundingClientRect(), sb = satir.getBoundingClientRect();
          const belgeAlt = document.documentElement.scrollHeight;
          // satirdan sonra gorunur (sabit olmayan) bir sey var mi?
          const sonra = [...document.body.querySelectorAll('*')].filter(e => {
            if (satir.contains(e) || e.contains(satir)) return false;
            const cs = getComputedStyle(e); if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return false;
            const x = e.getBoundingClientRect(); return x.height > 0 && x.width > 0 && x.top + scrollY >= sb.bottom + scrollY - 1;
          }).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')).slice(0, 8);
          const ust = (x, y) => { const el = document.elementFromPoint(x, y); return el ? (a.contains(el) ? 'link' : el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className).split(' ')[0]) : null; };
          const svg = a.querySelector('svg').getBoundingClientRect();
          o.footerLink = { metin: a.textContent.trim(), href: a.getAttribute('href'), genislik: Math.round(b.width), yukseklik: Math.round(b.height),
            zemin: getComputedStyle(satir.firstElementChild).backgroundColor, yazi: getComputedStyle(a).color, boyut: getComputedStyle(a).fontSize, kalinlik: getComputedStyle(a).fontWeight,
            satirAltBelgeAlt: Math.round(sb.bottom + scrollY) + ' / ' + belgeAlt, altindaGorunurOge: sonra,
            yaziUstundeki: ust(b.left + 40, b.top + b.height / 2), okUstundeki: ust(svg.left + svg.width / 2, svg.top + svg.height / 2) };
        }
        return o;
      });
      r.onizlemeCubuguGizlendi = onizlemeCubugu;
      r.konsolYeni = [...new Set(konsol.filter(t => !GURULTU.some(g => g.test(t))))];
      r.konsolToplam = konsol.length;
      if (yol === '/pages/iletisim' && ad === '390') {
        await Promise.all([p.waitForURL(/\/pages\/icerik-uretici/, { timeout: 60000 }), p.click('.tt-footer-satir a')]);
        r.tiklamaSonrasi = { url: p.url().replace('https://texttonext.com', ''), tema: await p.evaluate(() => Shopify.theme.id), baslik: await p.evaluate(() => document.querySelector('[data-ttiu] h1')?.innerText) };
      }
      S.sonuc[ad + ' ' + yol] = r;
      await ctx.close();
    }
  }
  await br.close();
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  for (const [k, v] of Object.entries(S.sonuc)) console.log(k, JSON.stringify(v));
})();
