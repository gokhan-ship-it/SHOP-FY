// Önizlemede Ayır / Birleştir: seçim çerçevesinin döndürme tutamacının sağında. Blok yazı seçiliyken "↔ Ayır"
// (seçim ilk harfe), ayrı harf seçiliyken "Birleştir" (seçim bloğa). Araç çubuğunda yok; yazı alanındaki butonla aynı durum.
// Üst kenara yakın çerçevede tutamaç ve buton alta geçer. Butona basmak sürükleme başlatmaz. Ayrı harfte Sil yalnızca o harfi siler, yazı alanı güncellenir.
// Geri al / Yinele kapsar. Çanta ve aksesuar tasarım ekranında.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node harf-arac-e2e.mjs  (önce: node sayfa-uret.mjs)
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
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});

async function dene(ed, girdi) {
  const q = (x) => s.locator(ed + ' ' + x).first();
  const arac = () => s.$$eval(ed + ' [data-kp-secim-cubuk] .kp-arac__dugmeler button', (b) => b.filter((x) => !x.hidden).map((x) => x.textContent.trim()));
  const ad = async () => (await q('[data-kp-secili-ad]').textContent()).trim();
  const girdiButonu = async () => (await q('[data-kp-harf-mod]').innerText()).trim();
  const ayri = () => s.evaluate((e) => {
    const k = document.querySelector('kisisel-kart').editor;
    const ed2 = e === '.kp-editor--alt' ? Object.values(k.altEditorler)[0] : k;
    return [!!ed2.t.harfAyri, ed2.secili];
  }, ed);
  await s.locator(girdi).fill('ece');
  await s.locator(girdi).blur();
  // 1) Blok seçili: "Yazı (ECE)" · ↺ 15° · ↻ 15° · Ayır · Sil · Tamam
  await q('.kp-parca[data-grup="isim"]').click();
  assert.equal(await ad(), 'Yazı (ECE)');
  assert.deepEqual(await arac(), ['↺ 15°', '↻ 15°', 'Sil', 'Tamam'], 'araç çubuğunda Ayır yok');
  assert.equal(await girdiButonu(), 'Ayır');
  const onb = () => s.locator(ed + ' [data-kp-cerceve-harf]');
  assert.equal((await onb().innerText()).replace(/\s+/g, ' ').trim(), '↔ Ayır');
  const yer = await s.evaluate((e) => {
    const r = (x) => document.querySelector(e + ' ' + x).getBoundingClientRect();
    const b = r('[data-kp-cerceve-harf]'), tu = r('[data-kp-tutamac]');
    const st = getComputedStyle(document.querySelector(e + ' [data-kp-cerceve-harf]'));
    const sonra = getComputedStyle(document.querySelector(e + ' [data-kp-cerceve-harf]'), '::after');
    return { b: [b.left, b.top, b.height], tu: [tu.right, tu.top + tu.height / 2], zemin: st.backgroundColor, ek: parseFloat(sonra.top) };
  }, ed);
  assert.ok(yer.b[0] >= yer.tu[0] && yer.b[0] - yer.tu[0] < 16 && Math.abs(yer.b[1] + yer.b[2] / 2 - yer.tu[1]) < 6, 'tutamacın hemen sağında: ' + JSON.stringify(yer));
  assert.equal(yer.zemin, 'rgb(255, 255, 255)');
  assert.ok(yer.b[2] - 2 * yer.ek >= 36, 'dokunma alanı en az 36 px');
  // 2) Ayır (önizlemedeki buton): harfler yerinden kaymaz, ayrılır, seçim ilk harfe; iki buton da "Birleştir"
  const oncekiYer = await s.$$eval(ed + ' .kp-parca--letter', (l) => l.map((x) => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
  await onb().tap(); // dokunarak: sürükleme başlamaz, seçim kalkmaz
  const sonrakiYer = await s.$$eval(ed + ' .kp-parca--letter', (l) => l.map((x) => { const r = x.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
  assert.deepEqual(sonrakiYer, oncekiYer, 'yazı yerinden kaymaz');
  assert.deepEqual(await ayri(), [true, 'harf-0']);
  assert.equal(await ad(), 'E harfi');
  assert.deepEqual(await arac(), ['↺ 15°', '↻ 15°', 'Sil', 'Tamam']);
  assert.equal((await onb().innerText()).trim(), 'Birleştir');
  assert.equal(await girdiButonu(), 'Birleştir', 'yazı alanındaki buton da güncellendi');
  assert.equal(await s.locator(ed + ' .kp-parca[data-grup="isim"]').count(), 0);
  // 3) Geri al / Yinele kapsar
  await q('[data-kp-geri-al]').click();
  assert.equal((await ayri())[0], false, 'geri al: birleşik');
  assert.equal(await girdiButonu(), 'Ayır');
  await q('[data-kp-yinele]').click();
  assert.equal((await ayri())[0], true, 'yinele: ayrı');
  // 4) Ayrı harf seçiliyken Sil yalnızca o harfi siler, yazı alanı güncellenir
  await q('.kp-parca[data-grup="harf-1"]').click();
  assert.equal(await ad(), 'C harfi');
  await q('[data-kp-sil]').click();
  assert.equal(await s.locator(girdi).inputValue(), 'EE');
  assert.equal(await s.locator(ed + ' .kp-parca--letter').count(), 2);
  // 5) Ayrı harf seçiliyken Birleştir: düzenli blok, seçim bloğa
  await q('.kp-parca[data-grup="harf-0"]').click();
  await onb().click();
  assert.deepEqual(await ayri(), [false, 'isim']);
  assert.equal(await ad(), 'Yazı (EE)');
  assert.equal(await girdiButonu(), 'Ayır');
  const y = await s.$$eval(ed + ' .kp-parca--letter', (l) => l.map((x) => Math.round(x.getBoundingClientRect().top)));
  assert.ok(Math.abs(y[0] - y[1]) <= 1, 'düzenli blok');
  // 6) Yazı alanındaki buton seçimdeyken araç çubuğunu da günceller
  await q('[data-kp-harf-mod]').click();
  assert.deepEqual(await ayri(), [true, 'harf-0']);
  assert.equal((await onb().innerText()).trim(), 'Birleştir');
  await q('[data-kp-harf-mod]').click();
  assert.equal((await onb().innerText()).replace(/\s+/g, ' ').trim(), '↔ Ayır');
  // 7) Üst kenara yakın: tutamaç ve buton çerçevenin altına geçer, önizlemeden taşmaz
  await s.evaluate((e) => {
    const k = document.querySelector('kisisel-kart').editor;
    const ed2 = e === '.kp-editor--alt' ? Object.values(k.altEditorler)[0] : k;
    const c = ed2.isimMerkezi();
    const kutu = ed2.durum.parcalar.filter((p) => p.grup === 'isim').map((p) => p.sekil);
    const ust = Math.min(...kutu.map((x) => (x.t === 'rect' ? x.y : x.cy - (x.h || x.r * 2 || 0) / 2)));
    // Görünüm penceresinin üst kenarının cm karşılığı; blok oraya yaslanır
    const sr = ed2.sahne.sahne.getBoundingClientRect();
    const gr = ed2.sahne.gorunum.getBoundingClientRect();
    const cmUst = ((gr.top - sr.top) / sr.height) * ed2.m.Hcm;
    ed2.t.isimMerkez = [c[0], cmUst + (c[1] - ust) + 0.2];
    ed2.yenile();
    ed2.sec('isim');
  }, ed);
  const ust = await s.evaluate((e) => {
    const r = (x) => document.querySelector(e + ' ' + x).getBoundingClientRect();
    return { g: r('.kp-gorunum'), c: r('.kp-cerceve'), tu: r('[data-kp-tutamac]'), b: r('[data-kp-cerceve-harf]'), alt: document.querySelector(e + ' .kp-cerceve').classList.contains('kp-cerceve--alt') };
  }, ed);
  assert.ok(ust.alt && ust.tu.top >= ust.c.bottom - 1 && ust.b.top >= ust.c.bottom - 1, 'alta geçti: ' + JSON.stringify(ust));
  assert.ok(ust.tu.bottom <= ust.g.bottom && ust.b.bottom <= ust.g.bottom && ust.b.right <= ust.g.right + 1, 'önizlemeden taşmaz');
}

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
const ana = '.kp-editor:not(.kp-editor--alt)';
await dene(ana, '#kp-isim');
// Aksesuar tasarım ekranı
await s.locator(ana + ' [data-kp-secim-kaldir]').click();
if (await s.locator(ana + ' [data-kp-adim="tasarim"]').isVisible()) await s.locator(ana + ' [data-kp-adim="tasarim"]').click();
await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
await s.locator('[data-kp-aksesuar="9101"]').click();
await s.locator('.kp-editor--alt').waitFor({ state: 'visible' });
await dene('.kp-editor--alt', '#kpa-isim');

console.log('hatalar:', hatalar);
assert.deepEqual(hatalar, []);
await t.close();
console.log('HARF ARAÇ E2E TAMAM');
