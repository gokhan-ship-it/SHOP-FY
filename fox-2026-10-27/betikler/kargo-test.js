// SALT OKUMA: odeme adiminda kargo ucreti. Sepete urun + (istege bagli) cark kodu -> /checkout -> adres -> kargo satiri.
// SIPARIS VERILMEZ: odeme dugmesine basilmaz. Reklam/analitik istekleri engelli.
// Kullanim: node kargo-test.js <cikis.json> [senaryo-adi]
const { chromium } = require('playwright');
const fs = require('fs');
const [OUT, TEK] = process.argv.slice(2);
const B = 'https://texttonext.com';
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com/, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/, /connect\.facebook\.net/, /googletagmanager\.com/, /tiktok\.com\/i18n\/pixel/, /\/api\/collect/, /clarity\.ms/, /hotjar/];
const SENARYO = [
  // Fox (2.199 -> carkla 1.699) ile ayni yapi: indirim oncesi >= 2.000 ve < 2.499, sonrasi < 2.000
  { ad: 'A_luna_2299_kodlu', variant: 52718585610560, kod: 'K7QX4M9TR' },
  { ad: 'A0_luna_2299_kodsuz', variant: 52718585610560, kod: null },
  // Fox + Chloe (2.899 -> carkla 2.399) ile ayni yapi: oncesi >= 2.499, sonrasi < 2.499 ve >= 2.000
  { ad: 'B_lumin_2699_kodlu', variant: 52718545207616, kod: 'K7QX4M9TR' },
  // Esik alti kontrol: Chloe 2.099 -> 1.599 (oncesi de sonrasi da < 2.499; oncesi >= 2.000)
  { ad: 'C_chloe_2099_kodlu', variant: 52719202238784, kod: 'K7QX4M9TR' },
];
const bekle = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const S = [];
  for (const sc of SENARYO.filter(s => !TEK || s.ad === TEK)) {
    const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
    await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    const o = { senaryo: sc.ad, kod: sc.kod };
    try {
      // Sepet: tarayici gezinmesiyle (AJAX 429 verdi). /cart/add?id= -> /cart; kod: /discount/<kod> (carkin uyguladigi kodun aynisi)
      await p.goto(B + '/cart/clear', { waitUntil: 'load', timeout: 90000 }); await bekle(1500);
      await p.goto(B + '/cart/add?id=' + sc.variant + '&quantity=1', { waitUntil: 'load', timeout: 90000 }); await bekle(2000);
      if (sc.kod) { await p.goto(B + '/discount/' + sc.kod + '?redirect=/cart', { waitUntil: 'load', timeout: 90000 }); await bekle(2000); }
      o.sepet = await p.evaluate(async () => {
        const c = await (await fetch('/cart.js', { headers: { Accept: 'application/json' } })).json();
        return { urun: c.items.map(i => i.product_title + ' ' + i.final_line_price / 100), araToplam: c.items_subtotal_price / 100, toplam: c.total_price / 100, kodlar: (c.discount_codes || []).map(d => d.code + ':' + d.applicable), sepetIndirim: (c.cart_level_discount_applications || []).map(d => d.title + ' ' + d.total_allocated_amount / 100) };
      });
      await p.goto(B + '/checkout', { waitUntil: 'load', timeout: 90000 }); await bekle(8000);
      o.odemeYolu = new URL(p.url()).pathname.replace(/[A-Za-z0-9]{20,}/g, '<t>');
      const doldur = async (sel, deger) => { const e = p.locator(sel).first(); if (await e.count()) { await e.fill(deger); await bekle(250); return true; } return false; };
      o.alanlar = {};
      o.alanlar.email = await doldur('input[name="email"], input#email', 'kargo-test@example.com');
      const ulke = p.locator('select[name="countryCode"]').first();
      if (await ulke.count()) { o.ulkeOnce = await ulke.inputValue(); if (o.ulkeOnce !== 'TR') { await ulke.selectOption('TR'); await bekle(1500); } }
      o.alanlar.ad = await doldur('input[name="firstName"]', 'Test');
      o.alanlar.soyad = await doldur('input[name="lastName"]', 'Kontrol');
      o.alanlar.adres = await doldur('input[name="address1"]', 'Test Mahallesi Deneme Sokak No 1');
      o.alanlar.posta = await doldur('input[name="postalCode"]', '34710');
      o.alanlar.sehir = await doldur('input[name="city"]', 'Kadıköy');
      const il = p.locator('select[name="zone"]').first();
      if (await il.count()) { const sec = await il.locator('option').evaluateAll(os => os.map(x => ({ v: x.value, t: x.textContent.trim() }))); const ist = sec.find(x => /stanbul/i.test(x.t)); if (ist) { await il.selectOption(ist.v); o.alanlar.il = ist.t; } }
      o.alanlar.tel = await doldur('input[name="phone"]', '5320000000');
      await p.locator('input[name="phone"], input[name="postalCode"]').first().press('Tab').catch(() => {});
      await bekle(9000);
      const satirlar = await p.evaluate(() => document.body.innerText.split('\n').map(s => s.trim()).filter(Boolean));
      const i = satirlar.findIndex(s => /Kargo yöntemi|Gönderim yöntemi|Shipping method/i.test(s));
      o.kargoBolumu = i >= 0 ? satirlar.slice(i, i + 8) : null;
      o.ozet = satirlar.filter(s => /Ara toplam|Kargo|Gönderim|İndirim|Toplam|Ücretsiz|ÜCRETSİZ|K7QX|TL|₺/i.test(s)).slice(-30);
    } catch (e) { o.hata = String(e).split('\n')[0].slice(0, 200); }
    S.push(o); console.log(JSON.stringify(o));
    await ctx.close();
  }
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  await br.close();
})();
