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
// Kampanya panelinin içeriği (panel kapalıyken de güncel)
const pm = async (s, q) => ((await s.locator(q).first().textContent()) || '').replace(/\s+/g, ' ').trim();
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
  // Anında: Shopify'ın cevabını beklemeden (ara durum yok); fiyatın yanında küçük kırmızı indirim etiketi
  assert.equal(await metin(s, ana + ' [data-kp-toplam]'), '3.660 TL 3.600 TL −60 TL', 'kampanyalı fiyat anında');
  assert.equal(await pm(s, ana + ' [data-kp-serit-sol]'), '60 TL indirim kazandın.');
  assert.equal(await pm(s, ana + ' [data-kp-serit-sag]'), '1 patch daha ekle, indirimin 190 TL olsun.');
  // Duraklar (panelde): 2'li, 3'lü, 4'lü (öğrenilen) + Ekstra %10 (ayarlardan); ilki dolu
  const duraklar = () => s.$$eval(ana + ' .kp-kpanel__durak', (n) => n.map((x) => [x.textContent, x.classList.contains('kp-kpanel__durak--ulasildi')]));
  console.log('duraklar:', JSON.stringify(await duraklar()));
  assert.deepEqual(await duraklar(), [["2'li", true], ["3'lü", false], ["4'lü", false], ['Ekstra %10', false]]);
  // Kazanma bildirimi: kırmızı zemin, beyaz yazı, anlaşılır ad; ardından öneri (koyu) aynı yerde
  await s.locator(ana + ' [data-kp-kazanc]:not([hidden])').waitFor();
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), "🎉 2'li patch indirimi · −60 TL");
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).backgroundColor, ana + ' [data-kp-kazanc]'), 'rgb(179, 20, 27)');
  await s.waitForFunction((q) => { const e = document.querySelector(q); return e && !e.hidden && e.classList.contains('kp-kazanc--oneri'); }, ana + ' [data-kp-kazanc]', { timeout: 5000 });
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), '🎯 1 patch daha ekle, indirimin 190 TL olsun');
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).backgroundColor, ana + ' [data-kp-kazanc]'), 'rgb(30, 30, 36)');
  await s.waitForFunction((q) => document.querySelector(q).hidden, ana + ' [data-kp-kazanc]', { timeout: 5000 });
  assert.equal(await metin(s, ana + ' [data-kp-toplam] s'), '3.660 TL');
  assert.equal(await s.locator(ana + ' .kp-alt__fiyat .kp-indirim-notu').isVisible(), false);
  // Tek satırlık alt çubuk (~64 px): en üstte 3 px çizgi, solda fiyat, sağda buton; sabit kampanya metni yok
  assert.equal(await s.locator(ana + ' .kp-serit__ust').count(), 0);
  const [alt, cizgi, fiyat, buton, etiket] = await s.evaluate((q) => [' .kp-alt', ' [data-kp-serit-cubuk]', ' .kp-alt__fiyat', ' [data-kp-ileri]', ' .kp-alt__etiket'].map((x) => document.querySelector(q + x).getBoundingClientRect()).map((r) => ({ y: r.y, h: r.height, b: r.bottom, x: r.x, r: r.right, m: r.y + r.height / 2 })), ana);
  assert.ok(alt.h <= 70, 'alt çubuk tek satır: ' + alt.h);
  assert.ok(Math.abs(cizgi.y - alt.y) < 2 && cizgi.h === 3, 'çizgi en üstte, 3 px: ' + JSON.stringify(cizgi));
  assert.ok(fiyat.r <= buton.x && Math.abs(fiyat.m - buton.m) < 6, 'solda fiyat, sağda buton, aynı satır');
  assert.ok(etiket.x >= fiyat.x && etiket.r <= buton.x, 'indirim etiketi fiyatın yanında');
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).backgroundColor, ana + ' .kp-alt__etiket'), 'rgb(179, 20, 27)');
  // Fiyata dokununca kampanya paneli: kazanılanlar, sıradaki hedef, ilerleme; dışına dokununca kapanır
  await s.locator(ana + ' [data-kp-fiyat-ac]').click();
  assert.equal(await s.locator(ana + ' [data-kp-kpanel]').isVisible(), true);
  assert.deepEqual(await s.$$eval(ana + ' [data-kp-kpanel-liste] li', (x) => x.map((e) => e.innerText.replace(/\s+/g, ' ').trim())), ["✓ 2'li patch indirimi −60 TL"]);
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), '1 patch daha ekle, indirimin 190 TL olsun.');
  assert.equal(await s.locator(ana + ' [data-kp-kpanel-birlikte]').isVisible(), false);
  const panelMetni = await metin(s, ana + ' .kp-kpanel__kutu');
  assert.ok(!/kaldı|→|patche|İndirim /.test(panelMetni), panelMetni);
  await s.locator(ana + ' .kp-kpanel__perde').click({ position: { x: 30, y: 30 } });
  assert.equal(await s.locator(ana + ' [data-kp-kpanel]').isVisible(), false, 'dışına dokununca kapanır');

  await s.locator('#kp-isim').fill('ece');
  assert.equal(await metin(s, ana + ' [data-kp-toplam]'), '3.990 TL 3.800 TL −190 TL', 'anında');
  await bekle(s, ana + ' [data-kp-kazanc]', /3'lü/);
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), "🎉 3'lü patch indirimi · −190 TL");
  assert.equal(await pm(s, ana + ' [data-kp-serit-sag]'), '1 patch daha ekle, indirimin 370 TL olsun.');

  // 4 patch: adet basamakları bitti, sıradaki hedef tutar eşiği (uzak: öneri çıkmaz)
  await s.locator('#kp-isim').fill('ece7');
  // Eşik, Shopify'daki gibi adet indirimi düşülmüş tutara göre: 5.000 − (4.320 − 370) = 1.050 TL
  assert.equal(await pm(s, ana + ' [data-kp-serit-sag]'), '1.050 TL daha ekle, tüm siparişe %10 indirim.');
  assert.equal(await pm(s, ana + ' [data-kp-serit-sol]'), '370 TL indirim kazandın.');
  const dolu = await s.evaluate((q) => parseFloat(document.querySelector(q + ' [data-kp-serit-dolu]').style.width), ana);
  assert.ok(dolu > 90 && dolu < 100, 'çubuk Ekstra %10 durağına yaklaşıyor: ' + dolu);
  await s.waitForTimeout(3200);
  assert.ok(!(await s.locator(ana + ' [data-kp-kazanc].kp-kazanc--oneri:not([hidden])').count()), 'eski öneri (370 TL) yeni tasarımda gösterilmez');

  // Adet 2 → ara toplam 5.000 TL'yi geçer: Ekstra %10, tüm kampanyalar
  await s.evaluate(() => { document.querySelector('#Quantity-main').value = '2'; });
  if (await s.locator(ana + ' [data-kp-adim="tasarim"]').isVisible()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
  await s.locator(ana + ' [data-kp-adim="ikon"]').click();
  await bekle(s, ana + ' [data-kp-kazanc]', /Ekstra/);
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), '✨ Ekstra %10 indirim açıldı · Tüm siparişinde −827 TL');
  assert.equal(await pm(s, ana + ' [data-kp-serit-sol]'), '1.197 TL indirim kazandın 🎉');
  assert.equal(await pm(s, ana + ' [data-kp-serit-sag]'), 'Bütün kampanyalar sepetinde.');
  assert.equal(await s.locator(ana + ' .kp-kpanel__durak--ulasildi').count(), 4);

  // Özet: şerit yok, kampanyalar satır satır, anlaşılır adlarla
  await s.locator(ana + ' [data-kp-ileri]').click();
  assert.equal(await s.locator(ana + ' [data-kp-serit]').isVisible(), false);
  await bekle(s, ana + ' .kp-ozet', /Ekstra/);
  assert.deepEqual(await s.$$eval(ana + ' .kp-ozet__kampanya th', (x) => x.map((e) => e.textContent)), ["✓ 4'lü patch indirimi", '✓ Ekstra %10 indirim']);

  // Aynı oturumda bildirim tekrar çıkmaz
  const gorulen = await s.evaluate(() => JSON.parse(sessionStorage.getItem('kp-kampanya-gorulen')));
  assert.deepEqual(gorulen.sort(), ["2li patche indirim", "3'lü patche indirim", "4'lü patche indirim", 'Ekstra %10 İndirim'].sort());
  await s.waitForTimeout(2700); // önceki bildirim kaybolsun
  if (await s.locator(ana + ' [data-kp-adim="tasarim"]').isVisible()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
  await s.locator(ana + ' [data-kp-adim="yazi"]').click();
  await s.locator('#kp-isim').fill('ec');
  await s.waitForTimeout(300);
  await s.locator('#kp-isim').fill('ece7');
  await s.waitForTimeout(900);
  assert.equal(await s.locator(ana + ' [data-kp-kazanc]').isVisible(), false, 'bildirim oturumda bir kez');

  // Aksesuar ekranında da şerit ve kampanyalı toplam
  await s.evaluate(() => { document.querySelector('#Quantity-main').value = '1'; });
  if (await s.locator(ana + ' [data-kp-adim="tasarim"]').isVisible()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
  await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
  await s.locator('[data-kp-aksesuar="9101"]').click();
  await s.locator('.kp-editor--alt').waitFor({ state: 'visible' });
  await bekle(s, '.kp-editor--alt [data-kp-serit-sol]', /indirim kazandın/);
  // çanta 3.000 + ECE7 1.320 + kalem kutusu 1.700 = 6.020; 4'lü −370, Ekstra %10 −565
  assert.equal(await metin(s, '.kp-editor--alt [data-kp-toplam]'), '6.020 TL 5.085 TL −935 TL');
  assert.equal(await pm(s, '.kp-editor--alt [data-kp-serit-sol]'), '935 TL indirim kazandın 🎉');
  await s.locator('.kp-editor--alt [data-kp-vazgec]').click();

  // Ürün kartında kampanyalı toplam ve buton
  await s.locator(ana + ' [data-kp-ileri]').click();
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
  // Kazanma bildirimi ~2,6 sn sonra kaybolur, ardından öneri; o da birkaç saniye sonra kaybolur
  await s.waitForFunction((q) => document.querySelector(q).classList.contains('kp-kazanc--oneri'), ana + ' [data-kp-kazanc]', { timeout: 4000 });
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).animationName, ana + ' [data-kp-kazanc]'), 'none');
  await s.waitForTimeout(3400);
  assert.equal(await s.locator(ana + ' [data-kp-kazanc]').isVisible(), false, 'öneri de kaybolur');
  await baglam.close();
}
// ---------- 360 px genişlik: kampanya metni iki satıra iner, taşmaz; adım halkası kesilmez ----------
{
  const { s, hatalar, baglam } = await sayfaAc({ genislik: 360 });
  await s.waitForFunction(() => !!localStorage.getItem('kp-kampanya-kurallari-2'));
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('#kp-isim').fill('ece7');
  await bekle(s, ana + ' [data-kp-serit-sag]', /daha ekle/);
  // 360 px: alt çubuk tek satır, taşma yok; araçlar, önizleme ve X ekranın içinde
  const o = await s.evaluate((q) => {
    const r = (x) => document.querySelector(q + ' ' + x).getBoundingClientRect();
    const alt = r('.kp-alt'), f = r('.kp-alt__fiyat'), b = r('[data-kp-ileri]'), x = r('.kp-kapat--onizleme'), a = r('.kp-araclar'), ic = r('.kp-onizleme__ic');
    return { altH: Math.round(alt.height), yanYana: f.right <= b.left && b.right <= innerWidth - 8, x: x.right <= innerWidth - 4 && x.top >= 0, araclar: a.left >= 8 && a.right <= ic.left, tasma: document.documentElement.scrollWidth <= innerWidth };
  }, ana);
  console.log('360 px:', JSON.stringify(o));
  assert.deepEqual(o, { altH: o.altH, yanYana: true, x: true, araclar: true, tasma: true });
  assert.ok(o.altH <= 70, 'alt çubuk tek satır: ' + o.altH);
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
  assert.equal(await metin(s, ana + ' [data-kp-toplam]'), '3.990 TL 3.391 TL −599 TL');
  const sol = await pm(s, ana + ' [data-kp-serit-sol]');
  assert.match(sol, /^[\d.]+ TL indirim kazandın \(sepetindekilerle birlikte\)/);
  // Kampanya panelinde: bu tasarıma düşen tutarlar ve sepettekilerle birlikte notu
  await s.locator(ana + ' [data-kp-fiyat-ac]').click();
  assert.match(await metin(s, ana + ' [data-kp-serit-sol]'), /\(sepetindekilerle birlikte\)/);
  assert.deepEqual(await s.$$eval(ana + ' [data-kp-kpanel-liste] li', (x) => x.map((e) => e.innerText.replace(/\s+/g, ' ').trim())), ["✓ 4'lü patch indirimi −222 TL", '✓ Ekstra %10 indirim −377 TL']);
  assert.equal(await metin(s, ana + ' [data-kp-kpanel-birlikte]'), 'Bu tasarıma düşen indirim 599 TL, kalanı sepetindeki diğer ürünlerden.');
  await s.keyboard.press('Escape');
  assert.equal(await s.locator(ana + ' [data-kp-kpanel]').isVisible(), false, 'Esc ile kapanır');
  assert.equal(await s.locator('.kp-editor').first().isVisible(), true, 'editör açık kalır');
  // Özet: tasarımın satırlarına düşen indirimler
  await s.locator(ana + ' [data-kp-ileri]').click();
  await bekle(s, ana + ' .kp-ozet', /Ekstra/);
  assert.deepEqual(await s.$$eval(ana + ' .kp-ozet__kampanya', (x) => x.map((e) => e.innerText.replace(/\s+/g, ' ').trim())), ["✓ 4'lü patch indirimi −222 TL", '✓ Ekstra %10 indirim −377 TL']);
  assert.match(await metin(s, ana + ' [data-kp-ileri]'), /3\.391 TL$/);
  console.log('sepetle birlikte:', sol);
  assert.deepEqual(hatalar, []);
  await baglam.close();
}

await t.close();
console.log('KAMPANYA E2E TAMAM');
