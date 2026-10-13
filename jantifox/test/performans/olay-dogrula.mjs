// Analitik olaylarının doğrulaması (canlı sitede, iPhone 13 profili): ürün sayfası ?kisisellestir=1 ile açılır, editörde
// isim yazılır, "Tasarımı tamamla" ve "Tasarımımı sepete ekle" basılır. Sayfadan çıkan analitik isteklerinde (Shopify
// monorail, Meta, Google) geçen olay adları yazdırılır. Bu ortamda Meta / Google alan adlarına erişim engelli olabilir;
// istek denemesi yine de görünür. Sepete eklenen ürün yalnızca bu tarayıcı oturumunun sepetindedir.
// Kullanım: node test/performans/olay-dogrula.mjs [ürün handle] [tema_id]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [handle = 'mavi-beyaz-cizgili-spor-canta', tema = ''] = process.argv.slice(2);
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const ADLAR = /product_viewed|product_added_to_cart|page_viewed|cart_viewed|kisisellestirme_acildi|tasarimla_sepete_eklendi|isim_yazildi|tasarim_tamamlandi|ViewContent|AddToCart|PageView|view_item|add_to_cart|page_view/g;
const goruldu = [];
let asama = 'açılış';
c.on('request', (r) => {
  const u = r.url();
  let govde = '';
  try { govde = r.postData() || ''; } catch (e) { /* ikili gövde */ }
  const metin = decodeURIComponent(u) + ' ' + govde;
  const bul = [...new Set(metin.match(ADLAR) || [])];
  if (!bul.length) return;
  let host = '';
  try { host = new URL(u).host; } catch (e) { /* yoksay */ }
  goruldu.push({ asama, host, olay: bul.join(',') });
  if (process.env.AYRINTI && /product_added_to_cart|product_viewed/.test(govde)) {
    try {
      const j = JSON.parse(govde);
      (j.events || []).forEach((e) => {
        const p = e.payload || {};
        const ad = p.event_name || p.eventName || p.name || '';
        if (/product_added_to_cart|product_viewed/.test(JSON.stringify(p).slice(0, 4000))) {
          let ic = {};
          try { ic = JSON.parse(p.payload || p.event_data || '{}'); } catch (x) { ic = p; }
          const d = ic.data || ic.event_data || ic;
          const sat = d.cartLine || d.productVariant ? (d.cartLine || {}) : {};
          const v = (sat.merchandise || d.productVariant || {});
          console.log('  [ayrıntı]', asama, ad, '·', (v.product && v.product.title) || '', '/', v.title || '', '· varyant', v.id || '', '· adet', sat.quantity || '', '· fiyat', (v.price && v.price.amount) || '', '· satır', (sat.cost && sat.cost.totalAmount && sat.cost.totalAmount.amount) || '');
          if (process.env.AYRINTI === '2') console.log(JSON.stringify(p).slice(0, 1500));
        }
      });
    } catch (x) { console.log('  [ayrıntı] çözülemedi', govde.slice(0, 200)); }
  }
});
const adres = 'https://jantifox.com/products/' + handle + '?kisisellestir=1' + (tema ? '&preview_theme_id=' + tema : '');
await s.goto(adres, { waitUntil: 'load', timeout: 90000 });
await s.waitForSelector('.kp-editor:not([hidden]) #kp-isim', { timeout: 60000 });
await s.waitForTimeout(6000);
asama = 'isim';
await s.locator('#kp-isim').fill('ADA');
await s.waitForTimeout(1500);
asama = 'özet';
await s.locator('.kp-editor [data-kp-ileri]').first().click();
await s.waitForTimeout(2500);
const evet = s.locator('.kp-editor button', { hasText: 'Hayır' }).first();
if (await evet.isVisible().catch(() => false)) await evet.click();
asama = 'sepete ekle';
const sepetIstek = s.waitForResponse((r) => /\/cart\/add/.test(r.url()), { timeout: 30000 });
await s.locator('.kp-editor [data-kp-ileri]').first().click();
const cevap = await sepetIstek;
console.log('cart/add:', cevap.status(), (await cevap.json().catch(() => ({}))).items?.length, 'kalem');
await s.waitForTimeout(8000);
const ozet = {};
goruldu.forEach((g) => { const k = g.asama + ' · ' + g.host; ozet[k] = [...new Set((ozet[k] || []).concat(g.olay.split(',')))]; });
Object.entries(ozet).forEach(([k, v]) => console.log(k.padEnd(60), v.join(', ')));
await t.close();
