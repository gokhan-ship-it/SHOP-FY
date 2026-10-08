// Çok renkli harf seti (Piramit): set geçişi, otomatik renk, kısa yol satırı, karıştır, önizleme balonu,
// harfleri ayır + döndürme, eksik harf uyarıları, sepete doğru renk varyantı ve özet.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node piramit-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const cikti = new URL('ekran/piramit/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const PIRAMIT = '9722983907614';

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const cdp = await baglam.newCDPSession(s);
const dokun = async (nokta) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(nokta[0]), y: Math.round(nokta[1]), id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(150);
};
const merkezi = (q) => s.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, q);
// Kısa yol satırındaki harflerin seçili renkleri
const satirRenkleri = () => s.$$eval('.kp-renk-harf', (h) => h.map((x) => {
  const sec = x.querySelector('.kp-nokta[aria-pressed="true"]') || x.querySelector('.kp-nokta--pasif');
  return sec ? sec.getAttribute('title') : null;
}));

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('.kp-editor').waitFor({ state: 'visible' });
await s.waitForTimeout(300);

// 1) Set kartları: Cool + Piramit. Cool'da isim yaz, Piramit'e geç: isim korunur, renkler atanır
assert.equal(await s.locator('[data-kp-set]').count(), 2);
await s.locator('#kp-isim').fill('ece');
assert.equal(await s.locator('[data-kp-renkler]').isVisible(), false, 'Cool\'da renk satırı yok');
await s.locator(`label:has([data-kp-set][value="${PIRAMIT}"])`).click();
await s.waitForTimeout(200);
assert.equal(await s.locator('#kp-isim').inputValue(), 'ECE', 'isim korundu');
assert.equal(await s.locator('[data-kp-renkler]').isVisible(), true);
let renkler = await satirRenkleri();
console.log('otomatik renkler:', renkler.join(', '));
assert.equal(renkler.length, 3);
assert.ok(renkler.every(Boolean));
// Nokta boyutları ve tek renkli harf
const noktaOlcu = await s.$$eval('.kp-renkler .kp-nokta', (n) => n.map((x) => Math.round(x.getBoundingClientRect().width)));
assert.ok(noktaOlcu.every((w) => w >= 24), 'noktalar en az 24 px: ' + noktaOlcu);
assert.equal(await s.locator('.kp-renk-harf').nth(1).locator('button.kp-nokta').count(), 0, 'C tek renk: seçim yok');
assert.equal(await s.locator('.kp-renk-harf').nth(1).locator('.kp-nokta--pasif').count(), 1, 'C: tek pasif nokta');
assert.equal(await s.locator('.kp-renk-harf').nth(0).locator('button.kp-nokta').count(), 3, 'E: 3 stoktaki renk');
await s.screenshot({ path: cikti + '01-renk-satiri.png' });

// 2) Kısa yoldan renk seç: 1. E Turkuaz (stokta 1), sonra 3. E Turkuaz → 1. E başka renge geçer, uyarı yok
const gorselOnce = await s.locator('.kp-parca--letter').first().locator('img').getAttribute('src');
await s.locator('.kp-renk-harf').nth(0).locator('button[title="Turkuaz"]').click();
assert.equal((await satirRenkleri())[0], 'Turkuaz');
assert.notEqual(await s.locator('.kp-parca--letter').first().locator('img').getAttribute('src'), gorselOnce, 'önizleme görseli değişti');
await s.locator('.kp-renk-harf').nth(2).locator('button[title="Turkuaz"]').click();
renkler = await satirRenkleri();
console.log('3. E Turkuaz seçilince:', renkler.join(', '));
assert.equal(renkler[2], 'Turkuaz');
assert.notEqual(renkler[0], 'Turkuaz', 'stok 1: ilk E başka renge geçti');
assert.equal(await s.locator('[data-kp-isim-uyari] .kp-uyari--hata').count(), 0, 'stok uyarısı yok');

// 3) Renkleri karıştır: geçerli dağılım (değişene kadar birkaç kez)
const once = (await satirRenkleri()).join();
let sonra = once;
for (let i = 0; i < 8 && sonra === once; i++) {
  await s.locator('[data-kp-karistir]').click();
  sonra = (await satirRenkleri()).join();
}
console.log('karıştır:', once, '→', sonra);
assert.notEqual(sonra, once);
assert.ok(sonra.split(',').filter((r) => r === 'Turkuaz').length <= 1);

// 4) Önizleme balonu: blok modda C'ye dokun → balon (tek renk: pasif nokta + döndür), blok bozulmaz
await dokun(await merkezi('[data-uid="isim-1"]'));
assert.equal(await s.locator('[data-kp-balon]').isVisible(), true, 'balon açıldı');
assert.match(await s.locator('[data-kp-secili-ad]').textContent(), /İsim \(ECE\)/, 'blok seçili (harf ayrılmadı)');
assert.equal(await s.locator('[data-kp-balon] button.kp-nokta').count(), 0);
assert.equal(await s.locator('[data-kp-balon] .kp-nokta--pasif').count(), 1);
assert.equal(await s.locator('.kp-parca[data-grup="isim"]').count(), 3, 'harfler hâlâ blokta');
// E'ye dokun → 3 renk noktası (36 px), birini seç
await dokun(await merkezi('[data-uid="isim-0"]'));
const balonNokta = await s.$$eval('[data-kp-balon] button.kp-nokta', (n) => n.map((x) => [Math.round(x.getBoundingClientRect().width), x.getAttribute('title')]));
console.log('balon noktaları:', JSON.stringify(balonNokta));
assert.equal(balonNokta.length, 3);
assert.ok(balonNokta.every(([w]) => w >= 36));
// Balon harfin üstünde mi?
const konum = await s.evaluate(() => {
  const b = document.querySelector('[data-kp-balon]').getBoundingClientRect();
  const h = document.querySelector('[data-uid="isim-0"]').getBoundingClientRect();
  return { balonAlt: Math.round(b.bottom), harfUst: Math.round(h.top), balonX: Math.round(b.left + b.width / 2), harfX: Math.round(h.left + h.width / 2) };
});
console.log('balon konumu:', JSON.stringify(konum));
assert.ok(konum.balonAlt <= konum.harfUst, 'balon harfin üstünde');
const mevcutE = (await satirRenkleri())[0];
const hedefRenk = balonNokta.map(([, r]) => r).find((r) => r !== mevcutE && r !== 'Turkuaz') || 'Yeşil';
await s.locator(`[data-kp-balon] button[title="${hedefRenk}"]`).click();
assert.equal((await satirRenkleri())[0], hedefRenk, 'balondan renk seçildi');
assert.equal(await s.locator('[data-kp-balon]').isVisible(), true, 'balon açık kalır');
await s.screenshot({ path: cikti + '02-balon.png' });
// Balondaki döndür: blok 15° döner
await s.locator('[data-kp-balon-dondur]').click();
const blokAci = await s.$$eval('.kp-parca--letter', (l) => l.map((e) => e.style.transform));
assert.ok(blokAci.every((x) => x === 'rotate(15deg)'), blokAci.join());
await s.locator('[data-kp-duzle]').click();

// 5) Harfleri ayır: tek harf seçilir, balon onun için; döndürme yalnızca o harfi döndürür
await s.locator('[data-kp-harf-mod]').click();
// Son E'yi komşusundan uzaklaştır (aşağı sürükle), sonra seç
{
  // Dairenin alt-ortasındaki boş alana: döndürülünce de sığacak bir yer
  const c = await merkezi('[data-uid="harf-2"]');
  const z = await s.evaluate(() => { const r = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.height / 2]; });
  const hedef = [z[0], z[1] + z[2] * 0.55];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(c[0]), y: Math.round(c[1]), id: 0 }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(c[0] + (hedef[0] - c[0]) * i / 8), y: Math.round(c[1] + (hedef[1] - c[1]) * i / 8), id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(200);
}
console.log('harf merkezleri:', JSON.stringify(await s.$$eval('.kp-parca--letter', (l) => l.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }))));
await dokun(await merkezi('[data-uid="harf-2"]'));
assert.match(await s.locator('[data-kp-secili-ad]').textContent(), /E harfi/);
assert.equal(await s.locator('[data-kp-balon]').isVisible(), true);
await s.locator('[data-kp-balon-dondur]').click();
console.log('döndürme mesajı:', await s.locator('[data-kp-bildirim]').textContent());
await s.waitForTimeout(700); // geçersiz açıda kırmızı önizleme 600 ms sürer; son durum
assert.equal(await s.locator('.kp-parca--hatali').count(), 0);
assert.equal(await s.locator('[data-kp-aci]').isVisible(), false, 'açı göstergesi kapandı');
const ayri = await s.$$eval('.kp-parca--letter', (l) => l.map((e) => e.style.transform || 'yok'));
console.log('ayrı modda açılar:', ayri.join(' | '));
assert.deepEqual(ayri, ['yok', 'yok', 'rotate(15deg)']);
await s.screenshot({ path: cikti + '03-ayri.png' });
await s.locator('[data-kp-harf-mod]').click();

// 6) Eksik harf: Ö (öneri O), K (tüm renkleri tükenmiş → yok)
await s.locator('#kp-isim').fill('ökr');
await s.waitForTimeout(150);
const uyarilar = (await s.locator('[data-kp-isim-uyari]').innerText()).replace(/\s+/g, ' ');
console.log('uyarılar:', uyarilar);
assert.match(uyarilar, /Ö harfi şu an yok, O olarak yazmak ister misin/);
assert.match(uyarilar, /K harfi bu sette şu an yok/);
assert.equal(await s.locator('[data-kp-balon]').isVisible(), false, 'seçim kalkınca balon da kapanır');
await s.screenshot({ path: cikti + '04-eksik.png' });

// 7) Sepet: her harf seçilen renk varyantıyla, özet renkli
await s.locator('#kp-isim').fill('ece');
await s.waitForTimeout(150);
const secilenler = await satirRenkleri();
await s.locator('[data-kp-adim="ozet"]').click();
await s.locator('[data-kp-ileri]').click();
await s.locator('.kp-editor').waitFor({ state: 'hidden' });
await s.locator('#ProductSubmitButton-main').click();
await s.waitForTimeout(800);
const baz = eklenen.items[0].properties;
console.log('Tasarım özeti:', baz['Tasarım']);
const beklenenOzet = 'ECE (' + ['E', 'C', 'E'].map((h, i) => secilenler[i] + ' ' + h).join(', ') + ')';
assert.equal(baz['Tasarım'], beklenenOzet);
const harfKalemleri = eklenen.items.filter((k) => k.properties['Harf sırası']);
console.log('harf kalemleri:', JSON.stringify(harfKalemleri.map((k) => [k.id, k.quantity, k.properties['Harf sırası']])));
const veri = await s.evaluate(() => JSON.parse(document.querySelector('#KisiselVeri-main').textContent).setler[1].varyantlar.map((v) => [v.id, v.baslik]));
const ad = Object.fromEntries(veri);
const kalemAdlari = harfKalemleri.flatMap((k) => k.properties['Harf sırası'].split(', ').map((sira) => [+sira, ad[k.id]])).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
assert.deepEqual(kalemAdlari, ['E', 'C', 'E'].map((h, i) => secilenler[i] + ' ' + h), 'her harf seçilen renk varyantı');
assert.deepEqual(hatalar, []);
await t.close();
console.log('PİRAMİT E2E TAMAM');
