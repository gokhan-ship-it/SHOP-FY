// Test basvurusu (kopya tema onizlemesi, 390px). Takip beacon'lari iptal edilir.
// Kullanim: node basvuru.js <tema_id> <cikis.json>
const { chromium } = require('playwright');
const fs = require('fs');
const TID = process.argv[2], OUT = process.argv[3];
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail-edge|\/\.well-known\/shopify\/monorail|trueprofit/;
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
  const p = await ctx.newPage();
  const S = { tema: TID, zaman: new Date().toISOString(), istekler: [], hcaptcha: [] };
  p.on('request', q => {
    const u = q.url();
    if (q.method() === 'POST' && /texttonext\.com\/contact/.test(u)) S.post = { url: u, govde: q.postData() };
    if (/hcaptcha\.com/.test(u)) S.hcaptcha.push(q.method() + ' ' + u.replace(/\?.*$/, '').slice(0, 90));
  });
  p.on('response', r => { if (/texttonext\.com\/(contact|pages\/icerik-uretici|challenge)/.test(r.url()) && r.request().resourceType() === 'document') S.istekler.push(r.status() + ' ' + r.url().replace('https://texttonext.com', '')); });
  await p.goto('https://texttonext.com/pages/icerik-uretici?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(5000);
  await p.click('.ttiu-ters'); await p.waitForTimeout(800);
  await p.fill('#TtIcerik-ad', 'TEST – silinebilir');
  await p.fill('#TtIcerik-ig', '@test_silinebilir');
  await p.fill('#TtIcerik-tt', '@test_silinebilir');
  await p.click('label[for="TtIcerik-takipci-1"]');
  await p.click('label[for="TtIcerik-urun-1"]');
  await p.fill('#TtIcerik-tel', '0500 000 00 00');
  await p.fill('#TtIcerik-eposta', 'info@texttonext.com');
  await p.click('label.ttiu-onay-kutu');
  S.gonderimOncesi = await p.evaluate(() => ({ konu: document.querySelector('[data-ttiu-konu]').value, onay: document.getElementById('TtIcerik-onay').checked,
    hcaptchaBagli: document.getElementById('TtIcerikForm').dataset.hcaptchaBound || null }));
  await Promise.all([
    p.waitForURL(/contact_posted=true|challenge/, { timeout: 60000 }).catch(e => { S.beklemeHatasi = e.message.slice(0, 120); }),
    p.click('.ttiu-gonder'),
  ]);
  await p.waitForTimeout(4000);
  S.sonUrl = p.url().replace('https://texttonext.com', '');
  S.captchaPenceresi = await p.evaluate(() => [...document.querySelectorAll('iframe')].filter(f => /hcaptcha/.test(f.src) && f.getBoundingClientRect().height > 100).length);
  const durum = () => p.evaluate(() => {
    const t = document.querySelector('[data-ttiu-tamam]'), a = document.querySelector('[data-ttiu-alanlar]');
    return { tema: Shopify.theme.id, tamamGorunur: !!t && !t.hidden && t.getBoundingClientRect().height > 0, tamamMetni: t ? t.innerText.trim() : null,
      alanlarGizli: !a || a.hidden, zemin: t ? getComputedStyle(t).backgroundColor : null,
      ikon: t && t.querySelector('circle') ? t.querySelector('circle').getAttribute('fill') : null,
      sakli: (() => { try { return localStorage.getItem('ttIcerikBasvuru'); } catch (e) { return 'hata'; } })() };
  });
  S.gonderimSonrasi = await durum();
  await p.goto('https://texttonext.com/pages/icerik-uretici?preview_theme_id=' + TID, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(3000);
  S.yenilemeSonrasi = { url: p.url().replace('https://texttonext.com', ''), ...(await durum()) };
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3000);
  S.ikinciYenileme = await durum();
  await br.close();
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  console.log(JSON.stringify(S, null, 1));
})();
