// Patch döndürme: seçim, tutamaç, iki parmak, araç çubuğu, klavye, geçersiz açıda geri dönüş, blok isim, sepet konumu.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node dondurme-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const cikti = new URL('ekran/dondurme/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });

const tarayici = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function sayfaAc(cihaz) {
  const baglam = await tarayici.newContext(cihaz);
  const sayfa = await baglam.newPage();
  const hatalar = [];
  sayfa.on('pageerror', (e) => { hatalar.push(e.message); console.log('PAGEERR', e.message); });
  const durum = { eklenen: null };
  await sayfa.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/cart/add.js') {
      durum.eklenen = JSON.parse(r.request().postData());
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    }
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
    return r.fulfill({ contentType: 'text/html', body: html });
  });
  await sayfa.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
  await sayfa.locator('kisisel-kart').waitFor({ state: 'visible' });
  await sayfa.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
  await sayfa.locator('.kp-editor').waitFor({ state: 'visible' });
  await sayfa.waitForTimeout(400);
  return { baglam, sayfa, hatalar, durum };
}

// Parçanın CSS açısı (derece) ve kırmızı (geçersiz) durumu
const parcaDurumu = (sayfa, secici) => sayfa.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const m = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform || '');
  return { aci: m ? +m[1] : 0, hatali: el.classList.contains('kp-parca--hatali') };
}, secici);

const merkezi = (sayfa, secici) => sayfa.evaluate((s) => {
  const r = document.querySelector(s).getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}, secici);

// ---------------- iPhone ----------------
const { baglam, sayfa, hatalar, durum } = await sayfaAc({ ...devices['iPhone 13'] });
const cdp = await baglam.newCDPSession(sayfa);
const dokun = (type, noktalar) => cdp.send('Input.dispatchTouchEvent', {
  type, touchPoints: noktalar.map(([x, y], id) => ({ x: Math.round(x), y: Math.round(y), id, radiusX: 1, radiusY: 1, force: 1 }))
});

// Tutamacı pivot etrafında yay boyunca çevirir; her adımda gözlem fonksiyonunu çağırır
async function tutamacCevir(derece, adim = 18, gozle) {
  const pivot = await sayfa.evaluate(() => {
    const r = document.querySelector('.kp-cerceve').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  const t = await merkezi(sayfa, '[data-kp-tutamac]');
  const r = Math.hypot(t[0] - pivot[0], t[1] - pivot[1]);
  const a0 = Math.atan2(t[1] - pivot[1], t[0] - pivot[0]);
  await dokun('touchStart', [t]);
  const gozlemler = [];
  for (let i = 1; i <= adim; i++) {
    const a = a0 + ((derece * i) / adim) * (Math.PI / 180);
    await dokun('touchMove', [[pivot[0] + r * Math.cos(a), pivot[1] + r * Math.sin(a)]]);
    if (gozle) gozlemler.push(await gozle());
  }
  await dokun('touchEnd', []);
  await sayfa.waitForTimeout(150);
  return gozlemler;
}

// İkon adımı → Diğer kategorisi → Meteor
if (await sayfa.locator('[data-kp-adim="ozet"][aria-current]').count()) await sayfa.locator('[data-kp-adim="tasarim"]').click();
await sayfa.locator('[data-kp-adim="ikon"]').click();
await sayfa.locator('[data-kp-kategori="Diğer"]').click();
await sayfa.locator('[data-kp-ikon="6"]').click();
await sayfa.waitForTimeout(200);
const meteorSecici = '.kp-parca--icon[data-grup^="i"]';
assert.ok(await sayfa.locator(meteorSecici).count(), 'Meteor eklendi');

// 1) Seçim: dokununca çerçeve, tutamaç ve araç çubuğu
assert.equal(await sayfa.locator('[data-kp-secim-cubuk]').isVisible(), false);
const mc = await merkezi(sayfa, meteorSecici);
await dokun('touchStart', [mc]);
await dokun('touchEnd', []);
await sayfa.waitForTimeout(150);
assert.equal(await sayfa.locator('.kp-cerceve').isVisible(), true, 'çerçeve görünür');
assert.equal(await sayfa.locator('[data-kp-tutamac]').isVisible(), true, 'tutamaç görünür');
assert.match(await sayfa.locator('[data-kp-secili-ad]').textContent(), /Meteor/);
const butonBoylari = await sayfa.$$eval('.kp-secim-cubuk__butonlar button', (b) => b.map((x) => [Math.round(x.getBoundingClientRect().width), Math.round(x.getBoundingClientRect().height)]));
console.log('araç çubuğu buton ölçüleri:', JSON.stringify(butonBoylari));
assert.ok(butonBoylari.every(([w, h]) => w >= 44 && h >= 44), 'butonlar en az 44 px');
await sayfa.screenshot({ path: cikti + '01-secili.png' });

// 2) Tutamaçla 178° → 180°'ye yakalanır (aşağı bakar); dönerken açı göstergesi görünür
const gozlem = await tutamacCevir(178, 20, () => sayfa.evaluate(() => {
  const g = document.querySelector('[data-kp-aci]');
  return g.hidden ? null : g.textContent;
}));
console.log('açı göstergesi:', JSON.stringify(gozlem));
assert.ok(gozlem.every(Boolean), 'gösterge dönüş boyunca görünür');
assert.equal(gozlem[gozlem.length - 1], '180°', '178° → 180° yakalandı');
assert.equal((await parcaDurumu(sayfa, meteorSecici)).aci, 180);
assert.equal(await sayfa.locator('[data-kp-aci]').isVisible(), false, 'bırakınca gösterge kalkar');
await sayfa.screenshot({ path: cikti + '02-180.png' });

// 3) Araç çubuğu: 15° sağa / sola
await sayfa.locator('[data-kp-dondur="15"]').tap();
assert.equal((await parcaDurumu(sayfa, meteorSecici)).aci, 195);
await sayfa.locator('[data-kp-dondur="-15"]').tap();
await sayfa.locator('[data-kp-dondur="-15"]').tap();
assert.equal((await parcaDurumu(sayfa, meteorSecici)).aci, 165);
await sayfa.evaluate(() => document.querySelector('kisisel-kart').editor.acisiDegistir(0, 0)); // araç çubuğunda Düzle yok
assert.equal((await parcaDurumu(sayfa, meteorSecici)).aci, 0);

// 4) İki parmakla döndürme: ikinci parmak birincinin etrafında ~60° döner
{
  const c = await merkezi(sayfa, meteorSecici);
  const p1 = [c[0] - 40, c[1]];
  const p2 = [c[0] + 40, c[1]];
  await dokun('touchStart', [p1]);
  await dokun('touchStart', [p1, p2]);
  for (let i = 1; i <= 10; i++) {
    const a = (60 * i / 10) * Math.PI / 180;
    await dokun('touchMove', [p1, [p1[0] + 80 * Math.cos(a), p1[1] + 80 * Math.sin(a)]]);
  }
  await dokun('touchEnd', [p1]);
  await dokun('touchEnd', []);
  await sayfa.waitForTimeout(150);
  const d = await parcaDurumu(sayfa, meteorSecici);
  console.log('iki parmakla açı:', d.aci);
  assert.equal(d.aci, 60);
}
await sayfa.evaluate(() => document.querySelector('kisisel-kart').editor.acisiDegistir(0, 0)); // araç çubuğunda Düzle yok

// 5) Kenar: Meteor'u dairenin sağ kenarına yaklaştır (dikey sığıyor), sonra yatıracak şekilde döndür → kırmızı, bırakınca son geçerli açı
{
  const alan = await sayfa.evaluate(() => {
    const r = document.querySelector('.kp-gorunum ellipse').getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 };
  });
  const c = await merkezi(sayfa, meteorSecici);
  const hedef = [alan.cx + alan.r * 0.66, alan.cy];
  await dokun('touchStart', [c]);
  for (let i = 1; i <= 12; i++) await dokun('touchMove', [[c[0] + (hedef[0] - c[0]) * i / 12, c[1] + (hedef[1] - c[1]) * i / 12]]);
  await dokun('touchEnd', []);
  await sayfa.waitForTimeout(200);
  const once = await parcaDurumu(sayfa, meteorSecici);
  assert.equal(once.hatali, false, 'kenarda dikey hali geçerli');
  const gozlemKenar = await tutamacCevir(80, 16, async () => ({ ...(await parcaDurumu(sayfa, meteorSecici)), cerceve: await sayfa.locator('.kp-cerceve').evaluate((e) => e.classList.contains('kp-cerceve--hatali')) }));
  const kirmizi = gozlemKenar.filter((g) => g.hatali);
  const gecerliler = gozlemKenar.filter((g) => !g.hatali).map((g) => g.aci);
  console.log('kenar gözlem:', JSON.stringify(gozlemKenar.map((g) => [g.aci, g.hatali])));
  console.log('kenarda döndürme: kırmızı adım', kirmizi.length, '/', gozlemKenar.length, '· son geçerli', gecerliler[gecerliler.length - 1]);
  assert.ok(kirmizi.length > 0, 'taşınca kırmızı yandı');
  assert.ok(kirmizi.every((g) => g.cerceve), 'çerçeve de kırmızı');
  // Geri fırlatma yok: bırakıldığı açıda kalır; geçersizse kırmızı ve altta "Alana yerleştir"
  const son = await parcaDurumu(sayfa, meteorSecici);
  const sonGozlem = gozlemKenar[gozlemKenar.length - 1];
  assert.equal(son.aci, sonGozlem.aci, 'bırakıldığı açıda kaldı');
  assert.ok(gecerliler.length > 0, 'başta geçerli açılar da var');
  if (son.hatali) {
    assert.equal(await sayfa.locator('[data-kp-yer-uyari]').isVisible(), true);
    await sayfa.locator('[data-kp-alana-yerlestir]').tap();
    const duz = await parcaDurumu(sayfa, meteorSecici);
    assert.equal(duz.hatali, false, 'Alana yerleştir açıyı koruyarak içeri alır');
    assert.equal(duz.aci, son.aci);
  }
  await sayfa.screenshot({ path: cikti + '03-kenar.png' });
  // Araç çubuğu: açı her zaman uygulanır; geçersizse işaretlenir, Alana yerleştir düzeltir
  const aciOnce = (await parcaDurumu(sayfa, meteorSecici)).aci;
  for (let i = 0; i < 6; i++) await sayfa.locator('[data-kp-dondur="15"]').tap();
  await sayfa.waitForTimeout(300);
  const sonra = await parcaDurumu(sayfa, meteorSecici);
  console.log('araç çubuğu kenarda:', aciOnce, '→', sonra.aci, '· hatalı', sonra.hatali);
  assert.equal(sonra.aci, (aciOnce + 90) % 360);
  if (sonra.hatali) await sayfa.locator('[data-kp-alana-yerlestir]').tap();
  assert.equal((await parcaDurumu(sayfa, meteorSecici)).hatali, false);
}

// 6) Boş alana dokunma seçimi kaldırır
{
  const g = await sayfa.evaluate(() => { const r = document.querySelector('.kp-gorunum').getBoundingClientRect(); return [r.left + 12, r.top + 40]; }); // alt kısımda artık araç çubuğu var
  await dokun('touchStart', [g]);
  await dokun('touchEnd', []);
  await sayfa.waitForTimeout(100);
  assert.equal(await sayfa.locator('[data-kp-secim-cubuk]').isVisible(), false, 'seçim kalktı');
}

// 7) Blok isim bir bütün olarak döner; sepet konumunda açı
if (await sayfa.locator('[data-kp-adim="ozet"][aria-current]').count()) await sayfa.locator('[data-kp-adim="tasarim"]').click();
await sayfa.locator('[data-kp-adim="yazi"]').click();
await sayfa.locator('#kp-isim').fill('ece');
await sayfa.waitForTimeout(200);
{
  const h = await merkezi(sayfa, '.kp-parca--letter[data-grup="isim"]');
  await dokun('touchStart', [h]);
  await dokun('touchEnd', []);
  await sayfa.waitForTimeout(100);
  assert.match(await sayfa.locator('[data-kp-secili-ad]').textContent(), /Yazı \(ECE\)/);
  await sayfa.locator('[data-kp-dondur="-15"]').tap();
  const acilar = await sayfa.$$eval('.kp-parca--letter', (l) => l.map((e) => e.style.transform));
  console.log('blok isim harfleri:', acilar.join(' | '));
  assert.ok(acilar.every((t) => t === 'rotate(345deg)'));
  await sayfa.screenshot({ path: cikti + '04-isim.png' });
}
// Sil: seçili isim silinir
await sayfa.locator('[data-kp-sil]').tap();
assert.equal(await sayfa.locator('#kp-isim').inputValue(), '');
await sayfa.locator('#kp-isim').fill('ece');
// Özet ve sepete ekle
await sayfa.locator('[data-kp-adim="ozet"]').click();
// Yazı Meteor'un üstüne geldiyse Özet'te "Hepsini düzelt"
if (await sayfa.locator('[data-kp-ozet-yer]').isVisible()) await sayfa.locator('[data-kp-ozet-yer] [data-kp-hepsini-duzelt]').click();
await sayfa.locator('[data-kp-ileri]').click();
// Özetteki "Sepete ekle" doğrudan ekler
await sayfa.locator('.kp-editor').waitFor({ state: 'hidden' });
await sayfa.waitForTimeout(800);
const baz = durum.eklenen.items[0].properties;
const konum = JSON.parse(baz._tasarim_konum);
console.log('sepet konumu:', JSON.stringify(konum.p));
assert.equal(konum.v, 2);
assert.ok(konum.p.every((p) => typeof p.a === 'number'));
const meteorKonum = konum.p.find((p) => p.v === 3006);
assert.ok(meteorKonum, 'Meteor konumda');
assert.deepEqual(hatalar, []);
await baglam.close();

// ---------------- Masaüstü: fare ile tutamaç, klavye ----------------
{
  const { baglam: b2, sayfa: s2, hatalar: h2 } = await sayfaAc({ viewport: { width: 1280, height: 860 } });
  await s2.locator('[data-kp-adim="ikon"]').click();
  await s2.locator('[data-kp-kategori="Diğer"]').click();
  await s2.locator('[data-kp-ikon="6"]').click();
  await s2.locator(meteorSecici).click();
  // Klavye: → 1°, Shift+→ 15°, ← 1° geri
  await s2.keyboard.press('ArrowRight');
  await s2.keyboard.press('Shift+ArrowRight');
  await s2.keyboard.press('ArrowRight');
  await s2.keyboard.press('ArrowLeft');
  assert.equal((await parcaDurumu(s2, meteorSecici)).aci, 16);
  // Fare ile tutamaç: 30° daha
  const pivot = await s2.evaluate(() => { const r = document.querySelector('.kp-cerceve').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const t = await merkezi(s2, '[data-kp-tutamac]');
  const r = Math.hypot(t[0] - pivot[0], t[1] - pivot[1]);
  const a0 = Math.atan2(t[1] - pivot[1], t[0] - pivot[0]);
  await s2.mouse.move(t[0], t[1]);
  await s2.mouse.down();
  for (let i = 1; i <= 10; i++) {
    const a = a0 + (30 * i / 10) * Math.PI / 180;
    await s2.mouse.move(pivot[0] + r * Math.cos(a), pivot[1] + r * Math.sin(a));
  }
  await s2.mouse.up();
  const d = await parcaDurumu(s2, meteorSecici);
  console.log('masaüstü fare + klavye açı:', d.aci);
  assert.equal(d.aci, 45); // 16 + 30 = 46 → 45'e yakalanır
  await s2.keyboard.press('Escape');
  assert.equal(await s2.locator('[data-kp-secim-cubuk]').isVisible(), false, 'Esc seçimi kaldırır');
  assert.equal(await s2.locator('.kp-editor').isVisible(), true, 'editör açık kalır');
  await s2.screenshot({ path: cikti + '05-masaustu.png' });
  assert.deepEqual(h2, []);
  await b2.close();
}

await tarayici.close();
console.log('DÖNDÜRME E2E TAMAM');
