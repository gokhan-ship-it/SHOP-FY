// Ana sayfa Çok satanlar → "Kişiselleştir" basışından editörün kullanılabilir olmasına kadar geçen süre, adımlara bölünmüş.
// iPhone 13 boyutu; CPU normal ve 4 kat yavaş. Her ölçüm yeni tarayıcı oturumunda (önbellek boş) ve ikinci kez (önbellek dolu).
// Kullanım: node test/performans/editor-hiz.mjs [taban] [tema_id] [handle] [tekrar]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [taban = 'https://jantifox.com', tema = '', handle = 'mavi-beyaz-cizgili-spor-canta', tekrar = '2'] = process.argv.slice(2);
const ek = tema ? '?preview_theme_id=' + tema : '';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const izle = () => {
  // Her sayfada: zaman damgaları (Date.now, sayfalar arası aynı saat)
  const o = (window.__olc = { bas: Date.now(), uzun: 0, uzunToplam: 0 });
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { o.uzun++; o.uzunToplam += e.duration; })).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
  document.addEventListener('DOMContentLoaded', () => { o.dcl = Date.now(); });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.name === 'first-contentful-paint') o.fcp = performance.timeOrigin + e.startTime; })).observe({ type: 'paint', buffered: true });
  const bak = () => {
    // Açılış görünümü (theme.liquid head: html.kp-acilis-bekle) ilk boyamada görünür
    if (!o.tepki && document.documentElement.classList.contains('kp-acilis-bekle') && o.fcp) o.tepki = o.fcp;
    if (window.KisiselEditorIc && !o.kod) o.kod = Date.now();
    const ed = document.querySelector('.kp-editor');
    if (ed && !ed.hidden && !o.acik) o.acik = Date.now();
    const img = ed && !ed.hidden && ed.querySelector('.kp-sahne__urun');
    if (img && img.complete && img.naturalWidth && !o.gorsel) o.gorsel = Date.now();
    const isim = ed && !ed.hidden && ed.querySelector('[data-kp-isim]');
    if (o.acik && o.gorsel && isim && !o.hazir) {
      const b = isim.getBoundingClientRect();
      if (b.height && b.bottom <= innerHeight + 1 && !document.documentElement.classList.contains('kp-acilis-bekle')) o.hazir = Date.now();
    }
    if (!o.hazir) requestAnimationFrame(bak);
  };
  requestAnimationFrame(bak);
};

const sonuclar = [];
for (const cpu of [1, 4]) {
  for (let i = 0; i < Number(tekrar); i++) {
    const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
    await c.addInitScript(izle);
    // Shopify ikinci ziyarette ürün sayfasına giderken shop.app/accounts/sur üzerinden yönlendirir (Shop ile tanıma).
    // Bu ortamda shop.app engelli ve yönlendirme yakalanamıyor: her sayfa geçişinden önce çerezler silinir (sayfa "ilk
    // ziyaret" sayılır, tarayıcı önbelleği korunur). Gerçek telefonda bu yönlendirme ölçüme ek bir gidiş-dönüş katar.
    const yonlendirme = 'çerez silindi';
    const s = await c.newPage();
    const cdp = await c.newCDPSession(s);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await s.goto(taban + '/' + ek, { waitUntil: 'load', timeout: 90000 });
    // İkinci turda önbellek dolu olsun diye aynı ürün sayfası bir kez önceden açılır (yalnızca i = 1)
    if (i === 1) { await c.clearCookies(); await s.goto(taban + '/products/' + handle + ek, { waitUntil: 'load', timeout: 90000 }); await c.clearCookies(); await s.goto(taban + '/' + ek, { waitUntil: 'load', timeout: 90000 }); }
    await s.evaluate(() => { document.querySelectorAll('#popupOverlay, .coupon-modal, #shopify-pc__banner').forEach((e) => e.remove()); document.querySelector('[data-kp-cs]').scrollIntoView({ block: 'center' }); });
    await s.waitForTimeout(2500);
    const buton = s.locator(`[data-kp-cs] .splide__slide:has(a[href*="/products/${handle}"]) .kp-kk-kart-buton`).first();
    await buton.scrollIntoViewIfNeeded();
    await s.waitForTimeout(800);
    // Tıklamadan sonraki ilk karede butonda yükleniyor görünümü var mı (zaman sessionStorage'a; aynı sekmede kalır)
    await s.evaluate(() => document.addEventListener('click', () => requestAnimationFrame(() => {
      const a = document.querySelector('.kp-kk-yukleniyor[aria-busy="true"]');
      sessionStorage.setItem('kpTepki', a ? String(Date.now()) : '0');
    }), true));
    await c.clearCookies();
    // Çerez silinince önizleme teması da unutulur: buton adresine tema numarası eklenir
    if (tema) await buton.evaluate((a, t) => { a.href = a.href + '&preview_theme_id=' + t; }, tema);
    const tik = Date.now();
    await buton.click({ noWaitAfter: true });
    // Tıklamadan sonra 300 ms içinde ana sayfada görünür tepki var mı
    const anaTepki = null; // sayfa değişirken okunamaz: tıklama anındaki tepki sessionStorage'dan okunur
    await s.waitForFunction(() => window.__olc && window.__olc.hazir, null, { timeout: 60000, polling: 100 }).catch(() => {});
    const o = await s.evaluate(() => {
      const r = performance.getEntriesByType('resource');
      const bul = (k) => r.find((x) => x.name.includes(k));
      const nav = performance.getEntriesByType('navigation')[0];
      const js = bul('kisisel-editor.js'), css = bul('kisisel-editor.css'), img = r.find((x) => /kisisel-urun-|kisisel-aksesuar-|onizleme/.test(x.name) && x.initiatorType === 'img');
      const T = performance.timeOrigin;
      return { ...window.__olc, butonTepki: Number(sessionStorage.getItem('kpTepki')) || null, navBas: T, yanit: nav && T + nav.responseStart, htmlBitti: nav && T + nav.responseEnd,
        jsBitti: js && T + js.responseEnd, jsBoyut: js && js.encodedBodySize, jsOnbellek: js && js.transferSize === 0,
        imgBas: img && T + img.startTime, imgBitti: img && T + img.responseEnd, imgBoyut: img && img.encodedBodySize, imgAd: img && img.name.split('?')[0].split('/').pop() };
    });
    const g = (x) => (x ? Math.round(x - tik) : null);
    sonuclar.push({ cpu, onbellek: i === 1, butonTepki: g(o.butonTepki), yanittanSonraKullanilabilir: o.hazir && o.yanit ? Math.round(o.hazir - o.yanit) : null, urunSayfasiYanit: g(o.yanit), fcp: g(o.fcp), tepki: g(o.tepki), dcl: g(o.dcl), editorKoduIndi: g(o.jsBitti), editorKoduCalisti: g(o.kod), editorAcildi: g(o.acik), gorselIndi: g(o.imgBitti), gorselGorundu: g(o.gorsel), kullanilabilir: g(o.hazir), uzunIs: o.uzun, uzunIsMs: Math.round(o.uzunToplam), jsKB: o.jsBoyut && Math.round(o.jsBoyut / 1024), gorselKB: o.imgBoyut && Math.round(o.imgBoyut / 1024), gorsel: o.imgAd, shopYonlendirme: yonlendirme });
    await c.close();
  }
}
console.log(JSON.stringify(sonuclar));
await t.close();
