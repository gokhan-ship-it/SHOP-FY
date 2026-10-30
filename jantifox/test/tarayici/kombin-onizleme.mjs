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
// Bizim öğelerimizde eski yazım (metin, aria-label, title, alt) kalmadı mı; bulunanları döndürür
const isortAra = (seciciler) => s.evaluate((l) => {
  const R = /i\u015f\u00f6rt|\u0130\u015e\u00d6RT/;
  const bulunan = [];
  for (const q of l) document.querySelectorAll(q).forEach((e) => {
    if (R.test(e.textContent)) bulunan.push(q + ': ' + e.textContent.replace(/\s+/g, ' ').match(/.{0,30}(i\u015f\u00f6rt|\u0130\u015e\u00d6RT).{0,20}/)[0]);
    e.querySelectorAll('*').forEach((x) => ['aria-label', 'title', 'alt', 'placeholder'].forEach((a) => { const v = x.getAttribute(a); if (v && R.test(v)) bulunan.push(q + ' [' + a + ']: ' + v); }));
  });
  return bulunan;
}, seciciler);
sonuc.isort = {};

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
assert.match(sonuc.anaSayfa.metin, /Sweatshirt'ünü tasarla, Tshirt bizden/);
assert.match(sonuc.anaSayfa.metin, /4\.000 TL 6\.000 TL/);
assert.ok(sonuc.anaSayfa.arada, 'kutu Çok satanlar\'ın hemen üstünde');
sonuc.isort.anaSayfa = await isortAra(['.kp-kk-bolum']);

// 2) Kendin Tasarla: ilk kart vitrin, "Tshirt hediye"
await git('/collections/kendin-tasarla');
sonuc.kendinTasarla = await s.evaluate(() => {
  const li = document.querySelector('#product-grid > li');
  return li && { kombin: li.hasAttribute('data-kp-kombin-kart'), metin: li.innerText.replace(/\s+/g, ' ').trim().slice(0, 160), gorunur: li.offsetParent !== null };
});
assert.ok(sonuc.kendinTasarla && sonuc.kendinTasarla.kombin, 'ilk kart kombin');
assert.match(sonuc.kendinTasarla.metin, /Tshirt hediye/);
sonuc.isort.kendinTasarla = await isortAra(['[data-kp-kombin-kart]']);

// 3) Vitrin sayfası ve editör (kombin modu)
await git('/products/sweatshirt-kombini');
sonuc.vitrin = { baslik: await yazi('.kp-kv__baslik'), fiyat: await yazi('.kp-kv__fiyat'), kart: await yazi('[data-kisisel-davet] [data-kisisel-ac]') };
const veri = await s.evaluate(() => {
  const el = document.querySelector('script[id^="KisiselKombin-"]');
  const j = el && JSON.parse(el.textContent);
  return j && { fiyat: j.fiyat, dahil: j.dahil, kod: j.kod, sweat: j.sweatshirtler.map((x) => x.baslik + ':' + x.varyantlar.map((v) => v.baslik).join('/')), tisort: j.tisortler.map((x) => x.baslik + ':' + x.varyantlar.filter((v) => v.satilabilir).map((v) => v.baslik).join('/')) };
});
sonuc.kombinVerisi = veri;
sonuc.isort.vitrin = await isortAra(['.kp-kv', 'title', 'meta[property="og:title"]']);
sonuc.isort.vitrinMeta = await s.evaluate(() => [document.title, (document.querySelector('meta[property="og:title"]') || {}).content, (document.querySelector('meta[name="description"]') || {}).content]);
sonuc.isort.veri = /i\u015f\u00f6rt|\u0130\u015e\u00d6RT/.test(await s.evaluate(() => document.querySelector('script[id^="KisiselKombin-"]').textContent));
assert.equal(veri.fiyat, 400000);
assert.equal(veri.dahil, 4);
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
sonuc.isort.editorSecim = await isortAra(['.kp-editor']);
assert.ok(sonuc.editor.kapaklarSade && sonuc.editor.onizlemeSweatSade, 'sade görseller');
const olayIstegi = [];
// Seçim sırasında Meta / GA4'e giden istekler (olması gerekmez). /api/collect sitenin tarayıcı sinyali betiği (olay değil), ayrı sayılır
const sinyal = [];
s.on('request', (r) => {
  if (/facebook\.com\/tr|google-analytics|analytics\.google|googletagmanager\.com\/g\/collect/.test(r.url())) olayIstegi.push(r.url().slice(0, 160));
  else if (/\/api\/collect/.test(r.url())) sinyal.push((r.postData() || '').slice(0, 200));
});
// Sweatshirt yaşı → hediye bloğuna kayar ve parlar, "Harika!"; Tshirt yaşı sweatshirt'ünkü
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
await s.locator('[data-kp-panel="ikon"]:not([hidden]) [data-kp-hazir-set]').first().waitFor({ timeout: 15000 });
await s.waitForTimeout(600);
sonuc.editor.tasarimOnizleme = await kutu('.kp-editor .kp-onizleme__ic');
sonuc.editor.tasarimGorunur = { adim: await s.evaluate(() => document.querySelector('kisisel-kart').editor.adim), araclar: await s.locator('.kp-editor .kp-araclar').isVisible(), dahil: await s.locator('[data-kp-dahil]').isVisible(), kombinOnizleme: await s.locator('[data-kp-kombin-onizleme]').isVisible(), sahneGorseli: await s.locator('.kp-editor .kp-onizleme .kp-sahne__urun').evaluate((e) => !!e.currentSrc && e.naturalWidth > 0) };
sonuc.editor.ilkBildirim = await yazi('.kp-editor [data-kp-bildirim]');
sonuc.isort.editorTasarim = await isortAra(['.kp-editor']);
sonuc.editor.tisortSatiri = await yazi('[data-kp-dahil] .kp-dahil__tisort-ad');
sonuc.editor.altEtiket = await yazi('.kp-alt__fiyat > span');
sonuc.editor.gosterge = { baslik: await yazi('[data-kp-dahil] .kp-dahil__baslik'), alt: await yazi('[data-kp-dahil] .kp-dahil__alt'), yuva: await s.locator('[data-kp-dahil] .kp-dahil__yuva').count(), toplam: await yazi('[data-kp-toplam]') };
// Görsel paneli: en üstte "Patch seti seç · 4 patch dahil", kombinde görünen setler, altında tekliler
sonuc.editor.gorselPaneli = {
  ilkBolum: await yazi('[data-kp-panel="ikon"] .kp-gorsel-bolum__ad'),
  ayrac: await yazi('[data-kp-panel="ikon"] .kp-gorsel-ayrac'),
  ust: await yazi('[data-kp-ikon-fiyat]'),
  setKarti: await s.locator('[data-kp-hazir-set]').first().evaluate((e) => getComputedStyle(e, '::after').content),
  tekliKart: await s.locator('[data-kp-panel="ikon"] [data-kp-ikon]:not([disabled])').first().evaluate((e) => getComputedStyle(e, '::after').content),
  setler: await s.evaluate(() => document.querySelector('kisisel-kart').editor.m.hazirSetler.map((x) => x.ad + ' (' + x.patchler.length + ', ' + x.fiyat / 100 + ' TL)'))
};
// Her 4'lü set Bej / İndigo sweatshirt'ün boş alanına (22 cm daire) sığıyor mu: editörün kendi set yerleştirmesiyle
sonuc.setSigma = await s.evaluate(() => {
  const ed = document.querySelector('kisisel-kart').editor;
  const sonuc = {};
  const olc = (renk) => ed.m.hazirSetler.forEach((st) => {
    const k = ed.setYerlestir(st, []);
    const sigmayan = st.patchler.filter((p, i) => !k[i]).map((p) => p.ad);
    (sonuc[st.ad] = sonuc[st.ad] || {})[renk] = sigmayan.length ? sigmayan.length + ' kenarda (' + sigmayan.join(', ') + ')' : 'sığıyor';
  });
  const once = { s: ed.t.kombin.s, v: ed.t.kombin.v };
  ed.kombin.sweatshirtler.forEach((sw) => { ed.kombinRenkSec(sw.id); olc(sw.renk); });
  // Seçim eski hâline (renk ve yaş)
  ed.kombinRenkSec(once.s);
  ed.kombinYasSec(once.v);
  ed.bildirimKapat();
  return sonuc;
});
// Set seç: dört yuva, set adı, 4.000; Shopify sonucu gelince "Sıradaki patch +500 TL", kartlarda ek ücret
await s.locator('[data-kp-hazir-set]').first().click();
await s.waitForFunction(() => /Sıradaki patch \+/.test((document.querySelector('[data-kp-dahil]') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
await s.waitForTimeout(2500);
sonuc.editor.setli = {
  gosterge: await yazi('[data-kp-dahil] .kp-dahil__metin'), yuva: await s.locator('[data-kp-dahil] .kp-dahil__yuva--dolu').count(), toplam: await yazi('[data-kp-toplam]'),
  kenar: await s.locator('.kp-editor [data-kp-kenar]:not([hidden])').count() ? await yazi('.kp-editor [data-kp-kenar]') : null,
  setKarti: await s.locator('[data-kp-hazir-set]').first().evaluate((e) => getComputedStyle(e, '::after').content),
  tekliKart: await s.locator('[data-kp-panel="ikon"] [data-kp-ikon]:not([disabled])').first().evaluate((e) => getComputedStyle(e, '::after').content)
};
// Ekstra tekli patch: 4.500 (Shopify), sonra geri al
const tekliId = await s.evaluate(() => { const ed = document.querySelector('kisisel-kart').editor; const kullanilan = ed.t.parcalar.map((p) => String(p.urunId)); const i = ed.m.ikonlar.filter((x) => x.varyant.satilabilir && (x.varyant.stok == null || x.varyant.stok > 5) && kullanilan.indexOf(String(x.id)) === -1)[0]; return i && String(i.id); });
await s.locator('[data-kp-panel="ikon"] [data-kp-ikon="' + tekliId + '"]').first().click();
await s.waitForFunction(() => /4\.500 TL/.test((document.querySelector('[data-kp-toplam]') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
await s.waitForTimeout(2000);
sonuc.editor.setArtiTekli = { toplam: await yazi('[data-kp-toplam]'), gosterge: await yazi('[data-kp-dahil] .kp-dahil__metin') };
await s.locator('[data-kp-geri-al]').click();
await s.waitForFunction(() => /6\.000 TL ?4\.000 TL/.test((document.querySelector('[data-kp-toplam]') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
sonuc.editor.geriAlinca = await yazi('[data-kp-toplam]');
await s.locator('[data-kp-ileri]').click();
await s.locator('.kp-kombin-ozet-tisort').waitFor({ timeout: 8000 });
await s.waitForTimeout(1500);
sonuc.ozet = { tisort: await yazi('.kp-kombin-ozet-tisort'), hediye: await yazi('.kp-ozet__hediye'), toplam: await yazi('.kp-ozet tfoot'), adet: await yazi('[data-kp-oz-adet]'), kenarSorusu: await s.locator('[data-kp-kenar-kart]').count(), buton: await yazi('[data-kp-ileri]') };
sonuc.isort.editorOzet = await isortAra(['.kp-editor']);
sonuc.kampanyalarKarti = MOBIL ? null : await s.locator('[data-kp-kkart-liste]').first().textContent().catch(() => null);
sonuc.hatalar = hatalar;
console.log(JSON.stringify(sonuc, null, 1));
await t.close();
