// Kategori sayfası: kişiselleştirilebilir kartlarda etiket, "Kişiselleştir" ve sepet butonu (masaüstü görselin üstünde,
// mobilde görselin altında), kapalı kartlarda mobilde boş yer; "Sadece kişiselleştirilebilenler" filtresi (başka
// sayfadaki ürünler şablondan eklenir, tema ızgarayı yeniden çizince korunur); sepete ekle bildirimi ve "Tasarla";
// ürün sayfasında ?kisisellestir=1 ile editörün açık başlaması. Sayfa, temanın kart yapısıyla aynı iskelettir.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node koleksiyon-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const kok = new URL('../../', import.meta.url).pathname;
const js = readFileSync(kok + 'assets/kisisel-koleksiyon.js', 'utf8');
const css = readFileSync(kok + 'assets/kisisel-koleksiyon.css', 'utf8');

const kart = (h, baslik, rozet = '') => `
<div class="card-wrapper product-card-wrapper">
  <div class="card-product">
    <div class="card-product__media relative" style="position:relative">
      <div class="card-product__media-inner">
        <a class="product-link block" href="/products/${h}" title="${baslik}"><div style="aspect-ratio:4/5;background:#eee"></div></a>
        ${rozet}
        <div class="card__badge top left"></div>
      </div>
    </div>
    <div class="card__content pt-6"><div class="card__information"><div class="card__heading mb-2"><a href="/products/${h}" class="product-link">${baslik}</a></div></div></div>
  </div>
</div>`;
const li = (h, b, r) => `<li class="grid__item">${kart(h, b, r)}</li>`;
const izgaraHtml = (ogeler) => `
  <div class="flex"><facet-filters-form class="facets"><form id="FacetSortForm"><div class="facet-filters sorting" style="display:flex">
    <div class="product-count-vertical"><span id="ProductCountDesktop">5 ürün</span></div>
    <div class="facet-filters__field"><select id="SortBy"><option>Öne çıkan</option></select></div>
  </div></form></facet-filters-form></div>
  <div class="collection"><div class="relative"><div class="loading-overlay"></div>
    <ul id="product-grid" class="grid grid-cols-2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${ogeler}</ul>
    <nav class="pagination-wrapper"><a href="?page=2">2</a></nav>
  </div></div>`;
const veri = {
  urunler: {
    'kanvas-lacivert-tote-canta': { u: '/products/kanvas-lacivert-tote-canta', b: 'Tote', k: true, v: [{ id: 111, t: 'Default Title', a: true }] },
    'bej-tshirt': { u: '/products/bej-tshirt', b: 'Bej Tişört', k: true, v: [{ id: 201, t: 'S', a: true }, { id: 202, t: 'M', a: false }, { id: 203, t: 'L', a: true }] },
    'the-gamer': { u: '/products/the-gamer', b: 'The Gamer', k: true, v: [{ id: 301, t: 'Default Title', a: true }] },
    'baska-kategoride': { u: '/products/baska-kategoride', b: 'Başka', k: false, v: [{ id: 401, t: 'Default Title', a: true }] }
  }
};
const sayfa1 = [li('kanvas-lacivert-tote-canta', 'Tote', '<span class="card-new-in-badge">NEW IN</span>'), li('patch-kalp', 'Kalp Patch'), li('bej-tshirt', 'Bej Tişört'), li('sapka', 'Şapka')].join('');
const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style>
<style>.card-new-in-badge{position:absolute;top:1rem;left:1rem;z-index:3;background:#fff;padding:.4rem .7rem}html{font-size:62.5%}body{margin:0;font-family:sans-serif;font-size:1.4rem}.lg-gizli{display:block}@media(min-width:1024px){.lg-gizli{display:none}}</style></head><body>
<script>window.routes={cart_add_url:'/cart/add'};let subscribers={};const PUB_SUB_EVENTS={cartUpdate:'cart-update'};window.yayinlar=[];function publish(a,b){window.yayinlar.push(a)}</script>
<div id="cart-icon-bubble"><span class="sayi">0</span></div>
<div class="facets-container"><div class="lg-gizli"><div class="flex" style="display:flex;justify-content:space-between">
  <div class="view-mode"><button>1</button><button>2</button></div>
  <drawer-button class="open-drawer-btn drawer-filter"><span class="btn btn-outline">Filtrele ve sırala</span></drawer-button>
</div></div></div>
<div id="ProductGridContainer" class="product-grid-container">${izgaraHtml(sayfa1)}</div>
<script type="application/json" id="KisiselKoleksiyon">${JSON.stringify(veri)}</script>
<template id="KisiselKoleksiyonKartlar"><li class="grid__item" data-kp-kk-ek="kanvas-lacivert-tote-canta">${kart('kanvas-lacivert-tote-canta', 'Tote')}</li><li class="grid__item" data-kp-kk-ek="bej-tshirt">${kart('bej-tshirt', 'Bej Tişört')}</li><li class="grid__item" data-kp-kk-ek="the-gamer">${kart('the-gamer', 'The Gamer')}</li></template>
<script>${js}</script>
</body></html>`;

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const hatalar = [];

async function ac(cihaz) {
  const baglam = await t.newContext(cihaz);
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  const eklenen = [];
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/cart/add.js') {
      const g = JSON.parse(r.request().postData());
      eklenen.push(g);
      if (g.items[0].id === 999) return r.fulfill({ status: 422, contentType: 'application/json', body: '{"status":422,"description":"Stokta yok"}' });
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: g.items }) });
    }
    if (url.searchParams.get('sections')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ 'cart-icon-bubble': '<div class="shopify-section"><span class="sayi">1</span></div>' }) });
    return r.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
  });
  await s.goto('https://jantifox.test/collections/canta');
  return { baglam, s, eklenen };
}
const gorunur = (s, q) => s.locator(q).evaluateAll((els) => els.map((e) => !!(e.offsetWidth || e.offsetHeight)));

/* ---------------- Masaüstü ---------------- */
{
  const { baglam, s, eklenen } = await ac({ viewport: { width: 1280, height: 900 } });
  // Etiket ve butonlar yalnızca açık ürünlerde
  assert.equal(await s.locator('.kp-kk-rozet').count(), 2);
  assert.deepEqual(await s.locator('#product-grid > li').evaluateAll((l) => l.map((x) => x.getAttribute('data-kp-kk-urun'))), ['kanvas-lacivert-tote-canta', '', 'bej-tshirt', '']);
  assert.equal(await s.locator('.kp-kk-rozet').first().evaluate((e) => [...e.children].filter((c) => c.offsetWidth).map((c) => c.textContent).join('')), '✎ Kişiselleştirilebilir');
  assert.equal(await s.locator('.kp-kk-rozet__ikon').first().evaluate((e) => getComputedStyle(e).color), 'rgb(179, 20, 27)');
  assert.ok(await s.locator('.kp-kk-rozet').first().evaluate((e) => e.classList.contains('kp-kk-rozet--alt')), 'NEW IN varsa etiket altına iner');
  assert.ok(!(await s.locator('.kp-kk-rozet').nth(1).evaluate((e) => e.classList.contains('kp-kk-rozet--alt'))));
  // Butonlar görselin üzerinde, her zaman görünür (hover gerekmez); mobil buton ve boşluk masaüstünde yok
  assert.deepEqual(await gorunur(s, '.kp-kk-eylem'), [true, true]);
  assert.deepEqual(await gorunur(s, '.kp-kk-mobil'), [false, false]);
  assert.deepEqual(await gorunur(s, '.kp-kk-bosluk'), [false, false]);
  const ilk = s.locator('#product-grid > li').first();
  const medya = await ilk.locator('.card-product__media').boundingBox();
  const eylem = await ilk.locator('.kp-kk-eylem').boundingBox();
  assert.ok(eylem.y + eylem.height <= medya.y + medya.height + 0.5 && eylem.y > medya.y + medya.height / 2, 'butonlar görselin alt kısmında');
  assert.equal(await ilk.locator('.kp-kk-kisisel').getAttribute('href'), '/products/kanvas-lacivert-tote-canta?kisisellestir=1');
  assert.equal(await ilk.locator('.kp-kk-kisisel').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(179, 20, 27)');
  // Kapalı ürün kartı değişmedi
  assert.equal(await s.locator('#product-grid > li').nth(1).locator('.kp-kk-rozet, .kp-kk-eylem, .kp-kk-mobil').count(), 0);

  // Filtre düğmesi sıralamanın yanında
  const filtre = s.locator('.facet-filters.sorting [data-kp-kk-filtre]');
  assert.equal((await filtre.textContent()).replace(/\s+/g, ' ').trim(), '✎Sadece kişiselleştirilebilenler');
  // Temanın kendi buton sınıfları: kapalıyken çizgili
  assert.deepEqual(await filtre.evaluate((e) => [e.classList.contains('btn'), e.classList.contains('btn-outline'), e.classList.contains('btn-primary')]), [true, true, false]);
  assert.equal(await filtre.evaluate((e) => e.nextElementSibling.className), 'facet-filters__field');
  assert.deepEqual(await gorunur(s, '.kp-kk-filtre--mobil'), [false]);

  // Tek seçenekli ürün: sepete doğrudan eklenir, bildirim ve "Tasarla"
  await ilk.locator('[data-kp-kk-sepet]').click();
  await s.locator('.kp-kk-bildirim--acik').waitFor();
  assert.deepEqual(eklenen[0], { items: [{ id: 111, quantity: 1 }] });
  assert.equal((await s.locator('.kp-kk-bildirim').textContent()).replace(/\s+/g, ' ').trim(), 'Sepete eklendi · Kişiselleştirmek ister misin? Tasarla →');
  assert.equal(await s.locator('.kp-kk-bildirim a').getAttribute('href'), '/products/kanvas-lacivert-tote-canta?kisisellestir=1');
  await s.waitForFunction(() => document.querySelector('#cart-icon-bubble .sayi').textContent === '1');
  assert.ok(await s.evaluate(() => window.yayinlar.includes('cart-update')));

  // Birden çok seçenek: beden seçimi; stokta olmayan pasif
  const ucuncu = s.locator('#product-grid > li').nth(2);
  await ucuncu.locator('[data-kp-kk-sepet]').click();
  assert.deepEqual(await ucuncu.locator('.kp-kk-secim button').evaluateAll((b) => b.map((x) => [x.textContent, x.disabled])), [['S', false], ['M', true], ['L', false]]);
  await ucuncu.locator('.kp-kk-secim button', { hasText: 'L' }).click();
  await s.waitForFunction(() => document.querySelectorAll('.kp-kk-secim').length === 0);
  await s.waitForTimeout(100);
  assert.deepEqual(eklenen[1], { items: [{ id: 203, quantity: 1 }] });
  assert.match(await s.locator('.kp-kk-bildirim a').getAttribute('href'), /bej-tshirt\?kisisellestir=1$/);
  // Seçim dışarı tıklayınca kapanır
  await ucuncu.locator('[data-kp-kk-sepet]').click();
  assert.equal(await s.locator('.kp-kk-secim').count(), 1);
  await s.mouse.click(5, 5);
  assert.equal(await s.locator('.kp-kk-secim').count(), 0);

  // Filtre: yalnızca açık ürünler; başka sayfadaki The Gamer şablondan eklenir; sayfa numaraları gizli; koyu zemin
  await filtre.click();
  assert.equal(await s.locator('.facet-filters.sorting [data-kp-kk-filtre]').getAttribute('aria-pressed'), 'true');
  // Açıkken dolu (temanın btn-primary'si)
  assert.deepEqual(await s.locator('.facet-filters.sorting [data-kp-kk-filtre]').evaluate((e) => [e.classList.contains('btn-outline'), e.classList.contains('btn-primary')]), [false, true]);
  const gorunenler = () => s.locator('#product-grid > li').evaluateAll((l) => l.filter((x) => x.offsetHeight).map((x) => x.getAttribute('data-kp-kk-urun')));
  assert.deepEqual(await gorunenler(), ['kanvas-lacivert-tote-canta', 'bej-tshirt', 'the-gamer']);
  assert.equal(await s.locator('#product-grid > li[data-kp-kk-ek] .kp-kk-rozet').count(), 1, 'eklenen kart da işaretlendi');
  assert.deepEqual(await gorunur(s, '.pagination-wrapper'), [false]);
  assert.match(s.url(), /kisisel=1/);
  // Tema ızgarayı yeniden çizer (sıralama): filtre korunur, kartlar yeniden işaretlenir, düğme yeniden eklenir
  await s.evaluate((h) => { document.getElementById('ProductGridContainer').innerHTML = h; }, izgaraHtml([li('bej-tshirt', 'Bej Tişört'), li('sapka', 'Şapka')].join('')));
  await s.waitForFunction(() => document.querySelector('.facet-filters.sorting [data-kp-kk-filtre]'));
  await s.waitForTimeout(50);
  assert.deepEqual(await gorunenler(), ['bej-tshirt', 'kanvas-lacivert-tote-canta', 'the-gamer']);
  assert.equal(await s.locator('.facet-filters.sorting [data-kp-kk-filtre]').getAttribute('aria-pressed'), 'true');
  // Yenileyince de açık kalır
  await s.reload();
  await s.waitForTimeout(100);
  assert.deepEqual(await gorunenler(), ['kanvas-lacivert-tote-canta', 'bej-tshirt', 'the-gamer']);
  // Kapat: eski hâl
  await s.locator('.facet-filters.sorting [data-kp-kk-filtre]').click();
  assert.deepEqual(await gorunenler(), ['kanvas-lacivert-tote-canta', '', 'bej-tshirt', '']);
  assert.deepEqual(await gorunur(s, '.pagination-wrapper'), [true]);
  assert.doesNotMatch(s.url(), /kisisel=1/);

  await baglam.close();
}

/* ---------------- Mobil ---------------- */
{
  const { baglam, s } = await ac({ ...devices['iPhone 13'] });
  assert.deepEqual(await s.locator('.kp-kk-rozet').evaluateAll((l) => l.map((e) => [...e.children].filter((c) => c.offsetWidth).map((c) => c.textContent).join(''))), ['✎ Kişiselleştir', '✎ Kişiselleştir']);
  assert.deepEqual(await gorunur(s, '.kp-kk-eylem'), [false, false], 'mobilde görselin üstünde buton yok');
  assert.deepEqual(await gorunur(s, '.kp-kk-mobil'), [true, true]);
  assert.deepEqual(await gorunur(s, '.kp-kk-bosluk'), [true, true], 'kapalı kartlarda boş yer');
  // Buton görselin hemen altında, ürün adının üstünde, kart genişliğinde
  const ilk = s.locator('#product-grid > li').first();
  const medya = await ilk.locator('.card-product__media').boundingBox();
  const buton = await ilk.locator('.kp-kk-mobil').boundingBox();
  const ad = await ilk.locator('.card__heading').boundingBox();
  assert.ok(buton.y >= medya.y + medya.height && buton.y + buton.height <= ad.y, 'görsel < buton < ad');
  assert.ok(Math.abs(buton.width - medya.width) < 1, 'kart genişliğinde');
  assert.equal(await ilk.locator('.kp-kk-mobil').getAttribute('href'), '/products/kanvas-lacivert-tote-canta?kisisellestir=1');
  // İki sütunda hizalar: yan yana kartların ürün adları aynı hizada
  const adlar = await s.locator('#product-grid > li .card__heading').evaluateAll((l) => l.map((x) => Math.round(x.getBoundingClientRect().top)));
  assert.equal(adlar[0], adlar[1]);
  assert.equal(adlar[2], adlar[3]);
  // Filtre düğmesi "Filtrele ve sırala"nın altında, kendi satırında, tam genişlikte; metin kesilmiyor; masaüstü düğmesi gizli
  const mobilFiltre = s.locator('.kp-kk-filtre--mobil');
  assert.deepEqual(await gorunur(s, '.kp-kk-filtre--mobil'), [true]);
  assert.deepEqual(await gorunur(s, '.kp-kk-filtre--masaustu'), [false]);
  const db = await s.locator('drawer-button').boundingBox();
  const fb = await mobilFiltre.boundingBox();
  const sb = await s.locator('drawer-button').evaluate((e) => { const r = e.parentElement.getBoundingClientRect(); return { x: r.left, w: r.width }; });
  assert.ok(fb.y >= db.y + db.height - 1, 'altında');
  assert.ok(Math.abs(fb.x - sb.x) < 1 && Math.abs(fb.width - sb.w) < 1, 'tam genişlik');
  assert.ok(fb.x + fb.width <= 390, 'ekrandan taşmıyor');
  assert.equal(await mobilFiltre.evaluate((e) => e.scrollWidth <= e.clientWidth + 1), true, 'metin kesilmiyor');
  await mobilFiltre.tap();
  assert.equal(await mobilFiltre.getAttribute('aria-pressed'), 'true');
  assert.equal(await s.locator('#product-grid > li:visible').count(), 3);
  await baglam.close();
}

/* ---------------- Ürün sayfası: ?kisisellestir=1 ---------------- */
{
  const urun = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
  const baglam = await t.newContext({ ...devices['iPhone 13'] });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
    if (url.pathname.startsWith('/api/')) return r.fulfill({ contentType: 'application/json', body: '{"data":{}}' });
    return r.fulfill({ contentType: 'text/html', body: urun });
  });
  await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta?variant=5&kisisellestir=1');
  await s.locator('.kp-onizleme .kp-sahne').waitFor();
  assert.equal(await s.evaluate(() => !document.querySelector('kisisel-kart').editor.el.hidden), true, 'editör açık başladı');
  assert.equal(new URL(s.url()).search, '?variant=5', 'parametre adresten silindi');
  // Kapatınca normal ürün sayfası; yenileyince editör açılmaz
  await s.locator('[data-kp-kapat]').first().click();
  await s.waitForTimeout(200);
  assert.equal(await s.evaluate(() => document.querySelector('kisisel-kart').editor.el.hidden), true);
  await s.reload();
  await s.waitForTimeout(400);
  assert.equal(await s.evaluate(() => { const e = document.querySelector('kisisel-kart').editor.el; return !e || e.hidden; }), true);
  await baglam.close();
}

assert.deepEqual(hatalar, []);
await t.close();
console.log('koleksiyon-e2e: tamam');
