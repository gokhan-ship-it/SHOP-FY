// Aksesuar tasarım ekranından çıkış ve toplam: Vazgeç / geri oku / Esc; yeni aksesuar eklenmez (patch varsa sorulur),
// düzenlemede son yerleştirilen hale dönülür; çantadaki tasarım hiç değişmez. Alt toplam tüm tasarımı gösterir.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node aksesuar-vazgec-e2e.mjs  (önce: node sayfa-uret.mjs)
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
s.on('dialog', (d) => { hatalar.push('beklenmeyen tarayıcı onayı: ' + d.message()); d.dismiss(); });
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const metin = async (q) => (await s.locator(q).first().innerText()).replace(/\s+/g, ' ').trim();
const gorunur = (q) => s.locator(q).first().isVisible();
const ana = '.kp-editor:not(.kp-editor--alt)';
const alt = '.kp-editor--alt';
const anaTasarim = () => s.evaluate(() => JSON.stringify(document.querySelector('kisisel-kart').editor.t));

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
// Çantaya bir ikon ekle (çantadaki tasarım)
await s.locator(ana + ' [data-kp-adim="ikon"]').click();
await s.locator(ana + ' [data-kp-kategori="Spor"]').click();
await s.locator(ana + ' [data-kp-ikon="2"]').click();
if (await gorunur(ana + ' [data-kp-secim-kaldir]')) await s.locator(ana + ' [data-kp-secim-kaldir]').click();
await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
const bas = await anaTasarim();

// 1) Boş aksesuar ekranı: Vazgeç → sormadan kapanır, aksesuar eklenmez, Aksesuar adımında kalınır
await s.locator('[data-kp-aksesuar="9101"]').click();
await s.locator(alt).waitFor({ state: 'visible' });
assert.equal(await metin(alt + ' [data-kp-vazgec]'), 'Vazgeç');
assert.equal(await gorunur(alt + ' [data-kp-vazgec]'), true);
// Toplam: çanta 3.000 + Futbol Topu 330 + kalem kutusu 1.700
assert.equal(await metin(alt + ' [data-kp-toplam]'), '5.030 TL');
await s.locator(alt + ' [data-kp-vazgec]').click();
assert.equal(await gorunur(alt), false);
assert.equal(await s.locator(ana + ' .kp-parca--aksesuar').count(), 0, 'aksesuar eklenmedi');
assert.equal(await s.locator(ana + ' [data-kp-panel="aksesuar"]').isVisible(), true, 'Aksesuar adımı');
assert.equal(await anaTasarim(), bas, 'çanta tasarımı aynı');

// 2) Patch eklendiyse sorar: Devam et → ekranda kalır; geri oku → Sil → eklenmez
await s.locator('[data-kp-aksesuar="9101"]').click();
await s.locator(alt).waitFor({ state: 'visible' });
await s.locator('#kpa-isim').fill('ada');
assert.equal(await metin(alt + ' [data-kp-toplam]'), '6.020 TL');
await s.locator('#kpa-isim').blur();
await s.locator(alt + ' [data-kp-vazgec]').click();
assert.equal(await metin(alt + ' .kp-onay__metin'), 'Kalem kutusu tasarımın silinsin mi?');
assert.deepEqual(await s.$$eval(alt + ' .kp-onay__buton', (b) => b.map((x) => x.textContent)), ['Sil', 'Devam et']);
await s.locator(alt + ' .kp-onay__buton', { hasText: 'Devam et' }).click();
assert.equal(await gorunur(alt), true);
assert.equal(await s.locator(alt + ' .kp-parca--letter').count(), 3, 'tasarım duruyor');
await s.locator(alt + ' .kp-geri').click();
assert.equal(await metin(alt + ' .kp-onay__metin'), 'Kalem kutusu tasarımın silinsin mi?');
await s.locator(alt + ' .kp-onay__buton', { hasText: 'Sil' }).click();
assert.equal(await gorunur(alt), false);
assert.equal(await s.locator(ana + ' .kp-parca--aksesuar').count(), 0);
assert.equal(await anaTasarim(), bas, 'çanta tasarımı aynı');

// 3) Yerleştir; kalemle düzenle, değiştir, Vazgeç → Geri al → son yerleştirilen hali (ADA) çantada kalır
await s.locator('[data-kp-aksesuar="9101"]').click();
await s.locator(alt).waitFor({ state: 'visible' });
// Yeniden açıldığında önceki (silinen) tasarım gelmez
assert.equal(await s.locator('#kpa-isim').inputValue(), '');
await s.locator('#kpa-isim').fill('ada');
await s.locator(alt + ' [data-kp-ileri]').click();
if (await gorunur(ana + ' [data-kp-onay]')) await s.locator(ana + ' .kp-onay__buton', { hasText: 'Yer aç' }).click();
assert.equal(await s.locator(ana + ' .kp-parca--aksesuar').count(), 1, 'yerleşti');
assert.equal(await s.locator(ana + ' .kp-aks__parca').count(), 3);
const yerlesik = await anaTasarim();
if (await gorunur(ana + ' [data-kp-secim-kaldir]')) await s.locator(ana + ' [data-kp-secim-kaldir]').click();
await s.locator(ana + ' [data-kp-aks-duzenle]').click();
await s.locator(alt).waitFor({ state: 'visible' });
assert.equal(await s.locator('#kpa-isim').inputValue(), 'ADA');
// Düzenlemede toplam: aksesuar iki kez sayılmaz; kenara alınan Futbol Topu fiyata dahil değil
assert.equal(await metin(alt + ' [data-kp-toplam]'), '5.690 TL');
await s.locator('#kpa-isim').fill('eda');
await s.locator('#kpa-isim').blur();
await s.locator(alt + ' [data-kp-vazgec]').click();
assert.equal(await metin(alt + ' .kp-onay__metin'), 'Değişiklikler geri alınsın mı?');
assert.deepEqual(await s.$$eval(alt + ' .kp-onay__buton', (b) => b.map((x) => x.textContent)), ['Geri al', 'Devam et']);
await s.locator(alt + ' .kp-onay__buton', { hasText: 'Geri al' }).click();
assert.equal(await gorunur(alt), false);
assert.equal(await s.locator(ana + ' .kp-parca--aksesuar').count(), 1, 'aksesuar çantada kaldı');
assert.equal(await anaTasarim(), yerlesik, 'son yerleştirilen hal');
// Değişiklik yoksa Esc sormadan kapatır
await s.locator(ana + ' [data-kp-aks-duzenle]').click();
await s.locator(alt).waitFor({ state: 'visible' });
await s.waitForTimeout(100);
await s.keyboard.press('Escape');
assert.equal(await gorunur(alt), false);
assert.equal(await anaTasarim(), yerlesik);
console.log('hatalar:', hatalar);
assert.equal(hatalar.length, 0);
await t.close();
console.log('AKSESUAR VAZGEÇ E2E TAMAM');
