// Hazır setler: ikon adımında ilk kategori, set kartı (N patch · fiyat, üstü çizili parça toplamı), sete dokununca
// patch'ler ayrı ayrı yerleşir, sarı kesikli çerçeve + "[Set] seti" etiketi, eklenenlerde tek etiket, taşıyınca çerçeve kalkar,
// tek patch silinince onay ve set bozulur, sepete set ürünü olarak eklenir (konum patch bazında).
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node set-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
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
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const metin = async (q) => (await s.locator(q).first().innerText()).replace(/\s+/g, ' ').trim();
const gorunur = (q) => s.locator(q).first().isVisible();
const toplam = () => metin('[data-kp-toplam]');
const cdp = await baglam.newCDPSession(s);

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('[data-kp-adim="ikon"]').click();

// 1) Görsel paneli: arama kutusu, altında "Tek patch 330 TL"; kategoriler alt alta (ilk "Hazır setler · indirimli"),
// her bölümde ad solda, "Tümü →" sağda, yatay kayan tek sıra kart
assert.equal(await s.locator('[data-kp-ikon-yol]').count(), 0, 'set/kendim seçimi yok');
assert.equal(await s.locator('[data-kp-kategoriler]').count(), 0, 'kategori butonları yok');
assert.equal(await s.locator('[data-kp-gorsel-ara]').getAttribute('placeholder'), 'Görsel ara: kalp, kedi, futbol…');
assert.equal(await metin('[data-kp-ikon-fiyat]'), 'Tek patch 330 TL');
const bolumAdlari = () => s.$$eval('.kp-gorsel-bolum__ad', (x) => x.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
assert.deepEqual(await bolumAdlari(), ['Hazır setler · indirimli', 'Kalpler', 'Spor', 'Hayvanlar', 'Diğer']);
const [bAd, bTumu] = await s.evaluate(() => ['.kp-gorsel-bolum__ad', '.kp-gorsel-tumu'].map((q) => document.querySelector(q).getBoundingClientRect()).map((r) => [r.left, r.top + r.height / 2]));
assert.ok(bAd[0] < bTumu[0] && Math.abs(bAd[1] - bTumu[1]) < 3, 'ad solda, Tümü sağda');
assert.equal(await metin('.kp-gorsel-tumu'), 'Tümü →');
// Diğer sırası (iki kart) yatay: kartlar yan yana, tek satır, kayar
const sira = await s.evaluate(() => {
  const r = [...document.querySelectorAll('.kp-gorsel-sira')][4];
  const k = [...r.children].map((e) => e.getBoundingClientRect());
  return { tekSatir: k.every((x) => Math.abs(x.top - k[0].top) < 1), yanYana: k[1].left > k[0].right - 1, kaydir: getComputedStyle(r).overflowX };
});
assert.deepEqual(sira, { tekSatir: true, yanYana: true, kaydir: 'auto' });
assert.equal(await s.locator('[data-kp-hazir-set]').count(), 1, 'satışta olmayan ve eksik patch\'li set yok');
assert.equal(await metin('[data-kp-hazir-set="8001"]'), 'School Vibes 3 patch · 800 TL 990 TL');
assert.equal(await s.locator('[data-kp-hazir-set="8001"] .kp-set-kart__onizleme img').count(), 3);
assert.equal(await s.locator('[data-kp-hazir-set="8001"] s').textContent(), '990 TL');
assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector('.kp-set-kart__tutar')).color), 'rgb(179, 20, 27)', 'set fiyatı kırmızı');
const setGen = (await s.locator('[data-kp-hazir-set="8001"]').boundingBox()).width;
const ikonGen = (await s.locator('.kp-gorsel-sira [data-kp-ikon]').first().boundingBox()).width;
assert.ok(setGen > ikonGen * 1.5, 'set kartı daha geniş: ' + setGen + ' / ' + ikonGen);
// Tümü → 4 sütun ızgara, "← Spor" ile geri
await s.locator('[data-kp-kategori="Spor"]').click();
assert.equal(await metin('[data-kp-kategori-geri]'), '← Spor');
assert.equal(await s.locator('.kp-gorsel-bolum').count(), 0);
assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector('[data-kp-gorsel-icerik] .kp-izgara--ikon')).gridTemplateColumns.split(' ').length), 4);
assert.deepEqual(await s.$$eval('[data-kp-gorsel-icerik] [data-kp-ikon]', (x) => x.map((e) => e.dataset.kpIkon)), ['2']);
await s.locator('[data-kp-kategori-geri]').click();
assert.equal(await s.locator('.kp-gorsel-bolum').count(), 5);
// Arama: Türkçe karakterden bağımsız; görsel ve kategori adında; kategoriler gizlenir, sonuçlar ızgara
const ara = s.locator('[data-kp-gorsel-ara]');
const sonuclar = () => s.$$eval('[data-kp-gorsel-icerik] [data-kp-ikon], [data-kp-gorsel-icerik] [data-kp-hazir-set]', (x) => x.map((e) => e.dataset.kpIkon || 'set' + e.dataset.kpHazirSet));
await ara.fill('sari');
assert.deepEqual(await sonuclar(), ['5']);
assert.equal(await s.locator('.kp-gorsel-bolum').count(), 0, 'aramada kategoriler gizli');
await ara.fill('KOPEK');
assert.deepEqual(await sonuclar(), ['3']);
await ara.fill('spor');
assert.deepEqual(await sonuclar(), ['2'], 'kategori adı');
await ara.fill('FUTBÖL');
assert.deepEqual(await sonuclar(), ['2']);
await ara.fill('school');
assert.deepEqual(await sonuclar(), ['set8001']);
await ara.fill('zzz');
assert.equal(await metin('.kp-gorsel-bos'), 'Sonuç bulunamadı. Başka bir kelime dene.');
await ara.fill('');
assert.equal(await s.locator('.kp-gorsel-bolum').count(), 5);

// 2) Sete dokun: 3 patch ayrı parçalar olarak, çakışmadan; çerçeve ve etiket; eklenenlerde tek etiket; fiyat set fiyatı
await s.locator('[data-kp-hazir-set="8001"]').click();
assert.equal(await s.locator('.kp-onizleme .kp-parca--icon').count(), 3);
assert.equal(await s.locator('.kp-parca--hatali').count(), 0);
const gruplar = await s.$$eval('.kp-onizleme .kp-parca--icon', (p) => p.map((x) => x.getAttribute('data-grup')));
assert.equal(new Set(gruplar).size, 3, 'her patch ayrı grup (blok değil)');
assert.equal(await gorunur('[data-kp-set-cerceve]'), true);
assert.equal(await metin('.kp-set-cerceve__etiket'), 'School Vibes seti');
const cerceveIcinde = await s.evaluate(() => {
  const c = document.querySelector('[data-kp-set-cerceve]').getBoundingClientRect();
  return [...document.querySelectorAll('.kp-onizleme .kp-parca--icon')].every((p) => { const r = p.getBoundingClientRect(); return r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1; });
});
assert.ok(cerceveIcinde, 'patch\'ler çerçevenin içinde');
assert.deepEqual(await s.$$eval('.kp-cip__ad', (b) => b.map((x) => x.textContent)), ['School Vibes seti · 3']);
assert.equal(await toplam(), '3.800 TL');

// 3) Bir patch'i taşı: çerçeve kalkar, set bozulmaz
const p0 = await s.locator('.kp-onizleme .kp-parca--icon').first().boundingBox();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p0.x + p0.width / 2, y: p0.y + p0.height / 2, id: 0 }] });
for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0.x + p0.width / 2 - i * 4, y: p0.y + p0.height / 2 + i * 4, id: 0 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await s.waitForTimeout(200);
assert.equal(await gorunur('[data-kp-set-cerceve]'), false, 'taşıyınca çerçeve kalkar');
const ciplerSonra = await s.$$eval('.kp-cip__ad', (b) => b.map((x) => x.textContent));
assert.equal(ciplerSonra.length, 1);
assert.match(ciplerSonra[0], /School Vibes seti · 3$/, 'set bozulmadı');
assert.equal(await toplam(), '3.800 TL');
// Başka bir patch'e değdiyse yerinde kalır ve işaretlenir; Alana yerleştir düzeltir
if (await gorunur('[data-kp-yer-uyari]')) await s.locator('[data-kp-alana-yerlestir]').click();
assert.equal(await s.locator('.kp-parca--hatali').count(), 0);

// 4) Seçili patch'i sil: onay kutusu; Vazgeç → set aynen; Patch'i sil → set bozulur, kalanlar tek tek fiyatlanır
await s.locator('.kp-onizleme .kp-parca--icon').first().click();
await s.locator('[data-kp-sil]').click();
assert.equal(await gorunur('[data-kp-onay]'), true);
assert.equal(await metin('.kp-onay__metin'), "Set bozulacak, kalan patch'ler tek tek fiyatlanacak.");
await s.locator('.kp-onay__buton', { hasText: 'Vazgeç' }).click();
assert.equal(await gorunur('[data-kp-onay]'), false);
assert.equal(await s.locator('.kp-onizleme .kp-parca--icon').count(), 3);
await s.locator('[data-kp-sil]').click();
await s.locator('.kp-onay__buton', { hasText: "Patch'i sil" }).click();
assert.equal(await s.locator('.kp-onizleme .kp-parca--icon').count(), 2);
const cipler = await s.$$eval('.kp-cip__ad', (b) => b.map((x) => x.textContent));
assert.equal(cipler.length, 2, 'set bozuldu: tek tek etiketler ' + cipler);
assert.equal(await toplam(), '3.660 TL');

// 5) Eklenenlerdeki set etiketinin ✕'i tüm seti kaldırır
await s.locator('[data-kp-kaldir]').first().click();
await s.locator('[data-kp-kaldir]').first().click();
await s.locator('[data-kp-hazir-set="8001"]').click();
await s.locator('[data-kp-set-kaldir]').click();
assert.equal(await s.locator('.kp-onizleme .kp-parca--icon').count(), 0);

// 6) Set + yazı sepete: set ürünü tek satır (3 patch), konumlar patch bazında set işaretli
await s.locator('[data-kp-hazir-set="8001"]').click();
await s.locator('[data-kp-adim="yazi"]').click();
await s.locator('#kp-isim').fill('ece');
assert.deepEqual(await s.$$eval('[data-kp-rozet]', (x) => x.map((e) => e.hidden ? '' : e.textContent)), ['3', '3', '']);
await s.locator('[data-kp-adim="ozet"]').click();
// Yazı setin üstüne geldiyse: Özet'te liste ve "Hepsini düzelt"; düzeltmeden sepete eklenmez
if (await gorunur('[data-kp-ozet-yer]')) {
  await s.locator('[data-kp-ileri]').click();
  assert.equal(await s.evaluate(() => location.pathname), '/products/kanvas-lacivert-tote-canta', 'sepete eklenmedi');
  await s.locator('[data-kp-ozet-yer] [data-kp-hepsini-duzelt]').click();
  assert.equal(await gorunur('[data-kp-ozet-yer]'), false);
}
// Yer kalmadığı için kenara alınan varsa Özet'te sorulur: hepsini ekle
if (await gorunur('[data-kp-kenar-evet]')) await s.locator('[data-kp-kenar-evet]').click();
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
const [baz, ...digerleri] = eklenen.items;
assert.equal(baz.properties['Tasarım'], 'ECE + School Vibes seti');
const setSatiri = digerleri.find((k) => k.id === 7001);
assert.ok(setSatiri, 'set ürünü eklendi');
assert.equal(setSatiri.quantity, 1);
assert.equal(setSatiri.properties._patch_sayisi, '3');
assert.ok(!digerleri.some((k) => [3002, 3004, 3005].includes(k.id)), 'setin patch\'leri tek tek eklenmedi');
const konum = JSON.parse(baz.properties._tasarim_konum);
assert.deepEqual(konum.p.filter((x) => x.t === 'i').map((x) => x.k), ['8001#1', '8001#1', '8001#1']);

assert.deepEqual(hatalar, []);
await t.close();
console.log('SET E2E TAMAM');
