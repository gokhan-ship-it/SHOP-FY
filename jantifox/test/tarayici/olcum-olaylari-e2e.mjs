// Ölçüm olayları (2026-10-30): editörü açınca 1 CustomizeProduct (oturumda ürün başına bir kez); yazı, ikon ekle,
// geri al → hiç AddToCart yok; "Tasarımı tamamla" → 1 TasarimTamamlandi (değer = o anki toplam); "Taslak olarak
// kaydet ve çık" → 1 TaslakKaydedildi; tasarımı sepete ekle → tasarım başına tek AddToCart (değer = butondaki tutar,
// içerik = ana ürün + patch ürünleri, event_id kp-atc-<tasarım>), GA4'e de aynı adımlar. Sayfanın fetch / XHR'ı Web
// Pixels Manager gibi sarılır: tasarımın sepete eklemesi de simülasyon gibi sarılmış yoldan geçmez (uygulama satır
// başına olay göndermesin). fbq ve gtag sahte: çağrılar kaydedilir.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node olcum-olaylari-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const veri = JSON.parse(html.match(/<script type="application\/json" id="KisiselVeri-main">([\s\S]*?)<\/script>/)[1]);
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const sarili = [];
const olaylar = [];
await baglam.exposeFunction('__sariliKaydet', (x) => { sarili.push(x); });
await baglam.exposeFunction('__olayKaydet', (x) => { olaylar.push(x); });
await baglam.addInitScript(() => {
  if (window.top !== window) return;
  const f = window.fetch;
  window.fetch = function (u) { window.__sariliKaydet('fetch ' + (u && u.url ? u.url : String(u))); return f.apply(this, arguments); };
  const ac = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { window.__sariliKaydet('xhr ' + String(u)); return ac.apply(this, arguments); };
  // Facebook & Instagram uygulamasının kurduğu fbq ve Google uygulamasının gtag'i yerine
  window.fbq = function () { window.__olayKaydet({ k: 'fbq', a: JSON.parse(JSON.stringify(Array.from(arguments))) }); };
  window.gtag = function () { window.__olayKaydet({ k: 'gtag', a: JSON.parse(JSON.stringify(Array.from(arguments))) }); };
});
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (/^\/api\/[0-9-]+\/graphql\.json$/.test(url.pathname)) return r.fulfill({ contentType: 'application/json', body: '{"data":null}' });
  if (url.pathname === '/cart/add.js') { eklenen = JSON.parse(r.request().postData()); return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }); }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const meta = (ad) => olaylar.filter((o) => o.k === 'fbq' && o.a[2] === ad);
const ga4 = (ad) => olaylar.filter((o) => o.k === 'gtag' && o.a[0] === 'event' && o.a[1] === ad);
const sepete = () => meta('AddToCart').length + ga4('add_to_cart').length;
const bekle = (ms) => s.waitForTimeout(ms);

await s.goto('https://jantifox.test/products/x');
await bekle(500);
assert.equal(olaylar.length, 0, 'sayfa açılışında editör olayı yok');

// 1) Editörü aç → 1 CustomizeProduct
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('.kp-onizleme .kp-sahne').waitFor();
await bekle(300);
assert.equal(meta('CustomizeProduct').length, 1, 'CustomizeProduct');
const cp = meta('CustomizeProduct')[0].a;
assert.equal(cp[0], 'trackSingle');
assert.equal(cp[1], '3419060311599240');
assert.deepEqual(cp[3].content_ids, [String(veri.urun.id)]);
assert.equal(cp[3].value, veri.urun.fiyat / 100);
assert.equal(cp[3].currency, 'TRY');
assert.match(cp[4].eventID, /^kp-cp-/);
assert.equal(ga4('customize_product').length, 1);
assert.equal(ga4('customize_product')[0].a[2].send_to, 'G-QN43QTEZW5');

// 2) Yazı, ikon ekle, geri al → AddToCart yok
await s.locator('#kp-isim').fill('ECE');
await bekle(1200);
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await bekle(600);
await s.locator('[data-kp-geri-al]').click();
await bekle(300);
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await bekle(1200);
assert.equal(sepete(), 0, 'ara adımlarda AddToCart yok');

// 3) "Tasarımı tamamla" → 1 TasarimTamamlandi (Özet'e geçer)
assert.equal(await s.locator('[data-kp-ileri]').textContent(), 'Tasarımı tamamla →');
await s.locator('[data-kp-ileri]').click();
await s.locator('.kp-ozet').waitFor();
await bekle(300);
assert.equal(meta('TasarimTamamlandi').length, 1, 'TasarimTamamlandi');
const tt = meta('TasarimTamamlandi')[0].a;
assert.equal(tt[0], 'trackSingleCustom');
assert.ok(tt[3].value > veri.urun.fiyat / 100, 'değer o anki toplam: ' + tt[3].value);
assert.equal(ga4('design_complete').length, 1);
assert.equal(sepete(), 0);

// 4) Taslak olarak kaydet ve çık → 1 TaslakKaydedildi
await s.locator('[data-kp-alt-ozet] [data-kp-taslak-kaydet]').click();
await bekle(400);
assert.equal(await s.locator('.kp-editor:not(.kp-editor--alt)').isHidden(), true, 'editör kapandı');
assert.equal(meta('TaslakKaydedildi').length, 1, 'TaslakKaydedildi');
assert.equal(meta('TaslakKaydedildi')[0].a[0], 'trackSingleCustom');
assert.equal(meta('TaslakKaydedildi')[0].a[3].value, undefined, 'taslakta değer yok');
assert.equal(ga4('save_draft').length, 1);
assert.equal(sepete(), 0, 'taslakta AddToCart yok');

// 5) Taslağa dön (aynı oturum: CustomizeProduct tekrar yok), Özet'ten sepete ekle → tek AddToCart
await s.locator('.kisisel-kart__butonlar [data-kisisel-ac]').click();
await s.locator('.kp-onizleme .kp-sahne').waitFor();
await bekle(300);
assert.equal(meta('CustomizeProduct').length, 1, 'aynı oturumda ürün başına bir CustomizeProduct');
while (!(await s.locator('.kp-ozet').isVisible().catch(() => false))) { await s.locator('[data-kp-ileri]').click(); await bekle(300); }
await bekle(300);
const buton = (await s.locator('[data-kp-ileri]').textContent()).replace(/\s+/g, ' ');
const tutar = Number(buton.match(/([\d.]+)(?:,(\d+))? TL$/)[1].replace(/\./g, ''));
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
assert.ok(eklenen && eklenen.items.length >= 4, 'gerçek ürünler tek istekte: ' + (eklenen && eklenen.items.length));
assert.equal(meta('AddToCart').length, 1, 'tasarım başına tek AddToCart');
const atc = meta('AddToCart')[0].a;
assert.equal(atc[0], 'trackSingle');
assert.equal(atc[3].value, tutar, 'değer = butondaki ödenecek tutar');
assert.equal(atc[3].currency, 'TRY');
assert.equal(atc[3].content_type, 'product_group');
assert.equal(atc[3].content_ids[0], String(veri.urun.id), 'ilk içerik ana ürün');
assert.ok(atc[3].content_ids.length >= 2, 'patch ürünleri de var: ' + atc[3].content_ids.join(','));
assert.equal(atc[3].num_items, eklenen.items.reduce((t, k) => t + k.quantity, 0));
assert.equal(atc[4].eventID, 'kp-atc-' + eklenen.items[0].properties._tasarim_id, 'event_id tasarım kimliğinden');
assert.equal(ga4('add_to_cart').length, 1);
assert.equal(ga4('add_to_cart')[0].a[2].value, tutar);
assert.equal(ga4('add_to_cart')[0].a[2].items.length, eklenen.items.length);
assert.match(ga4('add_to_cart')[0].a[2].items[0].item_id, /^shopify_ZZ_\d+_\d+$/);
// Ne simülasyon ne de tasarımın gerçek eklemesi sarılmış (izlenen) fetch / XHR'dan geçti
assert.deepEqual(sarili.filter((x) => /\/api\/[0-9-]+\/graphql|\/cart\/add/.test(x)), [], 'izlenen yoldan sepete ekleme yok');
assert.deepEqual(hatalar, []);
await t.close();
console.log('ÖLÇÜM OLAYLARI E2E TAMAM', { olay: olaylar.map((o) => (o.k === 'fbq' ? o.a[2] : o.a[1])).join(', ') });
