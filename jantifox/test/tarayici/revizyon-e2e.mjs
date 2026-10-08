// Mobil arayüz revizyonu: davet kartı, sabit önizleme, eklenenler etiketleri, doluluk, ikon ızgarası ve "Sığmaz",
// ortak uyarı kutusu, alan sınırı, havada araç çubuğu, özetten sepete ekleme, "Sadece çantayı al".
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node revizyon-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
let temaGonder = 0;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  }
  if (url.pathname === '/cart/add') {
    temaGonder++;
    return r.fulfill({ contentType: 'text/html', body: '<p>tema sepeti</p>' });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const cdp = await baglam.newCDPSession(s);
const merkezi = (q) => s.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, q);
const metin = (q) => s.locator(q).textContent();
const gorunur = (q) => s.locator(q).isVisible();

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });

// 1) Davet kartı
const kart = (await s.locator('kisisel-kart').innerText()).replace(/\s+/g, ' ');
assert.match(kart, /Ürünü kişiselleştir/);
assert.match(kart, /İsim, rakam ve ikon patch'lerini seç, ürünün üzerinde canlı gör\./);
assert.match(kart, /Kişiselleştirmeye başla/);
assert.match(kart, /Patch başına 330 TL/);
assert.match(kart, /Sadece çantayı al/);
assert.equal(await s.locator('kisisel-kart input[type="radio"]').count(), 0, 'eski düğme yok');
assert.equal(await s.locator('[data-kisisel-ornek] img, [data-kisisel-ornek] span').count(), 3, 'örnek görselde 3 harf');

// 2) Editör: ilerleme çizgisi başlığın hemen altında, önizleme sabit
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('.kp-editor').waitFor({ state: 'visible' });
const sira = await s.evaluate(() => {
  const y = (q) => document.querySelector(q).getBoundingClientRect().top;
  return { ust: y('.kp-ust'), adim: y('.kp-adimlar'), onizleme: y('.kp-onizleme'), panel: y('.kp-kaydir') };
});
assert.ok(sira.ust < sira.adim && sira.adim < sira.onizleme && sira.onizleme < sira.panel, JSON.stringify(sira));
assert.equal(await s.locator('.kp-adim__cizgi').count(), 4);
assert.match((await s.locator('.kp-adimlar').innerText()).replace(/\s+/g, ' '), /1 Yazı 2 Rakam 3 İkon 4 Özet/);

await s.locator('#kp-isim').fill('ece');
await s.locator('#kp-isim').blur();
await s.locator('[data-kp-adim="ikon"]').click();
await s.waitForTimeout(200);
// Panel kayar, önizleme yerinde kalır
const onizlemeOnce = await s.evaluate(() => document.querySelector('.kp-onizleme').getBoundingClientRect().top);
await s.evaluate(() => { document.querySelector('.kp-kaydir').scrollTop = 400; });
await s.waitForTimeout(100);
assert.equal(await s.evaluate(() => document.querySelector('.kp-onizleme').getBoundingClientRect().top), onizlemeOnce, 'önizleme kaymaz');
await s.evaluate(() => { document.querySelector('.kp-kaydir').scrollTop = 0; });

// 3) İkon ızgarası: 4 sütun, fiyat başlıkta bir kez, kartlarda fiyat yok
assert.equal(await metin('.kp-panel__fiyat'), 'Her patch 330 TL');
assert.equal(await s.locator('[data-kp-panel="ikon"] .kp-secim__fiyat').count(), 0);
const sutun = await s.evaluate(() => getComputedStyle(document.querySelector('.kp-izgara--ikon')).gridTemplateColumns.split(' ').length);
assert.equal(sutun, 4);

// Eklenenler etiketleri ve doluluk
assert.equal(await s.locator('.kp-cip').count(), 1, 'isim etiketi');
assert.equal(await metin('.kp-cip__ad'), 'ECE');
const doluluk0 = await metin('[data-kp-doluluk-metin]');
assert.match(doluluk0, /^Alanın %\d+'(i|ı|u|ü|si|sı) dolu$/);
assert.equal(await s.locator('[data-kp-kalan]').count(), 0, 'eski "ikonluk yer kaldı" cümlesi yok');
assert.equal(await s.locator('[data-kp-eklenen]').count(), 0, 'eski liste yok');

// Futbol Topu ve Musical Note'u alan dolana kadar ekle; Musical Note "Sığmaz" olmalı
await s.locator('[data-kp-kategori="Spor"]').click();
for (let i = 0; i < 20; i++) {
  if (await s.locator('[data-kp-ikon="2"].kp-secim--sigmaz').count()) break;
  await s.locator('[data-kp-ikon="2"]').click();
}
const yuzde = parseInt((await metin('[data-kp-doluluk-metin]')).match(/%(\d+)/)[1], 10);
console.log('doluluk:', await metin('[data-kp-doluluk-metin]'), '· etiket:', await s.locator('.kp-cip').count());
assert.ok(yuzde > parseInt(doluluk0.match(/%(\d+)/)[1], 10));
assert.equal(await s.locator('[data-kp-ikon="2"].kp-secim--sigmaz').count(), 1, 'Futbol Topu artık sığmaz');
assert.equal(await s.locator('[data-kp-ikon="2"] .kp-secim__rozet').isVisible(), true, 'Sığmaz etiketi');
assert.equal(await s.locator('[data-kp-ikon="2"] .kp-secim__rozet').textContent(), 'Sığmaz');
const adet = await s.locator('.kp-cip').count();
await s.locator('[data-kp-ikon="2"]').click();
assert.equal(await s.locator('.kp-cip').count(), adet, 'sığmayan ikon eklenmez');
assert.equal(await gorunur('[data-kp-bildirim]'), true);
assert.equal(await metin('[data-kp-bildirim]'), "Futbol Topu için alanda yer kalmadı. Bir patch'i kaldırmayı ya da daha küçük bir ikon seçmeyi deneyebilirsin.");
await s.screenshot({ path: '/tmp/rev-sigmaz.png' });
// Uyarı birkaç saniye sonra kaybolur
await s.waitForTimeout(3800);
assert.equal(await gorunur('[data-kp-bildirim]'), false, 'uyarı kendiliğinden kapandı');

// Etiketin × ile kaldırma → Sığmaz kalkar
await s.locator('.kp-cip').last().locator('.kp-cip__kaldir').click();
assert.equal(await s.locator('.kp-cip').count(), adet - 1);
assert.equal(await s.locator('[data-kp-ikon="2"].kp-secim--sigmaz').count(), 0, 'yer açılınca Sığmaz kalkar');

// Etikete dokun → patch seçilir, araç çubuğu önizlemenin üzerinde açılır, sayfa kaymaz
const cip = s.locator('.kp-cip').nth(1);
const panelOnce = await s.evaluate(() => document.querySelector('.kp-kaydir').getBoundingClientRect().top);
await cip.locator('.kp-cip__ad').click();
assert.equal(await gorunur('[data-kp-secim-cubuk]'), true);
assert.equal(await cip.getAttribute('class'), 'kp-cip kp-cip--secili');
const arac = await s.evaluate(() => {
  const a = document.querySelector('[data-kp-secim-cubuk]').getBoundingClientRect();
  const o = document.querySelector('.kp-gorunum').getBoundingClientRect();
  const p = document.querySelector('.kp-kaydir').getBoundingClientRect();
  return { icinde: a.top >= o.top && a.bottom <= o.bottom, panelUst: p.top };
});
assert.ok(arac.icinde, 'araç çubuğu önizlemenin üzerinde');
assert.equal(arac.panelUst, panelOnce, 'seçim paneli kaydırmadı');
assert.deepEqual(await s.$$eval('[data-kp-secim-cubuk] button', (b) => b.map((x) => x.textContent.trim())), ['15°', '15°', 'Düzle', 'Sil', 'Tamam']);

// Uyarı ve araç çubuğu aynı anda: uyarı araç çubuğunun üstünde, binmeden
await s.evaluate(() => { const e = document.querySelector('kisisel-kart').editor; e.bildir('deneme', { sure: 0 }); });
const ust = await s.evaluate(() => {
  const b = document.querySelector('[data-kp-bildirim]').getBoundingClientRect();
  const a = document.querySelector('[data-kp-secim-cubuk]').getBoundingClientRect();
  return b.bottom <= a.top;
});
assert.ok(ust, 'uyarı araç çubuğunun üstünde');
await s.evaluate(() => document.querySelector('kisisel-kart').editor.bildirimKapat());
// Tamam seçimi kaldırır
await s.locator('[data-kp-secim-kaldir]').click();
assert.equal(await gorunur('[data-kp-secim-cubuk]'), false);

// 5) Alan sınırı: normalde görünmez; sürüklerken soluk; taşınca kırmızı
const alanOpak = () => s.evaluate(() => getComputedStyle(document.querySelector('.kp-alan')).opacity);
assert.equal(await alanOpak(), '0', 'sınır normalde görünmez');
const p0 = await merkezi('.kp-parca--icon');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p0[0], y: p0[1], id: 0 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0[0] + 4, y: p0[1] + 4, id: 0 }] });
await s.waitForTimeout(300);
const soluk = Number(await alanOpak());
assert.ok(soluk > 0 && soluk < 0.5, 'sürüklerken soluk: ' + soluk);
for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0[0] + i * 40, y: p0[1] + 4, id: 0 }] });
assert.equal(await s.locator('.kp-sahne--tasma').count(), 1);
assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector('.kp-alan')).animationName), 'kp-nabiz');
assert.match(await metin('[data-kp-bildirim]'), /alanın dışına taşıyor\. Bırakırsan son yerine döner\.$/);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await s.waitForTimeout(400);
assert.equal(await s.locator('.kp-sahne--tasma').count(), 0);
assert.equal(await alanOpak(), '0', 'sürükleme bitince sınır kaybolur');

// 8) Rakam kartlarında rakam yazısı yok
await s.locator('[data-kp-adim="rakam"]').click();
assert.equal(await s.locator('[data-kp-panel="rakam"] .kp-secim__ad').count(), 0);
assert.equal(await s.locator('[data-kp-rakam]').first().getAttribute('aria-label'), '0 rakamı');

// 7) Özet: başlık, Sepete ekle · toplam, not ve iki bağlantı
await s.locator('[data-kp-adim="ozet"]').click();
assert.equal(await metin('[data-kp-panel="ozet"] h3'), 'Tasarımın hazır');
assert.match(await metin('[data-kp-ileri]'), /^Sepete ekle · [\d.]+ TL$/);
assert.equal(await gorunur('.kp-alt__ozet .kp-indirim-notu'), true);
assert.equal(await gorunur('[data-kp-duzenle]'), true);
assert.equal(await gorunur('[data-kp-urune-don]'), true);
// "Tasarımı düzenle" İkon adımına döner
await s.locator('[data-kp-duzenle]').click();
assert.equal(await gorunur('[data-kp-panel="ikon"]'), true);
await s.locator('[data-kp-adim="ozet"]').click();
// "Ürün sayfasına dön": tasarım kaydedilir, kart tasarımlı halde
await s.locator('[data-kp-urune-don]').click();
await s.locator('.kp-editor').waitFor({ state: 'hidden' });
assert.equal(await gorunur('[data-kisisel-davet]'), false);
assert.equal(await gorunur('[data-kisisel-govde]'), true);
assert.match(await s.locator('[data-kisisel-govde]').innerText(), /ECE · 3 harf/);
// Tekrar aç → özetten doğrudan sepete ekle
await s.locator('[data-kisisel-govde] [data-kisisel-ac]').click();
await s.locator('[data-kp-adim="ozet"]').click();
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
assert.ok(eklenen && eklenen.items[0].properties['Tasarım'].startsWith('ECE'), 'özetten tasarımla sepete eklendi');

// 1) "Sadece çantayı al": düz ürün akışı (temanın formu, tasarım kalemleri yok)
eklenen = null;
await s.evaluate(() => sessionStorage.clear());
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
await s.evaluate(() => document.querySelector('#product-form-main').addEventListener('submit', () => (window.__duz = 1)));
await s.locator('[data-kisisel-davet] [data-kisisel-sade]').click();
await s.waitForTimeout(500);
assert.equal(eklenen, null, 'tasarım kalemi gitmedi');
assert.ok(temaGonder > 0 || (await s.evaluate(() => window.__duz)) === 1, 'tema formu gönderildi');

assert.deepEqual(hatalar, []);
await t.close();
console.log('REVİZYON E2E TAMAM');
