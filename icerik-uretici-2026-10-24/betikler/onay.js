// Gonderim sonrasi gorunum: Shopify basarili gonderimde sayfayi ?contact_posted=true ile acar.
// Bu adres dogrudan acilip onay kutusu, sonra temiz adreste (yenileme) kalicilik denetlenir. Beacon'lar iptal.
const { chromium } = require('playwright');
const fs = require('fs');
const TID = process.argv[2], OUT = process.argv[3];
const BEACON = /facebook\.com\/tr|\/g\/collect|google-analytics|googleadservices|doubleclick|google\.com\/(ccm|pagead)|analytics\.tiktok\.com\/api|monorail-edge|\/\.well-known\/shopify\/monorail|trueprofit/;
(async () => {
  const br = await chromium.launch();
  const S = {};
  for (const [ad, w, h, m] of [['390', 390, 844, true], ['1440', 1440, 900, false]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, locale: 'tr-TR' });
    await ctx.route('**/*', r => BEACON.test(r.request().url()) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    const durum = () => p.evaluate(() => {
      const t = document.querySelector('[data-ttiu-tamam]'), a = document.querySelector('[data-ttiu-alanlar]');
      const b = t.getBoundingClientRect();
      return { tamamGorunur: !t.hidden && b.height > 0, yeniGonderim: t.hasAttribute('data-ttiu-yeni'), metin: t.innerText.trim(), rol: t.getAttribute('role'),
        alanlarVar: !!a, alanlarGizli: !a || a.hidden, kutu: { w: Math.round(b.width), h: Math.round(b.height) }, zemin: getComputedStyle(t).backgroundColor, yazi: getComputedStyle(t).color,
        ikon: t.querySelector('circle').getAttribute('fill') + ' / tik ' + t.querySelector('path').getAttribute('stroke'),
        sakli: (() => { try { return !!localStorage.getItem('ttIcerikBasvuru'); } catch (e) { return 'hata'; } })() };
    });
    const once = 'https://texttonext.com/pages/icerik-uretici?preview_theme_id=' + TID;
    await p.goto(once, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2000);
    const ilk = await durum();
    await p.goto('https://texttonext.com/pages/icerik-uretici?contact_posted=true&preview_theme_id=' + TID + '#TtIcerikForm', { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2000);
    const gonderim = await durum();
    await p.goto(once, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2000);
    const yenile = await durum();
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2000);
    const yenile2 = await durum();
    S[ad] = { ilkAcilis: ilk, contactPostedTrue: gonderim, temizAdres: yenile, ikinciYenileme: yenile2 };
    await ctx.close();
  }
  await br.close();
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  console.log(JSON.stringify(S, null, 1));
})();
