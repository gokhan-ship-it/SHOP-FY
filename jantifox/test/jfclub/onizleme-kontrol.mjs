// JantiFox Club pop-up'ı: önizlemede (preview_theme_id) başsız tarayıcı kontrolleri a–h. Ekran görüntüsü alınmaz.
// Form gerçek mağazaya gönderilmez: POST /contact tarayıcıda yakalanır ve taklit yanıt verilir. Meta, GA4, GTM,
// Shopify analitiği ve diğer takip adresleri engellenir; fbq yerine olayları yalnızca kaydeden bir taklit kurulur.
// Shopify'ın bot koruması (satır içi betik + hCaptcha sağlayıcısı) gerçek hâliyle çalışır; yalnızca hCaptcha'nın
// api.js'i "doğrulama geçti" (ya da "pencere kapatıldı") diyen bir taklitle karşılanır, jeton taklit /contact'a gider.
// Playwright Chromium H.264 çözemediği için d) ve e)'de mp4 adresleri aynı karelerden üretilmiş VP9 webm ile
// karşılanır (JFCLUB_WEBM klasörü); ham mp4 ile çalışınca video hatası → poster yolu denenir.
//   node test/jfclub/onizleme-kontrol.mjs [a,b,b2,c,d,d2,d3,e,f,h]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const SITE = 'https://jantifox.com';
const TEMA = process.env.JFCLUB_TEMA || '207699345694';
const WEBM = process.env.JFCLUB_WEBM || '';
const GUN = 864e5;
const secim = (process.argv[2] || 'a,b,b2,c,d,d2,d3,e,f,h').split(',');
const adres = (yol, ek = '', karma = '') => `${SITE}${yol}${yol.includes('?') ? '&' : '?'}preview_theme_id=${TEMA}${ek ? '&' + ek : ''}${karma}`;
const ENGEL = /(facebook\.(net|com)|fbcdn|google-analytics|googletagmanager|analytics\.google|doubleclick|googleadservices|google\.com\/(ccm|pagead)|clarity\.ms|hotjar|tiktok|pinterest|snapchat|enhencer|criteo|yandex|bat\.bing|monorail|\/api\/collect|web-pixels|\/wpm@|trekkie|shop\.app\/pay)/i;
const sonuclar = [];
const yaz = (ad, ok, ayrinti) => { sonuclar.push([ad, ok]); console.log(`${ok ? 'GEÇTİ' : 'KALDI'} ${ad}${ayrinti ? '\n      ' + ayrinti : ''}`); };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const tarayici = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// Video olay ve görünürlük izi; fbq taklidi (yalnızca kaydeder)
const izleme = () => {
  window.__fbq = [];
  const fbq = function () { window.__fbq.push([].slice.call(arguments)); };
  fbq.getState = () => ({ pixels: [] }); fbq.queue = []; fbq.loaded = true; fbq.version = '2.0';
  window.fbq = window._fbq = fbq;
  const t0 = performance.now();
  window.__iz = [];
  const kim = (v) => v && v.dataset && v.dataset.jfclubKlip;
  ['play', 'playing', 'pause', 'ended', 'error'].forEach((ad) => document.addEventListener(ad, (e) => {
    if (kim(e.target)) __iz.push([Math.round(performance.now() - t0), 'olay', kim(e.target), ad, +e.target.currentTime.toFixed(3)]);
  }, true));
  new MutationObserver((ms) => ms.forEach((m) => {
    const el = m.target;
    if (kim(el)) __iz.push([Math.round(performance.now() - t0), 'sinif', kim(el), el.classList.contains('jfclub__video--on') ? 'on' : 'off']);
    if (el.dataset && el.dataset.jfclubPanel && m.attributeName === 'hidden') __iz.push([Math.round(performance.now() - t0), 'panel', el.dataset.jfclubPanel, el.hidden ? 'gizli' : 'gorunur']);
  })).observe(document, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
};

async function baglam(o = {}) {
  const ctx = await tarayici.newContext({ ...devices['iPhone 13'], locale: 'tr-TR', ...(o.ctx || {}) });
  const istekler = [];
  const formlar = [];
  await ctx.route(ENGEL, (r) => r.abort());
  // hCaptcha: yalnızca api.js taklit edilir (sonra kaydedilen yol önce çalışır)
  await ctx.route(/hcaptcha\.com/, (r) => r.abort());
  await ctx.route(/js\.hcaptcha\.com\/1\/api\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: `(function () {
    var m = /onload=([^&]+)/.exec((document.currentScript && document.currentScript.src) || '');
    window.__hc = { render: 0, execute: 0 };
    window.hcaptcha = {
      render: function () { window.__hc.render++; return 'w1'; },
      execute: function () { window.__hc.execute++; return ${o.hcaptcha === 'kapatildi' ? "Promise.reject(new Error('challenge-closed'))" : "Promise.resolve({ response: 'test-jetonu-' + window.__hc.execute })"}; },
      reset: function () {}, remove: function () {}, getResponse: function () { return ''; }
    };
    if (m && window[m[1]]) setTimeout(window[m[1]], 0);
  })();` }));
  // Form asla gerçek mağazaya gitmez
  await ctx.route(/\/contact(\?|#|$)/, async (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    const govde = r.request().postData() || '';
    const coz = (x) => (x == null ? x : decodeURIComponent(String(x).replace(/\+/g, ' ')));
    formlar.push({ gezinme: r.request().isNavigationRequest(), eposta: coz((govde.match(/contact\[email\]"\r\n\r\n([^\r]*)/) || govde.match(/contact%5Bemail%5D=([^&]*)/) || [])[1]), etiket: coz((govde.match(/contact\[tags\]"\r\n\r\n([^\r]*)/) || govde.match(/contact%5Btags%5D=([^&]*)/) || [])[1]), form_type: /customer/.test(govde), jeton: (govde.match(/h-captcha-response"\r\n\r\n([^\r]*)/) || govde.match(/h-captcha-response=([^&]*)/) || [])[1] || null });
    const kip = o.form || 'basari';
    if (kip === 'challenge') return r.fulfill({ status: 302, headers: { location: SITE + '/challenge' } });
    return r.fulfill({ status: 302, headers: { location: SITE + '/?customer_posted=true' } });
  });
  if (o.webm && WEBM) {
    await ctx.route(/jfclub-(1-bekleme|2-acilis|3-acik)\.mp4/, (r) => {
      const ad = r.request().url().match(/jfclub-[^/?]+\.mp4/)[0].replace('.mp4', '.webm');
      r.fulfill({ status: 200, contentType: 'video/webm', body: fs.readFileSync(path.join(WEBM, ad)) });
    });
  }
  if (o.kuponKapali) await ctx.addInitScript(() => { try { sessionStorage.setItem('firstOrderPopupShown_v2', 'true'); } catch (e) {} });
  if (o.saatKaydir) await ctx.addInitScript((g) => { const d = Date.now; Date.now = () => d() + g; }, o.saatKaydir);
  await ctx.addInitScript(izleme);
  const p = await ctx.newPage();
  const t0 = Date.now();
  p.on('request', (r) => istekler.push({ t: Date.now() - t0, url: r.url(), range: r.headers().range || null }));
  const hatalar = [];
  p.on('pageerror', (e) => hatalar.push(e.message));
  return { ctx, p, istekler, formlar, hatalar, t0 };
}
const durum = (p) => p.evaluate(() => {
  const k = document.querySelector('[data-jfclub]');
  const r = document.querySelector('[data-jfclub-rozet]');
  let ls = null; try { ls = localStorage.getItem('jfclub_durum'); } catch (e) {}
  return {
    ayar: !!document.getElementById('jfclub-ayar'), kok: !!k, acik: !!k && !k.hidden && k.classList.contains('jfclub--acik'),
    poster: !!k && k.classList.contains('jfclub--poster'), rozet: !!r && !r.hidden, etiket: r ? r.textContent.trim() : null,
    posta: !!k && !k.querySelector('[data-jfclub-panel=posta]').hidden, odul: !!k && !k.querySelector('[data-jfclub-panel=odul]').hidden,
    on: k ? [...k.querySelectorAll('[data-jfclub-klip]')].filter((v) => v.classList.contains('jfclub__video--on')).map((v) => v.dataset.jfclubKlip) : [],
    ls, adres: k ? k.querySelector('[data-jfclub-adres]').textContent : null, url: location.pathname + location.search + location.hash,
    tema: window.Shopify && Shopify.theme && Shopify.theme.id, editor: document.documentElement.classList.contains('kp-kilit') || document.documentElement.classList.contains('kp-acilis-bekle')
  };
});
const jf = (ist) => ist.filter((x) => /\/jfclub-[^/?]+\.(js|css|mp4|webp|svg)/.test(new URL(x.url).pathname));
const medya = (ist) => ist.filter((x) => /\.(mp4|webp)(\?|$)/i.test(new URL(x.url).pathname + (new URL(x.url).search ? '?' : '')));
const kisa = (u) => u.replace(/^https?:\/\/[^/]+/, '').replace(/\?v=\d+/, '').replace(/^\/cdn\/shop\/t\/\d+\/assets\//, '');
const durumYaz = (p, v) => p.evaluate((v) => localStorage.setItem('jfclub_durum', v), v);
const dur = (d, t = Date.now()) => JSON.stringify({ d, t });

// a) İlk 10 sn'de mp4/webp yok · b) tetiklenince Klip1, mp4 türü ve Range 206
if (secim.includes('a') || secim.includes('b')) {
  const { ctx, p, istekler, hatalar } = await baglam();
  const yanitlar = [];
  p.on('response', (r) => { if (/jfclub-.*\.mp4/.test(r.url())) yanitlar.push({ url: kisa(r.url()), durum: r.status(), tur: r.headers()['content-type'], aralik: r.headers()['content-range'] || null }); });
  await p.goto(adres('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  const yukleme = Date.now();
  await bekle(5000);
  // Temanın kupon penceresi (her oturum 3. sn) açıksa kapatılır; pop-up'ımız ondan sonra açılır
  const kupon = await p.evaluate(() => { const o = document.getElementById('popupOverlay'); return !!o && !o.classList.contains('hidden'); });
  if (kupon) await p.click('#closeBtn');
  await bekle(Math.max(0, 10000 - (Date.now() - yukleme)));
  const d10 = await durum(p);
  const jf10 = jf(istekler);
  const medya10 = medya(istekler);
  yaz('a) ilk 10 sn: pop-up\'ın mp4/webp/css isteği yok, yalnızca jfclub-popup.js', d10.tema == TEMA && !d10.acik && jf10.length === 1 && /jfclub-popup\.js/.test(jf10[0].url) && !medya10.some((x) => /jfclub/.test(x.url)),
    `tema ${d10.tema}; kupon penceresi ${kupon ? 'açıktı, kapatıldı' : 'yoktu'}; jfclub istekleri: ${JSON.stringify(jf10.map((x) => kisa(x.url) + ' @' + x.t + 'ms'))}; sayfadaki tüm .mp4/.webp adresli istekler (temanın kendi görselleri): ${JSON.stringify(medya10.map((x) => kisa(x.url).slice(0, 70)))}`);
  await p.waitForFunction(() => { const k = document.querySelector('[data-jfclub]'); return k && k.classList.contains('jfclub--acik'); }, null, { timeout: 8000 }).catch(() => {});
  const acilis = Date.now() - yukleme;
  await bekle(2500);
  const d = await durum(p);
  const k1 = jf(istekler).find((x) => /jfclub-1-bekleme\.mp4/.test(x.url));
  // Tarayıcının kendi video isteği ve ayrıca açık Range isteği
  const aralik = await p.evaluate(async () => {
    const A = JSON.parse(document.getElementById('jfclub-ayar').textContent);
    const s = [];
    for (const k of ['v1', 'v2', 'v3']) {
      const r = await fetch(A[k], { headers: { Range: 'bytes=0-1023' } });
      const b = await r.arrayBuffer();
      s.push({ dosya: A[k].split('/').pop().split('?')[0], durum: r.status, tur: r.headers.get('content-type'), aralik: r.headers.get('content-range'), bayt: b.byteLength });
    }
    return s;
  });
  yaz('b) tetiklenince açıldı ve Klip1 istendi', d.acik && !!k1, `açılış: yüklemeden ${acilis} ms sonra; Klip1 isteği @${k1 && k1.t} ms, Range: ${k1 && k1.range}; tarayıcının yanıtları: ${JSON.stringify(yanitlar.slice(0, 3))}`);
  yaz('b) mp4\'ler video/mp4 ve Range isteğine 206', aralik.every((x) => x.durum === 206 && x.tur === 'video/mp4' && /^bytes 0-1023\//.test(x.aralik || '') && x.bayt === 1024), JSON.stringify(aralik));
  yaz('b) Playwright Chromium H.264 çözemediği için poster yoluna geçti (beklenen)', d.poster && d.on.join() === '1', JSON.stringify({ poster: d.poster, on: d.on }));
  console.log('      sayfa hataları:', JSON.stringify(hatalar.filter((h) => !/Failed to fetch|net::ERR/.test(h)).slice(0, 5)));
  await ctx.close();
}

// b2) Kupon penceresi açıkken 12. sn gelirse beklenir; kapatılınca 3 sn sonra açılır
if (secim.includes('b2')) {
  const { ctx, p } = await baglam();
  await p.goto(adres('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await bekle(14000);
  const kupon = await p.evaluate(() => { const o = document.getElementById('popupOverlay'); return !!o && !o.classList.contains('hidden'); });
  const d14 = await durum(p);
  if (kupon) await p.click('#closeBtn');
  const t = Date.now();
  await p.waitForFunction(() => { const k = document.querySelector('[data-jfclub]'); return k && k.classList.contains('jfclub--acik'); }, null, { timeout: 8000 }).catch(() => {});
  const d = await durum(p);
  yaz('b2) kupon penceresi açıkken bekledi, kapanınca ~3 sn sonra açıldı', kupon && !d14.acik && d.acik, `14. sn: kupon ${kupon ? 'açık' : 'kapalı'}, pop-up ${d14.acik ? 'açık' : 'kapalı'}; kapattıktan ${Date.now() - t} ms sonra pop-up ${d.acik ? 'açık' : 'kapalı'}`);
  await ctx.close();
}

// c) Sepet / hesap sayfası ve editör açıkken pop-up ve rozet yok
if (secim.includes('c')) {
  for (const [ad, yol] of [['sepet', '/cart'], ['hesap girişi', '/account/login'], ['hesap kaydı', '/account/register']]) {
    const { ctx, p, istekler } = await baglam({ kuponKapali: true });
    await p.goto(adres('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await durumYaz(p, dur('kapatildi'));
    await p.goto(adres(yol, 'jfclub=ac'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    const ilk = istekler.length;
    await bekle(3000);
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await bekle(1500);
    const d = await durum(p);
    yaz(`c) ${ad} sayfası: pop-up/rozet yok, dosya yüklenmedi`, d.tema == TEMA && !d.ayar && !d.kok && jf(istekler.slice(ilk)).length === 0, `${d.url} · tema ${d.tema} · jfclub isteği ${jf(istekler.slice(ilk)).length}`);
    await ctx.close();
  }
  // Editör adresten açık başlar (?kisisellestir=1): ?jfclub=ac olsa da pop-up yok; kapatılmış durumda rozet yok
  {
    const { ctx, p } = await baglam({ kuponKapali: true });
    await p.goto(adres('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await durumYaz(p, dur('kapatildi'));
    await p.goto(adres('/products/kanvas-lacivert-tote-canta', 'kisisellestir=1&jfclub=ac'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    let enAz = { acik: false, rozet: false }; let editorGoruldu = false;
    for (let i = 0; i < 16; i++) { await bekle(500); const d = await durum(p); editorGoruldu = editorGoruldu || d.editor; if (d.editor) { enAz.acik = enAz.acik || d.acik; enAz.rozet = enAz.rozet || d.rozet; } }
    const d = await durum(p);
    yaz('c) editör açıkken pop-up ve rozet yok', d.tema == TEMA && d.ayar && editorGoruldu && d.editor && !enAz.acik && !enAz.rozet && !d.acik && !d.rozet, JSON.stringify({ tema: d.tema, ayar: d.ayar, editorGoruldu, editorSimdi: d.editor, acik: d.acik, rozet: d.rozet }));
    await ctx.close();
  }
  // Pop-up açıkken editör açılırsa sessizce gizlenir; editör kapanınca (kapatılmış durumda) rozet geri gelir
  {
    const { ctx, p } = await baglam({ kuponKapali: true });
    await p.goto(adres('/products/kanvas-lacivert-tote-canta', 'jfclub=ac'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForFunction(() => { const k = document.querySelector('[data-jfclub]'); return k && k.classList.contains('jfclub--acik'); }, null, { timeout: 10000 });
    const once = await durum(p);
    await p.evaluate(() => document.querySelector('kisisel-kart [data-kisisel-ac]').click());
    await p.waitForFunction(() => document.documentElement.classList.contains('kp-kilit'), null, { timeout: 15000 }).catch(() => {});
    await bekle(800);
    const d = await durum(p);
    yaz('c) pop-up açıkken editör açılınca pop-up ve rozet gizlenir', once.tema == TEMA && once.acik && d.editor && !d.acik && !d.rozet, JSON.stringify({ once: once.acik, editor: d.editor, acik: d.acik, rozet: d.rozet, ls: d.ls }));
    await ctx.close();
  }
}

// d) Taklit başarılı gönderim: Klip1 → Klip2 → Klip3; Klip3 'playing' olmadan Klip2 gizlenmez; Lead bir kez
if (secim.includes('d')) {
  const { ctx, p, formlar, istekler } = await baglam({ webm: true, kuponKapali: true });
  await p.goto(adres('/', 'jfclub=ac'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => { const v = document.querySelector('[data-jfclub-klip="1"]'); return v && v.currentTime > 0.2; }, null, { timeout: 15000 });
  await p.fill('[data-jfclub-eposta]', 'abc@');
  await p.click('[data-jfclub-gonder]');
  const hata = await p.textContent('[data-jfclub-hata]');
  await p.fill('[data-jfclub-eposta]', 'onizleme-testi@ornek.com');
  // Bu sunucudan bakınca pazarlama izni yok; Türkiye'deki ziyaretçi gibi izin verilmiş sayılır (Lead yolu denenir)
  await p.evaluate(() => { try { Object.defineProperty(Shopify.customerPrivacy, 'marketingAllowed', { configurable: true, value: () => true }); } catch (e) {} });
  await bekle(3200);
  const koruma = await p.evaluate(() => ({ bagli: document.getElementById('jfclub-form').hasAttribute('data-hcaptcha-bound'), rozet: !!document.getElementById('shop-hcaptcha-badge-container') }));
  const gonderimT = await p.evaluate(() => { const v = document.querySelector('[data-jfclub-klip="1"]'); return v.currentTime; });
  await p.click('[data-jfclub-gonder]');
  await bekle(5500);
  const iz = await p.evaluate(() => __iz);
  const d = await durum(p);
  const bul = (k, ad) => iz.find((x) => x[1] === 'olay' && x[2] === k && x[3] === ad);
  const sinif = (k, on) => iz.filter((x) => x[1] === 'sinif' && x[2] === k && x[3] === on);
  const k1dur = bul('1', 'pause');
  const k2play = bul('2', 'playing');
  const k2end = bul('2', 'ended');
  const k3play = iz.find((x) => x[1] === 'olay' && x[2] === '3' && x[3] === 'playing' && k2end && x[0] >= k2end[0]);
  const k2gizlendi = sinif('2', 'off').find((x) => k2play && x[0] > k2play[0]);
  const odul = iz.find((x) => x[1] === 'panel' && x[2] === 'odul' && x[3] === 'gorunur');
  const sira = k1dur && k2play && k2end && k3play && k2gizlendi && k1dur[0] <= k2play[0] && k2play[0] < k2end[0] && k2end[0] <= k3play[0] && k2gizlendi[0] >= k3play[0];
  yaz('d) geçersiz e-postada istek yok, hata metni', hata === 'Geçerli bir e-posta adresi yaz.' && formlar.length <= 1, JSON.stringify(hata));
  const hc = await p.evaluate(() => window.__hc);
  yaz('d) Shopify bot koruması forma bağlandı, doğrulama yapıldı, jeton fetch ile gitti; sayfa gitmedi', koruma.bagli && hc && hc.execute === 1 && formlar.length === 1 && !formlar[0].gezinme && formlar[0].jeton === 'test-jetonu-1' && d.url.startsWith('/?'), JSON.stringify({ koruma, hc, jeton: formlar[0] && formlar[0].jeton, url: d.url }));
  yaz('d) form alanları (taklit yanıt): contact[email], contact[tags]=newsletter,jantifox-club, form_type=customer', formlar.length === 1 && formlar[0].eposta === 'onizleme-testi@ornek.com' && formlar[0].etiket === 'newsletter,jantifox-club' && formlar[0].form_type && !formlar[0].gezinme, JSON.stringify(formlar));
  yaz('d) Klip1 → Klip2 → Klip3 sırası; Klip2, Klip3 \'playing\' olmadan gizlenmedi', sira && d.on.join() === '3',
    `gönderimde Klip1 t=${gonderimT.toFixed(2)} sn; Klip1 durdu t=${k1dur && k1dur[4]} @${k1dur && k1dur[0]}; Klip2 playing @${k2play && k2play[0]}; Klip2 ended @${k2end && k2end[0]}; Klip3 playing @${k3play && k3play[0]}; Klip2 gizlendi @${k2gizlendi && k2gizlendi[0]}`);
  yaz('d) açılmış hâlin metinleri Klip2 başladıktan ~0,9 sn sonra; adres satırda', odul && k2play && odul[0] - k2play[0] >= 850 && odul[0] - k2play[0] < 1200 && d.adres === 'onizleme-testi@ornek.com' && /kayitli/.test(d.ls), `fark ${odul && k2play && odul[0] - k2play[0]} ms; adres ${d.adres}`);
  const lead = await p.evaluate(() => window.__fbq.filter((x) => x[2] === 'Lead'));
  yaz('d) Meta Lead (trackSingle, content_name JantiFox Club) bir kez, taklit fbq\'ya', lead.length === 1 && lead[0][0] === 'trackSingle' && lead[0][3].content_name === 'JantiFox Club' && /^jfclub-lead-/.test(lead[0][4].eventID), JSON.stringify(lead));
  // Kopyala, Sepetime uygula (arka planda /discount/CLUB15), bildirim
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: SITE });
  await p.click('[data-jfclub-kopyala]'); await bekle(300);
  const kopya = await p.textContent('[data-jfclub-kopyala]');
  const panoda = await p.evaluate(() => navigator.clipboard.readText().catch(() => null));
  const ilk = istekler.length;
  await p.click('[data-jfclub-uygula]'); await bekle(1500);
  const bildirim = await p.evaluate(() => document.querySelector('[data-jfclub-bildirim]').classList.contains('jfclub__bildirim--on'));
  const indirim = istekler.slice(ilk).filter((x) => /\/discount\//.test(x.url)).map((x) => kisa(x.url));
  const sepet = await p.evaluate(() => fetch('/cart.js').then((r) => r.json()).then((c) => ({ adet: c.item_count, kodlar: (c.discount_codes || []).map((x) => x.code) })));
  const cerez = (await ctx.cookies(SITE)).filter((c) => c.name === 'discount_code').map((c) => c.value);
  yaz('d) Kopyala → "Kopyalandı ✓", pano CLUB15', kopya === 'Kopyalandı ✓' && panoda === 'CLUB15', JSON.stringify({ kopya, panoda }));
  yaz('d) Sepetime uygula: sayfadan çıkmadan /discount/CLUB15, bildirim, çerez', bildirim && indirim.length >= 1 && /\/discount\/CLUB15\?redirect=%2Fcart\.js/.test(indirim[0]) && d.url.startsWith('/') && cerez.includes('CLUB15'), JSON.stringify({ indirim, bildirim, cerez, sepet, url: (await durum(p)).url }));
  await bekle(2400);
  await p.click('[data-jfclub-kapat]'); await bekle(800);
  const k = await durum(p);
  const duran = await p.evaluate(() => [...document.querySelectorAll('[data-jfclub-klip]')].every((v) => v.paused));
  yaz('f) kayıttan sonra kapatınca rozet "%15", videolar duraklatıldı', k.rozet && k.etiket === '%15' && duran && !k.acik);
  await ctx.close();
}

// d2) Pazarlama izni yokken Lead gönderilmez (CustomizeProduct ile aynı kural); kayıt ve kutu yine açılır
if (secim.includes('d2')) {
  const { ctx, p, formlar } = await baglam({ webm: true, kuponKapali: true });
  await p.goto(adres('/', 'jfclub=ac'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => { const k = document.querySelector('[data-jfclub]'); return k && k.classList.contains('jfclub--acik'); }, null, { timeout: 15000 });
  const izin = await p.evaluate(() => Shopify.customerPrivacy && Shopify.customerPrivacy.marketingAllowed());
  await p.fill('[data-jfclub-eposta]', 'izinsiz@ornek.com');
  await bekle(1500);
  await p.click('[data-jfclub-gonder]');
  await bekle(4000);
  const d = await durum(p);
  const lead = await p.evaluate(() => window.__fbq.filter((x) => x[2] === 'Lead').length);
  yaz('d2) pazarlama izni yokken Lead yok, kutu açıldı', izin === false && lead === 0 && d.odul && formlar.length === 1, JSON.stringify({ izin, lead, odul: d.odul }));
  await ctx.close();
}

// d3) Doğrulama penceresi kapatılırsa (jeton yok) istek gitmez, buton ~10 sn sonra yeniden açılır
if (secim.includes('d3')) {
  const { ctx, p, formlar } = await baglam({ webm: true, kuponKapali: true, hcaptcha: 'kapatildi' });
  await p.goto(adres('/', 'jfclub=ac'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => { const k = document.querySelector('[data-jfclub]'); return k && k.classList.contains('jfclub--acik'); }, null, { timeout: 15000 });
  await p.fill('[data-jfclub-eposta]', 'kapatti@ornek.com');
  await bekle(1500);
  await p.click('[data-jfclub-gonder]');
  await bekle(1500);
  const kilitli = await p.evaluate(() => document.querySelector('[data-jfclub-gonder]').disabled);
  await bekle(10500);
  const acildi = await p.evaluate(() => !document.querySelector('[data-jfclub-gonder]').disabled);
  const d = await durum(p);
  yaz('d3) doğrulama kapatılınca istek yok, buton yeniden açıldı, kutu kapalı kaldı', kilitli && acildi && formlar.length === 0 && d.posta && !d.ls, JSON.stringify({ kilitli, acildi, istek: formlar.length, hc: await p.evaluate(() => window.__hc) }));
  await ctx.close();
}

// e) Taklit /challenge: normal gönderime düşer; ?customer_posted=true#jfclub-form ile dönüşte açılış klibi
if (secim.includes('e')) {
  const { ctx, p, formlar } = await baglam({ webm: true, form: 'challenge', kuponKapali: true });
  await p.goto(adres('/', 'jfclub=ac'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => { const k = document.querySelector('[data-jfclub]'); return k && k.classList.contains('jfclub--acik'); }, null, { timeout: 15000 });
  await p.fill('[data-jfclub-eposta]', 'challenge-testi@ornek.com');
  await Promise.all([p.waitForURL(/\/challenge/, { timeout: 15000 }).catch(() => {}), p.click('[data-jfclub-gonder]')]);
  yaz('e) /challenge yanıtında form normal gönderildi (sayfa gitti)', formlar.length === 2 && !formlar[0].gezinme && formlar[1].gezinme && formlar[1].eposta === 'challenge-testi@ornek.com' && /\/challenge/.test(p.url()), `istekler: ${JSON.stringify(formlar)}; adres: ${kisa(p.url())}`);
  await p.goto(adres('/', '', '&customer_posted=true#jfclub-form').replace('&&', '&'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await bekle(7000);
  const iz = await p.evaluate(() => __iz);
  const d = await durum(p);
  const k2 = iz.find((x) => x[1] === 'olay' && x[2] === '2' && x[3] === 'playing');
  const k3 = iz.find((x) => x[1] === 'olay' && x[2] === '3' && x[3] === 'playing');
  const lead = await p.evaluate(() => window.__fbq.filter((x) => x[2] === 'Lead').length);
  yaz('e) dönüşte pop-up kendiliğinden açıldı, açılış klibi oynadı, kod ekranı; adres temizlendi', d.acik && !!k2 && !!k3 && d.odul && d.on.join() === '3' && !/customer_posted/.test(d.url) && d.adres === 'e-posta' && /kayitli/.test(d.ls), JSON.stringify({ url: d.url, k2: !!k2, k3: !!k3, adres: d.adres, lead }));
  await ctx.close();
}

// f) Kapatınca rozet "?"; 7 gün ve 30 gün kuralları (saat ileri alınarak)
if (secim.includes('f')) {
  const { ctx, p } = await baglam({ kuponKapali: true });
  await p.goto(adres('/', 'jfclub=ac'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => { const k = document.querySelector('[data-jfclub]'); return k && k.classList.contains('jfclub--acik'); }, null, { timeout: 15000 });
  await p.click('[data-jfclub-kapat]'); await bekle(800);
  const d = await durum(p);
  yaz('f) kayıt olmadan kapatınca rozet "?"', d.rozet && d.etiket === '?' && /kapatildi/.test(d.ls));
  const kapatma = d.ls;
  await ctx.close();
  const kayit = dur('kayitli');
  for (const [ad, ls, gun, rozetBeklenen, etiketBeklenen, acikBeklenen] of [
    ['kapatıldı +6,9 gün', kapatma, 6.9, true, '?', false], ['kapatıldı +7,1 gün', kapatma, 7.1, false, null, true],
    ['kayıtlı +29,9 gün', kayit, 29.9, true, '%15', false], ['kayıtlı +30,1 gün', kayit, 30.1, false, null, false]]) {
    const s = await baglam({ kuponKapali: true, saatKaydir: gun * GUN });
    await s.p.goto(adres('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await durumYaz(s.p, ls);
    await s.p.goto(adres('/'), { waitUntil: 'load', timeout: 60000 });
    await bekle(2500);
    const r = await durum(s.p);
    await s.p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await bekle(2500);
    const a = await durum(s.p);
    yaz(`f) ${ad}: rozet ${rozetBeklenen ? '"' + etiketBeklenen + '"' : 'yok'}, otomatik ${acikBeklenen ? 'açılır' : 'açılmaz'}`, r.rozet === rozetBeklenen && (!rozetBeklenen || r.etiket === etiketBeklenen) && a.acik === acikBeklenen, JSON.stringify({ rozet: r.rozet, etiket: r.etiket, kaydirincaAcildi: a.acik }));
    await s.ctx.close();
  }
}

// g) Tema ayarında pop-up kapalı (jfclub_aktif: false) iken hiçbir pop-up dosyası yüklenmez. Yalnızca ayar
// kapatılmışken çalıştırılır: node test/jfclub/onizleme-kontrol.mjs g
if (secim.includes('g') && process.argv[2] && process.argv[2].split(',').includes('g')) {
  for (const [ad, yol, ek] of [['ana sayfa', '/', ''], ['ana sayfa ?jfclub=ac', '/', 'jfclub=ac'], ['ürün sayfası', '/products/kanvas-lacivert-tote-canta', '']]) {
    const { ctx, p, istekler } = await baglam({ kuponKapali: true });
    await p.goto(adres('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await durumYaz(p, dur('kapatildi'));
    await p.goto(adres(yol, ek), { waitUntil: 'load', timeout: 60000 });
    await bekle(3000);
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await bekle(11000);
    const d = await durum(p);
    yaz(`g) ayar kapalı, ${ad}: işaretleme yok, jfclub dosyası istenmedi`, d.tema == TEMA && !d.ayar && !d.kok && jf(istekler).length === 0, JSON.stringify({ tema: d.tema, ayar: d.ayar, kok: d.kok, jfclub: jf(istekler).map((x) => kisa(x.url)) }));
    await ctx.close();
  }
}

// h) Eklenen JS ve CSS boyutları (ham ve CDN'in sıkıştırılmış aktarımı)
if (secim.includes('h')) {
  const { ctx, p } = await baglam({ kuponKapali: true });
  await p.goto(adres('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  const ayar = await p.evaluate(() => ({ js: document.querySelector('script[src*="jfclub-popup.js"]').src, css: JSON.parse(document.getElementById('jfclub-ayar').textContent).css, sablon: document.getElementById('jfclub-sablon').innerHTML.length + document.getElementById('jfclub-ayar').outerHTML.length }));
  // Aktarım boyutu curl ile (Playwright ve fetch sıkıştırmayı kendileri açar)
  const { execFileSync } = await import('node:child_process');
  const olc = (u, kodlama) => {
    const c = execFileSync('curl', ['-s', '-o', '/dev/null', '-H', `accept-encoding: ${kodlama}`, '-w', '%{http_code} %{size_download} %{content_type}', new URL(u, SITE).href]).toString().split(' ');
    return { durum: +c[0], bayt: +c[1], tur: c[2] };
  };
  for (const [ad, u] of [['jfclub-popup.js', ayar.js], ['jfclub-popup.css', ayar.css]]) {
    console.log(`h) ${ad}: CDN'den sıkıştırmasız ${JSON.stringify(olc(u, 'identity'))} · gzip ${JSON.stringify(olc(u, 'gzip'))} · br ${JSON.stringify(olc(u, 'br'))}`);
  }
  console.log(`h) sayfaya eklenen satır içi işaretleme (ayar + şablon): ${ayar.sablon} karakter`);
  await ctx.close();
}

await tarayici.close();
const kalan = sonuclar.filter((x) => !x[1]);
console.log(`\n${sonuclar.length - kalan.length}/${sonuclar.length} geçti${kalan.length ? ' · kalan: ' + kalan.map((x) => x[0]).join(' | ') : ''}`);
