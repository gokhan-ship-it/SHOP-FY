// Siparis ve Iade sayfasi testi (taslak tema). Ekran goruntusu yok.
const { chromium } = require('playwright');
const T = 'preview_theme_id=189140861248', B = 'https://texttonext.com', S = `${B}/pages/siparis-ve-iade`;
const IDLER = ['siparis', 'iade', 'hediye', 'iptal', 'cip', 'hasar', 'garanti', 'bakim', 'hesap-silme', 'iletisim'];
const bekle = ms => new Promise(z => setTimeout(z, ms));
async function baglam(br, vp) {
  const ctx = await br.newContext(vp || { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#PBarNextFrameWrapper,#PBarNextFrame{display:none!important}'; document.head.appendChild(st); }); });
  const p = await ctx.newPage(); await p.goto(`${B}/?${T}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); return { ctx, p };
}
const durum = p => p.evaluate(() => {
  const d = [...document.querySelectorAll('details.tts-soru')]; const h = document.querySelector('[class^="tth-"]');
  const hb = h ? Math.round(h.getBoundingClientRect().bottom) : null;
  const acik = d.filter(x => x.open).map(x => x.id);
  return { acik, hash: location.hash, ustCubukAlt: hb, konum: Object.fromEntries(d.filter(x => x.open).map(x => [x.id, Math.round(x.getBoundingClientRect().top)])) };
});
(async () => {
  const br = await chromium.launch(); const r = {};
  { const { ctx, p } = await baglam(br);
    await p.goto(S, { waitUntil: 'load', timeout: 120000 }); await bekle(2500);
    r.sayfa = await p.evaluate(() => {
      const d = [...document.querySelectorAll('details.tts-soru')]; const h1 = document.querySelector('.tt-sss h1, [class^="tts-"] h1');
      const tum = [...document.querySelectorAll('[id]')].map(e => e.id); const cift = tum.filter((x, i) => tum.indexOf(x) !== i);
      const s = d[0] && d[0].querySelector('summary'); const cs = s && getComputedStyle(s); const kart = d[0] && getComputedStyle(d[0]);
      const sec = document.querySelector('.tt-sss'); const alt = document.querySelector('.tts-alt');
      return { tema: Shopify.theme.id, baslik: h1 && h1.innerText, h1: h1 && getComputedStyle(h1).fontSize + ' ' + getComputedStyle(h1).fontWeight,
        giris: (document.querySelector('.tts-giris') || {}).innerText, soruSayisi: d.length, idler: d.map(x => x.id), sorular: d.map(x => x.querySelector('summary').innerText.trim()),
        hepsiKapali: d.every(x => !x.open), ciftId: [...new Set(cift)].filter(x => ['siparis','iade','hediye','iptal','cip','hasar','garanti','bakim','hesap-silme','iletisim'].includes(x)),
        soruStil: cs && [cs.fontSize, cs.fontWeight, cs.letterSpacing, cs.color, Math.round(s.getBoundingClientRect().height) + 'px'].join(' '),
        kart: kart && [kart.backgroundColor, kart.borderRadius].join(' '), zemin: sec && getComputedStyle(sec).backgroundColor,
        altLinkler: alt ? [...alt.querySelectorAll('a')].map(a => a.innerText + ' ' + a.getAttribute('href')) : null, altMetin: alt && alt.innerText,
        tasma: document.documentElement.scrollWidth > innerWidth };
    });
    r.metin = await p.evaluate(() => { document.querySelectorAll('details.tts-soru').forEach(d => d.open = true); return document.querySelector('[id^="TtSss-"]').innerText; });
    // Klavye: ilk soruya Tab ile gel, Enter ile ac/kapat
    await p.goto(S, { waitUntil: 'load', timeout: 120000 }); await bekle(1500);
    await p.focus('details#siparis > summary'); await p.keyboard.press('Enter'); await bekle(300);
    r.klavye = await durum(p); await p.keyboard.press('Enter'); await bekle(300); r.klavyeKapat = (await durum(p)).acik;
    // Tiklama ile acinca adres #id olur
    await p.click('details#garanti > summary'); await bekle(400); r.tiklama = await durum(p);
    // Sayfa ici #iade linki (iptal cevabinda)
    await p.click('details#iptal > summary'); await bekle(300); await p.click('details#iptal a[href="#iade"]'); await bekle(1200); r.sayfaIciLink = await durum(p);
    await ctx.close(); }
  // Her #adres icin ayri ziyaret
  r.adresler = {};
  { const { ctx, p } = await baglam(br);
    for (const id of IDLER) { await p.goto(`${S}#${id}`, { waitUntil: 'load', timeout: 120000 }); await bekle(1500); r.adresler[id] = await durum(p); }
    await ctx.close(); }
  // Masaustu
  { const { ctx, p } = await baglam(br, { viewport: { width: 1440, height: 900 } });
    await p.goto(`${S}#cip`, { waitUntil: 'load', timeout: 120000 }); await bekle(1500);
    r.masaustu = { ...(await durum(p)), h1: await p.evaluate(() => getComputedStyle(document.querySelector('[id^="TtSss-"] h1')).fontSize), genislik: await p.evaluate(() => Math.round(document.querySelector('[id^="TtSss-"]').getBoundingClientRect().width)) };
    await ctx.close(); }
  // Hamburger menu + footer
  { const { ctx, p } = await baglam(br);
    await p.goto(`${B}/collections/zaman-kapsulu-bileklik`, { waitUntil: 'load', timeout: 120000 }); await bekle(2000);
    r.menu = await p.evaluate(() => [...document.querySelectorAll('#TtMenu .ttm-kucuk a')].map(a => { const c = getComputedStyle(a); return [a.innerText, a.getAttribute('href'), c.fontSize, c.fontWeight, c.color, Math.round(a.getBoundingClientRect().height || parseFloat(c.minHeight) || 0)].join(' | '); }));
    r.menuStil = await p.evaluate(() => { const a = [...document.querySelectorAll('#TtMenu .ttm-kucuk a')]; const k = x => { const c = getComputedStyle(x); return [c.fontSize, c.fontWeight, c.color, c.lineHeight, c.minHeight, c.padding].join(' '); }; return a.length > 1 && a.every(x => k(x) === k(a[1])); });
    r.footer = await p.evaluate(() => [...document.querySelectorAll('.tt-footer-yasal .ttf-a-liste li')].slice(0, 3).map(l => l.innerText + ' ' + ((l.querySelector('a') || {}).getAttribute ? l.querySelector('a').getAttribute('href') : '')));
    await p.goto(`${B}/pages/sozlesmeler?view=sozlesmeler-liste`, { waitUntil: 'load', timeout: 120000 }); await bekle(1500);
    r.sozlesmelerListesi = await p.evaluate(() => [...document.querySelectorAll('[class^="ttb-"] ul li a span:first-child')].map(x => x.innerText));
    await ctx.close(); }
  require('fs').writeFileSync(__dirname + '/test-sss-sonuc.json', JSON.stringify(r, null, 1)); console.log('bitti'); await br.close();
})().catch(e => { require('fs').writeFileSync(__dirname + '/test-sss-hata.txt', String(e && e.stack || e)); process.exit(1); });
