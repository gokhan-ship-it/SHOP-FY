// Önizlemeyi indir (masaüstü): düğme mobilde yok, masaüstünde sol altta; indirilen PNG 1800 px genişliğinde, patch'ler
// çizili, alan çizgileri, alan adları ("Üst panel", "Alt cep") ve seçim çerçevesi yok: patch kutularının dışındaki her
// piksel ürün görseliyle aynı.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node indir-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const H = 'the-adventurer-sirt-cantasi-jantifox-x-le-koko-collectif';
const kayit = JSON.parse(readFileSync(kok + 'veri/urunler/harita-guncelleme-20261020.json', 'utf8'));
const harita = kayit.urunler['gid://shopify/Product/15869070573854'].yeni;
const png = readFileSync(kok + 'veri/urunler/png/' + H + '.png');
const ham = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const html = ham.replace(/(<script type="application\/json" id="KisiselVeri-main">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
  const v = JSON.parse(json);
  v.gorsel = { en: 1386, boy: 1600, kucuk: '/canta.png', buyuk: '/canta.png', dev: '/canta.png' };
  v.harita = harita;
  v.urun.metin_siniri = null;
  return a + JSON.stringify(v) + b;
});
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const hatalar = [];

async function sayfaAc(baglamAyari) {
  const baglam = await t.newContext({ ...baglamAyari, acceptDownloads: true });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/canta.png') return r.fulfill({ contentType: 'image/png', body: png });
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
    if (url.pathname.startsWith('/api/')) return r.fulfill({ contentType: 'application/json', body: '{"data":{}}' });
    return r.fulfill({ contentType: 'text/html', body: html });
  });
  await s.goto('https://jantifox.test/products/x');
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('.kp-onizleme .kp-sahne').waitFor();
  return { baglam, s };
}

// Mobil: düğme yok
{
  const { baglam, s } = await sayfaAc({ ...devices['iPhone 13'] });
  assert.equal(await s.locator('[data-kp-indir]').isVisible(), false, 'mobilde İndir yok');
  await baglam.close();
}

// Masaüstü: iki alana yazı ve bir ikon, alan adları görünür; İndir
const { baglam, s } = await sayfaAc({ viewport: { width: 1440, height: 900 } });
const O = '.kp-onizleme ';
assert.equal(await s.locator(O + '.kp-alan').count(), 2);
assert.equal(await s.locator(O + '.kp-alan-etiket').count(), 2, 'alan adları önizlemede görünür');
await s.locator('#kp-isim').fill('GOKHAN');
await s.waitForTimeout(200);
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await s.waitForTimeout(300);
const parcaSayisi = await s.locator(O + '.kp-sahne__parcalar > .kp-parca').count();
assert.ok(parcaSayisi >= 7, 'yazı ve ikon: ' + parcaSayisi);
const dugme = s.locator('[data-kp-indir]');
assert.equal(await dugme.isVisible(), true, 'masaüstünde İndir görünür');
const [indirme] = await Promise.all([s.waitForEvent('download'), dugme.click()]);
assert.match(indirme.suggestedFilename(), /^jantifox-tasarim-kanvas-lacivert-tote-canta\.png$/);
const dosya = readFileSync(await indirme.path());
assert.equal(dosya.subarray(1, 4).toString(), 'PNG');
const W = dosya.readUInt32BE(16);
const Hpx = dosya.readUInt32BE(20);
assert.deepEqual([W, Hpx], [1800, Math.round((1800 * 1600) / 1386)]);

// Piksel karşılaştırması: indirilen görsel ile yalnızca ürün görseli; fark yalnızca patch kutularının içinde olmalı
const sonuc = await s.evaluate(async ({ veri, W, Hpx, O }) => {
  const yukle = (src) => new Promise((ok, hata) => { const i = new Image(); i.onload = () => ok(i); i.onerror = hata; i.src = src; });
  const piksel = (img) => {
    const c = document.createElement('canvas'); c.width = W; c.height = Hpx;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, Hpx);
    return x.getImageData(0, 0, W, Hpx).data;
  };
  const a = piksel(await yukle('data:image/png;base64,' + veri));
  const b = piksel(await yukle('/canta.png'));
  const sahne = document.querySelector(O + '.kp-sahne').getBoundingClientRect();
  const k = W / sahne.width;
  const kutular = [...document.querySelectorAll(O + '.kp-sahne__parcalar > .kp-parca')].map((e) => {
    const r = e.getBoundingClientRect();
    return [(r.left - sahne.left) * k - 4, (r.top - sahne.top) * k - 4, (r.right - sahne.left) * k + 4, (r.bottom - sahne.top) * k + 4];
  });
  let dis = 0, ic = 0;
  for (let y = 0; y < Hpx; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      const fark = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
      if (fark <= 24) continue;
      if (kutular.some((q) => x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3])) ic++;
      else dis++;
    }
  }
  return { dis, ic };
}, { veri: dosya.toString('base64'), W, Hpx, O });
assert.equal(sonuc.dis, 0, 'patch dışında fark yok (alan çizgisi / adı çizilmemiş): ' + sonuc.dis);
assert.ok(sonuc.ic > 2000, 'patch\'ler çizildi: ' + sonuc.ic);
// İndirme önizlemeyi değiştirmez: alan adları ve çizgiler yerinde
assert.equal(await s.locator(O + '.kp-alan-etiket').count(), 2);
assert.equal(await s.locator(O + '.kp-sahne__parcalar > .kp-parca').count(), parcaSayisi);
await baglam.close();

assert.deepEqual(hatalar, []);
await t.close();
console.log('İNDİR E2E TAMAM', sonuc);
