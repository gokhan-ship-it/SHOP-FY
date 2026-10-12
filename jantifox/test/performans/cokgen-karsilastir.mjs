// Çokgen alan performansı: aynı editör, üç ürün. (A) Tote: daire alan (örnek sayfa). (B) The Performer: panelde sihirli
// değnekle seçilmiş iki çokgen alan (üst panel + alt cep) ve kalemle çizilmiş yasaklı bölge. (C) The Performer, aynı
// görsel, tek daire alan (geometri farkını ayırmak için). iPhone 13 + CPU 4× yavaşlatma; her biri 5 tekrar, medyan.
// Ölçülen: harf yazma (tuştan sonraki çizime), yazı bloğu ve ikon sürükleme (fps, en uzun kare), set ekleme.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node cokgen-karsilastir.mjs  (önce: node ../tarayici/sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const H = 'the-performer-sirt-cantasi-jantifox-x-le-koko-collectif';
const TEKRAR = Number(process.argv[2]) || 5;
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// Panelde çokgen harita
const panel = await (await t.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
await panel.goto('file://' + kok + 'araclar/alan-paneli/panel.html');
await panel.waitForSelector('svg#sahne image');
const cokgenHarita = await panel.evaluate(async (h) => {
  const A = window.AlanPaneli;
  A.urunSec(h);
  await A.degnekTikla({ x: 640, y: 500 });
  await A.degnekTikla({ x: 640, y: 1250 });
  const d = A.D();
  d.sekiller[1].tipler = ['icon'];
  d.sekiller.push({ id: 'f', tur: 'yasak', shape: 'poly', ad: 'Fermuar', yumusat: 0, noktalar: [[200, 858], [1100, 858], [1100, 900], [200, 900]], x: 200, y: 858, w: 900, h: 42 });
  return A.haritaUret(h);
}, H);
const ilk = cokgenHarita.zones[0];
const daireHarita = { surum: 2, kalibre: true, gorsel: cokgenHarita.gorsel, forbidden: [],
  zones: [{ id: 'on-alan', ad: 'Ön alan', shape: 'circle', x: ilk.x + ilk.w / 2 - 22, y: ilk.y + ilk.h / 2 - 22 * 1295 / 1600, w: 44, h: 44 * 1295 / 1600, cap_cm: Math.round(ilk.genislik_cm * 44 / ilk.w * 100) / 100, allowed_types: ['letter', 'number', 'icon'] }] };

const ham = readFileSync(new URL('../tarayici/sayfa.html', import.meta.url), 'utf8');
const png = readFileSync(kok + 'veri/urunler/png/' + H + '.png');
const sayfa = (harita) => !harita ? ham : ham.replace(/(<script type="application\/json" id="KisiselVeri-main">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
  const v = JSON.parse(json);
  v.gorsel = { en: 1295, boy: 1600, kucuk: '/canta.png', buyuk: '/canta.png' };
  v.harita = harita;
  v.urun.metin_siniri = null;
  return a + JSON.stringify(v) + b;
});
const TURLER = [['A daire (tote)', sayfa(null)], ['B cokgen (performer)', sayfa(cokgenHarita)], ['C daire (performer)', sayfa(daireHarita)]];

const ARAC = () => {
  const o = (window.__olc = { tus: [] });
  document.addEventListener('keydown', (e) => { const t0 = e.timeStamp; requestAnimationFrame(() => setTimeout(() => o.tus.push(performance.now() - t0), 0)); }, true);
  o.kareBaslat = () => { o.kareler = []; const n = (o.nesil = (o.nesil || 0) + 1); const f = (t) => { if (o.nesil !== n) return; o.kareler.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f); };
  o.kareBitir = () => { o.nesil++; const k = o.kareler; const ar = []; for (let i = 1; i < k.length; i++) ar.push(k[i] - k[i - 1]); return ar; };
  o.islem = (fn) => new Promise((r) => { const t0 = performance.now(); fn(); requestAnimationFrame(() => setTimeout(() => r(performance.now() - t0), 0)); });
};
const medyan = (a) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const kareOzet = (ar) => ({ fps: Math.round((ar.length * 1000) / ar.reduce((a, b) => a + b, 0)), enUzun: Math.round(Math.max(...ar)) });

const sonuc = {};
for (const [ad, html] of TURLER) {
  const ol = { tus: [], tusP95: [], isimFps: [], isimEnUzun: [], ikonFps: [], ikonEnUzun: [], set: [], acilis: [] };
  for (let k = 0; k < TEKRAR; k++) {
    const baglam = await t.newContext({ ...devices['iPhone 13'] });
    const s = await baglam.newPage();
    const cdp = await baglam.newCDPSession(s);
    await s.route('https://jantifox.test/**', async (r) => {
      const url = new URL(r.request().url());
      if (url.pathname === '/canta.png') return r.fulfill({ contentType: 'image/png', body: png });
      if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
      if (url.pathname.startsWith('/api/')) return r.fulfill({ contentType: 'application/json', body: '{"data":{}}' });
      return r.fulfill({ contentType: 'text/html', body: html });
    });
    await s.addInitScript(ARAC);
    await s.goto('https://jantifox.test/products/x');
    await s.waitForTimeout(300);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    ol.acilis.push(await s.evaluate(() => window.__olc.islem(() => document.querySelector('[data-kisisel-davet] [data-kisisel-ac]').click())));
    await s.waitForTimeout(500);
    const girdi = s.locator('#kp-isim');
    await girdi.focus();
    await s.evaluate(() => { window.__olc.tus.length = 0; });
    for (const h of 'ADAM') { await s.keyboard.press(h); await s.waitForTimeout(300); }
    await s.waitForTimeout(500);
    const tus = await s.evaluate(() => window.__olc.tus.slice());
    ol.tus.push(medyan(tus));
    ol.tusP95.push(Math.max(...tus));
    await girdi.blur();
    const surukle = async (secici) => {
      const b = await s.locator(secici).first().boundingBox();
      const x0 = b.x + b.width / 2, y0 = b.y + b.height / 2;
      await s.evaluate(() => window.__olc.kareBaslat());
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
      for (let i = 1; i <= 60; i++) {
        const f = i / 60;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + Math.sin(f * Math.PI * 2) * 40, y: y0 + Math.sin(f * Math.PI) * 30 }] });
        await s.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      return kareOzet(await s.evaluate(() => window.__olc.kareBitir()));
    };
    const ri = await surukle('.kp-onizleme [data-uid="isim-0"]');
    ol.isimFps.push(ri.fps); ol.isimEnUzun.push(ri.enUzun);
    await s.locator('.kp-arac-dugme[data-kp-adim="ikon"]').click();
    await s.locator('[data-kp-panel="ikon"]').waitFor({ state: 'visible' });
    await s.waitForTimeout(300);
    ol.set.push(await s.evaluate(() => window.__olc.islem(() => document.querySelector('[data-kp-hazir-set="8001"]').click())));
    await s.waitForTimeout(400);
    if (await s.locator('.kp-onizleme .kp-sahne__parcalar > .kp-parca--icon').count()) {
      const rk = await surukle('.kp-onizleme .kp-sahne__parcalar > .kp-parca--icon');
      ol.ikonFps.push(rk.fps); ol.ikonEnUzun.push(rk.enUzun);
    }
    await baglam.close();
  }
  sonuc[ad] = Object.fromEntries(Object.entries(ol).map(([k, v]) => [k, Math.round(medyan(v))]));
  console.log(ad, JSON.stringify(sonuc[ad]));
}
mkdirSync(new URL('sonuclar/', import.meta.url), { recursive: true });
writeFileSync(new URL('sonuclar/cokgen-karsilastir.json', import.meta.url), JSON.stringify({ zaman: new Date().toISOString(), tekrar: TEKRAR, kosul: 'iPhone 13, CPU 4x', sonuc }, null, 1));
await t.close();
