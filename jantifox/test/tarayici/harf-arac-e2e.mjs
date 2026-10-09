// Araç çubuğunda Ayır / Birleştir: blok yazı seçiliyken "Ayır" (seçim ilk harfe), ayrı harf seçiliyken "Birleştir"
// (seçim bloğa). Yazı alanındaki buton ile aynı durum. Ayrı harfte Sil yalnızca o harfi siler, yazı alanı güncellenir.
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
  assert.deepEqual(await arac(), ['↺ 15°', '↻ 15°', 'Ayır', 'Sil', 'Tamam']);
  assert.equal(await girdiButonu(), 'Ayır');
  // 2) Ayır: harfler ayrılır, seçim ilk harfe; iki buton da "Birleştir"
  await q('[data-kp-arac-harf]').click();
  assert.deepEqual(await ayri(), [true, 'harf-0']);
  assert.equal(await ad(), 'E harfi');
  assert.deepEqual(await arac(), ['↺ 15°', '↻ 15°', 'Birleştir', 'Sil', 'Tamam']);
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
  await q('[data-kp-arac-harf]').click();
  assert.deepEqual(await ayri(), [false, 'isim']);
  assert.equal(await ad(), 'Yazı (EE)');
  assert.equal(await girdiButonu(), 'Ayır');
  const y = await s.$$eval(ed + ' .kp-parca--letter', (l) => l.map((x) => Math.round(x.getBoundingClientRect().top)));
  assert.ok(Math.abs(y[0] - y[1]) <= 1, 'düzenli blok');
  // 6) Yazı alanındaki buton seçimdeyken araç çubuğunu da günceller
  await q('[data-kp-harf-mod]').click();
  assert.deepEqual(await ayri(), [true, 'harf-0']);
  assert.equal((await q('[data-kp-arac-harf]').textContent()).trim(), 'Birleştir');
  await q('[data-kp-harf-mod]').click();
  assert.equal((await q('[data-kp-arac-harf]').textContent()).trim(), 'Ayır');
}

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
const ana = '.kp-editor:not(.kp-editor--alt)';
await dene(ana, '#kp-isim');
// Aksesuar tasarım ekranı
await s.locator(ana + ' [data-kp-secim-kaldir]').click();
await s.locator(ana + ' [data-kp-adim="aksesuar"]').click();
await s.locator('[data-kp-aksesuar="9101"]').click();
await s.locator('.kp-editor--alt').waitFor({ state: 'visible' });
await dene('.kp-editor--alt', '#kpa-isim');

console.log('hatalar:', hatalar);
assert.deepEqual(hatalar, []);
await t.close();
console.log('HARF ARAÇ E2E TAMAM');
