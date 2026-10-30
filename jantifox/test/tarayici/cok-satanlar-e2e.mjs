// Ana sayfa "Çok satanlar" bölümü, temanın gerçek dosyalarıyla (tema/: Splide, theme.js, theme.css, kök değişkenler)
// ve temanın kendi ürün listesi bölümü (tema/urun-listesi.html, patch setleri) aynı sayfada:
// kart ölçüsü, görsel zemini, köşe, yazı boyutları ve boşluklar temanınkiyle aynı; görselin üstünde yalnızca küçük
// etiket; "Kişiselleştir" fiyatın altında temanın butonu; sepet butonu yok; filtre temanın sekme stiliyle ve
// kaydırıcıyla; örnek tasarım temanın ikinci görsel katmanında (üzerine gelince), kart görseliyle aynı kadrajda
// (Artist: kesit kart görselinde bulunur; spor çanta: farklı çekim, kesit kart zemininde ortalanır); "Örnek: İSİM";
// mobilde ekrandayken dönüşümlü; önbellek; çizilemezse kart olduğu gibi.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node cok-satanlar-e2e.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const tema = new URL('./tema/', import.meta.url).pathname;
const oku = (p) => readFileSync(kok + p, 'utf8');
const temaOku = (p) => readFileSync(tema + p, 'utf8');
const spor = JSON.parse(oku('test/kisisel-veri-spor.json'));
const artistHarita = JSON.parse(temaOku('artist-harita.json'));
const harfPng = readFileSync(kok + 'veri/aksesuar/duz/kalem-kutusu-sari-on.png');
const gorsel = (ad) => readFileSync(tema + 'gorsel/' + ad);

const URUNLER = [
  ['mavi-beyaz-cizgili-spor-canta', 'Mavi Beyaz Çizgili Spor Çanta', 'canta', true, 'spor'],
  ['pembe-kirmizi-cizgili-spor-canta', 'Pembe Kırmızı Çizgili Spor Çanta', 'canta', true, 'spor'],
  ['the-artist', 'The Artist Sırt Çantası -LE KOKO COLLECTIF-', 'canta', true, 'artist', true],
  ['the-performer', 'The Performer Sırt Çantası -LE KOKO COLLECTIF- Özel Seri Çok Uzun Ürün Adı Denemesi', 'canta', true, 'artist', true],
  ['the-adventurer', 'The Adventurer Mini Sırt Çantası', 'canta', true, 'artist', true],
  ['pudra-pembe-tshirt', 'Pudra Pembe Tshirt', 'kiyafet', true, 'spor'],
  ['mavi-sweatshirt', 'Mavi Sweatshirt', 'kiyafet', true, 'kucuk'],
  ['sapka', 'Janti Şapka Siyah', 'sapka', false, 'spor']
];
const kucukHarita = JSON.parse(JSON.stringify(spor.harita));
kucukHarita.zones[0].genislik_cm = 3;
kucukHarita.zones[0].yukseklik_cm = 3;

// Temanın card-product çıktısı (snippets/card-product.liquid, önizlemedeki HTML ile aynı yapı)
const kart = (h, b, img, yeni) => `<div class="card-wrapper product-card-wrapper ">
    <div class="card-product">
      <div class="card-product__media relative media-fit-fill"><div class="card-product__media-inner"><a class="product-link block" href="/products/${h}" title="${b}">
<responsive-image class="responsive-image product-first-image" style="--aspect-ratio:100.0%">
<img src="${img}" alt="${b}" width="400" height="400" loading="lazy" class="motion-reduce lazy-image img-loading">
</responsive-image></a>
${yeni ? '<span class="card-new-in-badge">NEW IN</span>' : ''}
<div class="card__badge top left"></div>
          </div></div>
      <div class="card__content pt-6 ">
        <div class="card__information text-left"><div class="card__vendor mb-2">
              <span class="visually-hidden">Satıcı:</span>
              <div class="caption-with-letter-spacing light">JantiFox</div>
            </div><div class="card__heading mb-2">
            <a href="/products/${h}" title="${b}" class="full-unstyled-link product-link">${b}</a>
          </div>
          <div class="card-information">
<div class="
    price "><div class="price__container"><div class="price__regular"><span class="visually-hidden visually-hidden--inline">Normal fiyat</span>
        <span class="price-item price-item--regular">2,500.00TL</span></div></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

function bolumHtml({ foto = null, filtre = true } = {}) {
  const kk = {};
  const cs = {};
  URUNLER.forEach(([h, b, tur, acik, g], i) => {
    if (!acik) return;
    kk[h] = { u: '/products/' + h, b, v: [{ id: 1000 + i, t: 'Default Title', a: true }] };
    const artist = g === 'artist';
    cs[h] = {
      id: 9000 + i,
      foto: foto && foto[h] ? foto[h] : null,
      metin_siniri: null,
      gorsel: artist ? { en: 1328, boy: 1600, url: '//jantifox.test/cdn/shop/files/artist-onizleme.png?v=1&width=600&u=' + h } : { en: spor.gorsel.en, boy: spor.gorsel.boy, url: '//jantifox.test/cdn/shop/files/spor-onizleme.png?v=1&width=600&u=' + h },
      kapak: { en: 400, boy: 400, url: '//jantifox.test/cdn/shop/files/' + (artist ? 'artist-kapak.png' : 'spor-kapak.jpg') + '?v=1&width=600&u=' + h },
      harita: artist ? artistHarita : g === 'kucuk' ? kucukHarita : spor.harita
    };
  });
  const veri = { isimler: 'ATLAS, LEYLA, PERA, EGE, MIRO, ADA, ECE'.split(','), ayarlar: spor.ayarlar, set: spor.setler.find((s) => s.set === 'cool'), urunler: cs };
  const slaytlar = URUNLER.map(([h, b, tur, , g, yeni]) => `<div class="splide__slide" data-kp-cs-tur="${tur}" data-kp-cs-urun="${h}">
    <div class=" scroll-trigger animate--slide-in h-full" data-cascade style="--animation-order:1;">${kart(h, b, '//jantifox.test/cdn/shop/files/' + (g === 'artist' ? 'artist-kapak.png' : 'spor-kapak.jpg') + '?v=1&width=400&k=' + h, yeni)}</div></div>`).join('');
  const sekmeler = filtre ? `<div><div class="tab-scrollable flex justify-center mt-6"><div class="tabs-header gap-x-16 flex relative font-heading" role="tablist" aria-label="Ürün tipi">
    <button class="tab-button active" role="tab" aria-selected="true" data-tab="kp-cs-hepsi" data-kp-cs-filtre="hepsi" tabindex="0">Hepsi</button><button class="tab-button" role="tab" aria-selected="false" data-tab="kp-cs-canta" data-kp-cs-filtre="canta" tabindex="-1">Çanta</button><button class="tab-button" role="tab" aria-selected="false" data-tab="kp-cs-kiyafet" data-kp-cs-filtre="kiyafet" tabindex="-1">Kıyafet</button>
    <div class="indicator"></div></div></div></div>` : '';
  return `<section class="shopify-section section" id="cok-satanlar"><div class="section-featured-collection kp-cs kp-cs--kaydir section-padding section-bg isolate overflow-hidden lg:overflow-visible" style="--section-padding-top: 36px; --section-padding-bottom: 36px;" data-kp-cs data-editor-src="/cdn/kisisel-editor.js" data-ornek="true" data-buton="kirmizi">
  <div class="collection container" id="collection-kp" style="--column-product:4;--column-product-mobile:2;--column-gap:3rem;">
    ${filtre ? '<tabs-component class="tabs-component kp-cs__sekmeler">' : ''}
    <div class="featured-collection-wrap section-header-wrap flex flex-col lg:flex-row lg:items-end gap-x-6 gap-y-4 mb-16">
      <div class="flex-1 flex gap-y-2 flex-col"><p class="section__sub-heading sub-heading">ÇOK SATANLAR</p><h2 class="section__heading h2">İstediğin ürünü hemen kişiselleştir</h2><div class="section__description rte"><p>İster yazı yaz, ister patch seç, istersen ikisini karıştır.</p></div></div>
      ${sekmeler}
    </div>
    ${filtre ? '<div class="tabs-content">' : ''}
    <splide-carousel><div id="featured-collection-kp" class="splide-slider splide featured-collection-slider" data-splide='{"type":"slide", "speed":500, "perPage":4,"lazyLoad": "nearby","preloadPages":1, "perMove": 1,"waitForTransition": false,"rewind":false,"updateOnMove":true,"pagination":false,"arrows":true,"autoplay":false,"pauseOnHover":true,"pauseOnFocus":true, "gap": "3rem", "destroy": false,"breakpoints":{"640": {"destroy":true,"perPage":2, "arrows":false, "gap": "2rem", "padding":{"right":"2rem"}, "perMove": 1, "speed":1200 }}}' data-kp-cs-slider>
      <div class="splide__track mb:splide-right-overflow"><div class="splide__list" data-kp-cs-liste>${slaytlar}</div></div>
      <div class="splide__arrows splide__arrows--ltr no-js-hidden"><button class="splide__arrow splide__arrow--prev " type="button" aria-label="Önceki"><svg viewBox="0 0 10 10"><path d="M1 5h8"/></svg></button><button class="splide__arrow splide__arrow--next " type="button" aria-label="Sonraki"><svg viewBox="0 0 10 10"><path d="M1 5h8"/></svg></button></div>
    </div></splide-carousel>
    ${filtre ? '</div></tabs-component>' : ''}
    <div class="kp-cs__alt"><a class="btn btn-primary kp-cs__buton" href="/collections/tum-urunler?kisisel=1">Tüm kişiselleştirilebilir ürünler →</a></div>
  </div>
  <script type="application/json" data-kp-kk-veri>${JSON.stringify({ urunler: kk })}</script>
  <script type="application/json" data-kp-cs-veri>${JSON.stringify(veri)}</script>
</div></section>`;
}

function sayfa(secenek) {
  return `<!doctype html><html lang="tr" class="js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${temaOku('kok.css')}</style><style>${temaOku('theme.css')}</style><style>${temaOku('template-collection.css')}</style><style>${temaOku('component-tabs.css')}</style>
<style>${oku('assets/kisisel-koleksiyon.css')}</style><style>${oku('assets/kisisel-cok-satanlar.css')}</style>
<style>.card-new-in-badge{position:absolute;top:1rem;left:1rem;z-index:3;padding:.4rem .7rem;border:1px solid #000;background:#fff;color:#000;font-size:1.1rem;line-height:1;font-weight:600}</style>
<script>window.Shopify={designMode:false,routes:{root:'/'}};window.routes={cart_add_url:'/cart/add'};</script>
</head><body class="template-index">
<div style="background:#f4cb64;height:120px">JantiFox x Le Koko bandı</div>
${bolumHtml(secenek)}
${temaOku('urun-listesi.html')}
<div style="height:1200px"></div>
<script src="/cdn/vendor.js"></script><script src="/cdn/theme.js" defer></script><script src="/cdn/animations.js" defer></script>
<script src="/cdn/kisisel-koleksiyon.js" defer></script><script src="/cdn/kisisel-cok-satanlar.js" defer></script>
</body></html>`;
}

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const hatalar = [];
const JS = { 'vendor.js': temaOku('vendor.js'), 'theme.js': temaOku('theme.js'), 'animations.js': temaOku('animations.js'), 'kisisel-koleksiyon.js': oku('assets/kisisel-koleksiyon.js'), 'kisisel-cok-satanlar.js': oku('assets/kisisel-cok-satanlar.js'), 'kisisel-editor.js': oku('assets/kisisel-editor.js') };

async function ac(cihaz, secenek = {}, baglam) {
  baglam = baglam || (await t.newContext({ ...cihaz, locale: 'tr-TR' }));
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  const istekler = [];
  const html = sayfa(secenek);
  await s.route('**/*', async (r) => {
    const url = new URL(r.request().url());
    istekler.push(url.href);
    const ad = url.pathname.split('/').pop();
    if (url.pathname.startsWith('/cdn/') && JS[ad]) {
      if (ad === 'kisisel-editor.js' && secenek.editorHata) return r.fulfill({ status: 500, body: '' });
      return r.fulfill({ contentType: 'text/javascript', body: JS[ad] });
    }
    if (url.pathname.startsWith('/cdn/shop/files/')) {
      if (/artist-kapak/.test(ad)) return r.fulfill({ contentType: 'image/png', body: gorsel('artist-kapak.png') });
      if (/artist-onizleme/.test(ad)) return r.fulfill({ contentType: 'image/png', body: gorsel('artist-onizleme.png') });
      if (/spor-kapak/.test(ad)) return r.fulfill({ contentType: 'image/jpeg', body: gorsel('spor-kapak.jpg') });
      if (/spor-onizleme/.test(ad)) return r.fulfill({ contentType: 'image/png', body: gorsel('spor-onizleme.png') });
      return r.fulfill({ contentType: 'image/png', body: harfPng });
    }
    if (url.hostname === 'jantifox.com' || /\.(png|jpe?g|webp|woff2?)$/.test(url.pathname)) return r.fulfill({ contentType: 'image/png', body: harfPng });
    if (url.hostname !== 'jantifox.test') return r.fulfill({ status: 204, body: '' });
    return r.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
  });
  await s.goto('https://jantifox.test/');
  // Mobilde (640 px ve altı) kaydırıcı kapalı, liste tarayıcının kendi kaydırmasıyla kayar
  await s.waitForFunction(() => document.querySelector('[data-kp-cs]').kpBolum && document.querySelector('[data-kp-cs] .splide.is-initialized'));
  return { baglam, s, istekler };
}

const bizim = '#cok-satanlar';
const tema2 = '[id*=featured_collection_Mhgi6z]';
// Kartın ölçüleri ve stilleri (temanın bölümüyle karşılaştırmak için)
const kartOlc = (s, kapsam) => s.evaluate((q) => {
  const k = document.querySelector(q);
  const kart = k.querySelector('.card-wrapper');
  const st = (e) => getComputedStyle(e);
  const ic = kart.querySelector('.card-product__media-inner');
  const r = ic.getBoundingClientRect();
  const sl = k.querySelectorAll('.splide__slide');
  return {
    en: Math.round(r.width), boy: Math.round(r.height), zemin: st(ic).backgroundColor, kose: st(ic).borderRadius,
    baslik: [st(kart.querySelector('.card__heading')).fontSize, st(kart.querySelector('.card__heading')).fontWeight],
    fiyat: st(kart.querySelector('.price')).fontSize, ust: st(kart.querySelector('.card__content')).paddingTop,
    bosluk: sl.length > 1 ? Math.round(sl[1].getBoundingClientRect().left - sl[0].getBoundingClientRect().right) : null,
    bolumZemin: st(k.querySelector('.section-bg')).backgroundColor, dolgu: [st(k.querySelector('.section-padding')).paddingTop, st(k.querySelector('.section-padding')).paddingBottom],
    kapsayici: Math.round(k.querySelector('.collection').getBoundingClientRect().width)
  };
}, kapsam);
// Bütün görünen kartlarda: etiket görsel kutusunun sol üst köşesinde aynı mesafede; "NEW IN" etiketiyle çakışmaz;
// "Kişiselleştir" butonlarının alt kenarı aynı hizada (kartın en altında); ürün adı en fazla iki satır
async function hizaKontrol(s, ad) {
  const r = await s.evaluate((q) => {
    // Ekranda tamamen görünen kartlar (dışarıdakileri temanın görünme animasyonu henüz 2rem aşağıda bekletir)
    const kaydirici = innerWidth > 640;
    const sl = kaydirici ? [...document.querySelectorAll(q + ' .splide__slide.is-visible')] : [...document.querySelectorAll(q + ' .splide__slide')].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1; });
    return sl.map((x) => {
      const ic = x.querySelector('.card-product__media-inner').getBoundingClientRect();
      const rz = x.querySelector('.kp-kk-rozet');
      const ni = x.querySelector('.card-new-in-badge');
      const b = x.querySelector('.kp-kk-kart-buton');
      const kart = x.querySelector('.card-wrapper').getBoundingClientRect();
      const h = x.querySelector('.card__heading a');
      const satir = Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight));
      const rr = rz && rz.getBoundingClientRect();
      const nr = ni && ni.getBoundingClientRect();
      return { urun: x.getAttribute('data-kp-cs-urun'), rozet: rr && [Math.round(rr.left - ic.left), Math.round(rr.top - ic.top)], cakisma: !!(rr && nr && !(rr.right <= nr.left || nr.right <= rr.left || rr.bottom <= nr.top || nr.bottom <= rr.top)), butonAlt: b && Math.round(b.getBoundingClientRect().bottom), kartAlt: Math.round(kart.bottom), satir, kisaltildi: h.scrollHeight > h.clientHeight + 1 };
    });
  }, bizim);
  const rozetler = r.filter((x) => x.rozet);
  assert.ok(rozetler.length >= 1, ad + ' etiket var');
  rozetler.forEach((x) => assert.deepEqual(x.rozet, rozetler[0].rozet, ad + ' etiket hizası ' + JSON.stringify(rozetler.map((y) => y.rozet))));
  assert.ok(Math.abs(rozetler[0].rozet[0] - rozetler[0].rozet[1]) <= 1 && rozetler[0].rozet[0] <= 12, ad + ' etiket sol üst köşede');
  r.forEach((x) => assert.ok(!x.cakisma, ad + ' NEW IN ile çakışma: ' + x.urun));
  const butonlar = r.filter((x) => x.butonAlt);
  butonlar.forEach((x) => assert.equal(x.butonAlt, butonlar[0].butonAlt, ad + ' buton hizası ' + JSON.stringify(butonlar.map((y) => [y.urun, y.butonAlt]))));
  butonlar.forEach((x) => assert.ok(Math.abs(x.butonAlt - x.kartAlt) <= 1, ad + ' buton kartın en altında'));
  r.forEach((x) => assert.ok(x.satir <= 2, ad + ' ad en fazla iki satır: ' + x.urun + ' ' + x.satir));
  return r;
}
const ornekSayisi = (s) => s.locator(`${bizim} .product-secondary-image.kp-ornek`).count();

/* ---------------- Masaüstü ---------------- */
for (const en of [1280, 1440, 1920]) {
  const { baglam, s, istekler } = await ac({ viewport: { width: en, height: 900 } });
  // Sıra korunur; temanın kaydırıcısı: 4 kart, oklar
  assert.deepEqual(await s.locator(`${bizim} .splide__slide`).evaluateAll((l) => l.map((x) => x.getAttribute('data-kp-cs-urun'))), URUNLER.map((x) => x[0]));
  const gorunen = await s.locator(`${bizim} .splide__slide.is-visible`).count();
  assert.equal(gorunen, 4, en + 'px: 4 kart görünür');
  assert.equal(await s.locator(`${bizim} .splide__arrow`).count(), 2);
  // Temanın ürün listesi bölümüyle aynı kart: ölçü, zemin, köşe, yazılar, boşluk, bölüm zemini (beyaz) ve dolgu
  const a = await kartOlc(s, bizim);
  const b = await kartOlc(s, tema2);
  assert.ok(Math.abs(a.en - b.en) <= 1 && Math.abs(a.boy - b.boy) <= 1, `${en}px kart ${a.en}x${a.boy} / tema ${b.en}x${b.boy}`);
  for (const k of ['zemin', 'kose', 'baslik', 'fiyat', 'ust', 'bolumZemin', 'dolgu', 'kapsayici']) assert.deepEqual(a[k], b[k], en + 'px ' + k);
  assert.ok(Math.abs(a.bosluk - b.bosluk) <= 1, 'kartlar arası boşluk ' + a.bosluk + ' / ' + b.bosluk);
  assert.equal(a.zemin, 'rgb(245, 245, 245)');
  assert.equal(a.bolumZemin, 'rgb(255, 255, 255)');
  // Görselin üstünde yalnızca küçük etiket; buton ve sepet yok; örnek notu görünmüyor
  assert.equal(await s.locator(`${bizim} .kp-kk-rozet`).count(), 7);
  assert.equal(await s.locator(`${bizim} .kp-kk-eylem, ${bizim} .kp-kk-sepet, ${bizim} .kp-kk-mobil, ${bizim} [data-kp-kk-sepet]`).count(), 0);
  const rozet = await s.locator(`${bizim} .kp-kk-rozet`).first().evaluate((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { fs: c.fontSize, h: r.height, w: r.width, golge: c.boxShadow, metin: e.textContent.trim() }; });
  assert.equal(rozet.metin, '✎ Kişiselleştirilebilir');
  assert.equal(rozet.golge, 'none');
  assert.ok(rozet.h <= 22 && parseFloat(rozet.fs) <= 11.5, JSON.stringify(rozet));
  await hizaKontrol(s, en + 'px');
  // "Kişiselleştir": fiyatın altında, tam genişlik, temanın butonu (köşeli, aynı yükseklik)
  const btn = await s.locator(`${bizim} [data-kp-cs-urun="mavi-beyaz-cizgili-spor-canta"]`).evaluate((sl) => {
    const b = sl.querySelector('.kp-kk-kart-buton'); const p = sl.querySelector('.price'); const k = sl.querySelector('.card-wrapper');
    const rb = b.getBoundingClientRect(); const c = getComputedStyle(b);
    return { alt: rb.top >= p.getBoundingClientRect().bottom, en: Math.round(rb.width), kart: Math.round(k.getBoundingClientRect().width), h: Math.round(rb.height), kose: c.borderRadius, sinif: b.className, href: b.getAttribute('href'), bg: c.backgroundColor };
  });
  // Butonlar: 44 px, kart görselleriyle aynı yuvarlaklık, yarı kalın, normal harf aralığı, büyük harf yok
  const bStil = await s.evaluate((q) => [document.querySelector(q + ' .kp-kk-kart-buton'), document.querySelector(q + ' .kp-cs__buton')].map((b) => { const c = getComputedStyle(b); return [Math.round(b.getBoundingClientRect().height), c.borderRadius, c.fontWeight, c.letterSpacing, c.textTransform]; }), bizim);
  const gorselKose = a.kose;
  bStil.forEach((x) => assert.deepEqual(x, [44, gorselKose, '500', 'normal', 'none'], JSON.stringify(bStil)));
  assert.ok(btn.alt, 'fiyatın altında');
  assert.equal(btn.en, btn.kart, 'tam genişlik');
  assert.match(btn.sinif, /\bbtn btn-primary\b/);
  assert.equal(btn.bg, 'rgb(179, 20, 27)');
  assert.equal(btn.href, '/products/mavi-beyaz-cizgili-spor-canta?kisisellestir=1');
  // Şapka: normal kart
  assert.equal(await s.locator(`${bizim} [data-kp-cs-urun="sapka"] .kp-kk-rozet, ${bizim} [data-kp-cs-urun="sapka"] .kp-kk-kart-buton`).count(), 0);
  // Sekmeler: temanın sekme stili (hap değil), seçili olanın altında temanın çizgisi
  const sek = await s.evaluate(() => {
    const b = [...document.querySelectorAll('[data-kp-cs-filtre]')];
    const ind = document.querySelector('.kp-cs .indicator');
    const c = getComputedStyle(b[0]);
    return { metin: b.map((x) => x.textContent.trim()), radius: c.borderRadius, kenar: c.borderTopWidth, bg: c.backgroundColor, cizgi: getComputedStyle(ind).height, cizgiEn: ind.getBoundingClientRect().width, ilkEn: b[0].getBoundingClientRect().width };
  });
  assert.deepEqual(sek.metin, ['Hepsi', 'Çanta', 'Kıyafet']);
  assert.equal(sek.radius, '0px');
  assert.equal(sek.kenar, '0px');
  assert.equal(sek.bg, 'rgba(0, 0, 0, 0)');
  assert.equal(sek.cizgi, '2px');
  assert.ok(Math.abs(sek.cizgiEn - sek.ilkEn) < 1, 'çizgi seçili sekmenin altında');
  // Metin solda, sekmeler sağda aynı satır
  const yer = await s.evaluate(() => { const m = document.querySelector('.kp-cs .section__heading').getBoundingClientRect(); const t2 = document.querySelector('.kp-cs .tabs-header').getBoundingClientRect(); return [m.right, t2.left]; });
  assert.ok(yer[1] > yer[0], 'sekmeler sağda');

  // Oklar: temanın oku kaydırır
  await s.locator(`${bizim} .splide`).hover();
  await s.locator(`${bizim} .splide__arrow--next`).click();
  await s.waitForTimeout(700);
  assert.equal(await s.locator(`${bizim} .splide__slide`).first().evaluate((e) => e.classList.contains('is-visible')), false, 'ileri kaydı');

  if (en === 1280) {
    const uzun = await s.locator(`${bizim} [data-kp-cs-urun="the-performer"] .card__heading a`).evaluate((h) => ({ kisa: h.scrollHeight > h.clientHeight + 1, satir: Math.round(h.clientHeight / parseFloat(getComputedStyle(h).lineHeight)) }));
    assert.deepEqual(uzun, { kisa: true, satir: 2 }, 'uzun ad iki satırda kısaltılır');
    // Filtre: sayfa yenilenmez; Kıyafet 2 kart; Çanta 5; Hepsi 8 ve sıra korunur; çizgi seçili sekmeye geçer
    await s.evaluate(() => { window.__ayni = 1; });
    await s.locator('[data-kp-cs-filtre="kiyafet"]').click();
    await s.waitForTimeout(400);
    assert.deepEqual(await s.locator(`${bizim} .splide__slide`).evaluateAll((l) => l.map((x) => x.getAttribute('data-kp-cs-urun'))), ['pudra-pembe-tshirt', 'mavi-sweatshirt']);
    assert.equal(await s.locator(`${bizim} .splide__slide.is-visible`).count(), 2);
    assert.equal(await s.locator('[data-kp-cs-filtre="kiyafet"]').evaluate((e) => e.classList.contains('active')), true);
    const ind = await s.evaluate(() => { const i = document.querySelector('.kp-cs .indicator').getBoundingClientRect(); const b = document.querySelector('[data-kp-cs-filtre="kiyafet"]').getBoundingClientRect(); return Math.abs(i.left - b.left); });
    assert.ok(ind < 2, 'çizgi Kıyafet altında');
    await s.locator('[data-kp-cs-filtre="canta"]').click();
    await s.waitForTimeout(400);
    assert.equal(await s.locator(`${bizim} .splide__slide`).count(), 5);
    await s.locator('[data-kp-cs-filtre="hepsi"]').click();
    await s.waitForTimeout(400);
    assert.deepEqual(await s.locator(`${bizim} .splide__slide`).evaluateAll((l) => l.map((x) => x.getAttribute('data-kp-cs-urun'))), URUNLER.map((x) => x[0]));
    assert.equal(await s.locator(`${bizim} .splide__slide.is-visible`).count(), 4);
    assert.equal(await s.evaluate(() => window.__ayni), 1, 'sayfa yenilenmedi');
    // Filtreden sonra kartlar görünür (temanın görünme animasyonu takılmaz) ve butonlar yerinde
    assert.equal(await s.locator(`${bizim} .kp-kk-kart-buton`).count(), 7);

    // Örnek tasarım: ikinci görsel katmanı; ilk görünüm normal görsel (katman saydam)
    await s.waitForFunction((q) => document.querySelectorAll(q + ' .kp-ornek').length === 6, bizim, { timeout: 20000 });
    const katman = s.locator(`${bizim} [data-kp-cs-urun="the-artist"] .kp-ornek`);
    assert.equal(await katman.evaluate((e) => getComputedStyle(e).opacity), '0');
    assert.equal(await katman.evaluate((e) => e.parentElement.matches('a.product-link')), true, 'tıklama ürün sayfasına gider');
    const notlar = await s.locator(`${bizim} .kp-ornek__not`).allTextContents();
    assert.equal(notlar.length, 6);
    notlar.forEach((n) => assert.match(n, /^Örnek: [A-Z]+$/));
    assert.equal(new Set(notlar).size, 6, 'her karta farklı isim');
    assert.equal(await s.locator(`${bizim} [data-kp-cs-urun="mavi-sweatshirt"] .kp-ornek`).count(), 0, 'çizilemeyen kart olduğu gibi');
    // Üzerine gelince temanın geçişiyle görünür; not sağ altta, kutunun içinde ve etiketle çakışmıyor
    await s.locator(`${bizim} [data-kp-cs-urun="the-artist"] .card-product__media-inner`).hover();
    await s.waitForTimeout(700);
    assert.equal(await katman.evaluate((e) => getComputedStyle(e).opacity), '1');
    const notYer = await s.locator(`${bizim} [data-kp-cs-urun="the-artist"]`).evaluate((sl) => {
      const i = sl.querySelector('.card-product__media-inner').getBoundingClientRect(); const n = sl.querySelector('.kp-ornek__not').getBoundingClientRect(); const r = sl.querySelector('.kp-kk-rozet').getBoundingClientRect();
      return { icinde: n.right <= i.right && n.bottom <= i.bottom && n.left >= i.left, sagAlt: n.right > i.right - 30 && n.bottom > i.bottom - 30, cakisma: !(n.bottom < r.top || n.top > r.bottom || n.right < r.left || n.left > r.right) };
    });
    assert.ok(notYer.icinde && notYer.sagAlt && !notYer.cakisma, JSON.stringify(notYer));
    // Kadraj: Artist'te önizleme kart görselinde bulundu; spor çantada farklı çekim (kesit ortalanır)
    const depo = await s.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('kp-ornek-v3:')).map((k) => JSON.parse(localStorage.getItem(k))));
    const kadrajlar = depo.filter((x) => x.isim).map((x) => x.kadraj);
    assert.equal(kadrajlar.filter((x) => x && x.w > 0).length, 3, 'Le Koko kartlarında kadraj bulundu: ' + JSON.stringify(kadrajlar));
    assert.equal(kadrajlar.filter((x) => x === null).length, 3, 'spor / Tshirt: kesit ortalanır');
    const ak = kadrajlar.find((x) => x);
    // Çevrimdışı ölçüm (tam boy görsellerle): x≈0.18, y≈0.12, w≈0.63
    assert.ok(Math.abs(ak.x - 0.18) < 0.03 && Math.abs(ak.y - 0.12) < 0.03 && Math.abs(ak.w - 0.63) < 0.03, JSON.stringify(ak));
    // Tuval kartın görsel kutusuyla aynı boyutta
    const tv = await katman.evaluate((e) => { const c = e.querySelector('canvas'); const r = c.getBoundingClientRect(); const i = e.closest('.card-product__media-inner').getBoundingClientRect(); return [r.width / i.width, r.height / i.height]; });
    assert.ok(Math.abs(tv[0] - 1.05) < 0.02 && Math.abs(tv[1] - 1.05) < 0.02, 'temanın 1.05 büyütmesiyle kutuyu doldurur ' + tv);
    // Harf görselleri küçük boyutta
    assert.ok(istekler.filter((x) => /kisisel-harf-/.test(x)).every((x) => /[?&]width=(50|100|150)(&|$)/.test(x)));

    // İkinci açılış: önbellekten, editör yüklenmez, aynı isimler
    const ikinci = await ac({ viewport: { width: en, height: 900 } }, {}, baglam);
    await ikinci.s.waitForFunction((q) => document.querySelectorAll(q + ' .kp-ornek').length === 6, bizim, { timeout: 8000 });
    assert.deepEqual((await ikinci.s.locator(`${bizim} .kp-ornek__not`).allTextContents()).sort(), [...notlar].sort());
    assert.ok(!ikinci.istekler.some((x) => /kisisel-editor\.js/.test(x)), 'önbellekten: editör yüklenmedi');
    await ikinci.s.close();
  }
  await baglam.close();
}

/* ---------------- Fotoğraf ve hata ---------------- */
{
  const { baglam, s } = await ac({ viewport: { width: 1280, height: 900 } }, { foto: { 'the-artist': '//jantifox.test/cdn/shop/files/artist-kapak.png?v=1&width=700' } });
  await s.waitForFunction((q) => document.querySelectorAll(q + ' .kp-ornek').length === 6, bizim, { timeout: 20000 });
  assert.equal(await s.locator(`${bizim} [data-kp-cs-urun="the-artist"] .kp-ornek canvas`).count(), 1);
  assert.equal(await s.locator(`${bizim} [data-kp-cs-urun="the-artist"] .kp-ornek__not`).count(), 0, 'fotoğrafta not yok');
  await baglam.close();
}
{
  const { baglam, s } = await ac({ viewport: { width: 1280, height: 900 } }, { editorHata: true });
  await s.waitForTimeout(1500);
  assert.equal(await ornekSayisi(s), 0);
  assert.equal(await s.locator(`${bizim} .kp-kk-rozet`).count(), 7);
  await baglam.close();
}

/* ---------------- Mobil ---------------- */
for (const [ad, cihaz] of [['360', { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } }], ['390', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }]]) {
  const { baglam, s } = await ac(cihaz);
  // Temanın mobil kaydırıcısı: 2 kart, sağda bir sonraki kenar; temanın bölümüyle aynı kart genişliği
  const a = await kartOlc(s, bizim);
  const b = await kartOlc(s, tema2);
  for (const k of ['zemin', 'kose', 'baslik', 'fiyat', 'ust', 'bolumZemin', 'dolgu']) assert.deepEqual(a[k], b[k], ad + ' ' + k);
  assert.ok(Math.abs(a.en - b.en) <= 22, `${ad}: kart ${a.en} / tema ${b.en} (kaydırıcıda sonraki kart kenardan görünür)`);
  assert.equal(await s.locator(`${bizim} .splide__arrow`).evaluateAll((l) => l.filter((x) => x.offsetWidth).length), 0, 'mobilde ok yok');
  // Sekmeler tek satır, yatay kaydırılır
  const satir = await s.locator('[data-kp-cs-filtre]').evaluateAll((l) => new Set(l.map((b) => Math.round(b.getBoundingClientRect().top))).size);
  assert.equal(satir, 1);
  // Buton kart genişliğinde; alt buton tam genişlik; sayfada yatay taşma yok
  await s.locator(bizim).scrollIntoViewIfNeeded();
  await hizaKontrol(s, ad + 'px');
  // Kaydırıcı JS ile değil, tarayıcının kendi yatay kaydırmasıyla (scroll-snap) kayar
  const yerel = await s.evaluate((q) => { const l = document.querySelector(q + ' .splide__list'); const st = getComputedStyle(l); return [st.overflowX, st.scrollSnapType.split(' ')[0], st.transform, document.querySelectorAll(q + ' .splide__slide.is-visible').length]; }, bizim);
  assert.deepEqual(yerel, ['auto', 'x', 'none', 0], ad + ' yerel kaydırma (Splide kapalı)');
  // Kaydırıp NEW IN etiketli kartlara gelince de hiza aynı
  await s.evaluate((q) => { const l = document.querySelector(q + ' .splide__list'); const sl = l.querySelectorAll('.splide__slide'); l.scrollLeft = sl[2].offsetLeft - sl[0].offsetLeft; }, bizim);
  await s.waitForTimeout(1500);
  await hizaKontrol(s, ad + 'px (kaydırılmış)');
  await s.evaluate((q) => { document.querySelector(q + ' .splide__list').scrollLeft = 0; }, bizim);
  await s.waitForTimeout(1500);
  const btn = await s.locator(`${bizim} [data-kp-cs-urun="mavi-beyaz-cizgili-spor-canta"]`).evaluate((sl) => [Math.round(sl.querySelector('.kp-kk-kart-buton').getBoundingClientRect().width), Math.round(sl.querySelector('.card-wrapper').getBoundingClientRect().width)]);
  assert.equal(btn[0], btn[1]);
  const alt = await s.locator(`${bizim} .kp-cs__buton`).evaluate((b) => { const c = b.closest('.collection'); const st = getComputedStyle(c); return [b.getBoundingClientRect().width, c.getBoundingClientRect().width - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight)]; });
  assert.ok(Math.abs(alt[0] - alt[1]) < 1, 'alt buton tam genişlik ' + alt);
  assert.ok(await s.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'yatay taşma yok');
  // Dokunmatik ekranda örnek tasarım sabit görünür (otomatik yer değiştirme yok)
  await s.locator(bizim).scrollIntoViewIfNeeded();
  await s.waitForFunction((q) => document.querySelectorAll(q + ' .kp-ornek').length >= 2, bizim, { timeout: 20000 });
  const acik = () => s.locator(`${bizim} .kp-ornek`).evaluateAll((l) => l.map((e) => e.classList.contains('kp-ornek--acik') && getComputedStyle(e).opacity === '1'));
  await s.waitForTimeout(400);
  const once = await acik();
  assert.ok(once.length >= 2 && once.every(Boolean), ad + ' sabit görünür ' + once);
  await s.waitForTimeout(3600);
  assert.deepEqual(await acik(), once, ad + ' yer değiştirmiyor');
  await baglam.close();
}

await t.close();
const bizimHatalar = hatalar.filter((m) => !/Shopify|theme|PUB_SUB|publish|subscribe|routes|Cannot read properties of null \(reading 'addEventListener'\)/.test(m));
assert.deepEqual(bizimHatalar, [], 'sayfa hataları: ' + hatalar.join(' | '));
console.log('çok satanlar: tamam', hatalar.length ? '(tema betiği uyarıları: ' + [...new Set(hatalar)].join(' | ').slice(0, 300) + ')' : '');
