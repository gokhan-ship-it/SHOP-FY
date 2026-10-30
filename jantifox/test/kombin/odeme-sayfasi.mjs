// Ödeme sayfasında kombin sepetleri: ürünler /cart/add.js ile eklenir, kod(lar) /cart/update.js "discount" ile sepete
// yazılır, /checkout açılır ve sipariş özetindeki tutarlar okunur. Sipariş verilmez; her sepet sonunda boşaltılır.
// Meta / GA4 / Shopify olay istekleri kesilir. Çalıştırma: NODE_PATH=... node odeme-sayfasi.mjs <kod> [çıktı.json]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const KOD = process.argv[2];
const V = { bejS: 49661755851038, maviS: 49661735993630, A: 49646792868126, D: 49646792966430, H: 49646793097502, L: 49646793228574, bejT: 49661733175582, maviT: 49661728817438 };
const SEPETLER = {
  'a) tek kombin': [[V.bejS], [V.A], [V.D], [V.bejT]],
  'b) 3 patchli kombin': [[V.bejS], [V.A], [V.D], [V.H], [V.bejT]],
  'c) iki kombin': [[V.bejS], [V.maviS], [V.A], [V.D], [V.H], [V.L], [V.bejT], [V.maviT]],
  'd) tek kombin + FIRSTORDER': [[V.bejS], [V.A], [V.D], [V.bejT]]
};
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const sonuc = { kod: KOD, zaman: new Date().toISOString(), sepetler: {} };
for (const [ad, kalemler] of Object.entries(SEPETLER)) {
  const c = await t.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'tr-TR' });
  await c.route(/facebook\.com\/tr|google-analytics|analytics\.google|monorail|produce_batch/, (r) => r.fulfill({ status: 204, body: '' }));
  const s = await c.newPage();
  await s.goto('https://jantifox.com/products/bej-sweatshirt', { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(4000);
  const kodlar = [KOD].concat(/FIRSTORDER/.test(ad) ? ['FIRSTORDER'] : []).filter(Boolean).join(',');
  const sepet = await s.evaluate(async ({ kalemler, kodlar }) => {
    await fetch('/cart/clear.js', { method: 'POST' });
    const r = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ items: kalemler.map(([id]) => ({ id, quantity: 1 })) }) });
    if (!r.ok) return { hata: await r.text() };
    if (kodlar) await fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ discount: kodlar }) });
    const j = await (await fetch('/cart.js')).json();
    return { toplam: j.total_price / 100, liste: j.original_total_price / 100, indirimler: (j.cart_level_discount_applications || []).map((d) => d.title + ' ' + d.total_allocated_amount / 100).concat(j.items.flatMap((i) => (i.discounts || []).map((d) => d.title + ' ' + d.amount / 100))), kodlar: (j.discount_codes || []).map((d) => d.code + (d.applicable ? '' : ' (uygulanmadı)')) };
  }, { kalemler, kodlar });
  await s.goto('https://jantifox.com/checkout', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await s.waitForTimeout(8000);
  const odeme = await s.evaluate(() => {
    const m = document.body.innerText.replace(/ /g, ' ');
    const satir = (re) => { const x = m.match(re); return x ? x[0].replace(/\s+/g, ' ').trim() : null; };
    return {
      adres: location.pathname.replace(/\/[A-Za-z0-9]{20,}/g, '/…'),
      araToplam: satir(/Ara toplam[^\n]*\n?[^\n]*TL/i),
      toplam: satir(/\nToplam[^\n]*\n?[^\n]*TL[^\n]*/),
      indirim: [...new Set((m.match(/(KMB[^\n]*|FIRSTORDER[^\n]*|Toplam tasarruf[^\n]*\n?[^\n]*|İndirim[^\n]*\n?[^\n]*TL|[^\n]*patche indirim[^\n]*)/gi) || []).map((x) => x.replace(/\s+/g, ' ').trim()))].slice(0, 8),
      uyari: satir(/[^\n]*(birleştirilemez|kullanılamaz|geçerli değil|uygulanamaz|karşılanmadı)[^\n]*/i)
    };
  }).catch((e) => ({ hata: e.message.slice(0, 100) }));
  await s.goto('https://jantifox.com/pages/sikca-sorulan-sorular', { waitUntil: 'domcontentloaded' });
  await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
  sonuc.sepetler[ad] = { sepet, odeme };
  await c.close();
  await new Promise((ok) => setTimeout(ok, 15000));
}
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(sonuc, null, 1));
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
