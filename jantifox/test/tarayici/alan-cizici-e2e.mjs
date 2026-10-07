// Alan çizici: görsel yükle, daire çiz, tutamaçla büyüt, ölçü gir, yasaklı bölge, JSON
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node alan-cizici-e2e.mjs <png>
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const png = process.argv[2];
const cikti = new URL('ekran/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await (await t.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
await s.goto('file://' + new URL('../../araclar/alan-cizici.html', import.meta.url).pathname);
await s.setInputFiles('#dosya', png);
await s.waitForSelector('svg#sahne image');
const g = await s.evaluate(() => AlanCizici.durum.gorsel);
// görsel px → ekran koordinatı
const ekran = async (x, y) => s.evaluate(([x, y]) => {
  const svg = document.querySelector('#sahne'); const p = svg.createSVGPoint(); p.x = x; p.y = y;
  const q = p.matrixTransform(svg.getScreenCTM()); return [q.x, q.y];
}, [x, y]);
const surukle = async (a, b) => { await s.mouse.move(...a); await s.mouse.down(); await s.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); await s.mouse.move(...b); await s.mouse.up(); };

// Daire: (540,860)'tan (1300,1620)'ye sürükle → kare kalmalı
await s.click('[data-arac="circle"]');
await surukle(await ekran(540, 860), await ekran(1300, 1600));
let sk = await s.evaluate(() => AlanCizici.durum.sekiller[0]);
assert.equal(sk.shape, 'circle'); assert.ok(Math.abs(sk.w - sk.h) < 0.01, 'daire kare kalmalı');
// JSON henüz yok (ölçü girilmedi)
assert.equal(await s.inputValue('#cikti'), '');
assert.match(await s.textContent('#cikti-durum'), /gerçek ölçüsünü gir/);
// Sağ alt tutamaçla büyüt
const se = await s.locator('[data-tutamac="se"]').boundingBox();
await surukle([se.x + se.width / 2, se.y + se.height / 2], [se.x + se.width / 2 + 30, se.y + se.height / 2 + 30]);
const sk2 = await s.evaluate(() => AlanCizici.durum.sekiller[0]);
assert.ok(sk2.w > sk.w && Math.abs(sk2.w - sk2.h) < 0.01 && Math.abs(sk2.x - sk.x) < 0.01, 'karşı köşe sabit, büyüdü');
// Gövdeden taşı
const [cx, cy] = await ekran(sk2.x + sk2.w / 2, sk2.y + sk2.h / 2);
await surukle([cx, cy], [cx - 20, cy - 10]);
const sk3 = await s.evaluate(() => AlanCizici.durum.sekiller[0]);
assert.ok(sk3.x < sk2.x && Math.abs(sk3.w - sk2.w) < 0.01, 'taşındı, boyut korundu');
// Sayısal ince ayar: tam değerler
await s.fill('#o-x', '520'); await s.fill('#o-y', '860'); await s.fill('#o-w', '840');
// Ölçü: çap 25 cm
await s.fill('#o-olcu', '25');
const json = JSON.parse(await s.inputValue('#cikti'));
console.log(JSON.stringify(json));
assert.equal(json.zones[0].cap_cm, 25);
assert.equal(json.zones[0].shape, 'circle');
assert.ok(Math.abs(json.zones[0].w - (840 / g.en) * 100) < 0.01);
assert.deepEqual(json.gorsel, { en: g.en, boy: g.boy });
assert.match(await s.textContent('#olcek-durum'), /1 cm = 33\.6 px/);
// Örnek harf: 5.5 x 6 cm → 184.8 x 201.6 px
const ornek = await s.evaluate(() => { const r = document.querySelector('[data-ornek]'); return [+r.getAttribute('width'), +r.getAttribute('height')]; });
assert.ok(Math.abs(ornek[0] - 184.8) < 0.1 && Math.abs(ornek[1] - 201.6) < 0.1, 'örnek harf gerçek ölçüde');
assert.equal(await s.locator('.ornek.disarda').count(), 0);
await s.screenshot({ path: cikti + 'alan-cizici-1.png' });
// Örnek harfi daire dışına sürükle → kırmızı
const ob = await s.locator('[data-ornek]').boundingBox();
await surukle([ob.x + ob.width / 2, ob.y + ob.height / 2], [ob.x + ob.width / 2 + 400, ob.y + ob.height / 2]);
assert.equal(await s.locator('.ornek.disarda').count(), 1);
// Patch tipi: ikonu kaldır
await s.uncheck('[data-tip="icon"]');
assert.deepEqual(JSON.parse(await s.inputValue('#cikti')).zones[0].allowed_types, ['letter', 'number']);
// Yasaklı dikdörtgen
await s.click('[data-arac="yasak-rect"]');
await surukle(await ekran(900, 700), await ekran(1000, 820));
const j2 = JSON.parse(await s.inputValue('#cikti'));
assert.equal(j2.forbidden.length, 1); assert.equal(j2.forbidden[0].shape, 'rect');
// İçe al: aynı JSON'u geri yükle → aynı çıktı
const once = await s.inputValue('#cikti');
await s.click('#ice-al-ac'); await s.fill('#ice-al', once); await s.click('#ice-al-uygula');
assert.equal(await s.inputValue('#cikti'), once, 'içe al / dışa ver aynı');
await s.screenshot({ path: cikti + 'alan-cizici-2.png' });
console.log('hatalar:', hatalar);
assert.equal(hatalar.length, 0);
await t.close();
console.log('ALAN ÇİZİCİ E2E TAMAM');
