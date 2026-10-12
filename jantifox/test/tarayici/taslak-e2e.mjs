// Özet ekranı (tek ekran, kompakt kart, büyük önizleme, kenar sorusu) ve taslak olarak kaydetme.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node taslak-e2e.mjs  (önce: node sayfa-uret.mjs)
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
s.on('dialog', (d) => { hatalar.push('beklenmeyen tarayıcı onayı: ' + d.message()); d.dismiss(); });
await s.route('https://jantifox.test/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 500, body: '' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const ana = '.kp-editor:not(.kp-editor--alt)';
const metin = async (q) => (await s.locator(q).first().innerText()).replace(/\s+/g, ' ').trim();
const gorunur = (q) => s.locator(q).first().isVisible();
const ANAHTAR = 'kisisel-tasarim-10087205437726';
const editorAcik = () => s.locator(ana).isVisible();

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();

// 1) Boşken X doğrudan kapatır
await s.locator(ana + ' [data-kp-kapat]').click();
assert.equal(await editorAcik(), false, 'boş tasarımda panel yok');

// 2) Bir şey varken X: "Tasarımın kaydedilsin mi?" paneli; "Tasarıma devam et" kapatır; Esc de
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('#kp-isim').fill('ece');
await s.locator(ana + ' .kp-arac-dugme[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-kategori="Spor"]').click();
await s.locator('[data-kp-gorsel-icerik] [data-kp-ikon="2"]').click();
await s.locator(ana + ' [data-kp-gorunum]').click(); // tüm çanta görünümü
await s.waitForTimeout(400);
await s.locator(ana + ' [data-kp-kapat]').click();
assert.equal(await gorunur(ana + ' [data-kp-taslak]'), true);
assert.equal(await metin(ana + ' [data-kp-taslak] .kp-kpanel__kutu'), 'Tasarımın kaydedilsin mi? Taslak olarak saklarız, bu ürünün sayfasına döndüğünde kaldığın yerden devam edersin. Taslak olarak kaydet ve çık Tasarıma devam et Kaydetmeden çık');
assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q + ' .kp-taslak__ana')).backgroundColor, ana), 'rgb(179, 20, 27)');
await s.locator(ana + ' [data-kp-taslak] .kp-taslak__ikincil').click();
assert.equal(await gorunur(ana + ' [data-kp-taslak]'), false);
assert.equal(await editorAcik(), true);
await s.locator(ana + ' [data-kp-kapat]').click();
await s.keyboard.press('Escape');
assert.equal(await gorunur(ana + ' [data-kp-taslak]'), false, 'Esc paneli kapatır');
assert.equal(await editorAcik(), true);

// 3) "Taslak olarak kaydet ve çık": kartta "Taslak · bugün HH:MM", Devam et / Sil; kayıtta araç ve yakınlaştırma
await s.locator(ana + ' [data-kp-kapat]').click();
await s.locator(ana + ' [data-kp-taslak] .kp-taslak__ana').click();
assert.equal(await editorAcik(), false);
assert.match(await metin('[data-kisisel-taslak]'), /^Taslak · bugün \d\d:\d\d$/);
assert.deepEqual(await s.$$eval('.kisisel-kart__butonlar button', (b) => b.map((x) => x.textContent.trim())), ['Devam et', 'Sil']);
const kayit = await s.evaluate((k) => JSON.parse(localStorage.getItem(k)), ANAHTAR);
assert.equal(kayit.arac, 'ikon');
assert.equal(kayit.yakin, false);
assert.ok(Date.now() - kayit.zaman < 60000);
assert.equal(kayit.t.isim, 'ECE');
// Sayfa yenilenince de taslak; "Devam et" kaldığı yerden (Görsel aracı, tüm çanta görünümü)
await s.reload();
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
assert.match(await metin('[data-kisisel-taslak]'), /^Taslak · bugün \d\d:\d\d$/);
await s.locator('[data-kisisel-govde] [data-kisisel-ac]').click();
assert.equal(await gorunur(ana + ' [data-kp-panel="ikon"]'), true, 'kaldığı araç');
assert.equal(await metin(ana + ' [data-kp-gorunum]'), 'Alana yakınlaş', 'kaldığı görünüm (tüm çanta)');
assert.equal(await s.locator('#kp-isim').inputValue(), 'ECE');

// 4) "Kaydetmeden çık": taslak silinir, kartta "Tasarım silindi · Geri al"; Geri al taslağı geri getirir
await s.locator(ana + ' [data-kp-kapat]').click();
await s.locator(ana + ' [data-kp-taslak-sil]').click();
assert.equal(await editorAcik(), false);
assert.equal(await gorunur('[data-kisisel-davet]'), true);
assert.equal(await s.evaluate((k) => localStorage.getItem(k), ANAHTAR), null);
assert.match(await metin('[data-kisisel-bildirim]'), /Tasarım silindi · Geri al/);
await s.locator('[data-kisisel-geri-al]').click();
assert.equal(await gorunur('[data-kisisel-govde]'), true, 'geri alındı');
assert.ok(await s.evaluate((k) => !!localStorage.getItem(k), ANAHTAR));

// 5) Özet: tek ekran; üst satır, kompakt kart, döküm, bilgi notu, alt çubuk; büyük önizleme ve düzenleme araçları yok
await s.locator('[data-kisisel-govde] [data-kisisel-ac]').click();
await s.locator(ana + ' [data-kp-ileri]').click();
const oz = await s.evaluate((q) => {
  const r = (x) => { const e = document.querySelector(q + ' ' + x); const b = e && e.getBoundingClientRect(); return b && b.width ? b : null; };
  const ust = r('[data-kp-ozet-ust]'), kart = r('.kp-oz__kart'), gorsel = r('[data-kp-oz-gorsel]'), alt = r('.kp-alt'), not = r('.kp-oz__not');
  const k = document.querySelector(q + ' .kp-kaydir');
  return {
    ustH: Math.round(ust.height), ustMetin: document.querySelector(q + ' [data-kp-ozet-ust]').innerText.replace(/\s+/g, ' ').trim(),
    gorsel: [Math.round(gorsel.width), Math.round(gorsel.height)], kartUstte: kart.top >= ust.bottom,
    onizlemeYok: !r('.kp-onizleme') && !r('.kp-gecmis') && !r('[data-kp-gorunum]') && !r('.kp-satir') && !r('[data-kp-kenar]'),
    tekEkran: alt.bottom <= innerHeight + 1 && k.scrollHeight <= k.clientHeight + 1 && not.bottom <= alt.top,
    icerik: document.querySelector(q + ' [data-kp-oz-icerik]').textContent, adet: document.querySelector(q + ' [data-kp-oz-adet]').textContent
  };
}, ana);
// Dikey görsel 130px yüksekliğe sığar (kesilmez): genişlik orantılı
assert.deepEqual(oz, { ustH: 48, ustMetin: '‹ Tasarıma dön Özet', gorsel: [120, 130], kartUstte: true, onizlemeYok: true, tekEkran: true, icerik: 'ECE · Futbol Topu', adet: '4 patch · çantaya takılı' }, JSON.stringify(oz));
assert.equal(await gorunur(ana + ' [data-kp-kapat-ozet]'), true, 'üst satırda X');
assert.equal(await metin(ana + ' .kp-oz__not'), "ⓘ Patch'ler Velcro yüzeye takılır, istediğin zaman yerini değiştirirsin.");
assert.equal(await metin(ana + ' [data-kp-alt-ozet] [data-kp-taslak-kaydet]'), 'Taslak olarak kaydet ve çık');
// Fiyat dökümü: toplamda yeni fiyat (kampanya yok: liste)
assert.match(await metin(ana + ' [data-kp-oz-dokum]'), /Kanvas Lacivert Tote Çanta 3\.000 TL Yazı ve rakam: ECE \(3 patch\) 990 TL İkonlar: Futbol Topu \(1 patch\) 330 TL Toplam 4\.320 TL/);
// Tasarımı büyük gör: tam ekran, yalnızca görüntüleme; kapatınca Özet
await s.locator(ana + ' [data-kp-buyuk-ac]').click();
assert.equal(await gorunur(ana + ' [data-kp-buyuk]'), true);
const buyuk = await s.evaluate((q) => { const b = document.querySelector(q + ' [data-kp-buyuk-sahne]').getBoundingClientRect(); return { w: Math.round(b.width), parca: document.querySelectorAll(q + ' [data-kp-buyuk-sahne] .kp-parca').length, etkilesim: getComputedStyle(document.querySelector(q + ' [data-kp-buyuk-sahne] .kp-sahne')).pointerEvents }; }, ana);
assert.ok(buyuk.w >= 360 && buyuk.parca === 4 && buyuk.etkilesim === 'none', JSON.stringify(buyuk));
await s.locator(ana + ' [data-kp-buyuk-kapat]').click();
assert.equal(await gorunur(ana + ' [data-kp-buyuk]'), false);
assert.equal(await gorunur(ana + ' [data-kp-panel="ozet"]'), true);
// Özet'teki X da taslak panelini açar
await s.locator(ana + ' [data-kp-kapat-ozet]').click();
assert.equal(await gorunur(ana + ' [data-kp-taslak]'), true);
await s.locator(ana + ' [data-kp-taslak] .kp-taslak__ikincil').click();

// 6) Kenar sorusu: cevap verilince döküm ve toplam anında güncellenir
await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
await s.evaluate(() => { const e = document.querySelector('kisisel-kart').editor; const ik = e.t.parcalar.filter((p) => p.tip === 'icon'); window.KisiselEditorIc.kenar.kenaraAl(e.t, ik[0].uid); e.yenile(); });
await s.locator(ana + ' [data-kp-ileri]').click();
assert.equal(await metin(ana + ' .kp-kenar-kart__baslik'), 'Kenarda 1 patch var, bunu da alalım mı?');
assert.deepEqual(await s.$$eval(ana + ' .kp-kenar-kart__butonlar button', (b) => b.map((x) => x.textContent.trim())), ['Hayır', 'Evet, ekle (+330 TL)']);
assert.match(await metin(ana + ' [data-kp-oz-dokum]'), /Toplam 3\.990 TL/);
await s.locator(ana + ' [data-kp-kenar-evet]').click();
assert.match(await metin(ana + ' [data-kp-oz-dokum]'), /İkonlar: Futbol Topu \(1 patch\) 330 TL Toplam 4\.320 TL/, 'evet: dökümde ve toplamda');
assert.match(await metin(ana + ' [data-kp-ileri]'), /4\.320 TL$/);

assert.deepEqual(hatalar, []);
await t.close();
console.log('TASLAK E2E TAMAM');
