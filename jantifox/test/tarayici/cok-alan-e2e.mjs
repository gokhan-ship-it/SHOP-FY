// Çok alanlı ürün (The Performer: üst panel + alt cep) uçtan uca: alan etiketleri, "Yazının yeri" seçimi, otomatik
// bölme ve bilgi notu, seçili alana sığmama uyarısı ve butonları, blok başına Ayır, sürüklerken alan vurgusu, sepetteki
// tek parça yazı ve konumdaki alan bilgisi. Tek alanlı üründe etiket görünmez.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node cok-alan-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const H = 'the-performer-sirt-cantasi-jantifox-x-le-koko-collectif';
const disa = JSON.parse(readFileSync(kok + 'veri/urunler/alan-paneli-20261012-2325.json', 'utf8'));
const u = disa.urunler.find((x) => x.handle === H);
const ham = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const png = readFileSync(kok + 'veri/urunler/png/' + H + '.png');
const html = ham.replace(/(<script type="application\/json" id="KisiselVeri-main">)([\s\S]*?)(<\/script>)/, (_, a, json, b) => {
  const v = JSON.parse(json);
  v.gorsel = { en: u.png.en, boy: u.png.boy, kucuk: '/canta.png', buyuk: '/canta.png' };
  v.harita = u.harita;
  v.urun.metin_siniri = null;
  return a + JSON.stringify(v) + b;
});
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const hatalar = [];

async function sayfaAc(govde) {
  const baglam = await t.newContext({ ...devices['iPhone 13'] });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/canta.png') return r.fulfill({ contentType: 'image/png', body: png });
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
    if (url.pathname.startsWith('/api/')) return r.fulfill({ contentType: 'application/json', body: '{"data":{}}' });
    return r.fulfill({ contentType: 'text/html', body: govde });
  });
  await s.goto('https://jantifox.test/products/x');
  await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await s.locator('.kp-onizleme .kp-sahne').waitFor();
  return { baglam, s };
}

const O = '.kp-onizleme ';
const { baglam, s } = await sayfaAc(html);
const gruplar = () => s.evaluate((q) => [...document.querySelectorAll(q + '.kp-sahne__parcalar > .kp-parca--letter')].map((x) => x.getAttribute('data-grup')), O);
const hatali = () => s.locator(O + '.kp-parca--hatali').count();
const yaz = async (v) => { await s.locator('#kp-isim').fill(v); await s.waitForTimeout(150); };

// Alanlar ve etiketler
assert.equal(await s.locator(O + '.kp-sahne--cok-alan').count(), 1);
assert.deepEqual(await s.locator(O + '.kp-alan-etiket').allTextContents(), ['Üst panel', 'Alt cep']);
// Yazının yeri: Otomatik + iki alan, varsayılan Otomatik, "Bu çantada 2 alan var"
assert.deepEqual((await s.locator('[data-kp-yazi-yeri]').allTextContents()).map((x) => x.trim()), ['Otomatik', 'Üst panel', 'Alt cep']);
assert.equal(await s.locator('[data-kp-yazi-yeri="oto"]').getAttribute('aria-checked'), 'true');
assert.match(await s.locator('[data-kp-yazi-yeri-kap]').innerText(), /Bu çantada 2 alan var/);

// Kısa isim: tek alanda, not yok
await yaz('ECE');
assert.deepEqual(await gruplar(), ['isim', 'isim', 'isim']);
assert.equal(await s.locator('[data-kp-bolunme-notu]').count(), 0);

// Otomatik bölme: GOKHAN üst panele, CAN alt cebe
await yaz('GOKHANCAN');
assert.deepEqual(await gruplar(), [...Array(6).fill('isim'), ...Array(3).fill('isim2')]);
assert.equal(await hatali(), 0);
assert.equal((await s.locator('[data-kp-bolunme-notu]').innerText()).trim(),
  "'GOKHAN' üst panele, 'CAN' alt cebe yerleşti. Harfleri istediğin alana sürükleyebilirsin.");
// Bloklar gerçekten ilgili alanların içinde
const alanda = () => s.evaluate((q) => {
  const svg = document.querySelector(q + '.kp-sahne__alanlar');
  const ters = svg.getScreenCTM().inverse();
  const alanlar = {};
  svg.querySelectorAll('.kp-alan').forEach((a) => { alanlar[a.getAttribute('data-alan')] = a; });
  return [...document.querySelectorAll(q + '.kp-sahne__parcalar > .kp-parca--letter')].map((el) => {
    const r = el.getBoundingClientRect();
    const p = new DOMPoint(r.x + r.width / 2, r.y + r.height / 2).matrixTransform(ters);
    return Object.keys(alanlar).find((id) => alanlar[id].isPointInFill(p)) || null;
  });
}, O);
assert.deepEqual(await alanda(), [...Array(6).fill('ust-panel'), ...Array(3).fill('alt-cep')]);
// Karakter sınırı tüm alanlar için toplam
assert.match(await s.locator('[data-kp-kapasite]').textContent(), /^9 \/ 16$/);

// Boşluk ipucu: "GOKHAN CANER" boşluktan bölünür
await yaz('GOKHAN CANER');
assert.deepEqual(await gruplar(), [...Array(6).fill('isim'), ...Array(5).fill('isim2')]);
assert.match(await s.locator('[data-kp-bolunme-notu]').innerText(), /'GOKHAN' üst panele, 'CANER' alt cebe/);

// Belirli alan: Alt cep seçili, uzun isim sığmaz → alan kırmızı, uyarı ve iki buton
await yaz('ABDULKADIR');
await s.locator('[data-kp-yazi-yeri="alt-cep"]').click();
await s.waitForTimeout(150);
assert.equal(await s.locator('[data-kp-yazi-yeri="alt-cep"]').getAttribute('aria-checked'), 'true');
assert.deepEqual(await gruplar(), Array(10).fill('isim'));
const uyari = s.locator('[data-kp-alan-tasmasi]');
assert.match(await uyari.innerText(), /ABDULKADIR alt cebe sığmıyor \(en fazla 8 harf\)\./);
assert.equal((await uyari.locator('[data-kp-iki-alana-bol]').innerText()).trim(), 'İki alana böl');
assert.equal(await uyari.locator('[data-kp-alana-tasi]').count(), 0, 'üst panele de sığmıyor: taşı butonu yok');
assert.equal(await s.locator(O + '.kp-alan.kp-alan--hata').count(), 1);
assert.equal(await s.locator(O + '.kp-alan.kp-alan--hata').getAttribute('data-alan'), 'alt-cep');
await uyari.locator('[data-kp-iki-alana-bol]').click();
await s.waitForTimeout(150);
assert.equal(await s.locator('[data-kp-yazi-yeri="oto"]').getAttribute('aria-checked'), 'true');
assert.equal(await hatali(), 0);
assert.equal(await s.locator(O + '.kp-alan--hata').count(), 0);
assert.ok((await gruplar()).includes('isim2'), 'iki alana bölündü');

// Belirli alan seçiliyse yazı yalnızca oraya yerleşir
await yaz('GOKHAN');
await s.locator('[data-kp-yazi-yeri="ust-panel"]').click();
await s.waitForTimeout(150);
assert.deepEqual(await alanda(), Array(6).fill('ust-panel'));
assert.equal(await s.locator('[data-kp-alan-tasmasi]').count(), 0);
await s.locator('[data-kp-yazi-yeri="oto"]').click();
await s.waitForTimeout(150);

// Blok başına Ayır: ikinci bloğun çerçeve butonu yalnızca o bloğu ayırır
await yaz('GOKHANCAN');
await s.locator(O + '[data-uid="isim2-0"], ' + O + '.kp-parca[data-grup="isim2"]').first().click();
await s.waitForTimeout(150);
const cerceve = s.locator(O + '[data-kp-cerceve-harf]');
await cerceve.waitFor({ state: 'visible' });
await cerceve.click();
await s.waitForTimeout(150);
const g2 = await gruplar();
assert.deepEqual(g2.slice(0, 6), Array(6).fill('isim'), 'ilk blok bütün');
assert.deepEqual(g2.slice(6), ['harf-6', 'harf-7', 'harf-8'], 'ikinci blok ayrıldı');
assert.equal(await hatali(), 0);

// Sürükleme: üzerinde olunan alan belirginleşir, harf alanlar arasında taşınır, taşmada yalnızca ilgili alan kırmızı
const cdp = await baglam.newCDPSession(s);
const surukle = async (el, dx, dy, ara) => {
  const b = await el.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }] });
    if (i === 4 && ara) await ara();
  }
  if (ara) await ara(true);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(150);
};
const aktifAlan = () => s.evaluate((q) => [...document.querySelectorAll(q + '.kp-alan--aktif')].map((a) => a.getAttribute('data-alan')), O);
const kirmiziAlan = () => s.evaluate((q) => [...document.querySelectorAll(q + '.kp-alan--hata')].map((a) => a.getAttribute('data-alan')), O);
// Kısa isim alt cepte (en büyük alan); harfler ayrılır, biri boş üst panele taşınır
await yaz('ECE');
await s.locator(O + '.kp-parca[data-grup="isim"]').first().click();
await s.waitForTimeout(150);
await s.locator(O + '[data-kp-cerceve-harf]').click();
await s.waitForTimeout(150);
assert.deepEqual(await gruplar(), ['harf-0', 'harf-1', 'harf-2']);
assert.deepEqual(await alanda(), ['alt-cep', 'alt-cep', 'alt-cep']);
const harf2 = s.locator(O + '.kp-sahne__parcalar > [data-grup="harf-2"]');
const ust = await s.locator(O + '.kp-alan[data-alan="ust-panel"]').boundingBox();
const hb = await harf2.boundingBox();
let gozlem = {};
await surukle(harf2, -6, 4, async (son) => { if (son) gozlem.ilk = await aktifAlan(); });
assert.deepEqual(gozlem.ilk, ['alt-cep'], 'sürüklerken üzerinde olunan alan belirginleşir');
await surukle(harf2, ust.x + ust.width * 0.5 - (hb.x + hb.width / 2), ust.y + ust.height * 0.5 - (hb.y + hb.height / 2), async (son) => { if (son) gozlem.son = await aktifAlan(); });
assert.deepEqual(gozlem.son, ['ust-panel'], 'üst panele gelince o alan belirginleşir');
assert.deepEqual(await aktifAlan(), [], 'bırakınca vurgu kalkar');
assert.equal(await hatali(), 0);
assert.deepEqual(await alanda(), ['alt-cep', 'alt-cep', 'ust-panel'], 'harf alanlar arasında taşındı');
// Konumda harfin alanı
const konum1 = await s.evaluate(() => {
  const k = document.querySelector('kisisel-kart');
  const ic = window.KisiselEditorIc;
  const t = JSON.parse(JSON.stringify(ic.satinAlinacak(k.model, k.editor.t)));
  return ic.tasarimKonumu(k.model, ic.duzenle(k.model, k.yer, t).parcalar, t).p.filter((x) => x.s).map((x) => x.z);
});
assert.deepEqual(konum1, ['alt-cep', 'alt-cep', 'ust-panel']);
// Alt cepteki harfi görselin kenarına sürükle: yalnızca alt cep kırmızı
const h1 = s.locator(O + '.kp-sahne__parcalar > [data-grup="harf-1"]');
const sahne = await s.locator(O + '.kp-sahne').boundingBox();
const b1 = await h1.boundingBox();
await surukle(h1, sahne.x + sahne.width - 6 - (b1.x + b1.width / 2), 0, async (son) => { if (son) gozlem.kirmizi = await kirmiziAlan(); });
assert.deepEqual(gozlem.kirmizi, ['alt-cep'], 'taşmada yalnızca ilgili alan kırmızı');
assert.deepEqual(await kirmiziAlan(), ['alt-cep'], 'bırakınca da işaretli');
await s.locator('[data-kp-yerlestir-balon]').tap();
await s.waitForTimeout(150);
assert.equal(await hatali(), 0);
assert.deepEqual(await kirmiziAlan(), []);

// Sepet: yazı tek parça, konumda alan bilgisi
await s.locator('[data-kp-harf-mod]').click();
await yaz('GOKHANCAN');
assert.deepEqual(await gruplar(), [...Array(6).fill('isim'), ...Array(3).fill('isim2')], 'birleştirince yeniden bölündü');
const sepet = await s.evaluate(() => {
  const k = document.querySelector('kisisel-kart');
  const ic = window.KisiselEditorIc;
  const t = JSON.parse(JSON.stringify(ic.satinAlinacak(k.model, k.editor.t)));
  const konum = ic.tasarimKonumu(k.model, ic.duzenle(k.model, k.yer, t).parcalar, t);
  return { isim: ic.tasarimOzeti(k.model, t), konum };
});
assert.equal(sepet.isim, 'GOKHANCAN');
assert.deepEqual(sepet.konum.p.filter((k) => k.s).map((k) => k.z), [...Array(6).fill('ust-panel'), ...Array(3).fill('alt-cep')]);

// Küçük önizlemeler (özet) tüm alanları gösterir
await s.locator('[data-kp-ileri]').click();
await s.locator('[data-kp-panel="ozet"]').waitFor({ state: 'visible' });
await s.waitForTimeout(200);
const oz = await s.evaluate(() => {
  const g = document.querySelector('[data-kp-oz-gorsel]').getBoundingClientRect();
  const h = [...document.querySelectorAll('[data-kp-oz-gorsel] .kp-parca--letter')].map((x) => x.getBoundingClientRect());
  return { sayi: h.length, icinde: h.every((r) => r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1) };
});
assert.deepEqual(oz, { sayi: 9, icinde: true }, 'özet görseli iki alanı da gösterir');
await baglam.close();

// Tek alanlı ürün: etiket yok, yazı yeri seçimi yok
{
  const { baglam, s } = await sayfaAc(ham);
  assert.equal(await s.locator(O + '.kp-sahne--cok-alan').count(), 0);
  assert.equal(await s.locator(O + '.kp-alan-etiket').count(), 0);
  assert.equal(await s.locator('[data-kp-yazi-yeri]').count(), 0);
  await baglam.close();
}

assert.deepEqual(hatalar, []);
await t.close();
console.log('cok-alan-e2e: tamam');
