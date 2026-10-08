// Kenar (çantaya takılmamış patch'ler), serbest yerleştirme, Geri al / Yinele, set ve ikon her zaman eklenir,
// sepette "Durum: Takılmamış", galeri görselinde yalnızca takılmış patch'ler.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kenar-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const metin = async (q) => (await s.locator(q).first().innerText()).replace(/\s+/g, ' ').trim();
const gorunur = (q) => s.locator(q).first().isVisible();
const cdp = await baglam.newCDPSession(s);
const dokun = (tip, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tip, touchPoints: tip === 'touchEnd' ? [] : [{ x, y, id: 0 }] });
const surukle = async (x0, y0, x1, y1) => {
  await dokun('touchStart', x0, y0);
  for (let i = 1; i <= 10; i++) await dokun('touchMove', x0 + ((x1 - x0) * i) / 10, y0 + ((y1 - y0) * i) / 10);
  await dokun('touchEnd');
  await s.waitForTimeout(120);
};
const merkez = async (q) => { const b = await s.locator(q).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
const kenarSayisi = () => s.locator('[data-kp-kenar-grup]').count();
const cipler = () => s.$$eval('.kp-editor .kp-cip__ad', (b) => b.map((x) => x.textContent));

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();

// 1) Önizlemede geri al / yinele (sol üst), başta soluk; kenar şeridi boş
assert.equal(await gorunur('[data-kp-geri-al]'), true);
assert.equal(await s.locator('[data-kp-geri-al]').isDisabled(), true);
assert.equal(await s.locator('[data-kp-yinele]').isDisabled(), true);
const [gr, gv] = await s.evaluate(() => ['[data-kp-geri-al]', '[data-kp-gorunum]'].map((q) => document.querySelector(q).getBoundingClientRect()).map((r) => [r.left, r.top]));
const sahneSol = await s.evaluate(() => document.querySelector('.kp-gorunum').getBoundingClientRect().left);
assert.ok(gr[0] - sahneSol < 20 && gv[0] > gr[0], 'geri al sol üstte, Tüm çantayı gör sağda');
assert.equal(await gorunur('[data-kp-kenar]'), false, 'kenar boşken görünmez');
assert.equal(await kenarSayisi(), 0);
assert.equal((await metin('[data-kp-etiketler]').catch(() => '')), '', 'boşken eklenenler yazısı yok');

// 2) Bir ikon ekle; çantadan kenara sürükle: kenarda, eklenenlerde ↧, fiyat aynı, kenar notu
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-kategori="Spor"]').click();
await s.locator('[data-kp-ikon="2"]').click();
if (await gorunur('[data-kp-secim-kaldir]')) await s.locator('[data-kp-secim-kaldir]').click();
const toplam0 = await metin('[data-kp-toplam]');
const ikon = await merkez('.kp-onizleme .kp-parca--icon');
const ic = await s.locator('.kp-onizleme__ic').boundingBox();
const kenar = [ic.x + ic.width / 2, ic.y + ic.height - 22];
// Sürüklerken kenar bölgesi kırmızı kesikli "Kenara bırak" olarak belirir, bitince kaybolur
await dokun('touchStart', ikon[0], ikon[1]);
for (let i = 1; i <= 10; i++) await dokun('touchMove', ikon[0] + ((kenar[0] - ikon[0]) * i) / 10, ikon[1] + ((kenar[1] - ikon[1]) * i) / 10);
assert.equal(await gorunur('[data-kp-kenar]'), true, 'sürüklerken kenar bölgesi görünür');
assert.equal(await metin('[data-kp-kenar]'), 'Kenara bırak');
assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector('[data-kp-kenar]')).borderTopStyle), 'dashed');
assert.equal(await s.locator('.kp-kenar--hedef').count(), 1, 'üstündeyken hedef');
await dokun('touchEnd');
await s.waitForTimeout(120);
assert.equal(await kenarSayisi(), 1, 'kenara alındı');
assert.equal(await s.locator('.kp-onizleme__ic--surukle').count(), 0);
assert.equal(await gorunur('[data-kp-kenar]'), true, 'kenarda patch varken şerit görünür');
assert.equal(await metin('[data-kp-kenar] .kp-kenar__bas'), '↧ Kenar 1 patch');
const kb = await s.locator('[data-kp-kenar]').boundingBox();
assert.ok(Math.abs(kb.y + kb.height - (ic.y + ic.height)) < 2 && kb.height < 56, 'şerit önizlemenin alt kenarında, ince');
assert.equal(await s.locator('.kp-onizleme .kp-parca--icon').count(), 0, 'önizlemede çizilmez');
assert.deepEqual(await cipler(), ['↧Futbol Topu']);
assert.equal(await metin('[data-kp-toplam]'), toplam0, 'kenardaki de fiyatlanır');
assert.match(await metin('[data-kp-kenar-not]'), /^Kenarda 1 patch var\./);
// Yakın görünümde alan şeridin üstünde kalan bölgeye ortalanır: daire şeridin altına girmez
await s.waitForTimeout(400); // geçiş animasyonu
const dAlt = await s.evaluate(() => document.querySelector('.kp-gorunum ellipse').getBoundingClientRect().bottom);
assert.ok(dAlt <= (await s.locator('[data-kp-kenar]').boundingBox()).y + 1, 'daire şeridin üstünde: ' + dAlt);
assert.equal(await s.locator('[data-kp-geri-al]').isDisabled(), false);

// 3) Geri al → çantaya döner; Yinele → tekrar kenarda; Ctrl+Z / Shift+Ctrl+Z
await s.locator('[data-kp-geri-al]').click();
assert.equal(await kenarSayisi(), 0);
assert.equal(await s.locator('.kp-onizleme .kp-parca--icon').count(), 1);
await s.locator('[data-kp-yinele]').click();
assert.equal(await kenarSayisi(), 1);
await s.locator('.kp-onizleme__ic').click({ position: { x: 5, y: 200 } }).catch(() => {});
await s.locator('[data-kp-gorunum]').focus();
await s.keyboard.press('Control+z');
assert.equal(await kenarSayisi(), 0, 'Ctrl+Z');
await s.keyboard.press('Control+Shift+z');
assert.equal(await kenarSayisi(), 1, 'Shift+Ctrl+Z');

// 4) Kenardan çantaya sürükle: bırakılan yerde
const oge = await merkez('[data-kp-kenar-grup]');
const daire = await s.evaluate(() => { const r = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await surukle(oge[0], oge[1], daire[0], daire[1]);
assert.equal(await kenarSayisi(), 0, 'kenardan çantaya');
const yeni = await merkez('.kp-onizleme .kp-parca--icon');
assert.ok(Math.hypot(yeni[0] - daire[0], yeni[1] - daire[1]) < 12, 'bırakılan yerde: ' + yeni + ' / ' + daire);
assert.deepEqual(await cipler(), ['Futbol Topu']);

// 5) Yarısı dairede: geçersiz (kırmızı); tamamen kenarda: geçerli
const k5 = await s.locator('.kp-onizleme .kp-parca--icon').boundingBox();
const d5 = await s.evaluate(() => { const r = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect(); return { x: r.x, w: r.width, y: r.y, h: r.height }; });
if (await gorunur('[data-kp-secim-kaldir]')) await s.locator('[data-kp-secim-kaldir]').click();
await surukle(k5.x + k5.width / 2, k5.y + k5.height / 2, d5.x + 2, d5.y + d5.h / 2);
assert.equal(await s.locator('.kp-parca--hatali').count(), 1, 'yarısı dışarıda: geçersiz');
assert.match(await metin('.kp-cip--hatali .kp-cip__ad'), /^⚠Futbol Topu/);

// 6) Özet: geçersiz varken sepete eklenmez; liste + Hepsini düzelt
await s.locator('[data-kp-adim="ozet"]').click();
assert.equal(await gorunur('[data-kp-ozet-yer]'), true);
assert.match(await metin('[data-kp-ozet-yer]'), /Futbol Topu Velcro alanın dışına taşıyor\./);
assert.equal(await s.locator('[data-kp-ileri]').getAttribute('aria-disabled'), 'true');
await s.locator('[data-kp-ileri]').click({ force: true });
assert.equal(eklenen, null, 'sepete eklenmedi');
assert.match(await metin('[data-kp-bildirim]'), /Yeri uygun olmayan patch'ler var/);
await s.locator('[data-kp-ozet-yer] [data-kp-hepsini-duzelt]').click();
assert.equal(await gorunur('[data-kp-ozet-yer]'), false);
assert.equal(await s.locator('.kp-parca--hatali').count(), 0);

// 7) Set her zaman eklenir: alan doluyken sığmayanlar kenara, bildirim + Geri al (setin tamamı)
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-kategori="Spor"]').click();
for (let i = 0; i < 8; i++) await s.locator('[data-kp-ikon="2"]').click();
const kenarOnce = await kenarSayisi();
const cipOnce = (await cipler()).length;
await s.locator('[data-kp-ikon-yol="set"]').click();
assert.equal(await s.locator('[data-kp-hazir-set] .kp-secim__rozet').count(), 0, 'Yer aç etiketi yok');
await s.locator('[data-kp-hazir-set="8001"]').click();
const setBildirim = await metin('[data-kp-bildirim]');
console.log('set bildirimi:', setBildirim);
assert.match(setBildirim, /^School Vibes seti eklendi\. (\d'(i|si|ü|ı|u) çantada, \d'(i|si|ü|ı|u) alanda yer olmadığı için kenarda|Alanda yer olmadığı için \d patch'in hepsi kenarda)\. Geri al$/);
assert.ok((await kenarSayisi()) > kenarOnce, 'sığmayanlar kenarda');
const cipSet = (await cipler()).length;
const kenarSet = await kenarSayisi();
await s.locator('[data-kp-bildirim-eylem]').click();
assert.equal((await cipler()).length, cipOnce, 'Geri al setin tamamını kaldırır');
assert.equal(await kenarSayisi(), kenarOnce);
await s.locator('[data-kp-yinele]').click();
assert.equal((await cipler()).length, cipSet, 'Yinele seti tek adımda geri getirir');
assert.equal(await kenarSayisi(), kenarSet);
await s.locator('[data-kp-geri-al]').click();
assert.equal((await cipler()).length, cipOnce, 'Geri al (düğme) setin tamamını kaldırır');

// 8) Sepet: kenardaki "Durum: Takılmamış"; konumda e:1; galeride yalnızca takılmış
await s.locator('[data-kp-ikon-yol="kendim"]').click();
await s.locator('[data-kp-kategori="Spor"]').click();
for (let i = 0; i < 12 && !(await kenarSayisi()); i++) await s.locator('[data-kp-ikon="2"]').click();
assert.ok(await kenarSayisi(), 'yer kalmayınca ikon da kenara');
await s.locator('[data-kp-adim="ozet"]').click();
if (await gorunur('[data-kp-ozet-yer]')) await s.locator('[data-kp-ozet-yer] [data-kp-hepsini-duzelt]').click();
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
const satirlar = eklenen.items.filter((k) => k.id === 3002);
const kenarSatiri = satirlar.find((k) => k.properties.Durum === 'Takılmamış');
const takiliSatir = satirlar.find((k) => !k.properties.Durum);
console.log('satırlar:', satirlar.map((k) => [k.quantity, k.properties.Durum || '-']));
assert.ok(kenarSatiri && takiliSatir, 'kenardakiler ayrı satır');
const konum = JSON.parse(eklenen.items[0].properties._tasarim_konum);
assert.equal(konum.p.filter((x) => x.e === 1).length, kenarSatiri.quantity);
const kit = await s.evaluate(() => JSON.parse(localStorage.getItem('kisisel-sepet-cizim')));
const kimlik = eklenen.items[0].properties._tasarim_id;
assert.equal(kit[kimlik].p.length, takiliSatir.quantity, 'sepet görselinde yalnızca takılmış patch\'ler');

console.log('hatalar:', hatalar);
assert.deepEqual(hatalar, []);
await t.close();
console.log('KENAR E2E TAMAM');
