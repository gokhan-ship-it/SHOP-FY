// Faz 3: kampanyalı fiyatlar, kampanya şeridi ve kazanma bildirimi. Storefront API, mağazadaki kurallar gibi taklit edilir:
// uygun patch adedi 2/3/4 → 60/190/370 TL (adları Shopify'daki gibi boşluklu), ara toplam ≥ 5.000 TL → Ekstra %10.
// Gerçek mağazada simülasyonla doğrulandı (2026-10-09): eşik adet indirimi düşülmüş ara toplama bakar (subtotalAmount da
// düşülmüş tutardır); ikisi birlikte tutmazsa daha çok kazandıran tek başına uygulanır (7 harf: −531 Ekstra, 4'lü yok).
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kampanya-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const fiyat = (v) => (v === 51795696943390 ? 300000 : v === 9201 ? 170000 : v === 7001 ? 80000 : 33000);
const uygun = (v) => (v >= 1000 && v < 4000) || (v >= 5000 && v < 6000);
function sepet(satirlar) {
  const lines = satirlar.map((l) => ({ v: Number(String(l.merchandiseId).split('/').pop()), q: l.quantity }));
  const ara = lines.reduce((t, l) => t + fiyat(l.v) * l.q, 0);
  const n = lines.filter((l) => uygun(l.v)).reduce((t, l) => t + l.q, 0);
  let adet = null;
  if (n >= 4) adet = ['  4\'lü  patche indirim ', 37000];
  else if (n === 3) adet = [' 3\'lü  patche indirim ', 19000];
  else if (n === 2) adet = ['2li patche indirim ', 6000];
  const tl = (k) => (k / 100).toFixed(2);
  // Adet indirimi (ürün indirimi) Shopify'daki gibi dahil satırlara dağıtılır; Ekstra %10 sepet düzeyinde
  const uygunTutar = lines.filter((l) => uygun(l.v)).reduce((t, l) => t + fiyat(l.v) * l.q, 0);
  const nodes = lines.map((l) => ({
    quantity: l.q,
    merchandise: { id: 'gid://shopify/ProductVariant/' + l.v },
    discountAllocations: adet && uygun(l.v) ? [{ title: adet[0], discountedAmount: { amount: tl(Math.round((adet[1] * fiyat(l.v) * l.q) / uygunTutar)) } }] : []
  }));
  let adetToplam = adet ? nodes.reduce((t, x) => t + (x.discountAllocations[0] ? Math.round(parseFloat(x.discountAllocations[0].discountedAmount.amount) * 100) : 0), 0) : 0;
  // Birlikte: adet + (adet sonrası ≥ 5.000 ise %10); tek başına Ekstra: indirimsiz ≥ 5.000 ise; hangisi daha çoksa
  const birlikte = adetToplam + (ara - adetToplam >= 500000 ? Math.round((ara - adetToplam) * 0.1) : 0);
  const tekEkstra = ara >= 500000 ? Math.round(ara * 0.1) : 0;
  if (tekEkstra > birlikte) {
    adetToplam = 0;
    nodes.forEach((x) => { x.discountAllocations = []; });
  }
  const alt = ara - adetToplam;
  const sepetDuzeyi = alt >= 500000 ? [{ title: 'Ekstra %10 İndirim', discountedAmount: { amount: tl(Math.round(alt * 0.1)) } }] : [];
  const indirim = adetToplam + (sepetDuzeyi[0] ? Math.round(parseFloat(sepetDuzeyi[0].discountedAmount.amount) * 100) : 0);
  return { cost: { subtotalAmount: { amount: tl(alt) }, totalAmount: { amount: tl(alt - (indirim - adetToplam)) } }, discountAllocations: sepetDuzeyi, lines: { nodes } };
}

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function sayfaAc(secenek = {}) {
  const baglam = await t.newContext({ ...devices['iPhone 13'], ...(secenek.genislik ? { viewport: { width: secenek.genislik, height: 740 } } : {}), reducedMotion: secenek.azHareket ? 'reduce' : 'no-preference' });
  const s = await baglam.newPage();
  const hatalar = [];
  s.on('pageerror', (e) => hatalar.push(e.message));
  let istek = 0;
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/api/2025-07/graphql.json') {
      istek++;
      if (secenek.bozuk) return r.fulfill({ status: 500, body: 'hata' });
      const { variables } = JSON.parse(r.request().postData());
      const data = {};
      for (const [ad, satirlar] of Object.entries(variables)) data[ad] = { cart: sepet(satirlar), userErrors: [] };
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
    }
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: secenek.sepet || [] }) });
    return r.fulfill({ contentType: 'text/html', body: html });
  });
  await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
  return { s, hatalar, baglam, istekSayisi: () => istek };
}
const ana = '.kp-editor:not(.kp-editor--alt)';
const metin = async (s, q) => (await s.locator(q).first().innerText()).replace(/\s+/g, ' ').trim();
const bekle = (s, q, desen) => s.waitForFunction(([q, d]) => { const e = document.querySelector(q); return e && new RegExp(d).test(e.textContent.replace(/\s+/g, ' ')); }, [q, desen.source], { timeout: 4000 });

// ---------- 1) Şerit, duraklar, bildirim ----------
{
  const { s, hatalar, baglam } = await sayfaAc();
  // Kurallar sayfa açılırken öğrenilir (kampanya basamakları ve dahil ürünler); sonra fiyat anında hesaplanır
  await s.waitForFunction(() => !!localStorage.getItem('kp-kampanya-kurallari-2'));
  const kural = await s.evaluate(() => JSON.parse(localStorage.getItem('kp-kampanya-kurallari-2')));
  assert.deepEqual(kural.merdiven.map((x) => [x.k, x.tutar]), [[2, 6000], [3, 19000], [4, 37000]]);
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('#kp-isim').fill('ec');
  // Anında: Shopify'ın cevabını beklemeden (ara durum yok)
  assert.equal(await metin(s, ana + ' [data-kp-toplam]'), '3.660 TL 3.600 TL', 'kampanyalı fiyat anında');
  assert.equal(await metin(s, ana + ' [data-kp-serit-sol]'), '60 TL indirim kazandın.');
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), '1 patch daha ekle, indirimin 190 TL olsun.');
  // Duraklar: 2'li, 3'lü, 4'lü (öğrenilen) + Ekstra %10 (ayarlardan); ilki dolu; ipuçlarında anlaşılır adlar
  assert.deepEqual(await s.$$eval(ana + ' .kp-serit__nokta', (n) => n.map((x) => [x.title, x.classList.contains('kp-serit__nokta--ulasildi')])),
    [["2'li patch indirimi", true], ["3'lü patch indirimi", false], ["4'lü patch indirimi", false], ['Ekstra %10 indirim', false]]);
  // Bildirim: kırmızı zemin, beyaz yazı, anlaşılır ad
  await s.locator(ana + ' [data-kp-kazanc]:not([hidden])').waitFor();
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), "🎉 2'li patch indirimi · −60 TL");
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).backgroundColor, ana + ' [data-kp-kazanc]'), 'rgb(179, 20, 27)');
  assert.equal(await metin(s, ana + ' [data-kp-toplam] s'), '3.660 TL');
  assert.equal(await s.locator(ana + ' .kp-alt__fiyat .kp-indirim-notu').isVisible(), false);
  // Tek alt çubuk: en üstte 3 px ilerleme çizgisi, altında tek satır metin, altında fiyat ve buton
  const [serit, alt, cizgi, satir, fiyat, buton] = await s.evaluate((q) => [' [data-kp-serit]', ' .kp-alt', ' [data-kp-serit-cubuk]', ' .kp-serit__ust', ' .kp-alt__fiyat', ' [data-kp-ileri]'].map((x) => document.querySelector(q + x).getBoundingClientRect()).map((r) => ({ y: r.y, h: r.height, b: r.bottom, x: r.x })), ana);
  assert.ok(serit.y >= alt.y - 1 && serit.b <= alt.b, 'şerit alt çubuğun içinde');
  assert.ok(Math.abs(cizgi.y - alt.y) < 2 && cizgi.h === 3, 'çizgi en üstte, 3 px: ' + JSON.stringify(cizgi));
  assert.ok(satir.h <= 38, 'kampanya metni en fazla iki satır: ' + satir.h);
  assert.ok(fiyat.y >= satir.b - 1 && buton.y >= satir.b - 1 && fiyat.x < buton.x, 'altında solda fiyat, sağda buton');
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).color, ana + ' [data-kp-serit-sol]'), 'rgb(179, 20, 27)');
  // Şeritte "kaldı", "→" ve Shopify adları yok
  const seritMetni = async () => metin(s, ana + ' [data-kp-serit]');
  const sade = async () => { const x = await seritMetni(); assert.ok(!/kaldı|→|patche|İndirim/.test(x), x); };
  await sade();

  await s.locator('#kp-isim').fill('ece');
  assert.equal(await metin(s, ana + ' [data-kp-toplam]'), '3.990 TL 3.800 TL', 'anında');
  await bekle(s, ana + ' [data-kp-kazanc]', /3'lü/);
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), "🎉 3'lü patch indirimi · −190 TL");
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), '1 patch daha ekle, indirimin 370 TL olsun.');
  await sade();

  // 4 patch: adet basamakları bitti, sıradaki hedef tutar eşiği
  await s.locator('#kp-isim').fill('ece7');
  // Eşik, Shopify'daki gibi adet indirimi düşülmüş tutara göre: 5.000 − (4.320 − 370) = 1.050 TL
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), '1.050 TL daha ekle, tüm siparişe %10 indirim.');
  // Metin taşmaz: sığmazsa en fazla iki satıra iner
  const seritOlc = await s.evaluate((q) => { const u = document.querySelector(q + ' .kp-serit__ust'); return [u.scrollWidth <= u.clientWidth, u.scrollHeight <= u.clientHeight + 1, Math.round(u.getBoundingClientRect().height)]; }, ana);
  assert.ok(seritOlc[0] && seritOlc[1] && seritOlc[2] <= 38, 'taşma yok, en fazla iki satır: ' + seritOlc);
  assert.equal(await metin(s, ana + ' [data-kp-serit-sol]'), '370 TL indirim kazandın.');
  await sade();
  const dolu = await s.evaluate((q) => parseFloat(document.querySelector(q + ' [data-kp-serit-dolu]').style.width), ana);
  assert.ok(dolu > 90 && dolu < 100, 'çubuk Ekstra %10 durağına yaklaşıyor: ' + dolu);

  // Adet 2 → ara toplam 5.000 TL'yi geçer: Ekstra %10, tüm kampanyalar
  await s.evaluate(() => { document.querySelector('#Quantity-main').value = '2'; });
  if (await s.locator(ana + ' [data-kp-adim="ozet"][aria-current]').count()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
  await s.locator(ana + ' [data-kp-adim="ikon"]').click();
  await bekle(s, ana + ' [data-kp-kazanc]', /Ekstra/);
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), '✨ Ekstra %10 indirim açıldı · Tüm siparişinde −827 TL');
  assert.equal(await metin(s, ana + ' [data-kp-serit-sol]'), '1.197 TL indirim kazandın 🎉');
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), 'Bütün kampanyalar sepetinde.');
  assert.equal(await s.locator(ana + ' .kp-serit__nokta--ulasildi').count(), 4);

  // Özet: şerit yok, kampanyalar satır satır, anlaşılır adlarla
  await s.locator(ana + ' [data-kp-adim="ozet"]').click();
  assert.equal(await s.locator(ana + ' [data-kp-serit]').isVisible(), false);
  await bekle(s, ana + ' .kp-ozet', /Ekstra/);
  assert.deepEqual(await s.$$eval(ana + ' .kp-ozet__kampanya th', (x) => x.map((e) => e.textContent)), ["✓ 4'lü patch indirimi", '✓ Ekstra %10 indirim']);

  // Aynı oturumda bildirim tekrar çıkmaz
  const gorulen = await s.evaluate(() => JSON.parse(sessionStorage.getItem('kp-kampanya-gorulen')));
  assert.deepEqual(gorulen.sort(), ["2li patche indirim", "3'lü patche indirim", "4'lü patche indirim", 'Ekstra %10 İndirim'].sort());
  await s.waitForTimeout(2700); // önceki bildirim kaybolsun
  if (await s.locator(ana + ' [data-kp-adim="ozet"][aria-current]').count()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
  await s.locator(ana + ' [data-kp-adim="yazi"]').click();
  await s.locator('#kp-isim').fill('ec');
  await s.waitForTimeout(700);
  await s.locator('#kp-isim').fill('ece7');
  await s.waitForTimeout(900);
  assert.equal(await s.locator(ana + ' [data-kp-kazanc]').isVisible(), false, 'bildirim oturumda bir kez');

  // Aksesuar ekranında da şerit ve kampanyalı toplam
  await s.evaluate(() => { document.querySelector('#Quantity-main').value = '1'; });
  if (await s.locator(ana + ' [data-kp-adim="ozet"][aria-current]').count()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
  await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
  await s.locator('[data-kp-aksesuar="9101"]').click();
  await s.locator('.kp-editor--alt').waitFor({ state: 'visible' });
  await bekle(s, '.kp-editor--alt [data-kp-serit-sol]', /indirim kazandın/);
  // çanta 3.000 + ECE7 1.320 + kalem kutusu 1.700 = 6.020; 4'lü −370, Ekstra %10 −565
  assert.equal(await metin(s, '.kp-editor--alt [data-kp-toplam]'), '6.020 TL 5.085 TL');
  assert.equal(await metin(s, '.kp-editor--alt [data-kp-serit-sol]'), '935 TL indirim kazandın 🎉');
  await s.locator('.kp-editor--alt [data-kp-vazgec]').click();

  // Ürün kartında kampanyalı toplam ve buton
  await s.locator(ana + ' [data-kp-adim="ozet"]').click();
  await s.locator(ana + ' [data-kp-urune-don]').click();
  await bekle(s, '[data-kisisel-toplam]', /4\.\d{3} TL \d/);
  assert.equal(await metin(s, '[data-kisisel-toplam]'), 'Toplam 4.320 TL 3.950 TL');
  assert.equal((await s.locator('[data-kisisel-sepete-ekle]').innerText()).trim(), 'Tasarımımı sepete ekle · 3.950 TL');
  console.log('1) hatalar:', hatalar);
  assert.equal(hatalar.length, 0);
  await baglam.close();
}

// ---------- 2) Simülasyon başarısız: liste fiyatı + not, şerit yok ----------
{
  const { s, hatalar, baglam, istekSayisi } = await sayfaAc({ bozuk: true });
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('#kp-isim').fill('ece');
  await s.waitForFunction(() => !document.querySelector('.kp-editor .kp-alt__fiyat .kp-indirim-notu').hidden || null, null, { timeout: 4000 }).catch(() => {});
  await s.waitForTimeout(800);
  assert.ok(istekSayisi() > 0);
  assert.equal(await metin(s, ana + ' [data-kp-toplam]'), '3.990 TL');
  assert.equal(await s.locator(ana + ' .kp-alt__fiyat .kp-indirim-notu').isVisible(), true);
  assert.equal(await s.locator(ana + ' [data-kp-serit]').isVisible(), false);
  assert.equal(hatalar.length, 0);
  await baglam.close();
}

// ---------- 3) Hareket azaltma: bildirim animasyonsuz ----------
{
  const { s, baglam } = await sayfaAc({ azHareket: true });
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('#kp-isim').fill('ec');
  await s.locator(ana + ' [data-kp-kazanc]:not([hidden])').waitFor();
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).animationName, ana + ' [data-kp-kazanc]'), 'none');
  await s.waitForTimeout(2800);
  assert.equal(await s.locator(ana + ' [data-kp-kazanc]').isVisible(), false, '~2,5 sn sonra kaybolur');
  await baglam.close();
}
// ---------- 360 px genişlik: kampanya metni iki satıra iner, taşmaz; adım halkası kesilmez ----------
{
  const { s, hatalar, baglam } = await sayfaAc({ genislik: 360 });
  await s.waitForFunction(() => !!localStorage.getItem('kp-kampanya-kurallari-2'));
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('#kp-isim').fill('ece7');
  await bekle(s, ana + ' [data-kp-serit-sag]', /daha ekle/);
  const o = await s.evaluate((q) => {
    const u = document.querySelector(q + ' .kp-serit__ust');
    const r = u.getBoundingClientRect();
    const satir = parseFloat(getComputedStyle(u).lineHeight);
    return { tasmaYok: u.scrollWidth <= u.clientWidth && u.scrollHeight <= u.clientHeight + 1 && r.right <= innerWidth, satir: Math.round(r.height / satir), metin: u.innerText };
  }, ana);
  console.log('360 px şerit:', JSON.stringify(o));
  assert.ok(o.tasmaYok && o.satir >= 1 && o.satir <= 2, '360 px: taşma yok, en fazla iki satır');
  // Aktif adımın halkası ekran içinde, kenarlara yapışmıyor
  const h = await s.evaluate((q) => {
    const d = document.querySelector(q + ' .kp-adim-oge--aktif .kp-adim__daire').getBoundingClientRect();
    const son = [...document.querySelectorAll(q + ' .kp-adim__daire')].pop().getBoundingClientRect();
    const k = document.querySelector(q + ' .kp-kapat').getBoundingClientRect();
    return { ust: d.top - 3, sol: d.left - 3, sonSag: son.right, kapat: k.left, yukseklik: document.querySelector(q + ' .kp-ust').getBoundingClientRect().height };
  }, ana);
  assert.ok(h.ust >= 0 && h.sol >= 8 && h.sonSag <= h.kapat - 4 && h.yukseklik <= 64, 'halka kesilmez, kenara yapışmaz: ' + JSON.stringify(h));
  assert.deepEqual(hatalar, []);
  await baglam.close();
}

// ---------- Sepette başka ürünler: alt çubukta yalnızca bu tasarımın fiyatı, şeritte "(sepetindekilerle birlikte)" ----------
{
  // Sepette: düz çanta 3.000 + 2 Futbol Topu 660. Tasarım: çanta 3.000 + ECE (990)
  const sepetteki = [
    { variant_id: 51795696943390, product_id: 10087205437726, quantity: 1, original_price: 300000, properties: {} },
    { variant_id: 3002, product_id: 2, quantity: 2, original_price: 33000, properties: {} }
  ];
  const { s, hatalar, baglam } = await sayfaAc({ sepet: sepetteki, genislik: 360 });
  await s.waitForFunction(() => !!localStorage.getItem('kp-kampanya-kurallari-2'));
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('#kp-isim').fill('ece');
  // Toplam sepet 7.650: 5 patch → 4'lü −370 (tasarımın 3 harfine 222), ara toplam 7.280 → Ekstra %10 −728
  // (tasarımın payı 728 × (3.990 − 222) / 7.280 = 376,80). Tasarımın fiyatı 3.990 − 598,80 = 3.391 TL
  await bekle(s, ana + ' [data-kp-toplam]', /3\.391 TL/);
  assert.equal(await metin(s, ana + ' [data-kp-toplam]'), '3.990 TL 3.391 TL');
  const sol = await metin(s, ana + ' [data-kp-serit-sol]');
  assert.match(sol, /^[\d.]+ TL indirim kazandın \(sepetindekilerle birlikte\)/);
  // 360 px'te iki satır, taşma yok
  const o = await s.evaluate((q) => { const u = document.querySelector(q + ' .kp-serit__ust'); const r = u.getBoundingClientRect(); return { tasmaYok: u.scrollWidth <= u.clientWidth && u.scrollHeight <= u.clientHeight + 1 && r.right <= innerWidth, satir: Math.round(r.height / parseFloat(getComputedStyle(u).lineHeight)) }; }, ana);
  assert.ok(o.tasmaYok && o.satir <= 2, '360 px şerit (birlikte): ' + JSON.stringify(o));
  // Özet: tasarımın satırlarına düşen indirimler
  await s.locator(ana + ' [data-kp-adim="ozet"]').click();
  await bekle(s, ana + ' .kp-ozet', /Ekstra/);
  assert.deepEqual(await s.$$eval(ana + ' .kp-ozet__kampanya', (x) => x.map((e) => e.innerText.replace(/\s+/g, ' ').trim())), ["✓ 4'lü patch indirimi −222 TL", '✓ Ekstra %10 indirim −377 TL']);
  assert.match(await metin(s, ana + ' [data-kp-ileri]'), /3\.391 TL$/);
  console.log('sepetle birlikte:', sol);
  assert.deepEqual(hatalar, []);
  await baglam.close();
}

await t.close();
console.log('KAMPANYA E2E TAMAM');
