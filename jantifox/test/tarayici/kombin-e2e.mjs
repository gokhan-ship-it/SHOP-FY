// Sweatshirt kombini (2026-10-30): vitrin kartı editörü kombin modunda açar.
// - Önce Sweatshirt adımı: yaş seçilmeden "Tasarımı tamamla" soluk, dokununca "yaşını seç"; renk değişince görsel değişir.
// - Sayaç "2 patch dahil · n/2", 2'de ✓; 2'nin altında Özet'e geçilmez ("Kombin için 2 patch tak"); 3. patch "+300 TL".
// - Alt çubuk 2 patch'te ~~5.400~~ 3.400 TL "Tişört hediye"; 3 patch'te 3.700 TL.
// - Renk İndigo'ya (3-5, başka görsel ve alan yeri) geçince patch'ler alanda kalır, yaş yeniden seçilir.
// - Özet'te zorunlu tişört: 3-5 notu, tişört seçilmeden sepete eklenmez; seçilince "Hediye tişört: … 0 TL".
// - Sepete tek istek (sweatshirt + patch'ler + tişört, hepsi _kombin), ardından test kodu /cart/update.js'e;
//   Meta / GA4'e tek AddToCart (değer 3.700, tişört 0 TL).
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kombin-e2e.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ornekVeri } from '../ornek-veri.mjs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const svg = (icerik, w, h) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${icerik}</svg>`);
const harfGorsel = (h) => svg(`<rect x="6" y="6" width="288" height="288" rx="40" fill="#f2c14e" stroke="#222" stroke-width="10"/><text x="150" y="215" font-size="200" font-family="Arial" text-anchor="middle">${h}</text>`, 300, 300);
// Sweatshirt'ler mağazadaki gibi: her birinin görsel ölçüsü ve alanın yeri farklı, alan hep 22 cm daire
const SW = [
  { id: 9723692548382, baslik: 'Bej Sweatshirt', renk: '#d9c7a7', en: 1198, boy: 1184, z: [32.729, 25.243, 37.72, 38.166], v: [[49661755818270, '6-7 yaş'], [49661755851038, '8-9 yaş'], [49661755883806, '10-11 yaş']] },
  { id: 9726702223646, baslik: 'Mavi Sweatshirt', renk: '#8db4d9', en: 1198, boy: 1186, z: [33.147, 25.109, 37.683, 38.064], v: [[49661735960862, '6-7 yaş'], [49661735993630, '8-9 yaş'], [49661736026398, '10-11 yaş']] },
  { id: 9726704156958, baslik: 'Yeşil Sweatshirt', renk: '#9bb59a', en: 1198, boy: 1186, z: [32.823, 25.1, 37.738, 38.12], v: [[49661745987870, '6-7 yaş'], [49661746020638, '8-9 yaş'], [49661746053406, '10-11 yaş']] },
  { id: 9870146830622, baslik: 'İndigo Sweatshirt', renk: '#3f4a7a', en: 1226, boy: 1077, z: [29.038, 22.238, 41.028, 46.704], v: [[50171329544478, '3-5']], kucuk: true },
  { id: 9870236451102, baslik: 'Pembe Sweatshirt', renk: '#f2b8c6', en: 1357, boy: 1078, z: [29.366, 23.794, 39.13, 49.258], v: [[50171761393950, '3-5']], kucuk: true }
];
const swGorsel = (s) => {
  const g = svg(`<rect width="${s.en}" height="${s.boy}" fill="${s.renk}"/>`, s.en, s.boy);
  return { en: s.en, boy: s.boy, kucuk: g, buyuk: g, dev: g };
};
const swHarita = (s) => ({ surum: 2, kalibre: true, gorsel: { en: s.en, boy: s.boy }, zones: [{ id: 'on-alan', ad: 'Ön alan', shape: 'circle', x: s.z[0], y: s.z[1], w: s.z[2], h: s.z[3], cap_cm: 22, allowed_types: ['letter', 'number', 'icon'] }], forbidden: [], izinler: { set: true, aksesuar: false } });
const TS = [
  { id: 9686009119006, baslik: 'Bej Tshirt', v: [[49661733142814, '6-7 yaş'], [49661733175582, '8-9 yaş'], [49661733208350, '10-11 yaş']] },
  { id: 9726700192030, baslik: 'Sarı Tshirt', v: [[49661723050270, '6-7 yaş'], [49661723083038, '8-9 yaş'], [49661723115806, '10-11 yaş']] },
  { id: 9726700880158, baslik: 'Mavi Tshirt', v: [[49661728784670, '6-7 yaş', 0], [49661728817438, '8-9 yaş'], [49661728850206, '10-11 yaş']] },
  { id: 10085931221278, baslik: 'Pudra Pembe Tshirt', v: [[51790886666526, '4-5 yaş'], [51790886699294, '6-7 yaş'], [51790886732062, '8-9 yaş'], [51790855504158, '10-11 yaş']] }
];
const KOD = 'KMBSWEAT1-9TQ4M';
const kombin = {
  fiyat: 340000, eski_fiyat: 540000, dahil: 2, kod: KOD, baslangic: '', bitis: '',
  vitrin: { id: 16029928292638, url: '/products/sweatshirt-kombini', baslik: 'Sweatshirt Kombini · 2 Patch + Hediye Tişört' },
  sweatshirtler: SW.map((s) => ({ id: s.id, handle: 'x', baslik: s.baslik, kucuk_beden: !!s.kucuk, kapak: svg(`<rect width="10" height="10" fill="${s.renk}"/>`, 10, 10), metin_siniri: null,
    gorsel: swGorsel(s), harita: swHarita(s), varyantlar: s.v.map(([id, b]) => ({ id, baslik: b, fiyat: 250000, satilabilir: true, stok: 100 })) })),
  tisortler: TS.map((s) => ({ id: s.id, handle: 'x', baslik: s.baslik, kapak: null,
    varyantlar: s.v.map(([id, b, stok]) => ({ id, baslik: b, fiyat: 200000, satilabilir: stok !== 0, stok: stok ?? 50 })) }))
};

// Sayfadaki kart Bej Sweatshirt'ün verisiyle (kisisel-veri); patch'ler 500 TL
const v = ornekVeri();
v.urun = { id: SW[0].id, baslik: SW[0].baslik, varyant: SW[0].v[0][0], fiyat: 250000, satilabilir: true, metin_siniri: null };
v.gorsel = swGorsel(SW[0]);
v.harita = swHarita(SW[0]);
v.setler[0].varyantlar.forEach((x) => { x.fiyat = 50000; x.gorsel = harfGorsel(x.karakter); });
v.rakamlar[0].varyantlar.forEach((x) => { x.fiyat = 50000; x.gorsel = harfGorsel(x.karakter); });
v.ikonlar.forEach((i) => { i.gorsel = harfGorsel('♥'); i.varyantlar.forEach((x) => { x.fiyat = 50000; }); });
v.aksesuarlar = [];

// Kartın Liquid'inden kombin kolu: "if kombin" kolları, diğer if'lerde else kolu
const kart = readFileSync(new URL('../../snippets/kisisel-kart.liquid', import.meta.url), 'utf8');
let kartHtml = kart.slice(kart.indexOf('<kisisel-kart'), kart.indexOf('</kisisel-kart>') + 15)
  .replace(/\{\{ section\.id \}\}/g, 'main')
  .replace(/\{\{ settings\.kombin_patch \| default: 2 \}\}/g, '2')
  .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');
const ICTEKI_IF = /\{%-?\s*if ([^%]*?)\s*-?%\}((?:(?!\{%-?\s*if )[\s\S])*?)\{%-?\s*endif\s*-?%\}/;
for (let m; (m = ICTEKI_IF.exec(kartHtml)); ) {
  const kollar = m[2].split(/\{%-?\s*(?:elsif [^%]*|else)\s*-?%\}/);
  const sec = m[1].trim() === 'kombin' ? kollar[0] : kollar.length > 1 ? kollar[kollar.length - 1] : kollar[0];
  kartHtml = kartHtml.slice(0, m.index) + sec + kartHtml.slice(m.index + m[0].length);
}
kartHtml = kartHtml.replace(/\{%-?[\s\S]*?-?%\}/g, '');
assert.ok(!/\{[{%]/.test(kartHtml), 'kartta işlenmemiş Liquid kaldı');
assert.ok(/data-kombin/.test(kartHtml) && /Kombinini Tasarla/.test(kartHtml), 'kombin kartı');

const kod = readFileSync(new URL('../../assets/kisisel-editor.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../assets/kisisel-editor.css', import.meta.url), 'utf8');
const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html{font-size:62.5%}body{font-family:Arial,sans-serif;font-size:1.5rem;margin:0}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 1.6rem;border:1px solid #111;background:#fff}.button--full-width{width:100%}</style>
<style>${css}</style>
<script>window.routes = { cart_add_url: '/cart/add', cart_url: '/cart', cart_update_url: '/cart/update', cart_change_url: '/cart/change' };
window.Shopify = { currency: { active: 'TRY' } };</script></head><body>
<h1>Sweatshirt Kombini · 2 Patch + Hediye Tişört</h1>
${kartHtml}
<script type="application/json" id="KisiselVeri-main">${JSON.stringify(v)}</script>
<script type="application/json" id="KisiselKombin-main">${JSON.stringify(kombin)}</script>
<script>${kod}</script></body></html>`;

// Storefront simülasyonu: patch adedine göre 2'li / 3'lü / 4'lü indirim (100 / 300 / 500 TL), patch satırlarına dağıtılır
const patchMi = (vid) => (vid >= 1000 && vid < 4000);
const fiyat = (vid) => (patchMi(vid) ? 50000 : SW.some((s) => s.v.some((x) => x[0] === vid)) ? 250000 : 200000);
function sepet(satirlar) {
  const lines = satirlar.map((l) => ({ v: Number(String(l.merchandiseId).split('/').pop()), q: l.quantity }));
  const n = lines.filter((l) => patchMi(l.v)).reduce((t, l) => t + l.q, 0);
  const adet = n >= 4 ? ['4lü patche indirim', 50000] : n === 3 ? ['3lü patche indirim', 30000] : n === 2 ? ['2li patche indirim', 10000] : null;
  const tl = (k) => (k / 100).toFixed(2);
  const pt = lines.filter((l) => patchMi(l.v)).reduce((t, l) => t + fiyat(l.v) * l.q, 0);
  const nodes = lines.map((l) => ({ quantity: l.q, merchandise: { id: 'gid://shopify/ProductVariant/' + l.v },
    discountAllocations: adet && patchMi(l.v) ? [{ title: adet[0], discountedAmount: { amount: tl(Math.round((adet[1] * fiyat(l.v) * l.q) / pt)) } }] : [] }));
  const ara = lines.reduce((t, l) => t + fiyat(l.v) * l.q, 0) - (adet ? adet[1] : 0);
  return { cost: { subtotalAmount: { amount: tl(ara) }, totalAmount: { amount: tl(ara) } }, discountAllocations: [], lines: { nodes } };
}

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const olaylar = [];
await baglam.exposeFunction('__olayKaydet', (x) => { olaylar.push(x); });
await baglam.addInitScript(() => {
  if (window.top !== window) return;
  window.fbq = function () { window.__olayKaydet({ k: 'fbq', a: JSON.parse(JSON.stringify(Array.from(arguments))) }); };
  window.gtag = function () { window.__olayKaydet({ k: 'gtag', a: JSON.parse(JSON.stringify(Array.from(arguments))) }); };
});
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
const guncellemeler = [];
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (/^\/api\/[0-9-]+\/graphql\.json$/.test(url.pathname)) {
    const { variables } = JSON.parse(r.request().postData());
    const data = {};
    for (const [ad, satirlar] of Object.entries(variables)) data[ad] = { cart: sepet(satirlar), userErrors: [] };
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  }
  if (url.pathname === '/cart/add.js') { eklenen = JSON.parse(r.request().postData()); return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }); }
  if (url.pathname === '/cart/update.js') { guncellemeler.push(JSON.parse(r.request().postData())); return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' }); }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [], discount_codes: eklenen ? [{ code: 'FIRSTORDER', applicable: false }] : [] }) });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const bekle = (ms) => s.waitForTimeout(ms);
const yazi = async (q) => ((await s.locator(q).first().textContent()) || '').replace(/\s+/g, ' ').trim();
const bildirim = () => yazi('.kp-editor [data-kp-bildirim]');
const metinBekle = (q, desen) => s.waitForFunction(([q, d]) => { const e = document.querySelector(q); return e && new RegExp(d).test(e.textContent.replace(/\s+/g, ' ')); }, [q, desen.source], { timeout: 8000 });

await s.goto('https://jantifox.test/products/sweatshirt-kombini');
await bekle(300);
assert.equal(await yazi('[data-kisisel-davet] [data-kisisel-ac]'), 'Kombinini Tasarla');

// 1) Açılış: Sweatshirt adımı, sayaç 0/2, yaş yokken ana buton soluk
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('[data-kp-panel="sweat"]:not([hidden]) .kp-kombin-renk').first().waitFor();
assert.equal(await yazi('[data-kp-kombin-sayac]'), '2 patch dahil · 0/2');
assert.equal(await s.locator('.kp-arac-dugme[data-kp-adim]').count(), 3, 'Sweatshirt, Metin, Görsel (aksesuar yok)');
assert.equal(await s.locator('.kp-kombin-renk').count(), 5);
assert.ok(await s.locator('[data-kp-ileri].kp-alt__ileri--pasif').count(), 'yaş yokken buton soluk');
await s.locator('[data-kp-ileri]').click();
await metinBekle('.kp-editor [data-kp-bildirim]', /yaşını seç/);
assert.ok(await s.locator('[data-kp-panel="sweat"]:not([hidden])').count(), 'Sweatshirt adımında kalır');

// 2) Renk Mavi, yaş 8-9 → Patch'leri ekle
await s.locator('[data-kp-kombin-renk="9726702223646"]').click();
await bekle(200);
assert.equal(await s.locator('.kp-editor .kp-onizleme .kp-sahne__urun').getAttribute('alt'), 'Mavi Sweatshirt');
assert.ok(await s.locator('[data-kp-kombin-devam][disabled]').count(), 'yaş seçilmeden devam kapalı');
await s.locator('[data-kp-kombin-yas="49661735993630"]').click();
await s.locator('[data-kp-kombin-devam]:not([disabled])').click();
await s.locator('[data-kp-panel="yazi"]:not([hidden]) #kp-isim').waitFor();
assert.match(await yazi('.kp-kombin-not--yazi'), /her harf ve rakam 1 patch/);

// 3) 1 harf: sayaç 1/2, Özet'e geçilmez
await s.locator('#kp-isim').fill('A');
await bekle(500);
assert.equal(await yazi('[data-kp-kombin-sayac]'), '2 patch dahil · 1/2');
await s.locator('[data-kp-ileri]').click();
await metinBekle('.kp-editor [data-kp-bildirim]', /Kombin için 2 patch tak/);
assert.ok(!(await s.locator('.kp-editor--ozet').count()), 'Özet açılmadı');

// 4) 2 harf: ✓, alt çubuk ~~5.400~~ 3.400 "Tişört hediye"
await s.locator('#kp-isim').fill('AB');
await metinBekle('[data-kp-toplam]', /5\.400 TL 3\.400 TL Tişört hediye/);
assert.equal(await yazi('[data-kp-kombin-sayac]'), '2 patch dahil · 2/2 ✓');
assert.ok(!(await s.locator('[data-kp-ileri].kp-alt__ileri--pasif').count()), '2 patch: buton etkin');

// 5) 3. patch (ikon): "3. patch +300 TL", toplam 3.700
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await metinBekle('[data-kp-kombin-sayac]', /3\. patch \+300 TL/);
await metinBekle('[data-kp-toplam]', /5\.700 TL 3\.700 TL Tişört hediye/);

// 6) Renk İndigo (3-5): görsel değişir, patch'ler alanda kalır, yaş yeniden seçilir
const yerlesik = () => s.evaluate(() => document.querySelectorAll('.kp-editor .kp-onizleme .kp-sahne__parcalar .kp-parca').length);
assert.equal(await yerlesik(), 3);
await s.locator('[data-kp-adim="sweat"]').click();
await s.locator('[data-kp-kombin-renk="9870146830622"]').click();
await bekle(300);
assert.equal(await s.locator('.kp-editor .kp-onizleme .kp-sahne__urun').getAttribute('alt'), 'İndigo Sweatshirt');
await metinBekle('.kp-editor [data-kp-bildirim]', /8-9 yaş bu renkte yok/);
assert.equal(await yerlesik(), 3, 'patch\'ler yeni renkte de sahnede');
assert.equal(await s.locator('.kp-editor [data-kp-kenar]:not([hidden])').count(), 0, 'kenara giden yok');
const alanda = await s.evaluate(() => {
  const sahne = document.querySelector('.kp-editor .kp-onizleme .kp-sahne').getBoundingClientRect();
  const alan = document.querySelector('.kp-editor .kp-onizleme .kp-alan').getBoundingClientRect();
  return Array.from(document.querySelectorAll('.kp-editor .kp-onizleme .kp-parca')).every((p) => {
    const r = p.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return cx > alan.left && cx < alan.right && cy > alan.top && cy < alan.bottom && sahne.width > 0;
  });
});
assert.ok(alanda, 'patch\'ler İndigo\'nun alanında');
assert.ok(await s.locator('[data-kp-ileri].kp-alt__ileri--pasif').count(), 'yaş yok: buton soluk');
await s.locator('[data-kp-kombin-yas="50171329544478"]').click();
await bekle(200);

// 7) Özet: tişört zorunlu, 3-5 notu; tişört seçilmeden sepete eklenmez
await s.locator('[data-kp-ileri]').click();
await s.locator('.kp-kombin-tisort').waitFor();
assert.match(await yazi('.kp-oz__urun'), /İndigo Sweatshirt · 3-5 yaş/);
assert.equal(await yazi('.kp-kombin-uyari'), 'Tişörtlerimizde 3-5 yaş bedeni yok. Pudra Pembe\'de 4-5 yaş var, diğer renklerde en küçük beden 6-7 yaş.');
assert.equal(await s.locator('[data-kp-tisort-yas].kp-kombin-yas--secili').count(), 0, '3-5: tişört yaşı boş');
assert.match(await yazi('[data-kp-ileri]'), /^Kombinimi sepete ekle · 3\.700 TL$/);
assert.ok(await s.locator('[data-kp-ileri].kp-alt__ileri--pasif').count(), 'tişört yokken soluk');
await s.locator('[data-kp-ileri]').click();
await bekle(200);
assert.equal(eklenen, null, 'tişörtsüz sepete eklenmedi');
assert.match(await yazi('.kp-kombin-eksik'), /rengini seç/);
// Mavi tişörtün 6-7'si tükenmiş: Mavi seçilince yaşlar 8-9 ve 10-11
await s.locator('[data-kp-tisort-renk="9726700880158"]').click();
await bekle(150);
assert.deepEqual(await s.$$eval('[data-kp-tisort-yas]', (l) => l.map((x) => x.textContent)), ['8-9 yaş', '10-11 yaş']);
await s.locator('[data-kp-tisort-renk="10085931221278"]').click();
await bekle(150);
assert.deepEqual(await s.$$eval('[data-kp-tisort-yas]', (l) => l.map((x) => x.textContent)), ['4-5 yaş', '6-7 yaş', '8-9 yaş', '10-11 yaş']);
await s.locator('[data-kp-tisort-yas="4-5"]').click();
await bekle(200);
assert.match(await yazi('.kp-ozet__hediye'), /Hediye tişört: Pudra Pembe · 4-5 yaş ?2\.000 TL 0 TL/);
assert.match(await yazi('.kp-ozet tfoot'), /Toplam ?5\.700 TL 3\.700 TL/);
assert.match(await yazi('.kp-kombin-tisort .kp-kombin-not'), /Patch'lerini tişörtüne de takabilirsin/);

// 8) Sepete ekle: tek istek, hepsi _kombin; kod sepete yazılır; tek AddToCart
await s.locator('[data-kp-ileri]').click();
await s.waitForFunction(() => !document.querySelector('.kp-editor:not([hidden])'), null, { timeout: 5000 }).catch(() => {});
for (let i = 0; i < 30 && !guncellemeler.length; i++) await bekle(100);
assert.ok(eklenen, 'sepete eklendi');
const kalemler = eklenen.items;
const kimlik = kalemler[0].properties._tasarim_id;
assert.equal(kalemler[0].id, 50171329544478, 'İndigo 3-5');
assert.equal(kalemler[0].properties._kombin, kimlik);
assert.ok(kalemler.every((k) => k.properties._kombin === kimlik && k.properties._tasarim_id === kimlik), 'hepsi aynı kombin');
const hediye = kalemler.filter((k) => k.properties._tasarim_rol === 'hediye');
assert.equal(hediye.length, 1);
assert.equal(hediye[0].id, 51790886666526, 'Pudra Pembe 4-5');
assert.equal(kalemler.filter((k) => k.properties._tasarim_rol === 'patch').reduce((t, k) => t + k.quantity, 0), 3);
assert.deepEqual(guncellemeler[0].discount, 'FIRSTORDER,' + KOD, 'sepetteki kod korunur, test kodu eklenir');
const atc = olaylar.filter((o) => o.k === 'fbq' && o.a[2] === 'AddToCart');
assert.equal(atc.length, 1, 'tek AddToCart');
assert.equal(atc[0].a[3].value, 3700);
assert.ok(atc[0].a[3].content_ids.includes(String(SW[3].id)) && atc[0].a[3].content_ids.includes(String(TS[3].id)));
assert.equal(atc[0].a[3].contents.filter((c) => c.id === String(TS[3].id))[0].item_price, 0, 'tişört 0 TL');
assert.equal(atc[0].a[3].content_name, kombin.vitrin.baslik);
const ga = olaylar.filter((o) => o.k === 'gtag' && o.a[1] === 'add_to_cart');
assert.equal(ga.length, 1);
assert.equal(ga[0].a[2].value, 3700);
assert.deepEqual(hatalar, []);
console.log('KOMBİN E2E TAMAM', { kalem: kalemler.length, kod: guncellemeler[0].discount, deger: atc[0].a[3].value });
await t.close();
