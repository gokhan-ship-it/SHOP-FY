// "Kişiselleştirilebilir" etiketinin görsel kutusuna göre konumu (kategori / Tüm Ürünler ve ana sayfa Çok satanlar).
// Her kart: görsel kutusu (.card-product__media) sol üst köşesine göre etiketin x / y'si, temanın etiketleri (NEW IN,
// STICK ON, indirim) ve çakışma. Kullanım: node test/performans/etiket-konum.mjs [tema_id] [genislikler]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [tema = '', genislik = '390,1440', yollar = '/collections/all?kisisel=1,/'] = process.argv.slice(2);
const ek = (y) => y + (tema ? (y.includes('?') ? '&' : '?') + 'preview_theme_id=' + tema : '');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const w of genislik.split(',').map(Number)) {
  for (const yol of yollar.split(',')) {
    const c = await t.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const s = await c.newPage();
    await s.goto('https://jantifox.com' + ek(yol), { waitUntil: 'load', timeout: 90000 });
    if (yol === '/') await s.evaluate(() => document.querySelector('[data-kp-cs]').scrollIntoView());
    await s.waitForTimeout(3500);
    const o = await s.evaluate(() => [...document.querySelectorAll('.kp-kk-rozet')].map((r) => {
      const m = r.closest('.card-product__media') || r.parentElement;
      const kart = r.closest('li, .splide__slide');
      const a = kart && kart.querySelector('a[href*="/products/"]');
      const mb = m.getBoundingClientRect(), rb = r.getBoundingClientRect();
      const img = m.querySelector('img');
      const ib = img && img.getBoundingClientRect();
      const diger = [...m.querySelectorAll('.card-new-in-badge, .card-stick-on-badge, .card__badge .badge')].filter((x) => x.offsetWidth).map((x) => {
        const b = x.getBoundingClientRect();
        return { ad: x.textContent.trim().slice(0, 10), x: Math.round(b.left - mb.left), y: Math.round(b.top - mb.top), cakisma: !(b.right <= rb.left || rb.right <= b.left || b.bottom <= rb.top || rb.bottom <= b.top) };
      });
      return { urun: a ? a.getAttribute('href').split('/products/')[1].split('?')[0].slice(0, 34) : '?', x: Math.round(rb.left - mb.left), y: Math.round(rb.top - mb.top), kutu: Math.round(mb.width) + 'x' + Math.round(mb.height), gorsel: ib ? Math.round(ib.width) + 'x' + Math.round(ib.height) + '@' + Math.round(ib.top - mb.top) : null, diger };
    }).filter((x) => x.kutu !== '0x0'));
    console.log('== ' + w + ' ' + yol);
    const konumlar = {};
    o.forEach((k) => { const a = k.x + ',' + k.y; konumlar[a] = (konumlar[a] || 0) + 1; console.log('  ' + k.urun.padEnd(36) + ' etiket ' + a + '  kutu ' + k.kutu + '  görsel ' + k.gorsel + (k.diger.length ? '  ' + JSON.stringify(k.diger) : '')); });
    console.log('  KONUMLAR ' + JSON.stringify(konumlar));
    await c.close();
  }
}
await t.close();
