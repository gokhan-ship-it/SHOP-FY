// Uçtan uca: iPhone emülasyonunda ECE + 7 + ikon tasarlayıp sepete ekler.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node e2e.mjs
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const cikti = new URL('ekran/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });

const tarayici = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const baglam = await tarayici.newContext({ ...devices['iPhone 13'] });
const sayfa = await baglam.newPage();
const hatalar = [];
sayfa.on('pageerror', (e) => hatalar.push(e.message));
sayfa.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') hatalar.push(m.text()); });

let eklenen = null;
let sepet = { items: [] };
await sayfa.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    sepet.items = eklenen.items.map((k, i) => ({ key: 'k' + i, id: k.id, variant_id: k.id, quantity: k.quantity, properties: k.properties, product_title: 'P' + k.id, variant_title: '' }));
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: sepet.items }) });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(sepet) });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});

await sayfa.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
const kart = sayfa.locator('kisisel-kart');
await kart.waitFor({ state: 'visible' });
await sayfa.screenshot({ path: cikti + '01-urun-sayfasi.png' });

// Kişiselleştir → editör açılır
await sayfa.getByRole('radio', { name: 'Kişiselleştir' }).tap();
const editor = sayfa.locator('.kp-editor');
await editor.waitFor({ state: 'visible' });

// ELİF yaz → İ uyarısı
const girdi = sayfa.locator('#kp-isim');
await girdi.fill('elif');
assert.equal(await girdi.inputValue(), 'ELİF');
await sayfa.getByText('İ harfi şu an yok, I olarak yazmak ister misin?').waitFor();
assert.equal(await sayfa.locator('[data-kp-ileri]').getAttribute('aria-disabled'), 'true');
await sayfa.screenshot({ path: cikti + '02-turkce-harf-uyarisi.png' });

// Uzun isim → sığmıyor
await girdi.fill('abdulkadir');
await sayfa.getByText(/ABDULKADİR bu çantaya sığmıyor \(en fazla \d+ harf\)/).waitFor();
await sayfa.screenshot({ path: cikti + '03-sigmiyor.png' });

// ECE
await girdi.fill('ece');
assert.equal(await sayfa.locator('[data-kp-ileri]').getAttribute('aria-disabled'), 'false');
assert.match(await sayfa.locator('[data-kp-kapasite]').textContent(), /^3 \/ \d+$/);
await sayfa.screenshot({ path: cikti + '04-ece.png' });
await sayfa.locator('[data-kp-ileri]').click();

// Rakam 7
await sayfa.locator('[data-kp-panel="rakam"]').waitFor({ state: 'visible' });
await sayfa.locator('[data-kp-rakam="2007"]').click();
await sayfa.screenshot({ path: cikti + '05-rakam.png' });
await sayfa.locator('[data-kp-ileri]').click();

// İkon: Spor kategorisinden Futbol Topu
await sayfa.locator('[data-kp-panel="ikon"]').waitFor({ state: 'visible' });
await sayfa.locator('[data-kp-kategori="Spor"]').click();
await sayfa.locator('[data-kp-ikon="2"]').click();
await sayfa.getByText(/Alanda .*ikon/).waitFor();

// Dokunarak sürükle: ikonu daire dışına sürükle → geçerli konuma geri dönmeli
const ikon = sayfa.locator('.kp-parca--icon').first();
const k = await ikon.boundingBox();
const sahne = await sayfa.locator('.kp-onizleme .kp-sahne').boundingBox();
const cdp = await baglam.newCDPSession(sayfa);
const dokun = async (tip, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tip, touchPoints: tip === 'touchEnd' ? [] : [{ x, y }] });
await dokun('touchStart', k.x + k.width / 2, k.y + k.height / 2);
for (let i = 1; i <= 10; i++) await dokun('touchMove', k.x + k.width / 2, k.y + k.height / 2 - (i * (k.y - sahne.y + 30)) / 10);
await dokun('touchEnd');
await sayfa.waitForTimeout(100);
const k2 = await ikon.boundingBox();
const sinirlar = await sayfa.evaluate(() => {
  const el = document.querySelector('.kp-onizleme .kp-sahne ellipse').getBoundingClientRect();
  return { x: el.x, y: el.y, w: el.width, h: el.height };
});
const cx = sinirlar.x + sinirlar.w / 2, cy = sinirlar.y + sinirlar.h / 2, r = sinirlar.w / 2;
const kose = [[k2.x, k2.y], [k2.x + k2.width, k2.y], [k2.x, k2.y + k2.height], [k2.x + k2.width, k2.y + k2.height]];
const merkezUzaklik = Math.hypot(k2.x + k2.width / 2 - cx, k2.y + k2.height / 2 - cy) + k2.width / 2;
assert.ok(merkezUzaklik <= r + 1, 'yuvarlak ikon dairenin içinde kalmalı');
assert.ok(k2.y < k.y, 'ikon yukarı doğru taşınmış olmalı');
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 0);
await sayfa.screenshot({ path: cikti + '06-ikon-surukleme.png' });

// Sayfa kaymadı mı?
assert.equal(await sayfa.evaluate(() => window.scrollY), 0);

await sayfa.locator('[data-kp-ileri]').click();
await sayfa.locator('[data-kp-panel="ozet"]').waitFor({ state: 'visible' });
const ozet = await sayfa.locator('.kp-ozet').innerText();
assert.match(ozet, /Toplam\s+4\.650 TL/);
await sayfa.screenshot({ path: cikti + '07-ozet.png' });
await sayfa.locator('[data-kp-ileri]').click();
await editor.waitFor({ state: 'hidden' });

// Kart ve butonlar
assert.match(await kart.innerText(), /ECE · 3 harf/);
assert.match(await kart.innerText(), /7 · 1 rakam/);
assert.match(await kart.innerText(), /Futbol Topu · 1 ikon/);
assert.match(await sayfa.locator('#ProductSubmitButton-main span').first().textContent(), /Tasarımımla sepete ekle · 4\.650 TL/);
assert.equal(await sayfa.locator('.shopify-payment-button').first().isVisible(), false);
assert.ok(await sayfa.locator('.kp-galeri').isVisible(), 'galeride tasarım önizlemesi');
await sayfa.screenshot({ path: cikti + '08-kart.png', fullPage: true });

// Sepete ekle (sabit çubuktan)
await sayfa.locator('#StickyProductSubmitButton-main').click();
await sayfa.waitForURL('**/cart');
assert.equal(await sayfa.evaluate(() => window.__temaSubmit || 0), 0, 'tema submit dinleyicisi çalışmamalı');
assert.ok(eklenen, 'sepete ekleme isteği gitmeli');
const [baz, ...patchler] = eklenen.items;
assert.equal(baz.id, 51795696943390);
assert.equal(baz.properties['Tasarım'], 'ECE + 7 + Futbol Topu');
assert.equal(baz.properties['İsim'], 'ECE');
const id = baz.properties._tasarim_id;
assert.ok(patchler.every((p) => p.properties._tasarim_id === id));
const e = patchler.find((p) => p.properties['Harf sırası'] === '1, 3');
assert.equal(e.quantity, 2);
console.log(JSON.stringify(eklenen, null, 1).slice(0, 1500));
console.log('olaylar:', JSON.stringify(await sayfa.evaluate(() => 0)));
console.log('hatalar:', hatalar);
await tarayici.close();
console.log('E2E TAMAM');
