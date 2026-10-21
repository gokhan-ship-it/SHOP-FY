// Onizleme testi (kopya tema 189316038976). Salt okuma; sepete bir sey eklenmiyor.
const { chromium } = require('playwright');
const T = '189316038976';
const B = 'https://texttonext.com';
const bekle = ms => new Promise(r => setTimeout(r, ms));
const CIHAZ = {
  iphone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  masaustu: { viewport: { width: 1440, height: 900 } },
};
(async () => {
  const br = await chromium.launch();
  const out = [];
  for (const cihaz of Object.keys(CIHAZ)) {
    const ctx = await br.newContext(CIHAZ[cihaz]);
    const p = await ctx.newPage();
    const hatalar = [];
    p.on('pageerror', e => hatalar.push(p.url().split('?')[0].replace(B, '') + ': ' + String(e.message).slice(0, 140)));
    const durum = () => p.evaluate(() => {
      const k = document.querySelector('.tt-stok-notu'); const vp = document.querySelector('#MainContent product-info variant-picker');
      const btn = document.querySelector('#MainContent product-info button[name="add"]');
      const r = k && k.getBoundingClientRect(); const cs = k && getComputedStyle(k);
      const nx = k && k.nextElementSibling; let sonraki = null; if (nx) { let e = nx; while (e && (e.tagName === 'NOSCRIPT' || e.getBoundingClientRect().height === 0)) e = e.nextElementSibling; if (e) sonraki = Math.round(e.getBoundingClientRect().top - r.bottom); }
      return { tema: Shopify.theme.id, kutu: k ? (k.hidden ? 'gizli' : 'GORUNUR') : 'yok', metin: k && !k.hidden ? k.innerText.replace(/\n/g, ' | ') : '', yer: k ? (k.previousElementSibling === vp ? 'picker-arkasi' : 'BASKA') : '', olcu: r && !k.hidden ? Math.round(r.width) + 'x' + Math.round(r.height) : '', boslukUst: r && !k.hidden ? Math.round(r.top - vp.getBoundingClientRect().bottom) : null, boslukAlt: !k || k.hidden ? null : sonraki, font: cs && !k.hidden ? cs.fontFamily.split(',')[0] : '', buton: btn ? btn.innerText.trim() : '', secili: [...vp.querySelectorAll('input:checked')].map(i => i.value).join(','), veri: !!document.getElementById('tt-stok-notu-veri') };
    });
    const git = async (yol) => { await p.goto(B + yol + (yol.includes('?') ? '&' : '?') + 'preview_theme_id=' + T, { waitUntil: 'load', timeout: 90000 }); await bekle(2500); };
    const tikla = async (metin) => { await p.click(`#MainContent product-info label:has-text("${metin}")`); await bekle(2500); };
    // 1 Ocean Blue
    await git('/products/zaman-kapsulu-kolye-classic-ocean-blue');
    out.push({ cihaz, adim: 'Ocean Blue ilk acilis', ...(await durum()) });
    await tikla('925'); out.push({ cihaz, adim: 'Ocean Blue gumus tik', ...(await durum()) });
    await tikla('316L'); out.push({ cihaz, adim: 'Ocean Blue celik tik', ...(await durum()) });
    await tikla('925'); out.push({ cihaz, adim: 'Ocean Blue tekrar gumus', ...(await durum()) });
    await git('/products/zaman-kapsulu-kolye-classic-ocean-blue?variant=52718887108928');
    out.push({ cihaz, adim: 'Ocean Blue ?variant=gumus', ...(await durum()) });
    if (cihaz === 'iphone') {
      await git('/products/lumin-zaman-kapsulu-kolye'); await tikla('925'); out.push({ cihaz, adim: 'Lumin gumus', ...(await durum()) });
      await git('/products/zaman-kapsulu-kolye-tasli-kilit'); await tikla('925'); out.push({ cihaz, adim: 'Taslikilit White gumus', ...(await durum()) });
      await git('/products/zaman-kapsulu-bileklik-kral'); out.push({ cihaz, adim: 'Kral Zincir (gumus, satista)', ...(await durum()) });
      await git('/products/prizma-zaman-kapsulu-bileklik-316l-paslanmaz-celik'); out.push({ cihaz, adim: 'Prizma (gumus yok)', ...(await durum()) });
    }
    out.push({ cihaz, adim: 'JS hatalari', hatalar: [...new Set(hatalar)] });
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await br.close();
})().catch(e => { console.log('HATA', e); process.exit(1); });
