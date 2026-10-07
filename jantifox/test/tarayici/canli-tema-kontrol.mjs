// Canlı temada (kişiselleştirme yok) düz sepete ekle: trapFocus hatası temada da var mı?
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const h = [];
s.on('pageerror', (e) => h.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
await s.goto('https://jantifox.com/products/kanvas-lacivert-tote-canta', { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForTimeout(4000);
console.log('tema:', await s.evaluate(() => Shopify.theme.id), '· kart var mı:', await s.locator('kisisel-kart').count());
await s.keyboard.press('Escape');
await s.locator('[id^="ProductSubmitButton-"]').first().dispatchEvent('click');
await s.waitForTimeout(5000);
console.log('sepet:', JSON.stringify((await s.evaluate(() => fetch('/cart.js').then((r) => r.json()))).items.map((i) => [i.title, i.quantity, i.final_line_price])));
await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
console.log('hatalar:', h.filter((x) => !/Failed to fetch/.test(x)));
await t.close();
