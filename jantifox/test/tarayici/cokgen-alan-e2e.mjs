// Çokgen alanlar uçtan uca: panelde eski kayıt korunur; The Performer sırt çantasında sihirli değnekle üst panel ve alt
// cep seçilir, kalemle yasaklı bölge çizilir (Esc iptal, Enter kapatır), noktalar düzenlenir, yumuşatılır; dışa aktarılan
// harita dogrula.py'den geçer. Sonra aynı harita ve görselle editörde isim, set, ikon ve aksesuar yerleştirilir;
// "Alana yerleştir" ve "Hepsini düzelt" çokgen alana getirir. Patch'lerin alanda olduğu editörden bağımsız olarak da
// (SVG yolu üzerinde) denetlenir.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node cokgen-alan-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const gecici = mkdtempSync(join(tmpdir(), 'cokgen-'));
const H = 'the-performer-sirt-cantasi-jantifox-x-le-koko-collectif';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const hatalar = [];
const sonuc = {};

/* ---------------- 1. Panel ---------------- */
{
  const ctx = await t.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const s = await ctx.newPage();
  s.on('pageerror', (e) => hatalar.push('panel: ' + e.message));
  s.on('dialog', (d) => d.accept());
  await s.goto('file://' + kok + 'araclar/alan-paneli/panel.html');
  await s.waitForSelector('svg#sahne image');
  // Önceki sürümün kaydı (çokgensiz): yüklenince aynen gelmeli
  await s.evaluate(() => {
    const eski = { aktif: 'sari-tshirt', urun: { 'sari-tshirt': { durum: 'hazir', sekiller: [{ id: 'eski1', tur: 'alan', ad: 'Ön alan', shape: 'circle', x: 368, y: 273, w: 358, h: 358, tipler: ['letter', 'number', 'icon'], olcuCm: 22, olcuYon: 'genislik' }], cizgi: null, ayar: { metinSiniri: 5, kapali: false, izinler: { harf: true, rakam: true, ikon: true, set: true, aksesuar: false } }, kontrol: false, degisti: false } } };
    localStorage.setItem('jantifox-alan-paneli-v1', JSON.stringify(eski));
  });
  await s.reload();
  await s.waitForSelector('svg#sahne image');
  const D = (h) => s.evaluate((h) => AlanPaneli.D(h), h);
  assert.equal(await s.evaluate(() => AlanPaneli.p.aktif), 'sari-tshirt', 'eski kayıttaki ürün açıldı');
  let d = await D('sari-tshirt');
  assert.equal(d.durum, 'hazir');
  assert.equal(d.sekiller[0].id, 'eski1');
  assert.equal(d.ayar.metinSiniri, 5);

  await s.evaluate((h) => AlanPaneli.urunSec(h), H);
  const ekran = async (x, y) => s.evaluate(([x, y]) => {
    const svg = document.querySelector('#sahne'); const p = svg.createSVGPoint(); p.x = x; p.y = y;
    const q = p.matrixTransform(svg.getScreenCTM()); return [q.x, q.y];
  }, [x, y]);
  const tikla = async (x, y) => { const [a, b] = await ekran(x, y); await s.mouse.click(a, b); };
  const bekle = async (kosul) => { for (let i = 0; i < 100; i++) { if (await kosul()) return; await s.waitForTimeout(50); } throw new Error('zaman aşımı'); };

  // Sihirli değnek: üst panel
  await s.click('[data-arac="degnek"]');
  assert.equal(await s.isVisible('#degnek-bolum'), true);
  assert.equal(await s.inputValue('#degnek-hassasiyet'), '15');
  await tikla(640, 500);
  await bekle(async () => (await D(H)).sekiller.length === 1);
  d = await D(H);
  const ust = d.sekiller[0];
  assert.equal(ust.shape, 'poly');
  assert.equal(ust.ad, 'Üst panel');
  assert.ok(ust.noktalar.length >= 20 && ust.noktalar.length <= 60, 'nokta sayısı ' + ust.noktalar.length);
  // Bej panelin içinde: kutu 180–1120 × 230–900 civarı
  assert.ok(ust.x > 150 && ust.x + ust.w < 1150 && ust.y > 200 && ust.y + ust.h < 920, 'üst panel kutusu ' + [ust.x, ust.y, ust.w, ust.h].map(Math.round));
  sonuc.ustPanel = { nokta: ust.noktalar.length, kutu: [ust.x, ust.y, ust.w, ust.h].map(Math.round) };
  // Hassasiyet değişince seçim anında güncellenir
  await s.evaluate(() => { const r = document.querySelector('#degnek-hassasiyet'); r.value = '22'; r.dispatchEvent(new Event('input')); });
  await bekle(async () => (await D(H)).sekiller[0].degnek.hassasiyet === 22);
  assert.notDeepEqual((await D(H)).sekiller[0].noktalar, ust.noktalar, 'hassasiyetle seçim değişti');
  await s.evaluate(() => { const r = document.querySelector('#degnek-hassasiyet'); r.value = '15'; r.dispatchEvent(new Event('input')); });
  await bekle(async () => (await D(H)).sekiller[0].degnek.hassasiyet === 15);
  assert.deepEqual((await D(H)).sekiller[0].noktalar, ust.noktalar, 'aynı ayar aynı seçim');

  // Sihirli değnek: alt cep (yalnızca ikon)
  await s.click('[data-arac="degnek"]');
  await tikla(640, 1250);
  await bekle(async () => (await D(H)).sekiller.length === 2);
  d = await D(H);
  assert.equal(d.sekiller[1].ad, 'Alt cep');
  sonuc.altCep = { nokta: d.sekiller[1].noktalar.length, kutu: [d.sekiller[1].x, d.sekiller[1].y, d.sekiller[1].w, d.sekiller[1].h].map(Math.round) };
  await s.uncheck('[data-tip="letter"]');
  await s.uncheck('[data-tip="number"]');
  assert.deepEqual((await D(H)).sekiller[1].tipler, ['icon']);

  // Kalem: yasaklı bölge (fermuar). Önce Esc ile iptal
  await s.selectOption('#cizim-tur', 'yasak');
  await s.click('[data-arac="kalem"]');
  await tikla(200, 862);
  await tikla(1100, 862);
  await s.keyboard.press('Escape');
  assert.equal((await D(H)).sekiller.length, 2, 'Esc iptal etti');
  for (const [x, y] of [[200, 858], [1100, 858], [1100, 900], [200, 900]]) await tikla(x, y);
  await s.keyboard.press('Enter');
  d = await D(H);
  assert.equal(d.sekiller.length, 3);
  assert.equal(d.sekiller[2].tur, 'yasak');
  assert.equal(d.sekiller[2].noktalar.length, 4);
  // İlk noktaya tıklayarak kapatma
  await s.click('[data-arac="kalem"]');
  for (const [x, y] of [[50, 50], [120, 50], [120, 120]]) await tikla(x, y);
  await tikla(50, 50);
  assert.equal((await D(H)).sekiller.length, 4, 'ilk noktaya tıklayınca kapandı');
  await s.keyboard.press('Delete');
  assert.equal((await D(H)).sekiller.length, 3, 'deneme şekli silindi');

  // Nokta düzenleme: üst paneli seç, kenara tıkla → araya nokta; Delete → nokta silinir; noktayı sürükle
  const u0 = (await D(H)).sekiller[0];
  const [ix, iy] = await ekran(u0.x + u0.w / 2, u0.y + u0.h * 0.2); // ortada örnek harf var
  await s.mouse.click(ix, iy);
  assert.equal(await s.evaluate(() => AlanPaneli.gor.seciliId), u0.id);
  const n0 = u0.noktalar.length;
  const a = u0.noktalar[3], b = u0.noktalar[4];
  await tikla((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  assert.equal((await D(H)).sekiller[0].noktalar.length, n0 + 1, 'kenara tıklayınca nokta eklendi');
  assert.equal((await D(H)).sekiller[0].degnek, undefined, 'elle düzenlenince değnek bağı kalkar');
  await s.keyboard.press('Delete');
  assert.equal((await D(H)).sekiller[0].noktalar.length, n0, 'seçili nokta silindi');
  const [px, py] = await ekran(...u0.noktalar[0]);
  await s.mouse.move(px, py); await s.mouse.down(); await s.mouse.move(px + 4, py + 6); await s.mouse.move(px + 8, py + 12); await s.mouse.up();
  const tasinan = (await D(H)).sekiller[0].noktalar[0];
  assert.ok(Math.abs(tasinan[1] - u0.noktalar[0][1]) > 3, 'nokta sürüklendi');
  // Yumuşatma: açılınca çizilen şekil daha çok noktalı eğri, kapatınca köşeli
  await s.check('#o-yumusat');
  assert.equal((await D(H)).sekiller[0].yumusat, 0.6);
  const yolNokta = await s.evaluate((id) => document.querySelector(`#sahne path[data-id="${id}"]`).getAttribute('d').split('L').length, u0.id);
  assert.ok(yolNokta > n0 * 4, 'yumuşak yol ' + yolNokta);
  await s.evaluate(() => { const r = document.querySelector('#o-yumusat-miktar'); r.value = '0.3'; r.dispatchEvent(new Event('input')); });
  assert.equal((await D(H)).sekiller[0].yumusat, 0.3);
  await s.uncheck('#o-yumusat');
  assert.equal((await D(H)).sekiller[0].yumusat, 0);

  // Örnek harf alanda; kaydet (ölçek çizgiden: tahmin uyarısı, hata yok)
  const den = await s.evaluate((h) => AlanPaneli.denetle(h), H);
  assert.deepEqual(den.hatalar, []);
  await s.keyboard.press('Escape');
  await s.keyboard.press('Control+s');
  assert.equal((await D(H)).durum, 'hazir');
  const harita = await s.evaluate((h) => AlanPaneli.haritaUret(h), H);
  assert.equal(harita.zones.length, 2);
  assert.equal(harita.zones[0].shape, 'poly');
  assert.ok(harita.zones[0].genislik_cm > 15 && harita.zones[0].genislik_cm < 30, 'genişlik ' + harita.zones[0].genislik_cm);
  assert.ok(harita.zones[0].points.length >= 20);
  assert.deepEqual(harita.zones[1].allowed_types, ['icon']);
  assert.equal(harita.forbidden[0].shape, 'poly');
  assert.equal(harita.olcu_tahmini, true);
  sonuc.harita = harita;

  // Dışa aktar → dogrula.py
  const [indirme] = await Promise.all([s.waitForEvent('download'), s.click('#disa-aktar')]);
  const dosya = join(gecici, 'disa.json');
  await indirme.saveAs(dosya);
  const cikti = execFileSync('python3', ['-I', kok + 'araclar/alan-paneli/dogrula.py', dosya, '--plan', join(gecici, 'plan.json')], { encoding: 'utf8' });
  assert.match(cikti, /The Performer[^\n]*\n(    uyarı[^\n]*\n)*/);
  assert.doesNotMatch(cikti, /HATA/);
  const plan = JSON.parse(readFileSync(join(gecici, 'plan.json'), 'utf8'));
  assert.ok(plan.urunler.some((u) => u.handle === H && u.metafields.some((m) => m.key === 'harita')));
  // Çokgeni bozuk dosya: nokta görsel dışında, kenarlar kesişiyor → hata
  const bozuk = JSON.parse(readFileSync(dosya, 'utf8'));
  const bz = bozuk.urunler.find((u) => u.handle === H).harita.zones[0];
  [bz.points[0], bz.points[5]] = [bz.points[5], bz.points[0]];
  writeFileSync(join(gecici, 'bozuk.json'), JSON.stringify(bozuk));
  let bozukCikti = '';
  try { execFileSync('python3', ['-I', kok + 'araclar/alan-paneli/dogrula.py', join(gecici, 'bozuk.json'), '--plan', join(gecici, 'b.json')], { encoding: 'utf8' }); }
  catch (e) { bozukCikti = e.stdout; }
  assert.match(bozukCikti, /kenarları birbirini kesiyor/);
  await ctx.close();
}

/* ---------------- 2. Editör (aynı harita ve görsel) ---------------- */
{
  const ham = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
  const png = readFileSync(kok + 'veri/urunler/png/' + H + '.png');
  const html = ham.replace(/(<script type="application\/json" id="KisiselVeri-main">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
    const v = JSON.parse(json);
    v.gorsel = { en: 1295, boy: 1600, kucuk: '/canta.png', buyuk: '/canta.png' };
    v.harita = sonuc.harita;
    v.urun.metin_siniri = null;
    return a + JSON.stringify(v) + b;
  });
  const baglam = await t.newContext({ ...devices['iPhone 13'] });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push('editör: ' + e.message));
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/canta.png') return r.fulfill({ contentType: 'image/png', body: png });
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
    if (url.pathname.startsWith('/api/')) return r.fulfill({ contentType: 'application/json', body: '{"data":{}}' });
    return r.fulfill({ contentType: 'text/html', body: html });
  });
  await s.goto('https://jantifox.test/products/the-performer');
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('.kp-onizleme .kp-sahne').waitFor();
  assert.equal(await s.locator('.kp-onizleme .kp-alan').count(), 2);
  assert.equal(await s.evaluate(() => document.querySelector('.kp-onizleme .kp-alan').tagName), 'path');
  assert.equal(await s.locator('.kp-onizleme .kp-yasak').count(), 1);

  // Editörden bağımsız denetim: her patch'in iç bölgesindeki noktalar aynı alan yolunun içinde, yasaklı yolun dışında
  const denetle = () => s.evaluate(() => {
    const svg = document.querySelector('.kp-onizleme .kp-sahne__alanlar');
    const ters = svg.getScreenCTM().inverse();
    const alanlar = [...svg.querySelectorAll('.kp-alan')];
    const yasaklar = [...svg.querySelectorAll('.kp-yasak')];
    const sorun = [];
    let sayi = 0;
    document.querySelectorAll('.kp-onizleme .kp-sahne__parcalar > .kp-parca').forEach((el) => {
      if (el.closest('.kp-kenar') || el.classList.contains('kp-parca--kenar')) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      sayi++;
      const noktalar = [];
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
        const p = new DOMPoint(r.x + r.width * (0.3 + 0.1 * i), r.y + r.height * (0.3 + 0.1 * j)).matrixTransform(ters);
        noktalar.push(p);
      }
      const ic = alanlar.some((a) => noktalar.every((p) => a.isPointInFill(p)));
      const yasakta = yasaklar.some((y) => noktalar.some((p) => y.isPointInFill(p)));
      if (!ic || yasakta) sorun.push((el.dataset.uid || '?') + (ic ? ' yasakta' : ' alan dışında'));
    });
    return { sayi, sorun, hatali: document.querySelectorAll('.kp-onizleme .kp-parca--hatali').length };
  });

  // İsim (harf yalnızca üst panelde)
  await s.locator('#kp-isim').fill('ada');
  await s.waitForTimeout(150);
  let dn = await denetle();
  assert.equal(dn.hatali, 0);
  assert.deepEqual(dn.sorun, []);
  assert.match(await s.locator('[data-kp-kapasite]').textContent(), /^3 \/ \d+$/);
  sonuc.kapasite = await s.locator('[data-kp-kapasite]').textContent();

  // Set ve ikonlar
  await s.locator('.kp-arac-dugme[data-kp-adim="ikon"]').click();
  await s.locator('[data-kp-panel="ikon"]').waitFor({ state: 'visible' });
  await s.locator('[data-kp-hazir-set="8001"]').click();
  await s.waitForTimeout(150);
  for (const id of ['2', '4', '5']) {
    await s.locator(`[data-kp-panel="ikon"] [data-kp-ikon="${id}"]:not([disabled])`).first().click();
    await s.waitForTimeout(120);
  }
  dn = await denetle();
  assert.equal(dn.hatali, 0, 'set ve ikonlar geçerli yerde');
  assert.deepEqual(dn.sorun, []);
  sonuc.yerlesen = dn.sayi;

  // Bir ikonu alanın dışına sürükle → işaretlenir → "Alana yerleştir"
  const cdp = await baglam.newCDPSession(s);
  const surukle = async (el, dx, dy) => {
    const b = await el.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await s.waitForTimeout(120);
  };
  const ikonlar = s.locator('.kp-onizleme .kp-sahne__parcalar > .kp-parca--icon');
  const sahne = await s.locator('.kp-onizleme .kp-sahne').boundingBox();
  const ilk = await ikonlar.last().boundingBox();
  await surukle(ikonlar.last(), sahne.x + 8 - ilk.x, 0);
  assert.equal((await denetle()).hatali, 1, 'dışarı sürüklenen işaretlendi');
  await s.locator('[data-kp-yerlestir-balon]').tap();
  await s.waitForTimeout(150);
  dn = await denetle();
  assert.equal(dn.hatali, 0, 'Alana yerleştir');
  assert.deepEqual(dn.sorun, []);

  // Yasaklı bölge (fermuar) normalde görünmez; sürüklerken soluk; bir patch değince kırmızı
  const yasak = () => s.evaluate(() => { const y = document.querySelector('.kp-onizleme .kp-yasak'); const c = getComputedStyle(y); return { dolgu: c.fill, degdi: y.classList.contains('kp-yasak--degdi') }; });
  assert.deepEqual(await yasak(), { dolgu: 'rgba(255, 59, 48, 0)', degdi: false }, 'normalde görünmez');
  {
    const b = await ikonlar.first().boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 6, y: y + 6 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 10, y: y + 10 }] });
    await s.waitForTimeout(250);
    const surerken = await yasak();
    assert.ok(surerken.dolgu !== 'rgba(255, 59, 48, 0)' && !surerken.degdi, 'sürüklerken soluk: ' + JSON.stringify(surerken));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await s.waitForTimeout(250);
    assert.deepEqual(await yasak(), { dolgu: 'rgba(255, 59, 48, 0)', degdi: false }, 'bırakınca yine görünmez');
  }
  // İki ikon fermuarın (yasaklı) üstüne → "Hepsini düzelt"
  const fermuar = await s.locator('.kp-onizleme .kp-yasak').boundingBox();
  for (const k of [0, 1]) {
    const b = await ikonlar.nth(k).boundingBox();
    await surukle(ikonlar.nth(k), fermuar.x + fermuar.width * (0.3 + 0.4 * k) - (b.x + b.width / 2), fermuar.y + fermuar.height / 2 - (b.y + b.height / 2));
  }
  assert.ok((await denetle()).hatali >= 1, 'fermuardakiler işaretlendi');
  await s.waitForTimeout(200);
  assert.deepEqual(await yasak(), { dolgu: 'rgba(255, 59, 48, 0.22)', degdi: true }, 'patch değince kırmızı');
  assert.match(await s.locator('[data-kp-yer-uyari]').innerText(), /Hepsini düzelt/);
  await s.locator('[data-kp-yer-uyari] [data-kp-hepsini-duzelt]').click();
  await s.waitForTimeout(200);
  dn = await denetle();
  assert.equal(dn.hatali, 0, 'Hepsini düzelt');
  await s.waitForTimeout(200);
  assert.deepEqual(await yasak(), { dolgu: 'rgba(255, 59, 48, 0)', degdi: false }, 'düzeltince yeniden görünmez');
  assert.deepEqual(dn.sorun, []);

  // Aksesuar (düz): ikon alanlarından birine yerleşir
  await s.locator('.kp-arac-dugme[data-kp-adim="aksesuar"]').click();
  await s.locator('[data-kp-aks-duz="9101"]').click();
  await s.waitForTimeout(200);
  dn = await denetle();
  assert.equal(dn.hatali, 0, 'aksesuar sonrası');
  assert.deepEqual(dn.sorun, []);
  sonuc.aksesuarSonrasi = dn.sayi;
  assert.equal(dn.sayi, sonuc.yerlesen + 1, 'hiçbir patch kenara alınmadı: aksesuar boş olan alt cebe yerleşti');
  // Kenarda kalan varsa "Sığdırmayı dene" çalışır ve hiçbir şey geçersiz kalmaz
  if (await s.locator('[data-kp-sigdir-kenar]').isVisible()) {
    await s.locator('[data-kp-sigdir-kenar]').click();
    await s.waitForTimeout(200);
    assert.equal((await denetle()).hatali, 0);
  }
  await baglam.close();
}

assert.deepEqual(hatalar, []);
await t.close();
console.log('cokgen-alan-e2e: tamam', JSON.stringify({ ustPanel: sonuc.ustPanel, altCep: sonuc.altCep, kapasite: sonuc.kapasite, yerlesen: sonuc.yerlesen, aksesuarSonrasi: sonuc.aksesuarSonrasi }));
