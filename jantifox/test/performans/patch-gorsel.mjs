// Editör açılışında ve Görsel (ikon) paneli açılınca hangi patch görsellerinin, ne zaman, hangi boyutta indiği
// (iPhone 13 profili). Kullanım: node test/performans/patch-gorsel.mjs <tema_id> [ürün handle]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [tema, handle = 'mavi-beyaz-cizgili-spor-canta'] = process.argv.slice(2);
const onizleme = tema ? '&preview_theme_id=' + tema : '';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const PATCH = /kisisel-(harf|rakam|ikon|piramit|aksesuar)/;
await s.goto('https://jantifox.com/products/' + handle + '?kisisellestir=1&kp_olcum=1' + onizleme, { waitUntil: 'domcontentloaded', timeout: 90000 });
await s.waitForSelector('.kp-editor:not([hidden]) #kp-isim', { timeout: 60000 });
await s.waitForTimeout(Number(process.env.BEKLE || 8000));
const ozet = (liste) => {
  const g = {};
  liste.forEach((r) => {
    const ad = r.name.split('?')[0].split('/').pop();
    const tur = ad.replace(/kisisel-(\w+)-.*/, '$1');
    const k = tur + ' w=' + ((r.name.match(/width=(\d+)/) || [])[1] || '?');
    g[k] = g[k] || { adet: 0, kb: 0, ilk: 1e9, son: 0 };
    g[k].adet++;
    g[k].kb += (r.transferSize || 0) / 1024;
    g[k].ilk = Math.min(g[k].ilk, r.startTime);
    g[k].son = Math.max(g[k].son, r.responseEnd);
  });
  Object.entries(g).forEach(([k, v]) => console.log('  ', k.padEnd(18), v.adet, 'adet', Math.round(v.kb), 'KB', 'başlangıç', (v.ilk / 1000).toFixed(2), 's bitiş', (v.son / 1000).toFixed(2), 's'));
};
const kaynak = () => s.evaluate((d) => performance.getEntriesByType('resource').filter((r) => new RegExp(d).test(r.name)).map((r) => ({ name: r.name, startTime: r.startTime, responseEnd: r.responseEnd, transferSize: r.transferSize })), PATCH.source);
const acilis = await kaynak();
console.log('Editör açılışı (8 s):', acilis.length, 'patch görseli');
ozet(acilis);
const gorunen = await s.evaluate(() => [...document.querySelectorAll('.kp-editor img')].filter((i) => { const r = i.getBoundingClientRect(); return r.width && r.height && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }).length);
console.log('Açılışta ekranda görünen editör görseli:', gorunen);
const yer = await s.evaluate(() => [...new Set([...document.querySelectorAll('.kp-editor img')].filter((i) => /kisisel-(harf|rakam|ikon|piramit)/.test(i.currentSrc || i.src)).map((i) => { const k = i.closest('[class*="kp-"]'); let e = i.parentElement; while (e && !/kp-(panel|secim|karakter|stil|eklenen|kenar|sahne)/.test(e.className)) e = e.parentElement; return e ? e.className.split(' ')[0] : '?'; }))]);
console.log('Görsellerin bulunduğu yerler:', yer.join(', '));
// YAVAS=1: panel aşamasında telefon benzeri ağ (9 Mbps, 60 ms) ve 4 kat yavaş işlemci
if (process.env.YAVAS) {
  const cdp = await c.newCDPSession(s);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
const t0 = await s.evaluate(() => performance.now());
// Panel açılır açılmaz sayfada: ekranda görünen panel görsellerinin hepsi yüklenene kadar geçen süre
const hazirSozu = s.evaluate(() => new Promise((bitir) => {
  const bas = performance.now();
  const gorunur = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const st = getComputedStyle(e);
      if (st.display === 'none') return false;
      if (/(auto|scroll|hidden)/.test(st.overflowX + st.overflowY)) { const k = e.getBoundingClientRect(); if (r.bottom <= k.top || r.top >= k.bottom || r.right <= k.left || r.left >= k.right) return false; }
    }
    return true;
  };
  const bak = () => {
    const p = document.querySelector('[data-kp-panel="ikon"]');
    const g = p && !p.hidden ? [...p.querySelectorAll('img')].filter(gorunur) : [];
    if (g.length && g.every((i) => i.complete && i.naturalWidth)) return bitir({ ms: Math.round(performance.now() - bas), adet: g.length });
    if (performance.now() - bas > 20000) return bitir({ ms: null, adet: g.length });
    setTimeout(bak, 20);
  };
  bak();
}));
await s.locator('.kp-arac-dugme[data-kp-adim="ikon"]').click();
const hazir = await hazirSozu;
console.log('Görsel paneli açıldı → ekrandaki görseller hazır:', hazir.ms, 'ms (' + hazir.adet + ' görsel)');
await s.waitForTimeout(6000);
const sonra = (await kaynak()).filter((r) => r.startTime >= t0 - 50);
console.log('Görsel paneli açıldıktan sonra (6 s):', sonra.length, 'yeni patch görseli');
ozet(sonra.map((r) => ({ ...r, startTime: r.startTime - t0, responseEnd: r.responseEnd - t0 })));
const panel = await s.evaluate(() => { const im = [...document.querySelectorAll('[data-kp-panel="ikon"] img')]; const gor = im.filter((i) => { const r = i.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }); return { toplam: im.length, gorunen: gor.length, hazir: gor.filter((i) => i.complete && i.naturalWidth).length, lazy: im.filter((i) => i.loading === 'lazy').length }; });
console.log('İkon paneli img:', JSON.stringify(panel));
await t.close();
