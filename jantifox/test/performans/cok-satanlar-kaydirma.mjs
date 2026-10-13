// Çok satanlar kaydırma akıcılığı: iPhone 13 boyutu, CPU 4 kat yavaş. Bölüm ekrana gelirken dikey kaydırma ve
// kaydırıcıda parmakla yatay sürükleme; kare süreleri (rAF), 50 ms'den uzun işler ve uzun karelerin kaynağı (LoAF).
// Kullanım: node test/performans/cok-satanlar-kaydirma.mjs [taban] [tema_id] [cpu=4]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [taban = 'https://jantifox.com', tema = '', cpuS = '4'] = process.argv.slice(2);
const ek = tema ? '?preview_theme_id=' + tema : '';
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const sonuc = [];
for (const tur of ['ilk', 'tekrar']) {
  const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
  await c.addInitScript(() => {
    const o = (window.__k = { kareler: [], uzun: [], loaf: [], kaydet: false });
    const dongu = (z) => { if (o.kaydet) o.kareler.push(z); requestAnimationFrame(dongu); };
    requestAnimationFrame(dongu);
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => o.kaydet && o.uzun.push(Math.round(e.duration)))).observe({ type: 'longtask' }); } catch (e) {}
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => {
        if (!o.kaydet || e.duration < 50) return;
        const s = (e.scripts || []).map((x) => ({ u: (x.sourceURL || '').split('/').pop().split('?')[0], f: x.sourceFunctionName, d: Math.round(x.duration), tur: x.invokerType }));
        o.loaf.push({ d: Math.round(e.duration), stil: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0), engel: Math.round(e.blockingDuration || 0), s });
      })).observe({ type: 'long-animation-frame' });
    } catch (e) {}
  });
  const s = await c.newPage();
  const cdp = await c.newCDPSession(s);
  if (tur === 'tekrar') { await s.goto(taban + '/' + ek, { waitUntil: 'load', timeout: 90000 }); await c.clearCookies(); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(cpuS) });
  await s.goto(taban + '/' + ek, { waitUntil: 'load', timeout: 90000 });
  await s.evaluate(() => document.querySelectorAll('#popupOverlay, .coupon-modal, #shopify-pc__banner').forEach((e) => e.remove()));
  await s.waitForTimeout(1500);
  // Gerçekçi akış: sayfanın üstünden bölüme doğru adım adım parmakla kaydır (aralarda kısa duraklar; örnek tasarımlar
  // bölüm yaklaşınca hesaplanıp çizilir), bölümde kaydırıcıyı 3 kez sürükle, sonra aşağı devam et.
  const izDosya = process.env.IZ ? process.env.IZ + '-' + tur + '.json' : null;
  if (izDosya) await t.startTracing(s, { path: izDosya, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'v8.execute'] });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
  await cdp.send('Profiler.start');
  await s.evaluate(() => { window.__k.kaydet = true; });
  const hedef = await s.evaluate(() => Math.round(document.querySelector('[data-kp-cs]').getBoundingClientRect().top + scrollY - 120));
  let simdi = 0, tur2 = 0;
  while (simdi < hedef - 50 && tur2++ < 20) {
    const adim = Math.min(450, hedef - simdi);
    await cdp.send('Input.synthesizeScrollGesture', { x: 190, y: 560, yDistance: -adim, speed: 1500, gestureSourceType: 'touch' }).catch(() => {});
    await s.waitForTimeout(250);
    const yeni = await s.evaluate(() => scrollY);
    if (yeni <= simdi + 5) await s.evaluate((a) => window.scrollBy(0, a), adim); // dokunma hareketi kaydırmadıysa
    simdi = await s.evaluate(() => scrollY);
  }
  await s.waitForTimeout(400);
  const k = await s.evaluate(() => { const r = document.querySelector('[data-kp-cs] .splide__track').getBoundingClientRect(); return { x: r.left + r.width * 0.8, y: r.top + r.height * 0.35 }; });
  // Kaydırıcı konumu: Splide açıksa slayt sırası, kapalıysa (mobil yerel kaydırma) listenin kaydırma miktarı (px)
  const konum = () => s.evaluate(() => { const l = document.querySelector('[data-kp-cs] .splide__list'); const sp = document.querySelector('[data-kp-cs] splide-carousel'); return getComputedStyle(l).overflowX === 'auto' ? 'px ' + Math.round(l.scrollLeft) : sp && sp.slideInstance ? 'slayt ' + sp.slideInstance.index : null; });
  const indeks0 = await konum();
  // Parmakla sürükleme: dokunma başlangıcı, ~16 ms arayla 14 hareket (240 px sola), bırakma
  for (let i = 0; i < 3; i++) {
    const x0 = Math.round(k.x), y0 = Math.round(k.y);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let j = 1; j <= 14; j++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - j * 17, y: y0 + (j % 3) }] });
      await s.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await s.waitForTimeout(600);
  }
  const indeks1 = await konum();
  await cdp.send('Input.synthesizeScrollGesture', { x: 190, y: 560, yDistance: -700, speed: 1500, gestureSourceType: 'touch' }).catch(() => {});
  await s.waitForTimeout(800);
  const ornek = await s.evaluate(() => document.querySelectorAll('[data-kp-cs] .kp-ornek').length);
  const gorselKB = await s.evaluate(() => Math.round(performance.getEntriesByType('resource').filter((r) => /kisisel-urun-|kisisel-harf|kisisel-aksesuar/.test(r.name)).reduce((a, r) => a + (r.encodedBodySize || 0), 0) / 1024));
  const o = await s.evaluate(() => { window.__k.kaydet = false; return window.__k; });
  if (izDosya) await t.stopTracing();
  // CPU profili: dosya ve fonksiyon başına kendi süresi (ms)
  const { profile } = await cdp.send('Profiler.stop');
  const dugum = new Map(profile.nodes.map((n) => [n.id, n]));
  const ornekSure = new Map();
  profile.samples.forEach((id, i) => { ornekSure.set(id, (ornekSure.get(id) || 0) + (profile.timeDeltas[i + 1] || 0) / 1000); });
  const dosya = {}, fonk = {};
  for (const [id, ms] of ornekSure) {
    const cf = dugum.get(id).callFrame;
    const d = (cf.url || '(' + cf.functionName + ')').split('/').pop().split('?')[0] || '(program)';
    dosya[d] = (dosya[d] || 0) + ms;
    const f = d + ':' + (cf.functionName || '(anonim)') + ':' + cf.lineNumber;
    fonk[f] = (fonk[f] || 0) + ms;
  }
  const ust = (x, n) => Object.entries(x).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]);
  const fark = o.kareler.slice(1).map((z, i) => z - o.kareler[i]);
  const sure = (o.kareler[o.kareler.length - 1] - o.kareler[0]) / 1000;
  const fps = Math.round((o.kareler.length - 1) / sure);
  const kaynak = {};
  o.loaf.forEach((l) => l.s.forEach((x) => { const a = x.u + (x.f ? ':' + x.f : '') ; kaynak[a] = (kaynak[a] || 0) + x.d; }));
  sonuc.push({ tur, kaydiriciIndeks: [indeks0, indeks1], ornekCizilen: ornek, kisiselGorselKB: gorselKB, cpu: Number(cpuS), sureSn: Math.round(sure * 10) / 10, fps, kare: o.kareler.length, kareler33msUstu: fark.filter((d) => d > 33).length, enUzunKare: Math.round(Math.max(...fark)), uzunIs: o.uzun.length, uzunIsToplam: o.uzun.reduce((a, b) => a + b, 0), uzunKare: o.loaf.length, uzunKareStilYerlesim: o.loaf.reduce((a, b) => a + b.stil, 0), kaynak: Object.entries(kaynak).sort((a, b) => b[1] - a[1]).slice(0, 8), profilDosya: ust(dosya, 10), profilFonksiyon: ust(fonk, 14) });
  await c.close();
}
console.log(JSON.stringify(sonuc));
await t.close();
