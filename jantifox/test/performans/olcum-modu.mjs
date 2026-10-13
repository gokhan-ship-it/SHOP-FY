// Gizli ölçüm modunun (?kp_olcum=1) doğrulaması (iPhone 13 profili).
// 1) Normal ziyaretçi: kisisel-olcum.js indirilmez, kpOlcum tanımsız.
// 2) Kaynak sayfa (ölçüm modu): kutu görünür, "Kişiselleştir" adresi kp_olcum=1 taşır, basış anı sessionStorage'a yazılır.
// 3) Editör sayfası: yeni oturumda, basış kaydı (2. adımdaki gibi) önceden konur; kutunun metni yazdırılır.
// Bu ortamda shop.app'e erişilemediği ve aynı oturumdaki ikinci sayfa geçişinde mağaza shop.app/accounts/sur'a
// yönlendirdiği için 2. ve 3. adım ayrı oturumlarda çalışır (3. adımdaki süreler yönlendirmesiz sayfa açılışıdır).
// Kullanım: node test/performans/olcum-modu.mjs <tema_id> [kaynak yol: / ya da /collections/tum-urunler]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [tema, yol = '/'] = process.argv.slice(2);
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ayir = (u) => u + (u.includes('?') ? '&' : '?');
const oturum = async () => {
  const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
  return { c, s: await c.newPage() };
};

// 1) Normal ziyaretçi
{
  const { c, s } = await oturum();
  const istekler = [];
  s.on('request', (r) => istekler.push(r.url()));
  await s.goto(ayir('https://jantifox.com' + yol) + 'preview_theme_id=' + tema, { waitUntil: 'load', timeout: 90000 });
  const normal = await s.evaluate(() => ({ kpOlcum: typeof window.kpOlcum, sinif: document.documentElement.classList.contains('kp-olcum'), kutu: !!document.querySelector('[data-kp-olcum]') }));
  console.log('1) normal ziyaretçi:', JSON.stringify(normal), '· kisisel-olcum.js istendi:', istekler.some((u) => /kisisel-olcum/.test(u)));
  await c.close();
}

// 2) Kaynak sayfa, ölçüm modu
let hedef;
{
  const { c, s } = await oturum();
  await s.goto(ayir('https://jantifox.com' + yol) + 'preview_theme_id=' + tema + '&kp_olcum=1', { waitUntil: 'load', timeout: 90000 });
  await s.evaluate(() => document.querySelectorAll('#popupOverlay, .coupon-modal, #shopify-pc__banner').forEach((e) => e.remove()));
  await s.waitForSelector('[data-kp-olcum] pre', { timeout: 20000 });
  console.log('2) kaynak sayfa kutusu:\n' + (await s.locator('[data-kp-olcum] pre').textContent()));
  const dugme = s.locator('a[href*="kisisellestir=1"]:visible').first();
  await dugme.scrollIntoViewIfNeeded();
  hedef = await dugme.getAttribute('href');
  console.log('   buton adresi:', hedef);
  // Basış kaydı okunur; sayfa geçişi, sayfanın kendi dinleyicilerinden sonra (window, kabarma) engellenir
  await s.evaluate(() => window.addEventListener('click', (e) => e.preventDefault()));
  await dugme.tap();
  await s.waitForTimeout(500);
  const kayit = await s.evaluate(() => sessionStorage.getItem('kp_olcum_tik'));
  console.log('   basış kaydı:', kayit);
  await c.close();
}

// 3) Editör sayfası (yeni oturum, ilk sayfa geçişi)
{
  const { c, s } = await oturum();
  const adres = new URL(hedef, 'https://jantifox.com');
  adres.searchParams.set('preview_theme_id', tema);
  await c.addInitScript(() => {
    if (!sessionStorage.getItem('kp_test_kondu')) {
      sessionStorage.setItem('kp_test_kondu', '1');
      const tik = performance.timeOrigin - 150;
      sessionStorage.setItem('kp_olcum_tik', JSON.stringify({ tik, tepki: tik + 16, kaynak: '/ (test)', hedef: location.href }));
    }
  });
  await s.goto(adres.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await s.waitForSelector('.kp-editor:not([hidden])', { timeout: 60000 });
  await s.waitForTimeout(12000);
  console.log('3) editör kutusu:\n' + (await s.locator('[data-kp-olcum] pre').textContent()));
  console.log('   adres (parametreler temizlendi mi):', s.url());
  await c.close();
}
await t.close();
