// Kart sikistirma secenekleri: sayfaya gecici CSS enjekte edip olcer (temaya yazmaz).
const { chromium } = require('playwright');
const BEACON = [/facebook\.com\/tr/, /\/g\/collect/, /google-analytics\.com/, /googleadservices\.com/, /doubleclick\.net/, /google\.com\/(ccm|pagead)/, /analytics\.tiktok\.com\/api\//, /monorail-edge\.shopifysvc\.com/, /\/\.well-known\/shopify\/monorail/, /trueprofit\.io/];
const bekle = ms => new Promise(r => setTimeout(r, ms));
const CSS = {
  A: `.tt-sc-setkart-metin{padding:8px 10px 10px!important}.tt-sc-setkart-etiket{margin-top:6px!important}.tt-sc-setkart-kisi{margin-top:6px!important;padding-top:6px!important}`,
  B: `.tt-sc-setkart-metin{padding:8px 10px 10px!important}.tt-sc-setkart-etiket{margin-top:6px!important}.tt-sc-setkart-kisi{margin-top:6px!important;padding-top:6px!important}.tt-sc-setkart-ust{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px!important;letter-spacing:.03em!important;margin-bottom:2px!important}`,
  C: `.tt-sc-setkart-metin{padding:8px 10px 10px!important}.tt-sc-setkart-etiket{margin-top:6px!important}.tt-sc-setkart-kisi{margin-top:6px!important;padding-top:6px!important}.tt-sc-setkart-ust{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px!important;letter-spacing:.03em!important;margin-bottom:2px!important}.tt-sc-setkart-ad{-webkit-line-clamp:1!important;line-clamp:1!important;white-space:nowrap;text-overflow:ellipsis;display:block!important}`,
};
(async () => {
  const br = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  for (const [W, H] of [[390, 844], [360, 740]]) {
    const ctx = await br.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, locale: 'tr-TR', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await ctx.route('**/*', r => BEACON.some(re => re.test(r.request().url())) ? r.abort() : r.continue());
    const p = await ctx.newPage();
    await p.goto('https://texttonext.com/collections/zaman-kapsulu-bileklik?mod=couple&preview_theme_id=189466968384', { waitUntil: 'load', timeout: 90000 }).catch(() => {});
    await bekle(2500);
    const olc = () => p.evaluate(() => {
      const k = [...document.querySelectorAll('.tt-sc-setkart')];
      const kes = k.map(x => { const a = x.querySelector('.tt-sc-setkart-ad'), u = x.querySelector('.tt-sc-setkart-ust'); return { ad: a.textContent, adKes: a.scrollWidth > a.clientWidth + 1, ustKes: u && u.scrollWidth > u.clientWidth + 1, ustH: u && Math.round(u.getBoundingClientRect().height) }; });
      return { kartH: Math.round(k[0].getBoundingClientRect().height), setlerH: Math.round(document.querySelector('.tt-sc-setler').getBoundingClientRect().height), ustH: kes[0].ustH, ustKes: kes.some(x => x.ustKes), adKesilen: kes.filter(x => x.adKes).map(x => x.ad) };
    });
    console.log(W, 'once', JSON.stringify(await olc()));
    for (const [ad, css] of Object.entries(CSS)) {
      const h = await p.addStyleTag({ content: css });
      await bekle(300);
      console.log(W, ad, JSON.stringify(await olc()));
      await h.evaluate(e => e.remove());
    }
    await ctx.close(); await bekle(1500);
  }
  await br.close();
})();
