// Gorsel olcumu: her sayfa icin telefon (390x844, DPR 3) ve masaustu (1440x900, DPR 1).
// Salt okuma: yalnizca sayfayi acar, kaydirir ve DOM/ag kayitlarini JSON'a yazar.
// Kullanim: NODE_PATH=/opt/node22/lib/node_modules node gorsel-olcum.js <cikis_klasoru>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const SAYFALAR = [
  ['anasayfa', 'https://texttonext.com/'],
  ['couple-landing', 'https://texttonext.com/pages/couple-daha-fazla-bilgi-al'],
  ['kunye', 'https://texttonext.com/products/zaman-kapsulu-kunye'],
  ['astor-chloe-couple', 'https://texttonext.com/products/luna-aurora-couple-zaman-kapsulu-kopya'],
  ['noir', 'https://texttonext.com/products/luna-zaman-kapsulu-bileklik-316l-paslanmaz-celik-kopya'],
  ['kral-zincir', 'https://texttonext.com/products/zaman-kapsulu-bileklik-kral'],
  ['couple-urunler', 'https://texttonext.com/collections/couple-urunler'],
];
const MODLAR = {
  mobil: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
  masaustu: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const cikis = process.argv[2] || 'gorsel';
fs.mkdirSync(cikis, { recursive: true });
const bekle = ms => new Promise(r => setTimeout(r, ms));

// Sayfada calisir: gorunen gorseller, arka planlar, videolar
function domTopla(asama) {
  const vh = innerHeight, vw = innerWidth;
  const bolum = el => { const s = el.closest('[id^="shopify-section-"]'); return s ? s.id.replace(/^shopify-section-/, '') : null; };
  const gorunur = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const kutu = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const imgs = [...document.querySelectorAll('img')].map((el, i) => {
    const k = kutu(el);
    return {
      i, asama, bolum: bolum(el), currentSrc: el.currentSrc, src: el.getAttribute('src'), srcset: el.getAttribute('srcset'),
      sizes: el.getAttribute('sizes'), loading: el.getAttribute('loading'), fetchpriority: el.getAttribute('fetchpriority'),
      is: el.getAttribute('is'), cls: el.className && String(el.className).slice(0, 80),
      naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, complete: el.complete, ...k,
      ilkEkran: k.y < vh && k.y + k.h > 0 && k.x < vw && k.x + k.w > 0 && k.w > 0 && k.h > 0,
      gorunur: gorunur(el) && k.w > 0 && k.h > 0, picture: !!el.closest('picture'),
    };
  });
  const arka = [];
  for (const el of document.querySelectorAll('body *')) {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url(')) {
      const k = kutu(el);
      arka.push({ asama, bolum: bolum(el), tag: el.tagName, cls: String(el.className).slice(0, 80), bg: bg.slice(0, 400), ...k, ilkEkran: k.y < vh && k.y + k.h > 0 && k.w > 0 });
    }
  }
  const videolar = [...document.querySelectorAll('video')].map(el => ({
    asama, bolum: bolum(el), src: el.getAttribute('src'), currentSrc: el.currentSrc, poster: el.getAttribute('poster'),
    preload: el.getAttribute('preload'), autoplay: el.autoplay, muted: el.muted, loop: el.loop, playsinline: el.playsInline,
    kaynaklar: [...el.querySelectorAll('source')].map(s => ({ src: s.getAttribute('src'), type: s.getAttribute('type'), media: s.getAttribute('media') })),
    ...kutu(el), ilkEkran: (() => { const k = kutu(el); return k.y < vh && k.y + k.h > 0 && k.w > 0; })(), gorunur: gorunur(el),
  }));
  const lcp = (window.__ttLcp || []).map(e => ({ t: Math.round(e.startTime), size: e.size, url: e.url, tag: e.element && e.element.tagName, bolum: e.element ? bolum(e.element) : null, cls: e.element && String(e.element.className).slice(0, 80), src: e.element && (e.element.currentSrc || e.element.getAttribute('poster')) }));
  return { imgs, arka, videolar, lcp, scrollH: document.documentElement.scrollHeight };
}

(async () => {
  const br = await chromium.launch();
  for (const [ad, url] of SAYFALAR) {
    for (const [mod, opt] of Object.entries(MODLAR)) {
      const ctx = await br.newContext(opt);
      await ctx.addInitScript(() => {
        window.__ttLcp = [];
        try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ttLcp.push(e); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
      });
      const p = await ctx.newPage();
      const istekler = [];
      p.on('requestfinished', async req => {
        try {
          const res = await req.response(); const s = await req.sizes();
          const h = res ? await res.allHeaders() : {};
          istekler.push({ url: req.url(), tur: req.resourceType(), durum: res && res.status(), ctype: h['content-type'], clen: h['content-length'], crange: h['content-range'],
            govde: s.responseBodySize, baslik: s.responseHeadersSize, t: Math.round(req.timing().startTime) });
        } catch (e) { istekler.push({ url: req.url(), tur: req.resourceType(), hata: String(e).slice(0, 80) }); }
      });
      const bas = Date.now();
      await p.goto(url, { waitUntil: 'load', timeout: 120000 });
      await bekle(3000);
      const ilk = await p.evaluate(domTopla, 'ilk');
      // Asagi kaydir: tembel yuklenenleri tetikle
      let y = 0;
      for (let n = 0; n < 200; n++) {
        y += Math.round(opt.viewport.height * 0.8);
        await p.evaluate(yy => scrollTo(0, yy), y);
        await bekle(350);
        const h = await p.evaluate(() => document.documentElement.scrollHeight);
        if (y > h) break;
      }
      await bekle(3000);
      const son = await p.evaluate(domTopla, 'son');
      fs.writeFileSync(path.join(cikis, `${ad}-${mod}.json`), JSON.stringify({ ad, url, mod, dpr: opt.deviceScaleFactor, viewport: opt.viewport, sure: Date.now() - bas, ilk, son, istekler }, null, 1));
      console.log('bitti', ad, mod, 'istek', istekler.length, 'img', son.imgs.length);
      await ctx.close();
      await bekle(1500);
    }
  }
  await br.close();
})();
