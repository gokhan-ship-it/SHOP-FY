// Aksesuar adımı: kartlar, tasarlanamayan aksesuar doğrudan yerleşir, tasarlanabilen için aksesuar tasarım ekranı
// (başlık, yol göstergesi, Yazı/İkon sekmeleri, Çantaya yerleştir), çakışma kutusu (Yer aç / çıkar), kalemle yeniden düzenleme,
// sürüklenince üzerindeki patch'ler birlikte hareket eder, sepette alt grup.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node aksesuar-e2e.mjs  (önce: node sayfa-uret.mjs)
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
s.on('dialog', (d) => d.accept());
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
const ana = '.kp-editor:not(.kp-editor--alt)';
const alt = '.kp-editor--alt';
const toplam = () => metin(ana + ' [data-kp-toplam]');
const cipler = () => s.$$eval(ana + ' .kp-cip__ad', (b) => b.map((x) => x.textContent));
const cdp = await baglam.newCDPSession(s);

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();

// 1) Akış: Yazı → İkon → Aksesuar → Özet
assert.match((await metin(ana + ' .kp-adimlar')), /1 Yazı 2 İkon 3 Aksesuar 4 Özet/);
await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
assert.match(await metin(ana + ' [data-kp-panel="aksesuar"] .kp-panel__aciklama'), /^Çantanın Velcro yüzeyine takılabilen aksesuarlar\. İstersen önce onu da patch'lerle tasarlarsın\.$/);
assert.equal(await s.locator('[data-kp-aksesuar]').count(), 3, 'stokta olmayan yok');
// Üzerine patch takılabilen: "Düz ekle" + kırmızı "Tasarla", yeşil not; takılamayan: tek "Ekle", gri not
const kart = (id) => '.kp-secim--aksesuar:has([data-kp-aksesuar="' + id + '"])';
assert.equal(await metin(kart(9101)), 'Kalem Kutusu Kırmızı 1.700 TL Üzerine patch takılabilir Düz ekle Tasarla');
assert.equal(await metin(kart(9102)), 'Zarf Kalemlik Kırmızı/Pembe 1.500 TL Üzerine patch takılmaz Ekle');
assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).backgroundColor, '[data-kp-aksesuar="9101"]'), 'rgb(179, 20, 27)');
assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q)).color, kart(9101) + ' .kp-aks-kart__not'), 'rgb(46, 125, 50)');
const [b1, b2] = await s.evaluate(() => ['[data-kp-aks-duz="9101"]', '[data-kp-aksesuar="9101"]'].map((q) => document.querySelector(q).getBoundingClientRect()).map((r) => [r.left, r.top]));
assert.ok(b1[0] < b2[0] && Math.abs(b1[1] - b2[1]) < 1, 'Düz ekle solda, Tasarla sağda');
assert.equal(await gorunur(ana + ' [data-kp-panel="aksesuar"] [data-kp-gec]'), true);

// 2) Tasarlanamayan (Velcro yüzeyi yok) yuvarlak: doğrudan yerleşir; etiket kalemsiz
await s.locator('[data-kp-aksesuar="9103"]').click();
assert.equal(await s.locator(ana + ' .kp-parca--aksesuar').count(), 1);
assert.deepEqual(await cipler(), ['Mini Yuvarlak Çanta Mavi']);
assert.equal(await s.locator(ana + ' [data-kp-aks-duzenle]').count(), 0);
assert.equal(await toplam(), '3.900 TL');
assert.equal(await gorunur(ana + ' [data-kp-panel="aksesuar"] [data-kp-gec]'), false);

// 3) Kalem kutusu: kendi tasarım ekranı (sade)
await s.locator('[data-kp-aksesuar="9101"]').click();
await s.locator(alt).waitFor({ state: 'visible' });
assert.equal(await metin(alt + ' .kp-ust__baslik'), 'Kalem Kutusu Kırmızı tasarla');
assert.equal(await metin(alt + ' .kp-yol'), 'Velcro alanın neredeyse tamamını kaplar');
assert.equal(await gorunur(alt + ' .kp-geri'), true);
assert.equal(await metin(alt + ' .kp-adimlar'), 'Yazı İkon');
assert.equal(await s.locator(alt + ' .kp-sekme').count(), 2);
assert.equal(await s.locator(alt + ' [data-kp-kenar]').count(), 0, 'aksesuar ekranında kenar yok');
assert.equal(await s.locator(alt + ' [data-kp-tasarimsiz], ' + alt + ' .kp-aks-not').count(), 0, 'eski link ve notlar yok');
// Boşken ana buton "Düz ekle" ve sarı ipucu
assert.equal(await metin(alt + ' [data-kp-ileri]'), 'Düz ekle');
assert.equal(await metin(alt + ' [data-kp-alt-ipucu]'), 'Bir şey eklemezsen kalem kutusu düz eklenir. Yazı ya da ikon eklersen buton “Tasarımımla ekle” olur.');
assert.equal(await s.evaluate((q) => getComputedStyle(document.querySelector(q + ' [data-kp-ileri]')).backgroundColor, alt), 'rgb(179, 20, 27)');
// Alt çubuk tek satır: solda Vazgeç, ortada Toplam, sağda ana buton
const satir = await s.evaluate((q) => ['[data-kp-vazgec]', '.kp-alt__fiyat', '[data-kp-ileri]'].map((x) => document.querySelector(q + ' ' + x).getBoundingClientRect()).map((r) => [Math.round(r.left), Math.round(r.top + r.height / 2)]), alt);
assert.ok(satir[0][0] < satir[1][0] && satir[1][0] < satir[2][0], 'sıra: Vazgeç, Toplam, buton');
assert.ok(Math.abs(satir[0][1] - satir[2][1]) < 3 && Math.abs(satir[1][1] - satir[2][1]) < 6, 'tek satır: ' + JSON.stringify(satir));
// Önizleme kısa (yatay kalem kutusu): çanta önizlemesinden belirgin kısa
const hAlt = (await s.locator(alt + ' .kp-onizleme__ic').boundingBox()).height;
assert.ok(hAlt < 210, 'aksesuar önizlemesi kısa: ' + hAlt);
await s.locator('#kpa-isim').fill('ada');
assert.equal(await metin(alt + ' [data-kp-ileri]'), 'Tasarımımla ekle');
assert.equal(await gorunur(alt + ' [data-kp-alt-ipucu]'), false);
assert.equal(await s.locator(alt + ' .kp-parca--letter').count(), 3, 'aksesuarın önizlemesinde yazı');
assert.equal(await s.locator(alt + ' .kp-parca--hatali').count(), 0, 'ADA aksesuarın Velcro yüzeyine sığar');
await s.locator(alt + ' [data-kp-adim="ikon"]').click();
assert.equal(await s.locator(alt + ' [data-kp-ikon-yol="set"]').count(), 1, 'aksesuarda da setler');
await s.locator(alt + ' [data-kp-ileri]').click();

// 4) Soru sormadan: kalem kutusu Velcro alanın büyük kısmını kapladığı için çantadaki her şey (yuvarlak çanta da) kenara alınır
assert.equal(await gorunur(alt), false, 'aksesuar ekranı kapandı');
assert.equal(await gorunur(ana + ' [data-kp-onay]'), false, 'kutu yok');
assert.equal(await metin(ana + ' [data-kp-bildirim]'), 'Kalem Kutusu Kırmızı tasarımınla yerleştirildi. Çantadaki Mini Yuvarlak Çanta Mavi kenara alındı, istediklerini geri sürükleyebilirsin. Geri al');
assert.equal(await s.locator(ana + ' .kp-parca--aksesuar').count(), 1, 'çantada yalnızca kalem kutusu');
assert.equal(await s.locator(ana + ' .kp-aks__parca').count(), 3, 'kalem kutusunun üzerinde ADA');
assert.equal(await s.locator(ana + ' [data-kp-kenar-grup]').count(), 1, 'yuvarlak çanta kenarda');
assert.equal(await s.locator(ana + ' .kp-parca--hatali').count(), 0);
assert.deepEqual((await cipler()).sort(), ['Kalem Kutusu Kırmızı', '↧Mini Yuvarlak Çanta Mavi'].sort());
assert.equal(await toplam(), '6.590 TL', 'kenardaki de fiyatlanır');
// Geri al: kalem kutusu tasarımıyla kalkar, yuvarlak çanta yerine döner (tek adım); Yinele hepsini geri getirir
await s.locator(ana + ' [data-kp-bildirim-eylem]').click();
assert.deepEqual(await cipler(), ['Mini Yuvarlak Çanta Mavi']);
assert.equal(await s.locator(ana + ' [data-kp-kenar-grup]').count(), 0);
assert.equal(await s.locator(ana + ' .kp-aks__parca').count(), 0);
await s.locator(ana + ' [data-kp-yinele]').click();
assert.deepEqual((await cipler()).sort(), ['Kalem Kutusu Kırmızı', '↧Mini Yuvarlak Çanta Mavi'].sort(), 'Yinele: tek adımda geri');
assert.equal(await s.locator(ana + ' .kp-aks__parca').count(), 3, 'tasarımıyla');
await s.locator(ana + ' [data-kp-geri-al]').click();
assert.deepEqual(await cipler(), ['Mini Yuvarlak Çanta Mavi'], 'Geri al düğmesi de tek adım');
assert.equal(await s.locator(ana + ' .kp-aks__parca').count(), 0);
// Düz ekle: tasarım ekranı açılmadan yerleşir
await s.locator('[data-kp-aks-duz="9101"]').click();
assert.equal(await gorunur(alt), false, 'Düz ekle tasarım ekranını açmaz');
assert.deepEqual((await cipler()).sort(), ['Kalem Kutusu Kırmızı', '↧Mini Yuvarlak Çanta Mavi'].sort());
assert.equal(await s.locator(ana + ' .kp-aks__parca').count(), 0);
await s.locator(ana + ' [data-kp-geri-al]').click();
assert.deepEqual(await cipler(), ['Mini Yuvarlak Çanta Mavi']);
// Yeniden: yuvarlak çantayı kaldır, kalem kutusunu tasarımıyla yerleştir
await s.locator(ana + ' [data-kp-kaldir]').first().click();
await s.locator('[data-kp-aksesuar="9101"]').click();
await s.locator(alt).waitFor({ state: 'visible' });
await s.locator('#kpa-isim').fill('ada');
await s.locator('#kpa-isim').press('Enter');
await s.locator(alt + ' [data-kp-ileri]').click();
assert.deepEqual(await cipler(), ['Kalem Kutusu Kırmızı']);
assert.equal(await s.locator(ana + ' [data-kp-aks-duzenle]').count(), 1, 'kalemle yeniden düzenlenebilir');
assert.equal(await toplam(), '5.690 TL');

// 5) Sürükle: üzerindeki patch'ler birlikte hareket eder
const once = await s.evaluate(() => { const r = (q) => document.querySelector(q).getBoundingClientRect(); return [r('.kp-editor:not(.kp-editor--alt) .kp-parca--aksesuar'), r('.kp-editor:not(.kp-editor--alt) .kp-aks__parca')].map((x) => [x.left, x.top]); });
const kutu0 = await s.locator(ana + ' .kp-parca--aksesuar').boundingBox();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: kutu0.x + kutu0.width / 2, y: kutu0.y + kutu0.height / 2, id: 0 }] });
for (let i = 1; i <= 4; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: kutu0.x + kutu0.width / 2, y: kutu0.y + kutu0.height / 2 + i, id: 0 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await s.waitForTimeout(150);
const sonra = await s.evaluate(() => { const r = (q) => document.querySelector(q).getBoundingClientRect(); return [r('.kp-editor:not(.kp-editor--alt) .kp-parca--aksesuar'), r('.kp-editor:not(.kp-editor--alt) .kp-aks__parca')].map((x) => [x.left, x.top]); });
const kayma = [sonra[0][1] - once[0][1], sonra[1][1] - once[1][1]];
assert.ok(Math.abs(kayma[0] - kayma[1]) < 0.5, 'iç patch aksesuarla aynı kaydı: ' + kayma);

// 6) Kalemle yeniden düzenle: aksesuar ekranı tasarımla açılır; değişiklik yerinde güncellenir
// Aksesuar seçiliyken araç çubuğunda "Tasarla"; seçim yokken eklenenlerdeki kalem
assert.equal(await gorunur(ana + ' [data-kp-aks-tasarla]'), true);
await s.locator(ana + ' [data-kp-secim-kaldir]').click();
await s.locator(ana + ' [data-kp-aks-duzenle]').click();
await s.locator(alt).waitFor({ state: 'visible' });
assert.equal(await s.locator('#kpa-isim').inputValue(), 'ADA');
assert.equal(await metin(alt + ' [data-kp-ileri]'), 'Kaydet', 'düzenlemede Kaydet');
assert.equal(await gorunur(alt + ' [data-kp-alt-ipucu]'), false);
await s.locator('#kpa-isim').fill('eda');
await s.locator('#kpa-isim').press('Enter'); // klavye kapanır, alt çubuk görünür
await s.locator(alt + ' [data-kp-ileri]').click();
assert.equal(await gorunur(ana + ' [data-kp-onay]'), false, 'yeniden düzenlemede çakışma sorulmaz');
assert.equal(await toplam(), '5.690 TL');

// 7) Küçük aksesuar (zarf): alanın en boş yerine; yalnızca üstüne gelen patch kenara alınır, hiçbir şey silinmez
await s.locator(ana + ' [data-kp-kaldir]').first().click();
await s.locator(ana + ' [data-kp-adim="ikon"]').click();
await s.locator(ana + ' [data-kp-kategori="Spor"]').click();
await s.locator(ana + ' [data-kp-ikon="2"]').click();
await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
await s.locator('[data-kp-aksesuar="9102"]').click();
assert.equal(await gorunur(ana + ' [data-kp-onay]'), false);
assert.match(await metin(ana + ' [data-kp-bildirim]'), /^Zarf Kalemlik Kırmızı\/Pembe yerleştirildi\./);
assert.equal(await s.locator(ana + ' .kp-parca--aksesuar').count(), 1, 'zarf yerleşti');
assert.equal((await cipler()).filter((c) => /Futbol Topu/.test(c)).length, 1, 'ikon silinmedi');
assert.equal(await s.locator(ana + ' .kp-parca--hatali').count(), 0);

// 8) Sepet: aksesuar çanta tasarım grubunun içinde alt grup (önce çantadaki her şey kaldırılır)
if (await gorunur(ana + ' [data-kp-secim-kaldir]')) await s.locator(ana + ' [data-kp-secim-kaldir]').click();
while (await s.locator(ana + ' [data-kp-kaldir]').count()) await s.locator(ana + ' [data-kp-kaldir]').first().click();
await s.locator('[data-kp-aksesuar="9101"]').click();
await s.locator('#kpa-isim').fill('eda');
await s.locator('#kpa-isim').press('Enter'); // klavye kapanır, alt çubuk görünür
await s.locator(alt + ' [data-kp-ileri]').click();
await s.locator(ana + ' [data-kp-adim="ozet"]').click();
await s.locator(ana + ' [data-kp-ileri]').click();
await s.waitForURL('**/cart');
const [baz, ...digerleri] = eklenen.items;
const aksSatir = digerleri.find((k) => k.id === 9201);
assert.ok(aksSatir, 'aksesuar satırı');
assert.equal(aksSatir.properties._tasarim_rol, 'aksesuar');
assert.equal(aksSatir.properties['Aksesuar tasarımı'], 'EDA');
assert.equal(aksSatir.properties._tasarim_id, baz.properties._tasarim_id);
const icPatch = digerleri.filter((k) => k.properties._aksesuar_id === aksSatir.properties._aksesuar_id && k.properties._tasarim_rol === 'patch');
assert.equal(icPatch.reduce((n, k) => n + k.quantity, 0), 3, 'EDA: 3 patch aksesuarın alt grubunda');
assert.equal(icPatch[0].properties.Aksesuar, 'Kalem Kutusu Kırmızı');
const konum = JSON.parse(baz.properties._tasarim_konum);
assert.deepEqual(konum.p.filter((x) => x.t === 'a').map((x) => x.u), [aksSatir.properties._aksesuar_id]);
assert.ok(JSON.parse(aksSatir.properties._aksesuar_konum).p.length === 3);
assert.match(baz.properties['Tasarım'], /Kalem Kutusu Kırmızı \(EDA\)/);

assert.deepEqual(hatalar, []);
await t.close();
console.log('AKSESUAR E2E TAMAM');
