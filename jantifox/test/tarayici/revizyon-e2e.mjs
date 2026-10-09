// Mobil arayüz revizyonu: davet kartı, sabit önizleme, eklenenler etiketleri, doluluk, ikon ızgarası ve "Sığmaz",
// ortak uyarı kutusu, alan sınırı, havada araç çubuğu, özetten sepete ekleme, "Sadece çantayı al".
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node revizyon-e2e.mjs  (önce: node sayfa-uret.mjs)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
// Akış: Tasarım (Metin / Görsel / Aksesuar araçları) → Özet
const ADIM_SAYISI = 2;
const ADIM_METNI = /^1 Tasarım 2 Özet$/;
const { chromium, devices } = require('playwright');

const html = readFileSync(new URL('sayfa.html', import.meta.url), 'utf8');
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const s = await baglam.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(e.message));
let eklenen = null;
let sonEklenen = null;
let sepetYanit = '{"items":[]}';
let temaGonder = 0;
await s.route('https://jantifox.test/**', async (r) => {
  const url = new URL(r.request().url());
  if (url.pathname === '/cart/add.js') {
    eklenen = JSON.parse(r.request().postData());
    sonEklenen = eklenen;
    return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  }
  if (url.pathname === '/cart/add') {
    temaGonder++;
    return r.fulfill({ contentType: 'text/html', body: '<p>tema sepeti</p>' });
  }
  if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: sepetYanit });
  if (url.pathname === '/cart') return r.fulfill({ contentType: 'text/html', body: '<p>sepet</p>' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
const cdp = await baglam.newCDPSession(s);
const merkezi = (q) => s.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, q);
const metin = (q) => s.locator(q).textContent();
const gorunur = (q) => s.locator(q).isVisible();

await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });

// 1) Davet kartı
const kart = (await s.locator('kisisel-kart').innerText()).replace(/\s+/g, ' ');
assert.match(kart, /Ürünü kişiselleştir/);
assert.match(kart, /İsim, rakam ve ikon patch'lerini seç, ürünün üzerinde canlı gör\./);
assert.match(kart, /Kişiselleştirmeye başla/);
assert.match(kart, /Her patch 330 TL/);
assert.match(kart, /Sadece çantayı al/);
assert.equal(await s.locator('kisisel-kart input[type="radio"]').count(), 0, 'eski düğme yok');
assert.equal(await s.locator('[data-kisisel-ornek] img, [data-kisisel-ornek] span').count(), 3, 'örnek görselde 3 harf');
// Temanın kırmızı kutusu gizli, kartın içinde yeşil not
assert.equal(await s.locator('.bag-notice').isVisible(), false, 'kırmızı kutu gizli');
assert.match(kart, /Ön yüzdeki Velcro yüzeye patch'leri sen takarsın, istediğin zaman yerini değiştirirsin\./);
assert.doesNotMatch(kart, /cırt/i);
// "Kişiselleştirmeye başla" markanın kırmızısı, beyaz yazı
const renk = await s.evaluate(() => { const c = getComputedStyle(document.querySelector('[data-kisisel-davet] [data-kisisel-ac]')); return [c.backgroundColor, c.color]; });
assert.deepEqual(renk, ['rgb(179, 20, 27)', 'rgb(255, 255, 255)']);

// 2) Editör: başlık yok; adımlar en üst satırda kapatma butonunun solunda, önizleme sabit
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('.kp-editor').waitFor({ state: 'visible' });
const sira = await s.evaluate(() => {
  const y = (q) => document.querySelector(q).getBoundingClientRect().top;
  return { ust: y('.kp-ust'), adim: y('.kp-adimlar'), onizleme: y('.kp-onizleme'), panel: y('.kp-kaydir') };
});
assert.ok(Math.abs(sira.ust - sira.adim) < 2 && sira.adim < sira.onizleme && sira.onizleme < sira.panel, JSON.stringify(sira));
assert.equal(await s.locator('.kp-ust .kp-adimlar').count(), 1, 'adımlar üst satırda');
assert.ok((await s.locator('.kp-editor [data-kp-baslik]').boundingBox()).width <= 1, '"Tasarımını oluştur" görünmez (yalnızca ekran okuyucu)');
const ustSatir = await s.evaluate(() => { const r = (q) => document.querySelector(q).getBoundingClientRect(); return { ust: r('.kp-ust').height, adim: r('.kp-adimlar').right, kapat: r('.kp-kapat').left, sw: document.querySelector('.kp-adimlar').scrollWidth, cw: document.querySelector('.kp-adimlar').clientWidth }; });
assert.ok(ustSatir.ust <= 64 && ustSatir.adim <= ustSatir.kapat + 1 && ustSatir.sw <= ustSatir.cw, 'tek satır, kaydırmasız, ≤64 px, kapatın solunda: ' + JSON.stringify(ustSatir));
// İki adım: "1 Tasarım" solda, "2 Özet" sağda (X'in solunda); arada çizgi boşluğun tamamını kaplar
assert.match((await s.locator('.kp-adimlar').innerText()).replace(/\s+/g, ' '), ADIM_METNI);
const adimYer = await s.evaluate(() => {
  const r = (q) => document.querySelector(q).getBoundingClientRect();
  const t = r('[data-kp-adim-oge="tasarim"]'), o = r('[data-kp-adim-oge="ozet"]'), c = r('.kp-adim-cizgi'), x = r('.kp-kapat'), n = r('.kp-adimlar');
  const kirpik = [...document.querySelectorAll('.kp-adim__daire')].some((d) => { const b = d.getBoundingClientRect(); return b.top < n.top - 1 || b.bottom > n.bottom + 1; });
  return { solda: t.left - n.left < 20, sagda: x.left - o.right < 24, cizgi: c.left - t.right < 12 && o.left - c.right < 12 && c.width > 100, kirpik };
});
assert.deepEqual(adimYer, { solda: true, sagda: true, cizgi: true, kirpik: false });
// Aktif adım 30 px kırmızı daire (beyaz kalın numara, halka), adı kırmızı kalın; sıradaki 26 px beyaz
const adimDurum = async () => (await s.waitForTimeout(350), s.$$eval('.kp-adim-oge', (l) => l.map((li) => {
  const d = li.querySelector('.kp-adim__daire'); const cs = getComputedStyle(d); const ad = getComputedStyle(li.querySelector('.kp-adim'));
  return { w: Math.round(d.getBoundingClientRect().width), zemin: cs.backgroundColor, halka: cs.boxShadow !== 'none', metin: li.querySelector('.kp-adim__daire').innerText.trim(), adRenk: ad.color, adKalin: ad.fontWeight };
})));
const cizgiDolu = () => s.evaluate(() => { const c = document.querySelector('.kp-adim-cizgi').getBoundingClientRect().width; return Math.round(100 * document.querySelector('.kp-adim-cizgi__dolu').getBoundingClientRect().width / c); });
let ad0 = await adimDurum();
assert.deepEqual([ad0[0].w, ad0[0].zemin, ad0[0].halka, ad0[0].metin, ad0[0].adRenk, ad0[0].adKalin], [30, 'rgb(179, 20, 27)', true, '1', 'rgb(179, 20, 27)', '700']);
assert.deepEqual([ad0[1].w, ad0[1].zemin, ad0[1].metin], [26, 'rgb(255, 255, 255)', '2']);
assert.equal(await cizgiDolu(), 0, 'Tasarım\'da çizgi boş');
// Araçlar önizlemenin altında: Metin (varsayılan, koyu) / Görsel / Aksesuar; ~58 px, simge üstte
const arac = await s.evaluate(() => {
  const o = document.querySelector('.kp-gorunum').getBoundingClientRect();
  return [...document.querySelectorAll('.kp-editor:not(.kp-editor--alt) .kp-arac-dugme')].map((b) => {
    const r = b.getBoundingClientRect(); const si = b.querySelector('.kp-arac-dugme__simge').getBoundingClientRect(); const ad = b.querySelector('.kp-arac-dugme__ad').getBoundingClientRect();
    return { ad: b.querySelector('.kp-arac-dugme__ad').textContent, h: Math.round(r.height), alti: r.top >= o.bottom, simgeUstte: si.bottom <= ad.top + 1, zemin: getComputedStyle(b).backgroundColor };
  });
});
assert.deepEqual(arac.map((x) => x.ad), ['Metin ekle', 'Görsel ekle', 'Aksesuar ekle']);
assert.ok(arac.every((x) => Math.abs(x.h - 58) <= 4 && x.alti && x.simgeUstte), JSON.stringify(arac));
assert.deepEqual(arac.map((x) => x.zemin), ['rgb(30, 30, 36)', 'rgb(255, 255, 255)', 'rgb(255, 255, 255)']);
assert.equal(await s.locator('[data-kp-gec]').count(), 0, '"… istemiyorum" butonları yok');
assert.equal(await metin('[data-kp-ileri]'), 'Özete geç →');
// Yazı yaz, Görsel aracına geç: adım yine Tasarım
await s.locator('#kp-isim').fill('gokhan');
await s.locator('[data-kp-adim="ikon"]').click();
ad0 = await adimDurum();
assert.equal(ad0[0].zemin, 'rgb(179, 20, 27)', 'araç değişince adım Tasarım');
// Özet: Tasarım koyu daire ✓, Özet kırmızı, çizgi soldan sağa dolu; araçlar gizli
await s.locator('[data-kp-adim="ozet"]').click();
ad0 = await adimDurum();
assert.deepEqual([ad0[0].w, ad0[0].zemin, ad0[0].metin], [26, 'rgb(30, 30, 36)', '✓']);
assert.equal(ad0[1].zemin, 'rgb(179, 20, 27)');
assert.equal(await cizgiDolu(), 100, 'Özet\'te çizgi dolu');
assert.equal(await gorunur('[data-kp-araclar]'), false);
// Tasarım'a dokununca son kullanılan araca dönülür
await s.locator('[data-kp-adim="tasarim"]').click();
assert.equal(await gorunur('[data-kp-panel="ikon"]'), true, 'son araç: Görsel');
await s.locator('[data-kp-adim="yazi"]').click();
await s.locator('#kp-isim').fill('');

await s.locator('#kp-isim').fill('ece');
await s.locator('#kp-isim').blur();
await s.locator('[data-kp-adim="ikon"]').click();
await s.waitForTimeout(200);
// Panel kayar, önizleme yerinde kalır
const onizlemeOnce = await s.evaluate(() => document.querySelector('.kp-onizleme').getBoundingClientRect().top);
await s.evaluate(() => { document.querySelector('.kp-kaydir').scrollTop = 400; });
await s.waitForTimeout(100);
assert.equal(await s.evaluate(() => document.querySelector('.kp-onizleme').getBoundingClientRect().top), onizlemeOnce, 'önizleme kaymaz');
await s.evaluate(() => { document.querySelector('.kp-kaydir').scrollTop = 0; });

// 3) Görsel: Tümü ızgarası 4 sütun, fiyat arama kutusunun altında bir kez, kartlarda fiyat yok
assert.equal(await metin('[data-kp-ikon-fiyat]'), 'Tek patch 330 TL');
await s.locator('[data-kp-kategori="Spor"]').click();
assert.equal(await metin('[data-kp-ikon-fiyat]'), 'Tek patch 330 TL');
assert.equal(await s.locator('[data-kp-panel="ikon"] .kp-secim__fiyat').count(), 0);
const sutun = await s.evaluate(() => getComputedStyle(document.querySelector('.kp-izgara--ikon')).gridTemplateColumns.split(' ').length);
assert.equal(sutun, 4);

// Eklenenler etiketleri; doluluk çubuğu yok
assert.equal(await s.locator('.kp-cip').count(), 1, 'isim etiketi');
assert.equal(await metin('.kp-cip__ad'), 'ECE');
assert.equal(await s.locator('[data-kp-doluluk], [data-kp-doluluk-metin]').count(), 0, 'doluluk çubuğu kaldırıldı');
assert.equal(await s.locator('[data-kp-kalan]').count(), 0, 'eski "ikonluk yer kaldı" cümlesi yok');
assert.equal(await s.locator('[data-kp-eklenen]').count(), 0, 'eski liste yok');

// Futbol Topu'nu alan dolana kadar ekle: "Yer aç" etiketi ve soluk görünüm yok, her zaman eklenir; yer kalmayınca kenara alınır
assert.equal(await s.locator('.kp-secim--sigmaz').count(), 0);
assert.equal(await s.locator('[data-kp-ikon="2"] .kp-secim__rozet').count(), 0, 'Yer aç etiketi yok');
const siraBas = await s.$$eval('[data-kp-gorsel-icerik] [data-kp-ikon]', (b) => b.map((x) => x.getAttribute('data-kp-ikon')));
for (let i = 0; i < 20; i++) {
  await s.locator('[data-kp-ikon="2"]').click();
  if (await s.locator('[data-kp-kenar-grup]').count()) break;
}
console.log('etiket:', await s.locator('.kp-cip').count());
assert.equal(await s.locator('[data-kp-kenar-grup]').count(), 1, 'sığmayan ikon kenara alındı');
assert.equal(await metin('[data-kp-bildirim]'), 'Futbol Topu için çantada yer yok, kenara alındı. Yer açıp çantaya sürüklersen fiyata eklenir.');
assert.deepEqual(await s.$$eval('[data-kp-gorsel-icerik] [data-kp-ikon]', (b) => b.map((x) => x.getAttribute('data-kp-ikon'))), siraBas, 'ızgara sırası değişmez');
// Eklenenlerde soluk ve ↧; altta kenar notu ve "Sığdırmayı dene"
assert.equal(await s.locator('.kp-cip--kenar').count(), 1);
assert.match(await metin('.kp-cip--kenar .kp-cip__ad'), /^↧Futbol Topu$/);
assert.match(await metin('[data-kp-kenar-not]'), /^Kenarda 1 patch var\. Fiyata dahil değil; istersen Özet'te sepete ekleyebilirsin\.\s?Sığdırmayı dene$/);
const adet = await s.locator('.kp-cip').count();
// Bir ikonu kaldır (çantadaki), Sığdırmayı dene → kenardaki çantaya yerleşir
await s.locator('.kp-cip:not(.kp-cip--kenar)').last().locator('.kp-cip__kaldir').click();
assert.equal(await s.locator('.kp-cip').count(), adet - 1);
await s.locator('[data-kp-sigdir]').click();
assert.equal(await s.locator('[data-kp-kenar-grup]').count(), 0, 'kenar boşaldı');
assert.equal(await metin('[data-kp-bildirim]'), 'Hepsi çantaya yerleşti.');
assert.equal(await gorunur('[data-kp-kenar-not]'), false);
assert.equal(await s.locator('.kp-parca--hatali').count(), 0);

// Etikete dokun → patch seçilir; araç çubuğu önizlemenin altındaki satırda etiketlerin yerine geçer, sayfa zıplamaz
const cip = s.locator('.kp-cip').nth(1);
const olcum = () => s.evaluate(() => ({
  satir: document.querySelector('.kp-satir').getBoundingClientRect().height,
  panel: document.querySelector('.kp-kaydir').getBoundingClientRect().top
}));
const once = await olcum();
await cip.locator('.kp-cip__ad').click();
assert.equal(await gorunur('[data-kp-secim-cubuk]'), true);
assert.equal(await gorunur('[data-kp-etiketler]'), false, 'etiketler yerine araç çubuğu');
const sonra = await olcum();
assert.deepEqual(sonra, once, 'satır yüksekliği ve panel yeri aynı');
// Araç çubuğu önizlemenin hemen altındaki sabit satırda: solda seçili öğenin adı, sağda düğmeler
const aracYer = await s.evaluate(() => {
  const a = document.querySelector('[data-kp-secim-cubuk]').getBoundingClientRect();
  const o = document.querySelector('.kp-gorunum').getBoundingClientRect();
  const ad = document.querySelector('[data-kp-secili-ad]').getBoundingClientRect();
  const d = document.querySelector('.kp-arac__dugmeler').getBoundingClientRect();
  return a.top >= o.bottom && a.top - o.bottom < 16 && ad.width > 20 && ad.right <= d.left + 1;
});
assert.ok(aracYer, 'araç çubuğu önizlemenin altında, adı solda');
assert.equal(await s.locator('.kp-onizleme__ic [data-kp-secim-cubuk]').count(), 0, 'önizlemenin üzerinde değil');
assert.deepEqual(await s.$$eval('[data-kp-secim-cubuk] button', (b) => b.filter((x) => !x.hidden).map((x) => x.textContent.trim())), ['↺ 15°', '↻ 15°', 'Sil', 'Tamam']);
// Tamam seçimi kaldırır, satır yine etiketler
await s.locator('[data-kp-secim-kaldir]').click();
assert.equal(await gorunur('[data-kp-secim-cubuk]'), false);
assert.equal(await gorunur('[data-kp-etiketler]'), true);

// 5) Alan sınırı: normalde görünmez; sürüklerken soluk; taşınca kırmızı
const alanOpak = () => s.evaluate(() => getComputedStyle(document.querySelector('.kp-alan')).opacity);
assert.equal(await alanOpak(), '0', 'sınır normalde görünmez');
const disariSurukle = async (bekleBildirim) => {
  const p0 = await merkezi('.kp-parca--icon');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p0[0], y: p0[1], id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0[0] + 4, y: p0[1] + 4, id: 0 }] });
  await s.waitForTimeout(300);
  const soluk = Number(await alanOpak());
  assert.ok(soluk > 0 && soluk < 0.5, 'sürüklerken soluk: ' + soluk);
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0[0] + i * 40, y: p0[1] + 4, id: 0 }] });
  assert.equal(await s.locator('.kp-sahne--tasma').count(), 1);
  assert.equal(await s.evaluate(() => getComputedStyle(document.querySelector('.kp-alan')).animationName), 'kp-nabiz');
  // Sürüklerken metin yok (eski "Bırakırsan son yerine döner" kalktı), yalnızca kırmızı
  assert.ok(!/Bırakırsan|taşıyor/.test(await s.locator('[data-kp-bildirim]').textContent()));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(300);
  assert.equal(await s.locator('.kp-sahne--tasma').count(), 0);
  // Bıraktığı yerde kalır: "!" işareti ve altta uyarı; Alana yerleştir ile geri
  assert.equal(await s.locator('.kp-parca--hatali').count(), 1);
  assert.match(await metin('[data-kp-yer-uyari]'), /Velcro alanın dışına taşıyor\. İstediğin gibi düzenlemeye devam edebilirsin, sepete eklemeden önce düzeltmen yeterli\./);
  await s.locator('[data-kp-alana-yerlestir]').click();
  assert.equal(await s.locator('.kp-parca--hatali').count(), 0);
  assert.equal(await alanOpak(), '0', 'düzelince sınır kaybolur');
};
await disariSurukle();
await disariSurukle();

// 8) Rakam yazıya yazılır: karakter kartında stil adı "Rakam", rakamda stil paneli açılmaz
await s.locator('[data-kp-adim="yazi"]').click();
await s.locator('#kp-isim').fill('ece0');
assert.equal(await s.locator('[data-kp-karakter="3"] .kp-karakter__stil').textContent(), 'Rakam');
await s.locator('[data-kp-karakter="3"]').click();
assert.equal(await gorunur('[data-kp-stil-panel]'), false, 'rakamda set seçimi yok');
await s.locator('[data-kp-karakter="0"]').click();
assert.equal(await metin('.kp-stil__baslik'), '1. harf E · Stil');
await s.locator('#kp-isim').fill('ece');

// 7) Özet: başlık, Sepete ekle · toplam, not ve iki bağlantı
await s.locator('[data-kp-adim="ozet"]').click();
assert.equal(await metin('[data-kp-panel="ozet"] h3'), 'Tasarımın hazır');
assert.match(await metin('[data-kp-ileri]'), /^Tasarımımı sepete ekle · [\d.]+ TL$/);
// Kampanya notu yalnızca simülasyon başarısız olursa görünür (Shopify'ın kendi notu kaldırıldı)
// Bu testte Storefront API yanıt vermiyor: simülasyon başarısız → liste fiyatı ve "İndirimler sepette uygulanır"
assert.equal(await gorunur('.kp-alt__ozet .kp-indirim-notu'), true);
assert.equal(await gorunur('[data-kp-duzenle]'), true);
assert.equal(await gorunur('[data-kp-urune-don]'), true);
// "Tasarımı düzenle" son kullanılan araca döner (Metin)
await s.locator('[data-kp-duzenle]').click();
assert.equal(await gorunur('[data-kp-panel="yazi"]'), true);
await s.locator('[data-kp-adim="ozet"]').click();
// "Ürün sayfasına dön": tasarım kaydedilir, kart tasarımlı halde (küçük önizleme, Düzenle / Sil)
await s.locator('[data-kp-urune-don]').click();
await s.locator('.kp-editor').waitFor({ state: 'hidden' });
assert.equal(await gorunur('[data-kisisel-davet]'), false);
assert.equal(await gorunur('[data-kisisel-govde]'), true);
assert.match((await s.locator('[data-kisisel-govde]').innerText()).replace(/\s+/g, ' '), /Senin tasarımın Otomatik kaydedildi ECE · Futbol Topu · Futbol Topu/);
assert.equal(await gorunur('[data-kisisel-sepete-ekle]'), true, 'kartın altında kırmızı buton');
assert.ok(await s.locator('[data-kisisel-mini] .kp-parca').count() > 0, 'kartta tasarım önizlemesi');
assert.deepEqual(await s.$$eval('.kisisel-kart__butonlar button', (b) => b.map((x) => x.textContent.trim())), ['Düzenle', 'Sil']);
const ANAHTAR = 'kisisel-tasarim-10087205437726';
assert.ok(await s.evaluate((k) => !!localStorage.getItem(k), ANAHTAR), 'localStorage\'da kayıt');
// Sil → davet + "Tasarım silindi · Geri al" → Geri al
await s.locator('[data-kisisel-sil]').click();
assert.equal(await gorunur('[data-kisisel-davet]'), true);
assert.match(await metin('[data-kisisel-bildirim]'), /Tasarım silindi · Geri al/);
assert.equal(await s.evaluate((k) => localStorage.getItem(k), ANAHTAR), null);
await s.screenshot({ path: '/tmp/rev-sil.png' });
await s.locator('[data-kisisel-geri-al]').click();
assert.equal(await gorunur('[data-kisisel-govde]'), true, 'geri alındı');
assert.equal(await gorunur('[data-kisisel-bildirim]'), false);
// Sayfa yeniden açılınca kayıt okunur
await s.reload();
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
assert.equal(await gorunur('[data-kisisel-govde]'), true, 'yeniden yüklemede tasarım kartta');
// Stoğu biten patch kayıttan çıkar, kartta not
await s.evaluate((k) => {
  const k0 = JSON.parse(localStorage.getItem(k));
  const ilk = k0.t.parcalar[0];
  k0.t.parcalar.push(Object.assign({}, ilk, { uid: 'i-kopek', urunId: 3, varyantId: 3003 })); // Sevimli Köpek: stok 0
  localStorage.setItem(k, JSON.stringify(k0));
}, ANAHTAR);
await s.reload();
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
assert.match(await metin('[data-kisisel-not]'), /Tasarımındaki Sevimli Köpek artık stokta olmadığı için çıkarıldı\./);
assert.ok(await s.evaluate((k) => !JSON.parse(localStorage.getItem(k)).t.parcalar.some((p) => p.urunId === 3), ANAHTAR), 'kayıttan da çıktı');
// pageshow (bfcache dönüşü): başka yerde değişen kayıt yeniden okunur
await s.evaluate((k) => { localStorage.removeItem(k); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); }, ANAHTAR);
assert.equal(await gorunur('[data-kisisel-davet]'), true, 'pageshow ile güncellendi');
await s.evaluate(() => history.back());
await s.waitForTimeout(500);
// Kaydı geri koy, tekrar aç → özetten doğrudan sepete ekle; sonrasında kayıt temizlenir
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.locator('#kp-isim').fill('ece');
await s.locator('[data-kp-adim="ozet"]').click();
await s.locator('[data-kp-ileri]').click();
await s.waitForURL('**/cart');
assert.ok(eklenen && eklenen.items[0].properties['Tasarım'].startsWith('ECE'), 'özetten tasarımla sepete eklendi');
assert.equal(await s.evaluate((k) => localStorage.getItem(k), ANAHTAR), null, 'sepete eklenince kayıt temizlendi');

// Boş özet: hiçbir şey eklenmeden İleri ile Özet'e; seçenekler ve düz çanta
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
assert.equal(await gorunur('[data-kisisel-davet]'), true, 'eklendikten sonra kart davet halinde');
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
for (let i = 0; i < ADIM_SAYISI - 1; i++) await s.locator('[data-kp-ileri]').click();
assert.equal(await metin('[data-kp-panel="ozet"] h3'), 'Henüz patch eklemedin');
assert.equal(await gorunur('[data-kp-geri-don]'), true);
assert.equal(await gorunur('[data-kp-sade-al]'), true);
assert.equal(await metin('[data-kp-ileri]'), 'Sepete ekle · 3.000 TL');
assert.equal(await gorunur('[data-kp-urune-don]'), false, 'boş özette alt bağlantılar gizli');
assert.equal(await gorunur('[data-kp-duzenle]'), false);
await s.locator('[data-kp-geri-don]').click();
assert.equal(await gorunur('[data-kp-panel="yazi"]'), true, 'geri dön Yazı adımına');
// Araçtan doğrudan geçiş
await s.locator('[data-kp-adim="ikon"]').click();
assert.equal(await gorunur('[data-kp-panel="ikon"]'), true);
await s.locator('[data-kp-kapat]').click();

// 1) "Sadece çantayı al": düz ürün akışı (temanın formu, tasarım kalemleri yok)
eklenen = null;
await s.evaluate(() => localStorage.clear());
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
await s.evaluate(() => document.querySelector('#product-form-main').addEventListener('submit', () => (window.__duz = 1)));
await s.locator('[data-kisisel-davet] [data-kisisel-sade]').click();
await s.waitForTimeout(500);
assert.equal(eklenen, null, 'tasarım kalemi gitmedi');
assert.ok(temaGonder > 0 || (await s.evaluate(() => window.__duz)) === 1, 'tema formu gönderildi');

// 2) "… istemiyorum" butonları yok; ana buton her zaman "Özete geç →" ve çalışır; "isteğe bağlı" yok
await s.evaluate(() => localStorage.clear());
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await s.locator('kisisel-kart').waitFor({ state: 'visible' });
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
const editorMetni = await s.locator('[data-kp-panel="yazi"]').innerText();
assert.doesNotMatch(editorMetni, /isteğe bağlı|istemiyorum/i);
assert.equal(await s.locator('[data-kp-gec]').count(), 0);
await s.locator('[data-kp-adim="ikon"]').click();
assert.equal(await metin('[data-kp-ileri]'), 'Özete geç →');
await s.locator('[data-kp-kategori="Spor"]').click();
await s.locator('[data-kp-gorsel-icerik] [data-kp-ikon]:not([disabled])').first().click();
await s.locator('[data-kp-ileri]').click();
assert.equal(await gorunur('[data-kp-panel="ozet"]'), true, 'Özete geç her zaman çalışır');
assert.match(await metin('.kp-bilgi'), /Velcro yüzeye takılır/);
await s.locator('[data-kp-adim="tasarim"]').click();
await s.locator('[data-kp-adim="yazi"]').click();
await s.locator('#kp-isim').fill('');
await s.evaluate(() => document.querySelector('kisisel-kart').editor.t.parcalar = []);
s.once('dialog', (d) => d.accept());
await s.locator('[data-kp-kapat]').click();

// Sepetteki tasarımın kartı, düzenlenmesi ve silinmesi: sepettekini-duzenle-e2e.mjs

assert.deepEqual(hatalar, []);
await t.close();
console.log('REVİZYON E2E TAMAM');
