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
let simulasyon = null;
let sepet = { items: [] };
await sayfa.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    sepet.items = eklenen.items.map((k, i) => ({ key: 'k' + i, id: k.id, variant_id: k.id, quantity: k.quantity, properties: k.properties, product_title: 'P' + k.id, variant_title: '' }));
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: sepet.items }) });
  }
  if (url.pathname === '/api/2025-07/graphql.json') {
    // Kampanya simülasyonu: tasarımlı sepette 4'lü patch indirimi (adı Shopify'daki gibi boşluklu)
    simulasyon = JSON.parse(r.request().postData());
    const sepetYap = (satirlar) => {
      const adet = satirlar.reduce((t, l) => t + l.quantity, 0);
      return { cost: { totalAmount: { amount: '0' } }, discountAllocations: adet >= 5 ? [{ discountedAmount: { amount: '370.0' }, title: "  4'lü  patche indirim " }] : [], lines: { nodes: [] } };
    };
    const data = {};
    for (const [ad, satirlar] of Object.entries(simulasyon.variables)) data[ad] = { cart: sepetYap(satirlar), userErrors: [] };
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(sepet) });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});

await sayfa.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
const kart = sayfa.locator('kisisel-kart');
await kart.waitFor({ state: 'visible' });
await sayfa.screenshot({ path: cikti + '01-urun-sayfasi.png' });

// Davet kartı → "Kişiselleştirmeye başla" editörü açar
assert.match(await kart.innerText(), /Ürünü kişiselleştir/);
assert.match(await kart.innerText(), /Her patch 330 TL/);
await sayfa.getByRole('button', { name: 'Kişiselleştirmeye başla' }).tap();
const editor = sayfa.locator('.kp-editor');
await editor.waitFor({ state: 'visible' });
await sayfa.waitForTimeout(400);

// Yakın görünüm: siyah daire pencere genişliğinin ~%80'i
const oran = () => sayfa.evaluate(() => {
  const g = document.querySelector('.kp-gorunum').getBoundingClientRect();
  const e = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect();
  return e.width / g.width;
});
const yakinOran = await oran();
console.log('yakın görünüm daire oranı:', yakinOran.toFixed(3));
assert.ok(Math.abs(yakinOran - 0.8) < 0.03);
await sayfa.locator('[data-kp-gorunum]').tap();
await sayfa.waitForTimeout(400);
const uzakOran = await oran();
console.log('tüm çanta daire oranı:', uzakOran.toFixed(3));
assert.ok(Math.abs(uzakOran - 840 / 1344) < 0.01);
assert.equal(await sayfa.locator('[data-kp-gorunum]').textContent(), 'Alana yakınlaş');
await sayfa.screenshot({ path: cikti + '01b-tum-canta.png' });
await sayfa.locator('[data-kp-gorunum]').tap();
await sayfa.waitForTimeout(400);
assert.equal(await sayfa.locator('[data-kp-gorunum]').textContent(), 'Tüm çantayı gör');

// ELİF yaz → İ uyarısı
const girdi = sayfa.locator('#kp-isim');
await girdi.fill('elif');
assert.equal(await girdi.inputValue(), 'ELİF');
await sayfa.getByText('İ harfi şu an yok, I olarak yazmak ister misin?').waitFor();
assert.equal(await sayfa.locator('[data-kp-ileri]').getAttribute('aria-disabled'), 'true');
await sayfa.screenshot({ path: cikti + '02-turkce-harf-uyarisi.png' });

// Uzun isim → sığmıyor
await girdi.fill('abdulkadir');
await sayfa.getByText(/ABDULKADİR bu ürüne sığmıyor \(en fazla \d+ karakter\)/).waitFor();
await sayfa.screenshot({ path: cikti + '03-sigmiyor.png' });

// ECE
await girdi.fill('ece');
assert.equal(await sayfa.locator('[data-kp-ileri]').getAttribute('aria-disabled'), 'false');
assert.match(await sayfa.locator('[data-kp-kapasite]').textContent(), /^3 \/ \d+$/);
await sayfa.screenshot({ path: cikti + '04-ece.png' });

// --- Harfleri ayır ---
const cdp0 = await baglam.newCDPSession(sayfa);
const surukle = async (secici, dx, dy) => {
  const b = await sayfa.locator(secici).boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await cdp0.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp0.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }] });
  await cdp0.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sayfa.waitForTimeout(80);
};
const kutular = () => sayfa.$$eval('.kp-onizleme .kp-parca--letter', (l) => l.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
const daire = () => sayfa.evaluate(() => { const r = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, r: r.width / 2 }; });
const icinde = (k, d) => [[k.x, k.y], [k.x + k.w, k.y], [k.x, k.y + k.h], [k.x + k.w, k.y + k.h]].every(([x, y]) => Math.hypot(x - d.cx, y - d.cy) <= d.r + 1);
const ust = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;

// Blok modda bir harfi sürüklemek tüm ismi taşır
let once = await kutular();
await surukle('[data-uid="isim-1"]', 0, -40);
let sonra = await kutular();
assert.ok(sonra.every((k, i) => Math.abs(k.y - (once[i].y - 40)) < 4), 'blok birlikte taşınmalı');

await sayfa.locator('[data-kp-harf-mod]').tap();
assert.equal(await sayfa.locator('[data-kp-harf-mod]').textContent(), 'Harfleri birleştir');
// Ayrı modda yalnızca sürüklenen harf hareket eder
once = await kutular();
await surukle('[data-uid="harf-2"]', 0, 70);
sonra = await kutular();
assert.ok(Math.abs(sonra[0].y - once[0].y) < 1 && Math.abs(sonra[1].y - once[1].y) < 1, 'diğer harfler yerinde kalmalı');
assert.ok(sonra[2].y > once[2].y + 50, 'harf aşağı taşınmalı');
// Harfi başka bir harfin üstüne bırak → binmemeli
let hk = await kutular();
await surukle('[data-uid="harf-2"]', hk[0].x - hk[2].x, hk[0].y - hk[2].y);
hk = await kutular();
assert.ok(!ust(hk[2], hk[0]) && !ust(hk[2], hk[1]), 'harf diğerinin üstüne binmemeli');
// Daire dışına bırak → tamamen içeride kalmalı
await surukle('[data-uid="harf-0"]', -400, 0);
hk = await kutular();

let d = await daire();
assert.ok(hk.every((x) => icinde(x, d)), 'her harf dairenin içinde kalmalı (yakın görünüm)');
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 0);
await sayfa.screenshot({ path: cikti + '04b-harfler-ayri.png' });

// Tüm çanta görünümünde de aynı kurallar
await sayfa.locator('[data-kp-gorunum]').tap();
await sayfa.waitForTimeout(400);
await surukle('[data-uid="harf-1"]', 0, -300);
hk = await kutular();
d = await daire();
assert.ok(hk.every((x) => icinde(x, d)), 'her harf dairenin içinde kalmalı (tüm çanta)');
await surukle('[data-uid="harf-1"]', hk[0].x - hk[1].x, hk[0].y - hk[1].y);
hk = await kutular();
assert.ok(!ust(hk[1], hk[0]) && !ust(hk[1], hk[2]), 'tüm çanta görünümünde de üst üste binme yok');
await sayfa.screenshot({ path: cikti + '04c-tum-canta-ayri.png' });
await sayfa.locator('[data-kp-gorunum]').tap();
await sayfa.waitForTimeout(400);

// Birleştir → tek satırda düzenli blok
await sayfa.locator('[data-kp-harf-mod]').tap();
hk = await kutular();
assert.ok(Math.abs(hk[0].y - hk[2].y) < 1 && Math.abs((hk[1].x - hk[0].x) - (hk[2].x - hk[1].x)) < 1, 'harfler düzenli blok olmalı');
assert.ok(hk[0].x < hk[1].x && hk[1].x < hk[2].x, 'harf sırası korunmalı');
await sayfa.screenshot({ path: cikti + '04d-birlesti.png' });
// Rakam yazıya eklenir: ECE7 (rakam rakam setinden gelir)
await sayfa.locator('#kp-isim').fill('ece7');
assert.deepEqual(await sayfa.$$eval('.kp-karakter__stil', (x) => x.map((e) => e.textContent)), ['Cool', 'Cool', 'Cool', 'Rakam']);
await sayfa.locator('[data-kp-ileri]').click();

// İkon: Spor kategorisinden Futbol Topu
await sayfa.locator('[data-kp-panel="ikon"]').waitFor({ state: 'visible' });
await sayfa.locator('[data-kp-kategori="Spor"]').click();
await sayfa.locator('[data-kp-ikon="2"]').click();
await sayfa.locator('.kp-cip__ad', { hasText: 'Futbol Topu' }).waitFor();

// Dokunarak sürükle: ikonu daire dışına sürükle → geçerli konuma geri dönmeli
const ikon = sayfa.locator('.kp-parca--icon').first();
const k = await ikon.boundingBox();
const sahne = await sayfa.locator('.kp-onizleme .kp-sahne').boundingBox();
const cdp = await baglam.newCDPSession(sayfa);
const dokun = async (tip, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tip, touchPoints: tip === 'touchEnd' ? [] : [{ x, y }] });
// Uyarı metni oturumda her tür için bir kez çıkar; önceki harf sürüklemeleri kullandı, bu sürükleme için sıfırla
await sayfa.evaluate(() => { sessionStorage.removeItem('kp-uyari-tasma'); sessionStorage.removeItem('kp-uyari-cakisma'); });
await dokun('touchStart', k.x + k.width / 2, k.y + k.height / 2);
for (let i = 1; i <= 10; i++) await dokun('touchMove', k.x + k.width / 2, k.y + k.height / 2 - (i * (k.y - sahne.y + 30)) / 10);
// Sürüklerken: kırmızı, alan sınırı kalın kırmızı, uyarı kutusunda metin
assert.equal(await sayfa.locator('.kp-sahne--tasma').count(), 1, 'alan sınırı kırmızı');
assert.equal(await sayfa.locator('[data-kp-bildirim]').textContent(), 'Futbol Topu alanın dışına taşıyor. Bırakırsan son yerine döner.');
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
// Yol ismin üstünden geçtiği için son geçerli konum başlangıç noktası: ikon yerine döner
assert.ok(Math.abs(k2.y - k.y) < 1 && Math.abs(k2.x - k.x) < 1, 'ikon son geçerli yerine dönmeli');
assert.equal(await sayfa.locator('.kp-sahne--tasma').count(), 0, 'bırakınca sınır kaybolur');
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 0);
await sayfa.screenshot({ path: cikti + '06-ikon-surukleme.png' });

// Sayfa kaymadı mı?
assert.equal(await sayfa.evaluate(() => window.scrollY), 0);

await sayfa.locator('[data-kp-ileri]').click();
// İkon → Aksesuar → Özet
await sayfa.locator('[data-kp-panel="aksesuar"]').waitFor({ state: 'visible' });
await sayfa.locator('[data-kp-ileri]').click();
await sayfa.locator('[data-kp-panel="ozet"]').waitFor({ state: 'visible' });
await sayfa.locator('.kp-ozet__kampanya').waitFor();
const ozet = await sayfa.locator('.kp-ozet').innerText();
assert.match(ozet, /✓ 4'lü patche indirim\s+−370 TL/);
assert.match(ozet, /Toplam\s+4\.650 TL\s+4\.280 TL/);
assert.equal(await sayfa.locator('.kp-ozet__eski').textContent(), '4.650 TL');
assert.equal(await sayfa.locator('.kp-indirim-notu--ozet').count(), 0, 'simülasyon başarılıysa not yok');
assert.ok(simulasyon && simulasyon.variables.a.length === 0 && simulasyon.variables.b.length > 1, 'boş sepet + tasarım simüle edilmeli');
assert.match(await sayfa.locator('[data-kp-panel="ozet"] h3').textContent(), /Tasarımın hazır/);
assert.equal(await sayfa.locator('[data-kp-ileri]').textContent(), 'Tasarımımı sepete ekle · 4.280 TL');
await sayfa.screenshot({ path: cikti + '07-ozet.png' });

// Özetten doğrudan sepete ekle (editör kapanır; çekmece yoksa /cart'a gider). Eklenince kayıt temizlenir;
// aşağıdaki kart kontrolleri için kaydı sakla
const ANAHTAR = 'kisisel-tasarim-10087205437726';
const kayitAl = () => sayfa.evaluate((k) => {
  const e = document.querySelector('kisisel-kart').editor;
  return JSON.stringify({ v: 1, mod: 'kisisel', t: e.t });
}, ANAHTAR);
const kayit = await kayitAl();
await sayfa.locator('[data-kp-ileri]').click();
await sayfa.waitForURL('**/cart');
assert.ok(eklenen, 'özetten sepete ekleme isteği gitmeli');
const [baz, ...patchler] = eklenen.items;
assert.equal(baz.id, 51795696943390);
assert.equal(baz.properties['Tasarım'], 'ECE7 + Futbol Topu');
assert.equal(baz.properties['İsim'], 'ECE7');
const id = baz.properties._tasarim_id;
assert.ok(patchler.every((p) => p.properties._tasarim_id === id));
const e = patchler.find((p) => p.properties['Harf sırası'] === '1, 3');
assert.equal(e.quantity, 2);
console.log(JSON.stringify(eklenen, null, 1).slice(0, 1500));

assert.equal(await sayfa.evaluate((k) => localStorage.getItem(k), ANAHTAR), null, 'eklenince kayıt temizlendi');

// Kayıt varken ürün sayfası: kart tasarımlı halde
eklenen = null;
await sayfa.evaluate(([k, v]) => localStorage.setItem(k, v), [ANAHTAR, kayit]);
await sayfa.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await kart.waitFor({ state: 'visible' });
// (b) Senin tasarımın: içerik, patch sayısı, toplam; kartın altında kırmızı buton, temanın ana butonu gizli
const kartMetni = (await kart.innerText()).replace(/\s+/g, ' ');
assert.match(kartMetni, /Senin tasarımın Otomatik kaydedildi/);
assert.match(kartMetni, /ECE7 · Futbol Topu/);
assert.match(kartMetni, /5 patch/);
assert.match(kartMetni, /Toplam 4\.650 TL/);
assert.equal(await sayfa.locator('[data-kisisel-davet]').isVisible(), false);
assert.equal((await sayfa.locator('[data-kisisel-sepete-ekle]').textContent()).trim(), 'Tasarımımı sepete ekle · 4.650 TL');
// Temanın butonu görünür, "Sadece çantayı sepete ekle"; Hemen satın al gizli
assert.equal(await sayfa.locator('#ProductSubmitButton-main').isVisible(), true, 'temanın ana butonu görünür');
assert.equal(await sayfa.locator('#ProductSubmitButton-main span').textContent(), 'Sadece çantayı sepete ekle');
assert.equal(await sayfa.locator('#StickyProductSubmitButton-main span').textContent(), 'Sadece çantayı sepete ekle');
assert.equal(await sayfa.locator('.shopify-payment-button').first().isVisible(), false);
// Galeri: ilk slaytın üstünde tüm çanta + "Senin tasarımın"; ilk küçük resimde "Tasarımın" şeridi; sayfa bu görselle açılır
assert.ok(await sayfa.locator('.main-carousel .splide__slide').first().locator('.kp-galeri').isVisible(), 'galeride tasarım görseli');
assert.equal(await sayfa.locator('.kp-galeri__rozet').textContent(), 'Senin tasarımın');
assert.equal(await sayfa.locator('.kp-galeri .kp-parca').count(), 5);
assert.equal(await sayfa.locator('.thumbnail-carousel .splide__slide').first().locator('.kp-galeri-kucuk-serit, .kp-galeri-kucuk__serit').textContent(), 'Tasarımın');
assert.equal(await sayfa.locator('.kp-galeri-kucuk .kp-parca').count(), 5);
assert.equal(await sayfa.evaluate(() => window.__galeriGit), 0, 'galeri ilk (tasarım) görseline gitti');
assert.equal(await sayfa.locator('.main-carousel .kp-galeri').count(), 1, 'tek katman');
// Küçük resim tıklaması temaya geçer
await sayfa.locator('.thumbnail-carousel .splide__slide').first().click();
assert.equal(await sayfa.evaluate(() => window.__kucukTik), 1);
// Kart önizlemesi yakın görünüm (alan), galeri tüm çanta
const olcek = await sayfa.evaluate(() => [document.querySelector('[data-kisisel-mini] .kp-sahne').style.width, document.querySelector('.kp-galeri .kp-sahne').style.width]);
assert.ok(parseFloat(olcek[0]) > 100 && !(parseFloat(olcek[1]) > 100), 'kart yakın, galeri tüm çanta: ' + olcek);
await sayfa.screenshot({ path: cikti + '08-kart.png', fullPage: true });

// Kartın altındaki kırmızı butondan
await sayfa.locator('[data-kisisel-sepete-ekle]').click();
await sayfa.waitForURL('**/cart');
assert.equal(await sayfa.evaluate(() => window.__temaSubmit || 0), 0, 'tema submit dinleyicisi çalışmamalı');
assert.ok(eklenen && eklenen.items.length === 5, 'kırmızı buton tasarımla eklemeli');

// Temanın butonları (ana ve sabit çubuk) tasarım varken de yalnızca çantayı ekler (temanın kendi akışı)
eklenen = null;
await sayfa.evaluate(([k, v]) => localStorage.setItem(k, v), [ANAHTAR, kayit]);
await sayfa.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await kart.waitFor({ state: 'visible' });
await sayfa.locator('#ProductSubmitButton-main').click();
await sayfa.locator('#StickyProductSubmitButton-main').click();
await sayfa.waitForTimeout(300);
assert.equal(await sayfa.evaluate(() => window.__temaSubmit || 0), 2, 'tema formu çalıştı');
assert.equal(eklenen, null, 'tasarım eklenmedi');
assert.ok(await sayfa.locator('.kp-galeri').isVisible(), 'kayıt duruyor');
// Tasarım silinince galeri ve küçük resim temanın görseline döner, Hemen satın al geri gelir
await sayfa.locator('[data-kisisel-sil]').click();
assert.equal(await sayfa.locator('.kp-galeri, .kp-galeri-kucuk').count(), 0, 'katmanlar kalktı');
assert.equal(await sayfa.locator('.shopify-payment-button').first().isVisible(), true);
assert.equal(await sayfa.locator('#ProductSubmitButton-main span').textContent(), 'Sadece çantayı sepete ekle');
console.log('olaylar:', JSON.stringify(await sayfa.evaluate(() => 0)));
console.log('hatalar:', hatalar);
await tarayici.close();
console.log('E2E TAMAM');
