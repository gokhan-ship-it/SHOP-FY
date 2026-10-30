// Ölçüm olayları, gerçek mağazada (önizleme teması ya da canlı): her adımda giden Meta (fbq) çağrıları, GA4 isabetleri
// ve Shopify'ın olay akışındaki product_added_to_cart (sunucu tarafı Conversions API'nin kaynağı) sayılır.
// Adımlar: editörü aç; yazı + ikon ekle, çıkar, geri al; "Tasarımı tamamla"; "Taslak olarak kaydet ve çık"; taslağa dön,
// sepete ekle; normal ürün sayfasından sepete ekle; sepet ve ödeme sayfası (sipariş verilmez); sepet boşaltılır.
// Meta'ya ve GA4'e giden tarayıcı istekleri kesilir (yalnızca sayılır).
// Mod "normal": normal ziyaretçi; Meta çağrıları testin fbq tuzağıyla okunur. Mod "kutu": ?kp_olcum=1 ile; Meta ve
// GA4 çağrıları ölçüm modunun kendi kaydından (kutuda görünen liste) okunur. Ekran görüntüsü almaz.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node olcum-onizleme.mjs <tema id|canli> [masaustu|mobil] [normal|kutu] [çıktı.json]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const TEMA = process.argv[2];
const CIHAZ = process.argv[3] || 'masaustu';
const MOD = process.argv[4] || 'normal';
const CIKTI = process.argv[5] || '';
if (!TEMA) throw new Error('tema id ya da "canli" gerekli');
const ek = (ilk) => (TEMA === 'canli' ? '' : (ilk ? '?' : '&') + 'preview_theme_id=' + TEMA);
const TOTE = 'https://jantifox.com/products/kanvas-lacivert-tote-canta';
const STANDART = 'https://jantifox.com/products/futbol-topu-patch';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext(CIHAZ === 'mobil' ? { ...devices['iPhone 13'], locale: 'tr-TR' } : { viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
let faz = 'acilis';
const kayit = [];
const zaman = { basla: new Date().toISOString() };
await c.route(/facebook\.com\/tr[/?]/, (r) => r.fulfill({ status: 200, body: '' }));
await c.route(/google-analytics\.com\/(g\/)?collect|analytics\.google\.com\/g\/collect/, (r) => {
  const u = new URL(r.request().url());
  const satirlar = [u.search.slice(1)].concat((r.request().postData() || '').split('\n'));
  satirlar.forEach((l) => { const p = new URLSearchParams(l); const en = p.get('en') || u.searchParams.get('en'); if (en && (l === u.search.slice(1) ? !r.request().postData() || p.get('en') : true)) kayit.push({ faz, kanal: 'GA4 isabet', ad: en, tid: u.searchParams.get('tid') }); });
  return r.fulfill({ status: 204, body: '' });
});
const gorulen = new Set();
c.on('request', (r) => {
  if (!/monorail|produce_batch/.test(r.url()) || !r.postData()) return;
  let j; try { j = JSON.parse(r.postData()); } catch (e) { return; }
  const gez = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(gez); if (o.event_name === 'product_added_to_cart' && o.event_id && !gorulen.has(o.event_id)) { gorulen.add(o.event_id); kayit.push({ faz, kanal: 'Shopify (CAPI kaynağı)', ad: 'product_added_to_cart', kimlik: o.event_id, deger: o.total_value, capi: o.facebook_capi_enabled }); } Object.values(o).forEach(gez); };
  gez(j);
});
await c.addInitScript(() => {
  try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); } catch (e) {}
  if (window.top !== window) return;
  window.__fbq = [];
  let gercek;
  const sar = (f) => {
    if (!f || f.__sarili) return f;
    const yeni = function () { try { window.__fbq.push(JSON.parse(JSON.stringify(Array.from(arguments)))); } catch (e) {} return f.apply(this, arguments); };
    Object.keys(f).forEach((k) => { yeni[k] = f[k]; });
    ['callMethod', 'queue', 'loaded', 'version'].forEach((k) => Object.defineProperty(yeni, k, { get: () => f[k], set: (v) => { f[k] = v; } }));
    yeni.__sarili = true;
    return yeni;
  };
  if (/kp_olcum/.test(document.cookie + sessionStorage.getItem('kp_olcum_acik') + location.search)) return;
  Object.defineProperty(window, 'fbq', { configurable: true, get: () => gercek, set: (v) => { gercek = sar(v); } });
});
const s = await c.newPage();
const hatalar = [];
s.on('pageerror', (e) => { if (!/clarity|showPopover|unshift/i.test(e.message + (e.stack || ''))) hatalar.push(e.message.slice(0, 140)); });
const bekle = (ms) => s.waitForTimeout(ms);
let kutuGorulen = 0;
const topla = async () => {
  if (MOD === 'kutu') {
    const liste = await s.evaluate(() => (window.kpOlcum && window.kpOlcum.olaylar) || []).catch(() => []);
    liste.slice(kutuGorulen).forEach((o) => { if (o.kanal !== 'GA4') kayit.push({ faz, kanal: o.kanal, yontem: o.kaynak, ad: o.ad, deger: o.deger, kimlik: o.kimlik, not: o.not }); });
    kutuGorulen = Math.max(kutuGorulen, liste.length);
    return;
  }
  const a = await s.evaluate(() => { const x = window.__fbq || []; window.__fbq = []; return x; }).catch(() => []);
  a.forEach((x) => {
    const y = x[0];
    if (!/^track/.test(y)) return;
    const tek = /Single/.test(y) || y === 'trackShopify';
    const v = (tek ? x[3] : x[2]) || {};
    kayit.push({ faz, kanal: 'Meta', yontem: y, ad: tek ? x[2] : x[1], deger: v.value, kimlik: ((tek ? x[4] : x[3]) || {}).eventID, icerik: v.content_ids, adet: v.num_items });
  });
};
const temizle = () => s.evaluate(() => document.querySelectorAll('#PBarNextFrameWrapper, .coupon-modal, #popupOverlay').forEach((e) => e.remove()));
const izin = () => s.evaluate(() => new Promise((ok) => { const v = () => Shopify.customerPrivacy.setTrackingConsent({ analytics: true, marketing: true, preferences: true, sale_of_data: true }, ok); if (window.Shopify && Shopify.customerPrivacy) v(); else Shopify.loadFeatures([{ name: 'consent-tracking-api', version: '0.1' }], v); setTimeout(ok, 8000); }));
const adim = async (ad, is) => { await topla(); faz = ad; await is(); await bekle(2500); await topla(); };

await s.goto(TOTE + ek(true), { waitUntil: 'domcontentloaded', timeout: 60000 });
await izin();
await s.goto(TOTE + ek(true) + (MOD === 'kutu' ? (TEMA === 'canli' ? '?' : '&') + 'kp_olcum=1' : ''), { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
await bekle(5000);
// Ölçüm kutusu küçültülür (telefonda editörün üstünde kalmasın); kayıt sürer
if (MOD === 'kutu') await s.locator('[data-kp-olcum] button', { hasText: '–' }).click().catch(() => {});
const sonuc = { cihaz: CIHAZ, tema: await s.evaluate(() => String(Shopify.theme.id)) };
await adim('1-editoru-ac', async () => {
  await temizle();
  await s.locator('kisisel-kart [data-kisisel-ac]').first().click();
  await s.locator('.kp-onizleme .kp-sahne').waitFor({ timeout: 20000 });
});
await adim('2-ekle-cikar-geri-al', async () => {
  await s.locator('#kp-isim').click();
  for (const h of 'ECEAB') { await s.keyboard.type(h); await bekle(400); }
  await s.locator('[data-kp-adim="ikon"]').click();
  await bekle(800);
  await s.locator('[data-kp-ikon]:not([disabled])').first().click();
  await bekle(1500);
  await s.locator('[data-kp-geri-al]').click();
  await bekle(800);
  await s.locator('[data-kp-yinele]').click();
  await bekle(4000);
});
await adim('3-tasarimi-tamamla', async () => {
  await s.locator('[data-kp-ileri]').click();
  await s.locator('.kp-ozet').waitFor({ timeout: 10000 });
});
await adim('4-taslak-kaydet-cik', async () => {
  await s.locator('[data-kp-alt-ozet] [data-kp-taslak-kaydet]').click();
});
let butonTutar = null;
await adim('5-tasarimi-sepete-ekle', async () => {
  await temizle();
  await s.locator('.kisisel-kart__butonlar [data-kisisel-ac]').click();
  await s.locator('.kp-onizleme .kp-sahne').waitFor({ timeout: 20000 });
  while (!(await s.locator('.kp-ozet').isVisible().catch(() => false))) { await s.locator('[data-kp-ileri]').click(); await bekle(800); }
  await bekle(3000);
  butonTutar = (await s.locator('[data-kp-ileri]').textContent()).replace(/\s+/g, ' ').trim();
  await s.locator('[data-kp-ileri]').click();
  await bekle(7000);
});
const sepet = await s.evaluate(() => fetch('/cart.js').then((r) => r.json()));
sonuc.butonTutar = butonTutar;
sonuc.sepet = { satir: sepet.items.length, adet: sepet.item_count, liste: sepet.original_total_price / 100, toplam: sepet.total_price / 100 };
sonuc.olcumKutusu = await s.evaluate(() => { const k = document.querySelector('[data-kp-olcum] pre'); return k ? k.textContent.split('\n').slice(0, 9) : null; });
await adim('6-normal-urun-sepete-ekle', async () => {
  await s.goto(STANDART + ek(true), { waitUntil: 'load', timeout: 60000 });
  await bekle(3000);
  await topla();
  await temizle();
  await s.locator('[id^="ProductSubmitButton-"]').first().click();
  await bekle(5000);
});
await adim('7-odeme-sayfasi', async () => {
  const y = await s.goto('https://jantifox.com/checkout', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
  await bekle(6000);
  sonuc.odeme = await s.evaluate(() => ({ adres: location.pathname.replace(/\/[A-Za-z0-9]{20,}/g, '/…'), baslik: document.title })).catch((e) => ({ hata: e.message.slice(0, 80) }));
  sonuc.odeme.kod = y ? y.status() : null;
});
faz = 'temizlik';
await s.goto(TOTE + ek(true), { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
await s.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
sonuc.sepetSonra = (await s.evaluate(() => fetch('/cart.js').then((r) => r.json()))).item_count;
zaman.bitis = new Date().toISOString();
// Adım başına sayaç
const sayac = {};
kayit.forEach((k) => { const a = (sayac[k.faz] = sayac[k.faz] || {}); const n = k.kanal + ': ' + k.ad + (k.yontem === 'trackShopify' || k.yontem === 'F&I uygulaması' ? ' (F&I uygulaması)' : k.yontem ? ' (tema)' : '') + (k.not ? ' [' + k.not + ']' : ''); a[n] = (a[n] || 0) + 1; });
sonuc.sayac = sayac;
sonuc.ayrinti = kayit.filter((k) => /AddToCart|CustomizeProduct|TasarimTamamlandi|TaslakKaydedildi|product_added_to_cart/.test(k.ad));
sonuc.zaman = zaman;
sonuc.hatalar = hatalar;
if (CIKTI) writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
