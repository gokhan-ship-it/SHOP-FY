// Çok renkli harf seti (Piramit): karakter başına stil, otomatik renk, stil panelinde renk, karıştır,
// harfleri ayır + döndürme, eksik harf uyarıları, sepete doğru renk varyantı ve özet.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node piramit-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const cikti = new URL('ekran/piramit/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const PIRAMIT = '9722983907614';

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const cdp = await baglam.newCDPSession(s);
const dokun = async (nokta) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(nokta[0]), y: Math.round(nokta[1]), id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(150);
};
const merkezi = (q) => s.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, q);
// Karakter kartlarındaki stil ve renk (aria-label: "1. karakter E, Piramit Turkuaz")
const kartlar = () => s.$$eval('[data-kp-karakter]', (k) => k.map((x) => x.getAttribute('aria-label').split(', ')[1]));
const satirRenkleri = async () => (await kartlar()).map((x) => x.split(' ').slice(1).join(' ') || null);
const stilSec = async (i, setId) => {
  if ((await s.locator(`[data-kp-karakter="${i}"]`).getAttribute('aria-pressed')) !== 'true') await s.locator(`[data-kp-karakter="${i}"]`).click();
  await s.locator(`[data-kp-stil="${setId}"]`).click();
};

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('.kp-editor').waitFor({ state: 'visible' });
await s.waitForTimeout(300);

// 1) Yazı Cool ile başlar; karta dokununca stil paneli: Cool / Piramit. Her karakter ayrı stil alabilir.
await s.locator('#kp-isim').fill('ece');
assert.deepEqual(await kartlar(), ['Cool', 'Cool', 'Cool']);
// Düzen: sayaç ve "Ayır" yazı alanının içinde sağda (buton sayacın solunda); açıklama satırı yok; altında stil seçimi
const yer = await s.evaluate(() => {
  const r = (q) => document.querySelector(q).getBoundingClientRect();
  return { girdi: r('#kp-isim'), sayac: r('[data-kp-kapasite]'), ayir: r('[data-kp-harf-mod]'), secim: r('[data-kp-stil-secim]'), pad: parseFloat(getComputedStyle(document.querySelector('#kp-isim')).paddingRight) };
});
const icinde = (x) => x.top >= yer.girdi.top - 1 && x.bottom <= yer.girdi.bottom + 1 && x.right <= yer.girdi.right;
assert.ok(icinde(yer.sayac) && yer.sayac.left > yer.girdi.left + yer.girdi.width / 2, 'sayaç girdinin içinde, sağda');
assert.match(await s.locator('[data-kp-kapasite]').textContent(), /^3 \/ \d+$/);
assert.ok(icinde(yer.ayir) && yer.ayir.right <= yer.sayac.left, 'Ayır girdinin içinde, sayacın solunda');
assert.ok(yer.ayir.height >= 36, 'dokunma alanı en az 36 px: ' + yer.ayir.height);
assert.ok(yer.girdi.right - yer.pad <= yer.ayir.left, 'yazı butonun altına girmez (sağ iç boşluk)');
assert.equal((await s.locator('[data-kp-harf-mod]').innerText()).trim(), 'Ayır');
assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector('[data-kp-harf-mod]')).backgroundColor) !== 'rgb(17, 17, 17)', true, 'birleşikken açık zemin');
assert.equal(await s.locator('[data-kp-harf-mod-not], [data-kp-harf-mod-satir]').count(), 0, 'açıklama satırı yok');
assert.ok(yer.secim.top >= yer.girdi.bottom, 'stil seçimi altında');
// Boş ya da tek karakterde görünmez
await s.locator('#kp-isim').fill('e');
assert.equal(await s.locator('[data-kp-harf-mod]').isVisible(), false, 'tek karakterde yok');
await s.locator('#kp-isim').fill('ece');
assert.equal(await s.locator('[data-kp-stil-panel]').isVisible(), false);
await s.locator('[data-kp-karakter="0"]').click();
assert.equal(await s.locator('.kp-stil__baslik').textContent(), '1. harf E · Stil');
// Üstte üç seçenek: Cool Alfabe (seçili) / Piramit Alfabe / Karışık; harf kartlarında kalem
const stilSecim = () => s.$$eval('[data-kp-stil-secim] button', (b) => b.map((x) => [x.textContent, x.getAttribute('aria-pressed')]));
assert.deepEqual(await stilSecim(), [['Cool Alfabe', 'true'], ['Piramit Alfabe', 'false'], ['Karışık', 'false']]);
assert.equal(await s.locator('.kp-karakter__kalem').count(), 3);
assert.equal(await s.locator('[data-kp-stil]').count(), 2);
assert.equal(await s.locator('.kp-stil__renkler').count(), 0, 'Cool\'da renk yok');
await stilSec(0, PIRAMIT);
assert.equal(await s.locator('#kp-isim').inputValue(), 'ECE', 'yazı korundu');
let k = await kartlar();
console.log('karışık stil:', k.join(' | '));
// Tek harfin stili değişince düğme kendiliğinden "Karışık"; Piramit kartında renk noktası + "Piramit"
assert.deepEqual((await stilSecim()).map((x) => x[1]), ['false', 'false', 'true']);
assert.equal(await s.locator('[data-kp-karakter="0"] .kp-karakter__stil').innerText(), 'Piramit');
assert.equal(await s.locator('[data-kp-karakter="0"] .kp-karakter__nokta').count(), 1);
// Seçili Piramit harfinin rengi tek satırda
assert.equal(await s.locator('.kp-stil__renk-baslik').textContent(), '1. harf E · Piramit rengi');
assert.match(k[0], /^Piramit \S+/, '1. E Piramit ve renkli');
assert.equal(k[1], 'Cool', 'C Cool kaldı (karışık kullanım)');
// Renk noktaları stil panelinde (en az 36 px); E'nin 3 stoktaki rengi
const noktalar = await s.$$eval('.kp-stil__renkler button.kp-nokta', (n) => n.map((x) => [Math.round(x.getBoundingClientRect().width), x.getAttribute('title')]));
assert.equal(noktalar.length, 3);
assert.ok(noktalar.every(([w]) => w >= 36), JSON.stringify(noktalar));
// Son seçilen stil yeni harflerin varsayılanı: ECEL → L Piramit
await s.locator('#kp-isim').fill('ecel');
assert.match((await kartlar())[3], /^Piramit/, 'yeni harf son seçilen stille');
await s.locator('#kp-isim').fill('ece');
await stilSec(1, PIRAMIT);
await stilSec(2, PIRAMIT);
let renkler = await satirRenkleri();
console.log('otomatik renkler:', renkler.join(', '));
assert.ok(renkler.every(Boolean));
await s.screenshot({ path: cikti + '01-stil-paneli.png' });

// 2) Renk seç: 1. E Turkuaz (stokta 1), sonra 3. E Turkuaz → 1. E başka renge geçer, uyarı yok
const gorselOnce = await s.locator('.kp-parca--letter').first().locator('img').getAttribute('src');
await s.locator('[data-kp-karakter="0"]').click();
await s.locator('.kp-stil__renkler button[title="Turkuaz"]').click();
assert.equal((await satirRenkleri())[0], 'Turkuaz');
assert.notEqual(await s.locator('.kp-parca--letter').first().locator('img').getAttribute('src'), gorselOnce, 'önizleme görseli değişti');
await s.locator('[data-kp-karakter="2"]').click();
await s.locator('.kp-stil__renkler button[title="Turkuaz"]').click();
renkler = await satirRenkleri();
console.log('3. E Turkuaz seçilince:', renkler.join(', '));
assert.equal(renkler[2], 'Turkuaz');
assert.notEqual(renkler[0], 'Turkuaz', 'stok 1: ilk E başka renge geçti');
assert.equal(await s.locator('[data-kp-isim-uyari] .kp-uyari--hata').count(), 0, 'stok uyarısı yok');

// 3) Renkleri karıştır: geçerli dağılım (değişene kadar birkaç kez)
const once = (await satirRenkleri()).join();
let sonra = once;
for (let i = 0; i < 8 && sonra === once; i++) {
  await s.locator('[data-kp-karistir]').click();
  sonra = (await satirRenkleri()).join();
}
console.log('karıştır:', once, '→', sonra);
assert.notEqual(sonra, once);
assert.ok(sonra.split(',').filter((r) => r === 'Turkuaz').length <= 1);

// 4) Önizlemede C'ye dokun → C'nin stil paneli açılır, blok bozulmaz; balon yok
await dokun(await merkezi('[data-uid="isim-1"]'));
assert.match(await s.locator('[data-kp-secili-ad]').textContent(), /Yazı \(ECE\)/, 'blok seçili (harf ayrılmadı)');
assert.equal(await s.locator('.kp-stil__baslik').textContent(), '2. harf C · Stil');
assert.equal(await s.locator('.kp-parca[data-grup="isim"]').count(), 3, 'harfler hâlâ blokta');
assert.equal(await s.locator('[data-kp-balon]').isVisible(), false);
// Araç çubuğundan döndür: blok 15° döner
await s.locator('[data-kp-dondur="15"]').click();
const blokAci = await s.$$eval('.kp-parca--letter', (l) => l.map((e) => e.style.transform));
assert.ok(blokAci.every((x) => x === 'rotate(15deg)'), blokAci.join());
await s.locator('[data-kp-dondur="-15"]').click();

// 5) Harfleri ayır: tek harf seçilir; döndürme yalnızca o harfi döndürür
await s.locator('[data-kp-harf-mod]').click();
// İlk ayırmada bir kez kısa bilgi; buton "Birleştir" ve koyu zemin
assert.equal(await s.locator('[data-kp-bildirim]').innerText(), 'Harfler ayrıldı, her birini tek tek taşıyabilirsin.');
assert.equal((await s.locator('[data-kp-harf-mod]').innerText()).trim(), 'Birleştir');
assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector('[data-kp-harf-mod]')).backgroundColor), 'rgb(17, 17, 17)', 'ayrıyken koyu');
assert.equal(await s.evaluate(() => localStorage.getItem('kp-harf-ayir-bilgi')), '1', 'bir kez gösterilir');
// Son E'yi komşusundan uzaklaştır (aşağı sürükle), sonra seç
{
  // Dairenin alt-ortasındaki boş alana: döndürülünce de sığacak bir yer
  const c = await merkezi('[data-uid="harf-2"]');
  const z = await s.evaluate(() => { const r = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.height / 2]; });
  const hedef = [z[0], z[1] + z[2] * 0.55];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(c[0]), y: Math.round(c[1]), id: 0 }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(c[0] + (hedef[0] - c[0]) * i / 8), y: Math.round(c[1] + (hedef[1] - c[1]) * i / 8), id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(200);
}
await dokun(await merkezi('[data-uid="harf-2"]'));
assert.match(await s.locator('[data-kp-secili-ad]').textContent(), /E harfi/);
assert.equal(await s.locator('.kp-stil__baslik').textContent(), '3. harf E · Stil');
await s.locator('[data-kp-dondur="15"]').click();
await s.waitForTimeout(700); // geçersiz açıda kırmızı önizleme 600 ms sürer; son durum
assert.equal(await s.locator('.kp-parca--hatali').count(), 0);
assert.equal(await s.locator('[data-kp-aci]').isVisible(), false, 'açı göstergesi kapandı');
const ayri = await s.$$eval('.kp-parca--letter', (l) => l.map((e) => e.style.transform || 'yok'));
console.log('ayrı modda açılar:', ayri.join(' | '));
assert.deepEqual(ayri, ['yok', 'yok', 'rotate(15deg)']);
await s.screenshot({ path: cikti + '03-ayri.png' });
await s.locator('[data-kp-harf-mod]').click();

// 6) Eksik harf: Ö (öneri O), K (tüm renkleri tükenmiş → yok)
await s.locator('#kp-isim').fill('ökr');
await s.waitForTimeout(150);
const uyarilar = (await s.locator('[data-kp-isim-uyari]').innerText()).replace(/\s+/g, ' ');
console.log('uyarılar:', uyarilar);
assert.match(uyarilar, /Ö harfi şu an yok, O olarak yazmak ister misin/);
assert.match(uyarilar, /K harfi bu stilde şu an yok/);
await s.screenshot({ path: cikti + '04-eksik.png' });

// 7) Sepet: her harf seçilen renk varyantıyla, özet renkli
await s.locator('#kp-isim').fill('ece');
await s.waitForTimeout(150);
const secilenler = await satirRenkleri();
await s.locator('[data-kp-ileri]').click();
await s.locator('[data-kp-ileri]').click();
await s.locator('.kp-editor').waitFor({ state: 'hidden' });
await s.waitForTimeout(800);
const baz = eklenen.items[0].properties;
console.log('Tasarım özeti:', baz['Tasarım']);
const beklenenOzet = 'ECE (' + ['E', 'C', 'E'].map((h, i) => secilenler[i] + ' ' + h).join(', ') + ')';
assert.equal(baz['Tasarım'], beklenenOzet);
const harfKalemleri = eklenen.items.filter((k) => k.properties['Harf sırası']);
console.log('harf kalemleri:', JSON.stringify(harfKalemleri.map((k) => [k.id, k.quantity, k.properties['Harf sırası']])));
const veri = await s.evaluate(() => JSON.parse(document.querySelector('#KisiselVeri-main').textContent).setler[1].varyantlar.map((v) => [v.id, v.baslik]));
const ad = Object.fromEntries(veri);
const kalemAdlari = harfKalemleri.flatMap((k) => k.properties['Harf sırası'].split(', ').map((sira) => [+sira, ad[k.id]])).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
assert.deepEqual(kalemAdlari, ['E', 'C', 'E'].map((h, i) => secilenler[i] + ' ' + h), 'her harf seçilen renk varyantı');
assert.deepEqual(hatalar, []);
await t.close();
console.log('PİRAMİT E2E TAMAM');
