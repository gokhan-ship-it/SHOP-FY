// Gerçek şekil (kontur) ve toleranslar: dairenin kenarına konan yuvarlak ve düzensiz şekilli patch'ler
// kutuları taşsa da kırmızı işaretlenmez; şekil toleransı aşınca işaretlenir. Sürükleyip bırakınca da aynı.
// Set patch'inin adı araç çubuğunda set adı olmadan görünür.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kontur-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const yuvarlak = { v: 1, o: 1, d: 1, p: Array.from({ length: 32 }, (_, i) => [0.5 + 0.5 * Math.cos((i / 32) * 2 * Math.PI), 0.5 + 0.5 * Math.sin((i / 32) * 2 * Math.PI)]) };
const ahtapot = { v: 1, o: 1.0256, d: 0, p: [[0.56, 0], [0.388, 0.026], [0.283, 0.106], [0.207, 0.268], [0.192, 0.381], [0.213, 0.532], [0.06, 0.627], [0, 0.696], [0, 0.771], [0.152, 0.944], [0.263, 0.938], [0.34, 0.998], [0.393, 0.998], [0.475, 0.938], [0.588, 0.991], [0.693, 0.92], [0.76, 0.942], [0.83, 0.926], [0.998, 0.781], [0.967, 0.651], [0.76, 0.523], [0.803, 0.297], [0.758, 0.14], [0.685, 0.056]] };
// Sayfa verisine kontur eklenir (canlı veride liquid kisisellestirme.kontur'u basar): 4 ahtapot (8 × 7), 5 yuvarlak (6 × 6, iki tane eklenebilsin diye stok 5)
const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8').replace(/(<script type="application\/json" id="KisiselVeri-main">)([\s\S]*?)(<\/script>)/, (_, a, j, b) => {
  const v = JSON.parse(j);
  v.ikonlar = v.ikonlar.map((p) => (p.id === 4 ? { ...p, en: '8', boy: '7', kontur: ahtapot } : p.id === 5 ? { ...p, en: '6', boy: '6', kontur: yuvarlak, varyantlar: p.varyantlar.map((v) => ({ ...v, stok: 5 })) } : p));
  return a + JSON.stringify(v) + b;
});
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.route('https://jantifox.test/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 500, body: '' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.waitForTimeout(400);
const ana = '.kp-editor:not(.kp-editor--alt)';

// Patch'i alan merkezinden (yon, uzaklık cm) konuma koyar, yeniler; işaretli patch sayısını ve uyarıyı döndürür
const koy = (urunId, d, yon = 0, aci = 0) => s.evaluate(([urunId, d, yon, aci, ana]) => {
  const e = document.querySelector('kisisel-kart').editor;
  const c = e.m.alanlar[0].sekil;
  const p = e.t.parcalar.find((x) => x.urunId === urunId);
  p.cx = c.cx + Math.cos(yon) * d; p.cy = c.cy + Math.sin(yon) * d; p.aci = aci;
  e.yenile();
  const u = document.querySelector(ana + ' [data-kp-yer-uyari]');
  return { hatali: document.querySelectorAll(ana + ' .kp-parca--hatali').length, uyari: u && !u.hidden ? u.textContent : '', sekil: e.durum.parcalar.find((x) => x.uid === p.uid).sekil.t };
}, [urunId, d, yon, aci, ana]);

// 1) Yuvarlak patch daire kenarında: kutusu taşar ama şekli içeride → uyarı yok; 0,3 cm daha dışarı → uyarı
await s.evaluate(() => document.querySelector('kisisel-kart').editor.ikonEkle(5));
await s.waitForTimeout(200);
let r = await koy(5, 9.6);
assert.equal(r.sekil, 'poly', 'konturlu patch çokgenle denetleniyor');
assert.equal(r.hatali, 0, 'kenardaki yuvarlak patch kırmızı değil');
assert.equal(r.uyari, '');
for (const yon of [Math.PI / 2, Math.PI, 4]) assert.equal((await koy(5, 9.6, yon)).hatali, 0, 'her yönde');
r = await koy(5, 9.9);
assert.equal(r.hatali, 1, 'toleransı aşınca kırmızı');
assert.match(r.uyari, /taşıyor|dışında|alan/i);

// 2) Düzensiz şekilli (ahtapot) patch: dönükken de gerçek şekille
await s.evaluate(() => { const e = document.querySelector('kisisel-kart').editor; e.t.parcalar = []; e.yenile(); e.ikonEkle(4); });
await s.waitForTimeout(200);
for (const aci of [0, 30, 120]) {
  // Kutusunun köşeleri taşacak kadar kenarda, şekli içeride: uyarı yok
  const ust = await s.evaluate(([aci]) => {
    const e = document.querySelector('kisisel-kart').editor;
    const ic = window.KisiselEditorIc;
    const c = e.m.alanlar[0].sekil;
    const t = e.m.ikonHarita[4];
    // Yukarı doğru, şekil olarak kabul edilen en uzak nokta ile kutu olarak kabul edilen en uzak nokta
    let rs = 0, rk = 0;
    for (let d = 0; d < 12; d += 0.1) { if (e.yer.alanaUygun(ic.parcaSekli(t, t.varyant, c.cx, c.cy - d, aci), 'icon')) rs = d; else break; }
    for (let d = 0; d < 12; d += 0.1) { if (e.yer.alanaUygun(ic.geometri.donukDikdortgen(c.cx, c.cy - d, t.en, t.boy, aci), 'icon')) rk = d; else break; }
    return [rs, rk];
  }, [aci]);
  assert.ok(ust[0] > ust[1] + 0.3, aci + '°: şekil ' + ust[0].toFixed(1) + ' cm, kutu ' + ust[1].toFixed(1) + ' cm');
  assert.equal((await koy(4, ust[0], -Math.PI / 2, aci)).hatali, 0, aci + '°: en uzak geçerli konumda kırmızı yok');
  assert.equal((await koy(4, ust[0] + 0.5, -Math.PI / 2, aci)).hatali, 1, aci + '°: biraz daha dışarıda kırmızı');
}

// 3) Sürükle bırak: ortadaki ahtapotu kenara (şekli içeride kalacak yere) sürükle → kırmızı yok, seçim çerçevesi dikdörtgen
await koy(4, 0);
const hedef = await s.evaluate(() => {
  const e = document.querySelector('kisisel-kart').editor;
  const ic = window.KisiselEditorIc;
  const c = e.m.alanlar[0].sekil;
  const t = e.m.ikonHarita[4];
  let rs = 0;
  for (let d = 0; d < 12; d += 0.1) { if (e.yer.alanaUygun(ic.parcaSekli(t, t.varyant, c.cx - d, c.cy, 0), 'icon')) rs = d; else break; }
  const r = e.sahne.sahne.getBoundingClientRect();
  const px = (x, y) => [r.left + (x / e.m.Wcm) * r.width, r.top + (y / e.m.Hcm) * r.height];
  return { bas: px(c.cx, c.cy), son: px(c.cx - rs + 0.3, c.cy), kutuTasar: !e.yer.alanaUygun(ic.geometri.donukDikdortgen(c.cx - rs + 0.3, c.cy, t.en, t.boy, 0), 'icon') };
});
assert.equal(hedef.kutuTasar, true, 'hedefte dikdörtgen kutu taşıyor');
const cdp = await baglam.newCDPSession(s);
const dokun = (tip, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tip, touchPoints: tip === 'touchEnd' ? [] : [{ x, y, id: 0 }] });
await dokun('touchStart', hedef.bas[0], hedef.bas[1]);
for (let i = 1; i <= 12; i++) await dokun('touchMove', hedef.bas[0] + ((hedef.son[0] - hedef.bas[0]) * i) / 12, hedef.bas[1] + ((hedef.son[1] - hedef.bas[1]) * i) / 12);
assert.equal(await s.locator('.kp-sahne--tasma').count(), 0, 'sürüklerken kırmızı sınır yok');
await dokun('touchEnd');
await s.waitForTimeout(200);
assert.equal(await s.locator(ana + ' .kp-parca--hatali').count(), 0, 'bırakınca kırmızı yok');
const cerceve = await s.evaluate(() => { const el = document.querySelector('.kp-cerceve'); return el && !el.hidden ? el.getBoundingClientRect() : null; });
assert.ok(cerceve && cerceve.width > 10 && cerceve.height > 10, 'seçim çerçevesi görünür');

// 4) İki patch toleransla: 0,15 cm binen yuvarlaklar serbest, 0,4 cm binen çakışma
await s.evaluate(() => { const e = document.querySelector('kisisel-kart').editor; e.t.parcalar = []; e.yenile(); e.ikonEkle(5); e.ikonEkle(5); });
await s.waitForTimeout(200);
const binme = (b) => s.evaluate(([b, ana]) => {
  const e = document.querySelector('kisisel-kart').editor;
  const c = e.m.alanlar[0].sekil;
  e.t.parcalar[0].cx = c.cx - 3 + b / 2; e.t.parcalar[0].cy = c.cy; e.t.parcalar[0].aci = 0;
  e.t.parcalar[1].cx = c.cx + 3 - b / 2; e.t.parcalar[1].cy = c.cy; e.t.parcalar[1].aci = 0;
  e.yenile();
  return document.querySelectorAll(ana + ' .kp-parca--hatali').length;
}, [b, ana]);
assert.equal(await binme(0.15), 0);
assert.ok((await binme(0.4)) > 0);

// 5) Set patch'i seçilince araç çubuğunda yalnızca kendi adı
await s.evaluate(() => { const e = document.querySelector('kisisel-kart').editor; e.t.parcalar = []; e.yenile(); e.setEkle(8001); });
await s.waitForTimeout(300);
await s.evaluate(() => { const e = document.querySelector('kisisel-kart').editor; const p = e.durum.parcalar.find((x) => x.setGrup && x.tip === 'icon'); e.sec(p.grup); });
await s.waitForTimeout(100);
const ad = (await s.locator(ana + ' [data-kp-secili-ad]').textContent()).trim();
assert.doesNotMatch(ad, /seti/i, 'araç çubuğunda set adı yok: ' + ad);

assert.deepEqual(hatalar, []);
await t.close();
console.log('kontur-e2e: tamam');
