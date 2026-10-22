// Önizleme temasında (preview_theme_id) temiz tarayıcıyla, masaüstü ve mobil:
// (1) kampanya simülasyonu gizli iframe'den gidiyor ve başarılı (Storefront API isteklerinin çerçevesi, yanıt kodu);
// (2) editörde kampanyalı fiyat görünür, "İndirimler sepette uygulanır" notu görünmez; Özet'te kampanya satırları;
// (3) ara adımlarda Shopify'ın olay akışında product_added_to_cart yok;
// (4) Sepete ekle: sepet satırları, tasarım özellikleri, toplam editördekiyle aynı; (5) ödeme sayfası açılır
// (sipariş verilmez); sonunda sepet boşaltılır. Meta'ya giden tarayıcı istekleri kesilir. Ekran görüntüsü almaz.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node onizleme-kampanya-sepet.mjs <tema id> [masaustu|mobil]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const TEMA = process.argv[2];
const CIHAZ = process.argv[3] || 'masaustu';
if (!TEMA) throw new Error('tema id gerekli');
const URUN = 'https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=' + TEMA;
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext(CIHAZ === 'mobil' ? { ...devices['iPhone 13'], locale: 'tr-TR' } : { viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
await c.route(/facebook\.com\/tr[/?]/, (r) => r.fulfill({ status: 200, body: '' }));
let faz = 'acilis';
const sf = [];
const olaylar = [];
const gorulen = new Set();
c.on('requestfinished', async (r) => {
  const u = r.url();
  if (/\/api\/[0-9-]+\/graphql\.json/.test(u) && /cartCreate/.test(r.postData() || '')) {
    const yanit = await r.response().catch(() => null);
    let veri = false;
    try { const j = await yanit.json(); veri = !!(j && j.data && Object.values(j.data).some((x) => x && x.cart)); } catch (e) {}
    const f = r.frame();
    sf.push({ faz, cerceve: f ? (f.parentFrame() ? 'iframe:' + (f.url() || 'about:blank') : 'ana') : 'yok', kod: yanit ? yanit.status() : null, veri });
  }
});
c.on('request', (r) => {
  if (!/monorail|produce_batch/.test(r.url()) || !r.postData()) return;
  let j; try { j = JSON.parse(r.postData()); } catch (e) { return; }
  const gez = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(gez); if (o.event_name === 'product_added_to_cart' && o.event_id && !gorulen.has(o.event_id)) { gorulen.add(o.event_id); olaylar.push({ faz, id: o.event_id }); } Object.values(o).forEach(gez); };
  gez(j);
});
const s = await c.newPage();
const hatalar = [];
s.on('pageerror', (e) => { if (!/clarity|showPopover/i.test(e.message + (e.stack || ''))) hatalar.push(e.message.slice(0, 140)); });
const bekle = (ms) => s.waitForTimeout(ms);
const temizle = () => s.evaluate(() => document.querySelectorAll('#PBarNextFrameWrapper, .coupon-modal, #popupOverlay').forEach((e) => e.remove()));
await s.goto(URUN, { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.evaluate(() => new Promise((ok) => { const v = () => Shopify.customerPrivacy.setTrackingConsent({ analytics: true, marketing: true, preferences: true, sale_of_data: true }, ok); if (window.Shopify && Shopify.customerPrivacy) v(); else Shopify.loadFeatures([{ name: 'consent-tracking-api', version: '0.1' }], v); setTimeout(ok, 8000); }));
await s.goto(URUN, { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
await bekle(4000);
const sonuc = { cihaz: CIHAZ, tema: await s.evaluate(() => String(Shopify.theme.id)) };
const depo = await s.evaluate(() => Object.keys(localStorage).filter((k) => /kampanya|kural/i.test(k)));
sonuc.temizTarayici = depo.length === 0 ? 'evet' : 'saklı kural var: ' + depo.join(',');
// Editör: 5 harf + 1 ikon
faz = 'ara-adimlar';
await temizle();
await s.locator('kisisel-kart [data-kisisel-ac]').first().click();
await s.locator('.kp-onizleme .kp-sahne').waitFor({ timeout: 20000 });
await bekle(1500);
await s.locator('#kp-isim').click();
for (const h of 'ECEAB') { await s.keyboard.type(h); await bekle(500); }
await s.locator('[data-kp-adim="ikon"]').click();
await bekle(800);
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await bekle(6000);
const fiyat = () => s.evaluate(() => {
  const gor = (e) => !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const notlar = [...document.querySelectorAll('.kp-indirim-notu')].filter(gor).map((e) => e.textContent.trim());
  const toplam = document.querySelector('[data-kp-toplam]');
  return {
    izsizCerceve: !!document.querySelector('iframe[data-kp-izsiz]'),
    toplamMetni: toplam ? toplam.textContent.replace(/\s+/g, ' ').trim() : null,
    eskiFiyatUstuCizili: gor(document.querySelector('[data-kp-toplam] .kp-alt__eski')),
    gorunenNotlar: notlar,
    dugme: (document.querySelector('[data-kp-ileri]') || {}).textContent
  };
});
sonuc.editor = await fiyat();
// Özet
while (!(await s.locator('.kp-ozet').isVisible().catch(() => false))) { await s.locator('[data-kp-ileri]').click(); await bekle(1000); }
await bekle(2500);
sonuc.ozet = await s.evaluate(() => {
  const gor = (e) => !!e && !e.hidden && e.getClientRects().length > 0;
  return { metin: document.querySelector('.kp-ozet').innerText.replace(/\s+/g, ' ').slice(0, 300), gorunenNotlar: [...document.querySelectorAll('.kp-indirim-notu')].filter(gor).length };
});
sonuc.ozetFiyat = await fiyat();
// Sepete ekle
faz = 'sepete-ekle';
await s.locator('[data-kp-ileri]').click();
await bekle(9000);
const sepet = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()));
sonuc.sepet = {
  satir: sepet.items.length, adet: sepet.item_count, liste: sepet.original_total_price / 100, toplam: sepet.total_price / 100,
  indirimler: [...new Set(sepet.items.flatMap((i) => (i.discounts || []).map((d) => d.title)).concat((sepet.cart_level_discount_applications || []).map((d) => d.title)))],
  tasarimId: [...new Set(sepet.items.map((i) => i.properties && i.properties._tasarim_id).filter(Boolean))].length,
  kalemler: sepet.items.map((i) => i.product_title + (i.variant_title ? ' / ' + i.variant_title : '') + ' ×' + i.quantity)
};
// Ödeme sayfası (sipariş verilmez)
faz = 'odeme';
const odeme = await s.goto('https://jantifox.com/checkout', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => ({ status: () => 'hata ' + e.message.slice(0, 60) }));
await bekle(6000);
sonuc.odeme = await s.evaluate(() => ({ adres: location.pathname.replace(/\/[A-Za-z0-9]{20,}/g, '/…'), baslik: document.title, tutarGorunuyor: /5\.?\d{3}|TL|₺/.test(document.body.innerText), urunGorunuyor: /Kanvas Lacivert Tote/.test(document.body.innerText) })).catch((e) => ({ hata: e.message.slice(0, 80) }));
sonuc.odeme.kod = typeof odeme.status === 'function' ? odeme.status() : null;
// Temizlik
faz = 'temizlik';
await s.goto(URUN, { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
sonuc.sepetSonra = (await s.evaluate(() => fetch('/cart.js').then((r) => r.json()))).item_count;
sonuc.storefront = {
  istek: sf.length,
  iframeden: sf.filter((x) => x.cerceve.startsWith('iframe')).length,
  anaPenceredeki: sf.filter((x) => x.cerceve === 'ana').length,
  basarili: sf.filter((x) => x.kod === 200 && x.veri).length
};
sonuc.shopifySepeteEklendi = { 'ara-adimlar': olaylar.filter((x) => x.faz === 'ara-adimlar' || x.faz === 'acilis').length, 'sepete-ekle': olaylar.filter((x) => x.faz === 'sepete-ekle' || x.faz === 'odeme').length };
sonuc.hatalar = hatalar;
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
