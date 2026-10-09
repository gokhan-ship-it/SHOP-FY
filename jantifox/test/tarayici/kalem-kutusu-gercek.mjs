// Kalem kutusu gerçek verisiyle: kullanıcının çizdiği harita (veri/aksesuar/haritalar.json) ve düzeltilmiş ön yüz PNG'si
// (veri/aksesuar/duz/). Cool harfleri gerçek ölçüde (4,49 × 6 cm). Aksesuar tasarım ekranı açılır, 3 harfli isim
// logoya değmeden sığar, 4. harf sığmaz uyarısı verir, çantaya yerleşir.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kalem-kutusu-gercek.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const ham = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const haritalar = JSON.parse(readFileSync(new URL('../../veri/aksesuar/haritalar.json', import.meta.url), 'utf8'));
const cikti = new URL('ekran/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const renk of ['kirmizi', 'turuncu']) {
  const png = readFileSync(new URL(`../../veri/aksesuar/duz/kalem-kutusu-${renk}-on.png`, import.meta.url));
  const html = ham.replace(/(<script type="application\/json" id="KisiselVeri-main">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
    const v = JSON.parse(json);
    v.aksesuarlar[0].gorsel = { en: 1200, boy: 655, kucuk: '/kk.png', buyuk: '/kk.png' };
    v.aksesuarlar[0].harita = haritalar['kalem-kutusu-' + renk];
    v.setler[0].varyantlar.forEach((x) => { x.png_en = 4.49; x.png_boy = 6; });
    return a + JSON.stringify(v) + b;
  });
  const baglam = await t.newContext({ ...devices['iPhone 13'] });
  const s = await baglam.newPage();
  const hatalar = [];
  s.on('pageerror', (e) => hatalar.push(e.message));
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/kk.png') return r.fulfill({ contentType: 'image/png', body: png });
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
    return r.fulfill({ contentType: 'text/html', body: html });
  });
  const ana = '.kp-editor:not(.kp-editor--alt)';
  const alt = '.kp-editor--alt';
  await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  if (await s.locator(ana + ' [data-kp-adim="ozet"][aria-current]').count()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
  await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
  await s.locator('[data-kp-aksesuar="9101"]').click();
  await s.locator(alt).waitFor({ state: 'visible' });
  assert.equal(await s.locator(alt + ' .kp-adimlar').isVisible(), true, renk + ': tasarım ekranı açıldı');
  // Velcro alanı yuvarlak köşeli (2 cm), logo yasaklı
  const rx = await s.evaluate((q) => +document.querySelector(q + ' .kp-alan').getAttribute('rx'), alt);
  assert.equal(rx, 2);
  assert.equal(await s.locator(alt + ' .kp-yasak').count(), renk === 'turuncu' ? 2 : 1, 'logo (+ turuncuda D halkası)');
  await s.locator('#kpa-isim').fill('ada');
  await s.waitForTimeout(100);
  assert.equal(await s.locator(alt + ' .kp-parca--letter').count(), 3);
  assert.equal(await s.locator(alt + ' .kp-parca--hatali').count(), 0, renk + ': ADA logoya değmeden sığar');
  await s.screenshot({ path: cikti + `kalem-kutusu-${renk}-ada.png` });
  // 4. harf: sığmaz
  await s.locator('#kpa-isim').fill('adam');
  await s.waitForTimeout(100);
  assert.match(await s.locator(alt).innerText(), /en fazla 3 karakter/, renk + ': 4 harf sığmaz uyarısı');
  await s.locator('#kpa-isim').fill('ada');
  await s.locator(alt + ' [data-kp-ileri]').click();
  await s.waitForTimeout(200);
  assert.equal(await s.locator(alt).isVisible(), false);
  assert.equal(await s.locator(ana + ' .kp-parca--aksesuar').count(), 1, renk + ': çantaya yerleşti');
  assert.equal(await s.locator(ana + ' .kp-aks__parca').count(), 3);
  assert.equal(await s.locator(ana + ' .kp-parca--hatali').count(), 0);
  await s.screenshot({ path: cikti + `kalem-kutusu-${renk}-canta.png` });
  console.log(renk, 'hatalar:', hatalar);
  assert.equal(hatalar.length, 0);
  await baglam.close();
}
await t.close();
console.log('KALEM KUTUSU GERÇEK VERİ TAMAM');
