// Kopya temanın önizlemesinde Çok satanlar: bütün görünen kartlarda etiket ve "Kişiselleştir" hizası, ad en fazla iki
// satır, buton stili (44 px, kart köşesiyle aynı yuvarlaklık, yarı kalın), kart görseli (düz ürün fotoğrafı), metinler,
// örnek tasarımın kadrajı; kategori sayfasında "Kişiselleştir" köşesi. Yalnızca okur; ekran görüntüsü almaz.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node canli-cok-satanlar-hiza.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const URL0 = 'https://jantifox.com/?preview_theme_id=206773780766';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const boyutlar = [['1280', { viewport: { width: 1280, height: 900 } }], ['1440', { viewport: { width: 1440, height: 900 } }], ['1920', { viewport: { width: 1920, height: 1080 } }], ['360', { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } }], ['390', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }]];
const olc = () => {
  const k = document.querySelector('[data-kp-cs]');
  const sl = [...k.querySelectorAll('.splide__slide.is-visible')];
  return sl.map((x) => {
    const ic = x.querySelector('.card-product__media-inner').getBoundingClientRect();
    const rz = x.querySelector('.kp-kk-rozet'); const rr = rz && rz.getBoundingClientRect();
    const ni = x.querySelector('.card-new-in-badge'); const nr = ni && ni.getBoundingClientRect();
    const b = x.querySelector('.kp-kk-kart-buton'); const h = x.querySelector('.card__heading a');
    return { u: x.getAttribute('data-kp-cs-urun').slice(0, 14), rozet: rr && [Math.round(rr.left - ic.left), Math.round(rr.top - ic.top)], newIn: nr && [Math.round(ic.right - nr.right), Math.round(nr.top - ic.top)], cakisma: !!(rr && nr && !(rr.right <= nr.left || nr.right <= rr.left || rr.bottom <= nr.top || nr.bottom <= rr.top)), butonAlt: b && Math.round(b.getBoundingClientRect().bottom), kartAlt: Math.round(x.querySelector('.card-wrapper').getBoundingClientRect().bottom), satir: Math.round(h.clientHeight / parseFloat(getComputedStyle(h).lineHeight)), kisaltildi: h.scrollHeight > h.clientHeight + 1 };
  });
};
for (const [ad, cihaz] of boyutlar) {
  const c = await t.newContext({ ...cihaz, locale: 'tr-TR' });
  const s = await c.newPage();
  const hatalar = [];
  s.on('pageerror', (e) => hatalar.push(e.message));
  await s.goto(URL0, { waitUntil: 'load', timeout: 90000 });
  await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) w.remove(); });
  await s.locator('[data-kp-cs] .splide__track').scrollIntoViewIfNeeded();
  await s.waitForTimeout(2500);
  const ilk = await s.evaluate(olc);
  // Kaydırıp kalan kartlar
  const sonra = [];
  for (let i = 0; i < 4; i++) {
    await s.evaluate((n) => document.querySelector('[data-kp-cs] splide-carousel').slideInstance.go(n), (i + 1) * (cihaz.isMobile ? 2 : 4));
    await s.waitForTimeout(1500);
    sonra.push(...(await s.evaluate(olc)));
  }
  const hepsi = [...ilk, ...sonra];
  const rozetler = [...new Set(hepsi.filter((x) => x.rozet).map((x) => x.rozet.join(',')))];
  const satirBasi = (l) => [...new Set(l.filter((x) => x.butonAlt).map((x) => x.butonAlt - x.kartAlt))];
  const hizalar = (l) => [...new Set(l.filter((x) => x.butonAlt).map((x) => x.butonAlt))];
  const genel = await s.evaluate(() => {
    const k = document.querySelector('[data-kp-cs]');
    const st = (b) => { const c = getComputedStyle(b); return [Math.round(b.getBoundingClientRect().height), c.borderRadius, c.fontWeight, c.letterSpacing, c.textTransform, c.backgroundColor]; };
    const img = (h) => { const i = k.querySelector(`[data-kp-cs-urun="${h}"] .product-first-image img`); return i && (i.currentSrc || i.src).split('/files/')[1].split('?')[0]; };
    return {
      metin: [k.querySelector('.section__sub-heading')?.textContent.trim(), k.querySelector('.section__heading')?.textContent.trim(), k.querySelector('.section__description')?.textContent.trim()],
      kartBtn: st(k.querySelector('.kp-kk-kart-buton')), altBtn: st(k.querySelector('.kp-cs__buton')), gorselKose: getComputedStyle(k.querySelector('.card-product__media-inner')).borderRadius,
      gorsel: ['mavi-beyaz-cizgili-spor-canta', 'pembe-kirmizi-cizgili-spor-canta', 'pudra-pembe-tshirt', 'sapka'].map(img),
      kadraj: Object.keys(localStorage).filter((x) => x.startsWith('kp-ornek-v2:')).map((x) => JSON.parse(localStorage.getItem(x))).filter((x) => x.isim).map((x) => x.isim + ':' + (x.kadraj ? 'kart görseli' : x.kadraj === null ? 'ortalanmış' : '?')),
      tasma: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  console.log(`=== ${ad}px`);
  console.log(' etiket konumu (sol,üst):', rozetler.join(' | '), '· NEW IN (sağ,üst):', [...new Set(hepsi.filter((x) => x.newIn).map((x) => x.newIn.join(',')))].join(' | '), '· çakışma:', hepsi.some((x) => x.cakisma));
  console.log(' buton alt kenarı (ilk görünüm):', hizalar(ilk).join(','), '· buton-kart alt farkı:', satirBasi(hepsi).join(','));
  console.log(' ad satırları:', JSON.stringify([...new Map(hepsi.map((x) => [x.u, x.satir + (x.kisaltildi ? '…' : '')])).entries()]));
  console.log(' butonlar [yükseklik, köşe, kalınlık, harf aralığı, dönüşüm, renk]: kart', JSON.stringify(genel.kartBtn), 'alt', JSON.stringify(genel.altBtn), '· görsel köşesi', genel.gorselKose);
  console.log(' metinler:', JSON.stringify(genel.metin));
  console.log(' kart görselleri:', JSON.stringify(genel.gorsel));
  console.log(' örnek kadraj:', JSON.stringify(genel.kadraj), '· taşma:', genel.tasma, '· hatalar:', hatalar.filter((h) => !/Failed to fetch|privacy|network/i.test(h)));
  await c.close();
}
// Kategori sayfası "Kişiselleştir" köşesi
{
  const c = await t.newContext({ viewport: { width: 1440, height: 900 } });
  const s = await c.newPage();
  await s.goto('https://jantifox.com/collections/tum-urunler?preview_theme_id=206773780766', { waitUntil: 'load', timeout: 90000 });
  await s.waitForTimeout(2000);
  console.log('=== kategori: Kişiselleştir köşesi', await s.locator('.kp-kk-kisisel').first().evaluate((e) => getComputedStyle(e).borderRadius).catch(() => 'yok'), '· kart görsel köşesi', await s.locator('.card-product__media-inner').first().evaluate((e) => getComputedStyle(e).borderRadius).catch(() => 'yok'));
  await c.close();
}
await t.close();
