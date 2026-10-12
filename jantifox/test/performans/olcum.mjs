// Editör performans ölçümü (yerel test sayfası, sahte Shopify yanıtları). Ölçerek karar vermek için.
// Koşullar: iPhone 13 normal, CPU 4× ve 6× yavaş, masaüstü 1440×900.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node olcum.mjs <etiket>   (önce: node ../tarayici/sayfa-uret.mjs)
// Sonuç: sonuclar/<etiket>-yerel.json
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const etiket = process.argv[2] || 'olcum';
const yalniz = process.argv[3] || null; // tek koşul (ör. "cpu4")
const html = readFileSync(new URL('../tarayici/sayfa.html', import.meta.url), 'utf8');
const fiyat = (v) => (v === 51795696943390 ? 300000 : v === 9201 ? 170000 : v === 7001 ? 80000 : 33000);
const uygun = (v) => (v >= 1000 && v < 4000) || (v >= 5000 && v < 6000);
function sepet(satirlar) {
  const lines = satirlar.map((l) => ({ v: Number(String(l.merchandiseId).split('/').pop()), q: l.quantity }));
  const ara = lines.reduce((t, l) => t + fiyat(l.v) * l.q, 0);
  const n = lines.filter((l) => uygun(l.v)).reduce((t, l) => t + l.q, 0);
  let adet = null;
  if (n >= 4) adet = ['  4\'lü  patche indirim ', 37000];
  else if (n === 3) adet = [' 3\'lü  patche indirim ', 19000];
  else if (n === 2) adet = ['2li patche indirim ', 6000];
  const tl = (k) => (k / 100).toFixed(2);
  // Adet indirimi (ürün indirimi) Shopify'daki gibi dahil satırlara dağıtılır; Ekstra %10 sepet düzeyinde
  const uygunTutar = lines.filter((l) => uygun(l.v)).reduce((t, l) => t + fiyat(l.v) * l.q, 0);
  const nodes = lines.map((l) => ({
    quantity: l.q,
    merchandise: { id: 'gid://shopify/ProductVariant/' + l.v },
    discountAllocations: adet && uygun(l.v) ? [{ title: adet[0], discountedAmount: { amount: tl(Math.round((adet[1] * fiyat(l.v) * l.q) / uygunTutar)) } }] : []
  }));
  let adetToplam = adet ? nodes.reduce((t, x) => t + (x.discountAllocations[0] ? Math.round(parseFloat(x.discountAllocations[0].discountedAmount.amount) * 100) : 0), 0) : 0;
  // Birlikte: adet + (adet sonrası ≥ 5.000 ise %10); tek başına Ekstra: indirimsiz ≥ 5.000 ise; hangisi daha çoksa
  const birlikte = adetToplam + (ara - adetToplam >= 500000 ? Math.round((ara - adetToplam) * 0.1) : 0);
  const tekEkstra = ara >= 500000 ? Math.round(ara * 0.1) : 0;
  if (tekEkstra > birlikte) {
    adetToplam = 0;
    nodes.forEach((x) => { x.discountAllocations = []; });
  }
  const alt = ara - adetToplam;
  const sepetDuzeyi = alt >= 500000 ? [{ title: 'Ekstra %10 İndirim', discountedAmount: { amount: tl(Math.round(alt * 0.1)) } }] : [];
  const indirim = adetToplam + (sepetDuzeyi[0] ? Math.round(parseFloat(sepetDuzeyi[0].discountedAmount.amount) * 100) : 0);
  return { cost: { subtotalAmount: { amount: tl(alt) }, totalAmount: { amount: tl(alt - (indirim - adetToplam)) } }, discountAllocations: sepetDuzeyi, lines: { nodes } };
}


const KOSULLAR = [
  { ad: 'iphone13', cihaz: devices['iPhone 13'], cpu: 1 },
  { ad: 'cpu4', cihaz: devices['iPhone 13'], cpu: 4 },
  { ad: 'cpu6', cihaz: devices['iPhone 13'], cpu: 6 },
  { ad: 'masaustu', cihaz: { viewport: { width: 1440, height: 900 } }, cpu: 1 }
].filter((k) => !yalniz || k.ad === yalniz);

// Sayfaya enjekte edilen ölçüm araçları
const ARAC = () => {
  const o = (window.__olc = { olay: [], loaf: [], tus: [] });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => o.olay.push({ ad: e.name, sure: e.duration, isle: e.processingEnd - e.processingStart, bas: e.startTime }))).observe({ type: 'event', durationThreshold: 16, buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => o.loaf.push({
    sure: Math.round(e.duration), blok: Math.round(e.blockingDuration), bas: Math.round(e.startTime),
    stil: Math.round((e.startTime + e.duration) - (e.styleAndLayoutStart || e.startTime + e.duration)),
    betik: (e.scripts || []).map((s) => ({ fn: s.sourceFunctionName || s.invoker, sure: Math.round(s.duration), tur: s.invokerType, kuvvet: Math.round(s.forcedStyleAndLayoutDuration || 0) }))
  }))).observe({ type: 'long-animation-frame', buffered: true });
  // Tuşa basıştan bir sonraki çizime kadar
  document.addEventListener('keydown', (e) => {
    const t0 = e.timeStamp;
    requestAnimationFrame(() => setTimeout(() => o.tus.push(performance.now() - t0), 0));
  }, true);
  // Kare örnekleyici
  o.kareBaslat = () => { o.kareler = []; const nesil = (o.nesil = (o.nesil || 0) + 1); const f = (t) => { if (o.nesil !== nesil) return; o.kareler.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f); };
  o.kareBitir = () => { o.nesil++; const k = o.kareler; const ar = []; for (let i = 1; i < k.length; i++) ar.push(k[i] - k[i - 1]); return ar; };
  // Bir işlemin (tıklama) bir sonraki çizime kadar süresi
  o.islem = (fn) => new Promise((r) => { const t0 = performance.now(); fn(); requestAnimationFrame(() => setTimeout(() => r(performance.now() - t0), 0)); });
};

const ozetKare = (ar) => {
  if (!ar.length) return null;
  const top = ar.reduce((a, b) => a + b, 0);
  const s = ar.slice().sort((a, b) => a - b);
  return { fps: Math.round((ar.length * 1000) / top), takilan: ar.filter((x) => x > 25).length, kare: ar.length, p95: Math.round(s[Math.floor(s.length * 0.95)]), enUzun: Math.round(s[s.length - 1]) };
};
const ozetSure = (ar) => {
  if (!ar.length) return null;
  const s = ar.slice().sort((a, b) => a - b);
  return { medyan: Math.round(s[Math.floor(s.length / 2)]), p95: Math.round(s[Math.floor(s.length * 0.95)]), enUzun: Math.round(s[s.length - 1]), n: s.length };
};

const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const sonuc = { etiket, zaman: new Date().toISOString(), kosullar: {} };
for (const kos of KOSULLAR) {
  const baglam = await t.newContext({ ...kos.cihaz });
  const s = await baglam.newPage();
  const cdp = await baglam.newCDPSession(s);
  await cdp.send('Performance.enable');
  await cdp.send('Profiler.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: kos.cpu });
  let istek = 0;
  await s.route('https://jantifox.test/**', async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === '/api/2025-07/graphql.json') {
      istek++;
      const { variables } = JSON.parse(r.request().postData());
      const data = {};
      for (const [ad, satirlar] of Object.entries(variables)) data[ad] = { cart: sepet(satirlar), userErrors: [] };
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
    }
    if (url.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
    return r.fulfill({ contentType: 'text/html', body: html });
  });
  await s.addInitScript(ARAC);
  const ana = '.kp-editor:not(.kp-editor--alt)';
  const R = { };
  const metrik = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const fark = (a, b) => ({ yerlesim: b.LayoutCount - a.LayoutCount, yerlesimMs: Math.round((b.LayoutDuration - a.LayoutDuration) * 1000), stil: b.RecalcStyleCount - a.RecalcStyleCount, stilMs: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), betikMs: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000) });
  const kapsam = async () => {
    const c = await cdp.send('Profiler.takePreciseCoverage');
    const say = {};
    for (const sc of c.result) for (const f of sc.functions) { if (!f.functionName) continue; const n = f.ranges[0].count; if (n) say[f.functionName] = (say[f.functionName] || 0) + n; }
    return say;
  };
  const SAYILACAK = ['isimAnaliz', 'duzenle', 'fiyatHesapla', 'stokKontrol', 'Editor.yenile', 'Sahne.ciz', 'Sahne.konumla', 'Editor.kampanyaGuncelle', 'kampanyaAnlik', 'Editor.grupSorunu', 'Editor.yerlestirBalonCiz', 'Editor.gecmisKaydet', 'Editor.etiketleriCiz', 'Editor.karakterleriCiz', 'turkceCevir', 'Yerlesim.parcalar', 'cakisir', 'Editor.seritCiz', 'Editor.kenarCiz'];
  const sec = (say) => Object.fromEntries(SAYILACAK.map((k) => [k, say[k] || 0]));
  const loafSifirla = () => s.evaluate(() => { window.__olc.loaf.length = 0; window.__olc.olay.length = 0; window.__olc.tus.length = 0; });
  const loafAl = () => s.evaluate(() => window.__olc.loaf.slice());
  const bekle = (ms) => s.waitForTimeout(ms);

  await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
  await s.waitForFunction(() => !!localStorage.getItem('kp-kampanya-kurallari-2'));
  await bekle(300);

  // 1) İlk açılış: tıklamadan çizilmiş editöre
  await loafSifirla();
  let m0 = await metrik();
  R.acilis = Math.round(await s.evaluate(() => window.__olc.islem(() => document.querySelector('[data-kisisel-davet] [data-kisisel-ac]').click())));
  R.acilisMetrik = fark(m0, await metrik());
  R.acilisLoaf = await loafAl();
  await bekle(600);

  // 2) Yazma: tek tek (300 ms arayla) ve hızlı (40 ms arayla)
  const girdi = s.locator('#kp-isim');
  await girdi.focus();
  await cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
  await kapsam();
  await loafSifirla();
  istek = 0;
  m0 = await metrik();
  for (const h of 'gokhan') { await s.keyboard.type(h); await bekle(300); }
  R.yazTek = ozetSure(await s.evaluate(() => window.__olc.tus.slice()));
  R.yazTekSayac = sec(await kapsam());
  R.yazTekMetrik = fark(m0, await metrik());
  R.yazTekLoaf = await loafAl();
  await bekle(1200);
  R.yazTekIstek = istek;
  for (let i = 0; i < 6; i++) await s.keyboard.press('Backspace');
  await bekle(1200);
  await loafSifirla();
  istek = 0;
  await kapsam();
  await s.keyboard.type('gokhan', { delay: 40 });
  await bekle(50);
  R.yazHizli = ozetSure(await s.evaluate(() => window.__olc.tus.slice()));
  R.yazHizliSayac = sec(await kapsam());
  R.yazHizliLoaf = await loafAl();
  await bekle(1500);
  R.yazHizliIstek = istek;
  R.harfSayisi = await s.locator(ana + ' .kp-onizleme .kp-parca--letter').count();
  await girdi.blur();
  await bekle(400);

  // 3) Sürükleme (yazı bloğu) ve döndürme
  const surukle = async (secici, yol, adim = 90) => {
    const b = await s.locator(secici).first().boundingBox();
    const x0 = b.x + b.width / 2, y0 = b.y + b.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    await s.evaluate(() => window.__olc.kareBaslat());
    for (let i = 1; i <= adim; i++) {
      const [dx, dy] = yol(i / adim);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dx, y: y0 + dy }] });
      await bekle(16);
    }
    const ar = await s.evaluate(() => window.__olc.kareBitir());
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await bekle(300);
    return ozetKare(ar);
  };
  await loafSifirla();
  await kapsam();
  m0 = await metrik();
  R.surukle = await surukle(ana + ' .kp-onizleme [data-uid="isim-0"]', (f) => [Math.sin(f * Math.PI * 2) * 40, Math.sin(f * Math.PI) * 30]);
  R.surukleMetrik = fark(m0, await metrik());
  R.surukleSayac = sec(await kapsam());
  R.surukleLoaf = await loafAl();
  // seçili grubun tutamacıyla döndürme
  await s.locator(ana + ' .kp-onizleme [data-uid="isim-0"]').first().click().catch(() => {});
  await bekle(200);
  const tut = ana + ' [data-kp-tutamac]';
  if (await s.locator(tut).isVisible()) {
    const tb = await s.locator(tut).boundingBox();
    const cb = await s.locator(ana + ' .kp-cerceve').boundingBox();
    const cx = cb.x + cb.width / 2, cy = cb.y + cb.height / 2;
    const r0 = Math.hypot(tb.x + tb.width / 2 - cx, tb.y + tb.height / 2 - cy);
    const a0 = Math.atan2(tb.y + tb.height / 2 - cy, tb.x + tb.width / 2 - cx);
    await loafSifirla();
    R.dondur = await surukle(tut, (f) => { const a = a0 + Math.sin(f * Math.PI) * 1.2; return [cx + r0 * Math.cos(a) - (tb.x + tb.width / 2), cy + r0 * Math.sin(a) - (tb.y + tb.height / 2)]; });
    R.dondurLoaf = await loafAl();
  }
  if (await s.locator(ana + ' [data-kp-secim-kaldir]').isVisible()) await s.locator(ana + ' [data-kp-secim-kaldir]').click();
  await bekle(300);

  // 4) İşlem süreleri (tıklamadan bir sonraki çizime)
  const islem = async (ad, secici) => {
    await s.waitForSelector(secici, { state: 'attached' });
    await loafSifirla();
    const m1 = await metrik();
    const ms = await s.evaluate((q) => window.__olc.islem(() => document.querySelector(q).click()), secici);
    (R.islem = R.islem || {})[ad] = { ms: Math.round(ms), ...fark(m1, await metrik()) };
    await bekle(350);
  };
  await islem('aracGorsel', ana + ' .kp-arac-dugme[data-kp-adim="ikon"]');
  await islem('aracAksesuar', ana + ' .kp-arac-dugme[data-kp-adim="aksesuar"]');
  await islem('aracMetin', ana + ' .kp-arac-dugme[data-kp-adim="yazi"]');
  const stilSec = await s.$$eval(ana + ' [data-kp-hepsi]', (l) => l.map((b) => b.getAttribute('data-kp-hepsi')));
  if (stilSec.length > 1) {
    await islem('stilPiramit', ana + ' [data-kp-hepsi="' + stilSec[1] + '"]');
    await islem('stilCool', ana + ' [data-kp-hepsi="' + stilSec[0] + '"]');
  }
  await islem('ayir', ana + ' [data-kp-harf-mod]');
  await islem('birlestir', ana + ' [data-kp-harf-mod]');
  await islem('aracGorsel2', ana + ' .kp-arac-dugme[data-kp-adim="ikon"]');
  await islem('setEkle', ana + ' [data-kp-hazir-set="8001"]');
  await islem('tumuAc', ana + ' [data-kp-kategori="Spor"]');
  await islem('ikonEkle', ana + ' [data-kp-gorsel-icerik] [data-kp-ikon="2"]');
  await islem('geriAl', ana + ' [data-kp-geri-al]');
  await islem('yinele', ana + ' [data-kp-yinele]');
  await islem('aracAksesuar2', ana + ' .kp-arac-dugme[data-kp-adim="aksesuar"]');
  await islem('aksesuarDuz', ana + ' [data-kp-aksesuar="9103"]');
  await islem('aksesuarTasarlaAc', ana + ' [data-kp-aksesuar="9101"]');
  await s.locator('.kp-editor--alt').waitFor({ state: 'visible' });
  await bekle(400);
  await islem('aksesuarVazgec', '.kp-editor--alt [data-kp-vazgec]');
  await bekle(300);
  await islem('gorunumTumu', ana + ' [data-kp-gorunum]');
  await islem('gorunumYakin', ana + ' [data-kp-gorunum]');
  if (kos.ad !== 'masaustu') {
    await islem('kampanyaPaneli', ana + ' [data-kp-fiyat-ac]');
    await s.locator(ana + ' [data-kp-kpanel] .kp-kpanel__perde').click({ position: { x: 20, y: 20 } });
    await bekle(300);
  }
  await islem('ozet', ana + ' [data-kp-ileri]');
  await islem('tasarimaDon', ana + ' [data-kp-adim="tasarim"]');

  // 5) Hareketler: geçiş boyunca kareler ve yerleşim
  const hareket = async (ad, tetik, ms = 450) => {
    await loafSifirla();
    const m1 = await metrik();
    await s.evaluate(() => window.__olc.kareBaslat());
    await tetik();
    await bekle(ms);
    const ar = await s.evaluate(() => window.__olc.kareBitir());
    (R.hareket = R.hareket || {})[ad] = { ...ozetKare(ar), ...fark(m1, await metrik()) };
  };
  if (kos.ad !== 'masaustu') {
    await s.locator(ana + ' .kp-arac-dugme[data-kp-adim="ikon"]').click();
    await bekle(300);
    const kb = await s.locator(ana + ' .kp-kaydir').boundingBox();
    await s.mouse.move(kb.x + kb.width / 2, kb.y + 60);
    await hareket('kucul', async () => { for (let i = 0; i < 10; i++) { await s.mouse.wheel(0, 24); await bekle(16); } }, 500);
    R.kuculdu = await s.evaluate((q) => document.querySelector(q).classList.contains('kp-editor--kucuk'), ana);
    await hareket('buyu', async () => { for (let i = 0; i < 20; i++) { await s.mouse.wheel(0, -40); await bekle(16); } }, 500);
  }
  await hareket('yakinlastir', () => s.locator(ana + ' [data-kp-gorunum]').click(), 450);
  await hareket('uzaklastir', () => s.locator(ana + ' [data-kp-gorunum]').click(), 450);
  await hareket('aracDegisim', () => s.locator(ana + ' .kp-arac-dugme[data-kp-adim="aksesuar"]').click(), 300);
  await hareket('bildirim', () => s.evaluate(() => document.querySelector('kisisel-kart').editor.bildir('Ölçüm bildirimi')), 400);
  await hareket('aksesuarEkraniAc', () => s.locator(ana + ' [data-kp-aksesuar="9101"]').click(), 500);
  await s.locator('.kp-editor--alt [data-kp-vazgec]').click();
  await bekle(300);

  // 6) Bellek: 60 işlem
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  const h0 = await cdp.send('Runtime.getHeapUsage');
  const n0 = (await metrik()).Nodes;
  await s.locator(ana + ' .kp-arac-dugme[data-kp-adim="yazi"]').click();
  for (let i = 0; i < 10; i++) {
    await girdi.fill('ece' + i);
    await s.locator(ana + ' [data-kp-harf-mod]').click();
    await s.locator(ana + ' [data-kp-harf-mod]').click();
    await s.locator(ana + ' [data-kp-geri-al]').click();
    await s.locator(ana + ' [data-kp-yinele]').click();
    await s.locator(ana + ' [data-kp-gorunum]').click();
  }
  await bekle(1500);
  await cdp.send('HeapProfiler.collectGarbage');
  const h1 = await cdp.send('Runtime.getHeapUsage');
  R.bellek = { onceMB: +(h0.usedSize / 1048576).toFixed(2), sonraMB: +(h1.usedSize / 1048576).toFixed(2), dugumOnce: n0, dugumSonra: (await metrik()).Nodes };

  sonuc.kosullar[kos.ad] = R;
  console.log(kos.ad, JSON.stringify({ acilis: R.acilis, yazTek: R.yazTek, yazHizli: R.yazHizli, istek: [R.yazTekIstek, R.yazHizliIstek], surukle: R.surukle, dondur: R.dondur, bellek: R.bellek }));
  await baglam.close();
}
await t.close();
mkdirSync(new URL('sonuclar/', import.meta.url), { recursive: true });
writeFileSync(new URL('sonuclar/' + etiket + '-yerel' + (yalniz ? '-' + yalniz : '') + '.json', import.meta.url), JSON.stringify(sonuc, null, 1));
