// Alan paneli: ön dolgu, kaydet, gruba uygula, kısayollar, yükseklikten ölçek, ölçek çizgisi (tahmin), iki alan,
// kişiselleştirme kapalı, otomatik kayıt, dışa aktarma ve dogrula.py
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node alan-paneli-e2e.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const gecici = mkdtempSync(join(tmpdir(), 'alan-paneli-'));
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await t.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const s = await ctx.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
s.on('dialog', (d) => d.accept());
await s.goto('file://' + kok + 'araclar/alan-paneli/panel.html');
await s.waitForSelector('svg#sahne image');

const D = (h) => s.evaluate((h) => AlanPaneli.D(h), h);
const aktif = () => s.evaluate(() => AlanPaneli.p.aktif);
const ekran = async (x, y) => s.evaluate(([x, y]) => {
  const svg = document.querySelector('#sahne'); const p = svg.createSVGPoint(); p.x = x; p.y = y;
  const q = p.matrixTransform(svg.getScreenCTM()); return [q.x, q.y];
}, [x, y]);
const surukle = async (a, b) => { await s.mouse.move(...a); await s.mouse.down(); await s.mouse.move((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); await s.mouse.move(...b); await s.mouse.up(); };
const sec = async (h) => { await s.evaluate((h) => AlanPaneli.urunSec(h), h); };

// 1. Başlangıç: 3 hazır (tote, iki kalem kutusu), 10 atlandı (40 ürün); ilk çizilecek ürün açık, daire önceden çizili
assert.equal(await s.textContent('#ilerleme'), '3 / 30 hazır');
assert.match(await s.textContent('#ilerleme-alt'), /24 çizilecek · 10 atlandı · 3 görsel yok/);
assert.equal(await aktif(), 'bej-tshirt');
let d = await D('bej-tshirt');
assert.equal(d.sekiller.length, 1);
assert.equal(d.sekiller[0].shape, 'circle');
let o = await s.evaluate(() => AlanPaneli.olcek());
assert.ok(Math.abs(o.pxCm - 361.6 / 22) < 0.01, 'ölçek dairenin çapından');
assert.equal(await s.locator('[data-ornek]').count(), 1, 'örnek harf görünür');

// 2. Ctrl+S: Hazır
await s.keyboard.press('Control+s');
assert.equal((await D('bej-tshirt')).durum, 'hazir');
assert.equal(await s.textContent('#ilerleme'), '4 / 30 hazır');

// 3. Grubun tüm renklerine uygula: tişörtler aynı oranda → Hazır, kontrol işareti yok
await s.fill('#metin-siniri', '7');
await s.click('#gruba-uygula');
for (const h of ['sari-tshirt', 'mavi-tshirt', 'pudra-pembe-tshirt']) {
  d = await D(h);
  assert.equal(d.durum, 'hazir', h);
  assert.equal(d.kontrol, false, h);
  assert.equal(d.ayar.metinSiniri, 7, h);
}
d = await D('mavi-tshirt');
assert.ok(Math.abs(d.sekiller[0].w - 361.6 * 1290 / 1076) < 0.5, 'genişlik oranıyla ölçeklendi');
// typ2 sweatshirt: oranlar farklı → kontrol et
await sec('indigo-sweatshirt');
await s.click('#gruba-uygula');
d = await D('pembe-sweatshirt');
assert.equal(d.kontrol, true);
assert.equal(d.durum, 'cizilecek');
assert.ok(await s.locator('[data-handle="pembe-sweatshirt"] .r-kontrol').count() === 1, 'listede "kontrol et"');

// 4. Kısayollar ve filtre: yalnızca çizilecekler; ] sonraki
await s.check('#filtre');
await sec('bej-sweatshirt');
await s.keyboard.press(']');
assert.equal(await aktif(), 'mavi-sweatshirt');
await s.keyboard.press('Alt+ArrowLeft');
assert.equal(await aktif(), 'bej-sweatshirt');
await s.uncheck('#filtre');

// 5. Mavi spor: oval, ölçek yükseklikten (21 cm); haritada genişliğe çevrilir
await sec('mavi-beyaz-cizgili-spor-canta');
o = await s.evaluate(() => AlanPaneli.olcek());
assert.ok(Math.abs(o.pxCm - 581 / 21) < 0.01);
let h = await s.evaluate(() => AlanPaneli.haritaUret('mavi-beyaz-cizgili-spor-canta'));
assert.equal(h.zones[0].shape, 'ellipse');
assert.ok(Math.abs(h.zones[0].genislik_cm - 470 / (581 / 21)) < 0.01);
assert.equal(h.zones[0].yukseklik_cm, 21);
assert.equal(h.forbidden.length, 2);
await s.keyboard.press('Control+s');
assert.equal((await D('mavi-beyaz-cizgili-spor-canta')).durum, 'hazir');

// 6. Sırt çantası: ölçek çizgisinden tahmin, iki alan çiz
await sec('the-performer-sirt-cantasi-jantifox-x-le-koko-collectif');
assert.equal(await s.locator('[data-handle="the-performer-sirt-cantasi-jantifox-x-le-koko-collectif"] .r-tahmini').count(), 1);
assert.match(await s.textContent('#sorunlar'), /En az bir takılabilir alan/);
await s.click('[data-arac="rect"]');
await surukle(await ekran(230, 220), await ekran(1060, 700));
await s.fill('#o-kose', '3');
await s.click('[data-arac="rect"]');
await surukle(await ekran(240, 900), await ekran(1050, 1400));
d = await D('the-performer-sirt-cantasi-jantifox-x-le-koko-collectif');
assert.deepEqual(d.sekiller.map((x) => x.ad), ['Üst panel', 'Alt cep']);
assert.match(await s.textContent('#sorunlar'), /Ölçü tahmini/);
await s.keyboard.press('Control+s');
assert.equal((await D('the-performer-sirt-cantasi-jantifox-x-le-koko-collectif')).durum, 'hazir');
h = await s.evaluate(() => AlanPaneli.haritaUret('the-performer-sirt-cantasi-jantifox-x-le-koko-collectif'));
assert.equal(h.olcu_tahmini, true);
assert.equal(h.zones.length, 2);
assert.equal(h.zones[0].kose_cm, 3);
assert.ok(h.zones[0].genislik_cm > 20 && h.zones[0].genislik_cm < 30, 'çizgiden hesaplanan genişlik: ' + h.zones[0].genislik_cm);
// Gerçek ölçü girilince tahmin işareti kalkar
await s.locator('svg#sahne [data-id]').first().click({ force: true });
await s.fill('#o-olcu', '22');
assert.equal(await s.locator('[data-handle="the-performer-sirt-cantasi-jantifox-x-le-koko-collectif"] .r-tahmini').count(), 0);
await s.fill('#o-olcu', '');

// 7. Şapka: ölçü bekleniyor; kişiselleştirme kapalı → Atlandı
await sec('sapka');
assert.equal(await s.locator('[data-handle="sapka"] .r-bekliyor').count(), 1);
await s.check('#kapali');
assert.equal((await D('sapka')).durum, 'atlandi');
await s.uncheck('#kapali');
assert.equal((await D('sapka')).durum, 'cizilecek');

// 8. Önceki üründen kopyala (Sarı → Bej şapka; oran farklı → kontrol)
await sec('janti-sapka-bej');
await s.click('#onceki-kopyala');

// 9. Otomatik kayıt: yeniden yükle, aynı ürün ve durumlar
await s.waitForTimeout(400);
await s.reload();
await s.waitForSelector('svg#sahne image');
assert.equal(await aktif(), 'janti-sapka-bej');
assert.equal((await D('mavi-tshirt')).durum, 'hazir');
assert.equal((await D('the-performer-sirt-cantasi-jantifox-x-le-koko-collectif')).sekiller.length, 2);

// 10. Dışa aktar → dogrula.py
const [indirme] = await Promise.all([s.waitForEvent('download'), s.click('#disa-aktar')]);
const dosya = join(gecici, indirme.suggestedFilename());
await indirme.saveAs(dosya);
const j = JSON.parse(readFileSync(dosya, 'utf8'));
assert.equal(j.tur, 'jantifox-alan-paneli');
const hazir = j.urunler.filter((u) => u.durum === 'hazir').map((u) => u.handle).sort();
assert.deepEqual(hazir, ['bej-tshirt', 'kalem-kutusu-le-koko-collectif', 'kalem-kutusu-le-koko-collectif-1', 'kanvas-lacivert-tote-canta',
  'mavi-beyaz-cizgili-spor-canta', 'mavi-tshirt', 'pudra-pembe-tshirt', 'sari-tshirt', 'the-performer-sirt-cantasi-jantifox-x-le-koko-collectif'].sort());
assert.equal(j.urunler.filter((u) => u.durum === 'atlandi').length, 10);
// Mağaza taklidi: kalem kutularında mevcut harita aynı geometri → harita yazılmaz
const mevcut = JSON.parse(readFileSync(kok + 'veri/urunler/mevcut.json', 'utf8'));
const magaza = {};
for (const k of Object.keys(mevcut)) magaza[k] = { harita: JSON.stringify(mevcut[k].harita), onizleme_gorseli: mevcut[k].onizleme_gorseli, aktif: mevcut[k].aktif ? 'true' : null, metin_karakter_siniri: mevcut[k].metin_karakter_siniri || null };
writeFileSync(join(gecici, 'magaza.json'), JSON.stringify(magaza));
const cikti = execFileSync('python3', ['-I', kok + 'araclar/alan-paneli/dogrula.py', dosya, '--magaza', join(gecici, 'magaza.json'), '--plan', join(gecici, 'plan.json')], { encoding: 'utf8' });
const plan = JSON.parse(readFileSync(join(gecici, 'plan.json'), 'utf8'));
const p = Object.fromEntries(plan.urunler.map((u) => [u.handle, u]));
assert.deepEqual(p['kalem-kutusu-le-koko-collectif'].metafields.map((m) => m.key), ['aktif'], 'kalem kutusu: yalnızca aktif');
assert.equal(p['kalem-kutusu-le-koko-collectif'].yuklenecek_png, null);
assert.deepEqual(p['kanvas-lacivert-tote-canta'].metafields, [], 'tote: değişiklik yok\n' + cikti);
assert.equal(p['bej-tshirt'].yuklenecek_png, 'veri/urunler/png/bej-tshirt.png');
assert.deepEqual(p['bej-tshirt'].metafields.map((m) => m.key).sort(), ['aktif', 'harita', 'metin_karakter_siniri']);
assert.deepEqual(p['zarf-kalemlik-le-koko-collectif'].metafields, [{ namespace: 'kisisellestirme', key: 'aktif', type: 'boolean', value: 'false' }]);
assert.match(cikti, /Ölçü tahmini/);
// Bozuk dosya: alan dışarı taşar, ölçek bozulur → hata, plan yok
const bozuk = JSON.parse(readFileSync(dosya, 'utf8'));
bozuk.urunler.find((u) => u.handle === 'bej-tshirt').harita.zones[0].x = 95;
bozuk.urunler.find((u) => u.handle === 'sari-tshirt').harita.zones[0].cap_cm = 4;
writeFileSync(join(gecici, 'bozuk.json'), JSON.stringify(bozuk));
let kod = 0, bozukCikti = '';
try { execFileSync('python3', ['-I', kok + 'araclar/alan-paneli/dogrula.py', join(gecici, 'bozuk.json'), '--plan', join(gecici, 'bozuk-plan.json')], { encoding: 'utf8' }); }
catch (e) { kod = e.status; bozukCikti = e.stdout; }
assert.equal(kod, 1);
assert.match(bozukCikti, /görselin dışına taşıyor/);
assert.match(bozukCikti, /Ölçek (şüpheli|tutarsız)/);

assert.deepEqual(hatalar, []);
await t.close();
console.log('alan-paneli-e2e: tamam');
