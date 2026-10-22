// Meta AddToCart ölçümü (canlı ya da önizleme teması): facebook.com/tr isteklerini (tüm çerçeveler ve worker'lar) olay
// adına göre sayar; Meta'ya ulaşmadan kesilir (ölçüm Meta verisini kirletmez). Ayrıca Shopify'ın olay akışındaki
// product_added_to_cart, /cart/add|update|change.js ve Storefront API cartCreate çağrılarını aşama aşama sayar.
// Aşamalar: (1) ara adımlar: editörü aç, 5 harf yaz, ikon ekle, patch sürükle, önizleme görünümü; (2) Sepete ekle;
// (3) normal ürün sayfasında standart Sepete ekle. Sonunda sepet boşaltılır. Ekran görüntüsü almaz.
// Not: Sunucu tarafı (Conversions API) olaylar tarayıcıdan görünmez.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node meta-atc-olcum.mjs [tema id] [çıktı.json] [yerel kisisel-editor.js]
// Üçüncü argüman verilirse temanın kisisel-editor.js'i bu yerel dosyayla değiştirilir (yayınlamadan "sonra" ölçümü).
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const TEMA = process.argv[2] || '';
const CIKTI = process.argv[3] || '';
const YEREL = process.argv[4] || '';
const ek = TEMA ? '?preview_theme_id=' + TEMA : '';
const KISISEL = 'https://jantifox.com/products/kanvas-lacivert-tote-canta' + ek;
const STANDART = 'https://jantifox.com/products/futbol-topu-patch' + ek;

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
let faz = 'yukleme';
const gorulen = new Set();
const kayit = [];
const sayac = {};
const say = (anahtar) => {
  sayac[faz] = sayac[faz] || {};
  sayac[faz][anahtar] = (sayac[faz][anahtar] || 0) + 1;
};
const fbOlay = (url, govde) => {
  const q = new URL(url).searchParams;
  let ev = q.get('ev');
  let id = q.get('id');
  let eid = q.get('eid');
  let cd = null;
  if (!ev && govde) {
    const b = new URLSearchParams(govde);
    ev = b.get('ev'); id = b.get('id'); eid = b.get('eid');
    cd = b.get('cd[value]');
  }
  if (!cd) cd = q.get('cd[value]');
  return { ev, id, eid, deger: cd, para: q.get('cd[currency]') };
};
c.on('request', (r) => {
  const u = r.url();
  if (/facebook\.com\/tr[/?]/.test(u)) {
    const o = fbOlay(u, r.postData());
    if (!o.ev) return;
    say('fb:' + o.ev + (o.id ? '@' + o.id : ''));
    kayit.push({ faz, ...o });
  } else if (/monorail|produce_batch/.test(u) && r.postData()) {
    // Shopify olayları benzersiz event_id ile (aynı olay birden çok şemada tekrar eder); Meta'ya Conversions API ile
    // giden olayların kimliği budur
    let j = null;
    try { j = JSON.parse(r.postData()); } catch (e) { return; }
    const gez = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach(gez);
      if ((o.event_name === 'product_added_to_cart' || o.event_name === 'checkout_started') && o.event_id) {
        const k = o.event_name + '|' + o.event_id;
        if (!gorulen.has(k)) {
          gorulen.add(k);
          say('shopify:' + o.event_name);
          kayit.push({ faz, shopify: o.event_name, eventID: o.event_id, deger: o.total_value, para: o.currency, capi: o.facebook_capi_enabled, urun: (o.products || []).map((x) => { try { return JSON.parse(x).name; } catch (e) { return x; } }).join(', ') });
        }
      }
      Object.values(o).forEach(gez);
    };
    gez(j);
  } else if (/\/cart\/(add|update|change|clear)(\.js)?(\?|$)/.test(u) && r.method() === 'POST') {
    const tur = u.match(/\/cart\/(add|update|change|clear)/)[1];
    say('cart/' + tur);
    if (tur === 'add') {
      try { const j = JSON.parse(r.postData() || '{}'); say('cart/add satır:' + (j.items ? j.items.length : 1)); } catch (e) { say('cart/add form'); }
    }
  } else if (/\/api\/[0-9-]+\/graphql\.json/.test(u) && r.postData()) {
    const n = (r.postData().match(/cartCreate/g) || []).length;
    say('storefront cartCreate×' + n);
  }
});
if (YEREL) {
  const kod = readFileSync(YEREL, 'utf8');
  await c.route(/\/assets\/kisisel-editor\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: kod }));
}
// Meta'ya giden istek sayıldıktan sonra kesilir
await c.route(/facebook\.com\/tr[/?]/, (r) => r.fulfill({ status: 200, contentType: 'image/gif', body: '' }));
// Meta'nın betiği otomasyon tarayıcısında (navigator.webdriver) ağa göndermeyebilir: işaret gizlenir. Ayrıca her
// çerçevede fbq(...) çağrıları kaydedilir: Shopify'ın Meta uygulaması olayları fbq('trackShopify', piksel, olay, veri,
// {eventID}) ile tetikler; aynı eventID ile Shopify sunucusundan Conversions API olayı da gider.
await c.addInitScript(() => {
  try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); } catch (e) {}
  window.__fbq = [];
  let gercek;
  const sar = (f) => {
    if (!f || f.__sarili) return f;
    const yeni = function () {
      try { window.__fbq.push(JSON.parse(JSON.stringify(Array.from(arguments)))); } catch (e) { window.__fbq.push([String(arguments[0]), String(arguments[1]), String(arguments[2])]); }
      return f.apply(this, arguments);
    };
    Object.keys(f).forEach((k) => { yeni[k] = f[k]; });
    ['callMethod', 'queue', 'loaded', 'version'].forEach((k) => Object.defineProperty(yeni, k, { get: () => f[k], set: (v) => { f[k] = v; } }));
    yeni.__sarili = true;
    return yeni;
  };
  Object.defineProperty(window, 'fbq', { configurable: true, get: () => gercek, set: (v) => { gercek = sar(v); } });
});
const fbqTopla = async () => {
  const cagrilar = await s.evaluate(() => { const a = window.__fbq || []; window.__fbq = []; return a; }).catch(() => []);
  cagrilar.forEach((a) => {
    const [yontem] = a;
    if (yontem === 'trackShopify' || yontem === 'track' || yontem === 'trackSingle') {
      const olay = yontem === 'track' ? a[1] : a[2];
      const veri = yontem === 'track' ? a[2] : a[3];
      const sec = yontem === 'track' ? a[3] : a[4];
      say('fbq:' + yontem + ':' + olay);
      kayit.push({ faz, fbq: yontem, olay, piksel: yontem === 'track' ? 'hepsi' : a[1], deger: veri && veri.value, para: veri && veri.currency, icerik: veri && (veri.content_name || veri.content_ids), eventID: sec && sec.eventID });
    } else if (yontem === 'trackCustom' || yontem === 'trackSingleCustom') {
      say('fbq:' + yontem + ':' + (yontem === 'trackCustom' ? a[1] : a[2]));
    }
  });
};

let s;
const hatalar = [];
s = await c.newPage();
s.on('pageerror', (e) => { if (!/clarity|showPopover/i.test(e.message + (e.stack || ''))) hatalar.push(e.message.slice(0, 140)); });
const bekle = (ms) => s.waitForTimeout(ms);
// Çerez onayı (pazarlama dahil) verilir: Meta pikseli yalnızca izinle çalışır
await s.goto(KISISEL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.evaluate(() => new Promise((tamam) => {
  const ver = () => window.Shopify.customerPrivacy.setTrackingConsent({ analytics: true, marketing: true, preferences: true, sale_of_data: true }, () => tamam());
  if (window.Shopify && window.Shopify.customerPrivacy) ver();
  else window.Shopify.loadFeatures([{ name: 'consent-tracking-api', version: '0.1' }], ver);
  setTimeout(tamam, 8000);
}));
await s.goto(KISISEL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
await bekle(6000);
const tema = await s.evaluate(() => String(window.Shopify && Shopify.theme && Shopify.theme.id));
const izin = await s.evaluate(() => window.Shopify && Shopify.customerPrivacy && Shopify.customerPrivacy.currentVisitorConsent && Shopify.customerPrivacy.currentVisitorConsent());

await fbqTopla();
// (1) Ara adımlar
faz = 'ara-adimlar';
await s.keyboard.press('Escape');
await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) w.remove(); document.querySelectorAll('.coupon-modal, #popupOverlay').forEach((e) => e.remove()); });
await s.locator('kisisel-kart [data-kisisel-ac]').first().click();
await s.locator('.kp-onizleme .kp-sahne').waitFor({ timeout: 20000 });
await bekle(1500);
const girdi = s.locator('#kp-isim');
await girdi.click();
for (const h of 'ECEAB') { await s.keyboard.type(h); await bekle(700); }
await bekle(1500);
await s.locator('[data-kp-adim="ikon"]').click();
await bekle(800);
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await bekle(2000);
// Bir patch'i sürükle
const p = await s.locator('.kp-onizleme .kp-sahne__parcalar > .kp-parca').last().boundingBox();
if (p) {
  await s.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await s.mouse.down();
  for (let i = 1; i <= 10; i++) await s.mouse.move(p.x + p.width / 2 + i * 4, p.y + p.height / 2 + i * 2);
  await s.mouse.up();
}
await bekle(1500);
// Önizleme: tüm ürünü gör / alana yakınlaş
const gor = s.locator('[data-kp-gorunum]');
if (await gor.isVisible()) { await gor.click(); await bekle(800); await gor.click(); await bekle(800); }
// Özet adımına geç (henüz sepete eklemeden)
const ileri = s.locator('[data-kp-ileri]');
let adim = 0;
while (adim < 4 && !(await s.locator('.kp-ozet').isVisible().catch(() => false))) { await ileri.click(); adim++; await bekle(1200); }
await bekle(4000);
const parcaSayisi = await s.locator('.kp-onizleme .kp-sahne__parcalar > .kp-parca').count();
const ozet = (await s.locator('.kp-ozet').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 220);

await fbqTopla();
// (2) Sepete ekle (tek tıklama)
faz = 'sepete-ekle';
await ileri.click();
await bekle(9000);
const sepet = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()));
const sepetOzet = { satir: sepet.items.length, adet: sepet.item_count, toplam: sepet.total_price / 100 };

await fbqTopla();
// (3) Normal ürün sayfası, standart Sepete ekle
faz = 'standart-urun';
await s.goto(STANDART, { waitUntil: 'domcontentloaded', timeout: 60000 });
await bekle(5000);
await fbqTopla();
faz = 'standart-sepete-ekle';
// Kupon açılır penceresi tıklamayı kapatmasın
await s.keyboard.press('Escape');
await s.evaluate(() => document.querySelectorAll('.coupon-modal, #popupOverlay').forEach((e) => e.remove()));
const dugme = s.locator('[id^="ProductSubmitButton-"]').first();
const standartVar = await dugme.isVisible().catch(() => false);
if (standartVar) { await dugme.click().catch((e) => hatalar.push('standart tık: ' + e.message.slice(0, 80))); await bekle(8000); }

await fbqTopla();
// Temizlik
faz = 'temizlik';
await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
await bekle(1500);
const sonuc = { tema, izin, parcaSayisi, ozet, sepetOzet, standartVar, sayac, kayit, hatalar };
console.log(JSON.stringify({ tema, izin, parcaSayisi, sepetOzet, standartVar, sayac, hatalar }, null, 1));
if (CIKTI) writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
await t.close();
