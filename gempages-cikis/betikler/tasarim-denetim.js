// TEXT-TO-NEXT-TASARIM-DILI.md bolum 10 kontrol listesinin olculebilen maddeleri.
// Kullanim: node denetim.js <cikti.json> '<json: [[ad, url], ...]>'
// Yalnizca #MainContent (sayfanin kendi icerigi) denetlenir; header, footer ve uygulama pencereleri haric.
const { webkit, devices } = require('playwright');
const fs = require('fs');
const CIK = process.argv[2]; const sayfalar = JSON.parse(process.argv[3]);
(async () => {
  const br = await webkit.launch(); const sonuc = [];
  for (const [ad, url] of sayfalar) for (const cihaz of ['telefon', 'masaustu']) {
    const ctx = await br.newContext(cihaz === 'telefon' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage(); const fontlar = new Set();
    p.on('request', r => { if (r.resourceType() === 'font') fontlar.add(r.url().replace(/\?.*/, '')); });
    const r = await p.goto(url, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(3000);
    for (let i = 0; i < 30; i++) { const k = await p.evaluate(() => { scrollBy(0, 700); return document.documentElement.scrollHeight - scrollY - innerHeight; }); await p.waitForTimeout(200); if (k <= 0) break; }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
    const v = await p.evaluate(() => {
      const PALET = ['#0a0a0a', '#d6ff00', '#f4f4f4', '#ffffff', '#000000', '#141414', '#5c5c57', '#8a8a85', '#a3a39e', '#d2d2cd', '#262624'];
      const kok = document.querySelector('#MainContent');
      const hex = c => { const m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); if (!m) return null; const a = m[4] === undefined ? 1 : +m[4]; return { h: '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join(''), a, r: +m[1], g: +m[2], b: +m[3] }; };
      const gor = el => { const rc = el.getBoundingClientRect(); if (rc.width < 1 || rc.height < 1) return false; for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
      const ad = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '')).slice(0, 70);
      const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const zemin = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; const c = hex(s.backgroundColor); if (c && c.a > 0.5) return c; } return { h: '#ffffff', r: 255, g: 255, b: 255, a: 1 }; };
      const disi = {}, kontrast = [], neon = [], neonAcikYazi = [], fontAile = {}, basliklar = [], butonlar = [], kucukHedef = [], ikonlar = [], koseler = {}, golgeler = [], linkler = [];
      const ekle = (renk, nerede, el) => { if (!renk || renk.a === 0) return; const k = renk.a < 1 ? renk.h + '@' + renk.a : renk.h; if (renk.h === '#d6ff00') neon.push(nerede + ' ' + ad(el)); if (!PALET.includes(renk.h) || renk.a < 1) { (disi[k] = disi[k] || { n: 0, ornek: [] }).n++; if (disi[k].ornek.length < 3) disi[k].ornek.push(nerede + ' ' + ad(el)); } };
      if (!kok) return { hata: 'MainContent yok' };
      const hepsi = [...kok.querySelectorAll('*')].filter(e => !['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IMG', 'VIDEO', 'SOURCE', 'PICTURE', 'IFRAME', 'BR'].includes(e.tagName) && !e.closest('svg') || e.tagName === 'svg');
      for (const el of hepsi) {
        if (!gor(el)) continue;
        const s = getComputedStyle(el);
        const metinli = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (el.tagName === 'svg') {
          const renkler = new Set(); let dolgu = false;
          for (const x of [el, ...el.querySelectorAll('*')]) { const xs = getComputedStyle(x); const st = hex(xs.stroke), fi = hex(xs.fill); if (xs.stroke !== 'none' && st) { renkler.add(st.h); ekle(st, 'ikon-cizgi', el); } if (xs.fill !== 'none' && fi && fi.a > 0 && x.tagName !== 'svg') { if (['path', 'circle', 'rect', 'polygon', 'ellipse'].includes(x.tagName)) dolgu = true; renkler.add(fi.h); ekle(fi, 'ikon-dolgu', el); } }
          const rc = el.getBoundingClientRect(); ikonlar.push({ el: ad(el.parentElement) + '>svg', boyut: Math.round(rc.width) + 'x' + Math.round(rc.height), renkler: [...renkler], dolgu });
          continue;
        }
        if (metinli) {
          const c = hex(s.color); ekle(c, 'yazi', el);
          const fa = s.fontFamily.split(',')[0].replace(/["']/g, '').trim(); fontAile[fa] = (fontAile[fa] || 0) + 1;
          const z = zemin(el); const fs = parseFloat(s.fontSize);
          if (c && z) { const L1 = lum(c), L2 = lum(z); const o = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); const esik = fs >= 24 ? 3 : 4.5; if (o < esik) kontrast.push({ el: ad(el), metin: el.textContent.trim().slice(0, 40), renk: c.h, zemin: z.h, oran: +o.toFixed(2), boyut: fs }); if (c.h === '#d6ff00' && lum(z) > 0.4) neonAcikYazi.push(ad(el)); }
          if (/^H[1-6]$/.test(el.tagName) || el.closest('h1,h2,h3')) basliklar.push({ el: ad(el), metin: el.textContent.trim().slice(0, 40), boyut: fs, agirlik: s.fontWeight, harf: s.letterSpacing });
        }
        const bg = hex(s.backgroundColor); if (bg && bg.a > 0) ekle(bg, 'zemin', el);
        for (const k of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none') ekle(hex(s['border' + k + 'Color']), 'kenar', el);
        if (s.backgroundImage && /gradient/.test(s.backgroundImage)) { (disi['DEGRADE'] = disi['DEGRADE'] || { n: 0, ornek: [] }).n++; disi['DEGRADE'].ornek.push(ad(el)); }
        const rc = el.getBoundingClientRect();
        const kose = parseFloat(s.borderTopLeftRadius);
        if (kose > 0 && ((bg && bg.a > 0) || parseFloat(s.borderTopWidth) > 0)) { const k = kose >= rc.height / 2 - 1 ? 'pill' : Math.round(kose) + 'px'; koseler[k] = (koseler[k] || 0) + 1; }
        if (s.boxShadow && s.boxShadow !== 'none') golgeler.push(ad(el) + ' ' + s.boxShadow.slice(0, 50));
        const etkilesim = el.matches('button, [role=button], input[type=submit], a.button, .button, select, input:not([type=hidden]), textarea');
        if (etkilesim) {
          const b = { el: ad(el), metin: (el.innerText || el.value || '').trim().slice(0, 30), boyut: Math.round(rc.width) + 'x' + Math.round(rc.height), zemin: bg ? bg.h : 'yok', yazi: hex(s.color)?.h, kenar: parseFloat(s.borderTopWidth) > 0 ? hex(s.borderTopColor)?.h : 'yok', pill: kose >= rc.height / 2 - 1 };
          if (el.matches('button, [role=button], input[type=submit], a.button, .button')) butonlar.push(b);
          if (rc.width < 44 || rc.height < 44) kucukHedef.push(b);
        }
        if (el.tagName === 'A') {
          const satirIci = !!el.closest('p, li') && el.closest('p, li').innerText.trim().length > el.innerText.trim().length + 3;
          const c = hex(s.color); const mavi = c && c.b > c.r + 40 && c.b > c.g + 20;
          linkler.push({ el: ad(el), metin: el.innerText.trim().slice(0, 30), renk: c?.h, alti: s.textDecorationLine, satirIci, mavi, boyut: Math.round(rc.width) + 'x' + Math.round(rc.height) });
          if (!satirIci && (rc.width < 44 || rc.height < 44) && !el.matches('.button, button')) kucukHedef.push({ el: ad(el), metin: el.innerText.trim().slice(0, 30), boyut: Math.round(rc.width) + 'x' + Math.round(rc.height), tur: 'link' });
        }
      }
      return { tema: window.Shopify && Shopify.theme ? Shopify.theme.name : '?', disi, kontrast, neon, neonAcikYazi, fontAile, basliklar, butonlar, kucukHedef, ikonlar, koseler, golgeler, linkler };
    });
    v.ad = ad; v.cihaz = cihaz; v.url = url; v.sunucu = (((r && r.headers()['server-timing']) || '').match(/theme;desc="(\d+)"/) || [])[1];
    v.fontDosyalari = [...fontlar].map(f => f.slice(-80));
    sonuc.push(v); console.log(ad, cihaz, v.tema, 'palet-disi:', Object.keys(v.disi || {}).length, 'kontrast:', (v.kontrast || []).length, 'neon:', (v.neon || []).length);
    await ctx.close();
  }
  fs.writeFileSync(CIK, JSON.stringify(sonuc, null, 1)); await br.close();
})();
