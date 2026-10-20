// Tek patch'lik ürün (Çok Amaçlı Mini Çanta, harita.tek_patch, 5 cm Velcro) uçtan uca: adımlar Yazı / İkon / Özet
// (Aksesuar yok), hazır setler yok; tek karakter yazılır, yeni karakter öncekinin yerine geçer; ikon yazının, yazı ikonun,
// ikon ikonun yerine geçer (bildirimle); en büyük ikon da geçerli ve Velcro'nun ortasında; patch sürüklenmez;
// geri al tek adımda önceki patch'e döner; sepete taban ürün + tek patch.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node tek-patch-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const H = 'cok-amacli-mini-canta-kirmizi-beyaz-zikzak';
const od = JSON.parse(readFileSync(kok + 'veri/urunler/on-dolgu.json', 'utf8'))[H].sekiller[0];
const png = readFileSync(kok + 'veri/urunler/png/' + H + '.png');
const EN = 1600, BOY = 735;
const yuzde = (v, t) => Math.round((v / t) * 100000) / 1000;
const harita = {
  surum: 2, kalibre: true, gorsel: { en: EN, boy: BOY }, tek_patch: true, izinler: { set: false, aksesuar: false },
  zones: [{ id: 'velcro', ad: 'Velcro', shape: 'circle', x: yuzde(od.x, EN), y: yuzde(od.y, BOY), w: yuzde(od.w, EN), h: yuzde(od.h, BOY), cap_cm: 5, allowed_types: ['letter', 'number', 'icon'] }],
  forbidden: []
};
const ham = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const html = ham.replace(/(<script type="application\/json" id="KisiselVeri-main">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
  const v = JSON.parse(json);
  v.gorsel = { en: EN, boy: BOY, kucuk: '/canta.png', buyuk: '/canta.png', dev: '/canta.png' };
  v.harita = harita;
  v.urun.metin_siniri = null;
  // En büyük ikon testi için Sevimli Köpek (7,5 × 8 cm) stokta
  v.ikonlar.forEach((i) => { if (i.id === 3) i.varyantlar[0].stok = 5; });
  return a + JSON.stringify(v) + b;
});
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/canta.png') return r.fulfill({ contentType: 'image/png', body: png });
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  if (url.pathname.startsWith('/api/')) return r.fulfill({ contentType: 'application/json', body: '{"data":{}}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const O = '.kp-onizleme ';
const parcalar = () => s.$$eval(O + '.kp-sahne__parcalar > .kp-parca', (x) => x.map((e) => e.className.match(/kp-parca--(letter|number|icon)/)[1] + ':' + (e.getAttribute('data-grup') || '')));
const hatali = () => s.locator(O + '.kp-parca--hatali').count();
const bildirim = async () => ((await s.locator('[data-kp-bildirim]').isVisible()) ? (await s.locator('[data-kp-bildirim]').innerText()).trim() : '');
// Parçanın merkezi ile Velcro dairesinin (alan çizgisi) merkezi arasındaki uzaklık, Velcro çapına oranla
const merkezFarki = () => s.evaluate((q) => {
  const p = document.querySelector(q + '.kp-sahne__parcalar > .kp-parca').getBoundingClientRect();
  const v = document.querySelector(q + '.kp-alan').getBoundingClientRect();
  return Math.hypot(p.x + p.width / 2 - (v.x + v.width / 2), p.y + p.height / 2 - (v.y + v.height / 2)) / v.width;
}, O);

await s.goto('https://jantifox.test/products/x');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator(O + '.kp-sahne').waitFor();

// Adımlar: Yazı, İkon (Aksesuar yok); alan çizgisi Velcro dairesi (5 cm)
assert.deepEqual(await s.$$eval('.kp-arac-dugme[data-kp-adim]', (x) => x.map((e) => e.getAttribute('data-kp-adim'))), ['yazi', 'ikon']);
const velcro = await s.locator(O + '.kp-alan').boundingBox();
const sahne = await s.locator(O + '.kp-sahne').boundingBox();
const oran = velcro.width / sahne.width;
assert.ok(Math.abs(oran - od.w / EN) < 0.01, 'alan çizgisi Velcro kadar: ' + oran.toFixed(3));
assert.match(await s.locator('#kp-yazi-ipucu').innerText(), /Bu çantaya tek patch takılır/);
assert.equal(await s.locator('#kp-isim').getAttribute('placeholder'), 'ör. A ya da 7');

// Tek harf ortada; yeni harf öncekinin yerine geçer; iki harf yazılamaz
const girdi = s.locator('#kp-isim');
await girdi.click();
await s.keyboard.type('e');
await s.waitForTimeout(150);
assert.equal(await girdi.inputValue(), 'E');
assert.deepEqual(await parcalar(), ['letter:isim']);
assert.equal(await hatali(), 0);
assert.ok((await merkezFarki()) < 0.05, 'E Velcro\'nun ortasında');
await s.keyboard.type('k');
await s.waitForTimeout(150);
assert.equal(await girdi.inputValue(), 'K', 'yeni harf öncekinin yerine');
await girdi.fill('ECE');
await s.waitForTimeout(150);
assert.equal(Array.from(await girdi.inputValue()).length, 1);
assert.deepEqual(await parcalar(), ['letter:isim']);
assert.match(await s.locator('[data-kp-kapasite]').textContent(), /^1 \/ 1$/);
assert.equal(await s.locator('[data-kp-sinir-notu]').count(), 0, 'karakter sınırı uyarısı yerine ipucu');

// İkon: hazır setler yok, tek patch notu; ikon yazının yerine geçer
await s.locator('[data-kp-adim="ikon"]').click();
assert.equal(await s.locator('[data-kp-hazir-set]').count(), 0);
assert.equal(await s.locator('.kp-gorsel-bolum__ad', { hasText: 'Hazır setler' }).count(), 0);
assert.match(await s.locator('[data-kp-tek-patch-notu]').innerText(), /tek patch/);
await s.locator('[data-kp-ikon="2"]').first().click();
await s.waitForTimeout(150);
assert.deepEqual((await parcalar()).map((x) => x.split(':')[0]), ['icon']);
assert.equal(await girdi.inputValue(), '', 'yazı kalktı');
assert.match(await bildirim(), /Bu çantaya tek patch takılır\. Futbol Topu, E harfi yerine geçti\./);
assert.ok((await merkezFarki()) < 0.05, 'ikon ortada');

// Geri al: tek adımda E harfine döner; yinele ikona
await s.locator('[data-kp-geri-al]').click();
await s.waitForTimeout(150);
assert.deepEqual(await parcalar(), ['letter:isim']);
await s.locator('[data-kp-yinele]').click();
await s.waitForTimeout(150);
assert.deepEqual((await parcalar()).map((x) => x.split(':')[0]), ['icon']);

// En büyük ikon (7,5 × 8 cm) öncekinin yerine geçer, geçerli ve ortada
await s.locator('[data-kp-ikon="3"]').first().click();
await s.waitForTimeout(150);
assert.equal((await parcalar()).length, 1);
assert.equal(await hatali(), 0);
assert.match(await bildirim(), /Sevimli Köpek, Futbol Topu yerine geçti/);
assert.ok((await merkezFarki()) < 0.05, 'büyük ikon ortada');
const buyuk = await s.locator(O + '.kp-sahne__parcalar > .kp-parca').boundingBox();
assert.ok(buyuk.width > velcro.width * 1.3, 'büyük ikon Velcro\'dan büyük çizildi');

// Sürükleme: patch yerinden oynamaz
const cdp = await baglam.newCDPSession(s);
const x = buyuk.x + buyuk.width / 2, y = buyuk.y + buyuk.height / 2;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 8, y: y + i * 4 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await s.waitForTimeout(200);
const sonra = await s.locator(O + '.kp-sahne__parcalar > .kp-parca').boundingBox();
assert.ok(Math.abs(sonra.x - buyuk.x) < 1 && Math.abs(sonra.y - buyuk.y) < 1, 'sürüklenmedi');

// Yazı ikonun yerine geçer
await s.locator('[data-kp-adim="yazi"]').click();
await girdi.click();
await s.keyboard.type('7');
await s.waitForTimeout(150);
assert.deepEqual(await parcalar(), ['number:isim']);
assert.match(await bildirim(), /Bu çantaya tek patch takılır\. Yazı ikonun yerine geçti\./);

// Özet ve sepet: taban ürün + tek patch
await s.locator('[data-kp-ileri]').click();
assert.equal(await s.locator('[data-kp-ileri]').getAttribute('aria-disabled'), 'false');
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
const [baz, ...patchler] = eklenen.items;
assert.equal(baz.properties['Tasarım'], '7');
assert.equal(patchler.length, 1);
assert.equal(patchler[0].quantity, 1);

assert.deepEqual(hatalar, []);
await t.close();
console.log('TEK PATCH E2E TAMAM');
