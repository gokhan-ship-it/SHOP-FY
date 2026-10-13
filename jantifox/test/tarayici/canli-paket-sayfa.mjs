// Canlı "Janti Patch Setini Oluştur" (EB Easy Bundle): set seç, ilk N patch'i ekle, Sepete Ekle, /cart.js toplamı; sonunda sepeti boşaltır (sipariş yok).
// Kullanım: node test/tarayici/canli-paket-sayfa.mjs [2|3|4]. Uygulama ürünleri myshopify.com/api'den çeker; o adres bu ortamda engelli olduğu için aynı mağazanın jantifox.com/api adresine yönlendirilir.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
await c.route(/^https:\/\/qnjwpv-0u\.myshopify\.com\/api\//, (r) => r.continue({ url: r.request().url().replace('https://qnjwpv-0u.myshopify.com', 'https://jantifox.com') }));
const s = await c.newPage();
await s.goto('https://jantifox.com/pages/janti-patch-setini-olustur', { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => console.log('goto', e.message));
await s.waitForTimeout(5000);
await s.evaluate(() => document.querySelectorAll('#popupOverlay, .coupon-modal, #shopify-pc__banner').forEach((e) => e.remove()));
const adet = Number(process.argv[2] || 2);
const urunler = await s.$$eval('.gbbProductItem', (l) => l.map((k) => (k.querySelector('.gbbProductItemTitle')?.innerText || '').trim() + ' = ' + (k.querySelector('.gbbProductItemPrice')?.innerText || '').trim()));
console.log('ÜRÜNLER', urunler.slice(0, 23).join(' ; '));
// Kutu: adet kadar
await s.locator('.gbbBoxSelectionItem', { hasText: adet === 2 ? "2'li" : adet === 3 ? "3'lü" : "4'lü" }).first().click();
await s.waitForTimeout(800);
const butonlar = s.locator('.gbbProductItem .gbbProductAddButton');
for (let i = 0; i < adet; i++) { await butonlar.nth(i).scrollIntoViewIfNeeded(); await butonlar.nth(i).click(); await s.waitForTimeout(900); }
const alt = await s.$eval('.gbbPageFooterHTML', (e) => e.innerText.replace(/\s+/g, ' '));
console.log('ALT ÇUBUK', alt);
await s.locator('.gbbPageFooterHTML').getByText('Sepete Ekle', { exact: false }).first().click();
await s.waitForTimeout(7000);
const sepet = await s.evaluate(async () => (await fetch('/cart.js')).json());
console.log('SEPET toplam', sepet.total_price / 100, 'orijinal', sepet.original_total_price / 100, 'indirim', sepet.total_discount / 100);
for (const l of sepet.items) console.log(' -', l.product_title, '|', l.variant_title, '| adet', l.quantity, '| birim', l.original_price / 100, '| satır', l.final_line_price / 100, '| indirimler', JSON.stringify((l.line_level_discount_allocations || []).map((d) => [d.discount_application.title, d.amount / 100])));
console.log('SEPET indirimleri', JSON.stringify((sepet.cart_level_discount_applications || []).map((d) => [d.title, d.total_allocated_amount / 100])));
await s.evaluate(async () => fetch('/cart/clear.js', { method: 'POST' }));
await t.close();
