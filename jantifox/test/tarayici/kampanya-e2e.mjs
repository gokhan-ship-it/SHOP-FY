// Faz 3: kampanyalı fiyatlar, kampanya şeridi ve kazanma bildirimi. Storefront API, mağazadaki kurallar gibi taklit edilir:
// uygun patch adedi 2/3/4 → 60/190/370 TL (adları Shopify'daki gibi boşluklu), ara toplam ≥ 5.000 TL → Ekstra %10.
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
  const d = [];
  if (n >= 4) d.push(['  4\'lü  patche indirim ', 37000]);
  else if (n === 3) d.push([' 3\'lü  patche indirim ', 19000]);
  else if (n === 2) d.push(['2li patche indirim ', 6000]);
  if (ara >= 500000) d.push(['Ekstra %10 İndirim', Math.round(ara * 0.1)]);
  const tl = (k) => (k / 100).toFixed(1);
  return { cost: { subtotalAmount: { amount: tl(ara) }, totalAmount: { amount: tl(ara - d.reduce((t, x) => t + x[1], 0)) } },
    discountAllocations: d.map(([title, k]) => ({ title, discountedAmount: { amount: tl(k) } })), lines: { nodes: [] } };
}

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function sayfaAc(secenek = {}) {
  const baglam = await t.newContext({ ...devices['iPhone 13'], reducedMotion: secenek.azHareket ? 'reduce' : 'no-preference' });
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
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
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
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('#kp-isim').fill('ec');
  await bekle(s, ana + ' [data-kp-serit-sol]', /60 TL/);
  assert.equal(await metin(s, ana + ' [data-kp-serit-sol]'), '✓ 60 TL kampanya indirimi');
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), '1 patch daha: indirim 60 TL → 190 TL');
  // Duraklar: 2'li, 3'lü, 4'lü (örnek patch simülasyonundan) + Ekstra %10 (ayarlardan); ilki dolu
  await s.waitForFunction(() => document.querySelectorAll('.kp-editor:not(.kp-editor--alt) .kp-serit__nokta').length === 4);
  assert.deepEqual(await s.$$eval(ana + ' .kp-serit__nokta', (n) => n.map((x) => [x.title, x.classList.contains('kp-serit__nokta--ulasildi')])),
    [["2li patche indirim", true], ["3'lü patche indirim", false], ["4'lü patche indirim", false], ['Ekstra %10 İndirim', false]]);
  // Bildirim: kırmızı zemin, beyaz yazı
  await s.locator(ana + ' [data-kp-kazanc]:not([hidden])').waitFor();
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), '🎉 2li patche indirim · −60 TL');
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).backgroundColor, ana + ' [data-kp-kazanc]'), 'rgb(179, 20, 27)');
  // Fiyat çubuğu: eski toplam üstü çizili, kampanyalı toplam; not yok
  assert.equal(await metin(s, ana + ' [data-kp-toplam]'), '3.660 TL 3.600 TL');
  assert.equal(await metin(s, ana + ' [data-kp-toplam] s'), '3.660 TL');
  assert.equal(await s.locator(ana + ' .kp-alt__fiyat .kp-indirim-notu').isVisible(), false);
  // Şerit fiyat çubuğunun hemen üstünde, ~40 px
  const [serit, alt] = await s.evaluate((q) => [q + ' [data-kp-serit]', q + ' .kp-alt'].map((x) => document.querySelector(x).getBoundingClientRect()).map((r) => ({ y: r.y, h: r.height, b: r.bottom })), ana);
  assert.ok(Math.abs(serit.b - alt.y) < 1, 'şerit fiyat çubuğuna bitişik');
  assert.ok(serit.h >= 38 && serit.h <= 56, 'şerit yüksekliği ' + serit.h);

  await s.locator('#kp-isim').fill('ece');
  await bekle(s, ana + ' [data-kp-kazanc]', /3'lü/);
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), "🎉 3'lü patche indirim · −190 TL");
  await bekle(s, ana + ' [data-kp-serit-sag]', /370/);
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), '1 patch daha: indirim 190 TL → 370 TL');

  // 4 patch: adet basamakları bitti, sıradaki hedef tutar eşiği
  await s.locator('#kp-isim').fill('ece7');
  await bekle(s, ana + ' [data-kp-serit-sag]', /kaldı/);
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), "Ekstra %10'a 680 TL kaldı");
  assert.equal(await metin(s, ana + ' [data-kp-serit-sol]'), '✓ 370 TL kampanya indirimi');
  const dolu = await s.evaluate((q) => parseFloat(document.querySelector(q + ' [data-kp-serit-dolu]').style.width), ana);
  assert.ok(dolu > 90 && dolu < 100, 'çubuk Ekstra %10 durağına yaklaşıyor: ' + dolu);

  // Adet 2 → ara toplam 5.000 TL'yi geçer: Ekstra %10, tüm kampanyalar
  await s.evaluate(() => { document.querySelector('#Quantity-main').value = '2'; });
  await s.locator(ana + ' [data-kp-adim="ikon"]').click();
  await bekle(s, ana + ' [data-kp-kazanc]', /Ekstra/);
  assert.equal(await metin(s, ana + ' [data-kp-kazanc]'), '✨ Ekstra %10 indirim açıldı · Tüm siparişinde −864 TL');
  assert.equal(await metin(s, ana + ' [data-kp-serit-sol]'), '✓ 1.234 TL kampanya indirimi · Tüm kampanyalar yakalandı 🎉');
  assert.equal(await metin(s, ana + ' [data-kp-serit-sag]'), '');
  assert.equal(await s.locator(ana + ' .kp-serit__nokta--ulasildi').count(), 4);

  // Özet: şerit yok, kampanyalar satır satır
  await s.locator(ana + ' [data-kp-adim="ozet"]').click();
  assert.equal(await s.locator(ana + ' [data-kp-serit]').isVisible(), false);
  await bekle(s, ana + ' .kp-ozet', /Ekstra/);
  assert.deepEqual(await s.$$eval(ana + ' .kp-ozet__kampanya th', (x) => x.map((e) => e.textContent)), ["✓ 4'lü patche indirim", '✓ Ekstra %10 İndirim']);

  // Aynı oturumda bildirim tekrar çıkmaz
  const gorulen = await s.evaluate(() => JSON.parse(sessionStorage.getItem('kp-kampanya-gorulen')));
  assert.deepEqual(gorulen.sort(), ["2li patche indirim", "3'lü patche indirim", "4'lü patche indirim", 'Ekstra %10 İndirim'].sort());
  await s.waitForTimeout(2700); // önceki bildirim kaybolsun
  await s.locator(ana + ' [data-kp-adim="yazi"]').click();
  await s.locator('#kp-isim').fill('ec');
  await s.waitForTimeout(700);
  await s.locator('#kp-isim').fill('ece7');
  await s.waitForTimeout(900);
  assert.equal(await s.locator(ana + ' [data-kp-kazanc]').isVisible(), false, 'bildirim oturumda bir kez');

  // Aksesuar ekranında da şerit ve kampanyalı toplam
  await s.evaluate(() => { document.querySelector('#Quantity-main').value = '1'; });
  await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
  await s.locator('[data-kp-aksesuar="9101"]').click();
  await s.locator('.kp-editor--alt').waitFor({ state: 'visible' });
  await bekle(s, '.kp-editor--alt [data-kp-serit-sol]', /kampanya indirimi/);
  // çanta 3.000 + ECE7 1.320 + kalem kutusu 1.700 = 6.020; 4'lü −370, Ekstra %10 −602
  assert.equal(await metin(s, '.kp-editor--alt [data-kp-toplam]'), '6.020 TL 5.048 TL');
  assert.equal(await metin(s, '.kp-editor--alt [data-kp-serit-sol]'), '✓ 972 TL kampanya indirimi · Tüm kampanyalar yakalandı 🎉');
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
await t.close();
console.log('KAMPANYA E2E TAMAM');
