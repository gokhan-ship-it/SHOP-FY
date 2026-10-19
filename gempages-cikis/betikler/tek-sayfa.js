// Tek sayfa: monorail isteklerinin adresi, yontemi, keepalive/beacon olup olmadigi ve sonucu. Salt okuma.
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  const net = new Map();
  cdp.on('Network.requestWillBeSent', e => { if (/monorail|g\/collect|tiktok\.com\/api|facebook\.com\/tr/.test(e.request.url)) net.set(e.requestId, { url: e.request.url.split('?')[0].slice(0, 90), tip: e.type, yontem: e.request.method, ev: (e.request.postData || '').match(/"event_name":"([a-z_]+)"/g) || [] }); });
  cdp.on('Network.responseReceived', e => { const k = net.get(e.requestId); if (k) k.durum = e.response.status; });
  cdp.on('Network.loadingFailed', e => { const k = net.get(e.requestId); if (k) k.hata = e.errorText + (e.canceled ? ' (iptal)' : '') + (e.blockedReason ? ' engel:' + e.blockedReason : '') + (e.corsErrorStatus ? ' cors:' + JSON.stringify(e.corsErrorStatus) : ''); });
  const kon = []; p.on('console', m => { if (m.type() === 'error') kon.push(m.text().slice(0, 300)); });
  await p.goto('https://texttonext.com/pages/couplezamankapsulleri', { waitUntil: 'load', timeout: 90000 });
  await p.waitForTimeout(12000);
  for (const v of net.values()) console.log(JSON.stringify(v));
  console.log('KONSOL', JSON.stringify(kon, null, 1));
  await br.close();
})();
