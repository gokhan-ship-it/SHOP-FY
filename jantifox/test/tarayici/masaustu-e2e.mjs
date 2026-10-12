// Masaüstü düzeni (1024 px ve üzeri): araçlar (78 × 78) önizlemenin solunda ortalı, sağ sütunda aracın adı ve paneli,
// altta sürekli görünen Kampanyalar kartı, kartın üstünde ince kazanma bildirimi, kenar satırında "Sığdırmayı dene".
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node masaustu-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

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
const ana = '.kp-editor:not(.kp-editor--alt)';
for (const [w, h] of [[1440, 900], [1024, 768]]) {
  const baglam = await t.newContext({ viewport: { width: w, height: h } });
  const s = await baglam.newPage();
  const hatalar = [];
  s.on('pageerror', (e) => hatalar.push(e.message));
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/api/2025-07/graphql.json') {
      const { variables } = JSON.parse(r.request().postData());
      const data = {};
      for (const [ad, satirlar] of Object.entries(variables)) data[ad] = { cart: sepet(satirlar), userErrors: [] };
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
    }
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
    return r.fulfill({ contentType: 'text/html', body: html });
  });
  const metin = async (q) => (await s.locator(q).first().innerText()).replace(/\s+/g, ' ').trim();
  const gorunur = (q) => s.locator(q).first().isVisible();
  await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
  await s.waitForFunction(() => !!localStorage.getItem('kp-kampanya-kurallari-2'));
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('#kp-isim').fill('ece7');
  await s.locator('#kp-isim').blur();
  await s.waitForTimeout(500);

  // Sol: araçlar 78 × 78, önizlemenin solunda dikeyde ortalı; önizleme köşeleri yuvarlak; üzerindeki düğmeler
  const sol = await s.evaluate((q) => {
    const r = (x) => document.querySelector(q + ' ' + x).getBoundingClientRect();
    const a = r('.kp-araclar'), ic = r('.kp-onizleme__ic'), d = r('.kp-arac-dugme'), g = r('.kp-gecmis'), x = r('.kp-kapat--onizleme'), gor = r('[data-kp-gorunum]'), sag = r('.kp-sag');
    return {
      dugme: [Math.round(d.width), Math.round(d.height)],
      solda: a.right <= ic.left, orta: Math.abs((a.top + a.bottom) / 2 - (ic.top + ic.bottom) / 2) < 2,
      yuvarlak: parseFloat(getComputedStyle(document.querySelector(q + ' .kp-gorunum')).borderTopLeftRadius) >= 12,
      gecmis: g.left - ic.left < 16 && g.top - ic.top < 16, x: ic.right - x.right < 16 && x.top - ic.top < 16, gorunum: ic.right - gor.right < 16 && ic.bottom - gor.bottom < 16,
      sagGenislik: Math.round(sag.width), sagZemin: getComputedStyle(document.querySelector(q + ' .kp-sag')).backgroundColor, onizlemeSolda: ic.right <= sag.left
    };
  }, ana);
  assert.deepEqual(sol, { dugme: [78, 78], solda: true, orta: true, yuvarlak: true, gecmis: true, x: true, gorunum: true, sagGenislik: 520, sagZemin: 'rgb(255, 255, 255)', onizlemeSolda: true }, w + ': ' + JSON.stringify(sol));
  // Geri al / Yinele: SVG kıvrık oklar
  assert.deepEqual(await s.$$eval(ana + ' .kp-gecmis__dugme', (b) => b.map((x) => x.querySelectorAll('svg path').length)), [2, 2]);

  // Sağ sütun: en üstte seçili aracın adı
  assert.equal(await metin(ana + ' [data-kp-arac-baslik]'), 'Metin');
  await s.locator(ana + ' .kp-arac-dugme[data-kp-adim="ikon"]').click();
  assert.equal(await metin(ana + ' [data-kp-arac-baslik]'), 'Görsel');

  // Kampanyalar kartı: alt çubuğun hemen üstünde, sürekli görünür
  await s.waitForFunction((q) => /370 TL kazandın/.test(document.querySelector(q + ' [data-kp-kkart]').textContent), ana);
  const kart = await s.evaluate((q) => {
    const k = document.querySelector(q + ' [data-kp-kkart]').getBoundingClientRect(); const a = document.querySelector(q + ' .kp-alt').getBoundingClientRect();
    const kz = document.querySelector(q + ' [data-kp-kkart-kazanc]');
    return { ustunde: k.bottom <= a.top && a.top - k.bottom < 20, kazanc: kz.textContent, kazancRenk: getComputedStyle(kz).color, kalin: Number(getComputedStyle(kz).fontWeight) >= 700 };
  }, ana);
  assert.deepEqual(kart, { ustunde: true, kazanc: '370 TL kazandın', kazancRenk: 'rgb(179, 20, 27)', kalin: true });
  const duraklar = await s.$$eval(ana + ' .kp-kkart__durak', (l) => l.map((x) => [x.querySelector('.kp-kkart__ad').textContent, x.querySelector('.kp-kkart__tutar').textContent, x.classList.contains('kp-kkart__durak--ulasildi') ? 'ulaşıldı' : x.classList.contains('kp-kkart__durak--siradaki') ? 'sıradaki' : 'gri', x.querySelector('.kp-kkart__nokta').textContent]));
  assert.deepEqual(duraklar, [["2'li", '−60 TL', 'ulaşıldı', '✓'], ["3'lü", '−190 TL', 'ulaşıldı', '✓'], ["4'lü", '−370 TL', 'ulaşıldı', '✓'], ['%10', '5.000 TL+', 'sıradaki', '']]);
  assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q + ' .kp-kkart__durak--siradaki .kp-kkart__nokta')).borderTopColor, ana), 'rgb(232, 116, 43)');
  assert.deepEqual(await s.$$eval(ana + ' [data-kp-kkart-liste] li', (l) => l.map((x) => x.innerText.replace(/\s+/g, ' ').trim())), ["✓ 4'lü patch indirimi −370 TL"]);
  assert.equal(await metin(ana + ' [data-kp-kkart-hedef]'), '1.050 TL daha ekle, tüm siparişe %10 indirim.');
  const dolu = await s.evaluate((q) => parseFloat(document.querySelector(q + ' [data-kp-kkart-dolu]').style.width), ana);
  assert.ok(dolu > 75 && dolu < 100, 'çizgi: ' + dolu);
  // Alt çubuk: solda eski + yeni fiyat ve beyaz yazılı kırmızı etiket, sağda "Tasarımı tamamla →"
  assert.equal(await metin(ana + ' [data-kp-toplam]'), '4.320 TL 3.950 TL −370 TL');
  const et = await s.evaluate((q) => { const c = getComputedStyle(document.querySelector(q + ' .kp-alt__etiket')); return [c.color, c.backgroundColor, Number(c.fontWeight) >= 700]; }, ana);
  assert.deepEqual(et, ['rgb(255, 255, 255)', 'rgb(179, 20, 27)', true]);
  assert.equal(await metin(ana + ' [data-kp-ileri]'), 'Tasarımı tamamla →');
  // Masaüstünde fiyata dokununca panel açılmaz (kampanyalar kartta)
  await s.locator(ana + ' [data-kp-fiyat-ac]').click();
  assert.equal(await gorunur(ana + ' [data-kp-kpanel]'), false);

  // Kazanma bildirimi: kartın hemen üstünde, kartla aynı genişlikte, ince, kısa metin; önizlemeye/karta binmez
  await s.evaluate(() => { document.querySelector('#Quantity-main').value = '2'; });
  await s.locator(ana + ' .kp-arac-dugme[data-kp-adim="yazi"]').click();
  await s.waitForFunction((q) => { const e = document.querySelector(q + ' [data-kp-kazanc-masa]'); return e && !e.hidden; }, ana, { timeout: 5000 });
  await s.waitForTimeout(450); // giriş animasyonu
  const bil = await s.evaluate((q) => {
    const b = document.querySelector(q + ' [data-kp-kazanc-masa]'); const r = b.getBoundingClientRect(); const k = document.querySelector(q + ' [data-kp-kkart]').getBoundingClientRect();
    const ic = document.querySelector(q + ' .kp-onizleme__ic').getBoundingClientRect();
    return { metin: b.innerText.replace(/\s+/g, ' ').trim(), ince: r.height <= 44, ustunde: r.bottom <= k.top + 1 && k.top - r.bottom < 16, genislik: Math.abs(r.width - k.width) < 2, onizlemeDisinda: r.left >= ic.right, mobil: !document.querySelector(q + ' [data-kp-kazanc]').hidden && getComputedStyle(document.querySelector(q + ' [data-kp-kazanc]')).display !== 'none' };
  }, ana);
  assert.deepEqual(bil, { metin: '✨ Ekstra %10 indirim açıldı · −827 TL', ince: true, ustunde: true, genislik: true, onizlemeDisinda: true, mobil: false }, JSON.stringify(bil));
  assert.equal(await metin(ana + ' [data-kp-kkart-kazanc]'), '1.197 TL kazandın 🎉');
  assert.equal(await metin(ana + ' [data-kp-kkart-hedef]'), 'Bütün kampanyalar sepetinde.');
  await s.waitForFunction((q) => document.querySelector(q + ' [data-kp-kazanc-masa]').hidden, ana, { timeout: 5000 });
  // Masaüstünde öneri bildirimi yok (hedef kartta)
  await s.locator('#kp-isim').fill('ec');
  await s.waitForTimeout(1500);
  assert.equal(await s.locator(ana + ' [data-kp-kazanc-masa]').isVisible(), false);
  await s.evaluate(() => { document.querySelector('#Quantity-main').value = '1'; });

  // Kenar satırı: "↧ Kenar · N patch · fiyata dahil değil", sağında "Sığdırmayı dene"; ayrı kenar notu yok
  await s.evaluate(() => { const e = document.querySelector('kisisel-kart').editor; window.KisiselEditorIc.kenar.kenaraAl(e.t, 'isim'); e.yenile(); });
  assert.match(await metin(ana + ' [data-kp-kenar]'), /^↧ Kenar · 2 patch · fiyata dahil değil.*Sığdırmayı dene$/);
  assert.equal(await gorunur(ana + ' [data-kp-kenar-not]'), false);
  const kenar = await s.evaluate((q) => { const k = document.querySelector(q + ' [data-kp-kenar]').getBoundingClientRect(); const b = document.querySelector(q + ' [data-kp-sigdir-kenar]').getBoundingClientRect(); const st = document.querySelector(q + ' .kp-satir').getBoundingClientRect(); return { sagda: k.right - b.right < 16, altta: k.top >= st.bottom - 1 }; }, ana);
  assert.deepEqual(kenar, { sagda: true, altta: true });
  await s.locator(ana + ' [data-kp-sigdir-kenar]').click();
  assert.equal(await gorunur(ana + ' [data-kp-kenar]'), false, 'kenar boşaldı');

  // Özet: kart yok, başlık yok
  await s.locator(ana + ' [data-kp-ileri]').click();
  assert.equal(await gorunur(ana + ' [data-kp-kkart]'), false);
  assert.equal(await gorunur(ana + ' [data-kp-arac-baslik]'), false);
  assert.deepEqual(hatalar, []);
  await baglam.close();
  console.log(w + ' px tamam');
}
await t.close();
console.log('MASAÜSTÜ E2E TAMAM');
