// Önizleme linkinde tam akış: ECE + 7 + ikon → sepete ekle → sepet ve EasyBundle kontrolü → sepeti boşalt
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const cikti = new URL('ekran/canli/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const bizim = [];
s.on('pageerror', (e) => bizim.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')));
s.on('console', (m) => { const x = m.text(); if (/kisisel|kp-/i.test(x)) bizim.push(m.type() + ': ' + x); });
const istekler = [];
s.on('request', (r) => { if (/\/cart\/(add|update|change)/.test(r.url())) istekler.push(r.method() + ' ' + r.url().replace(/^https:\/\/[^/]+/, '') + ' ' + (r.postData() || '').slice(0, 120)); });
const sonuc = {};
await s.goto('https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766', { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
// Açılan popup/modal varsa kapat
await s.waitForTimeout(3000);
await s.keyboard.press('Escape');
// Shopify önizleme çubuğu en üst katmanda; müşteride yok, testte gizle
await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
await s.locator('kisisel-kart').scrollIntoViewIfNeeded();
await s.screenshot({ path: cikti + '02-kart.png' });
await s.locator('kisisel-kart input[value="kisisel"]').dispatchEvent('click');
await s.waitForSelector('.kp-editor:not([hidden])');
await s.waitForTimeout(1500);
sonuc.yakinOran = await s.evaluate(() => { const g = document.querySelector('.kp-gorunum').getBoundingClientRect(); const e = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect(); return +(e.width / g.width).toFixed(3); });
sonuc.kalibreNotu = await s.locator('.kp-onizleme__not').count();
await s.screenshot({ path: cikti + '03-editor-yakin.png' });
await s.locator('#kp-isim').fill('ece');
await s.waitForTimeout(300);
sonuc.kapasite = await s.locator('[data-kp-kapasite]').textContent();
await s.screenshot({ path: cikti + '04-ece.png' });
await s.locator('#kp-isim').fill('gökhanxyz');
await s.waitForTimeout(300);
sonuc.uzunIsim = (await s.locator('[data-kp-isim-uyari]').innerText()).replace(/\s+/g, ' ');
await s.locator('#kp-isim').fill('ece');
await s.locator('[data-kp-gorunum]').click();
await s.waitForTimeout(500);
await s.screenshot({ path: cikti + '05-tum-canta.png' });
await s.locator('[data-kp-gorunum]').click();
await s.waitForTimeout(400);
await s.locator('[data-kp-ileri]').click();
const rakam7 = s.locator('[data-kp-rakam]').filter({ hasText: '7' }).first();
await rakam7.click();
await s.locator('[data-kp-ileri]').click();
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await s.waitForTimeout(400);
sonuc.kalan = await s.locator('[data-kp-kalan]').textContent();
await s.screenshot({ path: cikti + '06-ikon.png' });
await s.locator('[data-kp-ileri]').click();
sonuc.ozet = (await s.locator('.kp-ozet').innerText()).replace(/\s+/g, ' ');
await s.screenshot({ path: cikti + '07-ozet.png' });
await s.locator('[data-kp-ileri]').click();
await s.waitForSelector('.kp-editor', { state: 'hidden' });
sonuc.kart = (await s.locator('kisisel-kart').innerText()).replace(/\s+/g, ' ');
sonuc.buton = await s.locator('[id^="ProductSubmitButton-"] span').first().textContent();
sonuc.hemenAlGorunur = await s.locator('[id^="ProductInfo-"] .shopify-payment-button').first().isVisible().catch(() => 'yok');
await s.screenshot({ path: cikti + '08-kart-tasarimli.png' });
// Sepete ekle
await s.locator('[id^="ProductSubmitButton-"]').first().click();
await s.waitForTimeout(5000);
await s.screenshot({ path: cikti + '09-sepet-cekmece.png' });
const sepet = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()));
sonuc.sepet = { toplam: sepet.total_price, kalemler: sepet.items.map((i) => ({ baslik: i.title, adet: i.quantity, fiyat: i.final_line_price, ozellik: i.properties })) };
sonuc.cekmeceRozet = await s.locator('.kp-sepet-rozet').count();
sonuc.cekmeceGrup = await s.locator('.cart-item.kp-sepet-patch').count();
// EasyBundle: bir patch seti ekle, tasarım kalemleri bozulmuyor mu?
const set = await s.evaluate(() => fetch('/products/hearts-patch-seti.js').then((r) => r.json()).catch(() => null));
if (set) {
  const ek = await s.evaluate((id) => fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id, quantity: 1 }] }) }).then((r) => r.status), set.variants[0].id);
  const s2 = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()));
  sonuc.easyBundle = { ekleme: ek, toplam: s2.total_price, kalemler: s2.items.map((i) => i.title + ' x' + i.quantity + ' ' + (i.properties && i.properties._tasarim_id ? '[tasarım]' : '')) };
}
// Sepeti boşalt
await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
sonuc.istekler = istekler;
sonuc.bizimHatalar = bizim;
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
