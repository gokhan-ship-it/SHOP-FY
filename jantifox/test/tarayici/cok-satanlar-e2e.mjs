// Ana sayfa "Çok satanlar" bölümü: seçilen sırayla kartlar, kategori sayfasıyla aynı kart bileşeni (kişiselleştirmesi
// kapalı şapka normal kart), filtre düğmeleri (boş tip gizli, sayfa yenilenmez), oklar, mobilde noktalar ve
// örnek tasarım (editörün çizim motoruyla, önbellekli; fotoğraf varsa fotoğraf; çizilemezse normal görsel).
// Sayfa, sections/kisisel-cok-satanlar.liquid'in ürettiği yapının aynısıdır; veri gerçek spor çanta verisidir.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node cok-satanlar-e2e.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const oku = (p) => readFileSync(kok + p, 'utf8');
const kkJs = oku('assets/kisisel-koleksiyon.js');
const kkCss = oku('assets/kisisel-koleksiyon.css');
const csJs = oku('assets/kisisel-cok-satanlar.js');
const csCss = oku('assets/kisisel-cok-satanlar.css');
const editorJs = oku('assets/kisisel-editor.js');
const png = readFileSync(kok + 'veri/aksesuar/duz/kalem-kutusu-sari-on.png');
const spor = JSON.parse(oku('test/kisisel-veri-spor.json'));

const URUNLER = [
  ['mavi-beyaz-cizgili-spor-canta', 'Mavi Beyaz Çizgili Spor Çanta', 'canta', true],
  ['pembe-kirmizi-cizgili-spor-canta', 'Pembe Kırmızı Çizgili Spor Çanta', 'canta', true],
  ['the-artist', 'The Artist Sırt Çantası', 'canta', true],
  ['the-performer', 'The Performer Sırt Çantası', 'canta', true],
  ['the-adventurer', 'The Adventurer Mini Sırt Çantası', 'canta', true],
  ['pudra-pembe-tshirt', 'Pudra Pembe Tshirt', 'kiyafet', true],
  ['mavi-sweatshirt', 'Mavi Sweatshirt', 'kiyafet', true],
  ['sapka', 'Janti Şapka Siyah', 'sapka', false]
];
// Örnek tasarımı olmayacak ürün: alanı (cm) tek harfe bile yetmeyecek kadar küçük
const kucukHarita = JSON.parse(JSON.stringify(spor.harita));
kucukHarita.zones[0].genislik_cm = 3;
kucukHarita.zones[0].yukseklik_cm = 3;

const kart = (h, b) => `
<div class="card-wrapper product-card-wrapper">
  <div class="card-product">
    <div class="card-product__media relative media-fit-cover" style="position:relative">
      <div class="card-product__media-inner">
        <a class="product-link block" href="/products/${h}" title="${b}"><div class="responsive-image" style="aspect-ratio:1/1;background:#eee"></div></a>
      </div>
    </div>
    <div class="card__content pt-6"><div class="card__information"><div class="card__heading mb-2"><a href="/products/${h}" class="full-unstyled-link product-link">${b}</a></div></div></div>
  </div>
</div>`;

function sayfa({ foto = null } = {}) {
  const sayac = { canta: 0, kiyafet: 0, sapka: 0 };
  const kk = {};
  const cs = {};
  URUNLER.forEach(([h, b, tur, acik], i) => {
    if (!acik) return;
    sayac[tur]++;
    kk[h] = { u: '/products/' + h, b, v: [{ id: 1000 + i, t: 'Default Title', a: true }] };
    cs[h] = {
      id: 9000 + i,
      foto: foto && foto[h] ? foto[h] : null,
      metin_siniri: null,
      gorsel: { en: spor.gorsel.en, boy: spor.gorsel.boy, url: spor.gorsel.kucuk + '&u=' + h },
      harita: h === 'mavi-sweatshirt' ? kucukHarita : spor.harita
    };
  });
  const veri = {
    turler: sayac,
    isimler: 'ATLAS, LEYLA, PERA, EGE, MIRO, ADA, ECE'.split(','),
    ayarlar: spor.ayarlar,
    set: spor.setler.find((s) => s.set === 'cool'),
    urunler: cs
  };
  const ogeler = URUNLER.map(([h, b, tur]) => `<li class="kp-cs__oge grid__item" data-kp-cs-tur="${tur}" data-kp-cs-urun="${h}">${kart(h, b)}</li>`).join('');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html{font-size:62.5%}body{margin:0;font-family:sans-serif;font-size:1.4rem;color:#202223}
.container{max-width:1300px;margin:0 auto;padding:0 1.5rem}.section-padding{padding:36px 0}.section-bg{background:rgb(var(--color-background))}
.btn{display:inline-flex;align-items:center;justify-content:center;height:48px;padding:0 2.4rem;background:#202223;color:#fff;text-decoration:none}
.btn{box-sizing:border-box}</style>
<style>${kkCss}</style><style>${csCss}</style></head><body>
<div class="shopify-section"><div style="background:#d72e20;height:200px">üst bölüm</div></div>
<section class="shopify-section section">
<div class="kp-cs section-padding section-bg isolate" style="--color-background: 244 203 100;--color-foreground: 32 34 35;" data-kp-cs data-editor-src="/cdn/kisisel-editor.js" data-ornek="true">
  <div class="container">
    <div class="kp-cs__ust">
      <div class="kp-cs__metin"><p class="section__sub-heading sub-heading">ÇOK SATANLAR</p><h2 class="section__heading h2">En sevilenler, sana özel</h2><div class="section__description rte"><p>Adını yaz, patch'ini seç, sadece sana ait olsun.</p></div></div>
      <div class="kp-cs__kontrol">
        <div class="kp-cs__filtreler" role="group" aria-label="Ürün tipi" data-kp-cs-filtreler></div>
        <div class="kp-cs__oklar">
          <button type="button" class="kp-cs__ok kp-cs__ok--geri" data-kp-cs-ok="-1" aria-label="Önceki"><svg viewBox="0 0 10 10"><path d="M1 5h8"/></svg></button>
          <button type="button" class="kp-cs__ok" data-kp-cs-ok="1" aria-label="Sonraki"><svg viewBox="0 0 10 10"><path d="M1 5h8"/></svg></button>
        </div>
      </div>
    </div>
    <ul class="kp-cs__liste" data-kp-cs-liste role="list">${ogeler}</ul>
    <div class="kp-cs__noktalar" data-kp-cs-noktalar aria-hidden="true"></div>
    <div class="kp-cs__alt"><a class="btn btn-primary kp-cs__buton" href="/collections/tum-urunler?kisisel=1">Tüm kişiselleştirilebilir ürünler →</a></div>
  </div>
  <script type="application/json" data-kp-kk-veri>${JSON.stringify({ urunler: kk })}</script>
  <script type="application/json" data-kp-cs-veri>${JSON.stringify(veri)}</script>
  <script src="/cdn/kisisel-koleksiyon.js" defer></script>
  <script src="/cdn/kisisel-cok-satanlar.js" defer></script>
</div>
</section>
<div style="height:1500px">alt bölümler</div>
</body></html>`;
}

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const hatalar = [];

async function ac(viewport, secenek = {}, baglam) {
  baglam = baglam || (await t.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 }));
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  const istekler = [];
  const html = sayfa(secenek);
  await s.route('**/*', async (r) => {
    const url = new URL(r.request().url());
    istekler.push(url.pathname);
    if (url.pathname === '/cdn/kisisel-editor.js') return secenek.editorHata ? r.fulfill({ status: 500, body: '' }) : r.fulfill({ contentType: 'text/javascript', body: editorJs });
    if (url.pathname === '/cdn/kisisel-koleksiyon.js') return r.fulfill({ contentType: 'text/javascript', body: kkJs });
    if (url.pathname === '/cdn/kisisel-cok-satanlar.js') return r.fulfill({ contentType: 'text/javascript', body: csJs });
    if (/\/cdn\/shop\/files\//.test(url.pathname) || url.pathname.startsWith('/foto/')) return r.fulfill({ contentType: 'image/png', body: png });
    return r.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
  });
  await s.goto('https://jantifox.test/');
  await s.waitForFunction(() => document.querySelector('[data-kp-cs]').kpBolum);
  return { baglam, s, istekler };
}
const kutu = (s, q, i = 0) => s.locator(q).nth(i).boundingBox();
const gorunenSayisi = (s) => s.locator('[data-kp-cs-liste] > li:not([hidden])').count();
// Listede tamamen görünen ve kısmen görünen kart sayısı
const gorunum = (s) => s.evaluate(() => {
  const l = document.querySelector('[data-kp-cs-liste]').getBoundingClientRect();
  let tam = 0;
  let kismi = 0;
  document.querySelectorAll('[data-kp-cs-liste] > li:not([hidden])').forEach((li) => {
    const r = li.getBoundingClientRect();
    if (r.left >= l.left - 1 && r.right <= l.right + 1) tam++;
    else if (r.right > l.left + 1 && r.left < l.right - 1) kismi++;
  });
  return { tam, kismi };
});

/* ---------------- Masaüstü ---------------- */
for (const en of [1280, 1440, 1920]) {
  const { baglam, s, istekler } = await ac({ width: en, height: 900 });
  // Sıra korunur, sıra etiketi yok
  assert.deepEqual(await s.locator('[data-kp-cs-liste] > li').evaluateAll((l) => l.map((x) => x.getAttribute('data-kp-cs-urun'))), URUNLER.map((x) => x[0]));
  assert.equal(await s.locator('text=/#\\d/').count(), 0);
  // 4 kart tam, 5. kenardan görünür
  assert.deepEqual(await gorunum(s), { tam: 4, kismi: 1 }, en + 'px');
  // Üst satır: solda metin, sağda filtreler ve oklar aynı satırda
  const metin = await kutu(s, '.kp-cs__metin');
  const kontrol = await kutu(s, '.kp-cs__kontrol');
  assert.ok(kontrol.x > metin.x + metin.width - 1, 'kontroller sağda');
  assert.deepEqual(await s.locator('[data-kp-cs-filtre]').allTextContents(), ['Hepsi', 'Çanta', 'Kıyafet']);
  assert.equal(await s.locator('[data-kp-cs-filtre="hepsi"]').getAttribute('aria-pressed'), 'true');
  // Noktalar masaüstünde yok; alt buton ortada
  assert.equal(await s.locator('.kp-cs__noktalar').isVisible(), false);
  const alt = await kutu(s, '.kp-cs__buton');
  assert.ok(Math.abs(alt.x + alt.width / 2 - en / 2) < 10, 'alt buton ortada');
  assert.equal(await s.locator('.kp-cs__buton').getAttribute('href'), '/collections/tum-urunler?kisisel=1');
  // Kart bileşeni: 7 açık kartta etiket + Kişiselleştir + sepet; şapka normal kart
  assert.equal(await s.locator('.kp-kk-rozet').count(), 7);
  const sapka = s.locator('[data-kp-cs-urun="sapka"]');
  assert.equal(await sapka.locator('.kp-kk-rozet, .kp-kk-eylem, .kp-kk-mobil, .kp-ornek').count(), 0);
  assert.equal(await s.locator('[data-kp-cs-urun="pudra-pembe-tshirt"] .kp-kk-kisisel').getAttribute('href'), '/products/pudra-pembe-tshirt?kisisellestir=1');
  // Oklar: başta geri pasif; ileri kaydırır
  assert.equal(await s.locator('[data-kp-cs-ok="-1"]').isDisabled(), true);
  const once = await s.locator('[data-kp-cs-liste]').evaluate((e) => e.scrollLeft);
  await s.locator('[data-kp-cs-ok="1"]').click();
  await s.waitForFunction((o) => document.querySelector('[data-kp-cs-liste]').scrollLeft > o + 50, once);
  await s.waitForTimeout(600);
  assert.equal(await s.locator('[data-kp-cs-ok="-1"]').isDisabled(), false);
  // Sona kadar: ileri pasif
  for (let i = 0; i < 6; i++) {
    if (await s.locator('[data-kp-cs-ok="1"]').isDisabled()) break;
    await s.locator('[data-kp-cs-ok="1"]').click();
    await s.waitForTimeout(500);
  }
  assert.equal(await s.locator('[data-kp-cs-ok="1"]').isDisabled(), true);

  if (en === 1280) {
    // Filtre: sayfa yenilenmeden; Kıyafet 2 kart, kaydırma yok, oklar gizli
    const url = s.url();
    await s.evaluate(() => { window.__ayni = 1; });
    await s.locator('[data-kp-cs-filtre="kiyafet"]').click();
    assert.equal(await gorunenSayisi(s), 2);
    assert.equal(await s.locator('[data-kp-cs-liste]').evaluate((e) => e.scrollLeft), 0);
    assert.equal(await s.evaluate(() => window.__ayni), 1, 'sayfa yenilenmedi');
    assert.equal(s.url(), url);
    assert.ok(await s.locator('[data-kp-cs]').evaluate((e) => e.classList.contains('kp-cs--kaymaz')));
    assert.equal(await s.locator('.kp-cs__oklar').evaluate((e) => getComputedStyle(e).visibility), 'hidden');
    await s.locator('[data-kp-cs-filtre="canta"]').click();
    assert.equal(await gorunenSayisi(s), 5);
    assert.equal(await s.locator('[data-kp-cs-filtre="canta"]').getAttribute('aria-pressed'), 'true');
    await s.locator('[data-kp-cs-filtre="hepsi"]').click();
    assert.equal(await gorunenSayisi(s), 8);

    // Örnek tasarım: bölüm görünür olunca çizilir; her kartta farklı isim; çizilemeyen (küçük alan) normal kalır
    await s.waitForFunction(() => document.querySelectorAll('.kp-ornek').length === 6, null, { timeout: 15000 });
    const notlar = await s.locator('.kp-ornek__not').allTextContents();
    assert.equal(notlar.length, 6);
    notlar.forEach((n) => assert.match(n, /^Örnek tasarım: [A-Z]+$/));
    assert.equal(new Set(notlar).size, 6, 'her karta farklı isim');
    assert.equal(await s.locator('[data-kp-cs-urun="mavi-sweatshirt"] .kp-ornek').count(), 0);
    // Harfler SVG içinde, Cool Alfabe görselleriyle
    const harfler = await s.locator('[data-kp-cs-urun="mavi-beyaz-cizgili-spor-canta"] .kp-ornek image').evaluateAll((l) => l.map((x) => x.getAttribute('href')));
    const ilkIsim = notlar[0].split(': ')[1];
    assert.equal(harfler.length, 1 + ilkIsim.length);
    assert.ok(harfler.slice(1).every((h) => /kisisel-harf-[A-Z]\.webp/.test(h)));
    // Katman tıklamayı engellemez: ürün sayfasına gider; Kişiselleştir butonu üstte
    assert.equal(await s.locator('.kp-ornek').first().evaluate((e) => getComputedStyle(e).pointerEvents), 'none');
    const kisisel = await kutu(s, '[data-kp-cs-urun="mavi-beyaz-cizgili-spor-canta"] .kp-kk-kisisel');
    const ust = await s.evaluate(([x, y]) => document.elementFromPoint(x, y).className, [kisisel.x + kisisel.width / 2, kisisel.y + kisisel.height / 2]);
    assert.equal(ust, 'kp-kk-kisisel');
    // Kişiselleştir editörü boş açar: örnek isim taşınmaz
    assert.ok(!(await s.locator('.kp-kk-kisisel').evaluateAll((l) => l.some((a) => /isim|ATLAS/i.test(a.href)))));
    assert.ok(istekler.includes('/cdn/kisisel-editor.js'), 'ilk açılışta çizim motoru yüklendi');
    const depo = await s.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('kp-ornek-v1:')).length);
    assert.equal(depo, 7, '6 çizim + 1 çizilemedi kaydı');

    // İkinci açılış: önbellekten, editör betiği yüklenmez; aynı isimler
    const ikinci = await ac({ width: en, height: 900 }, {}, baglam);
    await ikinci.s.waitForFunction(() => document.querySelectorAll('.kp-ornek').length === 6, null, { timeout: 5000 });
    assert.deepEqual(await ikinci.s.locator('.kp-ornek__not').allTextContents(), notlar);
    assert.ok(!ikinci.istekler.includes('/cdn/kisisel-editor.js'), 'önbellekten: editör yüklenmedi');
    await ikinci.s.close();
  }
  await baglam.close();
}

/* ---------------- Fotoğraf ve çizim hatası ---------------- */
{
  const { baglam, s } = await ac({ width: 1280, height: 900 }, { foto: { 'the-artist': '/foto/artist.png' } });
  await s.waitForFunction(() => document.querySelectorAll('.kp-ornek').length === 6, null, { timeout: 15000 });
  const artist = s.locator('[data-kp-cs-urun="the-artist"] .kp-ornek');
  assert.ok(await artist.evaluate((e) => e.classList.contains('kp-ornek--foto')));
  assert.equal(await artist.locator('.kp-ornek__not').count(), 0, 'fotoğrafta not yok');
  assert.equal(await artist.locator('img').getAttribute('src'), '/foto/artist.png');
  await baglam.close();
}
{
  // Editör betiği yüklenemezse kartlar normal görselle kalır, hata yok
  const { baglam, s } = await ac({ width: 1280, height: 900 }, { editorHata: true });
  await s.waitForTimeout(1500);
  assert.equal(await s.locator('.kp-ornek').count(), 0);
  assert.equal(await s.locator('.kp-kk-rozet').count(), 7);
  await baglam.close();
}

/* ---------------- Mobil ---------------- */
for (const en of [360, 390]) {
  const { baglam, s } = await ac({ width: en, height: 780 });
  // Metin üstte, filtreler altında tek satır yatay kayar
  const metin = await kutu(s, '.kp-cs__metin');
  const filtre = await kutu(s, '.kp-cs__filtreler');
  assert.ok(filtre.y >= metin.y + metin.height - 1, 'filtreler metnin altında');
  const dugmeler = await s.locator('[data-kp-cs-filtre]').evaluateAll((l) => l.map((b) => Math.round(b.getBoundingClientRect().top)));
  assert.equal(new Set(dugmeler).size, 1, 'tek satır');
  assert.equal(await s.locator('.kp-cs__oklar').isVisible(), false);
  // 1 kart tam, 2. kenardan görünür; noktalar
  assert.deepEqual(await gorunum(s), { tam: 1, kismi: 1 }, en + 'px');
  assert.equal(await s.locator('.kp-cs__nokta').count(), 8);
  assert.equal(await s.locator('.kp-cs__nokta--aktif').count(), 1);
  assert.equal(await s.locator('.kp-cs__nokta').first().evaluate((e) => e.classList.contains('kp-cs__nokta--aktif')), true);
  // Kaydırınca aktif nokta değişir
  await s.locator('[data-kp-cs-liste]').evaluate((e) => { e.style.scrollBehavior = 'auto'; e.scrollLeft = e.firstElementChild.getBoundingClientRect().width * 2 + 32; });
  await s.waitForTimeout(300);
  assert.equal(await s.locator('.kp-cs__nokta').nth(2).evaluate((e) => e.classList.contains('kp-cs__nokta--aktif')), true);
  // Filtre noktaları da günceller
  await s.locator('[data-kp-cs-filtre="kiyafet"]').click();
  assert.equal(await s.locator('.kp-cs__nokta').count(), 2);
  await s.locator('[data-kp-cs-filtre="hepsi"]').click();
  // Mobil kart butonu görselin altında; alt buton tam genişlik
  assert.equal(await s.locator('[data-kp-cs-urun="mavi-beyaz-cizgili-spor-canta"] .kp-kk-mobil').isVisible(), true);
  const alt = await kutu(s, '.kp-cs__buton');
  const kap = await kutu(s, '.kp-cs .container');
  assert.ok(alt.width >= kap.width - 30 - 1, 'alt buton tam genişlik');
  // Sayfa yatayda taşmaz
  assert.ok(await s.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'yatay taşma yok');
  await s.waitForFunction(() => document.querySelectorAll('.kp-ornek').length === 6, null, { timeout: 15000 });
  await baglam.close();
}

/* ---------------- Tek tip: filtre düğmeleri gizli ---------------- */
{
  const { baglam, s } = await ac({ width: 1280, height: 900 });
  await s.evaluate(() => {
    const kok = document.querySelector('[data-kp-cs]');
    const v = JSON.parse(kok.querySelector('script[data-kp-cs-veri]').textContent);
    v.turler = { canta: 5, kiyafet: 0, sapka: 0 };
    kok.querySelector('script[data-kp-cs-veri]').textContent = JSON.stringify(v);
    kok.kpBolum.veri = v;
    kok.kpBolum.filtreleriKur();
  });
  assert.equal(await s.locator('.kp-cs__filtreler').isVisible(), false);
  await baglam.close();
}

await t.close();
assert.deepEqual(hatalar, []);
console.log('çok satanlar: tamam');
