// Sepetteki tasarım: kart ("Senin tasarımın · ✓ Sepette"), editörde düzenleme ("Sepeti güncelle":
// önce yeni grup eklenir, sonra eski kaldırılır; hata olursa eski kalır), yarıda kapatma, sepetten silme + Geri al,
// "Bir tane daha" satırı ve birden fazla tasarımda kompakt kartlar.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node sepettekini-duzenle-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
s.on('dialog', (d) => d.accept());

// Sahte sepet: /cart/add.js, /cart/update.js, /cart.js
const URUN = 10087205437726;
const CANTA = 51795696943390;
let sepet = [];
let sayac = 0;
let ekleHata = false;
const log = [];
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    const govde = JSON.parse(r.request().postData());
    if (ekleHata) {
      ekleHata = false;
      log.push(['add-hata']);
      return r.fulfill({ status: 422, contentType: 'application/json', body: '{"status":422,"description":"Stok yetersiz"}' });
    }
    const eklenen = govde.items.map((k) => ({
      key: 'k' + ++sayac, variant_id: k.id, product_id: k.id === CANTA ? URUN : 1, quantity: k.quantity,
      final_line_price: (k.id === CANTA ? 300000 : 30000) * k.quantity, properties: k.properties || {}
    }));
    sepet = eklenen.concat(sepet);
    log.push(['add', govde.items[0].properties['Tasarım']]);
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: eklenen }) });
  }
  if (url.pathname === '/cart/update.js') {
    const { updates } = JSON.parse(r.request().postData());
    const silinen = Object.keys(updates).filter((k) => updates[k] === 0);
    sepet = sepet.filter((k) => !silinen.includes(k.key));
    log.push(['update', silinen.sort().join(',')]);
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: sepet }) });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: sepet, item_count: sepet.length }) });
  if (url.searchParams.get('sections')) return r.fulfill({ contentType: 'application/json', body: '{}' });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const metin = async (q) => (await s.locator(q).first().innerText()).replace(/\s+/g, ' ').trim();
const gorunur = (q) => s.locator(q).first().isVisible();
const urun = async () => {
  await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
  await s.locator('kisisel-kart').waitFor({ state: 'visible' });
  await s.waitForTimeout(300);
};
const grupAnahtarlari = () => sepet.map((k) => k.key).sort().join(',');

// Tasarım yap, özetten sepete ekle
await urun();
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('#kp-isim').fill('ece');
await s.locator('[data-kp-adim="rakam"]').click();
await s.locator('[data-kp-rakam][aria-label="7 rakamı"]').click();
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-kategori="Spor"]').click();
await s.locator('[data-kp-ikon="2"]').click();
await s.locator('[data-kp-adim="ozet"]').click();
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
assert.equal(sepet.length, 5, 'çanta + E + C + 7 + top');
const ilkAnahtarlar = grupAnahtarlari();

// 1) Kart: "Senin tasarımın" + "✓ Sepette", yeşil çerçeve; Sepete git, Düzenle, Sepetten sil, gri not; altında küçük "Bir tane daha"
await urun();
await s.locator('[data-kisisel-sepet]').waitFor({ state: 'visible' });
const kart = await metin('[data-kisisel-sepet]');
console.log('sepet kartı:', kart);
assert.match(kart, /^Senin tasarımın ✓ Sepette ECE · 7 · Futbol Topu 5 patch Toplam 4\.500 TL Sepete git Düzenle Sepetten sil Düzenlediğinde sepetteki tasarımın kendiliğinden güncellenir\.$/);
assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector('.kisisel-kart__sepette')).backgroundColor), 'rgb(47, 143, 78)');
assert.ok(await s.locator('[data-kisisel-sepet] .kp-parca').count() >= 5, 'önizleme _tasarim_konum\'dan');
assert.equal(await gorunur('[data-kisisel-ana]'), false, 'davet kutusu yok');
assert.equal(await metin('[data-kisisel-tekrar]'), "Bir tane daha yapmak ister misin? Farklı bir isim ve patch'lerle ikinci çantanı tasarla. Yeni tasarım");
// Sepette tasarım: galeride tasarım görseli, Hemen satın al gizli, temanın butonu "Sadece çantayı sepete ekle"
assert.equal(await gorunur('.kp-galeri'), true);
assert.equal(await s.locator('.kp-galeri .kp-parca').count(), 5);
assert.equal(await metin('.kp-galeri-kucuk__serit'), 'Tasarımın');
assert.equal(await gorunur('.shopify-payment-button'), false);
assert.equal(await metin('#ProductSubmitButton-main'), 'Sadece çantayı sepete ekle');
const galeriIsim = () => s.evaluate(() => [...document.querySelectorAll('.kp-galeri .kp-parca')].length);
const galeriHtml = () => s.evaluate(() => document.querySelector('.kp-galeri').innerHTML);
const galeriOnce = await galeriHtml();

// 2a) Düzenle → editör sepetteki tasarımla dolu; yarıda kapatınca sepet değişmez
await s.locator('[data-kisisel-sepet-duzenle="0"]').click();
await s.locator('.kp-editor').waitFor({ state: 'visible' });
assert.equal(await metin('#kp-editor-baslik'), 'Sepetteki tasarımı düzenle');
assert.equal(await s.locator('#kp-isim').inputValue(), 'ECE');
assert.deepEqual(await s.$$eval('.kp-cip__ad', (b) => b.map((x) => x.textContent)), ['ECE', '7', 'Futbol Topu']);
await s.locator('[data-kp-adim="ozet"]').click();
assert.match(await metin('[data-kp-ileri]'), /^Sepeti güncelle · 4\.650 TL$/);
await s.locator('[data-kp-adim="yazi"]').click();
await s.locator('#kp-isim').fill('ada');
await s.locator('[data-kp-kapat]').click();
await s.locator('.kp-editor').waitFor({ state: 'hidden' });
assert.equal(grupAnahtarlari(), ilkAnahtarlar, 'yarıda kapatınca sepet değişmedi');
assert.equal(log.filter((x) => x[0] !== 'add' || x[1] !== 'ECE + 7 + Futbol Topu').length, 0);
assert.equal(await s.evaluate(() => localStorage.getItem('kisisel-tasarim-10087205437726')), null, 'kayıtlı tasarım da oluşmadı');

// 2b) Güncelleme hatası: eski grup kalır, editör açık kalır, uyarı
await s.locator('[data-kisisel-sepet-duzenle="0"]').click();
await s.locator('[data-kp-adim="yazi"]').click();
await s.locator('#kp-isim').fill('ada');
await s.locator('[data-kp-adim="ozet"]').click();
ekleHata = true;
await s.locator('[data-kp-ileri]').click();
await s.waitForTimeout(400);
assert.equal(await metin('[data-kp-bildirim]'), 'Sepet güncellenemedi, tekrar dene.');
assert.equal(await gorunur('.kp-editor'), true, 'editör açık');
assert.equal(grupAnahtarlari(), ilkAnahtarlar, 'hata: eski grup sepette');

// 2c) Güncelleme: önce yeni grup eklenir, sonra eski grubun tüm satırları kaldırılır
log.length = 0;
await s.locator('[data-kp-ileri]').click();
await s.locator('.kp-editor').waitFor({ state: 'hidden' });
await s.waitForTimeout(300);
console.log('güncelleme sırası:', JSON.stringify(log));
assert.deepEqual(log, [['add', 'ADA + 7 + Futbol Topu'], ['update', ilkAnahtarlar]]);
assert.equal(sepet.length, 5);
assert.ok(sepet.every((k) => k.properties._tasarim_id === sepet[0].properties._tasarim_id), 'sepette tek grup');
assert.match(await metin('[data-kisisel-sepet]'), /ADA · 7 · Futbol Topu/);
assert.equal(await galeriIsim(), 5);
assert.notEqual(await galeriHtml(), galeriOnce, 'galeri düzenlenen tasarımla güncellendi (ECE → ADA)');

// 3) Sepetten sil → davet + "Tasarım sepetten çıkarıldı · Geri al" → Geri al aynı tasarımı ekler
const tasarimId = sepet[0].properties._tasarim_id;
await s.locator('[data-kisisel-sepet-sil="0"]').click();
await s.waitForTimeout(400);
assert.equal(sepet.length, 0, 'grubun tüm satırları kaldırıldı');
assert.equal(await gorunur('[data-kisisel-davet]'), true, 'kart davet haline döndü');
assert.match(await metin('[data-kisisel-bildirim]'), /Tasarım sepetten çıkarıldı · Geri al/);
assert.equal(await s.locator('.kp-galeri, .kp-galeri-kucuk').count(), 0, 'silinince galeri temanın görseline döndü');
assert.equal(await gorunur('.shopify-payment-button'), true, 'Hemen satın al geri geldi');
await s.locator('[data-kisisel-geri-al]').click();
await s.waitForTimeout(400);
assert.equal(sepet.length, 5, 'geri alındı');
assert.ok(sepet.every((k) => k.properties._tasarim_id === tasarimId), 'aynı tasarım');
assert.match(await metin('[data-kisisel-sepet]'), /ADA · 7 · Futbol Topu/);

// 4) Bir tane daha: boş editör; ikinci tasarım sepete → iki kompakt kart
await s.locator('[data-kisisel-yeni]').click();
assert.equal(await s.locator('#kp-isim').inputValue(), '', 'boş editör');
await s.locator('#kp-isim').fill('ece');
await s.locator('[data-kp-adim="ozet"]').click();
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
await urun();
await s.locator('[data-kisisel-sepet]').waitFor({ state: 'visible' });
assert.equal(await s.locator('.kisisel-kart__kutu--sepet.kisisel-kart__kutu--kompakt').count(), 2, 'iki kompakt kart');
assert.equal(await galeriIsim(), 3, 'galeride en son eklenen tasarım (ECE)');

assert.deepEqual(hatalar, []);
await t.close();
console.log('SEPETTEKİNİ DÜZENLE E2E TAMAM');
