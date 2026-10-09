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
// Alt kenardaki eklenenler satırı (38 px) hariç kalan yüksekliğin ~%80'i
const gH = await sayfa.evaluate(() => document.querySelector('.kp-gorunum').getBoundingClientRect().height);
assert.ok(yakinOran > 0.8 * (1 - 38 / gH) - 0.02 && yakinOran < 0.82, 'yakın oran ' + yakinOran);
const daireAlt = await sayfa.evaluate(() => [document.querySelector('.kp-gorunum ellipse').getBoundingClientRect().bottom, document.querySelector('.kp-satir').getBoundingClientRect().top]);
assert.ok(daireAlt[0] <= daireAlt[1] + 1, 'daire eklenenler satırının üstünde');
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

// Uzun isim → ürünün karakter sınırı (6): fazlası yazılamaz, not görünür
await girdi.fill('abdulkadir');
assert.equal(await girdi.inputValue(), 'ABDULK');
assert.equal(await sayfa.locator('[data-kp-kapasite]').textContent(), '6 / 6');
await sayfa.getByText('Bu ürüne en fazla 6 karakter yazılabilir.').waitFor();
await girdi.pressSequentially('X');
assert.equal(await girdi.inputValue(), 'ABDULK', 'sınırdan sonrası yazılmaz');
assert.equal(await sayfa.locator('[data-kp-rozet="yazi"]').textContent(), '6');
await sayfa.screenshot({ path: cikti + '03-sinir.png' });

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
await surukle('[data-uid="isim-1"]', 0, -20);
let sonra = await kutular();
assert.ok(sonra.every((k, i) => Math.abs(k.y - (once[i].y - 20)) < 4), 'blok birlikte taşınmalı');
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 0);

await sayfa.locator('[data-kp-harf-mod]').tap();
assert.equal((await sayfa.locator('[data-kp-harf-mod]').textContent()).trim(), 'Birleştir');
assert.equal(await sayfa.locator('[data-kp-harf-mod]').getAttribute('aria-label'), 'Harfleri birleştir');
// Ayrı modda yalnızca sürüklenen harf hareket eder
once = await kutular();
await surukle('[data-uid="harf-2"]', 0, 70);
sonra = await kutular();
assert.ok(Math.abs(sonra[0].y - once[0].y) < 1 && Math.abs(sonra[1].y - once[1].y) < 1, 'diğer harfler yerinde kalmalı');
assert.ok(sonra[2].y > once[2].y + 50, 'harf aşağı taşınmalı');
// Harfi başka bir harfin üstüne bırak → bırakıldığı yerde kalır, kırmızı; altta uyarı ve "Alana yerleştir"
let hk = await kutular();
await surukle('[data-uid="harf-2"]', hk[0].x - hk[2].x, hk[0].y - hk[2].y);
hk = await kutular();
assert.ok(ust(hk[2], hk[0]), 'geri fırlamadı');
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 1, 'yalnızca bırakılan harf işaretlenir');
const yerUyari = () => sayfa.locator('[data-kp-yer-uyari]').innerText().then((x) => x.replace(/\s+/g, ' ').trim());
assert.match(await yerUyari(), /^!\s?E harfi başka bir patch'in üstüne geliyor\. İstediğin gibi düzenlemeye devam edebilirsin, sepete eklemeden önce düzeltmen yeterli\. Alana yerleştir$/);
await sayfa.locator('[data-kp-alana-yerlestir]').tap();
hk = await kutular();
assert.ok(!ust(hk[2], hk[0]) && !ust(hk[2], hk[1]), 'Alana yerleştir en yakın boş yere taşır');
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 0);
assert.equal(await sayfa.locator('[data-kp-yer-uyari]').isVisible(), false);
// Daire dışına bırak → dışarıda kalır (kırmızı), Alana yerleştir ile içeri
if (await sayfa.locator('[data-kp-secim-kaldir]').isVisible()) await sayfa.locator('[data-kp-secim-kaldir]').tap();
await surukle('[data-uid="harf-0"]', -400, 0);
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 1);
assert.match(await yerUyari(), /E harfi Velcro alanın dışına taşıyor\./);
await sayfa.locator('[data-kp-alana-yerlestir]').tap();
hk = await kutular();

let d = await daire();
assert.ok(hk.every((x) => icinde(x, d)), 'her harf dairenin içinde (yakın görünüm)');
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 0);
await sayfa.screenshot({ path: cikti + '04b-harfler-ayri.png' });

// Tüm çanta görünümünde de aynı kurallar
await sayfa.locator('[data-kp-gorunum]').tap();
await sayfa.waitForTimeout(400);
if (await sayfa.locator('[data-kp-secim-kaldir]').isVisible()) await sayfa.locator('[data-kp-secim-kaldir]').tap();
await surukle('[data-uid="harf-1"]', 0, -300);
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 1, 'tüm çanta görünümünde de dışarıda kalır');
await sayfa.locator('[data-kp-alana-yerlestir]').tap();
hk = await kutular();
d = await daire();
assert.ok(hk.every((x) => icinde(x, d)), 'her harf dairenin içinde (tüm çanta)');
// Geri al: Alana yerleştir'den önceki hale (dışarıda), Yinele: tekrar içeride
await sayfa.locator('[data-kp-geri-al]').tap();
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 1, 'geri al');
await sayfa.locator('[data-kp-yinele]').tap();
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 0, 'yinele');
hk = await kutular();
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
await sayfa.screenshot({ path: '/tmp/claude-0/-home-user-SHOP-FY/008f51ac-81e5-55fc-a930-e42df008c01d/scratchpad/dbg-ece7.png' });
assert.deepEqual(await sayfa.$$eval('.kp-karakter__stil', (x) => x.map((e) => e.textContent)), ['Cool', 'Cool', 'Cool', 'Rakam']);
assert.equal(await sayfa.locator('[data-kp-sinir-notu]').count(), 0, 'sınırın altında not yok');
// Tek ekran, üç araç: varsayılan Metin; ana düğme Özete geç
const araclar = () => sayfa.$$eval('.kp-editor:not(.kp-editor--alt) .kp-arac-dugme', (l) => l.map((e) => [e.dataset.kpAdim, e.getAttribute('aria-pressed'), e.querySelector('[data-kp-rozet]').hidden ? '' : e.querySelector('[data-kp-rozet]').textContent]));
assert.deepEqual(await araclar(), [['yazi', 'true', '4'], ['ikon', 'false', ''], ['aksesuar', 'false', '']]);
assert.equal(await sayfa.locator('[data-kp-ileri]').textContent(), 'Özete geç →');
await sayfa.locator('.kp-arac-dugme[data-kp-adim="ikon"]').click();

// Görsel: Spor kategorisinin Tümü → ızgara, Futbol Topu
await sayfa.locator('[data-kp-panel="ikon"]').waitFor({ state: 'visible' });
assert.equal(await sayfa.locator('.kp-arac-dugme[data-kp-adim="ikon"]').getAttribute('aria-pressed'), 'true');
await sayfa.locator('[data-kp-kategori="Spor"]').click();
await sayfa.locator('[data-kp-kategori-geri]').waitFor();
await sayfa.locator('[data-kp-gorsel-icerik] [data-kp-ikon="2"]').click();
await sayfa.locator('.kp-cip__ad', { hasText: 'Futbol Topu' }).waitFor();

// Dokunarak sürükle: ikonu daire dışına sürükle → bırakıldığı yerde kalır, kırmızı "!"; Alana yerleştir ile içeri
const ikon = sayfa.locator('.kp-parca--icon').first();
const k = await ikon.boundingBox();
const sahne = await sayfa.locator('.kp-onizleme .kp-sahne').boundingBox();
const cdp = await baglam.newCDPSession(sayfa);
const dokun = async (tip, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tip, touchPoints: tip === 'touchEnd' ? [] : [{ x, y }] });
await dokun('touchStart', k.x + k.width / 2, k.y + k.height / 2);
for (let i = 1; i <= 10; i++) await dokun('touchMove', k.x + k.width / 2, k.y + k.height / 2 - (i * (k.y - sahne.y + 30)) / 10);
// Sürüklerken: kırmızı, alan sınırı kalın kırmızı
assert.equal(await sayfa.locator('.kp-sahne--tasma').count(), 1, 'alan sınırı kırmızı');
await dokun('touchEnd');
await sayfa.waitForTimeout(100);
const kDisari = await ikon.boundingBox();
assert.ok(kDisari.y < k.y - 30, 'geri fırlamadı');
assert.equal(await sayfa.locator('.kp-parca--icon.kp-parca--hatali').count(), 1);
assert.equal(await sayfa.evaluate(() => getComputedStyle(document.querySelector('.kp-parca--hatali'), '::after').content), '"!"');
assert.match(await yerUyari(), /^!\s?Futbol Topu Velcro alanın dışına taşıyor\. İstediğin gibi düzenlemeye devam edebilirsin, sepete eklemeden önce düzeltmen yeterli\. Alana yerleştir$/);
// Eklenenler satırında kırmızı ve ⚠
assert.equal(await sayfa.locator('.kp-cip--hatali .kp-cip__ad', { hasText: 'Futbol Topu' }).innerText(), '⚠Futbol Topu');
await sayfa.locator('[data-kp-alana-yerlestir]').tap();
const k2 = await ikon.boundingBox();
const sinirlar = await sayfa.evaluate(() => {
  const el = document.querySelector('.kp-onizleme .kp-sahne ellipse').getBoundingClientRect();
  return { x: el.x, y: el.y, w: el.width, h: el.height };
});
const cx = sinirlar.x + sinirlar.w / 2, cy = sinirlar.y + sinirlar.h / 2, r = sinirlar.w / 2;
const kose = [[k2.x, k2.y], [k2.x + k2.width, k2.y], [k2.x, k2.y + k2.height], [k2.x + k2.width, k2.y + k2.height]];
const merkezUzaklik = Math.hypot(k2.x + k2.width / 2 - cx, k2.y + k2.height / 2 - cy) + k2.width / 2;
assert.ok(merkezUzaklik <= r + 1, 'yuvarlak ikon dairenin içinde kalmalı');
assert.equal(await sayfa.locator('.kp-sahne--tasma').count(), 0, 'bırakınca sınır kaybolur');
assert.equal(await sayfa.locator('.kp-parca--hatali').count(), 0);
await sayfa.screenshot({ path: cikti + '06-ikon-surukleme.png' });

// Sayfa kaymadı mı?
assert.equal(await sayfa.evaluate(() => window.scrollY), 0);

assert.deepEqual(await araclar(), [['yazi', 'false', '4'], ['ikon', 'true', '1'], ['aksesuar', 'false', '']]);
await sayfa.locator('[data-kp-ileri]').click();
// Tasarım → Özet
await sayfa.locator('[data-kp-panel="ozet"]').waitFor({ state: 'visible' });
assert.equal(await sayfa.locator('.kp-editor:not(.kp-editor--alt) [data-kp-araclar]').isVisible(), false, 'Özet\'te araçlar gizli');
await sayfa.locator('.kp-ozet__kampanya').waitFor();
const ozet = await sayfa.locator('.kp-ozet').innerText();
assert.match(ozet, /✓ 4'lü patch indirimi\s+−370 TL/);
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
