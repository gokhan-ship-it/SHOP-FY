// Önizleme linkinde Piramit Alfabe: set kartı, otomatik renkler, renk satırı, balon, karıştır, sepet varyantları ve özet → sepeti boşalt
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node canli-piramit.mjs [isim]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const cikti = new URL('ekran/canli-piramit/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const PIRAMIT = '9722983907614';
const ISIM = process.argv[2] || 'deniz';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const bizim = [];
s.on('pageerror', (e) => bizim.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
const cdp = await c.newCDPSession(s);
const dokun = async (q) => {
  const [x, y] = await s.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, q);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(x), y: Math.round(y), id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(250);
};
const satirRenkleri = () => s.$$eval('.kp-renk-harf', (h) => h.map((x) => {
  const sec = x.querySelector('.kp-nokta[aria-pressed="true"]') || x.querySelector('.kp-nokta--pasif');
  return sec ? sec.getAttribute('title') : null;
}));
const sonuc = {};
await s.goto('https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766', { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
await s.waitForTimeout(3000);
await s.keyboard.press('Escape');
await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
sonuc.tema = await s.evaluate(() => Shopify.theme.id);
const veri = await s.evaluate((id) => {
  const v = JSON.parse(document.querySelector('[id^="KisiselVeri-"]').textContent);
  const p = v.setler.find((x) => String(x.id) === id);
  return { setler: v.setler.map((x) => x.baslik || x.ad || x.id), piramitVaryant: p && p.varyantlar.length,
    renkKoduOlan: p && p.varyantlar.filter((x) => x.renk_kodu).length, gorselOlan: p && p.varyantlar.filter((x) => x.gorsel || x.png || x.onizleme).length,
    ornek: p && p.varyantlar.slice(0, 2) };
}, PIRAMIT);
sonuc.veri = veri;
await s.locator('kisisel-kart input[value="kisisel"]').dispatchEvent('click');
await s.waitForSelector('.kp-editor:not([hidden])');
await s.waitForTimeout(1000);
sonuc.setKartlari = await s.locator('[data-kp-set]').count();
await s.locator('#kp-isim').fill(ISIM);
await s.locator(`label:has([data-kp-set][value="${PIRAMIT}"])`).click();
await s.waitForTimeout(1500);
sonuc.isim = await s.locator('#kp-isim').inputValue();
sonuc.otomatikRenkler = await satirRenkleri();
sonuc.noktaPx = await s.$$eval('.kp-renkler .kp-nokta', (n) => [...new Set(n.map((x) => Math.round(x.getBoundingClientRect().width)))]);
sonuc.noktaRenkleri = await s.$$eval('.kp-renk-harf', (h) => h.map((x) => [...x.querySelectorAll('.kp-nokta')].map((n) => n.getAttribute('title') + ' ' + getComputedStyle(n).backgroundColor).join(' / ')));
sonuc.gorselYuklendi = await s.$$eval('.kp-parca--letter img', (i) => i.map((x) => x.complete && x.naturalWidth > 0));
sonuc.uyari = (await s.locator('[data-kp-isim-uyari]').innerText()).replace(/\s+/g, ' ');
await s.locator('kisisel-kart, .kp-editor').first().scrollIntoViewIfNeeded().catch(() => {});
await s.locator('.kp-onizleme, .kp-gorunum').first().scrollIntoViewIfNeeded();
await s.screenshot({ path: cikti + '01-otomatik.png' });
await s.locator('[data-kp-renkler]').scrollIntoViewIfNeeded();
await s.screenshot({ path: cikti + '02-renk-satiri.png' });
// Karıştır
const once = (await satirRenkleri()).join();
let sonra = once;
for (let i = 0; i < 8 && sonra === once; i++) { await s.locator('[data-kp-karistir]').click(); await s.waitForTimeout(200); sonra = (await satirRenkleri()).join(); }
sonuc.karistir = [once, sonra];
// Balon: ilk harfe dokun
await s.locator('.kp-onizleme, .kp-gorunum').first().scrollIntoViewIfNeeded();
await dokun('[data-uid="isim-0"]');
sonuc.balon = { gorunur: await s.locator('[data-kp-balon]').isVisible(), noktalar: await s.$$eval('[data-kp-balon] .kp-nokta', (n) => n.map((x) => x.getAttribute('title') + ' ' + Math.round(x.getBoundingClientRect().width) + 'px')) };
await s.waitForTimeout(800);
await s.screenshot({ path: cikti + '03-balon.png' });
const balonButon = s.locator('[data-kp-balon] button.kp-nokta[aria-pressed="false"]').first();
if (await balonButon.count()) { const r = await balonButon.getAttribute('title'); await balonButon.click(); await s.waitForTimeout(500); sonuc.balondanSecim = [r, (await satirRenkleri())[0]]; }
await s.screenshot({ path: cikti + '04-balon-secim.png' });
// Sepet
const secilen = await satirRenkleri();
console.log(JSON.stringify(sonuc, null, 1));
for (let i = 0; i < 4 && !(await s.locator('.kp-ozet').isVisible()); i++) { await s.locator('[data-kp-ileri]').click(); await s.waitForTimeout(400); }
sonuc.ozet = (await s.locator('.kp-ozet').innerText()).replace(/\s+/g, ' ');
await s.screenshot({ path: cikti + '05-ozet.png' });
await s.locator('[data-kp-ileri]').click();
await s.waitForSelector('.kp-editor', { state: 'hidden' });
await s.locator('[id^="ProductSubmitButton-"]').first().click();
await s.waitForTimeout(5000);
await s.screenshot({ path: cikti + '06-sepet.png' });
const sepet = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()));
sonuc.secilen = secilen;
sonuc.sepet = { toplam: sepet.total_price, kalemler: sepet.items.map((i) => ({ baslik: i.product_title + ' / ' + i.variant_title, adet: i.quantity, fiyat: i.final_line_price, ozellik: Object.fromEntries(Object.entries(i.properties || {}).filter(([k]) => !k.startsWith('_'))) })) };
await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
sonuc.sepetSonra = (await s.evaluate(() => fetch('/cart.js').then((r) => r.json()))).item_count;
sonuc.bizimHatalar = bizim;
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
