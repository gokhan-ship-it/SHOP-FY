// Sepet testi (taslak tema, onizleme cubugu gizlenmez).
// A) Bos cekmece: ac -> "Alisverise devam" -> cekmece kapaniyor mu, adres degisiyor mu, odak acan ogeye donuyor mu
//    Karsilastirma: ayni seyi X (masaustu) / perde (telefon) ile yap
// B) Dolu cekmece: butonlari listele
// C) /cart bos durum: link adresi ve tiklayinca gidilen sayfa
const { webkit, devices } = require('playwright');
const fs = require('fs');
const CIK = process.argv[2]; fs.mkdirSync(CIK, { recursive: true });
const T = 'preview_theme_id=189140861248';
const URUN = 'https://texttonext.com/products/zaman-kapsul-kolye';
(async () => {
  const br = await webkit.launch(); const sonuc = [];
  for (const cihaz of ['telefon', 'masaustu']) {
    const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const durum = () => p.evaluate(() => {
      const d = document.getElementById('CartDrawer');
      const ic = d && d.querySelector('.drawer__inner');
      const r = ic ? ic.getBoundingClientRect() : null;
      const ae = document.activeElement;
      return {
        adres: location.pathname + location.search,
        tema: window.Shopify && Shopify.theme ? `${Shopify.theme.name} (${Shopify.theme.id}, ${Shopify.theme.role})` : '?',
        cubuk: !!document.querySelector('#preview-bar-iframe, #PBarNextFrameWrapper, #PBarNextFrame'),
        cekmeceOpen: d ? d.hasAttribute('open') : null,
        cekmeceHidden: d ? d.hidden : null,
        cekmeceEkranda: r ? (r.left < innerWidth - 2 && r.right > 2) : null,
        odak: ae ? (ae.tagName + (ae.id ? '#' + ae.id : '') + ' ' + (ae.getAttribute('aria-label') || ae.getAttribute('href') || ae.getAttribute('aria-controls') || ae.className.toString().slice(0, 40))).trim() : null,
        odakAcanMi: !!(ae && ae.hasAttribute('data-tt-test-acan')),
      };
    });
    const kayit = async (ad, ek) => { const d = await durum(); Object.assign(d, { ad, cihaz, zaman: new Date().toISOString(), dosya: `${ad}-${cihaz}.png` }, ek || {}); await p.screenshot({ path: `${CIK}/${d.dosya}` }); sonuc.push(d); console.log(JSON.stringify(d)); return d; };
    // Header'daki sepet acicisi (gorunur olan)
    const acan = async () => {
      const h = await p.evaluateHandle(() => [...document.querySelectorAll('header a[href="/cart"], header [aria-controls="CartDrawer"], [aria-controls="CartDrawer"], a[href="/cart"]')].find(x => x.getBoundingClientRect().width > 0 && getComputedStyle(x).visibility !== 'hidden' && !x.closest('#CartDrawer')));
      await h.evaluate(x => x.setAttribute('data-tt-test-acan', ''));
      return h.asElement();
    };
    const ac = async () => { const a = await acan(); await a.click(); await p.waitForTimeout(2500); return a; };

    await p.goto(`${URUN}?${T}`, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(3500);
    await p.evaluate(async () => { await fetch('/cart/clear.js', { method: 'POST' }); });
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3000);
    const once = await durum();

    // A1) Alisverise devam
    await ac();
    const devam = p.locator('#CartDrawer [data-tt-cekmece-kapat]').first();
    const devamBilgi = await devam.evaluate(b => ({ etiket: b.tagName, type: b.getAttribute('type'), href: b.getAttribute('href'), metin: b.innerText.trim(), boyut: Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height) }));
    await kayit('A1-bos-cekmece-acik', { devamButonu: devamBilgi, oncekiAdres: once.adres });
    await devam.click(); await p.waitForTimeout(1500);
    await kayit('A2-alisverise-devam-tiklandi', { adresDegismedi: (await durum()).adres === once.adres });

    // A3) Karsilastirma: X (masaustu) veya perde (telefon)
    await ac();
    const xGorunur = await p.locator('#CartDrawer .drawer__close').first().isVisible();
    let kapatmaYolu;
    if (xGorunur) { try { await p.locator('#CartDrawer .drawer__close').first().click({ timeout: 5000 }); kapatmaYolu = 'X (fare tiklamasi)'; } catch (e) { await p.locator('#CartDrawer .drawer__close').first().evaluate(b => b.click()); kapatmaYolu = 'X (DOM click; Playwright fare tiklamasini baslik ogesi engelledi)'; } }
    else { await p.mouse.click(15, 420); kapatmaYolu = 'perde'; }
    await p.waitForTimeout(1500);
    await kayit('A3-karsilastirma-' + (xGorunur ? 'X-ile-kapatildi' : 'perde-ile-kapatildi'), { kapatmaYolu });

    // A4) Klavye: Enter ile devam butonu
    await ac();
    await devam.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    await kayit('A4-klavye-enter-ile-kapatildi');

    // B) Dolu cekmece
    const vid = await p.evaluate(() => { const f = document.querySelector('form[action*="/cart/add"] [name="id"]'); return f && f.value; });
    await p.evaluate(async (vid) => { await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id: +vid, quantity: 1 }] }) }); }, vid);
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3000);
    await ac();
    const doluButonlar = await p.evaluate(() => [...document.querySelectorAll('#CartDrawer a, #CartDrawer button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).map(e => e.tagName + ' | ' + (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) + ' | ' + (e.getAttribute('href') || '')));
    await kayit('B-dolu-cekmece', { doluButonlar, devamVarMi: doluButonlar.some(x => /devam|dön|alışveriş/i.test(x)) });
    await p.evaluate(async () => { await fetch('/cart/clear.js', { method: 'POST' }); });

    // C) /cart bos durum
    await p.goto(`https://texttonext.com/cart?${T}`, { waitUntil: 'load' }); await p.waitForTimeout(3000);
    const bosLink = await p.evaluate(() => { const a = [...document.querySelectorAll('#MainContent a')].find(x => /alışveriş|devam|dön/i.test(x.innerText) && x.getBoundingClientRect().width > 0); return a ? { metin: a.innerText.trim(), href: a.getAttribute('href') } : null; });
    await kayit('C1-sepet-sayfasi-bos', { bosLink });
    if (bosLink) {
      await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), p.locator(`#MainContent a[href="${bosLink.href}"]`).first().click()]); await p.waitForTimeout(2500);
      await kayit('C2-sepet-bos-link-tiklandi');
    }
    await ctx.close();
  }
  fs.writeFileSync(CIK + '/goruntuler.json', JSON.stringify(sonuc.map(s => ({ ...s, url: 'https://texttonext.com' + s.adres })), null, 1));
  await br.close();
})();
