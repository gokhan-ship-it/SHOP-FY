// Kopya temanın önizleme linkinde (gerçek mağaza verisi) editörü iPhone emülasyonunda dener.
// Sepete ekleme yapmaz.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const cikti = new URL('ekran/canli/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });
const t = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const c = await t.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
const s = await c.newPage();
const hatalar = [];
s.on('pageerror', (e) => hatalar.push('pageerror: ' + e.message));
s.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') hatalar.push(m.type() + ': ' + m.text().slice(0, 200)); });
const url = 'https://jantifox.com/products/kanvas-lacivert-tote-canta?preview_theme_id=206773780766';
const r = await s.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log('HTTP', r.status(), s.url());
await s.waitForTimeout(4000);
const bilgi = await s.evaluate(() => {
  const k = document.querySelector('kisisel-kart');
  const v = document.querySelector('[id^="KisiselVeri-"]');
  let veri = null;
  try { veri = JSON.parse(v.textContent); } catch (e) { veri = 'JSON HATASI: ' + e.message; }
  return {
    tema: window.Shopify && Shopify.theme && Shopify.theme.id,
    kart: !!k, kartGizli: k ? k.hidden : null,
    veri: veri && typeof veri === 'object' ? { gorsel: veri.gorsel, harita: veri.harita, setler: veri.setler.length, rakam: veri.rakamlar.length, ikon: veri.ikonlar.length, ornekHarf: veri.setler[0] && veri.setler[0].varyantlar.slice(0, 2) } : veri
  };
});
console.log(JSON.stringify(bilgi, null, 1));
await s.screenshot({ path: cikti + '01-sayfa.png' });
console.log('hatalar:', hatalar);
await c.storageState({ path: cikti + 'durum.json' });
await t.close();
