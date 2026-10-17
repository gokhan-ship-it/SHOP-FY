const { chromium } = require('playwright');
const T = 'preview_theme_id=189140861248', B = 'https://texttonext.com', S = `${B}/pages/siparis-ve-iade`;
const IDLER = ['siparis', 'iade', 'hediye', 'iptal', 'cip', 'hasar', 'garanti', 'bakim', 'hesap-silme', 'iletisim'];
const bekle = ms => new Promise(z => setTimeout(z, ms));
(async () => {
  const br = await chromium.launch(); const r = { taze: {} };
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#PBarNextFrameWrapper,#PBarNextFrame{display:none!important}'; document.head.appendChild(st); }); });
  const p0 = await ctx.newPage(); await p0.goto(`${B}/?${T}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  r.menu = await p0.evaluate(() => [...document.querySelectorAll('#TtMenu .ttm-kucuk a')].map(a => a.textContent.trim() + ' → ' + a.getAttribute('href')));
  await p0.close();
  for (const id of IDLER) {
    const p = await ctx.newPage(); await p.goto(`${S}#${id}`, { waitUntil: 'load', timeout: 120000 }); await bekle(1500);
    r.taze[id] = await p.evaluate(() => { const d = [...document.querySelectorAll('details.tts-soru')]; const o = d.filter(x => x.open); return o.map(x => x.id).join(',') + ' @' + (o[0] ? Math.round(o[0].getBoundingClientRect().top) : '-'); });
    await p.close(); await bekle(1000);
  }
  console.log(JSON.stringify(r, null, 1)); await br.close();
})();
