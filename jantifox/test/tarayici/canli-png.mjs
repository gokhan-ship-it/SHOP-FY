// Önizleme linkinde yeni PNG'leri kontrol eder: veri, Kalpler kategorisi, indirim notu, beyaz kutu yok, sepet akışı
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const cikti = new URL('ekran/canli-png/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push('pageerror: ' + e.message));
const sonuc = {};
await s.goto('https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766', { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
await s.waitForTimeout(3000);
await s.keyboard.press('Escape');
await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
// Veri: PNG'li varyant/ikon sayısı ve ölçüler
sonuc.veri = await s.evaluate(() => {
  const el = document.querySelector('script[id^="KisiselVeri-"]');
  const d = JSON.parse(el.textContent);
  const harf = d.setler.flatMap((p) => p.varyantlar);
  const rakam = d.rakamlar.flatMap((p) => p.varyantlar);
  const pngsiz = (l) => l.filter((v) => !v.png).map((v) => v.karakter);
  return {
    harfPng: harf.filter((v) => v.png).length + '/' + harf.length, harfPngsiz: pngsiz(harf),
    rakamPng: rakam.filter((v) => v.png).length + '/' + rakam.length, rakamPngsiz: pngsiz(rakam),
    ikonPng: d.ikonlar.filter((p) => p.png).length + '/' + d.ikonlar.length,
    ikonPngsiz: d.ikonlar.filter((p) => !p.png).map((p) => p.baslik),
    ornekB: harf.filter((v) => v.karakter === 'B').map((v) => [v.png_en, v.png_boy]),
    kalpler: d.ikonlar.filter((p) => /Kalp/.test(p.baslik)).map((p) => [p.baslik, p.png_en, p.png_boy, p.png_sekil, p.png]),
    tenis: d.ikonlar.filter((p) => /Tenis/.test(p.baslik)).map((p) => [p.sekil, p.png_sekil, p.png_en, p.png_boy])
  };
});
sonuc.kartNotuGizli = await s.locator('[data-kisisel-indirim-notu]').isHidden();
await s.locator('kisisel-kart input[value="kisisel"]').dispatchEvent('click');
await s.waitForSelector('.kp-editor:not([hidden])');
await s.waitForTimeout(1500);
sonuc.altNot = await s.locator('.kp-alt .kp-indirim-notu').first().innerText().catch(() => 'yok');
await s.locator('#kp-isim').fill('becer');
await s.waitForTimeout(500);
sonuc.harfler = await s.evaluate(() => [...document.querySelectorAll('.kp-parca--letter')].map((p) => ({ jpg: p.classList.contains('kp-parca--jpg'), w: Math.round(p.getBoundingClientRect().width), h: Math.round(p.getBoundingClientRect().height) })));
await s.screenshot({ path: cikti + '01-isim.png' });
await s.locator('[data-kp-ileri]').click();
await s.locator('[data-kp-rakam]').filter({ hasText: '7' }).first().click();
await s.locator('[data-kp-ileri]').click();
await s.waitForTimeout(300);
sonuc.kategoriler = await s.locator('[data-kp-kategori]').allInnerTexts();
const kalpKat = s.locator('[data-kp-kategori="Kalpler"]');
if (await kalpKat.count()) {
  await kalpKat.click();
  await s.waitForTimeout(300);
  sonuc.kalpIkonlari = await s.locator('[data-kp-ikon-izgara] [data-kp-ikon]').count();
  await s.locator('[data-kp-ikon-izgara] [data-kp-ikon]:not([disabled])').first().click();
  await s.waitForTimeout(400);
}
sonuc.parcalar = await s.evaluate(() => [...document.querySelectorAll('.kp-parca')].map((p) => p.className.replace('kp-parca ', '')));
await s.screenshot({ path: cikti + '02-kalp.png' });
await s.locator('[data-kp-ileri]').click();
sonuc.ozetNot = await s.locator('.kp-indirim-notu--ozet').innerText().catch(() => 'yok');
await s.screenshot({ path: cikti + '03-ozet.png' });
await s.locator('[data-kp-ileri]').click();
await s.waitForSelector('.kp-editor', { state: 'hidden' });
sonuc.kartNotu = await s.locator('[data-kisisel-indirim-notu]').isVisible();
sonuc.kart = (await s.locator('kisisel-kart').innerText()).replace(/\s+/g, ' ');
await s.locator('[id^="ProductSubmitButton-"]').first().click();
await s.waitForTimeout(5000);
await s.screenshot({ path: cikti + '04-sepet.png' });
const sepet = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()));
sonuc.sepet = { toplam: sepet.total_price, kalemler: sepet.items.map((i) => i.title + ' x' + i.quantity + (i.properties && i.properties._tasarim_id ? ' [tasarım]' : '')) };
await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
sonuc.bosSepet = (await s.evaluate(() => fetch('/cart.js').then((r) => r.json()))).item_count;
sonuc.hatalar = hatalar;
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
