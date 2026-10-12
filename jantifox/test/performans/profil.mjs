// CPU profili: bir işlem sırasında fonksiyon başına kendi süresi (self time). Hangi fonksiyonun pahalı olduğunu bulmak için.
// Çalıştırma: NODE_PATH=/opt/node22/lib/node_modules node profil.mjs [cpu]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const html = readFileSync(new URL('../tarayici/sayfa.html', import.meta.url), 'utf8');
const cpu = Number(process.argv[2] || 4);
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const baglam = await t.newContext({ ...devices['iPhone 13'] });
const s = await baglam.newPage();
const cdp = await baglam.newCDPSession(s);
await s.route('https://jantifox.test/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/cart.js') return r.fulfill({ contentType: 'application/json', body: '{"items":[]}' });
  if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 500, body: '' });
  return r.fulfill({ contentType: 'text/html', body: html });
});
await s.goto('https://jantifox.test/products/kanvas-lacivert-tote-canta');
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
const ana = '.kp-editor:not(.kp-editor--alt)';
await s.locator('[data-kisisel-davet] [data-kisisel-ac]').click();
await s.waitForTimeout(500);
const profil = async (ad, fn) => {
  await cdp.send('Profiler.start');
  await fn();
  const { profile } = await cdp.send('Profiler.stop');
  const dug = new Map(profile.nodes.map((n) => [n.id, n]));
  const oz = {};
  const dt = profile.timeDeltas;
  profile.samples.forEach((id, i) => {
    const n = dug.get(id);
    const ad2 = (n.callFrame.functionName || '(anonim)') + (n.callFrame.url && !/jantifox\.test/.test(n.callFrame.url) ? '' : '') ;
    oz[ad2] = (oz[ad2] || 0) + (dt[i] || 0) / 1000;
  });
  // Kapsayıcı süre: düğüm + alt ağacı
  const cocuk = new Map(profile.nodes.map((n) => [n.id, n.children || []]));
  const kendi = new Map();
  profile.samples.forEach((id, i) => kendi.set(id, (kendi.get(id) || 0) + (dt[i] || 0) / 1000));
  const top = (id) => (kendi.get(id) || 0) + cocuk.get(id).reduce((a, c) => a + top(c), 0);
  const kaps = {};
  for (const n of profile.nodes) { const ad3 = n.callFrame.functionName; if (/^(Editor|Sahne|isimAnaliz|duzenle|fiyatHesapla|stokKontrol|kampanya|KisiselKart|turkceCevir|Yerlesim)/.test(ad3)) kaps[ad3] = (kaps[ad3] || 0) + top(n.id); }
  if (process.env.KAPSAYICI) { console.log('  -- kapsayıcı:'); for (const [k, v] of Object.entries(kaps).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log('  ' + v.toFixed(1).padStart(7) + ' ms  ' + k); }
  const sirali = Object.entries(oz).filter(([k]) => !/^\((idle|program|garbage collector)\)$/.test(k) || true).sort((a, b) => b[1] - a[1]).slice(0, 22);
  console.log('\n== ' + ad + ' (CPU ' + cpu + '×)');
  for (const [k, v] of sirali) console.log('  ' + v.toFixed(1).padStart(7) + ' ms  ' + k);
};
await s.locator('#kp-isim').focus();
await profil('6 tuş (300 ms arayla)', async () => { for (const h of 'gokhan') { await s.keyboard.type(h); await s.waitForTimeout(300); } });
await s.locator('#kp-isim').blur();
await s.waitForTimeout(300);
await profil('yazı bloğuna dokunma (pointerdown)', async () => {
  const b = await s.locator(ana + ' .kp-onizleme [data-uid="isim-0"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 5, y: b.y + 5 }] });
  await s.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await s.waitForTimeout(300);
});
await s.locator(ana + ' .kp-arac-dugme[data-kp-adim="ikon"]').click();
await s.waitForTimeout(300);
await profil('set ekleme', async () => { await s.locator(ana + ' [data-kp-hazir-set="8001"]').click(); await s.waitForTimeout(600); });
await profil('yakınlaştırma geçişi', async () => { await s.locator(ana + ' [data-kp-gorunum]').click(); await s.waitForTimeout(500); });
await profil('ikon ekleme', async () => { await s.locator(ana + ' [data-kp-kategori="Spor"]').click(); await s.locator(ana + ' [data-kp-gorsel-icerik] [data-kp-ikon="2"]').click(); await s.waitForTimeout(500); });
await t.close();
