// Kullanim: node fonksiyon.js <tema_id> <cikis.json>
// Kopya temada video davranisini Google Chrome ile dogrular (takip engelli):
//  A) Telefon (390x844): ana sayfa hero -> yalnizca hafif surum, oynuyor mu; slider dokunmadan 0 istek;
//     kaydirinca da 0; oynat'a dokununca telefon surumu iner ve oynar; sonraki karta dokununca o da.
//  B) Telefon: couple-landing tamamen kaydirilir -> 0 video istegi; mozaik oynat -> telefon surumu, sesli oynar.
//  C) Telefon: UGC (zaman-kapsul-kolye) -> dokununca telefon adresi.
//  D) Masaustu (1440x900): hero -> masaustu 3 Mbps; slider oynat -> bugunku 1080p.
//  E) Telefon + Save-Data ve 3g: hero videosu hic inmez, kapak kalir.
// Her senaryoda masaustu dosyasi / 1080p telefona indi mi diye ag kaydi tutulur.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const TID = process.argv[2];
const cikis = process.argv[3];
const CH = '/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/chrome/opt/google/chrome/chrome';
const engel = fs.readFileSync(path.join(__dirname, 'engel.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const engelRe = engel.map(p => new RegExp('^' + p.split('*').map(x => x.replace(/[.+?^${}()|[\]\\\/]/g, '\\$&')).join('.*') + '$'));
const MASAUSTU_HERO = 'f47b893d13bb40bdaa1c9b3535dcb7da';
const HAFIF = 'a95d7952437d458cba4a5ea3386b4f1c';
const bekle = ms => new Promise(r => setTimeout(r, ms));

async function baglam(br, tur, ek) {
  const opt = tur === 'telefon'
    ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }
    : { viewport: { width: 1440, height: 900 } };
  const ctx = await br.newContext(opt);
  await ctx.route('**/*', r => engelRe.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
  if (ek) await ctx.addInitScript(ek);
  const page = await ctx.newPage();
  const istek = [];
  page.on('request', q => { if (/\.mp4(\?|$)/.test(q.url())) istek.push({ t: Date.now(), url: q.url().split('?')[0].replace(/^https?:\/\/[^/]+/, '') }); });
  return { ctx, page, istek };
}
const videoDurum = page => page.evaluate(() => [...document.querySelectorAll('video')].map(v => ({
  sinif: v.className.split(' ')[0], src: (v.currentSrc || v.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, ''),
  preload: v.preload, paused: v.paused, rs: v.readyState, muted: v.muted, sure: +(v.currentTime || 0).toFixed(2), hata: v.error ? v.error.code : null })));
const kod = u => (u.match(/([0-9a-f]{32})/) || [])[1] || u;

(async () => {
  const br = await chromium.launch({ executablePath: CH, args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
  const S = {};
  const url = p => 'https://texttonext.com' + p + '?preview_theme_id=' + TID;

  // A) telefon ana sayfa
  {
    const { ctx, page, istek } = await baglam(br, 'telefon');
    await page.goto(url('/'), { waitUntil: 'load', timeout: 120000 });
    await bekle(5000);
    const hero = (await videoDurum(page)).find(v => v.sinif === 'hv-video');
    const yuklemeIstekleri = istek.map(r => kod(r.url));
    // Slider'a kadar kaydir; oynat'a BASMADAN aktif slayt kendiliginden oynamali (eski davranis).
    await page.evaluate(() => { const r = document.querySelector('[data-vs-root]'); const b = r.getBoundingClientRect(); window.scrollTo(0, b.top + scrollY - (innerHeight - b.height) / 2); });
    await bekle(5000);
    const kaydirSonrasi = istek.map(r => kod(r.url));
    const oynatSonrasi = kaydirSonrasi;
    const slayt1 = (await videoDurum(page)).filter(v => v.sinif === 'vs-video');
    const kartlar = await page.$$('[data-vs-go]');
    if (kartlar[1]) { await kartlar[1].click(); await bekle(4000); }
    const slayt2 = (await videoDurum(page)).filter(v => v.sinif === 'vs-video');
    S.A_telefon_anasayfa = { hero, yuklemeIstekleri, kaydirSonrasi, oynatSonrasi, slayt1, slayt2, tumIstekler: istek,
      masaustuDosyasiIndi: istek.some(r => r.url.includes(MASAUSTU_HERO) || /HD-1080p/.test(r.url)) };
    await ctx.close();
  }
  // B) telefon couple-landing
  {
    const { ctx, page, istek } = await baglam(br, 'telefon');
    await page.goto(url('/pages/couple-daha-fazla-bilgi-al'), { waitUntil: 'load', timeout: 120000 });
    await bekle(3000);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await page.evaluate(y => window.scrollTo(0, y), y); await bekle(250); }
    await bekle(3000);
    const kaydirSonrasi = istek.map(r => kod(r.url));
    const btn = await page.$('[data-mk-play]');
    let mozaik = null;
    if (btn) {
      await btn.scrollIntoViewIfNeeded(); await bekle(800);
      const kutu = await btn.boundingBox();
      await page.mouse.click(kutu.x + kutu.width / 2, kutu.y + kutu.height / 2);
      await bekle(5000);
      // Couple sayfalarinda tt-couple.liquid'in isik kutusu kartin videosunu klonlayip tam ekranda oynatiyor.
      mozaik = (await videoDurum(page)).filter(v => v.sinif === 'mk-video' || v.sinif === 'tt-vid-oynatici');
    }
    S.B_telefon_couple_landing = { kaydirSonrasi, oynatSonrasi: istek.map(r => kod(r.url)), mozaik, tumIstekler: istek,
      masaustuDosyasiIndi: istek.some(r => /HD-1080p/.test(r.url)) };
    await ctx.close();
  }
  // C) telefon UGC
  {
    const { ctx, page, istek } = await baglam(br, 'telefon');
    await page.goto(url('/products/zaman-kapsul-kolye'), { waitUntil: 'load', timeout: 120000 });
    await bekle(3000);
    const once = istek.map(r => kod(r.url));
    const btn = await page.$('[data-ugc-open]');
    let ugc = null;
    if (btn) { await btn.scrollIntoViewIfNeeded(); await btn.click(); await bekle(5000); ugc = (await videoDurum(page)).filter(v => /ugc/.test(v.sinif)); }
    S.C_telefon_ugc = { dokunmadan: once, dokununca: istek.map(r => kod(r.url)), ugc, tumIstekler: istek, masaustuDosyasiIndi: istek.some(r => /HD-1080p/.test(r.url)) };
    await ctx.close();
  }
  // D) masaustu ana sayfa
  {
    const { ctx, page, istek } = await baglam(br, 'masaustu');
    await page.goto(url('/'), { waitUntil: 'load', timeout: 120000 });
    await bekle(5000);
    const hero = (await videoDurum(page)).find(v => v.sinif === 'hv-video');
    const yukleme = istek.map(r => kod(r.url));
    await page.evaluate(() => { const r = document.querySelector('[data-vs-root]'); const b = r.getBoundingClientRect(); window.scrollTo(0, b.top + scrollY - (innerHeight - b.height) / 2); });
    await bekle(3000);
    const kaydir = istek.map(r => kod(r.url));
    await bekle(6000); // masaustunde otomatik gecis (4 sn) siradaki slayti oynatir
    S.D_masaustu_anasayfa = { hero, yukleme, kaydir, oynat: istek.map(r => r.url.split('/').pop()), slayt: (await videoDurum(page)).filter(v => v.sinif === 'vs-video') };
    await ctx.close();
  }
  // E) telefon Save-Data ve 3g
  for (const [ad, baglanti] of [['saveData', { saveData: true, effectiveType: '4g' }], ['3g', { saveData: false, effectiveType: '3g' }]]) {
    const ek = `Object.defineProperty(navigator, 'connection', { configurable: true, get: () => (${JSON.stringify(baglanti)}) });`;
    const { ctx, page, istek } = await baglam(br, 'telefon', ek);
    await page.goto(url('/'), { waitUntil: 'load', timeout: 120000 });
    await bekle(5000);
    const hero = (await videoDurum(page)).find(v => v.sinif === 'hv-video');
    const kapak = await page.evaluate(() => { const i = document.querySelector('img.hv-kapak'); return i ? { yuklendi: i.complete && i.naturalWidth > 0, src: i.currentSrc.split('?')[0].split('/').pop() + '?' + (i.currentSrc.split('?')[1] || '') } : null; });
    S['E_' + ad] = { hero, kapak, istekler: istek.map(r => kod(r.url)) };
    await ctx.close();
  }
  fs.writeFileSync(cikis, JSON.stringify(S, null, 1));
  const k = S;
  console.log('A hero', JSON.stringify(k.A_telefon_anasayfa.hero), '| yukleme', k.A_telefon_anasayfa.yuklemeIstekleri, '| slidera kaydirinca', k.A_telefon_anasayfa.kaydirSonrasi, '| masaustu/1080p indi mi', k.A_telefon_anasayfa.masaustuDosyasiIndi);
  console.log('A slayt1', JSON.stringify(k.A_telefon_anasayfa.slayt1.map(v => [kod(v.src), v.paused, v.rs, v.hata])));
  console.log('A slayt2', JSON.stringify(k.A_telefon_anasayfa.slayt2.map(v => [kod(v.src), v.paused, v.rs, v.hata])));
  console.log('B kaydir', k.B_telefon_couple_landing.kaydirSonrasi, '| oynat', k.B_telefon_couple_landing.oynatSonrasi, JSON.stringify((k.B_telefon_couple_landing.mozaik || []).map(v => [kod(v.src), v.paused, v.muted, v.rs, v.hata])), '| 1080p indi mi', k.B_telefon_couple_landing.masaustuDosyasiIndi);
  console.log('C dokunmadan', k.C_telefon_ugc.dokunmadan, '| dokununca', k.C_telefon_ugc.dokununca, JSON.stringify((k.C_telefon_ugc.ugc || []).map(v => [kod(v.src), v.paused, v.rs, v.hata])), '| 1080p indi mi', k.C_telefon_ugc.masaustuDosyasiIndi);
  console.log('D hero', JSON.stringify(k.D_masaustu_anasayfa.hero), '| yukleme', k.D_masaustu_anasayfa.yukleme, '| kaydir', k.D_masaustu_anasayfa.kaydir, '| oynat', k.D_masaustu_anasayfa.oynat);
  console.log('E saveData', JSON.stringify(k.E_saveData));
  console.log('E 3g', JSON.stringify(k.E_3g));
  await br.close();
})();
