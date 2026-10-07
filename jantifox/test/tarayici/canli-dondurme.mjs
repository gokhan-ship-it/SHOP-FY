// Önizleme linkinde döndürme: iPhone'da Meteor'u ekle, aşağı bakacak şekilde döndür,
// alan kenarına yaklaştırıp taşacak şekilde döndür → kırmızı yanar, bırakınca son geçerli açıya döner.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const cikti = new URL('ekran/canli-dondurme/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const METEOR = '9941460255006';

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
const cdp = await baglam.newCDPSession(s);
const dokun = (type, noktalar) => cdp.send('Input.dispatchTouchEvent', {
  type, touchPoints: noktalar.map(([x, y], id) => ({ x: Math.round(x), y: Math.round(y), id, radiusX: 1, radiusY: 1, force: 1 }))
});
const merkezi = (secici) => s.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, secici);
const SECICI = `.kp-parca--icon[data-grup^="i"]`;
const durum = () => s.evaluate((q) => {
  const el = document.querySelector(q);
  const m = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform || '');
  return { aci: m ? +m[1] : 0, hatali: el.classList.contains('kp-parca--hatali'), cerceveHatali: document.querySelector('.kp-cerceve').classList.contains('kp-cerceve--hatali'), gosterge: document.querySelector('[data-kp-aci]').hidden ? null : document.querySelector('[data-kp-aci]').textContent };
}, SECICI);

async function tutamacCevir(derece, adim) {
  const pivot = await merkezi('.kp-cerceve');
  const h = await merkezi('[data-kp-tutamac]');
  const r = Math.hypot(h[0] - pivot[0], h[1] - pivot[1]);
  const a0 = Math.atan2(h[1] - pivot[1], h[0] - pivot[0]);
  await dokun('touchStart', [h]);
  const g = [];
  for (let i = 1; i <= adim; i++) {
    const a = a0 + ((derece * i) / adim) * (Math.PI / 180);
    await dokun('touchMove', [[pivot[0] + r * Math.cos(a), pivot[1] + r * Math.sin(a)]]);
    g.push(await durum());
  }
  return g;
}

await s.goto('https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766', { waitUntil: 'domcontentloaded', timeout: 60000 });
await s.waitForSelector('kisisel-kart:not([hidden])', { timeout: 30000 });
await s.waitForTimeout(3000);
await s.keyboard.press('Escape');
await s.evaluate(() => { const w = document.getElementById('PBarNextFrameWrapper'); if (w) { try { w.hidePopover(); } catch (e) {} w.remove(); } });
await s.locator('kisisel-kart input[value="kisisel"]').dispatchEvent('click');
await s.waitForSelector('.kp-editor:not([hidden])');
await s.waitForTimeout(1500);

// İkon adımı: Meteor'un bulunduğu kategoriyi bul ve ekle
await s.locator('[data-kp-adim="ikon"]').click();
const kategoriler = await s.locator('[data-kp-kategori]').allInnerTexts();
for (const k of kategoriler) {
  await s.locator(`[data-kp-kategori="${k}"]`).click();
  if (await s.locator(`[data-kp-ikon="${METEOR}"]`).count()) {
    console.log('Meteor kategorisi:', k);
    break;
  }
}
await s.locator(`[data-kp-ikon="${METEOR}"]`).click();
await s.waitForTimeout(500);
const veri = await s.evaluate((id) => JSON.parse(document.querySelector('script[id^="KisiselVeri-"]').textContent).ikonlar.find((i) => String(i.id) === id), METEOR);
console.log('Meteor verisi:', veri.png_en, '×', veri.png_boy, veri.png_sekil);

// Seç
const mc = await merkezi(SECICI);
await dokun('touchStart', [mc]);
await dokun('touchEnd', []);
await s.waitForTimeout(200);
const ad = await s.locator('[data-kp-secili-ad]').textContent();
console.log('seçili:', ad, '· araç çubuğu görünür:', await s.locator('[data-kp-secim-cubuk]').isVisible());
assert.match(ad, /Meteor/);
await s.screenshot({ path: cikti + '01-secili.png' });

// Aşağı bakacak şekilde: fotoğraftaki ~38° eğikliği düzelt (taş altta, kuyruk üstte)
const g1 = await tutamacCevir(38, 12);
console.log('döndürürken gösterge:', g1.map((x) => x.gosterge).join(' '));
await s.screenshot({ path: cikti + '02-donerken.png' });
await dokun('touchEnd', []);
await s.waitForTimeout(300);
const asagi = await durum();
console.log('aşağı bakan açı:', asagi.aci, '· geçerli:', !asagi.hatali, '· gösterge bırakınca:', asagi.gosterge);
assert.equal(asagi.aci, 38);
await s.screenshot({ path: cikti + '03-asagi.png' });

// Kenara yaklaştır: alanın sağ kenarına sürükle (enYakin geçerli en yakın yere bırakır)
const alan = await s.evaluate(() => { const r = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 }; });
const c = await merkezi(SECICI);
const hedef = [alan.cx + alan.r * 0.62, alan.cy + alan.r * 0.1];
await dokun('touchStart', [c]);
for (let i = 1; i <= 14; i++) await dokun('touchMove', [[c[0] + (hedef[0] - c[0]) * i / 14, c[1] + (hedef[1] - c[1]) * i / 14]]);
await dokun('touchEnd', []);
await s.waitForTimeout(300);
console.log('kenarda (döndürmeden):', JSON.stringify(await durum()));
await s.screenshot({ path: cikti + '04-kenarda.png' });

// Taşacak şekilde döndür: 38° → 128° (yatay); kırmızı yanmalı
const tap = await s.locator('[data-kp-tutamac]').isVisible();
const g2 = await tutamacCevir(90, 18);
console.log('kenarda döndürme:', g2.map((x) => x.aci + (x.hatali ? '✗' : '✓')).join(' '));
const kirmizi = g2.filter((x) => x.hatali);
const gecerli = g2.filter((x) => !x.hatali).map((x) => x.aci);
await s.screenshot({ path: cikti + '05-tasti-kirmizi.png' });
await dokun('touchEnd', []);
await s.waitForTimeout(400);
const son = await durum();
const beklenen = gecerli.length ? gecerli[gecerli.length - 1] : asagi.aci;
console.log('tutamaç görünürdü:', tap, '· kırmızı adım:', kirmizi.length, '/', g2.length, '· çerçeve kırmızı:', kirmizi.every((x) => x.cerceveHatali), '· bırakınca açı:', son.aci, '(son geçerli', beklenen + ')', '· hatalı:', son.hatali);
await s.screenshot({ path: cikti + '06-birakinca.png' });
assert.ok(kirmizi.length > 0, 'taşınca kırmızı');
assert.ok(kirmizi.every((x) => x.cerceveHatali), 'çerçeve kırmızı');
assert.equal(son.hatali, false);
assert.equal(son.aci, beklenen);
console.log('sayfa hataları:', JSON.stringify(hatalar));
await t.close();
console.log('CANLI DÖNDÜRME TAMAM');
