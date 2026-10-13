// iPhone boyutunda (iPhone Safari kimliği) editörde 6 harf + 2 ikon eklenmiş tasarım: indirilen görsellerin toplam boyutu.
// Boş önbellekle; ürün sayfası ?kisisellestir=1 ile açılır, "ATLASE" yazılır, Görsel aracından ilk kategorinin ilk 2 ikonu
// eklenir. Görseller türüne göre toplanır (patch harf / rakam / ikon, ürün önizlemesi, aksesuar, diğer).
// Kullanım: node test/performans/editor-gorsel-boyut.mjs [tema_id] [handle]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [tema = '', handle = 'bej-tshirt'] = process.argv.slice(2);
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const gorseller = new Map();
s.on('response', async (r) => {
  if (r.request().resourceType() !== 'image') return;
  try {
    const b = await r.body();
    gorseller.set(r.url(), { boyut: b.length, tur: r.headers()['content-type'] || '' });
  } catch (e) {}
});
await s.goto('https://jantifox.com/products/' + handle + '?kisisellestir=1' + (tema ? '&preview_theme_id=' + tema : ''), { waitUntil: 'load', timeout: 90000 });
await s.waitForSelector('.kp-editor:not([hidden]) #kp-isim', { timeout: 30000 });
await s.evaluate(() => document.querySelectorAll('#popupOverlay, .coupon-modal, #shopify-pc__banner').forEach((e) => e.remove()));
await s.locator('#kp-isim').fill('atlase');
await s.waitForTimeout(1500);
await s.locator('.kp-arac-dugme[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-panel="ikon"]').waitFor({ state: 'visible' });
const kendim = s.locator('[data-kp-panel="ikon"] button', { hasText: 'Kendim' }).first();
if (await kendim.count() && await kendim.isVisible()) await kendim.click();
await s.waitForTimeout(800);
const ikonlar = s.locator('[data-kp-panel="ikon"] .kp-secim--ikon:not([disabled]):visible');
for (let i = 0; i < 2; i++) { await ikonlar.nth(i).click(); await s.waitForTimeout(600); }
await s.waitForTimeout(4000);
const parca = await s.evaluate(() => ({ harf: document.querySelectorAll('.kp-onizleme .kp-parca--letter, .kp-onizleme .kp-parca--number').length, ikon: document.querySelectorAll('.kp-onizleme .kp-parca--icon').length }));
const grup = {};
for (const [u, g] of gorseller) {
  const ad = u.split('?')[0].split('/').pop();
  const tur = /kisisel-harf|piramit/.test(ad) ? 'harf' : /kisisel-rakam/.test(ad) ? 'rakam' : /kisisel-ikon/.test(ad) ? 'ikon' : /kisisel-urun|tote-canta/.test(ad) ? 'ürün önizlemesi' : /kisisel-aksesuar/.test(ad) ? 'aksesuar' : 'diğer (tema / ürün fotoğrafı)';
  grup[tur] = grup[tur] || { adet: 0, kb: 0, bicim: {} };
  grup[tur].adet++;
  grup[tur].kb += g.boyut / 1024;
  const b = g.tur.replace('image/', '');
  grup[tur].bicim[b] = (grup[tur].bicim[b] || 0) + 1;
}
Object.values(grup).forEach((g) => { g.kb = Math.round(g.kb); });
const kisisel = Object.entries(grup).filter(([k]) => !k.startsWith('diğer')).reduce((a, [, g]) => a + g.kb, 0);
console.log(JSON.stringify({ tema: tema || 'canlı', handle, parca, kisiselToplamKB: kisisel, grup }));
await t.close();
