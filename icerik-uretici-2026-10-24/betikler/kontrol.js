// Kullanim: node kontrol.js <tema_id> <cikis.json>
// Icerik uretici sayfasi otomatik kontrolleri (kopya tema onizlemesi):
//  1) 390 / 360 / 1440: tasma, icerik genisligi, tek sutun, dokunma alanlari, renk/font
//  2) Konsol hatalari: yeni sayfa ve karsilastirma sayfasi (/pages/iletisim)
//  3) Takip istekleri: beacon'lar (facebook.com/tr, g/collect, tiktok api, monorail) YAKALANIP
//     IPTAL edilir (gercek veri gitmez); hangi olaylarin gidecegi karsilastirilir.
//  4) Telefon: "Hemen basvur" kaydirma, bos gonderim uyarilari (POST gitmemeli), klavye, erisilebilir adlar
const { chromium } = require('playwright');
const fs = require('fs');
const TID = process.argv[2];
const OUT = process.argv[3];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/,
  /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const url = p => 'https://texttonext.com' + p + (p.includes('?') ? '&' : '?') + 'preview_theme_id=' + TID;

function olayAdi(u, govde) {
  try {
    const x = new URL(u);
    if (/facebook\.com\/tr/.test(u)) return 'meta:' + (x.searchParams.get('ev') || (govde || '').match(/ev=([^&]+)/)?.[1] || '?');
    if (/collect/.test(x.pathname) && /google/.test(x.host)) return 'ga4:' + (x.searchParams.get('en') || ((govde || '').match(/en=([^&\s]+)/) || [])[1] || '?');
    if (/tiktok/.test(x.host)) return 'tiktok:' + (((govde || '').match(/"event":"([^"]+)"/) || [])[1] || x.pathname);
    if (/monorail/.test(u)) {
      const adlar = [...new Set([...(govde || '').matchAll(/"(?:event_name|eventName|name)":"([a-z_]+)"/g)].map(m => m[1]))];
      const sema = [...new Set([...(govde || '').matchAll(/"schema_id":"([^"]+)"/g)].map(m => m[1].replace(/\/\d.*$/, '')))];
      return 'monorail:' + sema.join('+') + (adlar.length ? '[' + adlar.join(',') + ']' : '');
    }
    return x.host + x.pathname.slice(0, 30);
  } catch (e) { return u.slice(0, 60); }
}

async function ac(br, w, h, mobil) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: mobil ? 3 : 1, locale: 'tr-TR',
    userAgent: mobil ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
  const beacon = [];
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (BEACON.some(re => re.test(u))) { beacon.push(olayAdi(u, r.request().postData())); return r.abort(); }
    return r.continue();
  });
  const page = await ctx.newPage();
  const konsol = [];
  page.on('console', m => { if (m.type() === 'error') konsol.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => konsol.push('pageerror: ' + String(e.message).slice(0, 200)));
  const post = [];
  page.on('request', q => { if (q.method() === 'POST' && /\/contact/.test(q.url())) post.push(q.url()); });
  return { ctx, page, beacon, konsol, post };
}

async function olcum(page) {
  return page.evaluate(() => {
    const k = document.querySelector('[data-ttiu]');
    const r = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
    const ic = k.querySelector('.ttiu-govde .ttiu-ic');
    const cs = getComputedStyle(ic);
    const icerik = ic.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const hedefler = [
      ['Hemen başvur', '.ttiu-ters'], ['Takipçi hapı', '.ttiu-hap label'], ['Single/Couple kartı', '.ttiu-secim label'],
      ['Metin alanı', '.ttiu-girdi'], ['Onay kutusu (dokunma alanı)', '.ttiu-onay-kutu'], ['Onay metni', '.ttiu-onay-metin'],
      ['Başvuruyu gönder', '.ttiu-gonder']].map(([ad, s]) => {
        const els = [...k.querySelectorAll(s)];
        return { ad, adet: els.length, enKucukW: Math.min(...els.map(e => Math.round(e.getBoundingClientRect().width))), enKucukH: Math.min(...els.map(e => Math.round(e.getBoundingClientRect().height))) };
      });
    const fl = document.querySelector('.tt-footer-satir a, [class^="ttfs-"] a');
    if (fl) hedefler.push({ ad: 'Footer linki', adet: 1, enKucukW: Math.round(fl.getBoundingClientRect().width), enKucukH: Math.round(fl.getBoundingClientRect().height) });
    const h1 = k.querySelector('h1');
    const sp = h1.querySelectorAll('span');
    const kutular = [...k.querySelectorAll('.ttiu-kutu')].map(r);
    const secimler = [...k.querySelectorAll('.ttiu-secim')].map(r);
    const adimlar = [...k.querySelectorAll('.ttiu-adimlar li')].map(r);
    const renk = s => { const e = k.querySelector(s); return e ? getComputedStyle(e).color : null; };
    const zemin = s => { const e = k.querySelector(s); return e ? getComputedStyle(e).backgroundColor : null; };
    const kutuBaslikSatir = [...k.querySelectorAll('.ttiu-kutu-ust')].map(e => Math.round(e.getBoundingClientRect().height));
    const kutuAltSatir = [...k.querySelectorAll('.ttiu-kutu-alt')].map(e => Math.round(e.getBoundingClientRect().height / 18.2));
    const footerSira = [...document.querySelectorAll('.shopify-section-group-footer-group, [id^="shopify-section-sections--"][id*="__"]')]
      .filter(e => e.closest('footer') || /footer|newsletter|tt_footer/.test(e.id)).map(e => e.id.replace(/^.*__/, ''));
    return {
      tasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      icerikGenisligi: Math.round(icerik), formKart: r(k.querySelector('.ttiu-kart')),
      h1: { font: getComputedStyle(h1).fontFamily.split(',')[0], boyut: getComputedStyle(h1).fontSize, kalinlik: getComputedStyle(h1).fontWeight, harf: getComputedStyle(h1).letterSpacing, satir1: getComputedStyle(sp[0]).color, satir2: getComputedStyle(sp[1]).color },
      etiket: { renk: renk('.ttiu-giris .ttiu-etiket'), boyut: getComputedStyle(k.querySelector('.ttiu-etiket')).fontSize, harf: getComputedStyle(k.querySelector('.ttiu-etiket')).letterSpacing },
      aciklama: renk('.ttiu-aciklama'), giris: zemin('.ttiu-giris'), govde: getComputedStyle(document.querySelector('#shopify-section-' + k.id.replace('TtIcerik-', ''))).backgroundColor,
      daireler: [...k.querySelectorAll('.ttiu-daire')].map(e => getComputedStyle(e).backgroundColor + ' / ' + getComputedStyle(e).color),
      h2: { boyut: getComputedStyle(k.querySelector('h2')).fontSize, satir2: getComputedStyle(k.querySelector('h2 .ttiu-ikinci')).color },
      gonder: zemin('.ttiu-gonder') + ' / ' + renk('.ttiu-gonder') + ' / r=' + getComputedStyle(k.querySelector('.ttiu-gonder')).borderRadius,
      ters: zemin('.ttiu-ters') + ' / ' + renk('.ttiu-ters'),
      kutular, kutuBaslikSatir, kutuAltSatir, secimler, adimlarX: adimlar.map(a => a.x), hedefler, footerSira,
    };
  });
}

(async () => {
  const br = await chromium.launch();
  const S = { tema: TID, zaman: new Date().toISOString(), gorunum: {}, konsol: {}, takip: {}, etkilesim: {} };
  for (const [ad, w, h, m] of [['390', 390, 844, true], ['360', 360, 780, true], ['1440', 1440, 900, false]]) {
    for (const yol of ['/pages/icerik-uretici', '/pages/iletisim']) {
      const o = await ac(br, w, h, m);
      await o.page.goto(url(yol), { waitUntil: 'load', timeout: 120000 });
      await bekle(9000);
      const tema = await o.page.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.id);
      if (yol === '/pages/icerik-uretici') S.gorunum[ad] = { tema, ...(await olcum(o.page)) };
      S.konsol[ad + ' ' + yol] = o.konsol;
      const say = {}; o.beacon.forEach(b => { say[b] = (say[b] || 0) + 1; });
      S.takip[ad + ' ' + yol] = say;
      await o.ctx.close();
    }
  }

  // Etkilesim (390)
  {
    const o = await ac(br, 390, 844, true);
    const p = o.page;
    await p.goto(url('/pages/icerik-uretici'), { waitUntil: 'load', timeout: 120000 });
    await bekle(6000);
    const E = S.etkilesim;
    await p.click('.ttiu-ters');
    await bekle(1200);
    E.hemenBasvur = await p.evaluate(() => ({ formUst: Math.round(document.getElementById('basvuru').getBoundingClientRect().top), odak: document.activeElement.id, hash: location.hash }));
    // Bos gonderim
    await p.evaluate(() => document.activeElement.blur());
    await p.click('.ttiu-gonder');
    await bekle(3000);
    E.bosGonderim = await p.evaluate(() => ({
      uyarilar: [...document.querySelectorAll('.ttiu-uyari')].map(e => ({ id: e.id, metin: e.textContent })).filter(x => x.metin),
      gecersiz: [...document.querySelectorAll('[aria-invalid="true"]')].map(e => e.id || e.querySelector('legend')?.textContent),
      odak: document.activeElement.id, butonPasif: document.querySelector('.ttiu-gonder').disabled,
      captchaGorunur: [...document.querySelectorAll('iframe')].filter(f => /hcaptcha/.test(f.src) && f.getBoundingClientRect().height > 100 && getComputedStyle(f).visibility !== 'hidden').length,
    }));
    E.bosGonderimPOST = o.post.length;
    // Klavye: TikTok'tan Tab -> takipci grubu, ok tusu, Tab -> urun, bosluk
    await p.focus('#TtIcerik-tt');
    await p.keyboard.press('Tab');
    const k1 = await p.evaluate(() => document.activeElement.id);
    await p.keyboard.press('ArrowRight');
    const k2 = await p.evaluate(() => ({ odak: document.activeElement.id, secili: document.querySelector('input[name="contact[Takipçi]"]:checked')?.value,
      halka: getComputedStyle(document.querySelector('label[for="' + document.activeElement.id + '"]')).outlineStyle,
      uyari: document.getElementById('TtIcerik-takipci-uyari').textContent }));
    await p.keyboard.press('Tab');
    const k3 = await p.evaluate(() => document.activeElement.id);
    await p.keyboard.press('Space');
    const k4 = await p.evaluate(() => ({ secili: document.querySelector('input[name="contact[Ürün]"]:checked')?.value }));
    await p.keyboard.press('Tab');
    const k5 = await p.evaluate(() => document.activeElement.id);
    await p.focus('#TtIcerik-eposta'); await p.keyboard.press('Tab');
    const k6 = await p.evaluate(() => document.activeElement.id);
    await p.keyboard.press('Space');
    const k7 = await p.evaluate(() => document.getElementById('TtIcerik-onay').checked);
    E.klavye = { tiktokSonrakiTab: k1, okSag: k2, tabUrun: k3, boslukUrun: k4, tabSonra: k5, epostaSonrakiTab: k6, boslukOnay: k7 };
    // Erisilebilir adlar
    const rol = async (r, n) => p.getByRole(r, { name: n, exact: false }).count();
    E.erisilebilirAd = {
      'textbox Ad soyad': await rol('textbox', 'Ad soyad'), 'textbox Instagram kullanıcı adı': await rol('textbox', 'Instagram kullanıcı adı'),
      'textbox TikTok kullanıcı adı (varsa)': await rol('textbox', 'TikTok kullanıcı adı (varsa)'), 'group Toplam takipçi sayın': await rol('group', 'Toplam takipçi sayın'),
      'radio 1–10 B': await rol('radio', '1–10 B'), 'radio 100 B+': await rol('radio', '100 B+'), 'group Hangisini denemek istersin?': await rol('group', 'Hangisini denemek istersin?'),
      'radio Single': await rol('radio', 'Single'), 'radio Couple': await rol('radio', 'Couple'), 'textbox Telefon (WhatsApp)': await rol('textbox', 'Telefon (WhatsApp)'),
      'textbox E-posta': await rol('textbox', 'E-posta'), 'checkbox KVKK…': await rol('checkbox', 'KVKK aydınlatma metnini okudum'), 'button Başvuruyu gönder': await rol('button', 'Başvuruyu gönder'),
      'link KVKK aydınlatma metnini': await rol('link', 'KVKK aydınlatma metnini'),
    };
    E.ariaAgaci = await p.locator('#TtIcerikForm').ariaSnapshot();
    E.kvkkLink = await p.evaluate(() => { const a = document.querySelector('.ttiu-onay a'); return { href: a.getAttribute('href'), target: a.target }; });
    E.konsol = o.konsol;
    E.POSTtoplam = o.post.length;
    await o.ctx.close();
  }
  await br.close();
  fs.writeFileSync(OUT, JSON.stringify(S, null, 1));
  console.log(JSON.stringify(S, null, 1).slice(0, 200));
})();
