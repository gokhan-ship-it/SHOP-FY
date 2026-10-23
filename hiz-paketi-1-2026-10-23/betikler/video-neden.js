// Kullanim: node video-neden.js <url> <cikis.json> [senaryo]
// senaryo: duz (kaydirma yok) | tamsayfa (LH tam sayfa goruntusu gibi viewport'u sayfa boyuna uzatir) | kaydir (kullanici gibi asagi iner)
// Takip istekleri engelli. Her video icin: inen govde bayti, istek araligi, JS'in video uzerinde cagirdigi metotlar (yigin izleriyle).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const url = process.argv[2];
const cikis = process.argv[3];
const senaryo = process.argv[4] || 'duz';
const engel = fs.readFileSync(path.join(__dirname, 'engel.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const engelRe = engel.map(p => new RegExp('^' + p.split('*').map(x => x.replace(/[.+?^${}()|[\]\\\/]/g, '\\$&')).join('.*') + '$'));

(async () => {
  const browser = await chromium.launch({ executablePath: '/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/chrome/opt/google/chrome/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
  });
  let engellenen = 0;
  await ctx.route('**/*', r => { const u = r.request().url(); if (engelRe.some(re => re.test(u))) { engellenen++; return r.abort(); } return r.continue(); });
  await ctx.addInitScript(() => {
    window.__vlog = [];
    const t0 = performance.now();
    const ad = v => { const s = v.currentSrc || v.src || (v.querySelector('source') || {}).src || ''; const m = s.match(/([0-9a-f]{32})/); return m ? m[1].slice(0, 8) : s.slice(-30); };
    const yigin = () => (new Error().stack || '').split('\n').slice(3, 6).map(x => x.trim()).join(' | ');
    for (const fn of ['play', 'pause', 'load']) {
      const asil = HTMLMediaElement.prototype[fn];
      HTMLMediaElement.prototype[fn] = function () {
        window.__vlog.push({ t: Math.round(performance.now() - t0), fn, video: ad(this), preload: this.preload, ns: this.networkState, rs: this.readyState, yigin: yigin() });
        return asil.apply(this, arguments);
      };
    }
    const ct = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      get: ct.get, configurable: true,
      set(v) { window.__vlog.push({ t: Math.round(performance.now() - t0), fn: 'currentTime=' + v, video: ad(this), preload: this.preload, ns: this.networkState, rs: this.readyState, yigin: yigin() }); return ct.set.call(this, v); }
    });
    document.addEventListener('playing', e => window.__vlog.push({ t: Math.round(performance.now() - t0), olay: 'playing', video: ad(e.target) }), true);
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const istek = {};
  const t0 = Date.now();
  cdp.on('Network.requestWillBeSent', e => { if (/\.mp4/.test(e.request.url)) istek[e.requestId] = { url: e.request.url.split('/').pop().split('?')[0], range: e.request.headers.Range || e.request.headers.range || '', t: Date.now() - t0, govde: 0, kodlu: 0, son: null }; });
  cdp.on('Network.responseReceived', e => { const r = istek[e.requestId]; if (r) { r.durum = e.response.status; r.protokol = e.response.protocol; r.icerikAraligi = e.response.headers['content-range'] || e.response.headers['Content-Range'] || ''; } });
  cdp.on('Network.dataReceived', e => { const r = istek[e.requestId]; if (r) { r.govde += e.dataLength; r.kodlu += e.encodedDataLength; r.sonVeri = Date.now() - t0; } });
  cdp.on('Network.loadingFinished', e => { const r = istek[e.requestId]; if (r) { r.son = 'bitti'; r.kodluSon = e.encodedDataLength; } });
  cdp.on('Network.loadingFailed', e => { const r = istek[e.requestId]; if (r) { r.son = 'iptal:' + e.errorText; } });

  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  const sonVeri = () => Math.max(0, ...Object.values(istek).map(r => r.sonVeri || r.t || 0));
  async function durul(enAz, enCok) {
    const bas = Date.now();
    while (Date.now() - bas < enCok) {
      await page.waitForTimeout(1000);
      if (Date.now() - bas > enAz && Date.now() - t0 - sonVeri() > 8000) break;
    }
  }
  await durul(5000, 45000);
  const asama = { yuklemeSonrasi: JSON.parse(JSON.stringify(istek)) };
  if (senaryo === 'tamsayfa') {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 412, height: Math.min(h, 16384), deviceScaleFactor: 1.75, mobile: true });
    await durul(5000, 45000);
  } else if (senaryo === 'kaydir') {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 400) { await page.evaluate(y => window.scrollTo(0, y), y); await page.waitForTimeout(400); }
    await durul(5000, 45000);
  } else if (senaryo === 'slider') {
    // Kullanici gibi: sayfa acildiktan sonra yalnizca slider bolumune kadar kaydir, orada bekle.
    await page.evaluate(() => { const r = document.querySelector('[data-vs-root]'); if (r) { const b = r.getBoundingClientRect(); window.scrollTo(0, b.top + scrollY - (innerHeight - b.height) / 2); } });
    await durul(5000, 45000);
  }
  const vlog = await page.evaluate(() => window.__vlog);
  const videolar = await page.evaluate(() => [...document.querySelectorAll('video')].map(v => ({ src: (v.currentSrc || '').split('/').pop().split('?')[0], preload: v.preload, autoplay: v.autoplay, paused: v.paused, rs: v.readyState, ns: v.networkState, buffered: v.buffered.length ? +(v.buffered.end(v.buffered.length - 1)).toFixed(2) : 0, sure: +(v.duration || 0).toFixed(2), gorunur: (() => { const r = v.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; })() })));
  const ozet = Object.values(istek).reduce((a, r) => { a[r.url] = (a[r.url] || 0) + r.govde; return a; }, {});
  const toplam = Object.values(ozet).reduce((a, b) => a + b, 0);
  fs.writeFileSync(cikis, JSON.stringify({ url, senaryo, engellenen, toplamVideoMB: +(toplam / 1048576).toFixed(2), acilistaVideoMB: +(Object.values(asama.yuklemeSonrasi).reduce((a, r) => a + r.govde, 0) / 1048576).toFixed(2), videoBaytlari: ozet, istekler: Object.values(istek), asama, videolar, vlog }, null, 1));
  const acilis = Object.values(asama.yuklemeSonrasi).reduce((a, r) => a + r.govde, 0);
  console.log(senaryo, url, 'acilista video MB', (acilis / 1048576).toFixed(2), 'toplam video MB', (toplam / 1048576).toFixed(2), JSON.stringify(ozet));
  await browser.close();
})();
