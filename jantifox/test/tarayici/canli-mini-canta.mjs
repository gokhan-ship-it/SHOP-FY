// Önizleme linkinde 6 mini çanta (tek patch): kart açılıyor mu, adımlar Yazı / İkon, alan çizgisi Velcro kadar;
// ilk üründe yazı → ikon → yazı yer değiştirme, stoktaki en büyük ikon, sepete ekleme (sonra sepet boşaltılır).
// Canlı temada (önizleme parametresi olmadan) aynı ürünlerde kartın görünmediği de denetlenir. Ekran görüntüsü almaz.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node canli-mini-canta.mjs <kopya tema id>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const TEMA = process.argv[2];
if (!TEMA) throw new Error('kopya tema id gerekli');
const URUNLER = [
  'cok-amacli-mini-canta-kirmizi-beyaz-zikzak', 'cok-amacli-mini-canta-kirmizi-puantiyeli-1',
  'cok-amacli-mini-canta-kirmizi-puantiyeli', 'cok-amacli-mini-canta-kucuk-puantiyeli',
  'cok-amacli-mini-canta-yesil-pembe-cizgili', 'cok-amacli-mini-canta-sari-cizgili'
];
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(s.url().replace(/^https:\/\/[^/]+/, '') + ' :: ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
const O = '.kp-onizleme ';
const parcalar = () => s.$$eval(O + '.kp-sahne__parcalar > .kp-parca', (x) => x.map((e) => (e.className.match(/kp-parca--(letter|number|icon)/) || [])[1]));
const bildirim = async () => ((await s.locator('[data-kp-bildirim]').isVisible()) ? (await s.locator('[data-kp-bildirim]').innerText()).trim() : '');
const merkezFarki = () => s.evaluate((q) => {
  const p = document.querySelector(q + '.kp-sahne__parcalar > .kp-parca').getBoundingClientRect();
  const v = document.querySelector(q + '.kp-alan').getBoundingClientRect();
  return +(Math.hypot(p.x + p.width / 2 - (v.x + v.width / 2), p.y + p.height / 2 - (v.y + v.height / 2)) / v.width).toFixed(3);
}, O);
const hazirla = async (url) => {
  await s.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await s.waitForTimeout(2500);
  await s.keyboard.press('Escape');
  await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
};
const sonuc = { onizleme: {}, canli: {} };

for (const [i, h] of URUNLER.entries()) {
  const r = {};
  await hazirla(`https://jantifox.com/products/${h}?preview_theme_id=${TEMA}`);
  r.tema = await s.evaluate(() => String(Shopify.theme.id));
  r.kart = await s.locator('kisisel-kart:not([hidden])').count();
  if (!r.kart) { sonuc.onizleme[h] = r; continue; }
  const veri = await s.evaluate(() => JSON.parse(document.querySelector('[id^="KisiselVeri-"]').textContent));
  r.harita_w = veri.harita.zones[0].w;
  await s.locator('kisisel-kart [data-kisisel-ac]').first().dispatchEvent('click');
  await s.locator(O + '.kp-sahne').waitFor({ timeout: 20000 });
  await s.waitForTimeout(800);
  r.adimlar = await s.$$eval('.kp-arac-dugme[data-kp-adim]', (x) => x.map((e) => e.getAttribute('data-kp-adim')));
  r.alan_orani = await s.evaluate((q) => +(document.querySelector(q + '.kp-alan').getBoundingClientRect().width / document.querySelector(q + '.kp-sahne').getBoundingClientRect().width * 100).toFixed(2), O);
  r.ipucu = (await s.locator('#kp-yazi-ipucu').innerText()).trim();
  if (i === 0) {
    const girdi = s.locator('#kp-isim');
    await girdi.click();
    await s.keyboard.type('a');
    await s.waitForTimeout(200);
    await s.keyboard.type('k');
    await s.waitForTimeout(200);
    r.yazi = { deger: await girdi.inputValue(), parcalar: await parcalar(), merkez: await merkezFarki() };
    await s.locator('[data-kp-adim="ikon"]').click();
    r.hazirSet = await s.locator('[data-kp-hazir-set]').count();
    // Stokta olan ikonlar arasında en büyüğü (cm² olarak)
    const ikonlar = veri.ikonlar.filter((x) => x.varyantlar.some((v) => v.stok > 0)).map((x) => {
      const en = parseFloat(x.png_en || x.en) || 0, boy = parseFloat(x.png_boy || x.boy) || en;
      return { id: x.id, ad: x.baslik, en, boy, alan: en * boy };
    }).sort((a, b) => b.alan - a.alan);
    const kucuk = ikonlar[ikonlar.length - 1], buyuk = ikonlar[0];
    await s.locator(`[data-kp-ikon="${kucuk.id}"]`).first().click();
    await s.waitForTimeout(250);
    r.ikon1 = { ad: kucuk.ad, parcalar: await parcalar(), yazi: await girdi.inputValue(), bildirim: await bildirim() };
    await s.locator(`[data-kp-ikon="${buyuk.id}"]`).first().click();
    await s.waitForTimeout(250);
    r.enBuyukIkon = { ad: buyuk.ad, olcu: buyuk.en + ' × ' + buyuk.boy, parcalar: await parcalar(),
      hatali: await s.locator(O + '.kp-parca--hatali').count(), merkez: await merkezFarki(), bildirim: await bildirim(),
      disabled: await s.locator(`[data-kp-ikon="${buyuk.id}"]`).first().isDisabled() };
    await s.locator('[data-kp-adim="yazi"]').click();
    await girdi.click();
    await s.keyboard.type('7');
    await s.waitForTimeout(250);
    r.yazi2 = { parcalar: await parcalar(), bildirim: await bildirim() };
    await s.locator('[data-kp-ileri]').click();
    r.ozet = (await s.locator('.kp-ozet').innerText()).replace(/\s+/g, ' ').slice(0, 300);
    await s.locator('[data-kp-ileri]').click();
    await s.waitForTimeout(5000);
    const sepet = await s.evaluate(() => fetch('/cart.js').then((x) => x.json()));
    r.sepet = { toplam: sepet.total_price, kalemler: sepet.items.map((x) => ({ baslik: x.title, adet: x.quantity, ozellik: x.properties })) };
    await s.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
    r.sepetSonra = (await s.evaluate(() => fetch('/cart.js').then((x) => x.json()))).item_count;
  }
  sonuc.onizleme[h] = r;
}

// Canlı tema: aynı ürünlerde kart yok
const c2 = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s2 = await c2.newPage();
for (const h of URUNLER) {
  await s2.goto(`https://jantifox.com/products/${h}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await s2.waitForTimeout(1500);
  sonuc.canli[h] = { tema: await s2.evaluate(() => String(Shopify.theme.id)), kart: await s2.locator('kisisel-kart:not([hidden])').count(),
    kisiselVeri: await s2.locator('[id^="KisiselVeri-"]').count() };
}
sonuc.hatalar = hatalar;
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
