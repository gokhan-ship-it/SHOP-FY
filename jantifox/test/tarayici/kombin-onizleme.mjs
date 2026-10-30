// Kombin kopyasının gerçek önizlemesi (preview_theme_id): ana sayfa kutusu, Kendin Tasarla ilk kartı, vitrin sayfası ve
// editörün kombin modu (v4: Kombinini seç ekranında kombin önizlemesi, 3 adım, yol gösteren ana buton; sepete eklemeden).
// Meta / GA4 / Shopify olay istekleri kesilir; ekran görüntüsü alınmaz.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node kombin-onizleme.mjs [tema] [mobil|masaustu]
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const TEMA = process.argv[2] || '207699345694';
const MOBIL = (process.argv[3] || 'mobil') === 'mobil';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext(MOBIL ? { ...devices['iPhone 13'], locale: 'tr-TR' } : { viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
await c.route(/facebook\.com\/tr|connect\.facebook|google-analytics|analytics\.google|googletagmanager|monorail|produce_batch|\/api\/collect|doubleclick/, (r) => r.fulfill({ status: 204, body: '' }));
const s = await c.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
const git = async (yol) => {
  await s.goto('https://jantifox.com' + yol + (yol.includes('?') ? '&' : '?') + 'preview_theme_id=' + TEMA, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await s.waitForTimeout(2500);
  // Shopify'ın önizleme çubuğu (yalnızca önizlemede) alt çubuğun üstüne biner
  await s.addStyleTag({ content: '#PBarNextFrameWrapper, #preview-bar-iframe { display: none !important; }' });
};
const yazi = async (q) => ((await s.locator(q).first().textContent({ timeout: 8000 })) || '').replace(/\s+/g, ' ').trim();
const sonuc = {};

// 1) Ana sayfa: kutu Çok satanlar'ın hemen üstünde
await git('/');
sonuc.anaSayfa = await s.evaluate(() => {
  const k = document.querySelector('.kp-kk');
  const cs = document.querySelector('[data-kp-cs]');
  return k && {
    metin: k.innerText.replace(/\s+/g, ' ').trim(),
    link: k.getAttribute('href'),
    ustunde: !!cs && !!(k.compareDocumentPosition(cs) & Node.DOCUMENT_POSITION_FOLLOWING),
    // Arada yalnızca stil / bağlantı etiketleri olabilir
    arada: (() => { let n = k.closest('.kp-kk-bolum').nextElementSibling; while (n && n.matches('style, link, script')) n = n.nextElementSibling; return !!n && n.matches('[data-kp-cs]'); })()
  };
});
assert.ok(sonuc.anaSayfa, 'ana sayfa kutusu');
assert.match(sonuc.anaSayfa.metin, /Sweatshirt'ünü tasarla, tişört bizden/);
assert.match(sonuc.anaSayfa.metin, /3\.400 TL 5\.400 TL/);
assert.ok(sonuc.anaSayfa.arada, 'kutu Çok satanlar\'ın hemen üstünde');

// 2) Kendin Tasarla: ilk kart vitrin, "Tişört hediye"
await git('/collections/kendin-tasarla');
sonuc.kendinTasarla = await s.evaluate(() => {
  const li = document.querySelector('#product-grid > li');
  return li && { kombin: li.hasAttribute('data-kp-kombin-kart'), metin: li.innerText.replace(/\s+/g, ' ').trim().slice(0, 160), gorunur: li.offsetParent !== null };
});
assert.ok(sonuc.kendinTasarla && sonuc.kendinTasarla.kombin, 'ilk kart kombin');
assert.match(sonuc.kendinTasarla.metin, /Tişört hediye/);

// 3) Vitrin sayfası ve editör (kombin modu)
await git('/products/sweatshirt-kombini');
sonuc.vitrin = { baslik: await yazi('.kp-kv__baslik'), fiyat: await yazi('.kp-kv__fiyat'), kart: await yazi('[data-kisisel-davet] [data-kisisel-ac]') };
const veri = await s.evaluate(() => {
  const el = document.querySelector('script[id^="KisiselKombin-"]');
  const j = el && JSON.parse(el.textContent);
  return j && { fiyat: j.fiyat, dahil: j.dahil, kod: j.kod, sweat: j.sweatshirtler.map((x) => x.baslik + ':' + x.varyantlar.map((v) => v.baslik).join('/')), tisort: j.tisortler.map((x) => x.baslik + ':' + x.varyantlar.filter((v) => v.satilabilir).map((v) => v.baslik).join('/')) };
});
sonuc.kombinVerisi = veri;
assert.equal(veri.fiyat, 340000);
assert.equal(veri.sweat.length, 5);
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('[data-kp-panel="sweat"]:not([hidden]) .kp-kombin-renk').first().waitFor({ timeout: 15000 });
await s.waitForTimeout(800);
// Kombinini seç (v4): kombin önizlemesi + 3 adım, sıkı bloklar, yol gösteren ana buton
const kutu = (q) => s.locator(q).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { ust: Math.round(r.top), alt: Math.round(r.bottom), yuk: Math.round(r.height), gen: Math.round(r.width) }; });
const dugmeStili = () => s.locator('[data-kp-ileri]').evaluate((e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.color, c.borderTopColor, c.borderTopWidth, getComputedStyle(e, '::before').display, getComputedStyle(e, '::after').display].join(' | '); });
const adimlar = () => s.$$eval('[data-kp-kombin-adimlar] .kp-kombin-adim', (l) => l.map((x) => x.className.replace(/kp-kombin-adim--/g, '').replace('kp-kombin-adim', '').trim() + ':' + x.querySelector('.kp-kombin-adim__no').textContent));
const sade = (src) => /kisisel-urun-/.test(src || '');
sonuc.editor = {
  baslik: await yazi('#kp-p-sweat'),
  altBaslik: await yazi('[data-kp-panel="sweat"] .kp-kombin-aciklama'),
  bloklar: await s.$$eval('[data-kp-panel="sweat"] .kp-kombin-blok__baslik', (l) => l.map((x) => x.textContent)),
  sweatSecim: await yazi('[data-kp-kombin-blok="sweat"] .kp-kombin-blok__secim'),
  tisortFiyat: await yazi('[data-kp-kombin-blok="tisort"] .kp-kombin-tisort__fiyat'),
  renkler: await s.$$eval('[data-kp-kombin-renk]', (l) => l.map((x) => x.title + (x.textContent.trim() ? ' [' + x.textContent.trim() + ']' : ''))),
  tisortRenkleri: await s.$$eval('[data-kp-tisort-renk]', (l) => l.map((x) => x.title + (x.querySelector('img') ? ' (görsel)' : ''))),
  kapaklarSade: await s.$$eval('[data-kp-panel="sweat"] .kp-kombin-renk img', (l) => l.every((x) => /kisisel-urun-/.test(x.src))),
  renkKutusu: await kutu('[data-kp-kombin-renk]'),
  yaslarKirmizi: await s.locator('[data-kp-kombin-yas].kp-kombin-yas--gerekli').count(),
  tisortSoluk: /--soluk/.test(await s.locator('[data-kp-kombin-blok="tisort"]').getAttribute('class')),
  onizleme: await kutu('[data-kp-kombin-onizleme]'),
  onizlemeSweatSade: sade(await s.locator('.kp-kombin-onizleme__sweat img').getAttribute('src')),
  bosYer: await yazi('[data-kp-kombin-onizleme] .kp-kombin-yuva'),
  hediyeEtiketi: await yazi('[data-kp-kombin-onizleme] .kp-kombin-hediye'),
  adimlar: await adimlar(),
  gizli: { araclar: !(await s.locator('.kp-editor .kp-araclar').isVisible()), dahil: !(await s.locator('[data-kp-dahil]').isVisible()), sahne: !(await s.locator('.kp-editor [data-kp-sahne]').isVisible()), dugme: await s.locator('[data-kp-kombin-gorunum]').count() === 0 },
  anaButon: await yazi('[data-kp-ileri]'),
  anaButonStili: await dugmeStili(),
  fiyat: await yazi('[data-kp-toplam]'),
  bloklarEkranda: await s.evaluate(() => {
    const alt = document.querySelector('.kp-editor .kp-alt').getBoundingClientRect();
    const b = document.querySelector('[data-kp-kombin-blok="tisort"]').getBoundingClientRect();
    return { tisortAlti: Math.round(b.bottom), altCubukUstu: Math.round(alt.top), ekran: window.innerHeight, sigiyor: b.bottom <= alt.top + 1 };
  })
};
assert.equal(sonuc.editor.anaButon, 'Yaşını seç ↓');
assert.ok(sonuc.editor.kapaklarSade && sonuc.editor.onizlemeSweatSade, 'sade görseller');
const olayIstegi = [];
// Seçim sırasında Meta / GA4'e giden istekler (olması gerekmez). /api/collect sitenin tarayıcı sinyali betiği (olay değil), ayrı sayılır
const sinyal = [];
s.on('request', (r) => {
  if (/facebook\.com\/tr|google-analytics|analytics\.google|googletagmanager\.com\/g\/collect/.test(r.url())) olayIstegi.push(r.url().slice(0, 160));
  else if (/\/api\/collect/.test(r.url())) sinyal.push((r.postData() || '').slice(0, 200));
});
// Sweatshirt yaşı → hediye bloğuna kayar ve parlar, "Harika!"; tişört yaşı sweatshirt'ünkü
await s.locator('.kp-kombin-yas[data-kp-kombin-yas]').first().click();
await s.waitForTimeout(250);
sonuc.editor.yasSonrasi = {
  parla: /kp-kombin-blok--parla/.test(await s.locator('[data-kp-kombin-blok="tisort"]').getAttribute('class')),
  bildirim: await yazi('.kp-editor [data-kp-bildirim]'),
  tisortYasi: await yazi('[data-kp-tisort-yas].kp-kombin-yas--secili'),
  bosYer: await yazi('[data-kp-kombin-onizleme] .kp-kombin-yuva'),
  adimlar: await adimlar(),
  anaButon: await yazi('[data-kp-ileri]')
};
await s.waitForTimeout(700);
sonuc.editor.yasSonrasi.hediyeBlogu = await kutu('[data-kp-kombin-blok="tisort"]');
sonuc.editor.yasSonrasi.altCubukUstu = (await kutu('.kp-editor .kp-alt')).ust;
await s.locator('[data-kp-tisort-renk]').first().click();
await s.waitForTimeout(300);
sonuc.editor.tisortSonrasi = {
  onizlemeSade: sade(await s.locator('.kp-kombin-onizleme__tisort img').getAttribute('src')),
  buyutecler: await s.$$eval('[data-kp-kombin-onizleme] [data-kp-galeri-ac]', (l) => l.map((x) => x.getAttribute('data-kp-galeri-ac').charAt(0))),
  adimlar: await adimlar(),
  not: await yazi('[data-kp-kombin-blok="tisort"] .kp-kombin-not'),
  anaButon: await yazi('[data-kp-ileri]'),
  anaButonStili: await dugmeStili()
};
await s.locator('[data-kp-kombin-onizleme] [data-kp-galeri-ac^="t:"]').click();
await s.locator('[data-kp-kombin-galeri]').waitFor();
sonuc.editor.galeri = { ad: await yazi('[data-kp-galeri-ad]'), kare: await s.locator('.kp-kombin-galeri__kare').count(), not: await s.locator('.kp-kombin-galeri__kare figcaption').count(), sayac: await yazi('[data-kp-galeri-sayac]') };
await s.locator('[data-kp-galeri-kapat]').click();
sonuc.editor.secimOlayIstegi = olayIstegi.slice();
sonuc.editor.tarayiciSinyali = sinyal.length;
await s.locator('[data-kp-ileri]').click();
await s.locator('#kp-isim').waitFor();
await s.waitForTimeout(600);
sonuc.editor.tasarimOnizleme = await kutu('.kp-editor .kp-onizleme__ic');
sonuc.editor.tasarimGorunur = { araclar: await s.locator('.kp-editor .kp-araclar').isVisible(), dahil: await s.locator('[data-kp-dahil]').isVisible(), kombinOnizleme: await s.locator('[data-kp-kombin-onizleme]').isVisible(), sahneGorseli: await s.locator('.kp-editor .kp-onizleme .kp-sahne__urun').evaluate((e) => !!e.currentSrc && e.naturalWidth > 0) };
sonuc.editor.ilkBildirim = await yazi('.kp-editor [data-kp-bildirim]');
sonuc.editor.tisortSatiri = await yazi('[data-kp-dahil] .kp-dahil__tisort-ad');
sonuc.editor.yaziNotu = await yazi('.kp-kombin-not--yazi');
sonuc.editor.altEtiket = await yazi('.kp-alt__fiyat > span');
await s.locator('#kp-isim').fill('AB');
await s.waitForFunction(() => /Sıradaki patch \+/.test((document.querySelector('[data-kp-dahil]') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
sonuc.editor.ikiPatch = { gosterge: await yazi('[data-kp-dahil] .kp-dahil__metin'), yuvalar: await s.locator('[data-kp-dahil] .kp-dahil__yuva--dolu img').count(), toplam: await yazi('[data-kp-toplam]') };
await s.locator('[data-kp-adim="ikon"]').click();
await s.locator('[data-kp-ikon]:not([disabled])').first().waitFor();
sonuc.editor.gorselPaneli = { ust: await yazi('[data-kp-ikon-fiyat]'), kart: await s.locator('[data-kp-ikon]:not([disabled])').first().evaluate((e) => getComputedStyle(e, '::after').content) };
await s.locator('[data-kp-ikon]:not([disabled])').first().click();
await s.waitForFunction(() => /3\.700 TL/.test((document.querySelector('[data-kp-toplam]') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
sonuc.editor.ucPatch = { gosterge: await yazi('[data-kp-dahil] .kp-dahil__metin'), toplam: await yazi('[data-kp-toplam]') };
await s.locator('[data-kp-ileri]').click();
await s.locator('.kp-kombin-ozet-tisort').waitFor({ timeout: 8000 });
sonuc.ozet = { tisort: await yazi('.kp-kombin-ozet-tisort'), hediye: await yazi('.kp-ozet__hediye'), buton: await yazi('[data-kp-ileri]') };
sonuc.hatalar = hatalar;
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
