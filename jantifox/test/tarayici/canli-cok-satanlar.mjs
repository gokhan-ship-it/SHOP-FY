// Kopya temanın önizlemesinde ana sayfa Çok satanlar bölümü, temanın ürün listesi bölümleriyle (patch setleri,
// sırt çantaları) aynı sayfada karşılaştırılır: kart ölçüsü, görsel zemini, köşe, yazılar, boşluklar; etiket, buton,
// sekmeler, örnek tasarım (üzerine gelince / mobilde dönüşümlü), taşma. Yalnızca okur; ekran görüntüsü almaz.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node canli-cok-satanlar.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const URL0 = 'https://jantifox.com/?preview_theme_id=206773780766';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const boyutlar = [['1280', { viewport: { width: 1280, height: 900 } }], ['1440', { viewport: { width: 1440, height: 900 } }], ['1920', { viewport: { width: 1920, height: 1080 } }], ['360', { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } }], ['390', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }]];
for (const [ad, cihaz] of boyutlar) {
  const c = await t.newContext({ ...cihaz, locale: 'tr-TR' });
  const s = await c.newPage();
  const hatalar = [];
  s.on('pageerror', (e) => hatalar.push(e.message));
  await s.goto(URL0, { waitUntil: 'load', timeout: 90000 });
  await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) w.remove(); });
  await s.locator('[data-kp-cs]').scrollIntoViewIfNeeded();
  await s.waitForFunction(() => document.querySelectorAll('[data-kp-cs] .kp-ornek').length >= 6, null, { timeout: 30000 }).catch(() => {});
  await s.waitForTimeout(800);
  const olc = (q) => s.evaluate((q) => {
    const k = document.querySelector(q); if (!k) return null;
    const kart = k.querySelector('.card-wrapper'); const ic = kart.querySelector('.card-product__media-inner'); const st = (e) => getComputedStyle(e);
    const sl = [...k.querySelectorAll('.splide__slide')].filter((x) => x.offsetWidth);
    const r = ic.getBoundingClientRect();
    return { kart: [Math.round(r.width), Math.round(r.height)], zemin: st(ic).backgroundColor, kose: st(ic).borderRadius, baslik: st(kart.querySelector('.card__heading')).fontSize + '/' + st(kart.querySelector('.card__heading')).fontWeight, fiyat: st(kart.querySelector('.price')).fontSize, bosluk: sl.length > 1 ? Math.round(sl[1].getBoundingClientRect().left - sl[0].getBoundingClientRect().right) : null, bolum: st(k.querySelector('.section-bg')).backgroundColor, dolgu: st(k.querySelector('.section-padding')).paddingTop + '/' + st(k.querySelector('.section-padding')).paddingBottom, genislik: Math.round(k.querySelector('.collection').getBoundingClientRect().width) };
  }, q);
  const bizim = await olc('[id*=kisisel_cok_satanlar]');
  const setler = await olc('[id*=featured_collection_Mhgi6z]');
  const cantalar = await olc('[id*=featured_collection_bdyAWi]');
  const ek = await s.evaluate(() => {
    const k = document.querySelector('[data-kp-cs]');
    const sl = [...k.querySelectorAll('.splide__slide')];
    const ust = sl.map((x) => [...x.querySelectorAll('.card-product__media *')].filter((e) => e.offsetWidth && /kp-kk-(rozet|eylem|sepet|mobil)|kp-ornek__not/.test(e.className) && getComputedStyle(e.closest('.kp-ornek') || e).opacity !== '0').map((e) => e.className.split(' ')[0]));
    const b = k.querySelector('.kp-kk-kart-buton'); const fiyat = b && b.closest('.card-wrapper').querySelector('.price');
    const tab = [...k.querySelectorAll('[data-kp-cs-filtre]')];
    const rz = k.querySelector('.kp-kk-rozet');
    return {
      gorunenKart: sl.filter((x) => x.classList.contains('is-visible')).length,
      ustte: [...new Set(ust.flat())], rozet: k.querySelectorAll('.kp-kk-rozet').length, rozetBoy: rz && [Math.round(rz.getBoundingClientRect().width), Math.round(rz.getBoundingClientRect().height), getComputedStyle(rz).fontSize],
      buton: b && { sayi: k.querySelectorAll('.kp-kk-kart-buton').length, fiyatAlti: b.getBoundingClientRect().top >= fiyat.getBoundingClientRect().bottom, en: Math.round(b.getBoundingClientRect().width), kart: Math.round(b.closest('.card-wrapper').getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), kose: getComputedStyle(b).borderRadius, altH: Math.round(k.querySelector('.kp-cs__buton').getBoundingClientRect().height) },
      sepet: k.querySelectorAll('[data-kp-kk-sepet], .kp-kk-eylem').length,
      sekme: tab.map((x) => x.textContent.trim()), sekmeStil: tab[0] && [getComputedStyle(tab[0]).borderRadius, getComputedStyle(tab[0]).backgroundColor, getComputedStyle(k.querySelector('.indicator')).height],
      ornek: [...k.querySelectorAll('.kp-ornek__not')].map((x) => x.textContent), ornekGizli: [...k.querySelectorAll('.kp-ornek')].every((e) => getComputedStyle(e).opacity === '0' || e.classList.contains('kp-ornek--acik')),
      sapka: !k.querySelector('[data-kp-cs-urun="sapka"] .kp-kk-rozet, [data-kp-cs-urun="sapka"] .kp-kk-kart-buton'),
      kadraj: Object.keys(localStorage).filter((x) => x.startsWith('kp-ornek-v2:')).map((x) => JSON.parse(localStorage.getItem(x))).filter((x) => x.isim).map((x) => x.isim + ':' + (x.kadraj ? 'kart görseli' : x.kadraj === null ? 'ortalanmış kesit' : '?')),
      tasma: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  let hover = null;
  if (!cihaz.isMobile) {
    const ic = s.locator('[data-kp-cs] [data-kp-cs-urun="the-artist-sirt-cantasi-jantifox-x-le-koko-collectif-copy"] .card-product__media-inner');
    if (await ic.count()) {
      await ic.scrollIntoViewIfNeeded();
      const once = await ic.locator('.kp-ornek').evaluate((e) => getComputedStyle(e).opacity).catch(() => 'yok');
      await ic.hover(); await s.waitForTimeout(700);
      hover = [once, await ic.locator('.kp-ornek').evaluate((e) => getComputedStyle(e).opacity).catch(() => 'yok')];
    }
  } else {
    await s.locator('[data-kp-cs] .splide__track').scrollIntoViewIfNeeded();
    hover = await s.evaluate(() => new Promise((son) => { const k = document.querySelector('[data-kp-cs]'); const goruldu = new Set(); const t0 = Date.now(); const i = setInterval(() => { k.querySelectorAll('.splide__slide.is-visible .kp-ornek').forEach((e, n) => goruldu.add(n + ':' + e.classList.contains('kp-ornek--acik'))); if (Date.now() - t0 > 7500) { clearInterval(i); son([...goruldu]); } }, 200); }));
  }
  console.log('=== ' + ad + 'px');
  console.log(' bizim   ', JSON.stringify(bizim));
  console.log(' setler  ', JSON.stringify(setler));
  console.log(' çantalar', JSON.stringify(cantalar));
  console.log(' ek      ', JSON.stringify(ek));
  console.log(' örnek geçişi', JSON.stringify(hover), 'hatalar:', hatalar.filter((h) => !/Failed to fetch|privacy|network/i.test(h)));
  await c.close();
}
await t.close();
